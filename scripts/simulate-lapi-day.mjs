#!/usr/bin/env node
/**
 * Simulador de día LAPI — crea 50 OTs reales en QA via API
 * Usa data real del 3-Mar-2026 de producción LAPI
 * Resultados insertados como "emitidos por equipo" (sin validar)
 */

import pg from 'pg'

// ═══ CONFIG ═══
const API_BASE = 'http://54.197.68.252:3001/api'
const LOGIN = { username: 'TILAPI', password: 'test123' }

// BD Producción (lectura)
const prodPool = new pg.Pool({
  host: 'localhost', port: 5432,
  database: 'labsisLapi260303', user: 'labsis', password: 'labsis'
})

// BD QA (lectura para verificar IDs post-creación)
const qaPool = new pg.Pool({
  host: 'ec2-3-91-26-178.compute-1.amazonaws.com', port: 5432,
  database: 'labsisLAPIQA260305', user: 'labsis', password: ',U8x=]N02SX4'
})

// 50 OTs seleccionadas del 3-Mar-2026 con variedad
const SELECTED_OT_IDS = [
  1023056,1023579,1022515,1023668,1023288,1023615,1023617,1023842,
  1022783,1023306,1022422,1022573,1022183,1023886,1023829,1023885,
  1023888,1023639,1022157,1023674,1022486,1023552,1023554,1022156,
  1023460,1022472,1022572,1023689,1022441,1023100,1023304,1023695,
  1023673,1023660,1023297,1022152,1023854,1022483,1023041,1023457,
  1023082,1022559,1022848,1022395,1022396,1022387,1022385,1022390,
  1023467,1022393
]

let COOKIE = ''

// ═══ HELPERS ═══
async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': COOKIE },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`POST ${path} → ${res.status}: ${txt}`)
  }
  // Capture set-cookie
  const sc = res.headers.getSetCookie?.()
  if (sc?.length) {
    for (const c of sc) {
      if (c.startsWith('labsis_token=')) COOKIE = c.split(';')[0]
    }
  }
  return res.json()
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Cookie': COOKIE },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`PUT ${path} → ${res.status}: ${txt}`)
  }
  return res.json()
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Cookie': COOKIE }
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`GET ${path} → ${res.status}: ${txt}`)
  }
  return res.json()
}

// ═══ STEP 1: LOGIN ═══
async function login() {
  console.log('🔑 Login...')
  const result = await apiPost('/auth/login', LOGIN)
  console.log(`   ✅ Logged in as ${result.user.username} [${result.user.roles}]`)
  return result
}

