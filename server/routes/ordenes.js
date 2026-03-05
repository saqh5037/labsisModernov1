import { Router } from 'express'
import pool from '../db.js'

const router = Router()

// Format numeric result using prueba formato pattern
function formatNumResult(val, formato) {
  if (val == null) return ''
  const num = Number(val)
  if (isNaN(num)) return String(val)
  if (!formato || !/\./.test(formato)) return Math.round(num).toString()
  const match = formato.match(/\.([#0]+)/)
  const decimals = match ? match[1].length : 2
  if (formato.includes('#')) return parseFloat(num.toFixed(decimals)).toString()
  return num.toFixed(decimals)
}

// ── Shared filter builder (used by GET /api/ordenes and GET /api/ordenes/dashboard) ──
function buildFilterConditions(query) {
  const { numero, cedula, numFactura, numInicial, numFinal, fechaDesde, fechaHasta,
    estado, procedencia, area, prueba, servicioMedico, numIngreso, usuario,
    enviarEmail, emailEnviado } = query
  const params = []
  const conditions = []

  if (numero) {
    params.push(numero)
    conditions.push(`ot.numero::text ILIKE $${params.length} || '%'`)
  }
  if (cedula) {
    params.push(cedula)
    conditions.push(`p.ci_paciente::text ILIKE $${params.length} || '%'`)
  }
  if (numFactura) {
    params.push(numFactura)
    conditions.push(`ot.facturada_numero::text ILIKE '%' || $${params.length} || '%'`)
  }
  if (fechaDesde) {
    params.push(fechaDesde)
    conditions.push(`ot.fecha >= $${params.length}::date`)
  }
  if (fechaHasta) {
    params.push(fechaHasta + ' 23:59:59')
    conditions.push(`ot.fecha <= $${params.length}::timestamp`)
  }
  if (estado) {
    const estados = estado.split(',').map(e => parseInt(e))
    params.push(estados)
    conditions.push(`ot.status_id = ANY($${params.length})`)
  }
  if (numInicial && numFinal) {
    params.push(numInicial)
    params.push(numFinal)
    conditions.push(`ot.numero >= $${params.length - 1} AND ot.numero <= $${params.length}`)
  } else if (numInicial) {
    params.push(numInicial)
    conditions.push(`ot.numero >= $${params.length}`)
  } else if (numFinal) {
    params.push(numFinal)
    conditions.push(`ot.numero <= $${params.length}`)
  }
  if (procedencia) {
    params.push(parseInt(procedencia))
    conditions.push(`ot.procedencia_id = $${params.length}`)
  }
  if (area) {
    const areaIds = area.split(',').map(id => parseInt(id))
    params.push(areaIds)
    conditions.push(`EXISTS (SELECT 1 FROM prueba_orden po_f WHERE po_f.orden_id = ot.id AND po_f.area_id = ANY($${params.length}))`)
  }
  if (prueba) {
    params.push(parseInt(prueba))
    conditions.push(`EXISTS (SELECT 1 FROM prueba_orden po_f WHERE po_f.orden_id = ot.id AND po_f.prueba_id = $${params.length})`)
  }
  if (servicioMedico) {
    params.push(parseInt(servicioMedico))
    conditions.push(`ot.servicio_medico_id = $${params.length}`)
  }
  if (numIngreso) {
    params.push(numIngreso)
    conditions.push(`ot.num_ingreso::text ILIKE $${params.length} || '%'`)
  }
  if (usuario) {
    params.push(parseInt(usuario))
    conditions.push(`ot.usuario_id = $${params.length}`)
  }
  if (enviarEmail === 'si') conditions.push(`ot.sent_mail = true`)
  else if (enviarEmail === 'no') conditions.push(`ot.sent_mail = false`)
  if (emailEnviado === 'si') conditions.push(`ot.enviado_email_creacion = true`)
  else if (emailEnviado === 'no') conditions.push(`ot.enviado_email_creacion = false`)

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  return { params, where }
}

// GET /api/ordenes
router.get('/', async (req, res) => {
  try {
    const { orden, page = 1, limit = 25 } = req.query
    const { params, where } = buildFilterConditions(req.query)
    const offset = (parseInt(page) - 1) * parseInt(limit)

    // Ordenamiento sanitizado
    const orderDir = orden === 'asc' ? 'ASC' : 'DESC'

    const sql = `
      SELECT
        ot.id,
        ot.numero,
        ot.fecha,
        p.nombre || ' ' || p.apellido AS paciente,
        p.ci_paciente AS cedula,
        proc.nombre AS procedencia,
        sm.nombre AS "servicioMedico",
        ot.status_id,
        so.status,
        so.color,
        ot.num_ingreso
      FROM orden_trabajo ot
      LEFT JOIN paciente p ON ot.paciente_id = p.id
      LEFT JOIN procedencia proc ON ot.procedencia_id = proc.id
      LEFT JOIN status_orden so ON ot.status_id = so.id
      LEFT JOIN servicio_medico sm ON ot.servicio_medico_id = sm.id
      ${where}
      ORDER BY ot.fecha ${orderDir}, ot.numero ${orderDir}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `

    params.push(parseInt(limit))
    params.push(offset)

    const countSql = `
      SELECT COUNT(*) AS total
      FROM orden_trabajo ot
      LEFT JOIN paciente p ON ot.paciente_id = p.id
      LEFT JOIN procedencia proc ON ot.procedencia_id = proc.id
      LEFT JOIN status_orden so ON ot.status_id = so.id
      LEFT JOIN servicio_medico sm ON ot.servicio_medico_id = sm.id
      ${where}
    `

    const [dataResult, countResult] = await Promise.all([
      pool.query(sql, params),
      pool.query(countSql, params.slice(0, -2)),
    ])

    const total = parseInt(countResult.rows[0].total)
    const ordenes = dataResult.rows

    // When area filter is active, fetch per-area statuses for returned OTs
    let areaStatuses = null
    const { area } = req.query
    if (area && ordenes.length > 0) {
      const areaIds = area.split(',').map(id => parseInt(id))
      const otIds = ordenes.map(o => o.id)
      const saResult = await pool.query(`
        SELECT sa.orden_id, sa.area_id, a.area AS area_nombre,
               sa.status_orden_id, so.status, so.color,
               sa.entregada, sa.verificado, sa.is_activa_alarma_val_ref,
               sa.porcentaje_con_valor_resultado
        FROM status_area sa
        JOIN area a ON sa.area_id = a.id
        JOIN status_orden so ON sa.status_orden_id = so.id
        WHERE sa.orden_id = ANY($1) AND sa.area_id = ANY($2)
        ORDER BY a.area
      `, [otIds, areaIds])

      // Group by orden_id → { area_id: statusData }
      areaStatuses = {}
      for (const r of saResult.rows) {
        if (!areaStatuses[r.orden_id]) areaStatuses[r.orden_id] = {}
        areaStatuses[r.orden_id][r.area_id] = {
          status_id: r.status_orden_id,
          status: r.status,
          color: r.color,
          entregada: r.entregada,
          verificado: r.verificado,
          alarma: r.is_activa_alarma_val_ref,
          progreso: r.porcentaje_con_valor_resultado,
        }
      }
    }

    res.json({
      ordenes,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      ...(areaStatuses && { areaStatuses }),
    })
  } catch (err) {
    console.error('Error en /api/ordenes:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/ordenes/status — para los filtros de estado
router.get('/status', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, status, color FROM status_orden ORDER BY orden'
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/ordenes/dashboard — stats agregados para el dashboard lateral
router.get('/dashboard', async (req, res) => {
  try {
    const { params, where } = buildFilterConditions(req.query)
    const baseJoin = `FROM orden_trabajo ot
      LEFT JOIN paciente p ON ot.paciente_id = p.id
      LEFT JOIN procedencia proc ON ot.procedencia_id = proc.id
      LEFT JOIN status_orden so ON ot.status_id = so.id
      LEFT JOIN servicio_medico sm ON ot.servicio_medico_id = sm.id`

    // A) OTs por status
    const sqlPorStatus = `
      SELECT COUNT(DISTINCT ot.id) AS total,
             so.id AS status_id, so.status, so.color, so.orden
      ${baseJoin}
      ${where}
      GROUP BY so.id, so.status, so.color, so.orden
      ORDER BY so.orden ASC`

    // B) Progreso pruebas validadas (separate subqueries to avoid cartesian product)
    const sqlProgresoPruebas = `
      SELECT
        COUNT(po.id) AS total_pruebas,
        COUNT(CASE WHEN po.status_id IN (4,7) THEN 1 END) AS validadas
      FROM prueba_orden po
      JOIN orden_trabajo ot ON po.orden_id = ot.id
      LEFT JOIN paciente p ON ot.paciente_id = p.id
      LEFT JOIN procedencia proc ON ot.procedencia_id = proc.id
      LEFT JOIN status_orden so ON ot.status_id = so.id
      LEFT JOIN servicio_medico sm ON ot.servicio_medico_id = sm.id
      ${where}`

    const sqlProgresoMuestras = `
      SELECT
        COUNT(CASE WHEN mu.muestra_recibida = true THEN 1 END) AS muestras_procesadas,
        COUNT(CASE WHEN mu.muestra_recibida = false OR mu.muestra_recibida IS NULL THEN 1 END) AS muestras_pendientes,
        COUNT(*) AS total_muestras
      FROM muestra mu
      JOIN orden_trabajo ot ON mu.orden_id = ot.id
      LEFT JOIN paciente p ON ot.paciente_id = p.id
      LEFT JOIN procedencia proc ON ot.procedencia_id = proc.id
      LEFT JOIN status_orden so ON ot.status_id = so.id
      LEFT JOIN servicio_medico sm ON ot.servicio_medico_id = sm.id
      ${where}`

    // C) Progreso por área
    const sqlPorArea = `
      SELECT a.area, a.id AS area_id,
             AVG(sa.porcentaje_con_valor_resultado)::int AS progreso_promedio,
             COUNT(*) AS total,
             COUNT(CASE WHEN sa.status_orden_id = 4 THEN 1 END) AS validadas
      FROM status_area sa
      JOIN area a ON sa.area_id = a.id
      JOIN orden_trabajo ot ON sa.orden_id = ot.id
      LEFT JOIN paciente p ON ot.paciente_id = p.id
      LEFT JOIN procedencia proc ON ot.procedencia_id = proc.id
      LEFT JOIN status_orden so ON ot.status_id = so.id
      LEFT JOIN servicio_medico sm ON ot.servicio_medico_id = sm.id
      ${where}
      GROUP BY a.id, a.area
      ORDER BY a.area`

    const [statusRes, pruebasRes, muestrasRes, areaRes] = await Promise.all([
      pool.query(sqlPorStatus, params),
      pool.query(sqlProgresoPruebas, params),
      pool.query(sqlProgresoMuestras, params),
      pool.query(sqlPorArea, params),
    ])

    const pr = pruebasRes.rows[0] || {}
    const mu = muestrasRes.rows[0] || {}
    const totalPruebas = parseInt(pr.total_pruebas) || 0
    const validadas = parseInt(pr.validadas) || 0

    res.json({
      porStatus: statusRes.rows.map(r => ({
        status_id: r.status_id,
        status: r.status,
        color: r.color,
        total: parseInt(r.total),
      })),
      progreso: {
        totalPruebas,
        pruebasValidadas: validadas,
        porcentaje: totalPruebas > 0 ? Math.round((validadas / totalPruebas) * 100) : 0,
        muestrasProcesadas: parseInt(mu.muestras_procesadas) || 0,
        muestrasPendientes: parseInt(mu.muestras_pendientes) || 0,
        totalMuestras: parseInt(mu.total_muestras) || 0,
      },
      porArea: areaRes.rows.map(r => ({
        area: r.area,
        area_id: r.area_id,
        total: parseInt(r.total),
        progreso: parseInt(r.progreso_promedio) || 0,
        validadas: parseInt(r.validadas),
      })),
    })
  } catch (err) {
    console.error('Error en /api/ordenes/dashboard:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/ordenes/lab/areas ── Áreas activas con órdenes pendientes
router.get('/lab/areas', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT a.id, a.area AS nombre
      FROM area a
      JOIN status_area sa ON sa.area_id = a.id
      JOIN orden_trabajo ot ON sa.orden_id = ot.id
      WHERE ot.status_id NOT IN (4, 6, 7) AND a.activa = true
      ORDER BY a.area
    `)
    res.json({ data: result.rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/ordenes/lab/queue ── Cola de órdenes pendientes con filtros
router.get('/lab/queue', async (req, res) => {
  try {
    const { area, fechaDesde, fechaHasta, transmitido, estado, page = '1', limit = '50' } = req.query
    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50))
    const conditions = [`ot.status_id NOT IN (4, 6, 7)`]
    const params = []
    let idx = 1

    // Parse area IDs once
    const areaIds = area ? area.split(',').map(Number).filter(n => !isNaN(n)) : []

    if (areaIds.length) {
      conditions.push(`po.area_id IN (${areaIds.map(() => `$${idx++}`).join(',')})`)
      params.push(...areaIds)
    }
    if (fechaDesde) {
      conditions.push(`ot.fecha >= $${idx++}::date`)
      params.push(fechaDesde)
    }
    if (fechaHasta) {
      conditions.push(`ot.fecha <= $${idx++}::date + interval '1 day' - interval '1 second'`)
      params.push(fechaHasta)
    }
    if (transmitido === 'si') {
      conditions.push(`EXISTS (SELECT 1 FROM prueba_orden po2 WHERE po2.orden_id = ot.id AND po2.transmision_equipo = true)`)
    }
    if (estado === 'pendiente') {
      conditions.push(`EXISTS (SELECT 1 FROM prueba_orden po3 WHERE po3.orden_id = ot.id AND po3.status_id NOT IN (4,7))`)
    } else if (estado === 'validado') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM prueba_orden po3 WHERE po3.orden_id = ot.id AND po3.status_id NOT IN (4,7))`)
    }

    const havingClause = estado === 'validado'
      ? '' // Don't require pending when filtering for validated
      : 'HAVING SUM(CASE WHEN po.status_id NOT IN (4,7) THEN 1 ELSE 0 END) > 0'

    const result = await pool.query(`
      SELECT ot.numero, ot.fecha, ot.stat,
             p.nombre || ' ' || p.apellido AS paciente,
             p.sexo, p.fecha_nacimiento,
             COUNT(po.id)::int AS total_pruebas,
             SUM(CASE WHEN po.status_id IN (4,7) THEN 1 ELSE 0 END)::int AS validadas,
             SUM(CASE WHEN po.anormal = true THEN 1 ELSE 0 END)::int AS anormales,
             array_agg(DISTINCT a.area) FILTER (WHERE a.area IS NOT NULL) AS areas
      FROM orden_trabajo ot
      JOIN paciente p ON ot.paciente_id = p.id
      JOIN prueba_orden po ON po.orden_id = ot.id
      LEFT JOIN area a ON po.area_id = a.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY ot.numero, ot.fecha, ot.stat, p.nombre, p.apellido, p.sexo, p.fecha_nacimiento
      ${havingClause}
      ORDER BY ot.stat DESC NULLS LAST, ot.fecha DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, [...params, limitNum + 1, (pageNum - 1) * limitNum])
    const hasMore = result.rows.length > limitNum
    const rows = hasMore ? result.rows.slice(0, limitNum) : result.rows
    res.json({ rows, page: pageNum, hasMore })
  } catch (err) {
    console.error('Error en lab queue:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/ordenes/lab/notas-predefinidas ── Catálogo de notas predefinidas
// NOTE: Must be BEFORE /:numero to avoid being captured by that wildcard route
router.get('/lab/notas-predefinidas', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, titulo, texto, codigo
      FROM prueba_nota_predefinida
      ORDER BY titulo
    `)
    res.json(result.rows)
  } catch (err) {
    if (err.code === '42P01') return res.json([])
    console.error('GET notas-predefinidas error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/ordenes/lab/quick-search?q=... ── Búsqueda rápida por barcode/número/CI/nombre
// NOTE: Must be BEFORE /:numero to avoid being captured by that wildcard route
router.get('/lab/quick-search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.length < 2) return res.json([])

    let results = []

    // 1. Si contiene guión → buscar por barcode de muestra
    if (q.includes('-')) {
      const r = await pool.query(`
        SELECT DISTINCT ot.numero,
               p.nombre || ' ' || p.apellido AS paciente_nombre,
               so.status, so.color
        FROM muestra m
        JOIN orden_trabajo ot ON m.orden_id = ot.id
        JOIN paciente p ON ot.paciente_id = p.id
        LEFT JOIN status_orden so ON ot.status_id = so.id
        WHERE m.barcode = $1
        LIMIT 1
      `, [q.trim()])
      results = r.rows
    }

    // 2. Si son solo dígitos → buscar por número de orden
    if (results.length === 0 && /^\d{4,10}$/.test(q.trim())) {
      const r = await pool.query(`
        SELECT ot.numero,
               p.nombre || ' ' || p.apellido AS paciente_nombre,
               so.status, so.color
        FROM orden_trabajo ot
        JOIN paciente p ON ot.paciente_id = p.id
        LEFT JOIN status_orden so ON ot.status_id = so.id
        WHERE ot.numero = $1
        LIMIT 1
      `, [q.trim()])
      results = r.rows
    }

    // 3. Buscar por CI o nombre de paciente
    if (results.length === 0) {
      const searchTerm = `%${q.trim()}%`
      const r = await pool.query(`
        SELECT DISTINCT ON (ot.numero) ot.numero,
               p.nombre || ' ' || p.apellido AS paciente_nombre,
               so.status, so.color
        FROM orden_trabajo ot
        JOIN paciente p ON ot.paciente_id = p.id
        LEFT JOIN status_orden so ON ot.status_id = so.id
        WHERE (p.ci_paciente ILIKE $1
          OR sin_acentos(p.nombre || ' ' || p.apellido) ILIKE sin_acentos($1))
          AND ot.fecha >= NOW() - INTERVAL '30 days'
        ORDER BY ot.numero, ot.fecha DESC
        LIMIT 10
      `, [searchTerm])
      results = r.rows
    }

    res.json(results)
  } catch (err) {
    console.error('GET /ordenes/lab/quick-search error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/ordenes/:numero — detalle completo de una orden
router.get('/:numero', async (req, res) => {
  try {
    const { numero } = req.params

    const otSql = `
      SELECT ot.id, ot.numero, ot.fecha, ot.informacion_clinica, ot.observaciones,
             ot.num_ingreso, ot.folio, ot.habitacion, ot.peso, ot.estatura, ot.embarazada,
             ot.facturada_numero, ot.factura_id, ot.precio, ot.fecha_estimada_entrega,
             ot.fecha_toma_muestra, ot.entregada, ot.etiquetas_impresas,
             ot.numero_solicitud, ot.stat,
             p.nombre || ' ' || p.apellido AS paciente,
             p.ci_paciente, p.fecha_nacimiento, p.sexo, p.telefono, p.telefono_celular,
             p.email, p.direccion, p.num_historia,
             proc.nombre AS procedencia, proc.codigo AS proc_codigo,
             sm.nombre AS servicio_medico,
             so.status, so.color, so.id AS status_id,
             u.nombre || ' ' || u.apellido AS usuario_registro,
             dl.nombre_dpto AS departamento,
             COALESCE(NULLIF(TRIM(m.nombre || ' ' || COALESCE(m.apellido_paterno,'') || ' ' || COALESCE(m.apellido_materno,'')), ''), ot.medico) AS medico_nombre,
             m.email AS medico_email, m.telefono AS medico_telefono
      FROM orden_trabajo ot
      LEFT JOIN paciente p ON ot.paciente_id = p.id
      LEFT JOIN procedencia proc ON ot.procedencia_id = proc.id
      LEFT JOIN servicio_medico sm ON ot.servicio_medico_id = sm.id
      LEFT JOIN status_orden so ON ot.status_id = so.id
      LEFT JOIN usuario u ON ot.usuario_id = u.id
      LEFT JOIN departamento_laboratorio dl ON ot.departamento_laboratorio_id = dl.id
      LEFT JOIN medico m ON ot.medico_id = m.id
      WHERE ot.numero = $1
    `
    const otResult = await pool.query(otSql, [numero])
    if (otResult.rows.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' })
    }

    const orden = otResult.rows[0]

    const [pruebasResult, gruposResult, muestrasResult] = await Promise.all([
      pool.query(`
        SELECT po.id, pr.nombre AS prueba, a.area AS area, po.precio,
               so.status AS status_prueba, so.color,
               po.anormal, po.critico, po.fecha_validacion,
               po.gp_orden_id, po.gp_id,
               gp.nombre AS grupo_nombre
        FROM prueba_orden po
        LEFT JOIN prueba pr ON po.prueba_id = pr.id
        LEFT JOIN area a ON po.area_id = a.id
        LEFT JOIN status_orden so ON po.status_id = so.id
        LEFT JOIN grupo_prueba gp ON po.gp_id = gp.id
        WHERE po.orden_id = $1
        ORDER BY gp.nombre, pr.nombre
      `, [orden.id]),
      pool.query(`
        SELECT go.id, gp.nombre, go.precio
        FROM gprueba_orden go
        JOIN grupo_prueba gp ON gp.id = go.gp_id
        WHERE go.orden_id = $1
        ORDER BY go.id
      `, [orden.id]),
      pool.query(`
        SELECT mu.id, mu.barcode, mu.cantidad, mu.muestra_recibida,
               mu.fecha_toma_muestra,
               tm.tipo AS tipo_muestra, tc.tipo AS contenedor, tc.abreviacion AS contenedor_abrev,
               (SELECT string_agg(UPPER(SUBSTRING(pr2.nombre, 1, 8)), ', ' ORDER BY pr2.nombre)
                FROM prueba_orden po2
                JOIN prueba pr2 ON po2.prueba_id = pr2.id
                WHERE po2.orden_id = mu.orden_id
                  AND po2.area_id::text = ANY(string_to_array(mu.areas_ids, ','))
               ) AS nomenclatura
        FROM muestra mu
        LEFT JOIN tipo_muestra tm ON mu.tipo_muestra_id = tm.id
        LEFT JOIN tipo_contenedor tc ON mu.tipo_contenedor_id = tc.id
        WHERE mu.orden_id = $1
        ORDER BY mu.id
      `, [orden.id]),
    ])

    res.json({
      ...orden,
      pruebas: pruebasResult.rows,
      grupos: gruposResult.rows,
      muestras: muestrasResult.rows,
    })
  } catch (err) {
    console.error('Error en /api/ordenes/:numero:', err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/ordenes/:numero/medico
router.patch('/:numero/medico', async (req, res) => {
  try {
    const { numero } = req.params
    const { medico_id } = req.body
    await pool.query('UPDATE orden_trabajo SET medico_id = $1 WHERE numero = $2', [medico_id, numero])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/ordenes/:numero/info-clinica
router.patch('/:numero/info-clinica', async (req, res) => {
  try {
    const { numero } = req.params
    const { informacion_clinica } = req.body
    await pool.query('UPDATE orden_trabajo SET informacion_clinica = $1 WHERE numero = $2', [informacion_clinica, numero])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/ordenes/:numero/fecha-toma
router.patch('/:numero/fecha-toma', async (req, res) => {
  try {
    const { numero } = req.params
    const { fecha_toma_muestra } = req.body
    await pool.query('UPDATE orden_trabajo SET fecha_toma_muestra = $1 WHERE numero = $2', [fecha_toma_muestra, numero])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/ordenes/:numero/stat
router.patch('/:numero/stat', async (req, res) => {
  try {
    const { numero } = req.params
    await pool.query('UPDATE orden_trabajo SET stat = true WHERE numero = $1', [numero])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/ordenes/:numero/abortar
router.patch('/:numero/abortar', async (req, res) => {
  try {
    const { numero } = req.params
    const check = await pool.query('SELECT id, status_id FROM orden_trabajo WHERE numero = $1', [numero])
    if (!check.rows.length) return res.status(404).json({ error: 'Orden no encontrada' })
    const statusId = check.rows[0].status_id
    if (statusId === 4) return res.status(400).json({ error: 'No se puede abortar una orden validada' })
    if (statusId === 6) return res.status(400).json({ error: 'La orden ya está abortada' })
    await pool.query('UPDATE orden_trabajo SET status_id = 6 WHERE numero = $1', [numero])
    await pool.query(
      `INSERT INTO accion_log (usuario_id, accion, realizado, realizado_timestamp, orden_id)
       VALUES ($1, 'ABORTADA ORDEN', NOW(), NOW(), $2)`,
      [req.user?.userId || 0, check.rows[0].id]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/ordenes/:numero/activar — reactivar orden abortada (status 6 → 1)
router.patch('/:numero/activar', async (req, res) => {
  try {
    const { numero } = req.params
    const check = await pool.query('SELECT id, status_id FROM orden_trabajo WHERE numero = $1', [numero])
    if (!check.rows.length) return res.status(404).json({ error: 'Orden no encontrada' })
    if (check.rows[0].status_id !== 6) return res.status(400).json({ error: 'Solo se pueden activar órdenes abortadas' })
    const ordenId = check.rows[0].id
    await pool.query('UPDATE orden_trabajo SET status_id = 1 WHERE numero = $1', [numero])
    await pool.query('UPDATE status_area SET status_orden_id = 1 WHERE orden_id = $1', [ordenId])
    await pool.query(
      `INSERT INTO accion_log (usuario_id, accion, realizado, realizado_timestamp, orden_id)
       VALUES ($1, 'ACTIVADA ORDEN', NOW(), NOW(), $2)`,
      [req.user?.userId || 0, ordenId]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/ordenes/:numero/instrucciones — instrucciones de toma de muestra
router.get('/:numero/instrucciones', async (req, res) => {
  try {
    const { numero } = req.params
    const result = await pool.query(`
      SELECT DISTINCT itm.id, itm.codigo, itm.informacion, itm.condicion_especial, itm.orden_privilegio
      FROM informacion_toma_muestra itm
      JOIN prueba_has_informacion_toma_muestra phitm ON phitm.informacion_toma_muestra_id = itm.id
      JOIN prueba p ON p.id = phitm.prueba_id
      JOIN prueba_orden po ON po.prueba_id = p.id
      WHERE po.orden_id = (SELECT id FROM orden_trabajo WHERE numero = $1)
        AND itm.activa = true
      ORDER BY itm.orden_privilegio DESC, itm.codigo
    `, [numero])
    res.json({ instrucciones: result.rows })
  } catch (err) {
    console.error('Error en instrucciones:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/ordenes/:numero/preguntas — preguntas pre-analíticas de la orden
router.get('/:numero/preguntas', async (req, res) => {
  try {
    const { numero } = req.params
    const result = await pool.query(`
      SELECT pip_ot.id, pip_ot.pregunta, pip_ot.respuesta, pip_ot.orden_posicion, pip_ot.codigo,
             tpi.tipo
      FROM pregunta_ingreso_prueba_orden_trabajo pip_ot
      JOIN tipo_pregunta_ingreso tpi ON tpi.id = pip_ot.tipo_pregunta_ingreso_id
      WHERE pip_ot.orden_id = (SELECT id FROM orden_trabajo WHERE numero = $1)
      ORDER BY pip_ot.orden_posicion
    `, [numero])
    res.json({ preguntas: result.rows })
  } catch (err) {
    console.error('Error en preguntas:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/ordenes/:numero/recibo — datos fiscales para recibo de crédito
router.get('/:numero/recibo', async (req, res) => {
  try {
    const { numero } = req.params
    const result = await pool.query(`
      SELECT c.nombre AS cliente_nombre, c.ci_rif, c.email AS cliente_email,
             c.direccion AS cliente_direccion,
             s.descripcion AS servicio_desc
      FROM orden_trabajo ot
      LEFT JOIN servicio s ON s.id = ot.servicio_id
      LEFT JOIN cliente c ON c.id = s.cliente_id
      WHERE ot.numero = $1
    `, [numero])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Orden no encontrada' })
    res.json(result.rows[0])
  } catch (err) {
    console.error('Error en recibo:', err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/ordenes/:numero/muestras-no-entregadas
router.patch('/:numero/muestras-no-entregadas', async (req, res) => {
  try {
    const { numero } = req.params
    const check = await pool.query('SELECT id FROM orden_trabajo WHERE numero = $1', [numero])
    if (!check.rows.length) return res.status(404).json({ error: 'Orden no encontrada' })
    const ordenId = check.rows[0].id
    await pool.query('UPDATE muestra SET status_muestra_id = 5 WHERE orden_id = $1', [ordenId])
    res.json({ ok: true, message: 'Muestras marcadas como No Entregadas' })
  } catch (err) {
    console.error('Error en muestras no entregadas:', err)
    res.status(500).json({ error: err.message })
  }
})

// (Moved to before /:numero route to avoid being shadowed)

// ── GET /api/ordenes/:numero/lab ── Datos para pantalla de ingreso de resultados
router.get('/:numero/lab', async (req, res) => {
  try {
    const { numero } = req.params

    // 1. Datos de la orden + paciente (enriquecido)
    const otResult = await pool.query(`
      SELECT ot.id, ot.numero, ot.fecha, ot.stat,
             ot.observaciones AS ot_observaciones,
             ot.informacion_clinica, ot.embarazada, ot.semanas_embarazo,
             ot.peso, ot.estatura, ot.medico, ot.numero_solicitud,
             ot.fecha_toma_muestra, ot.fecha_estimada_entrega,
             so.status, so.color, so.id AS status_id,
             p.nombre || ' ' || p.apellido AS paciente_nombre,
             p.ci_paciente, p.sexo, p.fecha_nacimiento,
             p.telefono, p.telefono_celular, p.email,
             p.medicamentos, p.num_historia, p.vip, p.observaciones AS pac_observaciones
      FROM orden_trabajo ot
      LEFT JOIN paciente p ON ot.paciente_id = p.id
      LEFT JOIN status_orden so ON ot.status_id = so.id
      WHERE ot.numero = $1
    `, [numero])
    if (!otResult.rows.length) return res.status(404).json({ error: 'Orden no encontrada' })
    const ot = otResult.rows[0]

    // 2. Pruebas con resultados
    const pruebasResult = await pool.query(`
      SELECT
        po.id, po.prueba_id, po.area_id, po.status_id, po.anormal, po.critico,
        po.corregida, po.fecha_validacion, po.gp_id, po.gp_orden_id,
        pr.nombre AS prueba, pr.codigo_labsis AS prueba_codigo, pr.orden AS prueba_orden,
        tp.codigo AS tipo_prueba,
        a.area AS area_nombre,
        u.simbolo AS unidad,
        pr.metodologia AS metodo,
        eq.nombre AS equipo_nombre,
        meq.nombre AS equipo_marca,
        po.transmision_equipo,
        rn.valor AS resultado_valor, rn.alarma AS alarma_simbolo,
        rn.validado_por, rn.menor_mayor,
        ra.valor AS resultado_alpha, ra.alarma AS alarma_alpha,
        gp.nombre AS grupo_nombre,
        pr.formato, pr.valor_por_defecto,
        rn.repeticiones,
        CASE WHEN EXISTS (SELECT 1 FROM regla_validacion rv WHERE rv.prueba_id = pr.id AND rv.activa = true)
          THEN true ELSE false END AS tiene_regla_autovalidacion,
        CASE WHEN EXISTS (
          SELECT 1 FROM prueba_orden_log pol
          WHERE pol.prueba_orden_id = po.id AND pol.tipo_accion = 'AUTOVALIDACION'
        ) THEN true ELSE false END AS fue_autovalidada,
        (SELECT string_agg(pon.texto, '; ')
         FROM prueba_orden_has_prueba_orden_nota ponh
         JOIN prueba_orden_nota pon ON ponh.prueba_orden_nota_id = pon.id
         WHERE ponh.prueba_orden_id = po.id
        ) AS notas,
        po.verificado,
        (SELECT opo.observacion FROM observacion_prueba_orden opo
         WHERE opo.pruebao_id = po.id LIMIT 1
        ) AS equipo_observaciones,
        (SELECT rn2.valor FROM orden_trabajo ot2
         JOIN prueba_orden po2 ON po2.orden_id = ot2.id
         JOIN resultado_numer rn2 ON rn2.pruebao_id = po2.id
         WHERE ot2.paciente_id = (SELECT paciente_id FROM orden_trabajo WHERE id = po.orden_id)
           AND po2.prueba_id = po.prueba_id
           AND ot2.id != po.orden_id
           AND rn2.valor IS NOT NULL
         ORDER BY ot2.fecha DESC LIMIT 1
        ) AS prev_valor
      FROM prueba_orden po
      LEFT JOIN prueba pr ON po.prueba_id = pr.id
      LEFT JOIN tipo_prueba tp ON pr.tipo_prueba_id = tp.id
      LEFT JOIN area a ON po.area_id = a.id
      LEFT JOIN unidad u ON pr.unidad_id = u.id
      LEFT JOIN equipo eq ON pr.equipo_id = eq.id
      LEFT JOIN marca_equipo meq ON eq.marca_equipo_id = meq.id
      LEFT JOIN resultado_numer rn ON rn.pruebao_id = po.id
      LEFT JOIN resultado_alpha ra ON ra.pruebao_id = po.id
      LEFT JOIN grupo_prueba gp ON po.gp_id = gp.id
      WHERE po.orden_id = $1
      ORDER BY a.area, COALESCE(po.gp_id, 0), pr.orden, pr.nombre
    `, [ot.id])

    // 3. Rangos de referencia
    // Columns: valor_desde (min), valor_hasta (max), panico (boolean), comentario
    const pruebaIds = [...new Set(pruebasResult.rows.map(r => r.prueba_id))]
    let rangos = []
    if (pruebaIds.length > 0) {
      const rangosResult = await pool.query(`
        SELECT vr.id, vr.prueba_id, vr.sexo, vr.edad_desde, vr.edad_hasta,
               vr.valor_desde, vr.valor_hasta, vr.panico, vr.comentario,
               ut.unidad AS unidad_tiempo
        FROM valor_referencial vr
        LEFT JOIN unidad_tiempo ut ON vr.unidad_tiempo_id = ut.id
        WHERE vr.prueba_id = ANY($1) AND (vr.activo IS NULL OR vr.activo = true)
      `, [pruebaIds])
      rangos = rangosResult.rows
    }

    // 3b. Fórmulas para pruebas tipo CAL
    let formulas = {}
    const calIds = pruebasResult.rows.filter(r => r.tipo_prueba === 'CAL').map(r => r.prueba_id)
    if (calIds.length > 0) {
      const fResult = await pool.query(`
        SELECT fp.prueba_id, fp.formula,
          json_agg(json_build_object('id', pv.id, 'nombre', pv.nombre)) AS variables
        FROM formula_prueba fp
        LEFT JOIN LATERAL (
          SELECT DISTINCT p2.id, p2.nombre
          FROM prueba p2
          WHERE CAST(p2.id AS text) IN (
            SELECT (regexp_matches(fp.formula, '\\$(\\d+)\\$', 'g'))[1]
          )
        ) pv ON true
        WHERE fp.prueba_id = ANY($1)
        GROUP BY fp.prueba_id, fp.formula
      `, [calIds])
      for (const row of fResult.rows) {
        // Build readable formula: replace $ID$ with variable name
        let readable = row.formula
        const vars = (row.variables || []).filter(v => v.id)
        for (const v of vars) {
          readable = readable.replace(new RegExp(`\\$${v.id}\\$`, 'g'), v.nombre)
        }
        formulas[row.prueba_id] = { raw: row.formula, readable, variables: vars }
      }
    }

    // 3c. Opciones para pruebas tipo SEL y AYU
    let opciones = {}
    const selIds = [...new Set(pruebasResult.rows.filter(r => r.tipo_prueba === 'SEL' || r.tipo_prueba === 'AYU').map(r => r.prueba_id))]
    if (selIds.length > 0) {
      const opResult = await pool.query(`
        SELECT prueba_id, id, opcion, codigo, referencial, orden_posicion
        FROM opcion_prueba WHERE prueba_id = ANY($1)
        ORDER BY prueba_id, orden_posicion, opcion
      `, [selIds])
      for (const row of opResult.rows) {
        if (!opciones[row.prueba_id]) opciones[row.prueba_id] = []
        opciones[row.prueba_id].push({
          id: row.id, opcion: row.opcion, codigo: row.codigo, referencial: row.referencial
        })
      }
    }

    // 4. Agrupar por área
    const pacSexo = ot.sexo
    const pacEdad = ot.fecha_nacimiento
      ? Math.floor((Date.now() - new Date(ot.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    const areasMap = {}
    for (const row of pruebasResult.rows) {
      const areaId = row.area_id
      if (!areasMap[areaId]) {
        areasMap[areaId] = { id: areaId, nombre: row.area_nombre, pruebas: [] }
      }

      // Rango aplicable (filtrar por sexo/edad del paciente)
      const rangosPrueba = rangos.filter(r => r.prueba_id === row.prueba_id)
      const matchesPaciente = r => {
        if (r.sexo && r.sexo.trim() && r.sexo.trim() !== pacSexo) return false
        if (r.edad_desde != null && pacEdad != null && pacEdad < r.edad_desde) return false
        if (r.edad_hasta != null && pacEdad != null && pacEdad > r.edad_hasta) return false
        return true
      }
      // Normal range (panico = false)
      const rangosNormales = rangosPrueba.filter(r => !r.panico)
      const rangoAplicable = rangosNormales.find(matchesPaciente) || rangosNormales[0] || null
      // Panic ranges (panico = true) — can be low and/or high
      const rangosPanico = rangosPrueba.filter(r => r.panico)
      const panicosAplicables = rangosPanico.filter(matchesPaciente)
      const panicosUsar = panicosAplicables.length > 0 ? panicosAplicables : rangosPanico

      // Build reference text from range values
      let refTexto = ''
      if (rangoAplicable) {
        const min = rangoAplicable.valor_desde != null ? Number(rangoAplicable.valor_desde) : null
        const max = rangoAplicable.valor_hasta != null ? Number(rangoAplicable.valor_hasta) : null
        if (min != null && max != null) refTexto = `${min} – ${max}`
        else if (min != null) refTexto = `≥ ${min}`
        else if (max != null) refTexto = `≤ ${max}`
        if (rangoAplicable.comentario) refTexto += (refTexto ? ' ' : '') + rangoAplicable.comentario
      }

      areasMap[areaId].pruebas.push({
        id: row.id,
        prueba_id: row.prueba_id,
        prueba: row.prueba,
        prueba_codigo: row.prueba_codigo,
        tipo: row.tipo_prueba || 'NUM',
        unidad: row.unidad || '',
        metodo: row.metodo || '',
        equipo: row.equipo_nombre || null,
        equipo_marca: row.equipo_marca || null,
        transmision_equipo: row.transmision_equipo || false,
        formula: formulas[row.prueba_id] || null,
        formato: row.formato || null,
        valor_por_defecto: row.valor_por_defecto || null,
        menor_mayor: row.menor_mayor || null,
        opciones: opciones[row.prueba_id] || null,
        resultado: row.tipo_prueba === 'ALF' || row.tipo_prueba === 'TXT' || row.tipo_prueba === 'SEL' || row.tipo_prueba === 'AYU'
          ? row.resultado_alpha
          : (row.resultado_valor != null ? formatNumResult(row.resultado_valor, row.formato) : ''),
        alarma: row.alarma_simbolo || row.alarma_alpha || null,
        status_id: row.status_id,
        anormal: row.anormal,
        critico: row.critico,
        corregida: row.corregida || false,
        fecha_validacion: row.fecha_validacion,
        grupo: row.grupo_nombre,
        repeticiones: parseInt(row.repeticiones) || 0,
        tiene_regla_autovalidacion: row.tiene_regla_autovalidacion || false,
        fue_autovalidada: row.fue_autovalidada || false,
        notas: row.notas || '',
        verificado: row.verificado || false,
        equipo_observaciones: row.equipo_observaciones || null,
        prev_valor: row.prev_valor != null ? Number(row.prev_valor) : null,
        referencia: rangoAplicable ? (() => {
          // Panic limits from separate panico=true rows
          let cMin = null, cMax = null
          for (const pr of panicosUsar) {
            const pLow = pr.valor_desde != null ? Number(pr.valor_desde) : null
            const pHigh = pr.valor_hasta != null ? Number(pr.valor_hasta) : null
            // Panic LOW row: e.g., 0-40 → anything ≤ valor_hasta is panic low
            if (pHigh != null && (rangoAplicable.valor_desde != null) && pHigh <= Number(rangoAplicable.valor_desde)) {
              cMin = pHigh
            }
            // Panic HIGH row: e.g., 400-999 → anything ≥ valor_desde is panic high
            if (pLow != null && (rangoAplicable.valor_hasta != null) && pLow >= Number(rangoAplicable.valor_hasta)) {
              cMax = pLow
            }
          }
          return {
            min: rangoAplicable.valor_desde != null ? Number(rangoAplicable.valor_desde) : null,
            max: rangoAplicable.valor_hasta != null ? Number(rangoAplicable.valor_hasta) : null,
            critico_min: cMin,
            critico_max: cMax,
            texto: refTexto
          }
        })() : null
      })
    }

    // 5. Status de cada área (para sidebar "otras áreas")
    const statusAreaResult = await pool.query(`
      SELECT sa.area_id, a.area AS nombre, sa.status_orden_id,
             so.status AS status_nombre, so.color,
             sa.porcentaje_con_valor_resultado AS porcentaje,
             sa.verificado, sa.entregada,
             sa.observaciones
      FROM status_area sa
      JOIN area a ON sa.area_id = a.id
      LEFT JOIN status_orden so ON sa.status_orden_id = so.id
      WHERE sa.orden_id = $1
      ORDER BY a.area
    `, [ot.id])

    // Complementar con áreas que no tienen status_area aún
    const areasStatus = []
    const statusMap = {}
    for (const r of statusAreaResult.rows) {
      statusMap[r.area_id] = r
    }
    for (const area of Object.values(areasMap)) {
      const sa = statusMap[area.id]
      const totalP = area.pruebas.length
      const validadas = area.pruebas.filter(p => p.status_id === 4 || p.status_id === 7).length
      const conValor = area.pruebas.filter(p => p.resultado).length
      areasStatus.push({
        area_id: area.id,
        nombre: area.nombre,
        total: totalP,
        conValor,
        validadas,
        porcentaje: sa ? Number(sa.porcentaje || 0) : (totalP ? Math.round(validadas / totalP * 100) : 0),
        status_id: sa?.status_orden_id || null,
        status: sa?.status_nombre || (validadas === totalP && totalP > 0 ? 'Validada' : conValor > 0 ? 'En Proceso' : 'Pendiente'),
        color: sa?.color || null,
        verificado: sa?.verificado || false,
        observaciones: sa?.observaciones || ''
      })
    }

    res.json({
      orden: {
        numero: ot.numero, fecha: ot.fecha, status: ot.status, color: ot.color,
        status_id: ot.status_id, stat: ot.stat,
        observaciones: ot.ot_observaciones || null,
        informacion_clinica: ot.informacion_clinica || null,
        embarazada: ot.embarazada || false,
        semanas_embarazo: ot.semanas_embarazo || null,
        peso: ot.peso || null,
        estatura: ot.estatura || null,
        medico: ot.medico || null,
        numero_solicitud: ot.numero_solicitud || null,
        fecha_toma_muestra: ot.fecha_toma_muestra || null,
        fecha_estimada_entrega: ot.fecha_estimada_entrega || null
      },
      paciente: {
        nombre: ot.paciente_nombre, ci: ot.ci_paciente, sexo: ot.sexo,
        fecha_nacimiento: ot.fecha_nacimiento,
        telefono: ot.telefono || ot.telefono_celular || null,
        email: ot.email || null,
        medicamentos: ot.medicamentos || null,
        num_historia: ot.num_historia || null,
        vip: ot.vip || false,
        observaciones: ot.pac_observaciones || null
      },
      areas: Object.values(areasMap),
      areasStatus
    })
  } catch (err) {
    console.error('Error en /api/ordenes/:numero/lab:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── Roles que pueden capturar y validar resultados ──
const ROLES_LAB = ['ADM', 'ANA', 'COORD', 'DTTEC']

// Helper: verificar si usuario tiene algún rol de laboratorio
function hasLabRole(user) {
  return user.roles && user.roles.some(r => ROLES_LAB.includes(r))
}

// Helper: obtener bioanalista_id del usuario
async function getBioanalistaId(client, userId) {
  const r = await client.query('SELECT id FROM bioanalista WHERE usuario_id = $1', [userId])
  return r.rows[0]?.id || null
}

// ── PUT /api/ordenes/:numero/lab/resultados ── Guardar resultados (con transacción)
router.put('/:numero/lab/resultados', async (req, res) => {
  const client = await pool.connect()
  try {
    const { numero } = req.params
    const { resultados, observaciones_area } = req.body
    const user = req.user

    if (!Array.isArray(resultados) || resultados.length === 0) {
      client.release()
      return res.status(400).json({ error: 'resultados debe ser un array no vacío' })
    }

    // ── Control de roles ──
    const canValidate = hasLabRole(user)
    const hasValidaciones = resultados.some(r => r.validado !== undefined)
    if (hasValidaciones && !canValidate) {
      return res.status(403).json({ error: 'No tiene permisos para validar resultados. Roles requeridos: ' + ROLES_LAB.join(', ') })
    }

    // Solo ANA/ADM/COORD/DTTEC pueden capturar resultados
    const hasValores = resultados.some(r => r.valor !== undefined)
    if (hasValores && !canValidate) {
      return res.status(403).json({ error: 'No tiene permisos para capturar resultados' })
    }

    await client.query('BEGIN')

    const otData = await client.query(`
      SELECT ot.id, ot.status_id AS ot_status, p.sexo, p.fecha_nacimiento
      FROM orden_trabajo ot
      LEFT JOIN paciente p ON ot.paciente_id = p.id
      WHERE ot.numero = $1
    `, [numero])
    if (!otData.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Orden no encontrada' })
    }

    const ordenId = otData.rows[0].id
    const pacSexo = otData.rows[0]?.sexo
    const pacEdad = otData.rows[0]?.fecha_nacimiento
      ? Math.floor((Date.now() - new Date(otData.rows[0].fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    // Obtener bioanalista_id del usuario autenticado
    const bioanalistaId = await getBioanalistaId(client, user.userId)

    const areasAfectadas = new Set()

    for (const r of resultados) {
      const poResult = await client.query(`
        SELECT po.id, po.prueba_id, po.area_id, po.status_id AS po_status,
               po.fecha_validacion AS po_fecha_val,
               tp.codigo AS tipo,
               COALESCE(u.unidad, '') AS unidad_nombre,
               COALESCE(u.simbolo, '') AS unidad_simbolo
        FROM prueba_orden po
        LEFT JOIN prueba pr ON po.prueba_id = pr.id
        LEFT JOIN tipo_prueba tp ON pr.tipo_prueba_id = tp.id
        LEFT JOIN unidad u ON pr.unidad_id = u.id
        WHERE po.id = $1 AND po.orden_id = $2
      `, [r.prueba_orden_id, ordenId])
      if (!poResult.rows.length) continue
      const po = poResult.rows[0]
      const tipo = po.tipo || 'NUM'
      const pruebaId = po.prueba_id
      if (po.area_id) areasAfectadas.add(po.area_id)

      // Calculate alarm for NUM types
      let alarmaStr = ''
      let isAnormal = false
      let isCritico = false
      if ((tipo === 'NUM' || tipo === 'CAL') && r.valor !== undefined && r.valor !== '' && r.valor != null) {
        const numVal = parseFloat(r.valor)
        if (!isNaN(numVal)) {
          const refResult = await client.query(`
            SELECT valor_desde, valor_hasta, panico, sexo, edad_desde, edad_hasta
            FROM valor_referencial WHERE prueba_id = $1 AND (activo IS NULL OR activo = true)
          `, [pruebaId])
          const matchesPac = rng => {
            if (rng.sexo && rng.sexo.trim() && rng.sexo.trim() !== pacSexo) return false
            if (rng.edad_desde != null && pacEdad != null && pacEdad < rng.edad_desde) return false
            if (rng.edad_hasta != null && pacEdad != null && pacEdad > rng.edad_hasta) return false
            return true
          }
          const normales = refResult.rows.filter(r => !r.panico)
          const ref = normales.find(matchesPac) || normales[0] || null
          // Panic ranges (separate rows with panico=true)
          const panicRows = refResult.rows.filter(r => r.panico)
          const panicMatch = panicRows.filter(matchesPac)
          const panicUsar = panicMatch.length > 0 ? panicMatch : panicRows

          if (ref) {
            const vMin = ref.valor_desde != null ? Number(ref.valor_desde) : null
            const vMax = ref.valor_hasta != null ? Number(ref.valor_hasta) : null
            // Derive panic thresholds from panic rows
            let pMin = null, pMax = null
            for (const pr of panicUsar) {
              const pLow = pr.valor_desde != null ? Number(pr.valor_desde) : null
              const pHigh = pr.valor_hasta != null ? Number(pr.valor_hasta) : null
              if (pHigh != null && vMin != null && pHigh <= vMin) pMin = pHigh
              if (pLow != null && vMax != null && pLow >= vMax) pMax = pLow
            }
            // alarma is char(1) in resultado_numer: H/L/N only. critico flag lives in prueba_orden.
            if (pMax != null && numVal >= pMax) { alarmaStr = 'H'; isAnormal = true; isCritico = true }
            else if (pMin != null && numVal <= pMin) { alarmaStr = 'L'; isAnormal = true; isCritico = true }
            else if (vMax != null && numVal > vMax) { alarmaStr = 'H'; isAnormal = true }
            else if (vMin != null && numVal < vMin) { alarmaStr = 'L'; isAnormal = true }
            else { alarmaStr = 'N' }
          }
        }
      }

      // Upsert resultado
      if (tipo === 'NUM' || tipo === 'CAL') {
        if (r.valor !== undefined) {
          await client.query(`
            INSERT INTO resultado_numer (pruebao_id, valor, unidad, simbolo, validado_por, creado, actualizado, alarma, valor_timestamp, bioanalista_realizador_id, menor_mayor)
            VALUES ($1, $2, $8, $9, $4, NOW()::time, NOW()::time, $3, NOW(), $5, $7)
            ON CONFLICT (pruebao_id)
            DO UPDATE SET valor = $2, alarma = $3, valor_timestamp = NOW(), actualizado = NOW()::time,
                          menor_mayor = $7,
                          unidad = COALESCE(NULLIF($8, ''), resultado_numer.unidad),
                          simbolo = COALESCE(NULLIF($9, ''), resultado_numer.simbolo),
                          validado_por = CASE WHEN $6::boolean THEN $4 ELSE resultado_numer.validado_por END,
                          bioanalista_realizador_id = COALESCE(NULLIF($5, 0), resultado_numer.bioanalista_realizador_id),
                          actualizado_sin_validar_timestamp = CASE WHEN $6::boolean THEN resultado_numer.actualizado_sin_validar_timestamp ELSE NOW() END
          `, [r.prueba_orden_id, r.valor === '' ? null : parseFloat(r.valor), alarmaStr,
              r.validado ? (bioanalistaId || 0) : 0,
              bioanalistaId || 0,
              r.validado || false,
              r.menor_mayor || null,
              po.unidad_nombre || '',
              po.unidad_simbolo || ''])
        }
      } else {
        if (r.valor !== undefined) {
          await client.query(`
            INSERT INTO resultado_alpha (pruebao_id, valor, validado_por, creado, actualizado, alarma, bioanalista_realizador_id)
            VALUES ($1, $2, $4, NOW()::time, NOW()::time, 'n', $5)
            ON CONFLICT (pruebao_id)
            DO UPDATE SET valor = $2, actualizado = NOW()::time,
                          bioanalista_realizador_id = COALESCE(NULLIF($5, 0), resultado_alpha.bioanalista_realizador_id),
                          validado_por = CASE WHEN $3::boolean THEN $4 ELSE resultado_alpha.validado_por END
          `, [r.prueba_orden_id, r.valor, r.validado || false,
              r.validado ? (bioanalistaId || 0) : 0,
              bioanalistaId || 0])
        }
      }

      // Update prueba_orden: status + alarm flags + fecha_primera_validacion
      if (r.validado !== undefined) {
        const newStatus = r.validado
          ? (r.valor === '' || r.valor == null ? 7 : 4)
          : (r.valor !== '' && r.valor != null ? 2 : 1)
        const fechaVal = r.validado ? new Date() : null
        if (tipo === 'NUM' || tipo === 'CAL') {
          // NUM/CAL: update anormal/critico flags
          await client.query(`
            UPDATE prueba_orden SET status_id = $1, fecha_validacion = $2,
              fecha_primera_validacion = COALESCE(fecha_primera_validacion, $2),
              fecha_validacion_db = CASE WHEN $2 IS NOT NULL THEN NOW() ELSE fecha_validacion_db END,
              anormal = $3, critico = $4
            WHERE id = $5
          `, [newStatus, fechaVal, isAnormal, isCritico, r.prueba_orden_id])
        } else {
          // Alpha types: don't overwrite anormal/critico (may have been set by Labsis)
          await client.query(`
            UPDATE prueba_orden SET status_id = $1, fecha_validacion = $2,
              fecha_primera_validacion = COALESCE(fecha_primera_validacion, $2),
              fecha_validacion_db = CASE WHEN $2 IS NOT NULL THEN NOW() ELSE fecha_validacion_db END
            WHERE id = $3
          `, [newStatus, fechaVal, r.prueba_orden_id])
        }

        // ── Audit log: prueba_orden_log ──
        const accion = r.validado
          ? `Validado Valor:${r.valor || '(vacío)'}`
          : `Invalidado${r.nota_invalidacion ? ' — Razón: ' + r.nota_invalidacion : ''}`
        await client.query(`
          INSERT INTO prueba_orden_log (prueba_orden_id, bioanalista_id, usuario_id, fecha, accion, tipo_accion)
          VALUES ($1, $2, $3, NOW(), $4, 'VALIDACION')
        `, [r.prueba_orden_id, bioanalistaId || 0, user.userId, accion])
      } else if (r.valor !== undefined) {
        if (tipo === 'NUM' || tipo === 'CAL') {
          await client.query(`
            UPDATE prueba_orden SET
              status_id = CASE WHEN status_id = 1 THEN 2 ELSE status_id END,
              anormal = $2, critico = $3
            WHERE id = $1
          `, [r.prueba_orden_id, isAnormal, isCritico])
        } else {
          await client.query(`
            UPDATE prueba_orden SET
              status_id = CASE WHEN status_id = 1 THEN 2 ELSE status_id END
            WHERE id = $1
          `, [r.prueba_orden_id])
        }

        // Log captura de valor
        await client.query(`
          INSERT INTO prueba_orden_log (prueba_orden_id, bioanalista_id, usuario_id, fecha, accion, tipo_accion)
          VALUES ($1, $2, $3, NOW(), $4, 'CAPTURA')
        `, [r.prueba_orden_id, bioanalistaId || 0, user.userId, `Captura Valor:${r.valor}`])
      }

      // Persistir nota de prueba
      if (r.nota !== undefined && r.nota !== null) {
        const existingNota = await client.query(`
          SELECT pon.id FROM prueba_orden_nota pon
          JOIN prueba_orden_has_prueba_orden_nota ponh ON ponh.prueba_orden_nota_id = pon.id
          WHERE ponh.prueba_orden_id = $1 AND pon.titulo = 'Nota manual'
          ORDER BY pon.id DESC LIMIT 1
        `, [r.prueba_orden_id])

        if (r.nota.trim() === '') {
          if (existingNota.rows.length > 0) {
            await client.query('DELETE FROM prueba_orden_has_prueba_orden_nota WHERE prueba_orden_nota_id = $1', [existingNota.rows[0].id])
            await client.query('DELETE FROM prueba_orden_nota WHERE id = $1', [existingNota.rows[0].id])
          }
        } else if (existingNota.rows.length > 0) {
          await client.query('UPDATE prueba_orden_nota SET texto = $1 WHERE id = $2', [r.nota.trim(), existingNota.rows[0].id])
        } else {
          const notaResult = await client.query(
            `INSERT INTO prueba_orden_nota (titulo, texto) VALUES ('Nota manual', $1) RETURNING id`,
            [r.nota.trim()]
          )
          await client.query(
            `INSERT INTO prueba_orden_has_prueba_orden_nota (prueba_orden_id, prueba_orden_nota_id, orden_id, fecha_creacion) VALUES ($1, $2, $3, NOW())`,
            [r.prueba_orden_id, notaResult.rows[0].id, ordenId]
          )
        }
        // Update contiene_notas flag for Labsis Java compatibility
        const hasNotas = r.nota.trim() !== ''
        await client.query('UPDATE prueba_orden SET contiene_notas = $1 WHERE id = $2', [hasNotas, r.prueba_orden_id])
      }
    }

    // ── Recalcular status_area para cada área afectada ──
    for (const areaId of areasAfectadas) {
      const areaStats = await client.query(`
        SELECT
          COUNT(*)::int AS total,
          SUM(CASE WHEN po.status_id IN (4, 7) THEN 1 ELSE 0 END)::int AS validados,
          SUM(CASE WHEN po.anormal = true THEN 1 ELSE 0 END)::int AS anormales,
          BOOL_OR(po.status_id IN (4, 7)) AS alguna_validada,
          SUM(CASE WHEN rn.valor IS NOT NULL OR (ra.valor IS NOT NULL AND ra.valor <> '') THEN 1 ELSE 0 END)::int AS con_valor
        FROM prueba_orden po
        LEFT JOIN resultado_numer rn ON rn.pruebao_id = po.id
        LEFT JOIN resultado_alpha ra ON ra.pruebao_id = po.id
        WHERE po.orden_id = $1 AND po.area_id = $2
      `, [ordenId, areaId])
      const stats = areaStats.rows[0]
      const areaStatus = stats.validados === stats.total ? 4 : (stats.validados > 0 ? 8 : 2)
      const pctConValor = stats.total > 0 ? Math.round(stats.con_valor / stats.total * 100) : 0

      const existing = await client.query(
        'SELECT id FROM status_area WHERE orden_id = $1 AND area_id = $2', [ordenId, areaId]
      )
      const tieneAlarma = (stats.anormales || 0) > 0
      if (existing.rows.length > 0) {
        await client.query(`
          UPDATE status_area SET status_orden_id = $3, porcentaje_con_valor_resultado = $4, is_alguna_prueba_validada = $5, is_activa_alarma_val_ref = $6
          WHERE orden_id = $1 AND area_id = $2
        `, [ordenId, areaId, areaStatus, pctConValor, stats.alguna_validada || false, tieneAlarma])
      } else {
        await client.query(`
          INSERT INTO status_area (orden_id, area_id, status_orden_id, porcentaje_con_valor_resultado, is_alguna_prueba_validada, is_activa_alarma_val_ref)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [ordenId, areaId, areaStatus, pctConValor, stats.alguna_validada || false, tieneAlarma])
      }
    }

    // ── Recalcular status general de la orden ──
    const allPO = await client.query('SELECT status_id FROM prueba_orden WHERE orden_id = $1', [ordenId])
    const allValidated = allPO.rows.every(r => r.status_id === 4 || r.status_id === 7)
    if (allValidated && allPO.rows.length > 0) {
      await client.query('UPDATE orden_trabajo SET status_id = 4, fecha_validado = NOW() WHERE id = $1', [ordenId])
    } else {
      // Si no todo está validado pero hay al menos una validada, status = 8 (Por Validar)
      const someValidated = allPO.rows.some(r => r.status_id === 4 || r.status_id === 7)
      const someWithValue = allPO.rows.some(r => r.status_id === 2 || r.status_id === 8)
      if (someValidated || someWithValue) {
        const newOtStatus = someValidated ? 8 : 2
        await client.query('UPDATE orden_trabajo SET status_id = $2 WHERE id = $1 AND status_id NOT IN (4, 6)', [ordenId, newOtStatus])
      }
    }

    // Persistir observaciones por área
    if (observaciones_area && typeof observaciones_area === 'object') {
      for (const [areaId, texto] of Object.entries(observaciones_area)) {
        const existing = await client.query(
          'SELECT id FROM status_area WHERE orden_id = $1 AND area_id = $2', [ordenId, parseInt(areaId)]
        )
        if (existing.rows.length > 0) {
          await client.query(`
            UPDATE status_area SET observaciones = $1
            WHERE orden_id = $2 AND area_id = $3
          `, [texto || '', ordenId, parseInt(areaId)])
        }
      }
    }

    await client.query('COMMIT')
    res.json({ ok: true, user: { id: user.userId, nombre: `${user.nombre} ${user.apellido}` } })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error guardando resultados:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// ── POST /api/ordenes/:numero/lab/correccion ── Corregir resultado validado
router.post('/:numero/lab/correccion', async (req, res) => {
  const client = await pool.connect()
  try {
    const { numero } = req.params
    const { prueba_orden_id, valor_new, observacion, razon_correccion } = req.body
    const user = req.user

    // Solo ANA/ADM/COORD pueden corregir
    if (!hasLabRole(user)) {
      return res.status(403).json({ error: 'No tiene permisos para corregir resultados' })
    }

    await client.query('BEGIN')

    // Verificar que la OT existe y obtener datos
    const otData = await client.query(`
      SELECT ot.id FROM orden_trabajo ot WHERE ot.numero = $1
    `, [numero])
    if (!otData.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Orden no encontrada' })
    }
    const ordenId = otData.rows[0].id

    // Verificar que la prueba_orden existe, pertenece a esta OT, y está validada
    const poResult = await client.query(`
      SELECT po.id, po.prueba_id, po.status_id, po.area_id, po.fecha_validacion,
             tp.codigo AS tipo
      FROM prueba_orden po
      LEFT JOIN prueba pr ON po.prueba_id = pr.id
      LEFT JOIN tipo_prueba tp ON pr.tipo_prueba_id = tp.id
      WHERE po.id = $1 AND po.orden_id = $2
    `, [prueba_orden_id, ordenId])
    if (!poResult.rows.length) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Prueba no encontrada en esta orden' })
    }
    const po = poResult.rows[0]
    if (po.status_id !== 4 && po.status_id !== 7) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Solo se pueden corregir resultados validados' })
    }

    // Obtener valor actual (old)
    let valorOld = null
    if (po.tipo === 'NUM' || po.tipo === 'CAL') {
      const rn = await client.query('SELECT valor FROM resultado_numer WHERE pruebao_id = $1', [prueba_orden_id])
      valorOld = rn.rows[0]?.valor?.toString() || ''
    } else {
      const ra = await client.query('SELECT valor FROM resultado_alpha WHERE pruebao_id = $1', [prueba_orden_id])
      valorOld = ra.rows[0]?.valor || ''
    }

    // Insertar registro de corrección
    await client.query(`
      INSERT INTO prueba_orden_correccion (pruebao_id, valor_old, valor_new, fecha_old, fecha_new, observacion, razon_correccion)
      VALUES ($1, $2, $3, $4, NOW(), $5, $6)
    `, [prueba_orden_id, valorOld, valor_new, po.fecha_validacion || new Date(), observacion || '', razon_correccion || ''])

    // Actualizar el valor actual
    if (po.tipo === 'NUM' || po.tipo === 'CAL') {
      await client.query(`
        UPDATE resultado_numer SET valor = $2, valor_timestamp = NOW(), actualizado = NOW()::time, validado_por = 0
        WHERE pruebao_id = $1
      `, [prueba_orden_id, valor_new === '' ? null : parseFloat(valor_new)])
    } else {
      await client.query(`
        UPDATE resultado_alpha SET valor = $2, actualizado = NOW()::time, validado_por = 0
        WHERE pruebao_id = $1
      `, [prueba_orden_id, valor_new])
    }

    // Marcar como corregida e invalidar (requiere re-validación)
    await client.query(`
      UPDATE prueba_orden SET corregida = true, status_id = 5, fecha_validacion = NULL WHERE id = $1
    `, [prueba_orden_id])

    // Log de corrección
    const bioanalistaId = await getBioanalistaId(client, user.userId)
    await client.query(`
      INSERT INTO prueba_orden_log (prueba_orden_id, bioanalista_id, usuario_id, fecha, accion, tipo_accion)
      VALUES ($1, $2, $3, NOW(), $4, 'CORRECCION')
    `, [prueba_orden_id, bioanalistaId || 0, user.userId,
        `Corrección: ${valorOld} → ${valor_new}${observacion ? ' | ' + observacion : ''}`])

    // Recalcular status de la OT (ya no está todo validado)
    await client.query(`
      UPDATE orden_trabajo SET status_id = 8 WHERE id = $1 AND status_id = 4
    `, [ordenId])

    // Recalcular status_area
    if (po.area_id) {
      const aStats = await client.query(`
        SELECT COUNT(*)::int AS total,
               SUM(CASE WHEN status_id IN (4,7) THEN 1 ELSE 0 END)::int AS validados
        FROM prueba_orden WHERE orden_id = $1 AND area_id = $2
      `, [ordenId, po.area_id])
      const s = aStats.rows[0]
      const areaStatus = s.validados === s.total ? 4 : (s.validados > 0 ? 8 : 2)
      await client.query(`
        UPDATE status_area SET status_orden_id = $3
        WHERE orden_id = $1 AND area_id = $2
      `, [ordenId, po.area_id, areaStatus])
    }

    await client.query('COMMIT')
    res.json({ ok: true, correccion: { valor_old: valorOld, valor_new, observacion } })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error en corrección:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// ── GET /api/ordenes/:numero/lab/correcciones/:pruebaOrdenId ── Historial de correcciones
router.get('/:numero/lab/correcciones/:pruebaOrdenId', async (req, res) => {
  try {
    const { pruebaOrdenId } = req.params
    const result = await pool.query(`
      SELECT valor_old, valor_new, fecha_old, fecha_new, observacion, razon_correccion
      FROM prueba_orden_correccion
      WHERE pruebao_id = $1
      ORDER BY fecha_new DESC
    `, [pruebaOrdenId])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/ordenes/:numero/lab/historico/:pruebaOrdenId ── Últimos 3 resultados del mismo paciente/prueba
router.get('/:numero/lab/historico/:pruebaOrdenId', async (req, res) => {
  try {
    const { numero, pruebaOrdenId } = req.params
    const result = await pool.query(`
      SELECT ot.numero, ot.fecha, rn.valor, rn.alarma
      FROM orden_trabajo ot
      JOIN prueba_orden po ON po.orden_id = ot.id
      LEFT JOIN resultado_numer rn ON rn.pruebao_id = po.id
      WHERE ot.paciente_id = (SELECT paciente_id FROM orden_trabajo WHERE numero = $1)
        AND po.prueba_id = (SELECT prueba_id FROM prueba_orden WHERE id = $2)
        AND ot.numero != $1
        AND rn.valor IS NOT NULL
      ORDER BY ot.fecha DESC
      LIMIT 3
    `, [numero, pruebaOrdenId])
    res.json(result.rows)
  } catch (err) {
    console.error('Error en histórico:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── PATCH /api/ordenes/:numero/lab/verificar ── Verificación por supervisor (segunda aprobación)
router.patch('/:numero/lab/verificar', async (req, res) => {
  const client = await pool.connect()
  try {
    const { numero } = req.params
    const { prueba_orden_ids, verificado } = req.body
    const userId = req.user?.userId || 0

    if (!Array.isArray(prueba_orden_ids) || prueba_orden_ids.length === 0) {
      return res.status(400).json({ error: 'prueba_orden_ids requerido' })
    }

    const otResult = await client.query('SELECT id FROM orden_trabajo WHERE numero = $1', [numero])
    if (!otResult.rows.length) return res.status(404).json({ error: 'Orden no encontrada' })

    await client.query('BEGIN')
    for (const poId of prueba_orden_ids) {
      await client.query(`
        UPDATE prueba_orden SET verificado = $1
        WHERE id = $2 AND orden_id = $3 AND status_id IN (4, 7)
      `, [verificado, poId, otResult.rows[0].id])
    }
    await client.query('COMMIT')
    res.json({ ok: true, verificado, count: prueba_orden_ids.length })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('PATCH verificar error:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// ── PATCH /api/ordenes/:numero/lab/area/:areaId/espera ── Poner/quitar área en espera
router.patch('/:numero/lab/area/:areaId/espera', async (req, res) => {
  try {
    const { numero, areaId } = req.params
    const { en_espera } = req.body

    const otResult = await pool.query('SELECT id FROM orden_trabajo WHERE numero = $1', [numero])
    if (!otResult.rows.length) return res.status(404).json({ error: 'Orden no encontrada' })
    const otId = otResult.rows[0].id

    const newStatus = en_espera ? 10 : 1
    await pool.query(`
      UPDATE status_area SET status_orden_id = $1
      WHERE orden_id = $2 AND area_id = $3
    `, [newStatus, otId, parseInt(areaId)])

    res.json({ ok: true, en_espera })
  } catch (err) {
    console.error('PATCH area espera error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
