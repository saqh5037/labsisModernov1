import { Router } from 'express'
import pool from '../db.js'

const router = Router()

/* ── GET /checkpoints — All checkpoints ── */
router.get('/checkpoints', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT cp.id, cp.ip, cp.descripcion, cp.comentario,
             cp.entrada_lab, cp.muestra_recibida, cp.orden,
             cp.ingreso_automatico_lista_trabajo,
             cp.reporte, cp.envio_estructura_orden,
             sm.id AS status_muestra_id, sm.status AS status_nombre, sm.codigo AS status_codigo
      FROM check_point cp
      LEFT JOIN status_muestra sm ON cp.status_muestra_id = sm.id
      ORDER BY cp.orden NULLS LAST, cp.descripcion
    `)
    res.json(rows)
  } catch (err) {
    console.error('GET /trazabilidad/checkpoints error:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ── GET /checkpoints/by-ip — Checkpoints matching request IP ── */
router.get('/checkpoints/by-ip', async (req, res) => {
  try {
    // Extract IP from request (handle proxies, IPv6-mapped IPv4)
    let ip = req.ip || req.connection?.remoteAddress || ''
    if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1'
    if (ip.startsWith('::ffff:')) ip = ip.slice(7)

    const { rows } = await pool.query(`
      SELECT cp.id, cp.ip, cp.descripcion, cp.comentario,
             cp.entrada_lab, cp.muestra_recibida, cp.orden,
             sm.id AS status_muestra_id, sm.status AS status_nombre, sm.codigo AS status_codigo
      FROM check_point cp
      LEFT JOIN status_muestra sm ON cp.status_muestra_id = sm.id
      WHERE cp.ip = $1
      ORDER BY cp.orden NULLS LAST, cp.descripcion
    `, [ip])
    res.json({ ip, checkpoints: rows })
  } catch (err) {
    console.error('GET /trazabilidad/checkpoints/by-ip error:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ── GET /status-muestra — All sample statuses ── */
router.get('/status-muestra', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, codigo, status AS nombre,
             desactiva_pruebas AS desactiva_pruebas,
             mostrar_a_cliente, orden_a_cliente
      FROM status_muestra
      ORDER BY id
    `)
    res.json(rows)
  } catch (err) {
    console.error('GET /trazabilidad/status-muestra error:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ── POST /scan — Scan barcode at checkpoint ── */
router.post('/scan', async (req, res) => {
  const { checkpointId, barcode } = req.body
  if (!checkpointId || !barcode) {
    return res.status(400).json({ error: 'checkpointId y barcode son requeridos' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. Load checkpoint with its target status
    const cpResult = await client.query(`
      SELECT cp.*, sm.codigo AS status_codigo, sm.status AS status_nombre,
             sm.desactiva_pruebas AS desactiva_pruebas
      FROM check_point cp
      LEFT JOIN status_muestra sm ON cp.status_muestra_id = sm.id
      WHERE cp.id = $1
    `, [checkpointId])
    if (cpResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Checkpoint no encontrado' })
    }
    const checkpoint = cpResult.rows[0]

    // 2. Find muestra by barcode
    const muResult = await client.query(`
      SELECT mu.id, mu.barcode, mu.orden_id, mu.status_muestra_id,
             mu.muestra_recibida, mu.fecha_muestra_recibida,
             mu.tipo_contenedor_id, mu.tipo_muestra_id, mu.correlativo,
             sm.codigo AS status_actual_codigo, sm.status AS status_actual_nombre,
             ot.numero AS orden_numero, ot.toma_muestra_completa
      FROM muestra mu
      LEFT JOIN status_muestra sm ON mu.status_muestra_id = sm.id
      LEFT JOIN orden_trabajo ot ON mu.orden_id = ot.id
      WHERE mu.barcode = $1
    `, [barcode.trim()])
    if (muResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: `Código de barras "${barcode}" no encontrado` })
    }
    const muestra = muResult.rows[0]
    const statusAnterior = { codigo: muestra.status_actual_codigo, nombre: muestra.status_actual_nombre }

    // 3. Validate flow (check laboratorio config for strict ACM validation)
    const labConfig = await client.query(`
      SELECT configuracion_especial FROM laboratorio LIMIT 1
    `)
    let config = {}
    if (labConfig.rows.length > 0 && labConfig.rows[0].configuracion_especial) {
      try { config = JSON.parse(labConfig.rows[0].configuracion_especial) } catch { /* ignore */ }
    }

    const strictAcm = config['checkpoint-datos-no_recibir_muestra_acm_sin_cierre_toma']
    if (strictAcm) {
      // TRA requires previous status = REC and toma completa
      if (checkpoint.status_codigo === 'TRA') {
        if (muestra.status_actual_codigo !== 'REC') {
          await client.query('ROLLBACK')
          return res.status(400).json({ error: `Muestra debe estar en estado REC para transitar a TRA. Estado actual: ${muestra.status_actual_codigo}` })
        }
        if (!muestra.toma_muestra_completa) {
          await client.query('ROLLBACK')
          return res.status(400).json({ error: 'La toma de muestra debe estar completa para transitar a TRA' })
        }
      }
      // ACM requires previous status = TRA
      if (checkpoint.status_codigo === 'ACM') {
        if (muestra.status_actual_codigo !== 'TRA') {
          await client.query('ROLLBACK')
          return res.status(400).json({ error: `Muestra debe estar en estado TRA para transitar a ACM. Estado actual: ${muestra.status_actual_codigo}` })
        }
      }
    }

    // Reject scan if current status is NOE (unless config allows recovery)
    if (muestra.status_actual_codigo === 'NOE' && checkpoint.status_codigo !== 'NOE') {
      const allowRecovery = config['checkpoint-checkin-invalidate_from_noe_to_another_status']
      if (!allowRecovery) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'Muestra marcada como No Entregada. No se permite cambio de estado.' })
      }
    }

    // 4. Update muestra status
    await client.query(`
      UPDATE muestra SET status_muestra_id = $1 WHERE id = $2
    `, [checkpoint.status_muestra_id, muestra.id])

    // 5. Handle NOE → deactivate tests
    if (checkpoint.status_codigo === 'NOE' && checkpoint.desactiva_pruebas) {
      await client.query(`
        UPDATE prueba_orden SET activa = false
        WHERE orden_id = $1
          AND id IN (
            SELECT po.id FROM prueba_orden po
            JOIN prueba p ON po.prueba_id = p.id
            WHERE po.orden_id = $1
              AND p.tipo_contenedor_id = $2
              AND p.tipo_muestra_id = $3
          )
      `, [muestra.orden_id, muestra.tipo_contenedor_id, muestra.tipo_muestra_id])
    }

    // 5b. Recovery from NOE → re-activate tests
    if (muestra.status_actual_codigo === 'NOE' && checkpoint.status_codigo !== 'NOE') {
      await client.query(`
        UPDATE prueba_orden SET activa = true
        WHERE orden_id = $1
          AND id IN (
            SELECT po.id FROM prueba_orden po
            JOIN prueba p ON po.prueba_id = p.id
            WHERE po.orden_id = $1
              AND p.tipo_contenedor_id = $2
              AND p.tipo_muestra_id = $3
          )
      `, [muestra.orden_id, muestra.tipo_contenedor_id, muestra.tipo_muestra_id])
    }

    // 6. Create audit log — "Cambio de Estado: <StatusName>" (matches legacy Java)
    const accionText = checkpoint.status_nombre
      ? `Cambio de Estado: ${checkpoint.status_nombre}`
      : (checkpoint.comentario || 'Cambio de Estado')
    await client.query(`
      INSERT INTO muestra_log (muestra_id, check_point_id, accion, realizado, usuario_id, status_muestra_id, tipo)
      VALUES ($1, $2, $3, NOW(), $4, $5, 'Accion')
    `, [
      muestra.id,
      checkpointId,
      accionText,
      req.user?.id || null,
      checkpoint.status_muestra_id
    ])

    // 7. If entrada_lab = true → activate work areas + set arrived_lab on OT
    if (checkpoint.entrada_lab) {
      // Activate status_area for matching areas
      await client.query(`
        UPDATE status_area sa
        SET status_orden_id = 1
        WHERE sa.orden_id = $1
          AND sa.status_orden_id = 0
          AND sa.area_id IN (
            SELECT DISTINCT p.area_id
            FROM prueba_orden po
            JOIN prueba p ON po.prueba_id = p.id
            WHERE po.orden_id = $1
              AND p.tipo_contenedor_id = $2
              AND p.tipo_muestra_id = $3
          )
      `, [muestra.orden_id, muestra.tipo_contenedor_id, muestra.tipo_muestra_id])

      // Mark OT as arrived at lab (legacy: orden.setArrivedLab(true))
      await client.query(`
        UPDATE orden_trabajo SET arrived_lab = true WHERE id = $1
      `, [muestra.orden_id])
    }

    // 8. If muestra_recibida flag → mark sample as received + second log entry
    if (checkpoint.muestra_recibida) {
      await client.query(`
        UPDATE muestra SET muestra_recibida = true, fecha_muestra_recibida = NOW()
        WHERE id = $1
      `, [muestra.id])

      // Second log entry for "Muestra Recibida" (legacy creates separate log)
      await client.query(`
        INSERT INTO muestra_log (muestra_id, check_point_id, accion, realizado, usuario_id, status_muestra_id, tipo)
        VALUES ($1, $2, 'Muestra Recibida', NOW(), $3, $4, 'Accion')
      `, [muestra.id, checkpointId, req.user?.id || null, checkpoint.status_muestra_id])

      // Checkin logic: if ALL muestras of the OT are received → add to lista_trabajo_automatizada_orden_trabajo
      const pendingCheck = await client.query(`
        SELECT COUNT(*)::int AS pending
        FROM muestra
        WHERE orden_id = $1 AND muestra_recibida = false
      `, [muestra.orden_id])

      if (pendingCheck.rows[0].pending === 0) {
        // All muestras received — insert into lista_trabajo_automatizada_orden_trabajo per sistema_externo
        const { rows: sistemas } = await client.query(`
          SELECT DISTINCT se.id AS sistema_externo_id
          FROM sistema_externo se
          WHERE EXISTS (SELECT 1 FROM equipo_sistema es WHERE es.activo = true)
        `)
        for (const sys of sistemas) {
          await client.query(`
            INSERT INTO lista_trabajo_automatizada_orden_trabajo
              (orden_id, sistema_externo_id, enviado, fecha_creacion)
            SELECT $1, $2, false, NOW()
            WHERE NOT EXISTS (
              SELECT 1 FROM lista_trabajo_automatizada_orden_trabajo
              WHERE orden_id = $1 AND sistema_externo_id = $2
            )
          `, [muestra.orden_id, sys.sistema_externo_id])
        }
      }
    }

    // 9. retirada_de_gradilla: when previous status was ALM (Almacenada)
    if (muestra.status_actual_codigo === 'ALM') {
      await client.query(`
        UPDATE muestra SET retirada_de_gradilla = true WHERE id = $1
      `, [muestra.id])
    }

    // 10. ingreso_automatico_lista_trabajo: add muestra to lista_trabajo_automatizada per equipo
    if (checkpoint.ingreso_automatico_lista_trabajo) {
      const { rows: equipos } = await client.query(`
        SELECT DISTINCT es.id AS equipo_sistema_id
        FROM equipo_sistema es
        JOIN equipo e ON es.equipo_id = e.id
        JOIN prueba p ON p.equipo_id = e.id
        JOIN prueba_orden po ON po.prueba_id = p.id
        WHERE po.orden_id = $1
          AND p.tipo_contenedor_id = $2
          AND p.tipo_muestra_id = $3
          AND es.activo = true
      `, [muestra.orden_id, muestra.tipo_contenedor_id, muestra.tipo_muestra_id])

      for (const eq of equipos) {
        await client.query(`
          INSERT INTO lista_trabajo_automatizada (equipo_sistema_id, muestra_id, enviado, codigo_accion)
          SELECT $1, $2, false, '0'
          WHERE NOT EXISTS (
            SELECT 1 FROM lista_trabajo_automatizada
            WHERE equipo_sistema_id = $1 AND muestra_id = $2
          )
        `, [eq.equipo_sistema_id, muestra.id])
      }

      // Mark muestra as sent to lista_trabajo
      await client.query(`
        UPDATE muestra SET enviada_lista_trabajo_automatizada = true WHERE id = $1
      `, [muestra.id])
    }

    // 11. envio_estructura_orden: insert into envio_estructura_orden_trabajo per sistema_externo
    if (checkpoint.envio_estructura_orden) {
      const { rows: sistemasExt } = await client.query(`
        SELECT id AS sistema_externo_id FROM sistema_externo
      `)
      for (const sys of sistemasExt) {
        await client.query(`
          INSERT INTO envio_estructura_orden_trabajo (orden_trabajo_id, sistema_externo_id, enviado, es_edicion, fecha_creacion)
          SELECT $1, $2, false, false, NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM envio_estructura_orden_trabajo
            WHERE orden_trabajo_id = $1 AND sistema_externo_id = $2 AND enviado = false
          )
        `, [muestra.orden_id, sys.sistema_externo_id])
      }
    }

    await client.query('COMMIT')

    // Load updated muestra + recent logs for response
    const updated = await pool.query(`
      SELECT mu.id, mu.barcode, mu.orden_id, mu.cantidad,
             mu.muestra_recibida, mu.fecha_muestra_recibida,
             sm.codigo AS status_codigo, sm.status AS status_nombre,
             ot.numero AS orden_numero,
             tm.tipo AS tipo_muestra, tc.tipo AS contenedor,
             tc.abreviacion AS contenedor_abrev, tc.color AS contenedor_color,
             p.nombre AS paciente_nombre, p.apellido AS paciente_apellido,
             p.ci_paciente, p.sexo, p.fecha_nacimiento
      FROM muestra mu
      LEFT JOIN status_muestra sm ON mu.status_muestra_id = sm.id
      LEFT JOIN orden_trabajo ot ON mu.orden_id = ot.id
      LEFT JOIN tipo_muestra tm ON mu.tipo_muestra_id = tm.id
      LEFT JOIN tipo_contenedor tc ON mu.tipo_contenedor_id = tc.id
      LEFT JOIN paciente p ON ot.paciente_id = p.id
      WHERE mu.id = $1
    `, [muestra.id])

    const recentLogs = await pool.query(`
      SELECT ml.id, ml.accion, ml.realizado, ml.tipo,
             cp.descripcion AS checkpoint,
             sm.codigo AS status_codigo, sm.status AS status_nombre,
             u.nombre || ' ' || u.apellido AS usuario
      FROM muestra_log ml
      LEFT JOIN check_point cp ON ml.check_point_id = cp.id
      LEFT JOIN status_muestra sm ON ml.status_muestra_id = sm.id
      LEFT JOIN usuario u ON ml.usuario_id = u.id
      WHERE ml.muestra_id = $1
      ORDER BY ml.realizado DESC
      LIMIT 20
    `, [muestra.id])

    res.json({
      ok: true,
      muestra: updated.rows[0],
      statusAnterior,
      statusNuevo: { codigo: checkpoint.status_codigo, nombre: checkpoint.status_nombre },
      logs: recentLogs.rows
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /trazabilidad/scan error:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

/* ── GET /muestra/:id/logs — Timeline of a sample ── */
router.get('/muestra/:id/logs', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ml.id, ml.accion, ml.realizado, ml.tipo,
             cp.descripcion AS checkpoint, cp.ip AS checkpoint_ip,
             sm.codigo AS status_codigo, sm.status AS status_nombre,
             u.nombre || ' ' || u.apellido AS usuario
      FROM muestra_log ml
      LEFT JOIN check_point cp ON ml.check_point_id = cp.id
      LEFT JOIN status_muestra sm ON ml.status_muestra_id = sm.id
      LEFT JOIN usuario u ON ml.usuario_id = u.id
      WHERE ml.muestra_id = $1
      ORDER BY ml.realizado DESC
    `, [req.params.id])
    res.json(rows)
  } catch (err) {
    console.error('GET /trazabilidad/muestra/:id/logs error:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ── GET /orden/:ordenId/muestras — All samples for an order with their status ── */
router.get('/orden/:ordenId/muestras', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT mu.id, mu.barcode, mu.cantidad, mu.muestra_recibida,
             mu.fecha_muestra_recibida, mu.fecha_toma_muestra,
             sm.codigo AS status_codigo, sm.status AS status_nombre,
             tm.tipo AS tipo_muestra,
             tc.tipo AS contenedor, tc.abreviacion AS contenedor_abrev, tc.color AS contenedor_color,
             ttm.nombre AS tiempo_toma
      FROM muestra mu
      LEFT JOIN status_muestra sm ON mu.status_muestra_id = sm.id
      LEFT JOIN tipo_muestra tm ON mu.tipo_muestra_id = tm.id
      LEFT JOIN tipo_contenedor tc ON mu.tipo_contenedor_id = tc.id
      LEFT JOIN tiempo_toma_muestra ttm ON mu.correlativo = ttm.id
      WHERE mu.orden_id = $1
      ORDER BY mu.id
    `, [req.params.ordenId])
    res.json(rows)
  } catch (err) {
    console.error('GET /trazabilidad/orden/:ordenId/muestras error:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ── A1. GET /checkpoints/:id — Checkpoint detail ── */
router.get('/checkpoints/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT cp.id, cp.ip, cp.descripcion, cp.comentario,
             cp.entrada_lab, cp.muestra_recibida, cp.orden,
             cp.ingreso_automatico_lista_trabajo,
             cp.reporte, cp.envio_estructura_orden,
             cp.codigo_local_storage,
             cp.departamento_laboratorio_id,
             cp.centro_atencion_paciente_id,
             cp.mesa_trabajo_microbiologia_id,
             sm.id AS status_muestra_id, sm.status AS status_nombre, sm.codigo AS status_codigo,
             dl.nombre_dpto AS departamento_nombre,
             cap.nombre AS cap_nombre
      FROM check_point cp
      LEFT JOIN status_muestra sm ON cp.status_muestra_id = sm.id
      LEFT JOIN departamento_laboratorio dl ON cp.departamento_laboratorio_id = dl.id
      LEFT JOIN centro_atencion_paciente cap ON cp.centro_atencion_paciente_id = cap.id
      WHERE cp.id = $1
    `, [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Checkpoint no encontrado' })
    res.json(rows[0])
  } catch (err) {
    console.error('GET /trazabilidad/checkpoints/:id error:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ── A2. POST /checkpoints — Create checkpoint (admin) ── */
router.post('/checkpoints', async (req, res) => {
  const { ip, descripcion, comentario, status_muestra_id, entrada_lab, muestra_recibida,
          orden, ingreso_automatico_lista_trabajo, reporte, envio_estructura_orden,
          codigo_local_storage, departamento_laboratorio_id, centro_atencion_paciente_id,
          mesa_trabajo_microbiologia_id } = req.body
  if (!descripcion || !descripcion.trim()) {
    return res.status(400).json({ error: 'Descripcion es requerida' })
  }
  try {
    const { rows } = await pool.query(`
      INSERT INTO check_point (ip, descripcion, comentario, status_muestra_id, entrada_lab,
        muestra_recibida, orden, ingreso_automatico_lista_trabajo, reporte, envio_estructura_orden,
        codigo_local_storage, departamento_laboratorio_id, centro_atencion_paciente_id,
        mesa_trabajo_microbiologia_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING id
    `, [ip || null, descripcion.trim(), comentario || null, status_muestra_id || null,
        entrada_lab || false, muestra_recibida || false, orden || null,
        ingreso_automatico_lista_trabajo || false, reporte || false,
        envio_estructura_orden || false, codigo_local_storage || null,
        departamento_laboratorio_id || null, centro_atencion_paciente_id || null,
        mesa_trabajo_microbiologia_id || null])
    res.status(201).json({ id: rows[0].id, ok: true })
  } catch (err) {
    console.error('POST /trazabilidad/checkpoints error:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ── A3. PUT /checkpoints/:id — Update checkpoint ── */
router.put('/checkpoints/:id', async (req, res) => {
  const { ip, descripcion, comentario, status_muestra_id, entrada_lab, muestra_recibida,
          orden, ingreso_automatico_lista_trabajo, reporte, envio_estructura_orden,
          codigo_local_storage, departamento_laboratorio_id, centro_atencion_paciente_id,
          mesa_trabajo_microbiologia_id } = req.body
  try {
    const { rowCount } = await pool.query(`
      UPDATE check_point SET
        ip = $1, descripcion = $2, comentario = $3, status_muestra_id = $4,
        entrada_lab = $5, muestra_recibida = $6, orden = $7,
        ingreso_automatico_lista_trabajo = $8, reporte = $9,
        envio_estructura_orden = $10, codigo_local_storage = $11,
        departamento_laboratorio_id = $12, centro_atencion_paciente_id = $13,
        mesa_trabajo_microbiologia_id = $14
      WHERE id = $15
    `, [ip || null, descripcion, comentario || null, status_muestra_id || null,
        entrada_lab || false, muestra_recibida || false, orden || null,
        ingreso_automatico_lista_trabajo || false, reporte || false,
        envio_estructura_orden || false, codigo_local_storage || null,
        departamento_laboratorio_id || null, centro_atencion_paciente_id || null,
        mesa_trabajo_microbiologia_id || null, req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Checkpoint no encontrado' })
    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /trazabilidad/checkpoints/:id error:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ── A4. DELETE /checkpoints/:id — Delete (only if no logs) ── */
router.delete('/checkpoints/:id', async (req, res) => {
  try {
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM muestra_log WHERE check_point_id = $1`,
      [req.params.id]
    )
    if (countRows[0].count > 0) {
      return res.status(409).json({ error: `No se puede eliminar: tiene ${countRows[0].count} registros de auditoria` })
    }
    const { rowCount } = await pool.query(`DELETE FROM check_point WHERE id = $1`, [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Checkpoint no encontrado' })
    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /trazabilidad/checkpoints/:id error:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ── A5. GET /catalogos/departamentos ── */
router.get('/catalogos/departamentos', async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT id, nombre_dpto AS nombre FROM departamento_laboratorio ORDER BY nombre_dpto`)
    res.json(rows)
  } catch (err) {
    console.error('GET /trazabilidad/catalogos/departamentos error:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ── A6. GET /catalogos/caps ── */
router.get('/catalogos/caps', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, nombre, codigo FROM centro_atencion_paciente
      WHERE activo = true ORDER BY nombre
    `)
    res.json(rows)
  } catch (err) {
    console.error('GET /trazabilidad/catalogos/caps error:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ── A8. GET /muestra/barcode/:barcode/trazabilidad ── */
router.get('/muestra/barcode/:barcode/trazabilidad', async (req, res) => {
  try {
    const { rows: muestras } = await pool.query(`
      SELECT mu.id, mu.barcode, mu.orden_id, mu.cantidad,
             mu.muestra_recibida, mu.fecha_muestra_recibida,
             sm.codigo AS status_codigo, sm.status AS status_nombre,
             ot.numero AS orden_numero,
             tm.tipo AS tipo_muestra, tc.tipo AS contenedor,
             tc.abreviacion AS contenedor_abrev, tc.color AS contenedor_color,
             p.nombre AS paciente_nombre, p.apellido AS paciente_apellido,
             p.ci_paciente
      FROM muestra mu
      LEFT JOIN status_muestra sm ON mu.status_muestra_id = sm.id
      LEFT JOIN orden_trabajo ot ON mu.orden_id = ot.id
      LEFT JOIN paciente p ON ot.paciente_id = p.id
      LEFT JOIN tipo_muestra tm ON mu.tipo_muestra_id = tm.id
      LEFT JOIN tipo_contenedor tc ON mu.tipo_contenedor_id = tc.id
      WHERE mu.barcode = $1
    `, [req.params.barcode])
    if (muestras.length === 0) return res.status(404).json({ error: 'Muestra no encontrada' })
    const muestra = muestras[0]
    const { rows: logs } = await pool.query(`
      SELECT ml.id, ml.accion, ml.realizado,
             cp.descripcion AS checkpoint, cp.ip AS checkpoint_ip,
             sm.codigo AS status_codigo, sm.status AS status_nombre,
             u.nombre || ' ' || u.apellido AS usuario
      FROM muestra_log ml
      LEFT JOIN check_point cp ON ml.check_point_id = cp.id
      LEFT JOIN status_muestra sm ON ml.status_muestra_id = sm.id
      LEFT JOIN usuario u ON ml.usuario_id = u.id
      WHERE ml.muestra_id = $1
      ORDER BY ml.realizado DESC
    `, [muestra.id])
    res.json({ muestra, logs })
  } catch (err) {
    console.error('GET /trazabilidad/muestra/barcode/:barcode/trazabilidad error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