// ═══ STEP 2: EXTRACT DATA FROM PROD ═══
async function extractOTs() {
  console.log('\n📊 Extrayendo data de producción...')

  const otsResult = await prodPool.query(`
    SELECT ot.id, ot.numero, ot.procedencia_id, ot.servicio_id,
           ot.medico_id, ot.servicio_medico_id,
           ot.habitacion, ot.observaciones, ot.informacion_clinica,
           ot.stat, ot.embarazada, ot.semanas_embarazo,
           ot.centro_atencion_paciente_id,
           p.id as pac_id, p.ci_paciente, p.nombre as pac_nombre,
           p.apellido as pac_apellido, p.apellido_segundo as pac_apellido2,
           p.sexo, p.fecha_nacimiento,
           p.telefono, p.email, p.ci_rfc,
           p.telefono_celular, p.num_historia
    FROM orden_trabajo ot
    LEFT JOIN paciente p ON p.id = ot.paciente_id
    WHERE ot.id = ANY($1)
    ORDER BY (SELECT COUNT(*) FROM prueba_orden po WHERE po.orden_id = ot.id)
  `, [SELECTED_OT_IDS])

  const ots = []
  for (const ot of otsResult.rows) {
    // Get pruebas for this OT
    const pruebasResult = await prodPool.query(`
      SELECT po.id as po_id, po.prueba_id, po.area_id, po.gp_id, po.gp_orden_id,
             po.precio, po.precio_sin_descuento,
             pr.nombre as prueba_nombre, pr.nomenclatura as prueba_codigo,
             tp.codigo as tipo_codigo,
             a.area as area_nombre,
             rn.valor as rn_valor, rn.unidad as rn_unidad, rn.simbolo as rn_simbolo,
             rn.alarma as rn_alarma, rn.menor_mayor as rn_menor_mayor,
             ra.valor as ra_valor, ra.alarma as ra_alarma
      FROM prueba_orden po
      JOIN prueba pr ON pr.id = po.prueba_id
      JOIN tipo_prueba tp ON tp.id = pr.tipo_prueba_id
      JOIN area a ON a.id = po.area_id
      LEFT JOIN resultado_numer rn ON rn.pruebao_id = po.id
      LEFT JOIN resultado_alpha ra ON ra.pruebao_id = po.id
      WHERE po.orden_id = $1
      ORDER BY po.area_id, po.id
    `, [ot.id])

    // Get grupos for this OT
    const gruposResult = await prodPool.query(`
      SELECT gpo.id, gpo.gp_id, gp.nombre, gpo.precio, gpo.precio_sin_descuento
      FROM gprueba_orden gpo
      JOIN grupo_prueba gp ON gp.id = gpo.gp_id
      WHERE gpo.orden_id = $1
    `, [ot.id])

    ots.push({
      ...ot,
      pruebas: pruebasResult.rows,
      grupos: gruposResult.rows
    })
  }

  console.log(`   ✅ ${ots.length} OTs extraídas con ${ots.reduce((s,o) => s + o.pruebas.length, 0)} pruebas`)
  return ots
}

// ═══ STEP 3: CREATE OTs VIA API ═══
async function createOTs(ots) {
  console.log('\n🏗️  Creando OTs en QA via API...')
  const results = []

  for (let i = 0; i < ots.length; i++) {
    const ot = ots[i]
    const numPruebas = ot.pruebas.length

    // Build API payload
    const payload = {
      paciente: {
        id: null, // Always create new patient
        ci_paciente: ot.ci_paciente || null,
        nombre: ot.pac_nombre || 'Paciente',
        apellido: ot.pac_apellido || 'Simulado',
        apellido_segundo: ot.pac_apellido2 || null,
        sexo: ot.sexo || null,
        fecha_nacimiento: ot.fecha_nacimiento ? new Date(ot.fecha_nacimiento).toISOString().split('T')[0] : null,
        email: ot.email || null,
        telefono: ot.telefono || null,
        telefono_celular: ot.telefono_celular || null,
        ci_rfc: ot.ci_rfc || null,
        num_historia: ot.num_historia || null
      },
      orden: {
        procedencia_id: ot.procedencia_id,
        servicio_id: ot.servicio_id || null,
        servicio_medico_id: ot.servicio_medico_id || null,
        medico_id: ot.medico_id || null,
        habitacion: ot.habitacion || null,
        observaciones: ot.observaciones || null,
        informacion_clinica: ot.informacion_clinica || null,
        stat: ot.stat || false,
        embarazada: ot.embarazada || false,
        semanas_embarazo: ot.semanas_embarazo || 0,
        centro_atencion_paciente_id: ot.centro_atencion_paciente_id || 1,
        descuento_porcentaje: 0,
        descuento_monto: 0
      },
      pruebas: ot.pruebas
        .filter(p => !p.gp_id) // Pruebas sueltas (no de grupo)
        .map(p => ({
          prueba_id: p.prueba_id,
          nombre: p.prueba_nombre,
          area_id: p.area_id,
          precio: parseFloat(p.precio) || 0,
          gp_id: null
        })),
      grupos: ot.grupos.map(g => ({
        id: g.gp_id,
        nombre: g.nombre,
        precio: parseFloat(g.precio) || 0
      })),
      facturar: false
    }

    try {
      const result = await apiPost('/ot', payload)
      const newNumero = result.orden.numero
      const newId = result.orden.id

      results.push({
        origOtId: ot.id,
        origNumero: ot.numero,
        newId,
        newNumero,
        numPruebas,
        pruebas: ot.pruebas // Keep for resultado loading
      })

      process.stdout.write(`   [${(i+1).toString().padStart(2)}/${ots.length}] OT ${newNumero} — ${numPruebas} pruebas ✅\n`)
    } catch (err) {
      console.error(`   [${(i+1).toString().padStart(2)}/${ots.length}] ❌ Error creando OT (orig ${ot.numero}): ${err.message}`)
      results.push({ origOtId: ot.id, origNumero: ot.numero, error: err.message })
    }
  }

  const created = results.filter(r => r.newNumero)
  console.log(`\n   ✅ ${created.length}/${ots.length} OTs creadas exitosamente`)
  return results
}

