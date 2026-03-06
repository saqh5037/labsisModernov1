#!/usr/bin/env node
/**
 * Llena las pruebas sin resultado con valores sintéticos realistas
 * basados en valores referenciales de la BD.
 * Todos los resultados quedan como "emitidos por equipo" (sin validar)
 */

import pg from 'pg'

const API_BASE = 'http://54.197.68.252:3001/api'
const LOGIN = { username: 'TILAPI', password: 'test123' }
let COOKIE = ''

const qaPool = new pg.Pool({
  host: 'ec2-3-91-26-178.compute-1.amazonaws.com', port: 5432,
  database: 'labsisLAPIQA260305', user: 'labsis', password: ',U8x=]N02SX4'
})

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': COOKIE },
    body: JSON.stringify(body)
  })
  const sc = res.headers.getSetCookie?.()
  if (sc?.length) for (const c of sc) { if (c.startsWith('labsis_token=')) COOKIE = c.split(';')[0] }
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`)
  return res.json()
}

async function apiPut(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Cookie': COOKIE },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status}: ${await res.text()}`)
  return res.json()
}

function randomInRange(min, max) {
  // Generate value within normal range with slight variance
  const range = max - min
  const val = min + Math.random() * range
  // 15% chance of being slightly out of range (abnormal)
  if (Math.random() < 0.15) {
    return Math.random() < 0.5 ? min - range * 0.1 : max + range * 0.1
  }
  return val
}

function formatNumber(val, formato) {
  if (!formato) return val.toFixed(2)
  // Count decimal places from formato like "0.0", "0.00", "0.###"
  const parts = formato.split('.')
  const decimals = parts[1] ? parts[1].length : 0
  return val.toFixed(decimals)
}

async function main() {
  console.log('🔬 Llenando pruebas sin resultado con valores sintéticos...\n')

  // Login
  await apiPost('/auth/login', LOGIN)
  console.log('✅ Login OK\n')

  // Get pruebas sin resultado
  const missing = await qaPool.query(`
    SELECT po.id as po_id, po.prueba_id, po.area_id, po.orden_id,
           ot.numero,
           pr.nombre as prueba_nombre,
           tp.codigo as tipo,
           pr.formato,
           pr.valor_por_defecto
    FROM prueba_orden po
    JOIN orden_trabajo ot ON ot.id = po.orden_id
    JOIN prueba pr ON pr.id = po.prueba_id
    JOIN tipo_prueba tp ON tp.id = pr.tipo_prueba_id
    WHERE ot.numero LIKE '260305%' AND po.status_id = 1
    ORDER BY ot.numero, po.area_id, po.id
  `)

  console.log(`📊 ${missing.rows.length} pruebas sin resultado\n`)

  // Get reference values for numeric pruebas
  const refValues = await qaPool.query(`
    SELECT prueba_id, valor_desde, valor_hasta, sexo, panico
    FROM valor_referencial
    WHERE activo IS NULL OR activo = true
  `)
  const refMap = new Map()
  for (const r of refValues.rows) {
    if (r.panico) continue // Skip panic ranges
    if (!refMap.has(r.prueba_id)) refMap.set(r.prueba_id, [])
    refMap.get(r.prueba_id).push(r)
  }

  // Predefined alpha values for common types
  const alphaDefaults = {
    'Negativo': ['Negativo', 'No reactivo', 'Normal'],
    default: ['Normal', 'Negativo', 'Sin alteraciones', 'No se observan', 'Dentro de parámetros']
  }

  // Group by OT + area for API calls
  const grouped = new Map()
  for (const p of missing.rows) {
    const key = `${p.numero}|${p.area_id}`
    if (!grouped.has(key)) grouped.set(key, { numero: p.numero, areaId: p.area_id, pruebas: [] })
    grouped.get(key).pruebas.push(p)
  }

  let totalLoaded = 0
  let idx = 0
  for (const [_, group] of grouped) {
    idx++
    const resultados = []

    for (const p of group.pruebas) {
      let valor = null

      if (p.tipo === 'NUM' || p.tipo === 'CAL') {
        // Use reference ranges to generate realistic value
        const refs = refMap.get(p.prueba_id)
        if (refs?.length) {
          const ref = refs[0] // Use first matching ref
          const min = ref.valor_desde != null ? Number(ref.valor_desde) : 0
          const max = ref.valor_hasta != null ? Number(ref.valor_hasta) : 100
          const numVal = randomInRange(min, max)
          valor = formatNumber(numVal, p.formato)
        } else {
          // No ref range — generate a reasonable value
          valor = formatNumber(Math.random() * 100, p.formato || '0.0')
        }
      } else if (p.tipo === 'SEL') {
        // For selection types, we need to pick from opciones
        const opciones = await qaPool.query(`
          SELECT opcion FROM opcion_prueba WHERE prueba_id = $1 ORDER BY orden_posicion LIMIT 5
        `, [p.prueba_id])
        if (opciones.rows.length) {
          // Pick the "referencial" or first option
          valor = opciones.rows[Math.floor(Math.random() * opciones.rows.length)].opcion
        } else {
          valor = 'Negativo'
        }
      } else if (p.tipo === 'AYU') {
        valor = p.valor_por_defecto || 'Sin hallazgos significativos.'
      } else {
        // ALF and others
        valor = p.valor_por_defecto || alphaDefaults.default[Math.floor(Math.random() * alphaDefaults.default.length)]
      }

      if (valor != null) {
        resultados.push({
          prueba_orden_id: p.po_id,
          valor: String(valor),
          validado: false
        })
      }
    }

    if (resultados.length === 0) continue

    try {
      await apiPut(`/validacion/orden/${group.numero}/area/${group.areaId}/resultados`, {
        resultados,
        validarTodo: false
      })
      totalLoaded += resultados.length
      process.stdout.write(`   [${idx}/${grouped.size}] OT ${group.numero} área ${group.areaId} — ${resultados.length} resultados ✅\n`)
    } catch (err) {
      console.error(`   [${idx}/${grouped.size}] ⚠️  OT ${group.numero} área ${group.areaId}: ${err.message}`)
    }
  }

  console.log(`\n✅ ${totalLoaded} resultados sintéticos cargados`)
  console.log('   Todos sin validar (status_id=2, "Iniciada")')

  await qaPool.end()
}

main().catch(console.error)
