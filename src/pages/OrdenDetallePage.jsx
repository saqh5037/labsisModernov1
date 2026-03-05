import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrdenDetalle, getLaboratorio, updateOrdenInfoClinica, updateOrdenFechaToma, updateOrdenStat, abortarOrden, activarOrden, marcarMuestrasNoEntregadas } from '../services/api'
import Modal from '../components/Modal'
import DoctorModal from '../components/DoctorModal'
import flatpickr from 'flatpickr'
import { Spanish } from 'flatpickr/dist/l10n/es.js'

/* ── SVG Icons ── */
const Ico = ({ d, vb = '0 0 24 24', w = 1.8, size = 16 }) => (
  <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
)
const IcoBack = () => <Ico d={<><polyline points="15 18 9 12 15 6"/></>} w={2} />
const IcoPrinter = () => <Ico d={<><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>} />
const IcoEye = () => <Ico d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>} size={13} w={1.9} />
const IcoEdit = () => <Ico d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" size={13} w={1.9} />
const IcoTrash = () => <Ico d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>} size={13} w={1.9} />
const IcoPlus = () => <Ico d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} size={14} w={2} />
const IcoPhone = () => <Ico d={<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></>} size={12} />
const IcoMail = () => <Ico d={<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>} size={12} />

/* ── Utilities ── */
const calcAge = (bd) => {
  if (!bd) return '—'
  const b = new Date(bd), n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return `${a} años`
}
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : ''
const dotColor = (c) => (c && c.startsWith('#')) ? c : '#94a3b8'

const stBadge = (id) => {
  const m = {
    4: { bg: '#ecfdf5', text: '#059669' },
    1: { bg: '#fef2f2', text: '#dc2626' },
    2: { bg: '#fffbeb', text: '#d97706' },
    3: { bg: '#fef2f2', text: '#dc2626' },
    5: { bg: '#fef2f2', text: '#dc2626' },
    6: { bg: '#f1f5f9', text: '#6b7280' },
    8: { bg: '#fdf2f8', text: '#db2777' },
    9: { bg: '#f0f9ff', text: '#0ea5e9' },
    10: { bg: '#f0f9ff', text: '#0ea5e9' },
  }
  return m[id] || { bg: '#f1f5f9', text: '#94a3b8' }
}

const ALL_TABS = [
  { id: 'general', label: 'Información General' },
  { id: 'historico', label: 'Histórico' },
  { id: 'preguntas', label: 'Preguntas Pre-analíticas' },
  { id: 'docadj', label: 'Documentos Adjuntos' },
  { id: 'resadj', label: 'Resultados Adjuntos' },
  { id: 'docpre', label: 'Documentos Preanalíticos' },
]

/* ── Ripple effect for buttons ── */
function addRipple(e) {
  const btn = e.currentTarget
  const rect = btn.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const ripple = document.createElement('span')
  ripple.className = 'ot-ripple'
  ripple.style.width = ripple.style.height = size + 'px'
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px'
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px'
  btn.appendChild(ripple)
  setTimeout(() => ripple.remove(), 600)
}