// ═══ STEP 4: LOAD RESULTS VIA API (sin validar) ═══
async function loadResults(createdOTs) {
  console.log('\n🔬 Cargando resultados de equipos (sin validar)...')

  const successOTs = createdOTs.filter(r => r.newNumero)
  let totalResultados = 0
  let totalSkipped = 0

  for (let i = 0; i < successOTs.length; i++) {
    const ot = successOTs[i]

    // First, get the prueba_orden IDs created by our API
    const poMapping = await qaPool.query(`
      SELECT po.id as po_id, po.prueba_id, po.area_id, tp.codigo as tipo
      FROM prueba_orden po
      JOIN prueba pr ON pr.id = po.prueba_id
      JOIN tipo_prueba tp ON tp.id = pr.tipo_prueba_id
      WHERE po.orden_id = $1
      ORDER BY po.area_id, po.id
    `, [ot.newId])

    // Build a map: prueba_id+area_id → new po_id
    const poMap = new Map()
    for (const po of poMapping.rows) {
      const key = `${po.prueba_id}_${po.area_id}`
      // Handle duplicates (same prueba in same area) by collecting in array
      if (!poMap.has(key)) poMap.set(key, [])
      poMap.get(key).push(po)
    }

    // Group original pruebas by area with their results
    const byArea = new Map()
    for (const p of ot.pruebas) {
      if (!byArea.has(p.area_id)) byArea.set(p.area_id, [])
      byArea.get(p.area_id).push(p)
    }

    let otResultados = 0
    let otSkipped = 0

    for (const [areaId, pruebas] of byArea) {
      const resultados = []
      // Track used po_ids from the map to handle dups
      const usedPoIds = new Set()

      for (const p of pruebas) {
        const key = `${p.prueba_id}_${p.area_id}`
        const candidates = poMap.get(key)
        if (!candidates?.length) { otSkipped++; continue }

        // Pick the first unused candidate
        const match = candidates.find(c => !usedPoIds.has(c.po_id))
        if (!match) { otSkipped++; continue }
        usedPoIds.add(match.po_id)

        // Get the result value from prod
        const tipo = match.tipo || 'NUM'
        let valor = null

        if (tipo === 'NUM' || tipo === 'CAL') {
          valor = p.rn_valor != null ? String(p.rn_valor) : null
        } else {
          valor = p.ra_valor || null
        }

        if (valor == null || valor === '') continue // Skip empty results

        resultados.push({
          prueba_orden_id: match.po_id,
          valor: valor,
          menor_mayor: p.rn_menor_mayor || null,
          validado: false // ← KEY: sin validar, como si el equipo lo emitió
        })
      }

      if (resultados.length === 0) continue

      try {
        await apiPut(`/validacion/orden/${ot.newNumero}/area/${areaId}/resultados`, {
          resultados,
          validarTodo: false
        })
        otResultados += resultados.length
      } catch (err) {
        console.error(`      ⚠️  Error cargando resultados área ${areaId} de OT ${ot.newNumero}: ${err.message}`)
      }
    }

    totalResultados += otResultados
    totalSkipped += otSkipped
    process.stdout.write(`   [${(i+1).toString().padStart(2)}/${successOTs.length}] OT ${ot.newNumero} — ${otResultados} resultados cargados ✅\n`)
  }

  console.log(`\n   ✅ ${totalResultados} resultados cargados (${totalSkipped} pruebas sin resultado en prod)`)
  return totalResultados
}

