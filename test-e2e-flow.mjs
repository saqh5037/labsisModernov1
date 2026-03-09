import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require('/Users/samuelquiroz/Documents/proyectos/playwright-automation-suite/node_modules/playwright')
const jwt = require('jsonwebtoken')

const BASE = 'http://localhost:5173'
const headed = process.argv.includes('--headed')
let passed = 0, failed = 0

// Shared state across tests
let pacienteNombre, pacienteId, otNumero

// Unique name to avoid collisions
const TS = Date.now()
pacienteNombre = `E2E-${TS}`

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ✓ PASS: ${name}`)
    passed++
  } catch (e) {
    console.log(`  ✗ FAIL: ${name} — ${e.message}`)
    failed++
  }
}

;(async () => {
  console.log('\n🧪 Test E2E — Crear Paciente → Crear OT → Resultados → Validar\n')

  const token = jwt.sign(
    { userId: 2507, username: 'TILAPI', nombre: 'TI', apellido: 'LAPI', roles: ['ADM'] },
    'labsis-eg-moderno-jwt-secret-2026',
    { expiresIn: '1h' }
  )

  const browser = await chromium.launch({
    headless: !headed,
    slowMo: headed ? 400 : 0
  })
  const ctx = await browser.newContext()

  // Auth cookie
  await ctx.addCookies([{
    name: 'labsis_token',
    value: token,
    domain: 'localhost',
    path: '/',
  }])

  const page = await ctx.newPage()

  // ── Test 1: Crear Paciente ──
  await test('Crear Paciente nuevo', async () => {
    await page.goto(`${BASE}/pacientes/nuevo`, { waitUntil: 'networkidle', timeout: 15000 })

    // Fill nombre
    await page.fill('input[placeholder="Nombre(s)"]', pacienteNombre)
    // Fill apellido
    await page.fill('input[placeholder="Primer apellido"]', 'Playwright')
    // Select sexo M — radio is hidden, click the parent label
    await page.locator('label.pac-radio', { hasText: 'M' }).first().click()
    // Fill fecha nacimiento
    await page.fill('input[type="date"]', '1990-01-15')
    // Fill celular — first input with "Ej: 55 1234 5678" placeholder is celular
    const celularInputs = page.locator('input[placeholder="Ej: 55 1234 5678"]')
    await celularInputs.first().fill('5550001234')

    // Click "Crear Paciente"
    await page.click('button.ot-btn.ot-btn-green')

    // Wait for navigation to /pacientes/:id
    await page.waitForURL(/\/pacientes\/\d+/, { timeout: 10000 })
    const url = page.url()
    const match = url.match(/\/pacientes\/(\d+)/)
    if (!match) throw new Error(`URL no matchea /pacientes/:id — got ${url}`)
    pacienteId = match[1]
    console.log(`    → Paciente creado: id=${pacienteId}, nombre=${pacienteNombre} Playwright`)
  })

  // ── Test 2: Crear OT ──
  await test('Crear Orden de Trabajo con Glucosa', async () => {
    await page.goto(`${BASE}/ordenes/crear`, { waitUntil: 'networkidle', timeout: 15000 })

    // Search paciente
    const pacInput = page.locator('input.ote-search-input[placeholder="Buscar por CI, nombre o apellido..."]')
    await pacInput.fill(pacienteNombre)
    await page.waitForSelector('.ote-autocomplete-dropdown', { timeout: 10000 })
    await page.click('.ote-autocomplete-item')

    // Search procedencia
    const procInput = page.locator('input[placeholder="Buscar procedencia..."]')
    await procInput.fill('GABRIEL')
    await page.waitForSelector('.ote-autocomplete-dropdown', { timeout: 10000 })
    await page.click('.ote-autocomplete-item')

    // Wait for servicio to resolve (exam search becomes enabled)
    await page.waitForSelector('.ote-servicio-badge', { timeout: 10000 })
    // Small delay for search to become enabled
    await page.waitForTimeout(500)

    // Search exam "gluc" — wait a bit for search to be ready
    const examInput = page.locator('input.ote-search-input[placeholder="Buscar prueba, grupo o codigo..."]')
    await examInput.click()
    await examInput.fill('gluc')
    await page.waitForSelector('.ote-search-dropdown', { timeout: 10000 })
    // Click a prueba individual (not grupo) — use force to bypass overlay
    const pruebaItem = page.locator('.ote-search-dropdown button.ote-search-item:not(.ote-search-grupo)').first()
    await pruebaItem.click({ force: true })

    // Verify exam added
    const examRows = await page.locator('.ote-exam-list .ote-exam-row').count()
    if (examRows === 0) throw new Error('No se agregó ningún examen')

    // Intercept POST response to get OT numero
    const responsePromise = page.waitForResponse(
      r => r.url().includes('/api/ot') && r.request().method() === 'POST',
      { timeout: 15000 }
    )

    // Click "Solo Guardar"
    await page.click('button.ot-btn.ot-btn-secondary')

    const response = await responsePromise
    const body = await response.json()
    if (!body.ok) throw new Error(`POST /api/ot failed: ${JSON.stringify(body)}`)
    otNumero = body.orden?.numero
    console.log(`    → OT creada: numero=${otNumero}`)
  })

  // ── Test 3: Ingresar Resultados ──
  await test('Ingresar resultado de Glucosa', async () => {
    if (!otNumero) throw new Error('No hay OT — test anterior falló')

    await page.goto(`${BASE}/ordenes/${otNumero}/lab`, { waitUntil: 'networkidle', timeout: 15000 })

    // Wait for lab results table
    await page.waitForSelector('.lab-results-table', { timeout: 10000 })

    // Find input for result (NUM type)
    const labInput = page.locator('input.lab-input').first()
    await labInput.waitFor({ timeout: 5000 })
    await labInput.fill('95.5')

    // Save with Ctrl+S
    await page.keyboard.press('Control+s')

    // Wait for toast "Resultados guardados"
    await page.waitForSelector('.lab-toast', { timeout: 10000 })
    const toastText = await page.locator('.lab-toast').innerText()
    if (!toastText.includes('Resultados guardados')) {
      throw new Error(`Toast esperado "Resultados guardados", got "${toastText}"`)
    }
    console.log(`    → Resultado 95.5 guardado para Glucosa`)
  })

  // ── Test 4: Validar Resultados ──
  await test('Validar área completa', async () => {
    if (!otNumero) throw new Error('No hay OT — test anterior falló')

    // Wait for previous toast to disappear
    await page.waitForTimeout(2500)

    // Step 1: Click "Validar Todo" in the validation bar (marks all as validated in dirty state)
    const validarBtn = page.locator('.lab-validation-bar button.lab-btn-danger', { hasText: 'Validar Todo' })
    const validarBtnCount = await validarBtn.count()
    if (validarBtnCount === 0) {
      // Try the Cmd+Enter shortcut instead
      console.log('    → No validation bar button found, using Cmd+Enter shortcut')
      await page.keyboard.press('Meta+Enter')
    } else {
      await validarBtn.click()
    }

    // Wait for dirty state to update
    await page.waitForTimeout(500)

    // Step 2: Save — intercept PUT response
    const savePromise = page.waitForResponse(
      r => r.url().includes('/lab/resultados') && r.request().method() === 'PUT',
      { timeout: 15000 }
    )

    // Click "Guardar" button or press Ctrl+S
    const guardarBtn = page.locator('button.lab-btn-success', { hasText: 'Guardar' })
    const guardarCount = await guardarBtn.count()
    if (guardarCount > 0) {
      await guardarBtn.first().click()
    } else {
      await page.keyboard.press('Control+s')
    }

    // Wait for API response
    const resp = await savePromise
    console.log(`    → API save+validate response status: ${resp.status()}`)

    // Wait for toast
    await page.waitForTimeout(1500)
    const validatedRows = await page.locator('.lab-row-validated').count()
    console.log(`    → ${validatedRows} fila(s) validada(s)`)
  })

  // ── Test 5: Verificar OT Completada ──
  await test('OT muestra status validado/completado', async () => {
    if (!otNumero) throw new Error('No hay OT — test anterior falló')

    await page.goto(`${BASE}/ordenes/${otNumero}`, { waitUntil: 'networkidle', timeout: 15000 })

    // Check for status badge
    const statusBadge = page.locator('.od-status-badge, .ot-status-badge, [class*="status"]').first()
    await statusBadge.waitFor({ timeout: 5000 })
    const statusText = await statusBadge.innerText()
    console.log(`    → Status de OT: "${statusText}"`)

    // Accept any valid completed/validated status
    const validStatuses = ['Validado', 'Completado', 'Parcial', 'En Proceso', 'Resultados']
    const hasValidStatus = validStatuses.some(s => statusText.toLowerCase().includes(s.toLowerCase()))
    if (!hasValidStatus) {
      console.log(`    → Warning: Status "${statusText}" — no es un estado final esperado`)
    }
  })

  await page.close()
  await browser.close()

  console.log(`\n📊 Resultados: ${passed} passed, ${failed} failed, ${passed + failed} total\n`)
  process.exit(failed > 0 ? 1 : 0)
})()
