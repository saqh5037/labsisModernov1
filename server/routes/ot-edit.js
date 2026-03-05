import { Router } from 'express'
import pool from '../db.js'
const router = Router()

// ═══════════════════════════════════════════════════════
// HELPERS — Resolución de servicio y precios
// ═══════════════════════════════════════════════════════

/**
 * Resuelve el servicio_id para una procedencia.
 * Cascada: procedencia.servicio_id (directo) → procedencia_turno_has_servicio (por turno actual)
 */
async function resolveServicio(conn, procedenciaId) {
  if (!procedenciaId) return null

  // 1. Directo: procedencia.servicio_id
  const proc = await conn.query(
    `SELECT servicio_id FROM procedencia WHERE id = $1`, [procedenciaId]
  )
  if (proc.rows[0]?.servicio_id) {
    return proc.rows[0].servicio_id
  }

  // 2. Turno-based: determinar turno actual y buscar en bridge table
  const now = new Date()
  const hour = now.getHours()
  const dayOfWeek = now.getDay() // 0=dom, 1=lun, ..., 6=sáb
  const dayCol = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][dayOfWeek]

  const turnoResult = await conn.query(`
    SELECT pths.servicio_id
    FROM procedencia_turno_has_servicio pths
    JOIN turno t ON pths.turno_id = t.id
    WHERE pths.procedencia_id = $1
      AND t.hora_inicio <= $2 AND t.hora_fin >= $2
      AND t.${dayCol} = true
    LIMIT 1
  `, [procedenciaId, hour])

  if (turnoResult.rows.length) return turnoResult.rows[0].servicio_id

  // 3. Fallback: primer turno cualquiera para esta procedencia
  const fallback = await conn.query(`
    SELECT servicio_id FROM procedencia_turno_has_servicio
    WHERE procedencia_id = $1 LIMIT 1
  `, [procedenciaId])

  return fallback.rows[0]?.servicio_id || null
}

/**
 * Obtiene datos del servicio: lista_precios_id, abierto, moneda, etc.
 */
async function getServicioInfo(conn, servicioId) {
  if (!servicioId) return null
  const r = await conn.query(`
    SELECT s.id, s.descripcion, s.abierto, s.lista_precios_id,
           s.descuento_activo, s.porcentaje_descuento_activo,
           s.porcentaje_pago_servicio, s.mostrar_descuentos_factura,
           lp.moneda_id AS lp_moneda_id, m.nombre AS moneda_nombre
    FROM servicio s
    LEFT JOIN lista_precios lp ON s.lista_precios_id = lp.id
    LEFT JOIN moneda m ON lp.moneda_id = m.id
    WHERE s.id = $1
  `, [servicioId])
  return r.rows[0] || null
}

/**
 * Calcula el precio de una prueba con la cascada de 3 niveles.
 * 1. servicio_has_prueba (precio directo en servicio)
 * 2. lista_precios_has_prueba (precio en lista de precios del servicio)
 * 3. prueba.precio (precio base) — solo si servicio.abierto=true
 * Si servicio.abierto=false y no hay precio en niveles 1-2: precio = 0
 */
async function getPrecioPrueba(conn, pruebaId, servicioId, servicioInfo, precioBase) {
  if (!servicioId || !servicioInfo) return parseFloat(precioBase) || 0

  // Nivel 1: servicio_has_prueba
  const shp = await conn.query(
    `SELECT precio FROM servicio_has_prueba WHERE servicio_id = $1 AND prueba_id = $2`,
    [servicioId, pruebaId]
  )
  if (shp.rows.length && parseFloat(shp.rows[0].precio) > 0) {
    return parseFloat(shp.rows[0].precio)
  }

  // Nivel 2: lista_precios_has_prueba
  if (servicioInfo.lista_precios_id) {
    const lphp = await conn.query(
      `SELECT precio FROM lista_precios_has_prueba WHERE lista_precios_id = $1 AND prueba_id = $2`,
      [servicioInfo.lista_precios_id, pruebaId]
    )
    if (lphp.rows.length && parseFloat(lphp.rows[0].precio) > 0) {
      return parseFloat(lphp.rows[0].precio)
    }
  }

  // Nivel 3: precio base — solo si servicio abierto
  if (servicioInfo.abierto) {
    return parseFloat(precioBase) || 0
  }

  return 0 // servicio cerrado sin precio configurado
}

/**
 * Calcula el precio de un GP con la cascada de 3 niveles.
 */
async function getPrecioGP(conn, gpId, servicioId, servicioInfo, precioBase) {
  if (!servicioId || !servicioInfo) return parseFloat(precioBase) || 0

  // Nivel 1: servicio_has_gprueba
  const shg = await conn.query(
    `SELECT precio FROM servicio_has_gprueba WHERE servicio_id = $1 AND gprueba_id = $2`,
    [servicioId, gpId]
  )
  if (shg.rows.length && parseFloat(shg.rows[0].precio) > 0) {
    return parseFloat(shg.rows[0].precio)
  }

  // Nivel 2: lista_precios_has_gprueba
  if (servicioInfo.lista_precios_id) {
    const lphg = await conn.query(
      `SELECT precio FROM lista_precios_has_gprueba WHERE lista_precios_id = $1 AND gprueba_id = $2`,
      [servicioInfo.lista_precios_id, gpId]
    )
    if (lphg.rows.length && parseFloat(lphg.rows[0].precio) > 0) {
      return parseFloat(lphg.rows[0].precio)
    }
  }

  // Nivel 3: precio base — solo si servicio abierto
  if (servicioInfo.abierto) {
    return parseFloat(precioBase) || 0
  }

  return 0
}