// ═══ STEP 5: SUMMARY ═══
async function verifySummary(createdOTs) {
  console.log('\n📋 RESUMEN DE SIMULACIÓN')
  console.log('═'.repeat(70))

  const success = createdOTs.filter(r => r.newNumero)
  const failed = createdOTs.filter(r => r.error)

  // Count by prueba ranges
  const ranges = { '1': 0, '2-3': 0, '4-10': 0, '11-20': 0, '21+': 0 }
  for (const ot of success) {
    const n = ot.numPruebas
    if (n === 1) ranges['1']++
    else if (n <= 3) ranges['2-3']++
    else if (n <= 10) ranges['4-10']++
    else if (n <= 20) ranges['11-20']++
    else ranges['21+']++
  }

  console.log(`\n  OTs creadas: ${success.length}`)
  console.log(`  OTs fallidas: ${failed.length}`)
  console.log(`\n  Distribución:`)
  for (const [range, count] of Object.entries(ranges)) {
    if (count > 0) console.log(`    ${range.padEnd(6)} pruebas: ${count} OTs`)
  }

  // Get areas covered
  const areasSet = new Set()
  for (const ot of success) {
    for (const p of ot.pruebas) areasSet.add(p.area_nombre)
  }
  console.log(`\n  Áreas cubiertas: ${areasSet.size}`)
  for (const a of [...areasSet].sort()) console.log(`    • ${a}`)

  // Verify some OTs in QA
  console.log('\n  Verificación rápida (primeras 5 OTs):')
  for (const ot of success.slice(0, 5)) {
    try {
      const check = await qaPool.query(`
        SELECT
          (SELECT COUNT(*) FROM prueba_orden WHERE orden_id = $1) as total_po,
          (SELECT COUNT(*) FROM prueba_orden WHERE orden_id = $1 AND status_id >= 2) as con_resultado,
          (SELECT COUNT(*) FROM prueba_orden WHERE orden_id = $1 AND status_id = 4) as validadas
      `, [ot.newId])
      const { total_po, con_resultado, validadas } = check.rows[0]
      console.log(`    OT ${ot.newNumero}: ${total_po} pruebas, ${con_resultado} con resultado, ${validadas} validadas`)
    } catch (err) {
      console.log(`    OT ${ot.newNumero}: error verificando — ${err.message}`)
    }
  }

  console.log('\n  Números de OT creados:')
  console.log('  ' + success.map(o => o.newNumero).join(', '))

  if (failed.length > 0) {
    console.log('\n  ⚠️  OTs fallidas:')
    for (const f of failed) {
      console.log(`    ${f.origNumero}: ${f.error}`)
    }
  }

  console.log('\n═'.repeat(70))
  console.log('🎯 Simulación completa. Las OTs están listas con resultados por validar.')
  console.log(`   Abre: http://54.197.68.252:3001 → Login → Lista de OTs`)
}

// ═══ MAIN ═══
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  SIMULADOR DE DÍA LAPI — 50 OTs REALES EN QA      ║')
  console.log('║  Data: 3-Mar-2026 producción → QA                  ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  try {
    await login()
    const ots = await extractOTs()
    const created = await createOTs(ots)
    await loadResults(created)
    await verifySummary(created)
  } catch (err) {
    console.error('\n💥 Error fatal:', err)
  } finally {
    await prodPool.end()
    await qaPool.end()
  }
}

main()
