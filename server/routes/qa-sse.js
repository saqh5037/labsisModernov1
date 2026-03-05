// SSE Connection Manager for QA Notifications
// Manages connected clients and pushes events in real-time

// Map<userId, Set<Response>>
const clients = new Map()

export function addClient(userId, res) {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write(':connected\n\n')

  if (!clients.has(userId)) clients.set(userId, new Set())
  clients.get(userId).add(res)

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(':ping\n\n') } catch { /* connection dead */ }
  }, 30000)

  // Cleanup on disconnect
  res.on('close', () => {
    clearInterval(heartbeat)
    clients.get(userId)?.delete(res)
    if (clients.get(userId)?.size === 0) clients.delete(userId)
  })
}

export function pushToUser(userId, eventType, data) {
  const userClients = clients.get(userId)
  if (!userClients || userClients.size === 0) return
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of userClients) {
    try { res.write(payload) } catch { userClients.delete(res) }
  }
}

export function getConnectedCount() {
  let count = 0
  for (const set of clients.values()) count += set.size
  return count
}
