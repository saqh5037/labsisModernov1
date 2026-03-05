import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import pool from './db.js'
import authRouter from './routes/auth.js'
import { requireAuth } from './auth.js'
import ordenesRouter from './routes/ordenes.js'
import catalogosRouter from './routes/catalogos.js'
import medicosRouter from './routes/medicos.js'
import pacientesRouter from './routes/pacientes.js'
import otEditRouter from './routes/ot-edit.js'
import validacionRouter from './routes/validacion.js'
import devRouter from './routes/dev.js'
import qaRouter from './routes/qa.js'
import qaPublicRouter from './routes/qa-public.js'

// db.js already loads dotenv with the correct .env file

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true, credentials: true }))
app.use(cookieParser())
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT current_database() AS db_name')
    res.json({ ok: true, db: rows[0].db_name })
  } catch {
    res.json({ ok: false, db: null })
  }
})
app.use('/api/dev', devRouter)
app.use('/api/auth', authRouter)
app.use('/api/ordenes', requireAuth, ordenesRouter)
app.use('/api/ot', requireAuth, otEditRouter)
app.use('/api/validacion', requireAuth, validacionRouter)
app.use('/api/medicos', requireAuth, medicosRouter)
app.use('/api/pacientes', requireAuth, pacientesRouter)
app.use('/api/qa', qaPublicRouter)          // Public mobile session endpoints (no auth - MUST be before catalogos)
app.use('/api', requireAuth, catalogosRouter)
app.use('/api/qa', requireAuth, qaRouter)   // Protected QA endpoints

// Static files for QA screenshots
import { fileURLToPath } from 'url'
import path from 'path'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
app.use('/api/qa/screenshots', requireAuth, express.static(path.join(__dirname, 'data/qa/screenshots')))

// Production: serve Vite build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')))
  app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`)
})