export default function OrdenDetallePage() {
  const { numero } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [labConfig, setLabConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('general')
  // Modal states
  const [doctorOpen, setDoctorOpen] = useState(false)
  const [infoClinicaOpen, setInfoClinicaOpen] = useState(false)
  const [infoClinicaText, setInfoClinicaText] = useState('')
  const [fechaTomaOpen, setFechaTomaOpen] = useState(false)
  const [fechaTomaValue, setFechaTomaValue] = useState('')
  const [statOpen, setStatOpen] = useState(false)
  const [abortOpen, setAbortOpen] = useState(false)
  const [masOpen, setMasOpen] = useState(false)
  const [habilitarOpen, setHabilitarOpen] = useState(false)
  const [noeOpen, setNoeOpen] = useState(false)
  const masRef = useRef()
  const fechaInputRef = useRef()
  const fpRef = useRef()

  // Load data
  const loadData = useCallback(() => {
    setLoading(true)
    getOrdenDetalle(numero).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [numero])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { getLaboratorio().then(setLabConfig).catch(() => {}) }, [])

  // Close "...Mas" on outside click
  useEffect(() => {
    if (!masOpen) return
    const handler = (e) => { if (masRef.current && !masRef.current.contains(e.target)) setMasOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [masOpen])

  // Init flatpickr when fecha toma modal opens
  useEffect(() => {
    if (fechaTomaOpen && fechaInputRef.current) {
      fpRef.current = flatpickr(fechaInputRef.current, {
        enableTime: true, dateFormat: 'd/m/Y H:i', maxDate: 'today',
        locale: Spanish, time_24hr: true,
        defaultDate: data?.fecha_toma_muestra ? new Date(data.fecha_toma_muestra) : null,
        onChange: ([date]) => { if (date) setFechaTomaValue(date.toISOString()) },
      })
      return () => { if (fpRef.current) fpRef.current.destroy() }
    }
  }, [fechaTomaOpen, data?.fecha_toma_muestra])

  const badge = data ? stBadge(data.status_id) : { bg: '#94a3b8', text: '#fff' }
  const sid = data?.status_id
  const isAborted = sid === 6
  // Labsis: Edit solo status 1 (Activo) u 8 (Por Validar)
  const canEdit = data && [1, 8].includes(sid)
  // Labsis: Abortar solo status 1,3,5,8 + roles ANA/REC/ADM/FIN
  const canAbort = data && [1, 3, 5, 8].includes(sid)
  // Labsis: Reportar/Analizar — status != 6 + roles ANA/ADM
  const canReport = data && !isAborted
  // Labsis: Imprimir OT — status != 2 ni 4 (esos usan Recibo)
  const canPrintOT = data && sid !== 2 && sid !== 4
  // Labsis: Recibo — status != 6 (permiso ot-show_boton_recibo, simplificado)
  const canRecibo = data && !isAborted

  // Filter tabs by lab config
  const tabs = ALL_TABS.filter(t => {
    if (t.id === 'docadj' && labConfig?.documentos_adjuntos_ordentrabajo === false) return false
    if (t.id === 'resadj' && labConfig?.resultados_adjuntos === false) return false
    if (t.id === 'docpre' && labConfig?.documentos_preanaliticos === false) return false
    return true
  })

  const printLabels = useCallback(() => {
    document.body.classList.add('print-labels')
    setTimeout(() => {
      window.print()
      document.body.classList.remove('print-labels')
    }, 100)
  }, [])

  // Modal actions
  const saveInfoClinica = async () => {
    try {
      await updateOrdenInfoClinica(numero, infoClinicaText)
      setInfoClinicaOpen(false)
      loadData()
    } catch (e) { alert('Error al guardar') }
  }

  const saveFechaToma = async () => {
    if (!fechaTomaValue) return
    try {
      await updateOrdenFechaToma(numero, fechaTomaValue)
      setFechaTomaOpen(false)
      loadData()
    } catch (e) { alert('Error al guardar') }
  }

  const saveStat = async () => {
    try {
      await updateOrdenStat(numero)
      setStatOpen(false)
      loadData()
    } catch (e) { alert('Error al guardar') }
  }

  const saveAbortar = async () => {
    try {
      await abortarOrden(numero)
      setAbortOpen(false)
      loadData()
    } catch (e) { alert('Error al abortar') }
  }

  const saveHabilitar = async () => {
    try {
      await activarOrden(numero)
      setHabilitarOpen(false)
      loadData()
    } catch (e) { alert('Error al activar orden') }
  }

  const saveNoe = async () => {
    try {
      await marcarMuestrasNoEntregadas(numero)
      setNoeOpen(false)
      loadData()
    } catch (e) { alert('Error al marcar muestras') }
  }

  return (
    <div className="ot-detail-content">
      <div className="ot-local-toolbar">
        <button className="ot-nav-back" onClick={() => navigate('/ordenes')}><IcoBack /> Órdenes de Trabajo</button>
      </div>
        {loading ? (
          <div className="ot-center"><div className="od-spinner" /> Cargando orden...</div>
        ) : !data ? (
          <div className="ot-center">Orden no encontrada</div>
        ) : (
          <>
            {/* ═══ TÍTULO ═══ */}
            <div className="ot-panel-header">
              <span className="ot-panel-title">Orden de Trabajo {numero}</span>
              <span className="ot-header-badges">
                {data.stat && <span className="ot-stat-badge">STAT</span>}
                <span className="ot-status-badge" style={{ background: badge.bg, color: badge.text }}>
                  {data.entregada && <span className="ot-check">✓</span>}
                  {data.status}
                </span>
              </span>
            </div>

            {/* ═══ TABS ═══ */}
            <div className="ot-tab-row">
              {tabs.map(t => (
                <button key={t.id} className={`ot-tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
              ))}
            </div>

            {/* ═══ PANEL ═══ */}
            <div className="ot-panel">
              {tab === 'general' && (
                <div className="ot-two-col">
                  {/* ── IZQUIERDA 70% ── */}
                  <div className="ot-left">
                    <div className="ot-patient-card">
                      <div className="ot-pname">{data.paciente}</div>
                      <div className="ot-pid">{data.ci_paciente} <span className="ot-pid-icon" title="Ver paciente">↗</span></div>
                      <div className="ot-pdemo">
                        <span>Expediente: <strong>{data.num_historia || '---'}</strong></span>
                        <span>Edad: <strong>{calcAge(data.fecha_nacimiento)}</strong></span>
                        <span>Fecha de Nacimiento: <strong>{fmtDate(data.fecha_nacimiento)}</strong></span>
                        <span>Sexo: <strong>{data.sexo === 'M' ? 'Masculino' : data.sexo === 'F' ? 'Femenino' : '—'}</strong></span>
                      </div>
                      {(data.telefono || data.email) && (
                        <div className="ot-pcontact">
                          {data.telefono && <span><IcoPhone /> {data.telefono}</span>}
                          {data.telefono_celular && <span><IcoPhone /> {data.telefono_celular}</span>}
                          {data.email && <span><IcoMail /> {data.email}</span>}
                        </div>
                      )}
                    </div>

                    <div className="ot-section-label">Datos de la Orden</div>
                    <div className="ot-fg">
                      <R l="Fecha:" v={fmtDateTime(data.fecha)} />
                      <R l="Número Ingreso:" v={data.num_ingreso || '—'} />
                      <R l="Precio:" v={data.precio != null ? `$ ${Number(data.precio).toFixed(2)}` : '$ 0.00'} />
                      <R l="Procedencia:" v={data.procedencia ? `[${data.proc_codigo || ''}] ${data.procedencia}` : '—'} />
                      <R l="Departamento:" v={data.departamento || '—'} />
                      <R l="Servicio Médico:" v={data.servicio_medico || '—'} />
                      <R l="Habitación:" v={data.habitacion || ''} />
                      <R l="Doctor:" v={data.medico_nombre?.trim() || ''}
                        link={!data.medico_nombre?.trim()} linkText="Agregar Doctor"
                        onClick={() => setDoctorOpen(true)} />
                    </div>

                    <div className="ot-sep" />

                    <div className="ot-section-label">Información Adicional</div>
                    <div className="ot-fg">
                      <Rf l="Observaciones:" v={data.observaciones || ''} />
                      <Rf l="Info. Clínica:" v={data.informacion_clinica || ''}
                        link linkText={data.informacion_clinica ? 'Ver' : 'Anexar Información Clínica'}
                        onClick={() => { setInfoClinicaText(data.informacion_clinica || ''); setInfoClinicaOpen(true) }} />
                      <Rf l="Cubículo Toma:" v="" />
                      <R l="Creado por:" v={data.usuario_registro || '—'} />
                      <R l="Fecha Toma:" v={data.fecha_toma_muestra ? fmtDateTime(data.fecha_toma_muestra) : ''}
                        link linkText={data.fecha_toma_muestra ? fmtDateTime(data.fecha_toma_muestra) : 'Agregar Fecha'}
                        onClick={() => setFechaTomaOpen(true)} />
                    </div>

                    <div className="ot-sep" />
                    <div className="ot-fg"><Rf l="Diagnóstico:" v="" /></div>
                    {labConfig?.show_stat && !data.stat && (
                      <div className="ot-est-stat-link" onClick={() => setStatOpen(true)} style={{ cursor: 'pointer' }}>
                        <IcoPlus /> Agregar STAT (Urgencia) a Requisición
                      </div>
                    )}
                  </div>

                  {/* ── DERECHA 30%: Estructura ── */}
                  <div className="ot-right">
                    <div className="ot-est-head">Estructura</div>
                    <div className="ot-est-list">
                      {(data?.pruebas || []).map(p => (
                        <div key={p.id} className="ot-pr">
                          <span className="ot-pr-dot" style={{ background: dotColor(p.color) }} />
                          <span className="ot-pr-name">
                            {p.prueba}{p.abreviacion ? ` (${p.abreviacion})` : ''}
                          </span>
                          <span className="ot-pr-price">$ {p.precio != null ? Number(p.precio).toFixed(2) : '0.00'}</span>
                          <span className="ot-pr-actions">
                            <button className="ot-pr-act" title="Ver"><IcoEye /></button>
                            <button className="ot-pr-act" title="Pausar"><IcoEdit /></button>
                            <button className="ot-pr-act" title="Eliminar"><IcoTrash /></button>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'historico' && <div className="ot-tab-content"><div className="ot-tab-empty">Sin registros de histórico</div></div>}
              {tab === 'preguntas' && (
                <div className="ot-tab-content">
                  <div className="ot-tab-subtitle">Preguntas Pre-analíticas:</div>
                  <table className="ot-simple-table">
                    <thead><tr><th>Pregunta</th><th>Respuesta</th></tr></thead>
                    <tbody><tr><td colSpan="2" className="ot-tab-empty">Sin preguntas registradas</td></tr></tbody>
                  </table>
                </div>
              )}
              {tab === 'docadj' && <div className="ot-tab-content"><div className="ot-tab-empty">Sin documentos adjuntos</div></div>}
              {tab === 'resadj' && (
                <div className="ot-tab-content">
                  <div className="ot-upload-row">
                    <label>Archivo*</label>
                    <label className="ot-file-input">
                      <IcoPlus /> Seleccionar PDF
                      <input type="file" accept=".pdf" />
                    </label>
                    <span className="ot-upload-hint">Formatos aceptados: PDF</span>
                  </div>
                  <button className="ot-btn ot-btn-gold ot-btn-sm" onClick={addRipple}>Cargar</button>
                  <div className="ot-sep" />
                  <div className="ot-upload-row">
                    <label>Archivo*</label>
                    <label className="ot-file-input">
                      <IcoPlus /> Seleccionar HL7
                      <input type="file" accept=".hl7" />
                    </label>
                    <span className="ot-upload-hint">Formatos aceptados: HL7</span>
                  </div>
                  <button className="ot-btn ot-btn-gold ot-btn-sm" onClick={addRipple}>Cargar</button>
                </div>
              )}
              {tab === 'docpre' && <div className="ot-tab-content"><div className="ot-tab-empty">Sin documentos preanalíticos</div></div>}
            </div>

            {/* ═══ BOTONES ═══ */}
            <div className="ot-actions">
              <button className="ot-btn ot-btn-gold" onClick={(e) => { addRipple(e); navigate('/ordenes') }}>REGRESAR</button>
              {canPrintOT && <button className="ot-btn ot-btn-gold" onClick={(e) => { addRipple(e); window.open(`/ordenes/${numero}/print`, '_blank') }}>IMPRIMIR</button>}
              {canRecibo && <button className="ot-btn ot-btn-gold" onClick={(e) => { addRipple(e); window.open(`/ordenes/${numero}/recibo`, '_blank') }}>RECIBO CRÉDITO</button>}
              {canEdit && <button className="ot-btn ot-btn-green" onClick={(e) => { addRipple(e); navigate(`/ordenes/${numero}/editar`) }}>EDITAR</button>}
              {canAbort && <button className="ot-btn ot-btn-muted" onClick={(e) => { addRipple(e); setAbortOpen(true) }}>ABORTAR</button>}
              {isAborted && <button className="ot-btn ot-btn-green" onClick={(e) => { addRipple(e); setHabilitarOpen(true) }}>HABILITAR</button>}
              {canReport && <button className="ot-btn ot-btn-green" onClick={(e) => { addRipple(e); navigate(`/ordenes/${numero}/lab`) }}>REPORTAR</button>}

              {/* "...Mas" context menu */}
              <span className="ot-btn-more" style={{ position: 'relative' }} ref={masRef}>
                <span onClick={() => setMasOpen(!masOpen)}>...Mas</span>
                {masOpen && (
                  <div className="ot-ctx-menu" style={{ top: '100%', right: 0 }}>
                    <div className="ot-ctx-item" onClick={() => setMasOpen(false)}>Historial de Impresiones</div>
                    {!isAborted && <div className="ot-ctx-item" onClick={() => { setMasOpen(false); navigate(`/ordenes/${numero}/editar`) }}>Editar (ADM)</div>}
                    <div className="ot-ctx-sep" />
                    {canAbort && <div className="ot-ctx-item" onClick={() => { setMasOpen(false); setAbortOpen(true) }}>Abortar</div>}
                    {isAborted && <div className="ot-ctx-item" onClick={() => { setMasOpen(false); setHabilitarOpen(true) }}>Habilitar</div>}
                    <div className="ot-ctx-item" onClick={() => setMasOpen(false)}>Enviar a HIS</div>
                    <div className="ot-ctx-sep" />
                    <div className="ot-ctx-item" onClick={() => setMasOpen(false)}>Constancia</div>
                    <div className="ot-ctx-item" onClick={() => setMasOpen(false)}>Portada</div>
                  </div>
                )}
              </span>
              <span className="ot-btn-link-hl7">Descarga HL7 OT Request</span>
            </div>

            {/* ═══ MUESTRAS ═══ */}
            <div className="ot-barcode-bar">Imprimir Códigos de Barras</div>
            <div className="ot-muestras-panel">
              <div className="ot-muestras-head">
                Etiqueta general de la Orden de Trabajo:
                <button className="ot-print-ico" title="Imprimir etiqueta general" onClick={printLabels}><IcoPrinter /></button>
              </div>
              <table className="ot-mu-table">
                <thead>
                  <tr>
                    <th>Muestra</th><th>Contenedor</th><th>Destino</th>
                    <th>Código de Barras</th><th>Cantidad</th>
                    <th className="text-center">Imprimir</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.muestras || []).map(mu => (
                    <tr key={mu.id}>
                      <td className="ot-mu-t">{mu.tipo_muestra || '—'}</td>
                      <td>{mu.contenedor || '—'}</td>
                      <td>—</td>
                      <td>
                        <span className="ot-mu-bc">{mu.barcode}</span>
                        {mu.nomenclatura && <div className="ot-mu-nom" title={mu.nomenclatura}>{mu.nomenclatura}</div>}
                      </td>
                      <td className="text-center">{mu.cantidad}</td>
                      <td className="text-center"><button className="ot-print-ico" onClick={() => window.open(`/ordenes/${numero}/etiqueta?muestra=${mu.id}`, '_blank', 'width=300,height=200')}><IcoPrinter /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="ot-muestras-footer">
                <button className="ot-btn ot-btn-gold ot-btn-sm" onClick={(e) => { addRipple(e); window.open(`/ordenes/${numero}/etiqueta`, '_blank', 'width=300,height=400') }}>Imprimir Etiquetas</button>
                <button className="ot-muestras-link" onClick={() => window.open(`/ordenes/${numero}/instrucciones`, '_blank')}>IMPRIMIR INSTRUCCIONES DE TOMA</button>
                <button className="ot-muestras-link" onClick={() => window.open(`/ordenes/${numero}/preguntas`, '_blank')}>IMPRIMIR PREGUNTAS PRE-ANALÍTICAS</button>
                <button className="ot-btn ot-btn-gold ot-btn-sm" onClick={(e) => { addRipple(e); setNoeOpen(true) }}>Marcar Muestras No Entregadas</button>
              </div>
            </div>

            {/* ═══ MODALES ═══ */}
            <DoctorModal open={doctorOpen} onClose={() => setDoctorOpen(false)} numero={numero} onSaved={loadData} />

            {/* Info Clínica */}
            <Modal open={infoClinicaOpen} onClose={() => setInfoClinicaOpen(false)} title="Información Clínica" width={400}>
              <label className="ot-modal-label">Información clínica:</label>
              <textarea className="ot-modal-input ot-modal-textarea" rows={8}
                value={infoClinicaText} onChange={e => setInfoClinicaText(e.target.value)} />
              <div className="ot-modal-actions">
                <button className="ot-btn ot-btn-gold ot-btn-sm" onClick={saveInfoClinica}>Guardar</button>
                <button className="ot-btn ot-btn-muted ot-btn-sm" onClick={() => setInfoClinicaOpen(false)}>Cancelar</button>
              </div>
            </Modal>

            {/* Fecha Toma Muestra */}
            <Modal open={fechaTomaOpen} onClose={() => setFechaTomaOpen(false)} title="Fecha Toma de Muestra" width={320}>
              <label className="ot-modal-label">Fecha y hora:</label>
              <input className="ot-modal-input" ref={fechaInputRef} placeholder="dd/mm/yyyy HH:mm" readOnly />
              <div className="ot-modal-actions">
                <button className="ot-btn ot-btn-gold ot-btn-sm" onClick={saveFechaToma} disabled={!fechaTomaValue}>Guardar</button>
                <button className="ot-btn ot-btn-muted ot-btn-sm" onClick={() => setFechaTomaOpen(false)}>Cancelar</button>
              </div>
            </Modal>

            {/* STAT */}
            <Modal open={statOpen} onClose={() => setStatOpen(false)} title="Agregar Urgencia (STAT)" width={400}>
              <p className="ot-modal-text">
                ¿Desea agregar la condición de Urgencia (STAT) a la Orden de Trabajo?
              </p>
              <div className="ot-modal-actions">
                <button className="ot-btn ot-btn-red ot-btn-sm" onClick={saveStat}>Confirmar</button>
                <button className="ot-btn ot-btn-muted ot-btn-sm" onClick={() => setStatOpen(false)}>Cancelar</button>
              </div>
            </Modal>

            {/* Abortar */}
            <Modal open={abortOpen} onClose={() => setAbortOpen(false)} title="Abortar Orden de Trabajo" width={400}>
              <p className="ot-modal-text">
                Se cambiará el estado de la orden a <strong>Abortada</strong>. Esta acción no se puede deshacer fácilmente.
              </p>
              <div className="ot-modal-actions">
                <button className="ot-btn ot-btn-red ot-btn-sm" onClick={saveAbortar}>Abortar</button>
                <button className="ot-btn ot-btn-muted ot-btn-sm" onClick={() => setAbortOpen(false)}>Cancelar</button>
              </div>
            </Modal>

            {/* Habilitar (activar orden abortada) */}
            <Modal open={habilitarOpen} onClose={() => setHabilitarOpen(false)} title="Habilitar Orden de Trabajo" width={400}>
              <p className="ot-modal-text">
                Se cambiará el estado de la orden de <strong>Abortada</strong> a <strong>Activo</strong>.
              </p>
              <div className="ot-modal-actions">
                <button className="ot-btn ot-btn-green ot-btn-sm" onClick={saveHabilitar}>Habilitar</button>
                <button className="ot-btn ot-btn-muted ot-btn-sm" onClick={() => setHabilitarOpen(false)}>Cancelar</button>
              </div>
            </Modal>

            {/* Marcar Muestras No Entregadas */}
            <Modal open={noeOpen} onClose={() => setNoeOpen(false)} title="Marcar Muestras No Entregadas" width={400}>
              <p className="ot-modal-text">
                ¿Está seguro de marcar <strong>todas las muestras</strong> de esta orden como <strong>No Entregadas</strong>?
              </p>
              <div className="ot-modal-actions">
                <button className="ot-btn ot-btn-red ot-btn-sm" onClick={saveNoe}>Aceptar</button>
                <button className="ot-btn ot-btn-muted ot-btn-sm" onClick={() => setNoeOpen(false)}>Cancelar</button>
              </div>
            </Modal>
          </>
        )}
    </div>
  )
}

function R({ l, v, link, linkText, onClick }) {
  return (
    <>
      <div className="ot-fl">{l}</div>
      <div className={`ot-fv ${link ? 'ot-link' : ''}`} onClick={link ? onClick : undefined}>
        {link ? (linkText || v) : (v || '')}
      </div>
    </>
  )
}

function Rf({ l, v, link, linkText, onClick }) {
  return (
    <div className="ot-fg-full">
      <div className="ot-fl">{l}</div>
      <div className={`ot-fv ${link ? 'ot-link' : ''}`} onClick={link ? onClick : undefined}>
        {link ? (linkText || v) : (v || '')}
      </div>
    </div>
  )
}
