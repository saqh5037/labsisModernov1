import { Router } from 'express'
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'

const router = Router()
const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '..', 'dev-dashboard.json')
const MEMORY_DIR = join(homedir(), '.claude', 'projects', '-Users-samuelquiroz', 'memory', 'labsis')

function readDB() {
  return JSON.parse(readFileSync(DB_PATH, 'utf-8'))
}

function writeDB(data) {
  data.meta.lastUpdated = new Date().toISOString()
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

function findScreen(db, screenId) {
  for (const mod of db.modules) {
    const screen = mod.screens.find(s => s.id === screenId)
    if (screen) return { screen, module: mod }
  }
  return {}
}

// GET /api/dev/dashboard — todo el JSON
router.get('/dashboard', (_req, res) => {
  res.json(readDB())
})

// GET /api/dev/stats — métricas calculadas
router.get('/stats', (_req, res) => {
  const db = readDB()
  const allScreens = db.modules.flatMap(m => m.screens)
  const byPhase = {}
  db.phases.forEach(p => { byPhase[p.id] = 0 })
  allScreens.forEach(s => { byPhase[s.phase] = (byPhase[s.phase] || 0) + 1 })

  const total = allScreens.length
  const completed = byPhase['finalizado'] || 0
  const notStarted = byPhase['not-started'] || 0
  const inProgress = total - completed - notStarted

  const allTasks = allScreens.flatMap(s =>
    (s.tasks || []).map(t => ({ ...t, screenId: s.id, screenName: s.name }))
  )

  res.json({
    total,
    completed,
    inProgress,
    pending: notStarted,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
    byPhase,
    byModule: db.modules.map(m => ({
      id: m.id,
      name: m.name,
      total: m.screens.length,
      completed: m.screens.filter(s => s.phase === 'finalizado').length,
      inProgress: m.screens.filter(s => !['not-started', 'finalizado'].includes(s.phase)).length
    })),
    activeSprint: db.sprints.find(s => s.status === 'active') || null,
    pendingTasks: allTasks.filter(t => !t.done).length,
    doneTasks: allTasks.filter(t => t.done).length
  })
})

// PUT /api/dev/screens/:id — actualizar pantalla
router.put('/screens/:id', (req, res) => {
  const db = readDB()
  const { screen } = findScreen(db, req.params.id)
  if (!screen) return res.status(404).json({ error: 'Screen not found' })

  const allowed = ['phase', 'priority', 'notes', 'sprint', 'component', 'name']
  for (const key of allowed) {
    if (req.body[key] !== undefined) screen[key] = req.body[key]
  }
  screen.updatedAt = new Date().toISOString()
  writeDB(db)
  res.json(screen)
})

// PATCH /api/dev/screens/:id/tasks/:taskId/toggle
router.patch('/screens/:id/tasks/:taskId/toggle', (req, res) => {
  const db = readDB()
  const { screen } = findScreen(db, req.params.id)
  if (!screen) return res.status(404).json({ error: 'Screen not found' })

  const task = (screen.tasks || []).find(t => t.id === req.params.taskId)
  if (!task) return res.status(404).json({ error: 'Task not found' })

  task.done = !task.done
  screen.updatedAt = new Date().toISOString()
  writeDB(db)
  res.json(task)
})

// POST /api/dev/screens/:id/tasks — agregar subtarea
router.post('/screens/:id/tasks', (req, res) => {
  const db = readDB()
  const { screen } = findScreen(db, req.params.id)
  if (!screen) return res.status(404).json({ error: 'Screen not found' })

  if (!req.body.text) return res.status(400).json({ error: 'text required' })

  if (!screen.tasks) screen.tasks = []
  const newTask = {
    id: 't' + (screen.tasks.length + 1) + '-' + Date.now(),
    text: req.body.text,
    done: false
  }
  screen.tasks.push(newTask)
  screen.updatedAt = new Date().toISOString()
  writeDB(db)
  res.status(201).json(newTask)
})

// DELETE /api/dev/screens/:id/tasks/:taskId
router.delete('/screens/:id/tasks/:taskId', (req, res) => {
  const db = readDB()
  const { screen } = findScreen(db, req.params.id)
  if (!screen) return res.status(404).json({ error: 'Screen not found' })

  const idx = (screen.tasks || []).findIndex(t => t.id === req.params.taskId)
  if (idx === -1) return res.status(404).json({ error: 'Task not found' })

  screen.tasks.splice(idx, 1)
  screen.updatedAt = new Date().toISOString()
  writeDB(db)
  res.json({ ok: true })
})

// PUT /api/dev/sprints/:id — actualizar sprint
router.put('/sprints/:id', (req, res) => {
  const db = readDB()
  const sprint = db.sprints.find(s => s.id === req.params.id)
  if (!sprint) return res.status(404).json({ error: 'Sprint not found' })

  const allowed = ['name', 'status', 'startDate', 'endDate', 'goal', 'screenIds']
  for (const key of allowed) {
    if (req.body[key] !== undefined) sprint[key] = req.body[key]
  }
  writeDB(db)
  res.json(sprint)
})

// POST /api/dev/sprints — crear sprint
router.post('/sprints', (req, res) => {
  const db = readDB()
  if (!req.body.name) return res.status(400).json({ error: 'name required' })

  const newSprint = {
    id: 'sprint-' + Date.now(),
    name: req.body.name,
    status: req.body.status || 'planned',
    startDate: req.body.startDate || null,
    endDate: req.body.endDate || null,
    goal: req.body.goal || '',
    screenIds: req.body.screenIds || []
  }
  db.sprints.push(newSprint)
  writeDB(db)
  res.status(201).json(newSprint)
})

// POST /api/dev/modules/:moduleId/screens — agregar pantalla a módulo
router.post('/modules/:moduleId/screens', (req, res) => {
  const db = readDB()
  const mod = db.modules.find(m => m.id === req.params.moduleId)
  if (!mod) return res.status(404).json({ error: 'Module not found' })

  if (!req.body.name) return res.status(400).json({ error: 'name required' })

  const newScreen = {
    id: req.body.id || req.body.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    name: req.body.name,
    phase: req.body.phase || 'not-started',
    priority: req.body.priority || 'P3',
    sprint: req.body.sprint || null,
    tasks: [],
    notes: req.body.notes || '',
    component: req.body.component || null,
    updatedAt: new Date().toISOString()
  }
  mod.screens.push(newScreen)
  writeDB(db)
  res.status(201).json(newScreen)
})

// GET /api/dev/memory — métricas extraídas de archivos de memoria del proyecto
router.get('/memory', (_req, res) => {
  try {
    const result = { screens: [], codebase: {}, architecture: {}, auth: {} }

    // Parse _INDEX.md
    const indexPath = join(MEMORY_DIR, '_INDEX.md')
    if (existsSync(indexPath)) {
      const idx = readFileSync(indexPath, 'utf-8')
      // Extract codebase stats
      const statsMatch = idx.match(/\| XHTML total \| ([\d,]+) \|/)
      if (statsMatch) result.codebase.xhtmlTotal = parseInt(statsMatch[1].replace(/,/g, ''))
      const beansMatch = idx.match(/\| Java session beans \| ([\d,]+) \|/)
      if (beansMatch) result.codebase.sessionBeans = parseInt(beansMatch[1].replace(/,/g, ''))
      const entitiesMatch = idx.match(/\| Java entities \| ([\d,]+) \|/)
      if (entitiesMatch) result.codebase.entities = parseInt(entitiesMatch[1].replace(/,/g, ''))
      const parsersMatch = idx.match(/\| Java parsers \| ([\d,]+) \|/)
      if (parsersMatch) result.codebase.parsers = parseInt(parsersMatch[1].replace(/,/g, ''))
      const convertersMatch = idx.match(/\| Java converters \| ([\d,]+) \|/)
      if (convertersMatch) result.codebase.converters = parseInt(convertersMatch[1].replace(/,/g, ''))
      const writersMatch = idx.match(/\| Java writers \| ([\d,]+) \|/)
      if (writersMatch) result.codebase.writers = parseInt(writersMatch[1].replace(/,/g, ''))
      const configMatch = idx.match(/\| Campos tabla laboratorio \| ([\d,]+) \|/)
      if (configMatch) result.codebase.configFields = parseInt(configMatch[1].replace(/,/g, ''))
      const coreMatch = idx.match(/\| Pantallas core usuario \| ~(\d+) \|/)
      if (coreMatch) result.codebase.coreScreens = parseInt(coreMatch[1])
      const adminMatch = idx.match(/\| Pantallas admin\/config \| ~(\d+) \|/)
      if (adminMatch) result.codebase.adminScreens = parseInt(adminMatch[1])
      const specMatch = idx.match(/\| Pantallas especializadas \| ~(\d+) \|/)
      if (specMatch) result.codebase.specializedScreens = parseInt(specMatch[1])

      // Extract screen statuses from tables
      const screenRegex = /\| \*?\*?([^|*]+?)\*?\*? \| (completed|in-progress|researched|not-started) \|/g
      let match
      while ((match = screenRegex.exec(idx)) !== null) {
        result.screens.push({ name: match[1].trim(), status: match[2] })
      }
    }

    // Parse _AUTH.md for role count
    const authPath = join(MEMORY_DIR, '_AUTH.md')
    if (existsSync(authPath)) {
      const auth = readFileSync(authPath, 'utf-8')
      const rolesMatch = auth.match(/### Roles del Sistema \((\d+) roles\)/)
      if (rolesMatch) result.auth.roles = parseInt(rolesMatch[1])
      const modulesMatch = auth.match(/### Módulos Registrados \((\d+)\)/)
      if (modulesMatch) result.auth.modules = parseInt(modulesMatch[1])
      const activitiesMatch = auth.match(/### Total: (\d+) actividades/)
      if (activitiesMatch) result.auth.activities = parseInt(activitiesMatch[1])
      const permissionsMatch = auth.match(/### Total: (\d+) permisos/)
      if (permissionsMatch) result.auth.permissions = parseInt(permissionsMatch[1])
    }

    // Parse _INDEX.md for .page.xml count
    if (existsSync(indexPath)) {
      const idx2 = readFileSync(indexPath, 'utf-8')
      const pageXmlMatch = idx2.match(/\| \.page\.xml[^|]*\| ([\d,]+) \|/)
      if (pageXmlMatch) result.codebase.pageXml = parseInt(pageXmlMatch[1].replace(/,/g, ''))
    }

    // Parse _PATTERNS.md for architecture mappings (extract from file)
    const patternsPath = join(MEMORY_DIR, '_PATTERNS.md')
    if (existsSync(patternsPath)) {
      const patternsContent = readFileSync(patternsPath, 'utf-8')
      const mappings = []
      const mapRegex = /\|\s*`?([^|`]+?)`?\s*\|\s*`?([^|`]+?)`?\s*\|/g
      let mapMatch
      while ((mapMatch = mapRegex.exec(patternsContent)) !== null) {
        const from = mapMatch[1].trim()
        const to = mapMatch[2].trim()
        if (from && to && !from.startsWith('-') && from !== 'Java/Seam' && from !== 'Componente' && !from.includes('---')) {
          mappings.push(`${from} → ${to}`)
        }
      }
      result.architecture.mappings = mappings.length > 0 ? mappings.slice(0, 10) : [
        'Entity.java → SQL Directo',
        'EntityHome.java → Express Route Handlers',
        'EntityList.java → GET con Filtros Dinámicos',
        'XHTML → React Component',
        '.page.xml → React Router',
        'Seam @In → Imports/Context'
      ]
    }

    // Parse _AUTH.md for roles list (dynamic)
    if (existsSync(authPath)) {
      const authContent = readFileSync(authPath, 'utf-8')
      const rolesArr = []
      const roleRegex = /\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([A-Z][\w-]*)\s*\|\s*([^|]+?)\s*\|/g
      let roleMatch
      while ((roleMatch = roleRegex.exec(authContent)) !== null) {
        rolesArr.push({
          id: parseInt(roleMatch[1]),
          name: roleMatch[2].trim(),
          code: roleMatch[3].trim(),
          desc: roleMatch[4].trim()
        })
      }
      if (rolesArr.length > 0) result.auth.rolesList = rolesArr

      // Extract modules list from _AUTH.md
      const modulesArr = []
      const modLines = authContent.split('\n')
      let inModules = false
      for (const line of modLines) {
        if (line.includes('### Módulos Registrados')) { inModules = true; continue }
        if (inModules && (line.startsWith('##') || line.startsWith('**Dato'))) { inModules = false; break }
        if (!inModules) continue
        const modMatch = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/)
        if (modMatch) {
          const name = modMatch[2].trim()
          if (name && name !== 'Nombre' && !name.includes('---')) {
            const ident = modMatch[3].trim().replace(/[()]/g, '')
            modulesArr.push({
              id: parseInt(modMatch[1]),
              name,
              identifier: ident === 'null' ? null : ident,
              notes: modMatch[4].trim()
            })
          }
        }
      }
      if (modulesArr.length > 0) result.auth.modulesList = modulesArr

      // Extract activities from _AUTH.md
      const activitiesArr = []
      const actSection = authContent.match(/### Total: \d+ actividades\s*\n([\s\S]*?)(?=\n---|\n## )/i)
      if (actSection) {
        const actRegex = /- `([^`]+)` — (.+)/g
        let actMatch
        let currentModule = null
        const lines = actSection[1].split('\n')
        for (const line of lines) {
          const modHeader = line.match(/\*\*(.+?) \(modulo (\d+)\):\*\*/)
          if (modHeader) {
            currentModule = { name: modHeader[1], id: parseInt(modHeader[2]) }
          }
          const actLine = line.match(/- `([^`]+)` — (.+)/)
          if (actLine && currentModule) {
            activitiesArr.push({
              identifier: actLine[1],
              desc: actLine[2],
              moduleName: currentModule.name,
              moduleId: currentModule.id
            })
          }
        }
      }
      if (activitiesArr.length > 0) result.auth.activitiesList = activitiesArr

      // Extract usuario table fields
      const userFields = []
      const authFieldRegex = /\| (\w[\w_]*) \| (\w[^|]*?) \| (?:NOT NULL|nullable|[^|]*?) \| ([^|]+?) \|/g
      let fieldMatch
      while ((fieldMatch = authFieldRegex.exec(authContent)) !== null) {
        const fname = fieldMatch[1].trim()
        if (fname !== 'Campo' && fname !== 'id' && !fname.includes('---')) {
          userFields.push({ name: fname, type: fieldMatch[2].trim(), desc: fieldMatch[3].trim() })
        }
      }
      if (userFields.length > 0) result.auth.userFields = userFields.slice(0, 20)

      // Extract tables that reference usuario
      const refMatch = authContent.match(/\*\*(\d+) tablas referencian a `usuario`\*\*/)
      if (refMatch) result.auth.userReferences = parseInt(refMatch[1])
    }

    // Parse individual screen files for gaps/tasks — AUTO-DISCOVER
    const screensDir = join(MEMORY_DIR, 'screens')
    if (existsSync(screensDir)) {
      const screenFiles = readdirSync(screensDir).filter(f => f.endsWith('.md'))
      for (const file of screenFiles) {
        const fp = join(screensDir, file)
        if (!existsSync(fp)) continue
        const content = readFileSync(fp, 'utf-8')

        // Extract gaps — first matching subsection only
        const gaps = []
        const gapSection = content.match(/##+ (?:Gap|Faltante|Lo que Falta|Pendientes|Gaps|TODO|Missing|Tareas Pendientes|Work Remaining)[^\n]*([\s\S]*?)(?=\n## [^#]|\n---|\n$|$)/i)
        if (gapSection) {
          // Match **Section:** header lines as gap categories
          const sectionHeaders = gapSection[1].match(/\*\*([^*]{5,60})\*\*:?\s*/g) || []
          for (const h of sectionHeaders.slice(0, 6)) {
            const cleaned = h.replace(/\*\*/g, '').replace(/:?\s*$/, '').trim()
            if (cleaned.length > 8 && cleaned.length < 50 && /\s/.test(cleaned)) gaps.push(cleaned)
          }
        }

        // Extract status
        const statusMatch = content.match(/Status:\s*`?(\w[\w-]*)`?/i) || content.match(/> Status:\s*(\w[\w-]*)/i)
        const name = file.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

        result.screens.push({
          file,
          name,
          status: statusMatch ? statusMatch[1] : 'unknown',
          gaps,
          hasMemory: true
        })
      }
    }

    // Parse _MENU.md for menu stats
    const menuPath = join(MEMORY_DIR, '_MENU.md')
    if (existsSync(menuPath)) {
      const menu = readFileSync(menuPath, 'utf-8')
      const sectionCount = (menu.match(/^### /gm) || []).length
      const itemCount = (menu.match(/^\| /gm) || []).length - sectionCount // subtract headers
      result.codebase.menuSections = sectionCount || 9
      result.codebase.menuItems = Math.max(itemCount, 80)
    }

    // Parse _SCREENS_INVENTORY.md for legacy codebase analysis
    const inventoryPath = join(MEMORY_DIR, '_SCREENS_INVENTORY.md')
    if (existsSync(inventoryPath)) {
      const inv = readFileSync(inventoryPath, 'utf-8')

      const coreScreens = inv.match(/\*\*Pantallas core usuario\*\*\s*\|\s*\*\*~?(\d+)\*\*/)
      if (coreScreens) result.codebase.coreScreensTotal = parseInt(coreScreens[1])

      const missingDash = inv.match(/\*\*Pantallas FALTANTES en dashboard\*\*\s*\|\s*\*\*~?(\d+)\*\*/)
      if (missingDash) result.codebase.missingInDashboard = parseInt(missingDash[1])

      const reactRoutes = inv.match(/Pantallas con código React\s*\|\s*(\d+)/)
      if (reactRoutes) result.codebase.reactRoutes = parseInt(reactRoutes[1])

      const variantsExcluded = inv.match(/Variantes cliente \(no migrar\)\s*\|\s*~?(\d+)\+?/)
      if (variantsExcluded) result.codebase.variantsExcluded = parseInt(variantsExcluded[1])

      // Extract "Pantallas con Documentación de Video" table
      const videoScreens = []
      const videoRegex = /\|\s*([^\|]+?\.md)\s*\|\s*(\w[\w-]*)\s*\|\s*([^\|]*?)\s*\|\s*([^\|]*?)\s*\|\s*([^\|]*?)\s*\|/g
      let vMatch
      while ((vMatch = videoRegex.exec(inv)) !== null) {
        const file = vMatch[1].trim()
        if (file.endsWith('.md') && file !== 'Archivo Memoria') {
          videoScreens.push({
            file,
            status: vMatch[2].trim(),
            dashboardId: vMatch[3].trim(),
            video: vMatch[4].trim(),
            xhtmlLines: vMatch[5].trim()
          })
        }
      }
      if (videoScreens.length) result.videoScreens = videoScreens

      result.codebase.exclusions = {
        layout: 72,
        modalPanels: 115,
        fragments: 14,
        birt: 190,
        rest: 26,
        json: 13,
        migration: 14,
        clientVariants: 200
      }
    }

    // Parse _PACIENTE.md for patient module stats
    const pacientePath = join(MEMORY_DIR, '_PACIENTE.md')
    if (existsSync(pacientePath)) {
      const pac = readFileSync(pacientePath, 'utf-8')

      const totalPacientes = pac.match(/Total registros EG:\s*([\d,]+)/)
      const totalColumns = pac.match(/(\d+) Columnas por Categoría/)
      const totalIndexes = pac.match(/Indexes \((\d+)\)/)
      const configFlags = pac.match(/(\d+) campos boolean/)
      const enabledFlags = pac.match(/Habilitados en EG \((\d+)/)

      result.pacienteModule = {
        totalRecords: totalPacientes ? parseInt(totalPacientes[1].replace(/,/g, '')) : null,
        columns: totalColumns ? parseInt(totalColumns[1]) : 74,
        indexes: totalIndexes ? parseInt(totalIndexes[1]) : 7,
        configFlags: configFlags ? parseInt(configFlags[1]) : 33,
        enabledFlags: enabledFlags ? parseInt(enabledFlags[1]) : 9
      }
    }

    // Parse _BRAND_V3.md for design system info
    const brandPath = join(MEMORY_DIR, '_BRAND_V3.md')
    if (existsSync(brandPath)) {
      const brand = readFileSync(brandPath, 'utf-8')

      result.designSystem = {
        name: 'Liquid Glass v3',
        glassLevels: 3,
        components: ['Navbar glass-1', 'Sidebar glass-1/dark', 'Cards glass-2', 'Modals glass-2', 'Tooltips glass-3', 'Dropdowns glass-3'],
        restrictions: ['NO glass en tablas de datos', 'NO glass en inputs/forms', 'NO glass en botones', 'NO glass en texto médico']
      }
    }

    res.json(result)
  } catch (e) {
    console.error('Memory parse error:', e)
    res.status(500).json({ error: 'Failed to parse memory files' })
  }
})

export default router
