import { Router } from 'express'
import pool from '../db.js'

const router = Router()

// GET /api/insights/mi-area — Insights personalizados para el bioanalista logueado
router.get('/mi-area', async (req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.json({ insights: null })

    // 1. Obtener áreas del bioanalista
    const areasResult = await pool.query(`
      SELECT a.id, a.area AS nombre, a.bioanalista_id AS coord_bio_id,
             bc.nombre || ' ' || bc.apellido AS coordinador
      FROM bioanalista b
      JOIN bioanalista_has_area bha ON bha.bioanalista_id = b.id
      JOIN area a ON bha.area_id = a.id
      LEFT JOIN bioanalista bc ON a.bioanalista_id = bc.id
      WHERE b.usuario_id = $1
      ORDER BY a.area
    `, [userId])

    if (areasResult.rows.length === 0) {
      return res.json({ insights: null })
    }

    const areaIds = areasResult.rows.map(a => a.id)
    const areas = areasResult.rows

    // 2. Equipos vinculados a esas áreas (vía parametro_equipo_sistema)
    const equiposResult = await pool.query(`
      SELECT DISTINCT es.id, es.nombre_s AS nombre, e.nombre AS marca,
             a.id AS area_id, a.area AS area_nombre,
             es.status_qc
      FROM parametro_equipo_sistema pes
      JOIN prueba p ON pes.parametro_id = p.id
      JOIN equipo_sistema es ON pes.equipo_sistema_id = es.id
      JOIN equipo e ON es.equipo_id = e.id
      JOIN area a ON p.area_id = a.id
      WHERE p.area_id = ANY($1) AND p.activa = true AND es.activo = true AND pes.activo = true
      ORDER BY a.area, es.nombre_s
    `, [areaIds])

    const equipoIds = equiposResult.rows.map(eq => eq.id)

    // 3. Último QC por equipo (z-score más reciente)
    let qcStatus = []
    if (equipoIds.length > 0) {
      const qcResult = await pool.query(`
        SELECT DISTINCT ON (nc.equipo_sistema_id, nc.nivel)
          nc.equipo_sistema_id, es.nombre_s AS equipo,
          nc.nivel, nc.lote, nc.mean, nc.std_deviation,
          rc.valor, rc.fecha,
          CASE WHEN nc.std_deviation > 0
            THEN ROUND(ABS(rc.valor - nc.mean) / nc.std_deviation, 2)
            ELSE NULL END AS z_score
        FROM resultado_control rc
        JOIN nivel_control nc ON rc.nivel_control_id = nc.id
        JOIN equipo_sistema es ON nc.equipo_sistema_id = es.id
        WHERE nc.equipo_sistema_id = ANY($1) AND rc.activo = true AND nc.activo = true
        ORDER BY nc.equipo_sistema_id, nc.nivel, rc.fecha DESC
      `, [equipoIds])
      qcStatus = qcResult.rows
    }

    // 4. Volumen de trabajo hoy por área
    const volumenResult = await pool.query(`
      SELECT a.id AS area_id, a.area,
             COUNT(DISTINCT ot.id) AS ordenes,
             COUNT(po.id) AS pruebas_total,
             COUNT(CASE WHEN po.status_id = 1 THEN 1 END) AS sin_resultado,
             COUNT(CASE WHEN po.status_id IN (2,3) THEN 1 END) AS en_proceso,
             COUNT(CASE WHEN po.status_id IN (4,7) THEN 1 END) AS validadas,
             COUNT(CASE WHEN po.anormal = true OR po.critico = true THEN 1 END) AS con_alarma
      FROM orden_trabajo ot
      JOIN prueba_orden po ON po.orden_id = ot.id
      JOIN area a ON po.area_id = a.id
      WHERE ot.fecha >= CURRENT_DATE
        AND ot.status_id NOT IN (5,6)
        AND a.id = ANY($1)
      GROUP BY a.id, a.area
      ORDER BY a.area
    `, [areaIds])

    // 5. Alarmas de equipo no leídas
    let alarmas = []
    if (equipoIds.length > 0) {
      const alarmasResult = await pool.query(`
        SELECT ae.id, ae.descripcion, ae.fecha, ae.para_jefe_area,
               es.nombre_s AS equipo
        FROM alarma_equipo_sistema ae
        JOIN equipo_sistema es ON ae.equipo_sistema_id = es.id
        WHERE ae.equipo_sistema_id = ANY($1)
          AND ae.leido = false
        ORDER BY ae.fecha DESC
        LIMIT 10
      `, [equipoIds])
      alarmas = alarmasResult.rows
    }

    // 6. Bitácora RACCO reciente (últimos 7 días)
    let bitacora = []
    if (equipoIds.length > 0) {
      const bitacoraResult = await pool.query(`
        SELECT br.id, br.tipo_registro, br.fecha, br.observaciones,
               es.nombre_s AS equipo, u.nombre || ' ' || u.apellido AS registrado_por
        FROM bitacora_racco br
        JOIN equipo_sistema es ON br.equipo_sistema_id = es.id
        LEFT JOIN usuario u ON br.usuario_id = u.id
        WHERE br.equipo_sistema_id = ANY($1)
          AND br.fecha >= CURRENT_DATE - 7
        ORDER BY br.fecha DESC
        LIMIT 10
      `, [equipoIds])
      bitacora = bitacoraResult.rows
    }

    res.json({
      insights: {
        areas,
        equipos: equiposResult.rows,
        qcStatus,
        volumen: volumenResult.rows,
        alarmas,
        bitacora,
      }
    })
  } catch (err) {
    console.error('Error en insights/mi-area:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/insights/mi-area/reporte — Infografía operacional por periodo
router.get('/mi-area/reporte', async (req, res) => {
  try {
    const userId = req.user?.userId
    if (!userId) return res.json({ reporte: null })

    const { rango = 'semana', fechaDesde, fechaHasta, areaIds: areaIdsParam } = req.query

    // 1. Obtener áreas del bioanalista (with coordinador info)
    const areasResult = await pool.query(`
      SELECT a.id, a.area AS nombre,
             bc.nombre || ' ' || bc.apellido AS coordinador
      FROM bioanalista b
      JOIN bioanalista_has_area bha ON bha.bioanalista_id = b.id
      JOIN area a ON bha.area_id = a.id
      LEFT JOIN bioanalista bc ON a.bioanalista_id = bc.id
      WHERE b.usuario_id = $1
      ORDER BY a.area
    `, [userId])

    if (areasResult.rows.length === 0) {
      return res.json({ reporte: null })
    }

    // FASE 1A: areaIds parameter filter (intersection with user's areas)
    const allAreaIds = areasResult.rows.map(a => a.id)
    const requestedIds = areaIdsParam
      ? areaIdsParam.split(',').map(Number).filter(id => allAreaIds.includes(id))
      : null
    const areaIds = requestedIds?.length > 0 ? requestedIds : allAreaIds
    const areas = requestedIds?.length > 0
      ? areasResult.rows.filter(a => requestedIds.includes(a.id))
      : areasResult.rows

    // Calculate date range
    const now = new Date()
    let startDate, endDate
    switch (rango) {
      case 'hoy':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 1)
        break
      case 'ayer':
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        startDate = new Date(endDate); startDate.setDate(startDate.getDate() - 1)
        break
      case 'mes':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(startDate); endDate.setMonth(endDate.getMonth() + 1)
        break
      case 'custom':
        startDate = fechaDesde ? new Date(fechaDesde) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        endDate = fechaHasta ? new Date(fechaHasta) : new Date()
        endDate.setDate(endDate.getDate() + 1) // inclusive end
        break
      default: // semana
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    }

    const sd = startDate.toISOString().slice(0, 10)
    const ed = endDate.toISOString().slice(0, 10)

    // Get equipos for the areas
    const equiposResult = await pool.query(`
      SELECT DISTINCT es.id, es.nombre_s AS nombre, e.nombre AS marca,
             a.id AS area_id, a.area AS area_nombre
      FROM parametro_equipo_sistema pes
      JOIN prueba p ON pes.parametro_id = p.id
      JOIN equipo_sistema es ON pes.equipo_sistema_id = es.id
      JOIN equipo e ON es.equipo_id = e.id
      JOIN area a ON p.area_id = a.id
      WHERE p.area_id = ANY($1) AND p.activa = true AND es.activo = true AND pes.activo = true
      ORDER BY a.area, es.nombre_s
    `, [areaIds])

    const equipoIds = equiposResult.rows.map(eq => eq.id)

    // Run independent queries in parallel with Promise.all
    const [volumenResult, qcTrendResult, raccoResult, alarmasResults, rendimientoResult, muestrasPipelineResult, tatResult] = await Promise.all([
      // A) Volumen por día del periodo
      pool.query(`
        SELECT ot.fecha::date AS dia,
               COUNT(DISTINCT ot.id) AS ordenes,
               COUNT(po.id) AS pruebas_total,
               COUNT(CASE WHEN po.status_id IN (4,7) THEN 1 END) AS validadas,
               COUNT(CASE WHEN po.anormal = true OR po.critico = true THEN 1 END) AS con_alarma
        FROM orden_trabajo ot
        JOIN prueba_orden po ON po.orden_id = ot.id
        JOIN area a ON po.area_id = a.id
        WHERE ot.fecha >= $2 AND ot.fecha < $3
          AND ot.status_id NOT IN (5,6)
          AND a.id = ANY($1)
        GROUP BY ot.fecha::date
        ORDER BY dia
      `, [areaIds, sd, ed]),

      // B) QC Trend por equipo
      equipoIds.length > 0
        ? pool.query(`
            SELECT nc.equipo_sistema_id, es.nombre_s AS equipo,
                   rc.fecha::date AS dia,
                   ROUND(AVG(CASE WHEN nc.std_deviation > 0
                     THEN ABS(rc.valor - nc.mean) / nc.std_deviation
                     ELSE NULL END)::numeric, 2) AS z_avg
            FROM resultado_control rc
            JOIN nivel_control nc ON rc.nivel_control_id = nc.id
            JOIN equipo_sistema es ON nc.equipo_sistema_id = es.id
            WHERE nc.equipo_sistema_id = ANY($1)
              AND rc.activo = true AND nc.activo = true
              AND rc.fecha >= $2 AND rc.fecha < $3
            GROUP BY nc.equipo_sistema_id, es.nombre_s, rc.fecha::date
            ORDER BY nc.equipo_sistema_id, dia
          `, [equipoIds, sd, ed])
        : Promise.resolve({ rows: [] }),

      // C) Resumen RACCO por tipo_registro
      equipoIds.length > 0
        ? Promise.all([
            pool.query(`
              SELECT br.tipo_registro, COUNT(*) AS total
              FROM bitacora_racco br
              WHERE br.equipo_sistema_id = ANY($1)
                AND br.fecha >= $2 AND br.fecha < $3
              GROUP BY br.tipo_registro
              ORDER BY total DESC
            `, [equipoIds, sd, ed]),
            pool.query(`
              SELECT br.id, br.tipo_registro, br.fecha, br.observaciones,
                     es.nombre_s AS equipo, u.nombre || ' ' || u.apellido AS registrado_por
              FROM bitacora_racco br
              JOIN equipo_sistema es ON br.equipo_sistema_id = es.id
              LEFT JOIN usuario u ON br.usuario_id = u.id
              WHERE br.equipo_sistema_id = ANY($1)
                AND br.fecha >= $2 AND br.fecha < $3
              ORDER BY br.fecha DESC
              LIMIT 5
            `, [equipoIds, sd, ed])
          ])
        : Promise.resolve([{ rows: [] }, { rows: [] }]),

      // D) Alarmas del periodo
      equipoIds.length > 0
        ? Promise.all([
            pool.query(`
              SELECT COUNT(*) AS total,
                     COUNT(CASE WHEN ae.leido = true THEN 1 END) AS leidas,
                     COUNT(CASE WHEN ae.leido = false THEN 1 END) AS no_leidas
              FROM alarma_equipo_sistema ae
              WHERE ae.equipo_sistema_id = ANY($1)
                AND ae.fecha >= $2 AND ae.fecha < $3
            `, [equipoIds, sd, ed]),
            pool.query(`
              SELECT es.nombre_s AS equipo, COUNT(*) AS total
              FROM alarma_equipo_sistema ae
              JOIN equipo_sistema es ON ae.equipo_sistema_id = es.id
              WHERE ae.equipo_sistema_id = ANY($1)
                AND ae.fecha >= $2 AND ae.fecha < $3
              GROUP BY es.nombre_s
              ORDER BY total DESC
              LIMIT 5
            `, [equipoIds, sd, ed])
          ])
        : Promise.resolve([{ rows: [{ total: '0', leidas: '0', no_leidas: '0' }] }, { rows: [] }]),

      // E) Rendimiento por área
      pool.query(`
        SELECT a.id AS area_id, a.area,
               COUNT(po.id) AS pruebas_total,
               COUNT(CASE WHEN po.status_id IN (4,7) THEN 1 END) AS validadas,
               COUNT(CASE WHEN po.anormal = true OR po.critico = true THEN 1 END) AS con_alarma
        FROM orden_trabajo ot
        JOIN prueba_orden po ON po.orden_id = ot.id
        JOIN area a ON po.area_id = a.id
        WHERE ot.fecha >= $2 AND ot.fecha < $3
          AND ot.status_id NOT IN (5,6)
          AND a.id = ANY($1)
        GROUP BY a.id, a.area
        ORDER BY a.area
      `, [areaIds, sd, ed]),

      // F2) Muestras Pipeline por status
      pool.query(`
        SELECT sm.id AS status_id, sm.status, COUNT(DISTINCT m.id) AS total
        FROM muestra m
        JOIN orden_trabajo ot ON m.orden_id = ot.id
        JOIN status_muestra sm ON m.status_muestra_id = sm.id
        WHERE ot.fecha >= $2 AND ot.fecha < $3
          AND ot.status_id NOT IN (5,6)
          AND EXISTS (SELECT 1 FROM prueba_orden po WHERE po.orden_id = ot.id AND po.area_id = ANY($1))
        GROUP BY sm.id, sm.status ORDER BY sm.id
      `, [areaIds, sd, ed]),

      // F4) TAT Monitor
      pool.query(`
        SELECT a.id AS area_id, a.area,
          a.rango_tiempo_incumplimiento_critico AS tat_critico,
          a.rango_tiempo_incumplimiento_riesgo AS tat_riesgo,
          AVG(EXTRACT(EPOCH FROM (po.fecha_validacion - ot.fecha))/60)::int AS avg_tat_min,
          PERCENTILE_CONT(0.90) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (po.fecha_validacion - ot.fecha))/60
          )::int AS p90_tat_min,
          COUNT(CASE WHEN a.rango_tiempo_incumplimiento_critico IS NOT NULL
            AND EXTRACT(EPOCH FROM (po.fecha_validacion - ot.fecha))/60
              <= a.rango_tiempo_incumplimiento_critico THEN 1 END)::float
            / NULLIF(COUNT(po.fecha_validacion),0) * 100 AS pct_sla
        FROM orden_trabajo ot
        JOIN prueba_orden po ON po.orden_id = ot.id
        JOIN area a ON po.area_id = a.id
        WHERE ot.fecha >= $2 AND ot.fecha < $3 AND a.id = ANY($1)
          AND po.fecha_validacion IS NOT NULL AND ot.status_id NOT IN (5,6)
        GROUP BY a.id, a.area, a.rango_tiempo_incumplimiento_critico, a.rango_tiempo_incumplimiento_riesgo
      `, [areaIds, sd, ed])
    ])

    // Unpack parallel results
    const qcTrend = qcTrendResult.rows

    const raccoUnpacked = Array.isArray(raccoResult) ? raccoResult : [raccoResult, { rows: [] }]
    const racco = { counts: raccoUnpacked[0].rows, recientes: raccoUnpacked[1].rows }

    const alarmasUnpacked = Array.isArray(alarmasResults) ? alarmasResults : [alarmasResults, { rows: [] }]
    const alarmaRow = alarmasUnpacked[0].rows[0]
    const alarmasData = {
      total: parseInt(alarmaRow.total),
      leidas: parseInt(alarmaRow.leidas),
      noLeidas: parseInt(alarmaRow.no_leidas),
      topEquipos: alarmasUnpacked[1].rows
    }

    // F3) Equipment Workload (depends on equipoIds, run after Promise.all)
    let equipoWorkload = []
    if (equipoIds.length > 0) {
      try {
        const eqWLResult = await pool.query(`
          SELECT es.id, es.nombre_s AS equipo,
            COUNT(*) AS programadas,
            COUNT(CASE WHEN mes.fecha_recepcion_resultado IS NOT NULL THEN 1 END) AS completadas,
            COUNT(CASE WHEN mes.fecha_recepcion_resultado IS NULL THEN 1 END) AS pendientes
          FROM muestra_equipo_sistema_status mes
          JOIN equipo_sistema es ON mes.equipo_sistema_id = es.id
          WHERE es.id = ANY($1) AND mes.fecha_programacion >= $2 AND mes.fecha_programacion < $3
          GROUP BY es.id, es.nombre_s ORDER BY pendientes DESC
        `, [equipoIds, sd, ed])
        equipoWorkload = eqWLResult.rows
      } catch (e) {
        // Table may not exist in all environments
        console.warn('Equipment workload query skipped:', e.message)
      }
    }

    // F) Cápsulas resumen
    const totalOrdenes = volumenResult.rows.reduce((s, r) => s + parseInt(r.ordenes), 0)
    const totalPruebas = volumenResult.rows.reduce((s, r) => s + parseInt(r.pruebas_total), 0)
    const totalValidadas = volumenResult.rows.reduce((s, r) => s + parseInt(r.validadas), 0)
    const totalConAlarma = volumenResult.rows.reduce((s, r) => s + parseInt(r.con_alarma), 0)
    const pctValidacion = totalPruebas > 0 ? Math.round((totalValidadas / totalPruebas) * 100) : 0
    const equiposQcFuera = [...new Set(qcTrend.filter(q => parseFloat(q.z_avg) > 2).map(q => q.equipo))].length
    const totalRacco = racco.counts.reduce((s, r) => s + parseInt(r.total), 0)

    // G) Smart Alerts
    const smartAlerts = []

    // QC Drift: equipo with z > 2 for 3+ consecutive days
    const byEquipoQC = {}
    for (const row of qcTrend) {
      if (!byEquipoQC[row.equipo_sistema_id]) byEquipoQC[row.equipo_sistema_id] = { nombre: row.equipo, days: [] }
      byEquipoQC[row.equipo_sistema_id].days.push({ dia: row.dia, z: parseFloat(row.z_avg) })
    }
    for (const [, eq] of Object.entries(byEquipoQC)) {
      let consecutive = 0
      for (const d of eq.days) {
        if (d.z > 2) { consecutive++; if (consecutive >= 3) break } else consecutive = 0
      }
      if (consecutive >= 3) {
        smartAlerts.push({ type: 'qc_drift', severity: 'critical', message: `${eq.nombre}: z > 2 por ${consecutive} días consecutivos`, icon: 'alert-triangle' })
      }
    }

    // Alarmas sin leer
    if (alarmasData.noLeidas > 0) {
      smartAlerts.push({ type: 'alarmas_unread', severity: 'warning', message: `${alarmasData.noLeidas} alarma${alarmasData.noLeidas !== 1 ? 's' : ''} sin leer`, icon: 'bell' })
    }

    // Validación baja
    if (pctValidacion < 50 && totalPruebas > 0) {
      smartAlerts.push({ type: 'low_validation', severity: 'warning', message: `Validación al ${pctValidacion}% — por debajo del umbral`, icon: 'check-circle' })
    }

    // Sin actividad
    if (totalOrdenes === 0) {
      smartAlerts.push({ type: 'no_activity', severity: 'info', message: 'Sin órdenes en el periodo seleccionado', icon: 'info' })
    }

    res.json({
      reporte: {
        rango, startDate: sd, endDate: ed,
        areas,
        allAreas: areasResult.rows,
        capsulas: {
          ordenes: totalOrdenes,
          pruebas: totalPruebas,
          validadas: totalValidadas,
          pctValidacion,
          conAlarma: totalConAlarma,
          equiposQcFuera,
          alarmasNoLeidas: alarmasData.noLeidas,
          raccoEventos: totalRacco,
        },
        volumenDiario: volumenResult.rows,
        qcTrend,
        racco,
        alarmas: alarmasData,
        rendimiento: rendimientoResult.rows,
        equipos: equiposResult.rows,
        smartAlerts,
        muestrasPipeline: muestrasPipelineResult.rows,
        equipoWorkload,
        tatMonitor: tatResult.rows,
      }
    })
  } catch (err) {
    console.error('Error en insights/mi-area/reporte:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
