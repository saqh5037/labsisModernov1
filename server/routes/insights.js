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

export default router
