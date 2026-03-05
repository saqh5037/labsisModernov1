import { Router } from 'express'
import crypto from 'crypto'
import pool from '../db.js'

const router = Router()

// Max lengths matching DB varchar constraints
// Use the largest known size across installations (LAPI=120, EG=30 for nombre/apellido)
// Truncating at 120 is safe for both — EG's 30-char limit is handled by DB itself
const PACIENTE_MAX_LENGTHS = {
  nombre: 120, apellido: 120, ci_paciente: 25, telefono: 30,
  telefono_celular: 30, lugar_nacimiento: 20, nacionalidad: 20,
  estado_civil: 30, codigo_postal: 10, email: 200, apellido_segundo: 120,
  direccion1: 100, direccion2: 100, direccion3: 100, direccion4: 100,
  observaciones: null // text, no limit
}

function truncateField(val, maxLen) {
  if (!val || !maxLen) return val
  return String(val).substring(0, maxLen)
}

// Generate auto CI when patient has no ID (matches Java's creaCiPaciente)
async function generateAutoCI(prefix) {
  const rand = crypto.randomBytes(8).toString('hex').substring(0, 10).toUpperCase()
  return (prefix || 'AUTO$') + rand
}

// Generate portal password (matches Java's generarPassword)
function generatePortalPassword() {
  const plain = crypto.randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 10)
  const salt = crypto.randomBytes(10).toString('hex').substring(0, 20)
  // SHA1 hash matching Java's PasswordManager
  const hash = crypto.createHash('sha1').update(salt + plain).digest('hex')
  return { plain, salt, hash }
}

