import { Router } from 'express'
import pool from '../db.js'

const router = Router()

// GET /api/medicos?q=texto — búsqueda autocomplete
router.get('/', async (req, res) => {
  try {
    const { q = '' } = req.query
    if (q.length < 2) return res.json([])
    const result = await pool.query(
      `SELECT id, nombre, apellido_paterno, apellido_materno, email, telefono, celular, activo
       FROM medico
       WHERE (nombre ILIKE $1
              OR apellido_paterno ILIKE $1
              OR apellido_materno ILIKE $1
              OR CONCAT(nombre,' ',COALESCE(apellido_paterno,''),' ',COALESCE(apellido_materno,'')) ILIKE $1)
       ORDER BY activo DESC, nombre
       LIMIT 20`,
      [`%${q}%`]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/medicos — crear médico nuevo
router.post('/', async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, email, telefono } = req.body
    if (!nombre?.trim()) return res.status(400).json({ error: 'Nombre requerido' })
    const result = await pool.query(
      `INSERT INTO medico (nombre, apellido_paterno, apellido_materno, email, telefono, activo, validado)
       VALUES ($1, $2, $3, $4, $5, true, false)
       RETURNING id, nombre, apellido_paterno, apellido_materno, email, telefono`,
      [nombre.trim(), apellido_paterno?.trim() || null, apellido_materno?.trim() || null,
       email?.trim() || null, telefono?.trim() || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
