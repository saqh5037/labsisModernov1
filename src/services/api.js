const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') + '/api'

export async function getHealth() {
  try {
    const res = await fetch(`${BASE}/health`)
    if (!res.ok) return { ok: false, db: null }
    return res.json()
  } catch {
    return { ok: false, db: null }
  }
}

export async function getOrdenes(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString()
  const res = await fetch(`${BASE}/ordenes${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getStatus() {
  const res = await fetch(`${BASE}/ordenes/status`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getProcedencias() {
  const res = await fetch(`${BASE}/procedencias`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getAreas() {
  const res = await fetch(`${BASE}/areas`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getUsuarios() {
  const res = await fetch(`${BASE}/usuarios`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getServiciosMedicos() {
  const res = await fetch(`${BASE}/servicios-medicos`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getCheckpoints() {
  const res = await fetch(`${BASE}/ordenes/checkpoints`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getDashboard(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString()
  const res = await fetch(`${BASE}/ordenes/dashboard${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getOrdenDetalle(numero) {
  const res = await fetch(`${BASE}/ordenes/${numero}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getLaboratorio() {
  const res = await fetch(`${BASE}/laboratorio`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function searchMedicos(q) {
  const res = await fetch(`${BASE}/medicos?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createMedico(data) {
  const res = await fetch(`${BASE}/medicos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateOrdenMedico(numero, medico_id) {
  const res = await fetch(`${BASE}/ordenes/${numero}/medico`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ medico_id })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateOrdenInfoClinica(numero, informacion_clinica) {
  const res = await fetch(`${BASE}/ordenes/${numero}/info-clinica`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ informacion_clinica })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateOrdenFechaToma(numero, fecha_toma_muestra) {
  const res = await fetch(`${BASE}/ordenes/${numero}/fecha-toma`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha_toma_muestra })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateOrdenStat(numero) {
  const res = await fetch(`${BASE}/ordenes/${numero}/stat`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function abortarOrden(numero) {
  const res = await fetch(`${BASE}/ordenes/${numero}/abortar`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function activarOrden(numero) {
  const res = await fetch(`${BASE}/ordenes/${numero}/activar`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function searchPruebas(q, area) {
  const params = new URLSearchParams({ q })
  if (area) params.set('area', area)
  const res = await fetch(`${BASE}/pruebas?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── Print / Acciones adicionales ──
export async function getInstrucciones(numero) {
  const res = await fetch(`${BASE}/ordenes/${numero}/instrucciones`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getPreguntas(numero) {
  const res = await fetch(`${BASE}/ordenes/${numero}/preguntas`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getReciboData(numero) {
  const res = await fetch(`${BASE}/ordenes/${numero}/recibo`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function marcarMuestrasNoEntregadas(numero) {
  const res = await fetch(`${BASE}/ordenes/${numero}/muestras-no-entregadas`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── Auth ──
export async function loginUser(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de conexión' }))
    throw new Error(err.error)
  }
  return res.json()
}

export async function getMe() {
  const res = await fetch(`${BASE}/auth/me`, { credentials: 'include' })
  if (!res.ok) throw new Error('No autenticado')
  return res.json()
}

export async function logoutUser() {
  await fetch(`${BASE}/auth/logout`, { method: 'POST', credentials: 'include' })
}

// ── Lab Results ──
export async function getOrdenLab(numero) {
  const res = await fetch(`${BASE}/ordenes/${numero}/lab`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function saveResultados(numero, resultados, observaciones_area) {
  const res = await fetch(`${BASE}/ordenes/${numero}/lab/resultados`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resultados, observaciones_area })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getHistorico(numero, pruebaOrdenId) {
  const res = await fetch(`${BASE}/ordenes/${numero}/lab/historico/${pruebaOrdenId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getLabQueue(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== '') params.append(k, String(v)) })
  const qs = params.toString()
  const res = await fetch(`${BASE}/ordenes/lab/queue${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json() // { rows, page, hasMore }
}

export async function getLabAreas() {
  const res = await fetch(`${BASE}/ordenes/lab/areas`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function labQuickSearch(q) {
  const res = await fetch(`${BASE}/ordenes/lab/quick-search?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function corregirResultado(numero, data) {
  const res = await fetch(`${BASE}/ordenes/${numero}/lab/correccion`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error || 'Error al corregir resultado')
  }
  return res.json()
}

export async function getCorrecciones(numero, pruebaOrdenId) {
  const res = await fetch(`${BASE}/ordenes/${numero}/lab/correcciones/${pruebaOrdenId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function verificarResultados(numero, prueba_orden_ids, verificado) {
  const res = await fetch(`${BASE}/ordenes/${numero}/lab/verificar`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prueba_orden_ids, verificado })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function setAreaEspera(numero, areaId, en_espera) {
  const res = await fetch(`${BASE}/ordenes/${numero}/lab/area/${areaId}/espera`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ en_espera })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getNotasPredefinidas() {
  const res = await fetch(`${BASE}/ordenes/lab/notas-predefinidas`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getResultadosPrint(numero) {
  const res = await fetch(`${BASE}/ordenes/${numero}/resultados-print`)
  if (!res.ok) throw new Error('Error cargando resultados')
  return res.json()
}

// ── Pacientes ──
export async function getPacientes(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString()
  const res = await fetch(`${BASE}/pacientes${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getPacienteStats() {
  const res = await fetch(`${BASE}/pacientes/stats`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getPaciente(id) {
  const res = await fetch(`${BASE}/pacientes/${id}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getPacienteConfig() {
  const res = await fetch(`${BASE}/pacientes/config/campos`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getCatalogoRazas() {
  const res = await fetch(`${BASE}/razas`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getCatalogoSaludos() {
  const res = await fetch(`${BASE}/saludos`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createPaciente(data) {
  const res = await fetch(`${BASE}/pacientes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error || 'Error al crear paciente')
  }
  return res.json()
}

export async function updatePaciente(id, data) {
  const res = await fetch(`${BASE}/pacientes/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error || 'Error al actualizar paciente')
  }
  return res.json()
}

export async function desactivarPaciente(id) {
  const res = await fetch(`${BASE}/pacientes/${id}/desactivar`, { method: 'PATCH' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function activarPaciente(id) {
  const res = await fetch(`${BASE}/pacientes/${id}/activar`, { method: 'PATCH' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function validarCiPaciente(ci, excludeId) {
  const params = excludeId ? `?exclude=${excludeId}` : ''
  const res = await fetch(`${BASE}/pacientes/validar-ci/${encodeURIComponent(ci)}${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deletePaciente(id) {
  const res = await fetch(`${BASE}/pacientes/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error || 'Error al eliminar paciente')
  }
  return res.json()
}

export async function getVinculos() {
  const res = await fetch(`${BASE}/pacientes/vinculos`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── OT Edit ──
export async function getOTEditNew(pacienteId) {
  const qs = pacienteId ? `?pacienteId=${pacienteId}` : ''
  const res = await fetch(`${BASE}/ot/edit/new${qs}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getOTEdit(numero) {
  const res = await fetch(`${BASE}/ot/edit/${numero}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function searchPruebasOT(q, servicioId) {
  const params = new URLSearchParams({ q })
  if (servicioId) params.set('servicio_id', servicioId)
  const res = await fetch(`${BASE}/ot/search-pruebas?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function resolveServicio(procedenciaId) {
  const res = await fetch(`${BASE}/ot/resolve-servicio?procedencia_id=${procedenciaId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function recalcPrecios(servicioId, pruebaIds, gpIds) {
  const params = new URLSearchParams({ servicio_id: servicioId })
  if (pruebaIds.length) params.set('prueba_ids', pruebaIds.join(','))
  if (gpIds.length) params.set('gp_ids', gpIds.join(','))
  const res = await fetch(`${BASE}/ot/recalc-precios?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getGrupoPruebas(gpId) {
  const res = await fetch(`${BASE}/ot/grupo-prueba/${gpId}/pruebas`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createOT(data) {
  const res = await fetch(`${BASE}/ot`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error || 'Error al crear OT')
  }
  return res.json()
}

export async function updateOT(numero, data) {
  const res = await fetch(`${BASE}/ot/${numero}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(err.error || 'Error al editar OT')
  }
  return res.json()
}

export async function searchPacienteOT(q) {
  const res = await fetch(`${BASE}/ot/search-paciente?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function searchMedicoOT(q) {
  const res = await fetch(`${BASE}/ot/search-medico?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createMedicoOT(data) {
  const res = await fetch(`${BASE}/ot/medicos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function facturarOT(numero, data) {
  const res = await fetch(`${BASE}/ot/${numero}/facturar`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getOTDescuentos(servicioId) {
  const res = await fetch(`${BASE}/ot/descuentos/${servicioId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getFacturaData(numero) {
  const res = await fetch(`${BASE}/ot/factura/${numero}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function registrarPago(facturaId, data) {
  const res = await fetch(`${BASE}/ot/factura/${facturaId}/pago`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function anularPago(facturaId, pagoId) {
  const res = await fetch(`${BASE}/ot/factura/${facturaId}/pago/${pagoId}/anular`, { method: 'POST' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function anularFactura(facturaId, motivo) {
  const res = await fetch(`${BASE}/ot/factura/${facturaId}/anular`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function crearNotaCredito(facturaId, data) {
  const res = await fetch(`${BASE}/ot/factura/${facturaId}/nota-credito`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ══ VALIDACIÓN BLOQUE POR ÁREA ══

export async function getVBAreas() {
  const res = await fetch(`${BASE}/validacion/areas`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getVBMuestras(fechaDesde, fechaHasta, areaId, validada) {
  const params = new URLSearchParams({ fechaDesde, fechaHasta, areaId, validada })
  const res = await fetch(`${BASE}/validacion/muestras?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getVBOrdenArea(numero, areaId) {
  const res = await fetch(`${BASE}/validacion/orden/${numero}/area/${areaId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function saveVBResultados(numero, areaId, data) {
  const res = await fetch(`${BASE}/validacion/orden/${numero}/area/${areaId}/resultados`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── QA Testing Module ────────────────────────────────────

export async function getQADashboard() {
  const res = await fetch(`${BASE}/qa/dashboard`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getQASuites() {
  const res = await fetch(`${BASE}/qa/suites`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getQASuite(id) {
  const res = await fetch(`${BASE}/qa/suites/${id}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createQARun(suiteId) {
  const res = await fetch(`${BASE}/qa/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suiteId }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getQARuns(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  ).toString()
  const res = await fetch(`${BASE}/qa/runs${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getQARun(id) {
  const res = await fetch(`${BASE}/qa/runs/${id}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateQARun(id, data) {
  const res = await fetch(`${BASE}/qa/runs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function saveQAResults(runId, results) {
  const res = await fetch(`${BASE}/qa/runs/${runId}/results`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getQABugs() {
  const res = await fetch(`${BASE}/qa/bugs`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getQABug(id) {
  const res = await fetch(`${BASE}/qa/bugs/${id}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createQABug(data) {
  const res = await fetch(`${BASE}/qa/bugs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateQABug(id, data) {
  const res = await fetch(`${BASE}/qa/bugs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function uploadQAScreenshots(bugId, files) {
  const formData = new FormData()
  files.forEach(f => formData.append('screenshots', f))
  const res = await fetch(`${BASE}/qa/bugs/${bugId}/screenshots`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getQAUsers() {
  const res = await fetch(`${BASE}/qa/users`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
export async function getQABugPrompt(bugId) {
  const res = await fetch(`${BASE}/qa/bugs/${bugId}/prompt`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getQABrandTokens() {
  const res = await fetch(`${BASE}/qa/brand-tokens`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── QA Assignments ──
export async function getQAAssignments() {
  const res = await fetch(`${BASE}/qa/assignments`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function saveQAAssignments(assignments) {
  const res = await fetch(`${BASE}/qa/assignments`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignments }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getQAMyAssignments() {
  const res = await fetch(`${BASE}/qa/assignments/me`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── QA Team Dashboard ──
export async function getQATeamDashboard() {
  const res = await fetch(`${BASE}/qa/dashboard/team`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── QA Notifications ──
export async function getQANotifications(unread = false) {
  const qs = unread ? '?unread=true' : ''
  const res = await fetch(`${BASE}/qa/notifications${qs}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function markQANotificationRead(id) {
  const res = await fetch(`${BASE}/qa/notifications/${id}/read`, { method: 'PUT' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function markAllQANotificationsRead() {
  const res = await fetch(`${BASE}/qa/notifications/read-all`, { method: 'PUT' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ── QA Mobile Sessions ──
export async function createQASession(runId) {
  const res = await fetch(`${BASE}/qa/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runId }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getQASession(token) {
  const res = await fetch(`${BASE}/qa/sessions/${token}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function saveQASessionResult(token, results) {
  const res = await fetch(`${BASE}/qa/sessions/${token}/result`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createQASessionBug(token, data) {
  const res = await fetch(`${BASE}/qa/sessions/${token}/bug`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function addQABugComment(bugId, text) {
  const res = await fetch(`${BASE}/qa/bugs/${bugId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getQAMyBugs() {
  const res = await fetch(`${BASE}/qa/bugs/mine`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ─── QA Notepad ─────────────────────────────────────────
export async function getQANotes() {
  const res = await fetch(`${BASE}/qa/notepad`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createQANote(text) {
  const res = await fetch(`${BASE}/qa/notepad`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateQANote(noteId, text) {
  const res = await fetch(`${BASE}/qa/notepad/${noteId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteQANote(noteId) {
  const res = await fetch(`${BASE}/qa/notepad/${noteId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function promoteQANote(noteId, data) {
  const res = await fetch(`${BASE}/qa/notepad/${noteId}/promote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

/* ── Trazabilidad / Checkpoint ── */

export async function getTrazabilidadCheckpoints() {
  const res = await fetch(`${BASE}/trazabilidad/checkpoints`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getTrazabilidadCheckpointsByIp() {
  const res = await fetch(`${BASE}/trazabilidad/checkpoints/by-ip`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getStatusMuestra() {
  const res = await fetch(`${BASE}/trazabilidad/status-muestra`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function scanBarcode(checkpointId, barcode) {
  const res = await fetch(`${BASE}/trazabilidad/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkpointId, barcode }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Error de servidor' }))
    throw new Error(data.error || 'Error al escanear')
  }
  return res.json()
}

export async function getMuestraLogs(muestraId) {
  const res = await fetch(`${BASE}/trazabilidad/muestra/${muestraId}/logs`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getOrdenMuestras(ordenId) {
  const res = await fetch(`${BASE}/trazabilidad/orden/${ordenId}/muestras`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// == CHECKPOINT ADMIN ==
export async function getCheckpointDetail(id) {
  const res = await fetch(`${BASE}/trazabilidad/checkpoints/${id}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createCheckpoint(data) {
  const res = await fetch(`${BASE}/trazabilidad/checkpoints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateCheckpoint(id, data) {
  const res = await fetch(`${BASE}/trazabilidad/checkpoints/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteCheckpoint(id) {
  const res = await fetch(`${BASE}/trazabilidad/checkpoints/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Error al eliminar' }))
    throw new Error(body.error)
  }
  return res.json()
}

export async function getTrazDepartamentos() {
  const res = await fetch(`${BASE}/trazabilidad/catalogos/departamentos`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getTrazCAPs() {
  const res = await fetch(`${BASE}/trazabilidad/catalogos/caps`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getMuestraTrazabilidad(barcode) {
  const res = await fetch(`${BASE}/trazabilidad/muestra/barcode/${encodeURIComponent(barcode)}/trazabilidad`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createQABugsBatch(bugs) {
  const res = await fetch(`${BASE}/qa/bugs/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bugs }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
