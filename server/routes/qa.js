import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import pool from '../db.js'
import crypto from 'crypto'
import {
  ensureDirs, readJSON, writeJSON, listJSON, nextId,
  getDataDir, getSuitePath, getRunPath, getBugPath,
  getAssignmentsPath, getNotifPath, getSessionPath
} from './qa-store.js'
import { pushToUser } from './qa-sse.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = Router()

// ─── GAMIFICATION: Dev taunts for resolved bugs ─────
const DEV_TAUNTS = [
  'Fue demasiado fácil. Manda algo más difícil',
  'Arreglado. Ni me costó trabajo',
  'Listo. Intenta romperlo otra vez',
  'Bug aplastado. Siguiente!',
  'Eso ya era. Vuelve a probar',
  'Un bug menos en el mundo',
  'Fixed in 5 min. Busca mejor',
  'Ni sudé. Manda el que sigue',
]
const randomTaunt = () => DEV_TAUNTS[Math.floor(Math.random() * DEV_TAUNTS.length)]

// ─── NOTIFICATION HELPER ─────────────────────────────────
async function createNotification({ type, bugId, bugTitle, fromUser, toUser, message, taunt }) {
  if (!toUser?.id) return null
  const notifId = await nextId('notifications')
  const notif = {
    id: notifId, type, bugId, bugTitle, fromUser, toUser,
    message, taunt: taunt || null,
    read: false, createdAt: new Date().toISOString(),
  }
  await writeJSON(getNotifPath(notifId), notif)
  pushToUser(toUser.id, 'notification', notif)
  return notif
}

// Ensure data dirs exist on import
ensureDirs()

// Multer config for screenshots
const storage = multer.diskStorage({
  destination: path.join(getDataDir(), 'screenshots'),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `qa-${unique}${path.extname(file.originalname)}`)
  }
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.mimetype)
    cb(null, ok)
  }
})

// ─── DASHBOARD ───────────────────────────────────────────
router.get('/dashboard', async (_req, res) => {
  try {
    const suites = await listJSON('suites')
    const runs = await listJSON('runs')
    const bugs = await listJSON('bugs')

    const activeRuns = runs.filter(r => r.estado === 'en_progreso').length
    const openBugs = bugs.filter(b => b.estado === 'abierto' || b.estado === 'en_progreso').length
    const avgProgress = runs.length
      ? Math.round(runs.reduce((s, r) => s + (r.progreso || 0), 0) / runs.length)
      : 0

    // Recent runs (last 10, sorted by startedAt desc)
    const recentRuns = runs
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
      .slice(0, 10)

    // Recent bugs (last 10, sorted by createdAt desc)
    const recentBugs = bugs
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)

    // Bug counts by severity
    const bugsBySeverity = {
      blocker: bugs.filter(b => b.severidad === 'blocker' && b.estado !== 'cerrado').length,
      critico: bugs.filter(b => b.severidad === 'critico' && b.estado !== 'cerrado').length,
      mayor: bugs.filter(b => b.severidad === 'mayor' && b.estado !== 'cerrado').length,
      menor: bugs.filter(b => b.severidad === 'menor' && b.estado !== 'cerrado').length,
    }

    res.json({
      totalSuites: suites.length,
      totalCases: suites.reduce((s, suite) => s + (suite.cases?.length || 0), 0),
      activeRuns,
      totalRuns: runs.length,
      openBugs,
      totalBugs: bugs.length,
      avgProgress,
      bugsBySeverity,
      recentRuns,
      recentBugs,
    })
  } catch (err) {
    console.error('QA dashboard error:', err)
    res.status(500).json({ error: 'Error cargando dashboard' })
  }
})

