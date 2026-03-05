import { Router } from 'express'
import { existsSync, readFileSync } from 'fs'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  readJSON, writeJSON, listJSON, nextId,
  getDataDir, getRunPath, getSuitePath, getBugPath, getSessionPath, getNotifPath
} from './qa-store.js'
import { verifyToken, COOKIE_NAME } from '../auth.js'
import { addClient, pushToUser } from './qa-sse.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = Router()

// Multer for mobile screenshots
const mobileScreenshots = multer({
  storage: multer.diskStorage({
    destination: path.join(getDataDir(), 'screenshots'),
    filename: (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
      cb(null, unique + path.extname(file.originalname || '.jpg'))
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
})

// Multer for voice transcription
const audioUploadPublic = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// ─── PUBLIC MOBILE SESSION ENDPOINTS (NO AUTH REQUIRED) ─────

// GET session by token — validates and returns run+suite data
router.get('/sessions/:token', async (req, res) => {
  try {
    const p = getSessionPath(req.params.token)
    if (!existsSync(p)) return res.status(404).json({ error: 'Sesión no encontrada' })
    const session = await readJSON(p)

    if (!session.active || new Date(session.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Sesión expirada' })
    }

    const runPath = getRunPath(session.runId)
    if (!existsSync(runPath)) return res.status(404).json({ error: 'Run no encontrado' })
    const run = await readJSON(runPath)
    const suitePath = getSuitePath(run.suiteId)
    const suite = existsSync(suitePath) ? await readJSON(suitePath) : null
    const allBugs = await listJSON('bugs')
    const runBugs = allBugs.filter(b => b.runId === run.id)

    res.json({ session, run: { ...run, suite, bugs: runBugs } })
  } catch (err) {
    console.error('QA session detail error:', err)
    res.status(500).json({ error: 'Error cargando sesión' })
  }
})

// PUT save test result from mobile
router.put('/sessions/:token/result', async (req, res) => {
  try {
    const p = getSessionPath(req.params.token)
    if (!existsSync(p)) return res.status(404).json({ error: 'Sesión no encontrada' })
    const session = await readJSON(p)
    if (!session.active || new Date(session.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Sesión expirada' })
    }

    const runPath = getRunPath(session.runId)
    const run = await readJSON(runPath)
    const { results } = req.body

    for (const [caseId, data] of Object.entries(results)) {
      if (run.results[caseId] !== undefined) {
        run.results[caseId] = {
          resultado: data.resultado,
          observaciones: data.observaciones || '',
          testedAt: data.resultado ? new Date().toISOString() : null,
        }
      }
    }

    const total = Object.keys(run.results).length
    const done = Object.values(run.results).filter(r => r.resultado !== null).length
    run.progreso = total > 0 ? Math.round((done / total) * 100) : 0

    await writeJSON(runPath, run)
    res.json({ progreso: run.progreso, results: run.results })
  } catch (err) {
    console.error('QA session result error:', err)
    res.status(500).json({ error: 'Error guardando resultado' })
  }
})

// POST report bug from mobile
router.post('/sessions/:token/bug', async (req, res) => {
  try {
    const p = getSessionPath(req.params.token)
    if (!existsSync(p)) return res.status(404).json({ error: 'Sesión no encontrada' })
    const session = await readJSON(p)
    if (!session.active || new Date(session.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Sesión expirada' })
    }

    const id = await nextId('bugs')
    const {
      testCaseId, titulo, descripcion, comportamientoActual,
      comportamientoEsperado, pasosReproducir, severidad,
      tipoError, dondeOcurre, zonaPantalla, browserInfo,
    } = req.body

    const bug = {
      id,
      runId: session.runId,
      testCaseId: testCaseId || null,
      titulo: titulo || 'Bug desde móvil',
      descripcion: descripcion || '',
      comportamientoEsperado: comportamientoEsperado || '',
      comportamientoActual: comportamientoActual || '',
      pasosReproducir: pasosReproducir || '',
      severidad: severidad || 'mayor',
      estado: 'abierto',
      screenshots: [],
      logs: '',
      browserInfo: browserInfo || '',
      tipoError: tipoError || 'funcionalidad',
      codigoError: '',
      dondeOcurre: dondeOcurre || '',
      queEsperabas: '',
      contextoExtra: 'Reportado desde móvil',
      brandTokens: [],
      zonaPantalla: zonaPantalla || '',
      reportadoPor: { id: session.userId, nombre: session.userName },
      asignadoA: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await writeJSON(getBugPath(id), bug)
    res.status(201).json(bug)
  } catch (err) {
    console.error('QA mobile bug error:', err)
    res.status(500).json({ error: 'Error creando bug' })
  }
})

// ─── VOICE TRANSCRIPTION (public, for mobile) ──────────
router.post('/transcribe', audioUploadPublic.single('audio'), async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
    if (!req.file) return res.status(400).json({ error: 'No audio file' })

    const audioBase64 = req.file.buffer.toString('base64')
    let mimeType = req.file.mimetype
    if (!mimeType || mimeType === 'application/octet-stream') {
      const origName = req.file.originalname || ''
      if (origName.endsWith('.mp4')) mimeType = 'audio/mp4'
      else if (origName.endsWith('.ogg')) mimeType = 'audio/ogg'
      else mimeType = 'audio/webm'
    }
    console.log(`[Transcribe-public] file: ${req.file.originalname}, size: ${req.file.size}, mime: ${mimeType}`)

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType, data: audioBase64 } },
              { text: 'Transcribe this audio exactly as spoken. If it is in Spanish, keep it in Spanish. Only output the transcription, nothing else. No quotes, no labels.' }
            ]
          }]
        })
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('Gemini API error:', errText)
      return res.status(500).json({ error: 'Error de transcripción' })
    }

    const data = await geminiRes.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log(`[Transcribe-public] result: "${text.trim().substring(0, 100)}"`)
    res.json({ text: text.trim() })
  } catch (err) {
    console.error('Transcription error:', err)
    res.status(500).json({ error: 'Error transcribiendo audio' })
  }
})

