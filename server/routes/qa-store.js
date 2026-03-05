import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../data/qa')

export async function ensureDirs() {
  const dirs = ['suites', 'runs', 'bugs', 'screenshots', 'notifications', 'sessions']
  for (const d of dirs) {
    const p = path.join(DATA_DIR, d)
    if (!existsSync(p)) await mkdir(p, { recursive: true })
  }
  const counterPath = path.join(DATA_DIR, '_counter.json')
  if (!existsSync(counterPath)) {
    await writeFile(counterPath, JSON.stringify({ runs: 0, bugs: 0, notifications: 0 }))
  }
  // Ensure assignments file
  const assignPath = path.join(DATA_DIR, 'assignments.json')
  if (!existsSync(assignPath)) {
    await writeFile(assignPath, JSON.stringify({ assignments: [] }))
  }
}

export async function readJSON(filepath) {
  const raw = await readFile(filepath, 'utf-8')
  return JSON.parse(raw)
}

export async function writeJSON(filepath, data) {
  await writeFile(filepath, JSON.stringify(data, null, 2))
}

export async function listJSON(dir) {
  const dirPath = path.join(DATA_DIR, dir)
  if (!existsSync(dirPath)) return []
  const files = await readdir(dirPath)
  const jsons = files.filter(f => f.endsWith('.json'))
  const results = []
  for (const f of jsons) {
    try {
      const data = await readJSON(path.join(dirPath, f))
      results.push(data)
    } catch { /* skip corrupt files */ }
  }
  return results
}

export async function nextId(type) {
  const counterPath = path.join(DATA_DIR, '_counter.json')
  const counter = await readJSON(counterPath)
  counter[type] = (counter[type] || 0) + 1
  await writeJSON(counterPath, counter)
  return counter[type]
}

export function getDataDir() {
  return DATA_DIR
}

export function getSuitePath(id) {
  return path.join(DATA_DIR, 'suites', `${id}.json`)
}

export function getRunPath(id) {
  return path.join(DATA_DIR, 'runs', `run-${String(id).padStart(3, '0')}.json`)
}

export function getBugPath(id) {
  return path.join(DATA_DIR, 'bugs', `bug-${String(id).padStart(3, '0')}.json`)
}

export function getAssignmentsPath() {
  return path.join(DATA_DIR, 'assignments.json')
}

export function getNotifPath(id) {
  return path.join(DATA_DIR, 'notifications', `notif-${String(id).padStart(3, '0')}.json`)
}

export function getSessionPath(token) {
  return path.join(DATA_DIR, 'sessions', `session-${token}.json`)
}