// ═══════════════════════════════════════════════════════
// GET /api/ot/search-paciente?q=V12345678
// Buscar paciente por CI o nombre para selección en crear OT
// ═══════════════════════════════════════════════════════
router.get('/search-paciente', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.length < 2) return res.json([])

    const result = await pool.query(`
      SELECT id, ci_paciente, nombre, apellido, apellido_segundo,
             sexo, fecha_nacimiento, email, telefono, telefono_celular,
             ci_representante, ci_rfc, num_historia, activo
      FROM paciente
      WHERE activo = true AND (
        LOWER(ci_paciente) LIKE '%' || LOWER($1) || '%'
        OR sin_acentos(LOWER(nombre)) LIKE '%' || sin_acentos(LOWER($1)) || '%'
        OR sin_acentos(LOWER(apellido)) LIKE '%' || sin_acentos(LOWER($1)) || '%'
        OR sin_acentos(LOWER(nombre || ' ' || apellido)) LIKE '%' || sin_acentos(LOWER($1)) || '%'
      )
      ORDER BY apellido, nombre
      LIMIT 15
    `, [q])

    res.json(result.rows)
  } catch (err) {
    console.error('Error search-paciente:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
// GET /api/ot/search-medico?q=gonzalez
// Buscar médico para asignar a OT
// ═══════════════════════════════════════════════════════
router.get('/search-medico', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.length < 2) return res.json([])

    const result = await pool.query(`
      SELECT id, nombre, apellido_paterno, apellido_materno,
             email, telefono, id_profesional
      FROM medico
      WHERE (
        sin_acentos(LOWER(nombre)) LIKE '%' || sin_acentos(LOWER($1)) || '%'
        OR sin_acentos(LOWER(COALESCE(apellido_paterno,''))) LIKE '%' || sin_acentos(LOWER($1)) || '%'
        OR sin_acentos(LOWER(nombre || ' ' || COALESCE(apellido_paterno,''))) LIKE '%' || sin_acentos(LOWER($1)) || '%'
        OR LOWER(COALESCE(email,'')) LIKE '%' || LOWER($1) || '%'
        OR LOWER(COALESCE(id_profesional,'')) LIKE '%' || LOWER($1) || '%'
      )
      ORDER BY nombre, COALESCE(apellido_paterno,'')
      LIMIT 20
    `, [q])

    res.json(result.rows)
  } catch (err) {
    console.error('Error search-medico:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
// POST /api/ot/medicos — Crear médico nuevo inline
// ═══════════════════════════════════════════════════════
router.post('/medicos', async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, id_profesional, email, telefono, celular, especialidad } = req.body
    if (!nombre) return res.status(400).json({ error: 'Nombre del médico es obligatorio' })

    // Verificar duplicado por id_profesional
    if (id_profesional && id_profesional.trim()) {
      const dup = await pool.query(
        `SELECT id, nombre, apellido_paterno FROM medico WHERE LOWER(id_profesional) = LOWER($1)`,
        [id_profesional.trim()]
      )
      if (dup.rows.length) {
        const existing = dup.rows[0]
        return res.status(409).json({
          error: `Ya existe un médico con ese ID profesional: ${existing.nombre} ${existing.apellido_paterno || ''}`.trim()
        })
      }
    }

    const result = await pool.query(`
      INSERT INTO medico (nombre, apellido_paterno, apellido_materno, id_profesional,
                          email, telefono, celular, especialidad, activo, validado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false)
      RETURNING id, nombre, apellido_paterno, apellido_materno, id_profesional, email
    `, [nombre, apellido_paterno || null, apellido_materno || null,
        id_profesional || '', email || null, telefono || null,
        celular || null, especialidad || null])

    res.json(result.rows[0])
  } catch (err) {
    console.error('Error POST /ot/medicos:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
// GET /api/ot/edit/new?pacienteId=X
// Init para crear nueva OT — carga datos del paciente + catálogos
// ═══════════════════════════════════════════════════════
router.get('/edit/new', async (req, res) => {
  try {
    const { pacienteId } = req.query

    // 1. Datos del paciente
    let paciente = null
    if (pacienteId) {
      const pResult = await pool.query(`
        SELECT id, ci_paciente, nombre, apellido, apellido_segundo,
               sexo, fecha_nacimiento, email, telefono, telefono_celular,
               ci_representante, ci_rfc, num_historia
        FROM paciente WHERE id = $1
      `, [pacienteId])
      paciente = pResult.rows[0] || null
    }

    // 2. Procedencias activas
    const procResult = await pool.query(`
      SELECT id, nombre, codigo, emergencia, servicio_id,
             pago_obligatorio_impresion, ingreso_obligatorio,
             medico_obligatorio
      FROM procedencia WHERE activo = true
      ORDER BY nombre
    `)

    // 3. Servicios médicos activos
    const smResult = await pool.query(`
      SELECT id, nombre, codigo FROM servicio_medico WHERE activo = true ORDER BY nombre
    `)

    // 4. CAPs activos
    const capResult = await pool.query(`
      SELECT id, nombre, codigo FROM centro_atencion_paciente WHERE activo = true ORDER BY nombre
    `)

    // 5. Config del laboratorio
    const labResult = await pool.query(`
      SELECT id, nombre, rif, moneda_id, tasa_cambio, aplicar_igtf, igtf,
             procedencia_obligatorio, servicio_med_obligatorio,
             ot_busqueda_por_servicio_medico, show_stat,
             is_facturacion_con_divisas
      FROM laboratorio LIMIT 1
    `)

    res.json({
      paciente,
      procedencias: procResult.rows,
      serviciosMedicos: smResult.rows,
      caps: capResult.rows,
      lab: labResult.rows[0]
    })
  } catch(err) {
    console.error('Error GET /ot/edit/new:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
// GET /api/ot/resolve-servicio?procedencia_id=X
// Resuelve servicio y moneda al cambiar procedencia
// ═══════════════════════════════════════════════════════
router.get('/resolve-servicio', async (req, res) => {
  try {
    const { procedencia_id } = req.query
    if (!procedencia_id) return res.json({ servicio: null })

    const servicioId = await resolveServicio(pool, parseInt(procedencia_id))
    if (!servicioId) return res.json({ servicio: null })

    const info = await getServicioInfo(pool, servicioId)
    // Agregar tasa_cambio + IGTF del laboratorio
    const labRow = await pool.query(`SELECT tasa_cambio, is_facturacion_con_divisas, aplicar_igtf, igtf FROM laboratorio LIMIT 1`)
    const lab = labRow.rows[0] || {}
    res.json({
      servicio: info ? {
        ...info,
        tasa_cambio: parseFloat(lab.tasa_cambio) || 1,
        is_facturacion_con_divisas: lab.is_facturacion_con_divisas || false,
        aplicar_igtf: lab.aplicar_igtf || false,
        igtf_porcentaje: parseFloat(lab.igtf) || 0
      } : null
    })
  } catch (err) {
    console.error('Error resolve-servicio:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
// GET /api/ot/recalc-precios?servicio_id=X&prueba_ids=1,2,3&gp_ids=4,5
// Recalcular precios de pruebas/GPs seleccionados con un servicio
// ═══════════════════════════════════════════════════════
router.get('/recalc-precios', async (req, res) => {
  try {
    const servicioId = parseInt(req.query.servicio_id) || null
    const pruebaIds = (req.query.prueba_ids || '').split(',').filter(Boolean).map(Number)
    const gpIds = (req.query.gp_ids || '').split(',').filter(Boolean).map(Number)

    const svcInfo = servicioId ? await getServicioInfo(pool, servicioId) : null

    const precios = {}
    for (const pid of pruebaIds) {
      const base = await pool.query('SELECT precio FROM prueba WHERE id = $1', [pid])
      precios[`p_${pid}`] = await getPrecioPrueba(pool, pid, servicioId, svcInfo, base.rows[0]?.precio)
    }
    for (const gid of gpIds) {
      const base = await pool.query('SELECT precio FROM grupo_prueba WHERE id = $1', [gid])
      precios[`gp_${gid}`] = await getPrecioGP(pool, gid, servicioId, svcInfo, base.rows[0]?.precio)
    }

    res.json({ precios, servicio: svcInfo })
  } catch (err) {
    console.error('Error recalc-precios:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
// GET /api/ot/edit/:numero
// Cargar OT existente para edición
// ═══════════════════════════════════════════════════════
router.get('/edit/:numero', async (req, res) => {
  try {
    const { numero } = req.params

    // OT + paciente
    const otResult = await pool.query(`
      SELECT ot.*, p.ci_paciente, p.nombre AS pac_nombre, p.apellido AS pac_apellido,
             p.apellido_segundo, p.sexo, p.fecha_nacimiento, p.email AS pac_email,
             p.telefono AS pac_telefono, p.telefono_celular,
             p.ci_representante, p.ci_rfc, p.num_historia,
             m.nombre AS medico_nombre, m.apellido_paterno AS medico_apellido_paterno,
             m.apellido_materno AS medico_apellido_materno, m.email AS medico_email,
             m.telefono AS medico_telefono, m.id_profesional AS medico_cedula,
             proc.nombre AS procedencia_nombre, proc.servicio_id,
             sm.nombre AS servicio_medico_nombre
      FROM orden_trabajo ot
      LEFT JOIN paciente p ON ot.paciente_id = p.id
      LEFT JOIN medico m ON ot.medico_id = m.id
      LEFT JOIN procedencia proc ON ot.procedencia_id = proc.id
      LEFT JOIN servicio_medico sm ON ot.servicio_medico_id = sm.id
      WHERE ot.numero = $1
    `, [numero])
    if (!otResult.rows.length) return res.status(404).json({ error: 'Orden no encontrada' })

    // Pruebas de la OT
    const pruebasResult = await pool.query(`
      SELECT po.id, po.prueba_id, po.precio, po.gp_id, po.gp_orden_id, po.area_id,
             pr.nombre AS prueba, pr.nomenclatura, pr.codigo, a.area AS area_nombre,
             tm.tipo AS tipo_muestra, tm.id AS tipo_muestra_id,
             tc.tipo AS contenedor, tc.id AS tipo_contenedor_id, tc.color
      FROM prueba_orden po
      LEFT JOIN prueba pr ON po.prueba_id = pr.id
      LEFT JOIN area a ON po.area_id = a.id
      LEFT JOIN tipo_muestra tm ON pr.tipo_muestra_id = tm.id
      LEFT JOIN tipo_contenedor tc ON pr.tipo_contenedor_id = tc.id
      WHERE po.orden_id = $1
      ORDER BY pr.orden, pr.nombre
    `, [otResult.rows[0].id])

    // GPs de la OT
    const gpsResult = await pool.query(`
      SELECT go.id, go.gp_id, go.precio, go.gp_auxiliar,
             gp.nombre AS grupo, gp.abreviacion
      FROM gprueba_orden go
      LEFT JOIN grupo_prueba gp ON go.gp_id = gp.id
      WHERE go.orden_id = $1
      ORDER BY gp.nombre
    `, [otResult.rows[0].id])

    // Muestras
    const muestrasResult = await pool.query(`
      SELECT m.id, m.barcode, m.correlativo,
             tm.tipo AS tipo_muestra, tm.codigo AS muestra_codigo,
             tc.tipo AS contenedor, tc.color
      FROM muestra m
      LEFT JOIN tipo_muestra tm ON m.tipo_muestra_id = tm.id
      LEFT JOIN tipo_contenedor tc ON m.tipo_contenedor_id = tc.id
      WHERE m.orden_id = $1
      ORDER BY m.correlativo
    `, [otResult.rows[0].id])

    // Catálogos
    const procResult = await pool.query(`SELECT id, nombre, codigo, servicio_id, medico_obligatorio, ingreso_obligatorio FROM procedencia WHERE activo = true ORDER BY nombre`)
    const smResult = await pool.query(`SELECT id, nombre FROM servicio_medico WHERE activo = true ORDER BY nombre`)
    const labResult = await pool.query(`SELECT id, nombre, rif, moneda_id, tasa_cambio, aplicar_igtf, igtf, procedencia_obligatorio, servicio_med_obligatorio, ot_busqueda_por_servicio_medico, show_stat FROM laboratorio LIMIT 1`)

    res.json({
      orden: otResult.rows[0],
      pruebas: pruebasResult.rows,
      grupos: gpsResult.rows,
      muestras: muestrasResult.rows,
      procedencias: procResult.rows,
      serviciosMedicos: smResult.rows,
      lab: labResult.rows[0]
    })
  } catch(err) {
    console.error('Error GET /ot/edit/:numero:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
// GET /api/ot/search-pruebas?q=gluc&servicio_id=5
// Buscar pruebas y grupos — algoritmo multi-etapa Labsis
// Etapa 1: servicio_has_prueba (prioridad alta)
// Etapa 2: búsqueda general (prioridad baja, dedup)
// ═══════════════════════════════════════════════════════
router.get('/search-pruebas', async (req, res) => {
  try {
    const { q, servicio_id } = req.query
    if (!q || q.length < 2) return res.json({ pruebas: [], grupos: [] })

    const svcId = parseInt(servicio_id) || null
    const svcInfo = svcId ? await getServicioInfo(pool, svcId) : null

    // ── PRUEBAS ──────────────────────────────────────

    // Etapa 1: Pruebas del servicio (máxima prioridad)
    let svcPruebas = []
    const svcPruebaIds = new Set()
    if (svcId) {
      const whereClause = `AND (sin_acentos(LOWER(p.nombre)) LIKE '%' || sin_acentos(LOWER($2)) || '%'
               OR sin_acentos(LOWER(COALESCE(p.nomenclatura,''))) LIKE '%' || sin_acentos(LOWER($2)) || '%'
               OR sin_acentos(LOWER(COALESCE(p.codigo_caja,''))) LIKE '%' || sin_acentos(LOWER($2)) || '%'
               OR sin_acentos(LOWER(COALESCE(shp.codigo_caja,''))) LIKE '%' || sin_acentos(LOWER($2)) || '%')`
      const svcResult = await pool.query(`
        SELECT p.id, p.nombre, p.nomenclatura, p.codigo_caja, p.precio, p.orden,
               shp.codigo_caja AS codigo_servicio, shp.precio AS precio_servicio,
               a.area AS area_nombre, a.id AS area_id,
               tm.tipo AS tipo_muestra, tm.id AS tipo_muestra_id,
               tc.tipo AS contenedor, tc.id AS tipo_contenedor_id, tc.color
        FROM servicio_has_prueba shp
        JOIN prueba p ON shp.prueba_id = p.id
        LEFT JOIN area a ON p.area_id = a.id
        LEFT JOIN tipo_muestra tm ON p.tipo_muestra_id = tm.id
        LEFT JOIN tipo_contenedor tc ON p.tipo_contenedor_id = tc.id
        WHERE shp.servicio_id = $1 AND p.activa = true ${whereClause}
        ORDER BY
          CASE WHEN sin_acentos(LOWER(COALESCE(p.codigo_caja,''))) = sin_acentos(LOWER($2)) THEN 0
               WHEN sin_acentos(LOWER(p.nombre)) = sin_acentos(LOWER($2)) THEN 1
               WHEN sin_acentos(LOWER(p.nombre)) LIKE sin_acentos(LOWER($2)) || '%' THEN 2
               WHEN sin_acentos(LOWER(COALESCE(p.codigo_caja,''))) LIKE sin_acentos(LOWER($2)) || '%' THEN 3
               ELSE 4 END,
          length(p.nombre), LOWER(p.nombre)
        LIMIT 15
      `, [svcId, q])

      for (const p of svcResult.rows) {
        const precio = (parseFloat(p.precio_servicio) > 0)
          ? parseFloat(p.precio_servicio)
          : await getPrecioPrueba(pool, p.id, svcId, svcInfo, p.precio)
        svcPruebas.push({ ...p, precio_base: parseFloat(p.precio) || 0, precio, source: 'servicio' })
        svcPruebaIds.add(p.id)
      }
    }

    // Etapa 2: Búsqueda general (excluir IDs ya encontrados)
    const generalPruebas = []
    const remainLimit = 30 - svcPruebas.length
    if (remainLimit > 0) {
      const excludeClause = svcPruebaIds.size > 0
        ? `AND p.id NOT IN (${[...svcPruebaIds].join(',')})` : ''
      const whereClause = `AND (sin_acentos(LOWER(p.nombre)) LIKE '%' || sin_acentos(LOWER($1)) || '%'
               OR sin_acentos(LOWER(COALESCE(p.nomenclatura,''))) LIKE '%' || sin_acentos(LOWER($1)) || '%'
               OR sin_acentos(LOWER(COALESCE(p.codigo_caja,''))) LIKE '%' || sin_acentos(LOWER($1)) || '%')`
      const genResult = await pool.query(`
        SELECT p.id, p.nombre, p.nomenclatura, p.codigo_caja, p.precio, p.orden,
               a.area AS area_nombre, a.id AS area_id,
               tm.tipo AS tipo_muestra, tm.id AS tipo_muestra_id,
               tc.tipo AS contenedor, tc.id AS tipo_contenedor_id, tc.color
        FROM prueba p
        LEFT JOIN area a ON p.area_id = a.id
        LEFT JOIN tipo_muestra tm ON p.tipo_muestra_id = tm.id
        LEFT JOIN tipo_contenedor tc ON p.tipo_contenedor_id = tc.id
        WHERE p.activa = true ${excludeClause} ${whereClause}
        ORDER BY
          CASE WHEN sin_acentos(LOWER(COALESCE(p.codigo_caja,''))) = sin_acentos(LOWER($1)) THEN 0
               WHEN sin_acentos(LOWER(p.nombre)) = sin_acentos(LOWER($1)) THEN 1
               WHEN sin_acentos(LOWER(p.nombre)) LIKE sin_acentos(LOWER($1)) || '%' THEN 2
               WHEN sin_acentos(LOWER(COALESCE(p.codigo_caja,''))) LIKE sin_acentos(LOWER($1)) || '%' THEN 3
               ELSE 4 END,
          length(p.nombre), LOWER(p.nombre)
        LIMIT ${remainLimit}
      `, [q])

      for (const p of genResult.rows) {
        const precio = await getPrecioPrueba(pool, p.id, svcId, svcInfo, p.precio)
        generalPruebas.push({ ...p, precio_base: parseFloat(p.precio) || 0, precio, source: 'general' })
      }
    }

    const pruebas = [...svcPruebas, ...generalPruebas]

    // ── GRUPOS DE PRUEBA ─────────────────────────────

    // Etapa 1: Grupos del servicio
    let svcGrupos = []
    const svcGpIds = new Set()
    if (svcId) {
      const whereClause = `AND (sin_acentos(LOWER(gp.nombre)) LIKE '%' || sin_acentos(LOWER($2)) || '%'
               OR sin_acentos(LOWER(COALESCE(gp.abreviacion,''))) LIKE '%' || sin_acentos(LOWER($2)) || '%'
               OR sin_acentos(LOWER(COALESCE(gp.codigo_caja,''))) LIKE '%' || sin_acentos(LOWER($2)) || '%'
               OR sin_acentos(LOWER(COALESCE(shg.codigo_caja,''))) LIKE '%' || sin_acentos(LOWER($2)) || '%')`
      const svcGpResult = await pool.query(`
        SELECT gp.id, gp.nombre, gp.abreviacion, gp.precio, gp.precio2,
               gp.codigo_caja, shg.codigo_caja AS codigo_servicio, shg.precio AS precio_servicio,
               a.area AS area_nombre, a.id AS area_id,
               tm.tipo AS tipo_muestra, tm.id AS tipo_muestra_id,
               tc.tipo AS contenedor, tc.id AS tipo_contenedor_id, tc.color
        FROM servicio_has_gprueba shg
        JOIN grupo_prueba gp ON shg.gprueba_id = gp.id
        LEFT JOIN area a ON gp.area_id = a.id
        LEFT JOIN tipo_muestra tm ON gp.tipo_muestra_id = tm.id
        LEFT JOIN tipo_contenedor tc ON gp.tipo_contenedor_id = tc.id
        LEFT JOIN tipo_grupo_prueba tgp ON gp.tipo_grupo_prueba_id = tgp.id
        WHERE shg.servicio_id = $1 AND gp.activa = true
          AND (tgp.codigo IS NULL OR tgp.codigo NOT IN ('DIN','BAC','RES'))
          ${whereClause}
        ORDER BY
          CASE WHEN sin_acentos(LOWER(COALESCE(gp.codigo_caja,''))) = sin_acentos(LOWER($2)) THEN 0
               WHEN sin_acentos(LOWER(gp.nombre)) = sin_acentos(LOWER($2)) THEN 1
               WHEN sin_acentos(LOWER(gp.nombre)) LIKE sin_acentos(LOWER($2)) || '%' THEN 2
               WHEN sin_acentos(LOWER(COALESCE(gp.codigo_caja,''))) LIKE sin_acentos(LOWER($2)) || '%' THEN 3
               ELSE 4 END,
          length(gp.nombre), LOWER(gp.nombre)
        LIMIT 10
      `, [svcId, q])

      for (const gp of svcGpResult.rows) {
        const precio = (parseFloat(gp.precio_servicio) > 0)
          ? parseFloat(gp.precio_servicio)
          : await getPrecioGP(pool, gp.id, svcId, svcInfo, gp.precio)
        svcGrupos.push({ ...gp, precio_base: parseFloat(gp.precio) || 0, precio, source: 'servicio' })
        svcGpIds.add(gp.id)
      }
    }

    // Etapa 2: Grupos general
    const generalGrupos = []
    const remainGpLimit = 20 - svcGrupos.length
    if (remainGpLimit > 0) {
      const excludeClause = svcGpIds.size > 0
        ? `AND gp.id NOT IN (${[...svcGpIds].join(',')})` : ''
      const whereClause = `AND (sin_acentos(LOWER(gp.nombre)) LIKE '%' || sin_acentos(LOWER($1)) || '%'
               OR sin_acentos(LOWER(COALESCE(gp.abreviacion,''))) LIKE '%' || sin_acentos(LOWER($1)) || '%'
               OR sin_acentos(LOWER(COALESCE(gp.codigo_caja,''))) LIKE '%' || sin_acentos(LOWER($1)) || '%')`
      const genGpResult = await pool.query(`
        SELECT gp.id, gp.nombre, gp.abreviacion, gp.precio, gp.precio2,
               gp.codigo_caja, a.area AS area_nombre, a.id AS area_id,
               tm.tipo AS tipo_muestra, tm.id AS tipo_muestra_id,
               tc.tipo AS contenedor, tc.id AS tipo_contenedor_id, tc.color
        FROM grupo_prueba gp
        LEFT JOIN area a ON gp.area_id = a.id
        LEFT JOIN tipo_muestra tm ON gp.tipo_muestra_id = tm.id
        LEFT JOIN tipo_contenedor tc ON gp.tipo_contenedor_id = tc.id
        LEFT JOIN tipo_grupo_prueba tgp ON gp.tipo_grupo_prueba_id = tgp.id
        WHERE gp.activa = true
          AND (tgp.codigo IS NULL OR tgp.codigo NOT IN ('DIN','BAC','RES'))
          ${excludeClause} ${whereClause}
        ORDER BY
          CASE WHEN sin_acentos(LOWER(COALESCE(gp.codigo_caja,''))) = sin_acentos(LOWER($1)) THEN 0
               WHEN sin_acentos(LOWER(gp.nombre)) = sin_acentos(LOWER($1)) THEN 1
               WHEN sin_acentos(LOWER(gp.nombre)) LIKE sin_acentos(LOWER($1)) || '%' THEN 2
               WHEN sin_acentos(LOWER(COALESCE(gp.codigo_caja,''))) LIKE sin_acentos(LOWER($1)) || '%' THEN 3
               ELSE 4 END,
          length(gp.nombre), LOWER(gp.nombre)
        LIMIT ${remainGpLimit}
      `, [q])

      for (const gp of genGpResult.rows) {
        const precio = await getPrecioGP(pool, gp.id, svcId, svcInfo, gp.precio)
        generalGrupos.push({ ...gp, precio_base: parseFloat(gp.precio) || 0, precio, source: 'general' })
      }
    }

    const grupos = [...svcGrupos, ...generalGrupos]

    res.json({ pruebas, grupos })
  } catch(err) {
    console.error('Error search-pruebas:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
// GET /api/ot/grupo-prueba/:id/pruebas
// Obtener las pruebas dentro de un grupo de prueba
// ═══════════════════════════════════════════════════════
router.get('/grupo-prueba/:id/pruebas', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(`
      SELECT p.id, p.nombre, p.nomenclatura, p.precio, p.orden,
             a.area AS area_nombre, a.id AS area_id,
             tp.codigo AS tipo_prueba,
             tm.tipo AS tipo_muestra, tm.id AS tipo_muestra_id,
             tc.tipo AS contenedor, tc.id AS tipo_contenedor_id, tc.color
      FROM prueba p
      LEFT JOIN area a ON p.area_id = a.id
      LEFT JOIN tipo_prueba tp ON p.tipo_prueba_id = tp.id
      LEFT JOIN tipo_muestra tm ON p.tipo_muestra_id = tm.id
      LEFT JOIN tipo_contenedor tc ON p.tipo_contenedor_id = tc.id
      WHERE p.id IN (
        SELECT prueba_id FROM gp_has_prueba WHERE grupo_p_id = $1
      )
      ORDER BY p.orden, p.nombre
    `, [id])

    // Fallback: buscar pruebas que pertenecen al area del GP
    if (result.rows.length === 0) {
      const gpArea = await pool.query('SELECT area_id FROM grupo_prueba WHERE id = $1', [id])
      if (gpArea.rows.length && gpArea.rows[0].area_id) {
        const altResult = await pool.query(`
          SELECT p.id, p.nombre, p.nomenclatura, p.precio, p.orden,
                 a.area AS area_nombre, a.id AS area_id,
                 tp.codigo AS tipo_prueba,
                 tm.tipo AS tipo_muestra, tm.id AS tipo_muestra_id,
                 tc.tipo AS contenedor, tc.id AS tipo_contenedor_id, tc.color
          FROM prueba p
          LEFT JOIN area a ON p.area_id = a.id
          LEFT JOIN tipo_prueba tp ON p.tipo_prueba_id = tp.id
          LEFT JOIN tipo_muestra tm ON p.tipo_muestra_id = tm.id
          LEFT JOIN tipo_contenedor tc ON p.tipo_contenedor_id = tc.id
          WHERE p.area_id = $1 AND p.activa = true
          ORDER BY p.orden, p.nombre
        `, [gpArea.rows[0].area_id])
        return res.json(altResult.rows)
      }
    }

    res.json(result.rows)
  } catch(err) {
    console.error('Error grupo-prueba pruebas:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
// POST /api/ot — Crear Orden de Trabajo
// Body: { paciente, orden, pruebas[], grupos[], facturar }
// ═══════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { paciente, orden, pruebas = [], grupos = [], facturar = false } = req.body
    const userId = req.user?.userId || null

    // 1. Crear o actualizar paciente
    let pacienteId = paciente.id
    if (!pacienteId) {
      const pResult = await client.query(`
        INSERT INTO paciente (ci_paciente, nombre, apellido, apellido_segundo,
                              sexo, fecha_nacimiento, email, telefono, telefono_celular,
                              ci_representante, ci_rfc, num_historia, raza, activo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Indefinido',true)
        RETURNING id
      `, [paciente.ci_paciente, paciente.nombre, paciente.apellido,
          paciente.apellido_segundo || null, paciente.sexo,
          paciente.fecha_nacimiento || null, paciente.email || null,
          paciente.telefono || null, paciente.telefono_celular || null,
          paciente.ci_representante || null, paciente.ci_rfc || null,
          paciente.num_historia || null])
      pacienteId = pResult.rows[0].id
      // Generar acceso_id (formato Labsis: 'pre$' + id)
      await client.query(
        `UPDATE paciente SET acceso_id = $1 WHERE id = $2`,
        [`pre$${pacienteId}`, pacienteId]
      )
    } else {
      await client.query(`
        UPDATE paciente SET
          nombre = COALESCE($2, nombre),
          apellido = COALESCE($3, apellido),
          apellido_segundo = $4,
          sexo = COALESCE($5, sexo),
          fecha_nacimiento = COALESCE($6, fecha_nacimiento),
          email = $7, telefono = $8, telefono_celular = $9
        WHERE id = $1
      `, [pacienteId, paciente.nombre, paciente.apellido,
          paciente.apellido_segundo, paciente.sexo,
          paciente.fecha_nacimiento, paciente.email,
          paciente.telefono, paciente.telefono_celular])
    }

    // 2. Obtener config lab para moneda/tasa
    const labCfg = await client.query(`
      SELECT moneda_id, tasa_cambio, is_facturacion_con_divisas
      FROM laboratorio LIMIT 1
    `)
    const lab = labCfg.rows[0] || {}
    const tasaCambio = parseFloat(lab.tasa_cambio) || 1
    // Determinar moneda de la OT según servicio/procedencia
    // En EG: servicio tiene moneda_id=2 (USD), lab base es 1 (Bs.S)
    let otMonedaId = null
    let otTipoCambio = null
    let otTipoCambioInverso = null
    if (lab.is_facturacion_con_divisas && orden.servicio_id) {
      const svcMoneda = await client.query(
        `SELECT lp.moneda_id FROM servicio s LEFT JOIN lista_precios lp ON s.lista_precios_id = lp.id WHERE s.id = $1`,
        [orden.servicio_id]
      )
      const svcMon = svcMoneda.rows[0]?.moneda_id
      if (svcMon && svcMon !== lab.moneda_id) {
        otMonedaId = svcMon
        otTipoCambio = tasaCambio > 1 ? parseFloat((1 / tasaCambio).toFixed(4)) : tasaCambio
        otTipoCambioInverso = tasaCambio > 1 ? tasaCambio : parseFloat((1 / tasaCambio).toFixed(4))
      }
    }

    // Descuento info del body
    const descuentoPct = parseFloat(orden.descuento_porcentaje) || 0
    const descuentoMonto = parseFloat(orden.descuento_monto) || 0

    // Insertar la orden de trabajo
    // numero='0' — el trigger lo reemplaza con YYMMDD####
    const otResult = await client.query(`
      INSERT INTO orden_trabajo (
        numero, fecha, paciente_id, status_id, procedencia_id, procedencia,
        servicio_id, servicio_medico_id, medico_id, medico,
        habitacion, num_ingreso, num_episodio,
        observaciones, informacion_clinica, stat,
        embarazada, semanas_embarazo,
        usuario_id, departamento_laboratorio_id,
        centro_atencion_paciente_id, precio,
        moneda_id, tipo_cambio, tipo_cambio_inverso,
        descuento_porcentaje, descuento_monto
      ) VALUES (
        '0', NOW(), $1, 1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15,
        $16, $17, $18, 0,
        $19, $20, $21,
        $22, $23
      ) RETURNING id, numero
    `, [
      pacienteId,
      orden.procedencia_id || 1,
      orden.procedencia_nombre || null,
      orden.servicio_id || null,
      orden.servicio_medico_id || null,
      orden.medico_id || null,
      orden.medico_nombre || null,
      orden.habitacion || null,
      orden.num_ingreso || null,
      orden.num_episodio || null,
      orden.observaciones || null,
      orden.informacion_clinica || null,
      orden.stat || false,
      orden.embarazada || false,
      orden.semanas_embarazo || 0,
      userId,
      1, // departamento_laboratorio_id (EG solo tiene 1)
      orden.centro_atencion_paciente_id || 1,
      otMonedaId,
      otTipoCambio,
      otTipoCambioInverso,
      descuentoPct,
      descuentoMonto
    ])

    const otId = otResult.rows[0].id
    // Re-leer para obtener el numero generado por trigger
    const otNumero = await client.query('SELECT numero FROM orden_trabajo WHERE id = $1', [otId])
    const numero = otNumero.rows[0].numero

    // 3. Insertar grupos de prueba (gprueba_orden)
    const gpOrdenMap = {} // gp_id -> gprueba_orden.id
    for (const gp of grupos) {
      const gpPrecioBase = parseFloat(gp.precio) || 0
      const gpDescMonto = descuentoPct > 0 ? gpPrecioBase * descuentoPct / 100 : 0
      const gpPrecioFinal = gpPrecioBase - gpDescMonto
      const gpResult = await client.query(`
        INSERT INTO gprueba_orden (orden_id, gp_id, precio, precio_sin_descuento,
          descuento_porcentaje, descuento_monto, gp_auxiliar)
        VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING id
      `, [otId, gp.id, gpPrecioFinal, gpPrecioBase, descuentoPct, gpDescMonto])
      gpOrdenMap[gp.id] = gpResult.rows[0].id
    }

    // 4. Insertar pruebas (prueba_orden)
    for (const p of pruebas) {
      const pPrecioBase = parseFloat(p.precio) || 0
      const pDescMonto = descuentoPct > 0 ? pPrecioBase * descuentoPct / 100 : 0
      const pPrecioFinal = pPrecioBase - pDescMonto
      await client.query(`
        INSERT INTO prueba_orden (
          prueba_id, orden_id, status_id, area_id,
          gp_id, gp_orden_id, precio, precio_sin_descuento,
          descuento_porcentaje, descuento_monto,
          fecha_creacion, editable
        ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, NOW(), true)
      `, [
        p.prueba_id, otId, p.area_id || null,
        p.gp_id || null,
        p.gp_id ? (gpOrdenMap[p.gp_id] || null) : null,
        pPrecioFinal, pPrecioBase, descuentoPct, pDescMonto
      ])
    }

    // 5. Generar muestras
    // Agrupar por tipo_contenedor_id único (como el sistema original)
    const muestraQuery = await client.query(`
      SELECT DISTINCT
        COALESCE(gp.tipo_muestra_id, pr.tipo_muestra_id) AS tipo_muestra_id,
        COALESCE(gp.tipo_contenedor_id, pr.tipo_contenedor_id) AS tipo_contenedor_id
      FROM prueba_orden po
      LEFT JOIN prueba pr ON po.prueba_id = pr.id
      LEFT JOIN grupo_prueba gp ON po.gp_id = gp.id
      WHERE po.orden_id = $1
        AND COALESCE(gp.tipo_muestra_id, pr.tipo_muestra_id) IS NOT NULL
        AND COALESCE(gp.tipo_contenedor_id, pr.tipo_contenedor_id) IS NOT NULL
    `, [otId])

    let numSucesion = 1
    for (const m of muestraQuery.rows) {
      // Barcode: numero_ot + num_sucesion (sin guión), ej: 260302000101
      const barcode = numero + String(numSucesion).padStart(2, '0')
      await client.query(`
        INSERT INTO muestra (tipo_muestra_id, tipo_contenedor_id, barcode,
                             orden_id, correlativo, num_sucesion, cantidad, status_id)
        VALUES ($1, $2, $3, $4, $5, $6, 1, 1)
      `, [m.tipo_muestra_id, m.tipo_contenedor_id, barcode, otId, numSucesion, numSucesion])
      numSucesion++
    }

    // 6. Insertar accion_log (dispara trigger de recálculo de precio)
    const pruebasList = pruebas.map(p => p.nombre || '').join(', ')
    const accion = ('CREACION ORDEN - ' + pruebasList).substring(0, 98)
    await client.query(`
      INSERT INTO accion_log (usuario_id, accion, realizado, realizado_timestamp, orden_id)
      VALUES ($1, $2, NOW(), NOW(), $3)
    `, [userId, accion, otId])

    await client.query('COMMIT')

    // Re-leer precio actualizado
    const precioResult = await client.query('SELECT precio FROM orden_trabajo WHERE id = $1', [otId])

    res.json({
      ok: true,
      orden: { id: otId, numero, precio: precioResult.rows[0].precio },
      facturar
    })
  } catch(err) {
    await client.query('ROLLBACK')
    console.error('Error POST /ot:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════
// PUT /api/ot/:numero — Editar OT existente
// Body: { orden, pruebas[], grupos[] }
// ═══════════════════════════════════════════════════════
router.put('/:numero', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { numero } = req.params
    const { orden, pruebas = [], grupos = [] } = req.body
    const userId = req.user?.userId || null

    // 1. Obtener OT existente
    const otResult = await client.query(
      `SELECT id, contador_edicion, status_id FROM orden_trabajo WHERE numero = $1`, [numero]
    )
    if (!otResult.rows.length) return res.status(404).json({ error: 'Orden no encontrada' })
    const ot = otResult.rows[0]

    // Verificar contador de edición (máx 3 para no-admin)
    const contadorEdicion = (ot.contador_edicion || 0) + 1
    const isAdmin = req.user?.rol === 'ADMIN'
    if (!isAdmin && contadorEdicion > 3) {
      return res.status(400).json({ error: 'Límite de ediciones alcanzado (máximo 3). Contacte al administrador.' })
    }

    // 2. Obtener config lab para moneda/tasa
    const labCfg = await client.query(
      `SELECT moneda_id, tasa_cambio, is_facturacion_con_divisas FROM laboratorio LIMIT 1`
    )
    const lab = labCfg.rows[0] || {}
    const tasaCambio = parseFloat(lab.tasa_cambio) || 1

    // Resolver servicio/moneda
    let otMonedaId = null, otTipoCambio = null, otTipoCambioInverso = null
    if (lab.is_facturacion_con_divisas && orden.servicio_id) {
      const svcMoneda = await client.query(
        `SELECT lp.moneda_id FROM servicio s LEFT JOIN lista_precios lp ON s.lista_precios_id = lp.id WHERE s.id = $1`,
        [orden.servicio_id]
      )
      const svcMon = svcMoneda.rows[0]?.moneda_id
      if (svcMon && svcMon !== lab.moneda_id) {
        otMonedaId = svcMon
        otTipoCambio = tasaCambio > 1 ? parseFloat((1 / tasaCambio).toFixed(4)) : tasaCambio
        otTipoCambioInverso = tasaCambio > 1 ? tasaCambio : parseFloat((1 / tasaCambio).toFixed(4))
      }
    }

    // Descuento info del body
    const descuentoPct = parseFloat(orden.descuento_porcentaje) || 0
    const descuentoMonto = parseFloat(orden.descuento_monto) || 0

    // 3. Actualizar datos de la OT
    await client.query(`
      UPDATE orden_trabajo SET
        procedencia_id = $1, procedencia = $2,
        servicio_id = $3, servicio_medico_id = $4,
        medico_id = $5, medico = $6, habitacion = $7,
        num_ingreso = $8, num_episodio = $9,
        observaciones = $10, informacion_clinica = $11,
        stat = $12, embarazada = $13, semanas_embarazo = $14,
        centro_atencion_paciente_id = $15,
        moneda_id = $16, tipo_cambio = $17, tipo_cambio_inverso = $18,
        contador_edicion = $19,
        descuento_porcentaje = $21, descuento_monto = $22
      WHERE id = $20
    `, [
      orden.procedencia_id || null, orden.procedencia_nombre || null,
      orden.servicio_id || null,
      orden.servicio_medico_id || null, orden.medico_id || null,
      orden.medico_nombre || null, orden.habitacion || null,
      orden.num_ingreso || null, orden.num_episodio || null,
      orden.observaciones || null, orden.informacion_clinica || null,
      orden.stat || false, orden.embarazada || false,
      orden.semanas_embarazo || 0, orden.centro_atencion_paciente_id || 1,
      otMonedaId, otTipoCambio, otTipoCambioInverso,
      contadorEdicion, ot.id,
      descuentoPct, descuentoMonto
    ])

    // 4. Diff de pruebas — eliminar las que ya no están, agregar las nuevas
    const existingPruebas = await client.query(
      `SELECT id, prueba_id, gp_id FROM prueba_orden WHERE orden_id = $1`, [ot.id]
    )
    const existingGPs = await client.query(
      `SELECT id, gp_id FROM gprueba_orden WHERE orden_id = $1`, [ot.id]
    )

    // IDs que vienen del frontend
    const newPruebaIds = new Set(pruebas.map(p => p.prueba_id))
    const newGpIds = new Set(grupos.map(g => g.id))

    // Eliminar GPs que ya no están
    for (const eg of existingGPs.rows) {
      if (!newGpIds.has(eg.gp_id)) {
        await client.query('DELETE FROM gprueba_orden WHERE id = $1', [eg.id])
      }
    }

    // Eliminar pruebas que ya no están
    for (const ep of existingPruebas.rows) {
      if (!newPruebaIds.has(ep.prueba_id)) {
        await client.query('DELETE FROM prueba_orden WHERE id = $1', [ep.id])
      }
    }

    // Agregar GPs nuevos
    const existingGpIdSet = new Set(existingGPs.rows.map(g => g.gp_id))
    const gpOrdenMap = {}
    // Cargar map de GPs existentes
    for (const eg of existingGPs.rows) {
      if (newGpIds.has(eg.gp_id)) gpOrdenMap[eg.gp_id] = eg.id
    }
    for (const gp of grupos) {
      if (!existingGpIdSet.has(gp.id)) {
        const gpPrecioBase = parseFloat(gp.precio) || 0
        const gpDescMonto = descuentoPct > 0 ? gpPrecioBase * descuentoPct / 100 : 0
        const gpPrecioFinal = gpPrecioBase - gpDescMonto
        const gpResult = await client.query(`
          INSERT INTO gprueba_orden (orden_id, gp_id, precio, precio_sin_descuento,
            descuento_porcentaje, descuento_monto, gp_auxiliar)
          VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING id
        `, [ot.id, gp.id, gpPrecioFinal, gpPrecioBase, descuentoPct, gpDescMonto])
        gpOrdenMap[gp.id] = gpResult.rows[0].id
      }
    }

    // Agregar pruebas nuevas + actualizar precios de existentes
    const existingPruebaIdSet = new Set(existingPruebas.rows.map(p => p.prueba_id))
    const existingPruebaMap = new Map(existingPruebas.rows.map(p => [p.prueba_id, p]))
    for (const p of pruebas) {
      const pPrecioBase = parseFloat(p.precio) || 0
      const pDescMonto = descuentoPct > 0 ? pPrecioBase * descuentoPct / 100 : 0
      const pPrecioFinal = pPrecioBase - pDescMonto
      if (!existingPruebaIdSet.has(p.prueba_id)) {
        await client.query(`
          INSERT INTO prueba_orden (
            prueba_id, orden_id, status_id, area_id,
            gp_id, gp_orden_id, precio, precio_sin_descuento,
            descuento_porcentaje, descuento_monto,
            fecha_creacion, editable
          ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, NOW(), true)
        `, [
          p.prueba_id, ot.id, p.area_id || null,
          p.gp_id || null,
          p.gp_id ? (gpOrdenMap[p.gp_id] || null) : null,
          pPrecioFinal, pPrecioBase, descuentoPct, pDescMonto
        ])
      } else {
        // Actualizar precio de prueba existente con descuento
        const existing = existingPruebaMap.get(p.prueba_id)
        if (existing) {
          await client.query(
            `UPDATE prueba_orden SET precio = $1, precio_sin_descuento = $2,
             descuento_porcentaje = $3, descuento_monto = $4 WHERE id = $5`,
            [pPrecioFinal, pPrecioBase, descuentoPct, pDescMonto, existing.id]
          )
        }
      }
    }

    // Actualizar precios de GPs existentes con descuento
    for (const gp of grupos) {
      if (existingGpIdSet.has(gp.id)) {
        const existingGp = existingGPs.rows.find(g => g.gp_id === gp.id)
        if (existingGp) {
          const gpPrecioBase = parseFloat(gp.precio) || 0
          const gpDescMonto = descuentoPct > 0 ? gpPrecioBase * descuentoPct / 100 : 0
          const gpPrecioFinal = gpPrecioBase - gpDescMonto
          await client.query(
            `UPDATE gprueba_orden SET precio = $1, precio_sin_descuento = $2,
             descuento_porcentaje = $3, descuento_monto = $4 WHERE id = $5`,
            [gpPrecioFinal, gpPrecioBase, descuentoPct, gpDescMonto, existingGp.id]
          )
        }
      }
    }

    // 5. Regenerar muestras
    // Eliminar muestras existentes
    await client.query('DELETE FROM muestra WHERE orden_id = $1', [ot.id])

    // Generar nuevas muestras
    const muestraQuery = await client.query(`
      SELECT DISTINCT
        COALESCE(gp.tipo_muestra_id, pr.tipo_muestra_id) AS tipo_muestra_id,
        COALESCE(gp.tipo_contenedor_id, pr.tipo_contenedor_id) AS tipo_contenedor_id
      FROM prueba_orden po
      LEFT JOIN prueba pr ON po.prueba_id = pr.id
      LEFT JOIN grupo_prueba gp ON po.gp_id = gp.id
      WHERE po.orden_id = $1
        AND COALESCE(gp.tipo_muestra_id, pr.tipo_muestra_id) IS NOT NULL
        AND COALESCE(gp.tipo_contenedor_id, pr.tipo_contenedor_id) IS NOT NULL
    `, [ot.id])

    let numSucesion = 1
    for (const m of muestraQuery.rows) {
      const barcode = numero + String(numSucesion).padStart(2, '0')
      await client.query(`
        INSERT INTO muestra (tipo_muestra_id, tipo_contenedor_id, barcode,
                             orden_id, correlativo, num_sucesion, cantidad, status_id)
        VALUES ($1, $2, $3, $4, $5, $6, 1, 1)
      `, [m.tipo_muestra_id, m.tipo_contenedor_id, barcode, ot.id, numSucesion, numSucesion])
      numSucesion++
    }

    // 6. Recalcular precio de la OT manualmente
    // (El trigger solo se activa con 'CREACION ORDEN' en accion_log, no con edición)
    const priceResult = await client.query(`
      SELECT
        COALESCE(SUM(CASE WHEN po.gp_id IS NULL THEN po.precio ELSE 0 END), 0) AS sum_pruebas,
        COALESCE((SELECT SUM(go2.precio) FROM gprueba_orden go2 WHERE go2.orden_id = $1 AND go2.gp_auxiliar = false), 0) AS sum_grupos
      FROM prueba_orden po WHERE po.orden_id = $1
    `, [ot.id])
    const newPrice = parseFloat(priceResult.rows[0].sum_pruebas) + parseFloat(priceResult.rows[0].sum_grupos)
    await client.query('UPDATE orden_trabajo SET precio = $1 WHERE id = $2', [newPrice, ot.id])

    // 7. Accion_log
    const added = pruebas.filter(p => !existingPruebaIdSet.has(p.prueba_id)).map(p => p.nombre).join(', ')
    const removed = existingPruebas.rows.filter(p => !newPruebaIds.has(p.prueba_id)).length
    let accionText = 'EDICION ORDEN'
    if (added) accionText += ' + ' + added.substring(0, 60)
    if (removed) accionText += ` - ${removed} estudio(s)`
    await client.query(`
      INSERT INTO accion_log (usuario_id, accion, realizado, realizado_timestamp, orden_id)
      VALUES ($1, $2, NOW(), NOW(), $3)
    `, [userId, accionText.substring(0, 98), ot.id])

    await client.query('COMMIT')

    // Re-leer precio
    const precioResult = await client.query('SELECT precio FROM orden_trabajo WHERE id = $1', [ot.id])

    res.json({
      ok: true,
      orden: { id: ot.id, numero, precio: precioResult.rows[0].precio }
    })
  } catch(err) {
    await client.query('ROLLBACK')
    console.error('Error PUT /ot/:numero:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════
// POST /api/ot/:numero/facturar — Crear factura para la OT
// ═══════════════════════════════════════════════════════
router.post('/:numero/facturar', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { numero } = req.params
    const { cliente_id } = req.body
    const userId = req.user?.userId || null

    // Obtener OT con moneda info + descuento
    const otResult = await client.query(`
      SELECT ot.id, ot.precio, ot.servicio_id, ot.centro_atencion_paciente_id,
             ot.moneda_id AS ot_moneda_id, ot.tipo_cambio AS ot_tipo_cambio,
             ot.tipo_cambio_inverso AS ot_tipo_cambio_inverso,
             ot.descuento_porcentaje, ot.descuento_monto,
             s.porcentaje_pago_servicio
      FROM orden_trabajo ot
      LEFT JOIN servicio s ON ot.servicio_id = s.id
      WHERE ot.numero = $1
    `, [numero])
    if (!otResult.rows.length) return res.status(404).json({ error: 'Orden no encontrada' })
    const ot = otResult.rows[0]

    // Obtener config lab
    const labResult = await client.query(`
      SELECT moneda_id, tasa_cambio, aplicar_igtf, igtf, rif, nombre,
             is_facturacion_con_divisas
      FROM laboratorio LIMIT 1
    `)
    const lab = labResult.rows[0]
    const tasaCambio = parseFloat(lab.tasa_cambio) || 1

    // Moneda: la factura usa la moneda del servicio/OT (ej: USD=2)
    // conversion_moneda_id = moneda base del lab (Bs.S=1)
    const factMonedaId = ot.ot_moneda_id || lab.moneda_id
    const factConversionMonedaId = lab.moneda_id
    const factTipoCambio = ot.ot_tipo_cambio || null
    const factTipoCambioInverso = ot.ot_tipo_cambio_inverso || null

    // El precio de la OT está en la moneda del servicio (USD en EG)
    // monto_total en factura es en moneda local (Bs.S)
    const precioEnDivisa = parseFloat(ot.precio) || 0
    const esConDivisas = lab.is_facturacion_con_divisas && factMonedaId !== lab.moneda_id

    // Descuento de la OT
    const descPct = parseFloat(ot.descuento_porcentaje) || 0
    const descMontoDivisa = descPct > 0
      ? parseFloat((precioEnDivisa * descPct / 100).toFixed(2))
      : (parseFloat(ot.descuento_monto) || 0)
    const precioConDescDivisa = precioEnDivisa - descMontoDivisa

    // Copago: porcentaje_pago_servicio = lo que paga el servicio (no el paciente)
    // Si copago=100 → servicio paga todo → paciente paga 0
    // Si copago=0 o null → paciente paga todo
    const copagoPct = parseFloat(ot.porcentaje_pago_servicio) || 0
    const montoPacienteDivisa = copagoPct > 0
      ? parseFloat((precioConDescDivisa * (100 - copagoPct) / 100).toFixed(2))
      : precioConDescDivisa

    // IGTF
    let igtfPct = null
    let igtfMontoDivisa = 0
    if (lab.aplicar_igtf) {
      igtfPct = parseFloat(lab.igtf) || 3
      igtfMontoDivisa = parseFloat((montoPacienteDivisa * igtfPct / 100).toFixed(2))
    }

    const totalDivisa = montoPacienteDivisa + igtfMontoDivisa

    // Conversión a moneda local
    const montoTotalLocal = esConDivisas
      ? parseFloat((precioEnDivisa * tasaCambio).toFixed(2))
      : precioEnDivisa
    const descuentoLocal = esConDivisas
      ? parseFloat((descMontoDivisa * tasaCambio).toFixed(2))
      : descMontoDivisa
    const baseImponibleLocal = esConDivisas
      ? parseFloat((montoPacienteDivisa * tasaCambio).toFixed(2))
      : montoPacienteDivisa
    const ivaMonto = igtfPct
      ? (esConDivisas ? parseFloat((igtfMontoDivisa * tasaCambio).toFixed(2)) : igtfMontoDivisa)
      : 0
    const totalFactura = esConDivisas
      ? parseFloat((totalDivisa * tasaCambio).toFixed(2))
      : totalDivisa
    const isCopago = copagoPct > 0

    // Obtener o crear cliente genérico
    let clienteId = cliente_id
    if (!clienteId) {
      const genResult = await client.query(`SELECT id FROM cliente WHERE ci_rif = 'GENERICO' LIMIT 1`)
      if (genResult.rows.length) {
        clienteId = genResult.rows[0].id
      } else {
        const newClient = await client.query(`
          INSERT INTO cliente (ci_rif, nombre, activo) VALUES ('GENERICO', 'Cliente Genérico', true) RETURNING id
        `)
        clienteId = newClient.rows[0].id
      }
    }

    // Determinar caja del usuario
    let cajaId = null
    if (userId) {
      const cajaResult = await client.query(
        `SELECT id FROM caja WHERE usuario_id = $1 AND activo = true LIMIT 1`, [userId]
      )
      if (cajaResult.rows.length) cajaId = cajaResult.rows[0].id
    }

    // Insertar factura
    const factResult = await client.query(`
      INSERT INTO factura (
        fecha, fecha_modificacion, monto_total, descuento,
        base_imponible, iva, iva_monto, total_factura,
        cliente_id, status_id, usuario_id, servicio_id,
        tipo_pago_factura_id, control, caja_id,
        moneda_id, conversion_moneda_id, moneda_base,
        tipo_cambio, tipo_cambio_inverso,
        tasa_cambio, igtf, monto_igtf, fiscalizar,
        razon_social, razon_social_ci_rif,
        centro_atencion_paciente_id,
        is_factura_copago
      ) VALUES (
        NOW(), CURRENT_DATE, $1, $2, $3, $4, $5, $6,
        $7, 1, $8, $9, 1, 0, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, true,
        $19, $20, $21,
        $22
      ) RETURNING id, numero
    `, [
      montoTotalLocal, descuentoLocal, baseImponibleLocal, igtfPct || 0, ivaMonto, totalFactura,
      clienteId, userId, ot.servicio_id, cajaId,
      factMonedaId, factConversionMonedaId, factConversionMonedaId,
      factTipoCambio, factTipoCambioInverso,
      tasaCambio, igtfPct, ivaMonto,
      lab.nombre, lab.rif,
      ot.centro_atencion_paciente_id || 1,
      isCopago
    ])
    const facturaId = factResult.rows[0].id
    const facturaNumero = factResult.rows[0].numero

    // Cantidades por grupo (viene del frontend en el body)
    const grupoCantidades = req.body.grupoCantidades || {} // { gpId: cantidad }

    // Insertar items de factura — Grupos primero
    const gps = await client.query(`
      SELECT go.id, go.gp_id, go.precio, go.precio_sin_descuento,
             go.descuento_porcentaje AS gp_desc_pct, go.descuento_monto AS gp_desc_monto,
             gp.nombre, gp.codigo_caja
      FROM gprueba_orden go
      LEFT JOIN grupo_prueba gp ON go.gp_id = gp.id
      WHERE go.orden_id = $1 AND go.gp_auxiliar = false
    `, [ot.id])

    for (const gp of gps.rows) {
      const precioSinDesc = parseFloat(gp.precio_sin_descuento || gp.precio) || 0
      const precioConDesc = parseFloat(gp.precio) || 0
      const descItem = precioSinDesc - precioConDesc
      const cantidad = parseInt(grupoCantidades[gp.gp_id]) || 1
      if (precioSinDesc > 0) {
        const montoLocal = esConDivisas ? parseFloat((precioConDesc * cantidad * tasaCambio).toFixed(2)) : precioConDesc * cantidad
        const psdLocal = esConDivisas ? parseFloat((precioSinDesc * cantidad * tasaCambio).toFixed(2)) : precioSinDesc * cantidad
        const descLocal = esConDivisas ? parseFloat((descItem * cantidad * tasaCambio).toFixed(2)) : descItem * cantidad
        await client.query(`
          INSERT INTO item_factura (factura_id, nombre_item, cantidad, monto,
            precio_sin_descuento, descuento, descuento_monto,
            codigo_caja, gp_id,
            monto_mon_ext, precio_sin_desc_mon_ext)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [facturaId, gp.nombre, cantidad, montoLocal, psdLocal,
            descPct || 0, descLocal,
            gp.codigo_caja || 'GEN01', gp.gp_id,
            esConDivisas ? precioConDesc * cantidad : null,
            esConDivisas ? precioSinDesc * cantidad : null])
      }
    }

    // Pruebas sueltas (sin grupo)
    const pruebasSueltas = await client.query(`
      SELECT po.id, po.prueba_id, po.precio, po.precio_sin_descuento,
             po.descuento_porcentaje AS p_desc_pct, po.descuento_monto AS p_desc_monto,
             pr.nombre, pr.codigo, pr.codigo_caja
      FROM prueba_orden po
      LEFT JOIN prueba pr ON po.prueba_id = pr.id
      WHERE po.orden_id = $1 AND po.gp_id IS NULL
    `, [ot.id])

    for (const p of pruebasSueltas.rows) {
      const precioSinDesc = parseFloat(p.precio_sin_descuento || p.precio) || 0
      const precioConDesc = parseFloat(p.precio) || 0
      const descItem = precioSinDesc - precioConDesc
      if (precioSinDesc > 0) {
        const montoLocal = esConDivisas ? parseFloat((precioConDesc * tasaCambio).toFixed(2)) : precioConDesc
        const psdLocal = esConDivisas ? parseFloat((precioSinDesc * tasaCambio).toFixed(2)) : precioSinDesc
        const descLocal = esConDivisas ? parseFloat((descItem * tasaCambio).toFixed(2)) : descItem
        await client.query(`
          INSERT INTO item_factura (factura_id, nombre_item, cantidad, monto,
            precio_sin_descuento, descuento, descuento_monto,
            codigo_caja, prueba_id,
            monto_mon_ext, precio_sin_desc_mon_ext)
          VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [facturaId, p.nombre, montoLocal, psdLocal,
            descPct || 0, descLocal,
            p.codigo_caja || p.codigo || null, p.prueba_id,
            esConDivisas ? precioConDesc : null,
            esConDivisas ? precioSinDesc : null])
      }
    }

    // Vincular OT con factura
    await client.query('UPDATE orden_trabajo SET factura_id = $1 WHERE id = $2', [facturaId, ot.id])

    // Crear cliente_has_orden
    await client.query(`
      INSERT INTO cliente_has_orden (orden_id, cliente_id, servicio_id, facturado, factura_id)
      VALUES ($1, $2, $3, true, $4)
    `, [ot.id, clienteId, ot.servicio_id, facturaId])

    // Insertar accion_log "CREADA FACTURA"
    await client.query(`
      INSERT INTO accion_log (usuario_id, accion, realizado, realizado_timestamp, orden_id)
      VALUES ($1, 'CREADA FACTURA', NOW(), NOW(), $2)
    `, [userId, ot.id])

    await client.query('COMMIT')

    res.json({
      ok: true,
      factura: { id: facturaId, numero: facturaNumero, total: totalFactura }
    })
  } catch(err) {
    await client.query('ROLLBACK')
    console.error('Error POST /ot/:numero/facturar:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════════
// GET /api/ot/factura/:numero — Datos para pantalla de cobro
// ═══════════════════════════════════════════════════════
router.get('/factura/:ref', async (req, res) => {
  try {
    const { ref } = req.params

    // Try by ID first, then by numero
    let factResult = await pool.query(`
      SELECT f.*, c.nombre AS cliente_nombre, c.ci_rif AS cliente_ci,
             c.direccion AS cliente_direccion, c.telefono AS cliente_telefono,
             sf.status AS status_nombre
      FROM factura f
      LEFT JOIN cliente c ON f.cliente_id = c.id
      LEFT JOIN status_factura sf ON f.status_id = sf.id
      WHERE f.id = $1
    `, [ref])
    if (!factResult.rows.length) {
      factResult = await pool.query(`
        SELECT f.*, c.nombre AS cliente_nombre, c.ci_rif AS cliente_ci,
               c.direccion AS cliente_direccion, c.telefono AS cliente_telefono,
               sf.status AS status_nombre
        FROM factura f
        LEFT JOIN cliente c ON f.cliente_id = c.id
        LEFT JOIN status_factura sf ON f.status_id = sf.id
        WHERE f.numero = $1
      `, [ref])
    }
    if (!factResult.rows.length) return res.status(404).json({ error: 'Factura no encontrada' })

    const itemsResult = await pool.query(`
      SELECT * FROM item_factura WHERE factura_id = $1 ORDER BY id
    `, [factResult.rows[0].id])

    const pagosResult = await pool.query(`
      SELECT fp.*, tp.tipo AS tipo_pago_nombre, tp.codigo AS tipo_pago_codigo
      FROM factura_pago fp
      LEFT JOIN tipo_pago tp ON fp.tipo_pago_id = tp.id
      WHERE fp.factura_id = $1 AND fp.anulado = false
      ORDER BY fp.fecha
    `, [factResult.rows[0].id])

    const otsResult = await pool.query(`
      SELECT ot.numero, ot.precio,
             p.nombre || ' ' || p.apellido AS paciente
      FROM orden_trabajo ot
      LEFT JOIN paciente p ON ot.paciente_id = p.id
      WHERE ot.factura_id = $1
    `, [factResult.rows[0].id])

    const tiposPago = await pool.query(`SELECT * FROM tipo_pago WHERE activo = true ORDER BY id`)
    const lab = await pool.query(`SELECT aplicar_igtf, igtf, tasa_cambio, moneda_id, nombre, rif FROM laboratorio LIMIT 1`)

    res.json({
      factura: factResult.rows[0],
      items: itemsResult.rows,
      pagos: pagosResult.rows,
      ordenes: otsResult.rows,
      tiposPago: tiposPago.rows,
      lab: lab.rows[0]
    })
  } catch(err) {
    console.error('Error GET /ot/factura:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════
// POST /api/ot/factura/:id/pago — Registrar pago
// ═══════════════════════════════════════════════════════
router.post('/factura/:id/pago', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const facturaId = parseInt(req.params.id)
    const { tipo_pago_id, monto, num_documento, monto_recibido } = req.body
    const userId = req.user?.userId || null

    const factCheck = await client.query('SELECT id, total_factura, status_id, moneda_id FROM factura WHERE id = $1', [facturaId])
    if (!factCheck.rows.length) return res.status(404).json({ error: 'Factura no encontrada' })
    if (factCheck.rows[0].status_id === 4) return res.status(400).json({ error: 'Factura anulada' })

    // Obtener moneda base del lab para moneda_base del pago
    const labPago = await client.query('SELECT moneda_id FROM laboratorio LIMIT 1')
    const monedaBase = labPago.rows[0]?.moneda_id || 1

    const pagosSum = await client.query('SELECT COALESCE(SUM(monto),0) AS total FROM factura_pago WHERE factura_id = $1 AND anulado = false', [facturaId])
    const totalPagado = parseFloat(pagosSum.rows[0].total)
    const totalFactura = parseFloat(factCheck.rows[0].total_factura)
    const pendiente = totalFactura - totalPagado

    if (parseFloat(monto) > pendiente + 0.01) {
      return res.status(400).json({ error: 'Monto excede el pendiente' })
    }

    const cambio = monto_recibido ? Math.max(0, parseFloat(monto_recibido) - parseFloat(monto)) : 0

    await client.query(`
      INSERT INTO factura_pago (factura_id, tipo_pago_id, monto, num_documento,
                                fecha, usuario_id, monto_recibido, monto_cambio_devuelto,
                                moneda_base)
      VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8)
    `, [facturaId, tipo_pago_id, monto, num_documento || null, userId,
        monto_recibido || null, cambio > 0 ? cambio : null, monedaBase])

    // Verificar si factura está completamente pagada
    const newPagosSum = await client.query('SELECT COALESCE(SUM(monto),0) AS total FROM factura_pago WHERE factura_id = $1 AND anulado = false', [facturaId])
    const nuevoTotal = parseFloat(newPagosSum.rows[0].total)

    if (nuevoTotal >= totalFactura - 0.01) {
      await client.query('UPDATE factura SET status_id = 3 WHERE id = $1', [facturaId])
    } else if (nuevoTotal > 0) {
      await client.query('UPDATE factura SET status_id = 2 WHERE id = $1', [facturaId])
    }

    await client.query('COMMIT')
    res.json({ ok: true })
  } catch(err) {
    await client.query('ROLLBACK')
    console.error('Error POST pago:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

export default router