// ─── SUITES ──────────────────────────────────────────────
router.get('/suites', async (_req, res) => {
  try {
    const suites = await listJSON('suites')
    const runs = await listJSON('runs')

    const result = suites.map(s => {
      const suiteRuns = runs.filter(r => r.suiteId === s.id)
      const lastRun = suiteRuns.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0]
      return {
        id: s.id,
        nombre: s.nombre,
        modulo: s.modulo,
        descripcion: s.descripcion,
        version: s.version,
        totalCases: s.cases?.length || 0,
        lastRun: lastRun ? {
          id: lastRun.id,
          estado: lastRun.estado,
          progreso: lastRun.progreso,
          tester: lastRun.tester,
          startedAt: lastRun.startedAt,
        } : null,
      }
    })

    res.json(result)
  } catch (err) {
    console.error('QA suites error:', err)
    res.status(500).json({ error: 'Error listando suites' })
  }
})

router.get('/suites/:id', async (req, res) => {
  try {
    const p = getSuitePath(req.params.id)
    if (!existsSync(p)) return res.status(404).json({ error: 'Suite no encontrada' })
    const suite = await readJSON(p)
    res.json(suite)
  } catch (err) {
    console.error('QA suite detail error:', err)
    res.status(500).json({ error: 'Error cargando suite' })
  }
})

// ─── RUNS ────────────────────────────────────────────────
router.post('/runs', async (req, res) => {
  try {
    const { suiteId } = req.body
    const suitePath = getSuitePath(suiteId)
    if (!existsSync(suitePath)) return res.status(404).json({ error: 'Suite no encontrada' })

    const suite = await readJSON(suitePath)
    const id = await nextId('runs')

    // Pre-populate results with null for each case
    const results = {}
    for (const c of suite.cases) {
      results[c.id] = { resultado: null, observaciones: '', testedAt: null }
    }

    const run = {
      id,
      suiteId: suite.id,
      suiteName: suite.nombre,
      tester: { id: req.user.userId, nombre: `${req.user.nombre} ${req.user.apellido}` },
      estado: 'en_progreso',
      progreso: 0,
      notas: '',
      startedAt: new Date().toISOString(),
      completedAt: null,
      results,
    }

    await writeJSON(getRunPath(id), run)
    res.status(201).json(run)
  } catch (err) {
    console.error('QA create run error:', err)
    res.status(500).json({ error: 'Error creando run' })
  }
})

router.get('/runs', async (req, res) => {
  try {
    const runs = await listJSON('runs')
    const { estado, usuario_id, suite_id } = req.query

    let filtered = runs
    if (estado) filtered = filtered.filter(r => r.estado === estado)
    if (usuario_id) filtered = filtered.filter(r => r.tester?.id === parseInt(usuario_id))
    if (suite_id) filtered = filtered.filter(r => r.suiteId === suite_id)

    // Sort by startedAt desc
    filtered.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))

    res.json(filtered)
  } catch (err) {
    console.error('QA list runs error:', err)
    res.status(500).json({ error: 'Error listando runs' })
  }
})

router.get('/runs/:id', async (req, res) => {
  try {
    const p = getRunPath(parseInt(req.params.id))
    if (!existsSync(p)) return res.status(404).json({ error: 'Run no encontrado' })

    const run = await readJSON(p)

    // Also load the suite for test case details
    const suitePath = getSuitePath(run.suiteId)
    const suite = existsSync(suitePath) ? await readJSON(suitePath) : null

    // Load bugs linked to this run
    const allBugs = await listJSON('bugs')
    const runBugs = allBugs.filter(b => b.runId === run.id)

    res.json({ ...run, suite, bugs: runBugs })
  } catch (err) {
    console.error('QA run detail error:', err)
    res.status(500).json({ error: 'Error cargando run' })
  }
})

router.put('/runs/:id', async (req, res) => {
  try {
    const p = getRunPath(parseInt(req.params.id))
    if (!existsSync(p)) return res.status(404).json({ error: 'Run no encontrado' })

    const run = await readJSON(p)
    const { estado, notas } = req.body

    if (estado) run.estado = estado
    if (notas !== undefined) run.notas = notas
    if (estado === 'completado') run.completedAt = new Date().toISOString()

    await writeJSON(p, run)
    res.json(run)
  } catch (err) {
    console.error('QA update run error:', err)
    res.status(500).json({ error: 'Error actualizando run' })
  }
})

