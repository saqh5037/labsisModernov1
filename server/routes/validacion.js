import { Router } from 'express'
import pool from '../db.js'

const router = Router()

// Format numeric result (same helper as ordenes.js)
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

const ROLES_LAB = ['ADM', 'ANA', 'COORD', 'DTTEC']
function hasLabRole(user) {
  return user.roles && user.roles.some(r => ROLES_LAB.includes(r))
}
async function getBioanalistaId(client, userId) {
  const r = await client.query('SELECT id FROM bioanalista WHERE usuario_id = $1', [userId])
  return r.rows[0]?.id || null
}

// ═══ GET /api/validacion/areas ═══
router.get('/areas', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, area AS nombre, codigo FROM area WHERE activa = true ORDER BY area
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('GET /validacion/areas error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══ GET /api/validacion/muestras ═══
router.get('/muestras', async (req, res) => {
  try {
    const { fechaDesde, fechaHasta, areaId, validada } = req.query
    if (!fechaDesde || !fechaHasta || !areaId) {
      return res.status(400).json({ error: 'Faltan parámetros: fechaDesde, fechaHasta, areaId' })
    }

    const result = await pool.query(`
      SELECT DISTINCT ON (m.id)
        m.id AS muestra_id, m.barcode, m.orden_id,
        ot.numero AS ot_numero, ot.fecha AS ot_fecha, ot.stat,
        p.nombre || ' ' || p.apellido AS paciente_nombre,
        p.ci_paciente, p.sexo, p.fecha_nacimiento,
        sa.status_orden_id AS area_status_id,
        so.status AS area_status_nombre, so.color AS area_status_color,
        sa.verificado, sa.entregada,
        tm.tipo AS tipo_muestra, tc.tipo AS tipo_contenedor, tc.color AS contenedor_color,
        (SELECT COUNT(*) FROM prueba_orden po WHERE po.orden_id = ot.id AND po.area_id = $3)::int AS pruebas_total,
        (SELECT COUNT(*) FILTER (WHERE po.status_id IN (4,7)) FROM prueba_orden po WHERE po.orden_id = ot.id AND po.area_id = $3)::int AS pruebas_validadas
      FROM muestra m
      JOIN orden_trabajo ot ON m.orden_id = ot.id
      JOIN paciente p ON ot.paciente_id = p.id
      JOIN status_area sa ON sa.orden_id = ot.id AND sa.area_id = $3
      JOIN status_orden so ON sa.status_orden_id = so.id
      LEFT JOIN tipo_muestra tm ON m.tipo_muestra_id = tm.id
      LEFT JOIN tipo_contenedor tc ON m.tipo_contenedor_id = tc.id
      WHERE ot.fecha >= $1 AND ot.fecha < $2
        AND ot.status_id NOT IN (0, 6)
        AND EXISTS (SELECT 1 FROM prueba_orden po WHERE po.orden_id = ot.id AND po.area_id = $3)
      ORDER BY m.id, ot.fecha ASC
    `, [fechaDesde, fechaHasta, parseInt(areaId)])

    let muestras = result.rows
    if (validada === '1') muestras = muestras.filter(m => m.area_status_id === 4)
    else if (validada === '2') muestras = muestras.filter(m => m.area_status_id !== 4)

    res.json(muestras)
  } catch (err) {
    console.error('GET /validacion/muestras error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══ GET /api/validacion/orden/:numero/area/:areaId ═══
router.get('/orden/:numero/area/:areaId', async (req, res) => {
  try {
    const { numero, areaId } = req.params
    const aid = parseInt(areaId)

    // 1. Datos de la orden + paciente (enriquecido — misma shape que GET /ordenes/:numero/lab)
    const otResult = await pool.query(`
      SELECT ot.id, ot.numero, ot.fecha, ot.stat,
             ot.observaciones AS ot_observaciones,
             ot.informacion_clinica, ot.embarazada, ot.semanas_embarazo,
             ot.peso, ot.estatura, ot.medico, ot.numero_solicitud,
             ot.fecha_toma_muestra, ot.fecha_estimada_entrega,
             so.status, so.color, so.id AS status_id,
             p.id AS paciente_id,
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

    // 2. Status del área
    const saResult = await pool.query(`
      SELECT sa.*, so.status AS status_nombre, so.color AS status_color
      FROM status_area sa
      JOIN status_orden so ON sa.status_orden_id = so.id
      WHERE sa.orden_id = $1 AND sa.area_id = $2
    `, [ot.id, aid])
    const statusArea = saResult.rows[0] || null

    // 3. Pruebas del área con resultados (mismos JOINs que GET /ordenes/:numero/lab)
    const pruebasResult = await pool.query(`
      SELECT
        po.id, po.prueba_id, po.area_id, po.status_id, po.anormal, po.critico,
        po.corregida, po.fecha_validacion, po.gp_id, po.gp_orden_id,
        po.transmision_equipo,
        pr.nombre AS prueba, pr.codigo_labsis AS prueba_codigo, pr.orden AS prueba_orden,
        tp.codigo AS tipo_prueba,
        a.area AS area_nombre,
        u.simbolo AS unidad,
        pr.metodologia AS metodo,
        eq.nombre AS equipo_nombre,
        meq.nombre AS equipo_marca,
        rn.valor AS resultado_valor, rn.alarma AS alarma_simbolo,
        rn.validado_por, rn.menor_mayor,
        ra.valor AS resultado_alpha, ra.alarma AS alarma_alpha,
        gp.nombre AS grupo_nombre,
        pr.formato, pr.valor_por_defecto,
        (SELECT string_agg(pon.texto, '; ')
         FROM prueba_orden_has_prueba_orden_nota ponh
         JOIN prueba_orden_nota pon ON ponh.prueba_orden_nota_id = pon.id
         WHERE ponh.prueba_orden_id = po.id
        ) AS notas
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
      WHERE po.orden_id = $1 AND po.area_id = $2
      ORDER BY COALESCE(po.gp_id, 0), pr.orden, pr.nombre
    `, [ot.id, aid])

    // 4. Rangos de referencia
    const pruebaIds = [...new Set(pruebasResult.rows.map(r => r.prueba_id))]
    let rangos = []
    if (pruebaIds.length > 0) {
      const rangosResult = await pool.query(`
        SELECT vr.prueba_id, vr.sexo, vr.edad_desde, vr.edad_hasta,
               vr.valor_desde, vr.valor_hasta, vr.panico, vr.comentario
        FROM valor_referencial vr
        WHERE vr.prueba_id = ANY($1) AND (vr.activo IS NULL OR vr.activo = true)
      `, [pruebaIds])
      rangos = rangosResult.rows
    }

    // 5. Fórmulas CAL
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
        let readable = row.formula
        const vars = (row.variables || []).filter(v => v.id)
        for (const v of vars) {
          readable = readable.replace(new RegExp(`\\$${v.id}\\$`, 'g'), v.nombre)
        }
        formulas[row.prueba_id] = { raw: row.formula, readable, variables: vars }
      }
    }

    // 6. Opciones SEL/AYU
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
        opciones[row.prueba_id].push({ id: row.id, opcion: row.opcion, codigo: row.codigo, referencial: row.referencial })
      }
    }

    // 7. Construir respuesta con rangos
    const pacSexo = ot.sexo
    const pacEdad = ot.fecha_nacimiento
      ? Math.floor((Date.now() - new Date(ot.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    const pruebas = pruebasResult.rows.map(row => {
      const rangosPrueba = rangos.filter(r => r.prueba_id === row.prueba_id)
      const matchesPac = r => {
        if (r.sexo && r.sexo.trim() && r.sexo.trim() !== pacSexo) return false
        if (r.edad_desde != null && pacEdad != null && pacEdad < r.edad_desde) return false
        if (r.edad_hasta != null && pacEdad != null && pacEdad > r.edad_hasta) return false
        return true
      }
      const rangosNormales = rangosPrueba.filter(r => !r.panico)
      const rangoAplicable = rangosNormales.find(matchesPac) || rangosNormales[0] || null
      const rangosPanico = rangosPrueba.filter(r => r.panico)
      const panicosMatch = rangosPanico.filter(matchesPac)
      const panicosUsar = panicosMatch.length > 0 ? panicosMatch : rangosPanico

      let refTexto = ''
      if (rangoAplicable) {
        const min = rangoAplicable.valor_desde != null ? Number(rangoAplicable.valor_desde) : null
        const max = rangoAplicable.valor_hasta != null ? Number(rangoAplicable.valor_hasta) : null
        if (min != null && max != null) refTexto = `${min} – ${max}`
        else if (min != null) refTexto = `≥ ${min}`
        else if (max != null) refTexto = `≤ ${max}`
        if (rangoAplicable.comentario) refTexto += (refTexto ? ' ' : '') + rangoAplicable.comentario
      }

      return {
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
        notas: row.notas || '',
        referencia: rangoAplicable ? (() => {
          let cMin = null, cMax = null
          for (const pr of panicosUsar) {
            const pLow = pr.valor_desde != null ? Number(pr.valor_desde) : null
            const pHigh = pr.valor_hasta != null ? Number(pr.valor_hasta) : null
            if (pHigh != null && rangoAplicable.valor_desde != null && pHigh <= Number(rangoAplicable.valor_desde)) cMin = pHigh
            if (pLow != null && rangoAplicable.valor_hasta != null && pLow >= Number(rangoAplicable.valor_hasta)) cMax = pLow
          }
          return {
            min: rangoAplicable.valor_desde != null ? Number(rangoAplicable.valor_desde) : null,
            max: rangoAplicable.valor_hasta != null ? Number(rangoAplicable.valor_hasta) : null,
            critico_min: cMin, critico_max: cMax, texto: refTexto
          }
        })() : null
      }
    })

    // Compute areasStatus (matching ordenes.js shape)
    const areaNameResult = await pool.query('SELECT area AS nombre FROM area WHERE id = $1', [aid])
    const areaName = areaNameResult.rows[0]?.nombre || pruebasResult.rows[0]?.area_nombre || 'Desconocida'
    const totalP = pruebas.length
    const validadas = pruebas.filter(p => p.status_id === 4 || p.status_id === 7).length
    const conValor = pruebas.filter(p => p.resultado).length
    const saStatus = statusArea?.status_nombre || (validadas === totalP && totalP > 0 ? 'Validada' : conValor > 0 ? 'En Proceso' : 'Pendiente')
    const saPct = statusArea ? Number(statusArea.porcentaje_con_valor_resultado || 0) : (totalP ? Math.round(validadas / totalP * 100) : 0)

    res.json({
      orden: {
        numero: ot.numero, fecha: ot.fecha, status: ot.status, color: ot.color,
        status_id: ot.status_id, stat: ot.stat,
        observaciones: ot.ot_observaciones || null,
        informacion_clinica: ot.informacion_clinica || null,
        embarazada: ot.embarazada || false,
        semanas_embarazo: ot.semanas_embarazo || null,
        peso: ot.peso || null, estatura: ot.estatura || null,
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
      areas: [{ id: aid, nombre: areaName, pruebas }],
      areasStatus: [{
        area_id: aid, nombre: areaName,
        total: totalP, conValor, validadas,
        porcentaje: saPct, status: saStatus,
        color: statusArea?.status_color || null
      }]
    })
  } catch (err) {
    console.error('GET /validacion/orden/:numero/area/:areaId error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══ PUT /api/validacion/orden/:numero/area/:areaId/resultados ═══
router.put('/orden/:numero/area/:areaId/resultados', async (req, res) => {
  const client = await pool.connect()
  try {
    const { numero, areaId } = req.params
    const { resultados, validarTodo, observaciones_area } = req.body
    const user = req.user
    const aid = parseInt(areaId)

    if (!Array.isArray(resultados) && !validarTodo) {
      client.release()
      return res.status(400).json({ error: 'resultados debe ser un array' })
    }

    if (!hasLabRole(user)) {
      return res.status(403).json({ error: 'No tiene permisos para validar resultados' })
    }

    await client.query('BEGIN')

    const otCheck = await client.query(`
      SELECT ot.id, p.sexo, p.fecha_nacimiento
      FROM orden_trabajo ot LEFT JOIN paciente p ON ot.paciente_id = p.id
      WHERE ot.numero = $1
    `, [numero])
    if (!otCheck.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Orden no encontrada' }) }
    const otId = otCheck.rows[0].id
    const pacSexo = otCheck.rows[0].sexo
    const pacEdad = otCheck.rows[0].fecha_nacimiento
      ? Math.floor((Date.now() - new Date(otCheck.rows[0].fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    const bioanalistaId = await getBioanalistaId(client, user.userId)

    // Save individual results
    for (const r of (resultados || [])) {
      const poResult = await client.query(`
        SELECT po.id, po.prueba_id, tp.codigo AS tipo,
               COALESCE(u.unidad, '') AS unidad_nombre,
               COALESCE(u.simbolo, '') AS unidad_simbolo
        FROM prueba_orden po
        LEFT JOIN prueba pr ON po.prueba_id = pr.id
        LEFT JOIN tipo_prueba tp ON pr.tipo_prueba_id = tp.id
        LEFT JOIN unidad u ON pr.unidad_id = u.id
        WHERE po.id = $1 AND po.orden_id = $2 AND po.area_id = $3
      `, [r.prueba_orden_id, otId, aid])
      if (!poResult.rows.length) continue
      const poRow = poResult.rows[0]
      const tipo = poRow.tipo || 'NUM'
      const pruebaId = poRow.prueba_id

      // Alarm calculation
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
          const panicRows = refResult.rows.filter(r => r.panico)
          const panicMatch = panicRows.filter(matchesPac)
          const panicUsar = panicMatch.length > 0 ? panicMatch : panicRows

          if (ref) {
            const vMin = ref.valor_desde != null ? Number(ref.valor_desde) : null
            const vMax = ref.valor_hasta != null ? Number(ref.valor_hasta) : null
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
              r.validado ? (bioanalistaId || 0) : 0, bioanalistaId || 0, r.validado || false, r.menor_mayor || null,
              poRow.unidad_nombre || '', poRow.unidad_simbolo || ''])
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
          `, [r.prueba_orden_id, r.valor, r.validado || false, r.validado ? (bioanalistaId || 0) : 0, bioanalistaId || 0])
        }
      }

      // Update prueba_orden status
      if (r.validado !== undefined) {
        const newStatus = r.validado ? (r.valor === '' || r.valor == null ? 7 : 4) : (r.valor !== '' && r.valor != null ? 2 : 1)
        const fechaVal = r.validado ? new Date() : null
        if (tipo === 'NUM' || tipo === 'CAL') {
          await client.query(`
            UPDATE prueba_orden SET status_id = $1, fecha_validacion = $2,
              fecha_primera_validacion = COALESCE(fecha_primera_validacion, $2),
              fecha_validacion_db = CASE WHEN $2 IS NOT NULL THEN NOW() ELSE fecha_validacion_db END,
              anormal = $3, critico = $4
            WHERE id = $5
          `, [newStatus, fechaVal, isAnormal, isCritico, r.prueba_orden_id])
        } else {
          await client.query(`
            UPDATE prueba_orden SET status_id = $1, fecha_validacion = $2,
              fecha_primera_validacion = COALESCE(fecha_primera_validacion, $2),
              fecha_validacion_db = CASE WHEN $2 IS NOT NULL THEN NOW() ELSE fecha_validacion_db END
            WHERE id = $3
          `, [newStatus, fechaVal, r.prueba_orden_id])
        }

        await client.query(`
          INSERT INTO prueba_orden_log (prueba_orden_id, bioanalista_id, usuario_id, fecha, accion, tipo_accion)
          VALUES ($1, $2, $3, NOW(), $4, 'VALIDACION')
        `, [r.prueba_orden_id, bioanalistaId || 0, user.userId,
            r.validado ? `Validado Valor:${r.valor || '(vacío)'}` : `Invalidado${r.nota_invalidacion ? ' — Razón: ' + r.nota_invalidacion : ''}`])
      } else if (r.valor !== undefined) {
        if (tipo === 'NUM' || tipo === 'CAL') {
          await client.query(`
            UPDATE prueba_orden SET status_id = CASE WHEN status_id = 1 THEN 2 ELSE status_id END,
              anormal = $2, critico = $3
            WHERE id = $1
          `, [r.prueba_orden_id, isAnormal, isCritico])
        } else {
          await client.query(`
            UPDATE prueba_orden SET status_id = CASE WHEN status_id = 1 THEN 2 ELSE status_id END
            WHERE id = $1
          `, [r.prueba_orden_id])
        }
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
            [r.prueba_orden_id, notaResult.rows[0].id, otId]
          )
        }
        // Update contiene_notas flag for Labsis Java compatibility
        const hasNotas = r.nota.trim() !== ''
        await client.query('UPDATE prueba_orden SET contiene_notas = $1 WHERE id = $2', [hasNotas, r.prueba_orden_id])
      }
    }

    // Validar Todo: mark all pruebas in area as validated
    if (validarTodo) {
      const pendientes = await client.query(`
        SELECT po.id, po.prueba_id, tp.codigo AS tipo
        FROM prueba_orden po
        LEFT JOIN prueba pr ON po.prueba_id = pr.id
        LEFT JOIN tipo_prueba tp ON pr.tipo_prueba_id = tp.id
        WHERE po.orden_id = $1 AND po.area_id = $2 AND po.status_id NOT IN (4, 7)
      `, [otId, aid])

      for (const po of pendientes.rows) {
        const tipo = po.tipo || 'NUM'
        // Check if has value
        const hasNumVal = await client.query('SELECT valor FROM resultado_numer WHERE pruebao_id = $1', [po.id])
        const hasAlphaVal = await client.query('SELECT valor FROM resultado_alpha WHERE pruebao_id = $1', [po.id])
        const hasValue = (hasNumVal.rows[0]?.valor != null) || (hasAlphaVal.rows[0]?.valor != null && hasAlphaVal.rows[0]?.valor !== '')
        const newStatus = hasValue ? 4 : 7

        // Recalculate anormal/critico for NUM/CAL pruebas
        let isAnormal = false, isCritico = false
        if ((tipo === 'NUM' || tipo === 'CAL') && hasNumVal.rows[0]?.valor != null) {
          const numVal = Number(hasNumVal.rows[0].valor)
          if (!isNaN(numVal)) {
            const refResult = await client.query(`
              SELECT valor_desde, valor_hasta, panico, sexo, edad_desde, edad_hasta
              FROM valor_referencial WHERE prueba_id = $1 AND (activo IS NULL OR activo = true)
            `, [po.prueba_id])
            const matchesPac = rng => {
              if (rng.sexo && rng.sexo.trim() && rng.sexo.trim() !== pacSexo) return false
              if (rng.edad_desde != null && pacEdad != null && pacEdad < rng.edad_desde) return false
              if (rng.edad_hasta != null && pacEdad != null && pacEdad > rng.edad_hasta) return false
              return true
            }
            const normales = refResult.rows.filter(x => !x.panico)
            const ref = normales.find(matchesPac) || normales[0] || null
            const panicRows = refResult.rows.filter(x => x.panico)
            const panicUsar = panicRows.filter(matchesPac).length > 0 ? panicRows.filter(matchesPac) : panicRows
            if (ref) {
              const vMin = ref.valor_desde != null ? Number(ref.valor_desde) : null
              const vMax = ref.valor_hasta != null ? Number(ref.valor_hasta) : null
              let pMin = null, pMax = null
              for (const pr of panicUsar) {
                const pLow = pr.valor_desde != null ? Number(pr.valor_desde) : null
                const pHigh = pr.valor_hasta != null ? Number(pr.valor_hasta) : null
                if (pHigh != null && vMin != null && pHigh <= vMin) pMin = pHigh
                if (pLow != null && vMax != null && pLow >= vMax) pMax = pLow
              }
              if (pMax != null && numVal >= pMax) { isAnormal = true; isCritico = true }
              else if (pMin != null && numVal <= pMin) { isAnormal = true; isCritico = true }
              else if (vMax != null && numVal > vMax) { isAnormal = true }
              else if (vMin != null && numVal < vMin) { isAnormal = true }
            }
          }
        }

        await client.query(`
          UPDATE prueba_orden SET status_id = $1, fecha_validacion = NOW(),
            fecha_primera_validacion = COALESCE(fecha_primera_validacion, NOW()),
            fecha_validacion_db = NOW(),
            anormal = $3, critico = $4
          WHERE id = $2
        `, [newStatus, po.id, isAnormal, isCritico])

        // Set validado_por
        if (tipo === 'NUM' || tipo === 'CAL') {
          await client.query(`
            UPDATE resultado_numer SET validado_por = $1 WHERE pruebao_id = $2 AND (validado_por IS NULL OR validado_por = 0)
          `, [bioanalistaId || 0, po.id])
        } else {
          await client.query(`
            UPDATE resultado_alpha SET validado_por = $1 WHERE pruebao_id = $2 AND (validado_por IS NULL OR validado_por = 0)
          `, [bioanalistaId || 0, po.id])
        }

        await client.query(`
          INSERT INTO prueba_orden_log (prueba_orden_id, bioanalista_id, usuario_id, fecha, accion, tipo_accion)
          VALUES ($1, $2, $3, NOW(), 'Validado Bloque (Todo)', 'VALIDACION')
        `, [po.id, bioanalistaId || 0, user.userId])
      }
    }

    // Persist area observations if provided
    if (observaciones_area !== undefined && observaciones_area !== null) {
      await client.query(`
        UPDATE status_area SET observaciones = $3 WHERE orden_id = $1 AND area_id = $2
      `, [otId, aid, observaciones_area.trim()])
    }

    // Recalculate status_area
    const areaStats = await client.query(`
      SELECT COUNT(*)::int AS total,
        SUM(CASE WHEN po.status_id IN (4, 7) THEN 1 ELSE 0 END)::int AS validados,
        SUM(CASE WHEN po.anormal = true THEN 1 ELSE 0 END)::int AS anormales,
        BOOL_OR(po.status_id IN (4, 7)) AS alguna_validada,
        SUM(CASE WHEN rn.valor IS NOT NULL OR (ra.valor IS NOT NULL AND ra.valor <> '') THEN 1 ELSE 0 END)::int AS con_valor
      FROM prueba_orden po
      LEFT JOIN resultado_numer rn ON rn.pruebao_id = po.id
      LEFT JOIN resultado_alpha ra ON ra.pruebao_id = po.id
      WHERE po.orden_id = $1 AND po.area_id = $2
    `, [otId, aid])
    const stats = areaStats.rows[0]
    const areaAllValidated = stats.validados === stats.total && stats.total > 0
    const areaStatus = areaAllValidated ? 4 : (stats.validados > 0 ? 8 : 2)
    const pctConValor = stats.total > 0 ? Math.round(stats.con_valor / stats.total * 100) : 0
    const tieneAlarma = (stats.anormales || 0) > 0

    await client.query(`
      UPDATE status_area SET status_orden_id = $3, porcentaje_con_valor_resultado = $4, is_alguna_prueba_validada = $5, is_activa_alarma_val_ref = $6
      WHERE orden_id = $1 AND area_id = $2
    `, [otId, aid, areaStatus, pctConValor, stats.alguna_validada || false, tieneAlarma])

    // Recalculate OT status (aligned with ordenes.js logic)
    const allPO = await client.query('SELECT status_id FROM prueba_orden WHERE orden_id = $1', [otId])
    const otAllValidated = allPO.rows.every(r => r.status_id === 4 || r.status_id === 7) && allPO.rows.length > 0
    if (otAllValidated) {
      await client.query('UPDATE orden_trabajo SET status_id = 4, fecha_validado = NOW() WHERE id = $1', [otId])
    } else {
      const someValidated = allPO.rows.some(r => r.status_id === 4 || r.status_id === 7)
      const someWithValue = allPO.rows.some(r => r.status_id === 2 || r.status_id === 8)
      if (someValidated || someWithValue) {
        const newOtStatus = someValidated ? 8 : 2
        await client.query('UPDATE orden_trabajo SET status_id = $2 WHERE id = $1 AND status_id NOT IN (4, 6)', [otId, newOtStatus])
      }
    }

    await client.query('COMMIT')
    res.json({ ok: true, areaValidated: areaAllValidated })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('PUT /validacion/resultados error:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

export default router