// ─── MOBILE SCREENSHOT UPLOAD (session-validated) ───────
router.post('/sessions/:token/screenshots', mobileScreenshots.array('screenshots', 5), async (req, res) => {
  try {
    const sp = getSessionPath(req.params.token)
    if (!existsSync(sp)) return res.status(404).json({ error: 'Sesión no encontrada' })
    const session = await readJSON(sp)
    if (!session.active || new Date(session.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Sesión expirada' })
    }

    const { bugId } = req.body
    if (!bugId) return res.status(400).json({ error: 'bugId requerido' })

    const bp = getBugPath(parseInt(bugId))
    if (!existsSync(bp)) return res.status(404).json({ error: 'Bug no encontrado' })
    const bug = await readJSON(bp)

    const newFiles = req.files.map(f => f.filename)
    bug.screenshots = [...(bug.screenshots || []), ...newFiles]
    bug.updatedAt = new Date().toISOString()

    await writeJSON(bp, bug)
    res.json({ screenshots: bug.screenshots })
  } catch (err) {
    console.error('QA mobile screenshot error:', err)
    res.status(500).json({ error: 'Error subiendo foto' })
  }
})

// ─── SSE STREAM (dual auth: cookie OR token) ────────────
router.get('/sse/stream', (req, res) => {
  let userId = null

  // Try JWT cookie first
  const cookie = req.cookies?.[COOKIE_NAME]
  if (cookie) {
    try {
      const user = verifyToken(cookie)
      userId = user.userId
    } catch { /* invalid cookie, try token */ }
  }

  // Try session token query param
  if (!userId && req.query.token) {
    const sp = getSessionPath(req.query.token)
    if (existsSync(sp)) {
      try {
        const session = JSON.parse(readFileSync(sp, 'utf-8'))
        if (session.active && new Date(session.expiresAt) > new Date()) {
          userId = session.userId
        }
      } catch { /* invalid session */ }
    }
  }

  if (!userId) return res.status(401).json({ error: 'No autenticado' })

  addClient(userId, res)
})

// ─── MOBILE COMMENT ON BUG ──────────────────────────────
router.post('/sessions/:token/bugs/:bugId/comments', async (req, res) => {
  try {
    const sp = getSessionPath(req.params.token)
    if (!existsSync(sp)) return res.status(404).json({ error: 'Sesión no encontrada' })
    const session = await readJSON(sp)
    if (!session.active || new Date(session.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Sesión expirada' })
    }

    const bp = getBugPath(parseInt(req.params.bugId))
    if (!existsSync(bp)) return res.status(404).json({ error: 'Bug no encontrado' })
    const bug = await readJSON(bp)

    const comment = {
      id: `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: session.userId,
      userName: session.userName,
      text: req.body.text || '',
      createdAt: new Date().toISOString(),
    }

    if (!bug.comments) bug.comments = []
    bug.comments.push(comment)
    bug.updatedAt = new Date().toISOString()
    await writeJSON(bp, bug)

    // Push comment event for real-time thread updates
    const commentPayload = { ...comment, bugId: bug.id }
    if (bug.reportadoPor?.id && bug.reportadoPor.id !== session.userId) {
      pushToUser(bug.reportadoPor.id, 'comment', commentPayload)
    }
    if (bug.asignadoA?.id && bug.asignadoA.id !== session.userId) {
      pushToUser(bug.asignadoA.id, 'comment', commentPayload)
    }

    // Notify the other party (creates persistent notification)
    const isReporter = session.userId === bug.reportadoPor?.id
    const notifyUser = isReporter ? bug.asignadoA : bug.reportadoPor
    if (notifyUser?.id) {
      const notifId = await nextId('notifications')
      const notif = {
        id: notifId, type: 'new_comment', bugId: bug.id, bugTitle: bug.titulo,
        fromUser: { id: session.userId, nombre: session.userName },
        toUser: notifyUser,
        message: `Nuevo comentario en Bug #${bug.id}`,
        taunt: null, read: false, createdAt: new Date().toISOString(),
      }
      await writeJSON(getNotifPath(notifId), notif)
      pushToUser(notifyUser.id, 'notification', notif)
    }

    res.status(201).json(comment)
  } catch (err) {
    console.error('QA mobile comment error:', err)
    res.status(500).json({ error: 'Error agregando comentario' })
  }
})

export default router