// GET /api/pacientes/config/campos — Config de campos visibles por tenant
// IMPORTANTE: esta ruta va ANTES de /:id para que "config" no sea capturado como param
router.get('/config/campos', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM configuracion_paciente LIMIT 1')
    res.json(result.rows[0] || {})
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/pacientes/vinculos — Catálogo de vínculos representante
router.get('/vinculos', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre FROM vinculo_representante ORDER BY id')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/pacientes/validar-ci/:ci — Verificar si CI ya existe (para validación en tiempo real)
router.get('/validar-ci/:ci', async (req, res) => {
  try {
    const { ci } = req.params
    const excludeId = req.query.exclude // excluir paciente actual al editar
    let query = 'SELECT id, nombre, apellido FROM paciente WHERE lower(ci_paciente) = lower($1) AND activo = true'
    const params = [ci.trim()]
    if (excludeId) {
      query += ' AND id != $2'
      params.push(parseInt(excludeId))
    }
    const result = await pool.query(query, params)
    res.json({
      exists: result.rows.length > 0,
      paciente: result.rows[0] || null
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/pacientes/stats — Demographic stats for dashboard
router.get('/stats', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE activo = true)::int AS activos,
        COUNT(*) FILTER (WHERE activo = false)::int AS inactivos,
        COUNT(*) FILTER (WHERE sexo = 'M')::int AS masculino,
        COUNT(*) FILTER (WHERE sexo = 'F')::int AS femenino,
        COUNT(*) FILTER (WHERE fecha_nacimiento IS NOT NULL
          AND AGE(CURRENT_DATE, fecha_nacimiento) < INTERVAL '18 years')::int AS menores,
        COUNT(*) FILTER (WHERE vip = true)::int AS vip,
        COUNT(*) FILTER (WHERE empresa = true)::int AS empresa
      FROM paciente
      WHERE id_paciente_final_fusion IS NULL
    `)
    res.json(result.rows[0])
  } catch (err) {
    console.error('Error en GET /api/pacientes/stats:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/pacientes?q=&nombre=&apellido=&ci=&email=&telefono=&page=1&limit=25
router.get('/', async (req, res) => {
  try {
    const {
      q,          // búsqueda general (nombre, apellido, CI — todo en uno)
      nombre, apellido, ci, email, telefono,  // filtros específicos
      incluirInactivos, empresa,  // toggles de filtro
      page = 1, limit = 25
    } = req.query

    const conditions = []
    const params = []
    let paramIdx = 1

    // Búsqueda general (q) — soporta multi-palabra ("samuel quiroz")
    if (q && q.trim()) {
      const term = q.trim()
      const words = term.split(/\s+/).filter(w => w.length > 0)

      if (words.length > 1) {
        // Multi-palabra: TODAS las palabras deben aparecer en nombre completo, O match en CI/tel/email
        const fullName = `sin_acentos(lower(p.nombre || ' ' || p.apellido || ' ' || COALESCE(p.apellido_segundo, '')))`
        const wordConditions = words.map((_w, i) => {
          params.push(words[i])
          return `${fullName} LIKE '%' || sin_acentos(lower($${paramIdx + i})) || '%'`
        })
        const nameMatch = wordConditions.join(' AND ')
        paramIdx += words.length

        // También permitir match exacto en campos no-nombre
        params.push(term)
        const otherMatch = `(
          lower(p.ci_paciente) LIKE '%' || lower($${paramIdx}) || '%'
          OR p.telefono LIKE '%' || $${paramIdx} || '%'
          OR p.telefono_celular LIKE '%' || $${paramIdx} || '%'
          OR lower(p.email) LIKE '%' || lower($${paramIdx}) || '%'
        )`
        paramIdx++

        conditions.push(`((${nameMatch}) OR ${otherMatch})`)
      } else {
        // Una sola palabra: buscar en cada columna individual
        conditions.push(`(
          sin_acentos(lower(p.nombre)) LIKE '%' || sin_acentos(lower($${paramIdx})) || '%'
          OR sin_acentos(lower(p.apellido)) LIKE '%' || sin_acentos(lower($${paramIdx})) || '%'
          OR sin_acentos(lower(COALESCE(p.apellido_segundo, ''))) LIKE '%' || sin_acentos(lower($${paramIdx})) || '%'
          OR lower(p.ci_paciente) LIKE '%' || lower($${paramIdx}) || '%'
          OR p.telefono LIKE '%' || $${paramIdx} || '%'
          OR p.telefono_celular LIKE '%' || $${paramIdx} || '%'
          OR lower(p.email) LIKE '%' || lower($${paramIdx}) || '%'
        )`)
        params.push(term)
        paramIdx++
      }
    }

    // Filtros específicos
    if (nombre && nombre.trim()) {
      conditions.push(`sin_acentos(lower(p.nombre)) LIKE '%' || sin_acentos(lower($${paramIdx})) || '%'`)
      params.push(nombre.trim())
      paramIdx++
    }
    if (apellido && apellido.trim()) {
      conditions.push(`sin_acentos(lower(p.apellido)) LIKE '%' || sin_acentos(lower($${paramIdx})) || '%'`)
      params.push(apellido.trim())
      paramIdx++
    }
    if (ci && ci.trim()) {
      conditions.push(`lower(p.ci_paciente) LIKE '%' || lower($${paramIdx}) || '%'`)
      params.push(ci.trim())
      paramIdx++
    }
    if (email && email.trim()) {
      conditions.push(`lower(p.email) LIKE '%' || lower($${paramIdx}) || '%'`)
      params.push(email.trim())
      paramIdx++
    }
    if (telefono && telefono.trim()) {
      conditions.push(`(p.telefono LIKE '%' || $${paramIdx} || '%' OR p.telefono_celular LIKE '%' || $${paramIdx} || '%')`)
      params.push(telefono.trim())
      paramIdx++
    }

    // Pacientes activos (salvo que se pida incluir inactivos)
    if (incluirInactivos !== 'true') {
      conditions.push('p.activo = true')
    }
    // Filtrar por empresa/referencia
    if (empresa === 'true') {
      conditions.push('p.empresa = true')
    }
    // Nunca mostrar fusionados
    conditions.push('p.id_paciente_final_fusion IS NULL')

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const offset = (parseInt(page) - 1) * parseInt(limit)

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM paciente p ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].count)

    // Fetch page
    const dataResult = await pool.query(
      `SELECT p.id, p.ci_paciente, p.nombre, p.apellido, p.apellido_segundo,
              p.sexo, p.fecha_nacimiento, p.email, p.telefono, p.telefono_celular,
              p.activo, p.empresa, p.vip, p.observaciones,
              p.direccion1, p.direccion2, p.direccion3, p.direccion4,
              (SELECT COUNT(*) FROM orden_trabajo ot WHERE ot.paciente_id = p.id) AS total_ordenes
       FROM paciente p
       ${whereClause}
       ORDER BY p.apellido, p.nombre
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, parseInt(limit), offset]
    )

    res.json({
      pacientes: dataResult.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    })
  } catch (err) {
    console.error('Error en GET /api/pacientes:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/pacientes/:id — Detalle completo
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // 1. Datos del paciente (incluye demográficos + JOINs raza/saludo)
    const pacResult = await pool.query(
      `SELECT p.*,
              pr.nombre AS provincia_nombre,
              ci.nombre AS ciudad_nombre,
              mu.nombre AS municipio_nombre,
              pra.raza AS raza_nombre,
              psa.nombre AS saludo_nombre,
              p.num_historia_old AS num_historia
       FROM paciente p
       LEFT JOIN direccion_provincia pr ON p.direccion_provincia_id = pr.id
       LEFT JOIN direccion_ciudad ci ON p.direccion_ciudad_id = ci.id
       LEFT JOIN direccion_municipio mu ON p.direccion_municipio_id = mu.id
       LEFT JOIN paciente_raza pra ON pra.id = p.raza_id
       LEFT JOIN paciente_saludo psa ON psa.id = p.paciente_saludo_id
       WHERE p.id = $1`,
      [id]
    )
    if (!pacResult.rows.length) return res.status(404).json({ error: 'Paciente no encontrado' })
    const paciente = pacResult.rows[0]

    // 2. Últimas órdenes de trabajo (máx 20)
    const otResult = await pool.query(
      `SELECT ot.id, ot.numero, ot.fecha, ot.stat,
              so.status, so.color,
              proc.nombre AS procedencia,
              sm.nombre AS servicio_medico,
              (SELECT COUNT(*) FROM prueba_orden po WHERE po.orden_id = ot.id) AS total_pruebas
       FROM orden_trabajo ot
       LEFT JOIN status_orden so ON ot.status_id = so.id
       LEFT JOIN procedencia proc ON ot.procedencia_id = proc.id
       LEFT JOIN servicio_medico sm ON ot.servicio_medico_id = sm.id
       WHERE ot.paciente_id = $1
       ORDER BY ot.fecha DESC
       LIMIT 20`,
      [id]
    )

    // 3. Historial de acciones (últimas 50)
    const logResult = await pool.query(
      `SELECT apl.id, apl.realizado_timestamp AS fecha, apl.accion,
              u.nombre || ' ' || u.apellido AS usuario
       FROM accion_paciente_log apl
       LEFT JOIN usuario u ON apl.usuario_id = u.id
       WHERE apl.paciente_id = $1
       ORDER BY apl.realizado_timestamp DESC
       LIMIT 50`,
      [id]
    )

    // 4. Representante (si tiene)
    let representante = null
    if (paciente.paciente_representante_id) {
      const repResult = await pool.query(
        `SELECT p.id, p.nombre, p.apellido, p.ci_paciente, p.telefono,
                vr.nombre AS vinculo
         FROM paciente p
         LEFT JOIN vinculo_representante vr ON $2 = vr.id
         WHERE p.id = $1`,
        [paciente.paciente_representante_id, paciente.vinculo_representante_id]
      )
      if (repResult.rows.length) representante = repResult.rows[0]
    }

    // 5. Presupuestos (últimos 20)
    const presResult = await pool.query(
      `SELECT pr.id, pr.numero, pr.fecha, pr.monto_total, pr.total_factura,
              pr.entregada
       FROM presupuesto pr
       WHERE pr.paciente_id = $1
       ORDER BY pr.fecha DESC
       LIMIT 20`,
      [id]
    )

    // 6. Counts para validar eliminación
    const countsResult = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM orden_trabajo WHERE paciente_id = $1) AS total_ots,
        (SELECT COUNT(*) FROM presupuesto WHERE paciente_id = $1) AS total_presupuestos,
        (SELECT COUNT(*) FROM cita WHERE paciente_id = $1) AS total_citas`,
      [id]
    )
    const counts = countsResult.rows[0]

    // 7. Métricas del paciente (primera/última visita, frecuencia)
    const metricasResult = await pool.query(
      `SELECT
        MIN(ot.fecha) AS primera_visita,
        MAX(ot.fecha) AS ultima_visita,
        COUNT(*)::int AS total_ordenes_historico,
        COUNT(DISTINCT (EXTRACT(YEAR FROM ot.fecha)::int * 100 + EXTRACT(MONTH FROM ot.fecha)::int))::int AS meses_distintos
       FROM orden_trabajo ot
       WHERE ot.paciente_id = $1`,
      [id]
    )
    const metricas = metricasResult.rows[0]

    res.json({
      paciente,
      ordenes: otResult.rows,
      presupuestos: presResult.rows,
      historial: logResult.rows,
      representante,
      counts: {
        ordenes: parseInt(counts.total_ots),
        presupuestos: parseInt(counts.total_presupuestos),
        citas: parseInt(counts.total_citas)
      },
      metricas: {
        primera_visita: metricas.primera_visita,
        ultima_visita: metricas.ultima_visita,
        total_ordenes_historico: metricas.total_ordenes_historico || 0,
        meses_distintos: metricas.meses_distintos || 0
      }
    })
  } catch (err) {
    console.error('Error en GET /api/pacientes/:id:', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/pacientes — Crear paciente
router.post('/', async (req, res) => {
  try {
    const {
      ci_paciente, nombre, apellido, apellido_segundo,
      sexo, fecha_nacimiento, email, telefono, telefono_celular,
      direccion1, direccion2, direccion3, direccion4,
      codigo_postal, observaciones, vip,
      paciente_representante_id, vinculo_representante_id,
      estado_civil, nacionalidad, raza_id, paciente_saludo_id,
      lugar_nacimiento, num_historia, empresa
    } = req.body

    // Validaciones
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre es requerido' })
    if (!apellido || !apellido.trim()) return res.status(400).json({ error: 'Apellido es requerido' })
    if (!sexo || !['M', 'F'].includes(sexo)) return res.status(400).json({ error: 'Sexo debe ser M o F' })

    // Truncate fields to DB max lengths
    const tNombre = truncateField(nombre.trim(), PACIENTE_MAX_LENGTHS.nombre)
    const tApellido = truncateField(apellido.trim(), PACIENTE_MAX_LENGTHS.apellido)
    const tApellidoSeg = truncateField(apellido_segundo?.trim(), PACIENTE_MAX_LENGTHS.apellido_segundo)

    // Resolve CI: auto-generate if blank (matches Java creaCiPaciente)
    let ciResolved = ci_paciente?.trim() || null
    let isAutoCI = false
    if (!ciResolved) {
      const labConfig = await pool.query(
        'SELECT prefijo_ingreso_paciente_sin_id_manual, ingreso_paciente_sin_id_manual FROM laboratorio LIMIT 1'
      )
      const cfg = labConfig.rows[0] || {}
      ciResolved = await generateAutoCI(cfg.prefijo_ingreso_paciente_sin_id_manual)
      isAutoCI = true
    } else {
      ciResolved = truncateField(ciResolved, 25)
    }

    // Verificar CI único (si se proporcionó manualmente)
    if (!isAutoCI && ciResolved) {
      const ciCheck = await pool.query(
        'SELECT id FROM paciente WHERE lower(ci_paciente) = lower($1) AND activo = true',
        [ciResolved]
      )
      if (ciCheck.rows.length) {
        return res.status(409).json({ error: 'Ya existe un paciente con esa cédula/identificación' })
      }
    }

    // Generate portal password (matches Java generarPassword)
    const portalPwd = generatePortalPassword()

    const result = await pool.query(
      `INSERT INTO paciente (
        ci_paciente, nombre, apellido, apellido_segundo,
        sexo, fecha_nacimiento, email, telefono, telefono_celular,
        direccion1, direccion2, direccion3, direccion4,
        codigo_postal, observaciones, vip,
        paciente_representante_id, vinculo_representante_id,
        estado_civil, nacionalidad, raza_id, paciente_saludo_id,
        lugar_nacimiento, num_historia_old, empresa,
        activo, generacion_id_auto, send_his,
        passwd_string, passwd_sha1, pass_salt,
        cambiar_clave_portal, send_clave_portal
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,
                true, $26, false, $27, $28, $29, true, true)
      RETURNING id`,
      [
        ciResolved, tNombre, tApellido, tApellidoSeg || null,
        sexo, fecha_nacimiento || null,
        truncateField(email?.trim(), 200) || null,
        truncateField(telefono?.trim(), 30) || null,
        truncateField(telefono_celular?.trim(), 30) || null,
        truncateField(direccion1?.trim(), 100) || null,
        truncateField(direccion2?.trim(), 100) || null,
        truncateField(direccion3?.trim(), 100) || null,
        truncateField(direccion4?.trim(), 100) || null,
        truncateField(codigo_postal?.trim(), 10) || null,
        observaciones?.trim() || null, vip || false,
        paciente_representante_id || null, vinculo_representante_id || null,
        truncateField(estado_civil?.trim(), 30) || null,
        truncateField(nacionalidad?.trim(), 20) || null,
        raza_id ? parseInt(raza_id) : 1,  // Default 1 matches Java (BRANCA)
        paciente_saludo_id ? parseInt(paciente_saludo_id) : null,
        truncateField(lugar_nacimiento?.trim(), 20) || null,
        num_historia?.trim() || null, empresa || false,
        isAutoCI,  // generacion_id_auto
        portalPwd.plain, portalPwd.hash, portalPwd.salt
      ]
    )

    const newId = result.rows[0].id

    // Log CREACION (matches Java format)
    await pool.query(
      `INSERT INTO accion_paciente_log (paciente_id, usuario_id, realizado_timestamp, accion)
       VALUES ($1, $2, NOW(), $3)`,
      [newId, req.user.userId, `CREACION PACIENTE - ${tNombre} ${tApellido} (${ciResolved})`]
    )
    // Log FIRMA PACIENTE (Java creates a second entry for audit)
    await pool.query(
      `INSERT INTO accion_paciente_log (paciente_id, usuario_id, realizado_timestamp, accion)
       VALUES ($1, $2, NOW(), $3)`,
      [newId, req.user.userId, `FIRMA PACIENTE - ID: ${newId}`]
    )

    res.status(201).json({ id: newId })
  } catch (err) {
    console.error('Error creando paciente:', err)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/pacientes/:id — Actualizar paciente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const fields = req.body

    // Obtener paciente actual para diff
    const current = await pool.query('SELECT * FROM paciente WHERE id = $1', [id])
    if (!current.rows.length) return res.status(404).json({ error: 'Paciente no encontrado' })
    const old = current.rows[0]

    // Campos editables
    const editableFields = [
      'ci_paciente', 'nombre', 'apellido', 'apellido_segundo',
      'sexo', 'fecha_nacimiento', 'email', 'telefono', 'telefono_celular',
      'direccion1', 'direccion2', 'direccion3', 'direccion4',
      'codigo_postal', 'observaciones', 'vip',
      'paciente_representante_id', 'vinculo_representante_id',
      'estado_civil', 'nacionalidad', 'raza_id', 'paciente_saludo_id',
      'lugar_nacimiento', 'empresa'
    ]

    const setClauses = []
    const params = []
    let paramIdx = 1
    const changes = []

    for (const field of editableFields) {
      if (field in fields) {
        const newVal = fields[field] === '' ? null : fields[field]
        const oldVal = old[field]
        if (String(newVal ?? '') !== String(oldVal ?? '')) {
          setClauses.push(`${field} = $${paramIdx}`)
          params.push(newVal)
          changes.push(`${field}: "${oldVal ?? ''}" → "${newVal ?? ''}"`)
          paramIdx++
        }
      }
    }

    // Mapeo especial: num_historia (UI) → num_historia_old (BD)
    if ('num_historia' in fields) {
      const newVal = fields.num_historia === '' ? null : fields.num_historia
      const oldVal = old.num_historia_old
      if (String(newVal ?? '') !== String(oldVal ?? '')) {
        setClauses.push(`num_historia_old = $${paramIdx}`)
        params.push(newVal)
        changes.push(`num_historia: "${oldVal ?? ''}" → "${newVal ?? ''}"`)
        paramIdx++
      }
    }

    if (!setClauses.length) return res.json({ ok: true, message: 'Sin cambios' })

    // Always reset send_his on patient update (matches Java behavior)
    setClauses.push(`send_his = $${paramIdx}`)
    params.push(false)
    paramIdx++

    // Truncate string fields to DB max lengths
    for (let i = 0; i < params.length; i++) {
      if (typeof params[i] === 'string') {
        // Find corresponding field from setClauses to get max length
        const clause = setClauses[i]
        if (clause) {
          const field = clause.split(' = ')[0]
          const maxLen = PACIENTE_MAX_LENGTHS[field]
          if (maxLen && params[i].length > maxLen) {
            params[i] = params[i].substring(0, maxLen)
          }
        }
      }
    }

    params.push(id)
    await pool.query(
      `UPDATE paciente SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
      params
    )

    // Log EDICION with diff
    await pool.query(
      `INSERT INTO accion_paciente_log (paciente_id, usuario_id, realizado_timestamp, accion)
       VALUES ($1, $2, NOW(), $3)`,
      [id, req.user.userId, `EDICION - ${changes.join('; ')}`]
    )
    // Log FIRMA PACIENTE (Java creates second entry for audit)
    await pool.query(
      `INSERT INTO accion_paciente_log (paciente_id, usuario_id, realizado_timestamp, accion)
       VALUES ($1, $2, NOW(), $3)`,
      [id, req.user.userId, `FIRMA PACIENTE - ID: ${id}`]
    )

    res.json({ ok: true })
  } catch (err) {
    console.error('Error actualizando paciente:', err)
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/pacientes/:id/desactivar — Soft delete
router.patch('/:id/desactivar', async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('UPDATE paciente SET activo = false WHERE id = $1', [id])
    await pool.query(
      `INSERT INTO accion_paciente_log (paciente_id, usuario_id, realizado_timestamp, accion)
       VALUES ($1, $2, NOW(), 'DESACTIVAR')`,
      [id, req.user.userId]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/pacientes/:id/activar — Reactivar
router.patch('/:id/activar', async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('UPDATE paciente SET activo = true WHERE id = $1', [id])
    await pool.query(
      `INSERT INTO accion_paciente_log (paciente_id, usuario_id, realizado_timestamp, accion)
       VALUES ($1, $2, NOW(), 'ACTIVAR')`,
      [id, req.user.userId]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/pacientes/:id — Eliminar paciente (solo si no tiene OTs, presupuestos ni citas)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Verificar que no tenga entidades asociadas
    const counts = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM orden_trabajo WHERE paciente_id = $1) AS ots,
        (SELECT COUNT(*) FROM presupuesto WHERE paciente_id = $1) AS presupuestos,
        (SELECT COUNT(*) FROM cita WHERE paciente_id = $1) AS citas`,
      [id]
    )
    const { ots, presupuestos, citas } = counts.rows[0]
    const parts = []
    if (parseInt(ots) > 0) parts.push(`${ots} ordenes de trabajo`)
    if (parseInt(presupuestos) > 0) parts.push(`${presupuestos} presupuestos`)
    if (parseInt(citas) > 0) parts.push(`${citas} citas`)

    if (parts.length > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: el paciente tiene ${parts.join(', ')}`
      })
    }

    // Eliminar logs y paciente
    await pool.query('DELETE FROM accion_paciente_log WHERE paciente_id = $1', [id])
    await pool.query('DELETE FROM paciente WHERE id = $1', [id])

    res.json({ ok: true })
  } catch (err) {
    console.error('Error eliminando paciente:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