router.put('/runs/:id/results', async (req, res) => {
  try {
    const p = getRunPath(parseInt(req.params.id))
    if (!existsSync(p)) return res.status(404).json({ error: 'Run no encontrado' })

    const run = await readJSON(p)
    const { results } = req.body // { "pac-01": { resultado: "pass", observaciones: "ok" }, ... }

    // Merge results
    for (const [caseId, data] of Object.entries(results)) {
      if (run.results[caseId] !== undefined) {
        run.results[caseId] = {
          resultado: data.resultado,
          observaciones: data.observaciones || '',
          testedAt: data.resultado ? new Date().toISOString() : null,
        }
      }
    }

    // Recalculate progress
    const total = Object.keys(run.results).length
    const done = Object.values(run.results).filter(r => r.resultado !== null).length
    run.progreso = total > 0 ? Math.round((done / total) * 100) : 0

    await writeJSON(p, run)
    res.json({ progreso: run.progreso, results: run.results })
  } catch (err) {
    console.error('QA update results error:', err)
    res.status(500).json({ error: 'Error guardando resultados' })
  }
})

// ─── BUGS ────────────────────────────────────────────────
router.post('/bugs', async (req, res) => {
  try {
    const id = await nextId('bugs')
    const {
      runId, testCaseId, titulo, descripcion,
      comportamientoEsperado, comportamientoActual,
      pasosReproducir, severidad, logs, browserInfo,
      tipoError, codigoError, dondeOcurre, queEsperabas, contextoExtra,
      brandTokens, zonaPantalla,
    } = req.body

    const bug = {
      id,
      runId: runId || null,
      testCaseId: testCaseId || null,
      titulo,
      descripcion: descripcion || '',
      comportamientoEsperado: comportamientoEsperado || '',
      comportamientoActual: comportamientoActual || '',
      pasosReproducir: pasosReproducir || '',
      severidad: severidad || 'mayor',
      estado: 'abierto',
      screenshots: [],
      logs: logs || '',
      browserInfo: browserInfo || '',
      tipoError: tipoError || '',
      codigoError: codigoError || '',
      dondeOcurre: dondeOcurre || '',
      queEsperabas: queEsperabas || '',
      contextoExtra: contextoExtra || '',
      brandTokens: brandTokens || [],
      zonaPantalla: zonaPantalla || '',
      reportadoPor: { id: req.user.userId, nombre: `${req.user.nombre} ${req.user.apellido}` },
      asignadoA: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await writeJSON(getBugPath(id), bug)
    res.status(201).json(bug)
  } catch (err) {
    console.error('QA create bug error:', err)
    res.status(500).json({ error: 'Error creando bug' })
  }
})

router.get('/bugs', async (_req, res) => {
  try {
    const bugs = await listJSON('bugs')
    bugs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    res.json(bugs)
  } catch (err) {
    console.error('QA list bugs error:', err)
    res.status(500).json({ error: 'Error listando bugs' })
  }
})

// ─── MY BUGS (must be before /bugs/:id) ─────────────────
router.get('/bugs/mine', async (req, res) => {
  try {
    const userId = req.user?.userId
    const bugs = await listJSON('bugs')

    const reported = bugs.filter(b => b.reportadoPor?.id === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    const assigned = bugs.filter(b => b.asignadoA?.id === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    res.json({
      reported,
      assigned,
      quickFilters: {
        pendingMyAction: assigned.filter(b => b.estado === 'abierto').length,
        waitingOnDev: reported.filter(b => b.estado === 'abierto' && b.asignadoA).length,
        resolvedPendingVerification: reported.filter(b => b.estado === 'resuelto').length,
        inProgress: [...new Map([...reported, ...assigned]
          .filter(b => b.estado === 'en_progreso')
          .map(b => [b.id, b])).values()].length,
      }
    })
  } catch (err) {
    console.error('QA my bugs error:', err)
    res.status(500).json({ error: 'Error cargando mis bugs' })
  }
})

router.get('/bugs/:id', async (req, res) => {
  try {
    const p = getBugPath(parseInt(req.params.id))
    if (!existsSync(p)) return res.status(404).json({ error: 'Bug no encontrado' })
    const bug = await readJSON(p)
    res.json(bug)
  } catch (err) {
    console.error('QA bug detail error:', err)
    res.status(500).json({ error: 'Error cargando bug' })
  }
})

// ─── PROMPT IA GENERATOR ─────────────────────────────────
const TIPO_ERROR_LABELS = {
  no_carga: 'La página no carga / pantalla en blanco',
  error_500: 'Error 500 / Error del servidor',
  error_400: 'Error 400 / Datos rechazados por el servidor',
  error_red: 'Error de red / Timeout',
  visual: 'Error visual / UI rota o desalineada',
  datos_incorrectos: 'Datos incorrectos / No guarda correctamente',
  funcionalidad: 'Funcionalidad no responde al interactuar',
  crash: 'La aplicación se congela o crashea',
  validacion: 'Validación falla o no valida cuando debería',
  permisos: 'Error de permisos / Acceso denegado',
  otro: 'Otro tipo de error',
}

router.get('/bugs/:id/prompt', async (req, res) => {
  try {
    const p = getBugPath(parseInt(req.params.id))
    if (!existsSync(p)) return res.status(404).json({ error: 'Bug no encontrado' })
    const bug = await readJSON(p)

    // Find related suite & test case
    let suite = null
    let testCase = null
    let runInfo = null

    if (bug.runId) {
      const runPath = getRunPath(bug.runId)
      if (existsSync(runPath)) {
        const run = await readJSON(runPath)
        runInfo = { suiteName: run.suiteName, suiteId: run.suiteId, tester: run.tester }
        const suitePath = getSuitePath(run.suiteId)
        if (existsSync(suitePath)) {
          suite = await readJSON(suitePath)
          if (bug.testCaseId) {
            testCase = suite.cases?.find(c => c.id === bug.testCaseId)
          }
        }
      }
    }

    // Build prompt
    const lines = []
    lines.push('# Bug Report — Prompt para IA')
    lines.push('')
    lines.push(`## BUG-${String(bug.id).padStart(3, '0')}: ${bug.titulo}`)
    lines.push(`- **Severidad:** ${bug.severidad}`)
    lines.push(`- **Estado:** ${bug.estado}`)
    lines.push(`- **Reportado por:** ${bug.reportadoPor?.nombre || 'N/A'}`)
    lines.push(`- **Fecha:** ${bug.createdAt}`)
    lines.push('')

    // Tipo de error
    if (bug.tipoError) {
      lines.push(`## Tipo de Error`)
      lines.push(TIPO_ERROR_LABELS[bug.tipoError] || bug.tipoError)
      lines.push('')
    }

    // Dónde ocurre
    if (bug.dondeOcurre) {
      lines.push(`## Dónde Ocurre`)
      lines.push(bug.dondeOcurre)
      lines.push('')
    }

    // Código de error
    if (bug.codigoError) {
      lines.push(`## Código/Mensaje de Error`)
      lines.push('```')
      lines.push(bug.codigoError)
      lines.push('```')
      lines.push('')
    }

    // Qué esperaba
    if (bug.queEsperabas) {
      lines.push(`## Qué se Esperaba`)
      lines.push(bug.queEsperabas)
      lines.push('')
    }

    // Comportamiento actual
    if (bug.comportamientoActual) {
      lines.push(`## Qué Pasó Realmente`)
      lines.push(bug.comportamientoActual)
      lines.push('')
    }

    // Comportamiento esperado (del test case)
    if (bug.comportamientoEsperado) {
      lines.push(`## Resultado Esperado (del Test Case)`)
      lines.push(bug.comportamientoEsperado)
      lines.push('')
    }

    // Pasos para reproducir
    if (bug.pasosReproducir) {
      lines.push(`## Pasos para Reproducir`)
      lines.push(bug.pasosReproducir)
      lines.push('')
    }

    // Contexto extra
    if (bug.contextoExtra) {
      lines.push(`## Contexto Adicional`)
      lines.push(bug.contextoExtra)
      lines.push('')
    }

    // Logs
    if (bug.logs) {
      lines.push(`## Logs / Console`)
      lines.push('```')
      lines.push(bug.logs)
      lines.push('```')
      lines.push('')
    }

    // Test case info
    if (testCase) {
      lines.push(`## Test Case Relacionado`)
      lines.push(`- **ID:** ${testCase.id}`)
      lines.push(`- **Sección:** ${testCase.seccion}`)
      lines.push(`- **Título:** ${testCase.titulo}`)
      lines.push(`- **Prioridad:** ${testCase.prioridad}`)
      lines.push(`- **Descripción:** ${testCase.descripcion}`)
      lines.push(`- **Pasos del test:**`)
      testCase.pasos.forEach((p, i) => lines.push(`  ${i + 1}. ${p}`))
      lines.push(`- **Resultado esperado:** ${testCase.resultado_esperado}`)
      lines.push('')
    }

    // Suite / module info
    if (suite) {
      lines.push(`## Módulo Afectado`)
      lines.push(`- **Suite:** ${suite.nombre}`)
      lines.push(`- **Módulo:** ${suite.modulo}`)
      lines.push('')

      if (suite.archivos) {
        lines.push(`## Archivos Fuente Relacionados`)
        if (suite.archivos.ruta) lines.push(`- **Ruta:** \`${suite.archivos.ruta}\``)
        if (suite.archivos.frontend?.length) {
          lines.push(`- **Frontend:**`)
          suite.archivos.frontend.forEach(f => lines.push(`  - \`${f}\``))
        }
        if (suite.archivos.backend?.length) {
          lines.push(`- **Backend:**`)
          suite.archivos.backend.forEach(f => lines.push(`  - \`${f}\``))
        }
        if (suite.archivos.api?.length) {
          lines.push(`- **API:**`)
          suite.archivos.api.forEach(f => lines.push(`  - \`${f}\``))
        }
        lines.push('')
      }
    }

    // Browser
    if (bug.browserInfo) {
      lines.push(`## Entorno`)
      lines.push(`- **Browser:** ${bug.browserInfo}`)
      lines.push('')
    }

    // Screenshots note
    if (bug.screenshots?.length) {
      lines.push(`## Screenshots`)
      lines.push(`${bug.screenshots.length} screenshot(s) adjuntos al bug report.`)
      lines.push('')
    }

    // Zona de pantalla
    if (bug.zonaPantalla) {
      lines.push(`## Zona de Pantalla Afectada`)
      lines.push(`**${bug.zonaPantalla}** — El problema ocurre específicamente en esta zona de la interfaz.`)
      lines.push('')
    }

    // Brand tokens
    if (bug.brandTokens?.length) {
      lines.push(`## Tokens del Design System Afectados`)
      lines.push(`Los siguientes tokens del Brand Manual v3 están involucrados en este bug:`)
      lines.push('')
      for (const t of bug.brandTokens) {
        lines.push(`- **\`${t.code}\`** — ${t.name} (${t.category})`)
      }
      lines.push('')
      lines.push('> **Importante:** Consulta el Brand Manual v3 para las especificaciones exactas de estos tokens.')
      lines.push('> El fix debe respetar las specs del design system.')
      lines.push('')
    }

    // Instruction for AI
    lines.push('---')
    lines.push('')
    if (bug.brandTokens?.length) {
      lines.push('**Instrucción:** Analiza este bug de diseño. Los tokens del Brand Manual listados arriba')
      lines.push('definen las especificaciones visuales correctas. Compara el estado actual del componente')
      lines.push('contra las specs del token y propón un fix CSS/JSX que restaure el diseño correcto.')
    } else {
      lines.push('**Instrucción:** Analiza este bug report y ayúdame a encontrar la causa raíz. ')
      lines.push('Revisa los archivos fuente mencionados, identifica el problema y propón un fix.')
    }
    lines.push('')

    const prompt = lines.join('\n')
    res.json({ prompt, bugId: bug.id, titulo: bug.titulo })
  } catch (err) {
    console.error('QA prompt generation error:', err)
    res.status(500).json({ error: 'Error generando prompt' })
  }
})

router.put('/bugs/:id', async (req, res) => {
  try {
    const p = getBugPath(parseInt(req.params.id))
    if (!existsSync(p)) return res.status(404).json({ error: 'Bug no encontrado' })

    const bug = await readJSON(p)
    const prevEstado = bug.estado
    const prevAsignado = bug.asignadoA?.id
    const allowed = ['titulo', 'descripcion', 'comportamientoEsperado', 'comportamientoActual',
      'pasosReproducir', 'severidad', 'estado', 'logs', 'asignadoA',
      'tipoError', 'codigoError', 'dondeOcurre', 'queEsperabas', 'contextoExtra',
      'brandTokens', 'zonaPantalla']

    for (const key of allowed) {
      if (req.body[key] !== undefined) bug[key] = req.body[key]
    }
    if (req.body.estado === 'resuelto' && prevEstado !== 'resuelto') bug.resueltoAt = new Date().toISOString()
    bug.updatedAt = new Date().toISOString()

    await writeJSON(p, bug)

    const fromUser = { id: req.user?.userId, nombre: req.user ? `${req.user.nombre} ${req.user.apellido}` : 'Sistema' }

    // ── Notification triggers ──
    try {
      // Bug assigned
      if (req.body.asignadoA?.id && req.body.asignadoA.id !== prevAsignado) {
        await createNotification({
          type: 'bug_assigned', bugId: bug.id, bugTitle: bug.titulo,
          fromUser, toUser: bug.asignadoA,
          message: `Bug #${bug.id} te fue asignado`,
        })
      }

      // Estado → en_progreso
      if (req.body.estado === 'en_progreso' && prevEstado !== 'en_progreso' && bug.reportadoPor) {
        await createNotification({
          type: 'bug_in_progress', bugId: bug.id, bugTitle: bug.titulo,
          fromUser, toUser: bug.reportadoPor,
          message: `Bug #${bug.id} — alguien lo tomó!`,
        })
      }

      // Estado → resuelto
      if (req.body.estado === 'resuelto' && prevEstado !== 'resuelto' && bug.reportadoPor) {
        await createNotification({
          type: 'bug_resolved', bugId: bug.id, bugTitle: bug.titulo,
          fromUser, toUser: bug.reportadoPor,
          message: `Bug #${bug.id} resuelto — vuelve a probar!`,
          taunt: randomTaunt(),
        })
      }

      // Estado → cerrado
      if (req.body.estado === 'cerrado' && prevEstado !== 'cerrado' && bug.asignadoA) {
        await createNotification({
          type: 'bug_closed', bugId: bug.id, bugTitle: bug.titulo,
          fromUser, toUser: bug.asignadoA,
          message: `Bug #${bug.id} cerrado — confirmado, buen trabajo!`,
        })
      }

      // Estado → no_reproducible
      if (req.body.estado === 'no_reproducible' && prevEstado !== 'no_reproducible' && bug.reportadoPor) {
        await createNotification({
          type: 'bug_no_repro', bugId: bug.id, bugTitle: bug.titulo,
          fromUser, toUser: bug.reportadoPor,
          message: `Bug #${bug.id} marcado como no reproducible`,
        })
      }
    } catch (notifErr) {
      console.error('Error creating notification:', notifErr)
    }

    res.json(bug)
  } catch (err) {
    console.error('QA update bug error:', err)
    res.status(500).json({ error: 'Error actualizando bug' })
  }
})

// ─── SCREENSHOTS ─────────────────────────────────────────
router.post('/bugs/:id/screenshots', upload.array('screenshots', 5), async (req, res) => {
  try {
    const p = getBugPath(parseInt(req.params.id))
    if (!existsSync(p)) return res.status(404).json({ error: 'Bug no encontrado' })

    const bug = await readJSON(p)
    const newFiles = req.files.map(f => f.filename)
    bug.screenshots = [...(bug.screenshots || []), ...newFiles]
    bug.updatedAt = new Date().toISOString()

    await writeJSON(p, bug)
    res.json({ screenshots: bug.screenshots })
  } catch (err) {
    console.error('QA upload error:', err)
    res.status(500).json({ error: 'Error subiendo screenshots' })
  }
})

// ─── COMMENTS ────────────────────────────────────────────
router.post('/bugs/:id/comments', async (req, res) => {
  try {
    const p = getBugPath(parseInt(req.params.id))
    if (!existsSync(p)) return res.status(404).json({ error: 'Bug no encontrado' })
    const bug = await readJSON(p)

    const comment = {
      id: `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: req.user?.userId,
      userName: req.user ? `${req.user.nombre} ${req.user.apellido}` : 'Sistema',
      text: req.body.text || '',
      createdAt: new Date().toISOString(),
    }

    if (!bug.comments) bug.comments = []
    bug.comments.push(comment)
    bug.updatedAt = new Date().toISOString()
    await writeJSON(p, bug)

    // Push comment event to all participants for real-time thread updates
    const commentPayload = { ...comment, bugId: bug.id }
    if (bug.reportadoPor?.id && bug.reportadoPor.id !== req.user?.userId) {
      pushToUser(bug.reportadoPor.id, 'comment', commentPayload)
    }
    if (bug.asignadoA?.id && bug.asignadoA.id !== req.user?.userId) {
      pushToUser(bug.asignadoA.id, 'comment', commentPayload)
    }

    // Notify the other party (creates persistent notification)
    const fromUser = { id: req.user?.userId, nombre: comment.userName }
    const isReporter = req.user?.userId === bug.reportadoPor?.id
    const notifyUser = isReporter ? bug.asignadoA : bug.reportadoPor
    if (notifyUser?.id && notifyUser.id !== req.user?.userId) {
      await createNotification({
        type: 'new_comment', bugId: bug.id, bugTitle: bug.titulo,
        fromUser, toUser: notifyUser,
        message: `Nuevo comentario en Bug #${bug.id}`,
      })
    }

    res.status(201).json(comment)
  } catch (err) {
    console.error('QA comment error:', err)
    res.status(500).json({ error: 'Error agregando comentario' })
  }
})

// ─── USERS (from labsisEG for dropdowns) ─────────────────
router.get('/users', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, nombre, apellido
      FROM usuario
      WHERE activo = true
      ORDER BY nombre, apellido
    `)
    res.json(result.rows)
  } catch (err) {
    console.error('QA users error:', err)
    res.status(500).json({ error: 'Error listando usuarios' })
  }
})

// ─── BRAND TOKENS ────────────────────────────────────────
router.get('/brand-tokens', async (_req, res) => {
  try {
    const tokensPath = path.join(getDataDir(), 'brand-tokens.json')
    const tokens = await readJSON(tokensPath)
    res.json(tokens)
  } catch (err) {
    console.error('QA brand-tokens error:', err)
    res.status(500).json({ error: 'Error cargando tokens' })
  }
})

// ─── ASSIGNMENTS ────────────────────────────────────────
router.get('/assignments', async (_req, res) => {
  try {
    const data = await readJSON(getAssignmentsPath())
    res.json(data.assignments || [])
  } catch (err) {
    console.error('QA assignments error:', err)
    res.json([])
  }
})

router.put('/assignments', async (req, res) => {
  try {
    const { assignments } = req.body
    await writeJSON(getAssignmentsPath(), { assignments: assignments || [] })
    res.json(assignments || [])
  } catch (err) {
    console.error('QA save assignments error:', err)
    res.status(500).json({ error: 'Error guardando asignaciones' })
  }
})

router.get('/assignments/me', async (req, res) => {
  try {
    const data = await readJSON(getAssignmentsPath())
    const mine = (data.assignments || []).find(a => a.userId === req.user?.userId)
    res.json(mine || null)
  } catch (err) {
    res.json(null)
  }
})

// ─── TEAM DASHBOARD ─────────────────────────────────────
router.get('/dashboard/team', async (_req, res) => {
  try {
    const assignData = await readJSON(getAssignmentsPath())
    const assignments = assignData.assignments || []
    const runs = await listJSON('runs')
    const bugs = await listJSON('bugs')

    const team = assignments.map(a => {
      const userRuns = runs.filter(r => r.tester?.id === a.userId)
      const userBugs = bugs.filter(b => b.reportadoPor?.id === a.userId)
      const activeRuns = userRuns.filter(r => r.estado === 'en_progreso')
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7)
      const bugsToday = userBugs.filter(b => new Date(b.createdAt) >= todayStart).length
      const bugsWeek = userBugs.filter(b => new Date(b.createdAt) >= weekStart).length
      const lastActive = userRuns.length > 0
        ? userRuns.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0].startedAt
        : null

      // Progress per assigned suite
      const suiteProgress = a.suiteIds.map(sId => {
        const suiteRuns = userRuns.filter(r => r.suiteId === sId)
        const lastRun = suiteRuns.sort((x, y) => new Date(y.startedAt) - new Date(x.startedAt))[0]
        return { suiteId: sId, progreso: lastRun?.progreso || 0, estado: lastRun?.estado || null }
      })

      return {
        userId: a.userId,
        userName: a.userName,
        suiteIds: a.suiteIds,
        runsCompletados: userRuns.filter(r => r.estado === 'completado').length,
        runsActivos: activeRuns.length,
        bugsReportados: userBugs.length,
        bugsToday,
        bugsWeek,
        lastActive,
        suiteProgress,
      }
    })

    // Open bugs summary by severity
    const openBugs = bugs.filter(b => b.estado !== 'cerrado' && b.estado !== 'resuelto')
    const bugsBySev = {
      blocker: openBugs.filter(b => b.severidad === 'blocker'),
      critico: openBugs.filter(b => b.severidad === 'critico'),
      mayor: openBugs.filter(b => b.severidad === 'mayor'),
      menor: openBugs.filter(b => b.severidad === 'menor'),
    }

    res.json({ team, bugsBySev, totalOpen: openBugs.length })
  } catch (err) {
    console.error('QA team dashboard error:', err)
    res.status(500).json({ error: 'Error cargando dashboard de equipo' })
  }
})

// ─── NOTIFICATIONS ──────────────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const all = await listJSON('notifications')
    const userId = req.user?.userId
    let mine = all.filter(n => n.toUser?.id === userId)
    if (req.query.unread === 'true') mine = mine.filter(n => !n.read)
    mine.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    res.json(mine)
  } catch (err) {
    console.error('QA notifications error:', err)
    res.json([])
  }
})

// IMPORTANT: read-all MUST be before :id to avoid Express matching "read-all" as :id
router.put('/notifications/read-all', async (req, res) => {
  try {
    const all = await listJSON('notifications')
    const userId = req.user?.userId
    for (const n of all) {
      if (n.toUser?.id === userId && !n.read) {
        n.read = true
        await writeJSON(getNotifPath(n.id), n)
      }
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error marcando notificaciones' })
  }
})

router.put('/notifications/:id/read', async (req, res) => {
  try {
    const p = getNotifPath(parseInt(req.params.id))
    if (!existsSync(p)) return res.status(404).json({ error: 'Notificación no encontrada' })
    const notif = await readJSON(p)
    notif.read = true
    await writeJSON(p, notif)
    res.json(notif)
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando notificación' })
  }
})

// NOTE: /transcribe lives in qa-public.js (no auth needed, supports mobile)

// ─── MOBILE SESSIONS ────────────────────────────────────
router.post('/sessions', async (req, res) => {
  try {
    const { runId } = req.body
    const runPath = getRunPath(parseInt(runId))
    if (!existsSync(runPath)) return res.status(404).json({ error: 'Run no encontrado' })

    const token = crypto.randomBytes(6).toString('hex') // 12-char token
    const expires = new Date()
    expires.setHours(expires.getHours() + 8)

    const session = {
      token,
      runId: parseInt(runId),
      userId: req.user?.userId,
      userName: req.user ? `${req.user.nombre} ${req.user.apellido}` : 'Anon',
      createdAt: new Date().toISOString(),
      expiresAt: expires.toISOString(),
      active: true,
    }

    await writeJSON(getSessionPath(token), session)
    res.status(201).json(session)
  } catch (err) {
    console.error('QA create session error:', err)
    res.status(500).json({ error: 'Error creando sesión móvil' })
  }
})

// Mobile session GET/PUT/POST endpoints moved to qa-public.js (no auth required)

export default router
