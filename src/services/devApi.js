const BASE = '/api/dev'

export async function getDashboard() {
  const res = await fetch(`${BASE}/dashboard`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getStats() {
  const res = await fetch(`${BASE}/stats`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateScreen(id, data) {
  const res = await fetch(`${BASE}/screens/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function toggleTask(screenId, taskId) {
  const res = await fetch(`${BASE}/screens/${screenId}/tasks/${taskId}/toggle`, {
    method: 'PATCH'
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function addTask(screenId, text) {
  const res = await fetch(`${BASE}/screens/${screenId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteTask(screenId, taskId) {
  const res = await fetch(`${BASE}/screens/${screenId}/tasks/${taskId}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateSprint(id, data) {
  const res = await fetch(`${BASE}/sprints/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createSprint(data) {
  const res = await fetch(`${BASE}/sprints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getMemory() {
  const res = await fetch(`${BASE}/memory`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function addScreen(moduleId, data) {
  const res = await fetch(`${BASE}/modules/${moduleId}/screens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
