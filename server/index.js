import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import authRouter from './routes/auth.js'
import { requireAuth } from './auth.js'
import ordenesRouter from './routes/ordenes.js'
import catalogosRouter from './routes/catalogos.js'
import medicosRouter from './routes/medicos.js'
import pacientesRouter from './routes/pacientes.js'
import otEditRouter from './routes/ot-edit.js'
import validacionRouter from './routes/validacion.js'
import devRouter from './routes/dev.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true, credentials: true }))
app.use(cookieParser())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/dev', devRouter)
app.use('/api/auth', authRouter)
app.use('/api/ordenes', requireAuth, ordenesRouter)
app.use('/api/ot', requireAuth, otEditRouter)
app.use('/api/validacion', requireAuth, validacionRouter)
app.use('/api/medicos', requireAuth, medicosRouter)
app.use('/api/pacientes', requireAuth, pacientesRouter)
app.use('/api', requireAuth, catalogosRouter)

app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`)
})
