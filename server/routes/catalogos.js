import { Router } from 'express'
import pool from '../db.js'

const router = Router()

// GET /api/procedencias
router.get('/procedencias', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre FROM procedencia WHERE activo = true ORDER BY nombre`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/areas
router.get('/areas', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, area AS nombre, codigo FROM area WHERE activa = true ORDER BY area`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/usuarios
router.get('/usuarios', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre || ' ' || apellido AS nombre FROM usuario WHERE activo = true ORDER BY nombre`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/servicios-medicos
router.get('/servicios-medicos', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre FROM servicio_medico WHERE nombre IS NOT NULL AND nombre != '' ORDER BY nombre`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/pruebas?q=texto — búsqueda tipo autocomplete
router.get('/pruebas', async (req, res) => {
  try {
    const { q = '', area } = req.query
    if (q.length < 2) return res.json([])

    const params = [`%${q}%`]
    let areaFilter = ''
    if (area) {
      const areaIds = area.split(',').map(id => parseInt(id))
      params.push(areaIds)
      areaFilter = `AND p.area_id = ANY($${params.length})`
    }

    const result = await pool.query(
      `SELECT p.id, p.nombre, a.area AS area_nombre
       FROM prueba p
       LEFT JOIN area a ON p.area_id = a.id
       WHERE p.activa = true AND p.nombre ILIKE $1 ${areaFilter}
       ORDER BY p.nombre
       LIMIT 20`,
      params
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/laboratorio — configuración del laboratorio
router.get('/laboratorio', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, direccion, rif,
              preview_orden_trabajo, reporte_resultados, reporte_ordenes,
              impresion_etiquetas, tipo_factura, resultados, resultados_lista,
              formato_decimal_resultados, raw_print,
              ot_list_barcode, ot_list_imprimir, ot_list_facturar,
              ot_list_procedencia, ot_list_servicio_medico,
              ot_list_num_ingreso, ot_list_habitacion, ot_list_num_historia,
              ot_list_ci_paciente,
              show_stat, show_send_mail,
              resultados_adjuntos, documentos_adjuntos_ordentrabajo,
              documentos_preanaliticos, peso_y_estatura_orden_trabajo
       FROM laboratorio LIMIT 1`
    )
    res.json(result.rows[0] || {})
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/razas — Catálogo de razas de paciente
router.get('/razas', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, raza AS nombre, codigo, orden
       FROM paciente_raza
       ORDER BY orden, raza`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/saludos — Catálogo de saludos de paciente
router.get('/saludos', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, abreviacion, codigo
       FROM paciente_saludo
       ORDER BY nombre`
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
