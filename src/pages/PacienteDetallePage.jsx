import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPaciente, desactivarPaciente, activarPaciente, deletePaciente } from '../services/api'

export default function PacienteDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ordenes')
  const [showObsModal, setShowObsModal] = useState(false)

  useEffect(() => {
    setLoading(true)
    getPaciente(id)
      .then(d => {
        setData(d)
        if (d.paciente.observaciones && d.paciente.observaciones.trim()) {
          setShowObsModal(true)
        }
      })
      .catch(() => navigate('/pacientes'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) return <div className="pac-loading">Cargando paciente...</div>
  if (!data) return null

  const { paciente: p, ordenes, presupuestos = [], historial, representante, counts = {}, metricas = {} } = data

  const calcAge = (fecha) => {
    if (!fecha) return null
    const born = new Date(fecha)
    const now = new Date()
    let age = now.getFullYear() - born.getFullYear()
    if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--
    return age
  }

  const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const fmtMoney = (n) => {
    if (n == null) return '—'
    return parseFloat(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
  }

  const age = calcAge(p.fecha_nacimiento)

  const statusClass = (color) => {
    if (!color) return 'pac-status-muted'
    const c = color.toLowerCase()
    if (c.includes('16a34a') || c.includes('059669') || c.includes('22c55e') || c.includes('10b981')) return 'pac-status-success'
    if (c.includes('f59e0b') || c.includes('d97706') || c.includes('eab308')) return 'pac-status-warning'
    if (c.includes('ef4444') || c.includes('dc2626') || c.includes('f87171')) return 'pac-status-error'
    if (c.includes('3b82f6') || c.includes('2563eb') || c.includes('60a5fa')) return 'pac-status-info'
    return 'pac-status-muted'
  }

  const canDelete = (counts.ordenes || 0) === 0 && (counts.presupuestos || 0) === 0 && (counts.citas || 0) === 0

  const handleDesactivar = async () => {
    if (!confirm(`¿Desactivar paciente ${p.nombre} ${p.apellido}?`)) return
    try {
      await desactivarPaciente(id)
      const d = await getPaciente(id)
      setData(d)
    } catch (e) {
      alert('Error al desactivar: ' + e.message)
    }
  }

  const handleActivar = async () => {
    if (!confirm(`¿Reactivar paciente ${p.nombre} ${p.apellido}?`)) return
    try {
      await activarPaciente(id)
      const d = await getPaciente(id)
      setData(d)
    } catch (e) {
      alert('Error al activar: ' + e.message)
    }
  }

  const handleEliminar = async () => {
    if (!confirm(`¿ELIMINAR permanentemente a ${p.nombre} ${p.apellido}? Esta accion no se puede deshacer.`)) return
    try {
      await deletePaciente(id)
      navigate('/pacientes')
    } catch (e) {
      alert(e.message)
    }
  }

  // Métricas calculadas
  const calcAntiguedad = () => {
    if (!metricas.primera_visita) return '—'
    const first = new Date(metricas.primera_visita)
    const now = new Date()
    const months = (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth())
    if (months < 1) return '< 1 mes'
    if (months < 12) return `${months} mes${months > 1 ? 'es' : ''}`
    const years = Math.floor(months / 12)
    const rem = months % 12
    return rem > 0 ? `${years}a ${rem}m` : `${years} año${years > 1 ? 's' : ''}`
  }

  const calcFrecuencia = () => {
    if (!metricas.total_ordenes_historico || !metricas.meses_distintos) return '—'
    const freq = (metricas.total_ordenes_historico / metricas.meses_distintos).toFixed(1)
    return `${freq}/mes`
  }

  return (
    <div className="ot-shell">
    <div className="ot-content">
      {/* Modal observaciones auto-popup */}
      {showObsModal && (
        <div className="pac-obs-overlay" onClick={() => setShowObsModal(false)}>
          <div className="pac-obs-modal" onClick={e => e.stopPropagation()}>
            <div className="pac-obs-modal-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>Observaciones del Paciente</span>
            </div>
            <div className="pac-obs-modal-body">{p.observaciones}</div>
            <button className="ot-btn ot-btn-blue" onClick={() => setShowObsModal(false)}>Entendido</button>
          </div>
        </div>
      )}

      {/* Header con acciones prominentes */}
      <div className="pac-detail-header">
        <button className="ot-btn ot-btn-muted" onClick={() => navigate('/pacientes')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Pacientes
        </button>
        <div className="pac-detail-actions">
          <button className="ot-btn ot-btn-blue" onClick={() => navigate(`/ordenes/crear?pacienteId=${id}`)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Crear OT
          </button>
          <button className="ot-btn ot-btn-gold" onClick={() => navigate(`/pacientes/${id}/editar`)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
            Editar
          </button>
        </div>
      </div>

      {/* Patient Hero Card — compacto */}
      <div className="pac-patient-card">
        <span className="pac-avatar">
          {(p.nombre?.[0] || '').toUpperCase()}{(p.apellido?.[0] || '').toUpperCase()}
        </span>
        <div className="pac-pcard-main">
          <div className="pac-pcard-name">
            {p.nombre} {p.apellido} {p.apellido_segundo || ''}
          </div>
          <div className="pac-pcard-demo">
            {p.ci_paciente && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>CI: {p.ci_paciente}</span>}
            <span>{p.sexo === 'M' ? 'Masculino' : 'Femenino'}</span>
            {age !== null && <span>{age} años</span>}
            {(p.telefono_celular || p.telefono) && (
              <span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: '-1px', marginRight: 2 }}>
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
                {p.telefono_celular || p.telefono}
              </span>
            )}
          </div>
          <div className="pac-pcard-badges">
            {p.vip && <span className="pac-badge-vip">VIP</span>}
            {p.empresa && <span className="pac-badge-empresa">Empresa</span>}
            {p.is_empleado && <span className="pac-badge-empresa">Empleado</span>}
            {!p.activo && <span className="pac-badge-inactivo">Inactivo</span>}
            {p.id_paciente_final_fusion && <span className="pac-badge-inactivo">Fusionado</span>}
          </div>
        </div>
        <div className="pac-pcard-status">
          {p.activo ? (
            <button className="ot-btn ot-btn-red" onClick={handleDesactivar}>Desactivar</button>
          ) : (
            <button className="ot-btn ot-btn-green" onClick={handleActivar}>Reactivar</button>
          )}
          {canDelete && (
            <button className="ot-btn ot-btn-red" onClick={handleEliminar} title="Eliminar permanentemente">Eliminar</button>
          )}
        </div>
      </div>

      {/* Dashboard — 4 stat cards */}
      <div className="pac-detail-stats">
        <div className="pac-detail-stat pac-detail-stat--blue">
          <div className="pac-detail-stat-label">Total OTs</div>
          <div className="pac-detail-stat-value">{metricas.total_ordenes_historico || 0}</div>
          <div className="pac-detail-stat-sub">{counts.ordenes || ordenes.length} visibles</div>
        </div>
        <div className="pac-detail-stat pac-detail-stat--amber">
          <div className="pac-detail-stat-label">Última visita</div>
          <div className="pac-detail-stat-value">{fmtDate(metricas.ultima_visita)}</div>
          <div className="pac-detail-stat-sub">{metricas.ultima_visita ? `hace ${calcTimeDiff(metricas.ultima_visita)}` : 'Sin visitas'}</div>
        </div>
        <div className="pac-detail-stat pac-detail-stat--green">
          <div className="pac-detail-stat-label">Antigüedad</div>
          <div className="pac-detail-stat-value">{calcAntiguedad()}</div>
          <div className="pac-detail-stat-sub">Primera: {fmtDate(metricas.primera_visita)}</div>
        </div>
        <div className="pac-detail-stat pac-detail-stat--gold">
          <div className="pac-detail-stat-label">Frecuencia</div>
          <div className="pac-detail-stat-value">{calcFrecuencia()}</div>
          <div className="pac-detail-stat-sub">visitas promedio</div>
        </div>
      </div>

      {/* Dos tarjetas lado a lado */}
      <div className="pac-detail-two-cards">
        {/* Card izquierda: Datos Personales */}
        <div className="pac-info-card">
          <div className="ot-section-label">Datos Personales</div>
          <div className="ot-fg">
            {p.ci_paciente && <><span className="ot-fl">Cedula / CI</span><span className="ot-fv">{p.ci_paciente}</span></>}
            <span className="ot-fl">Sexo</span><span className="ot-fv">{p.sexo === 'M' ? 'Masculino' : 'Femenino'}</span>
            {p.fecha_nacimiento && <><span className="ot-fl">Fecha Nac.</span><span className="ot-fv">{fmtDate(p.fecha_nacimiento)} ({age} años)</span></>}
            {p.telefono && <><span className="ot-fl">Teléfono</span><span className="ot-fv">{p.telefono}</span></>}
            {p.telefono_celular && <><span className="ot-fl">Celular</span><span className="ot-fv">{p.telefono_celular}</span></>}
            {p.email && <><span className="ot-fl">Email</span><span className="ot-fv">{p.email}</span></>}
          </div>
        </div>

        {/* Card derecha: Dirección + Observaciones + Representante */}
        <div className="pac-info-card">
          {(p.direccion1 || p.direccion2 || p.direccion3 || p.direccion4) && (
            <>
              <div className="ot-section-label">Dirección</div>
              <div className="ot-fg">
                {p.direccion1 && <><span className="ot-fl">Ciudad</span><span className="ot-fv">{p.direccion1}</span></>}
                {p.direccion2 && <><span className="ot-fl">Municipio</span><span className="ot-fv">{p.direccion2}</span></>}
                {p.direccion3 && <><span className="ot-fl">Calle</span><span className="ot-fv">{p.direccion3}</span></>}
                {p.direccion4 && <><span className="ot-fl">Número</span><span className="ot-fv">{p.direccion4}</span></>}
                {p.codigo_postal && <><span className="ot-fl">C.P.</span><span className="ot-fv">{p.codigo_postal}</span></>}
              </div>
            </>
          )}

          {p.observaciones && (
            <>
              <div className="ot-sep" style={{ margin: '10px 0' }} />
              <div className="ot-section-label">Observaciones</div>
              <div className="pac-obs-text">{p.observaciones}</div>
            </>
          )}

          {representante && (
            <>
              <div className="ot-sep" style={{ margin: '10px 0' }} />
              <div className="ot-section-label">Representante / Tutor</div>
              <div className="ot-fg">
                <span className="ot-fl">Nombre</span><span className="ot-fv">{representante.nombre} {representante.apellido}</span>
                <span className="ot-fl">Vínculo</span><span className="ot-fv">{representante.vinculo || '—'}</span>
                <span className="ot-fl">CI</span><span className="ot-fv">{representante.ci_paciente || '—'}</span>
              </div>
            </>
          )}

          {!p.direccion1 && !p.direccion2 && !p.direccion3 && !p.direccion4 && !p.observaciones && !representante && (
            <div className="ot-section-label" style={{ color: 'var(--text-4)', fontStyle: 'italic' }}>Sin datos adicionales</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="ot-tab-row">
        <button className={`ot-tab-btn ${activeTab === 'ordenes' ? 'active' : ''}`} onClick={() => setActiveTab('ordenes')}>
          Órdenes ({counts.ordenes || ordenes.length})
        </button>
        <button className={`ot-tab-btn ${activeTab === 'presupuestos' ? 'active' : ''}`} onClick={() => setActiveTab('presupuestos')}>
          Presupuestos ({counts.presupuestos || presupuestos.length})
        </button>
        <button className={`ot-tab-btn ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>
          Historial ({historial.length})
        </button>
      </div>

      {/* Tab: Ordenes */}
      {activeTab === 'ordenes' && (
        <div className="pac-tab-content">
          {ordenes.length === 0 ? (
            <p className="pac-empty">Este paciente no tiene órdenes de trabajo</p>
          ) : (
            <table className="pac-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Fecha</th>
                  <th>Status</th>
                  <th>Procedencia</th>
                  <th>Pruebas</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map(ot => (
                  <tr key={ot.id} onClick={() => navigate(`/ordenes/${ot.numero}`)}>
                    <td className="pac-cell-ci">{ot.numero}</td>
                    <td>{fmtDate(ot.fecha)}</td>
                    <td>
                      <span className={`pac-status-badge ${statusClass(ot.color)}`}>
                        {ot.status}
                      </span>
                    </td>
                    <td>{ot.procedencia || '—'}</td>
                    <td>{ot.total_pruebas}</td>
                    <td className="pac-cell-actions">
                      <button
                        className="pac-action-icon"
                        title="Ver orden"
                        onClick={(e) => { e.stopPropagation(); navigate(`/ordenes/${ot.numero}`) }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 16 16 12 12 8"/>
                          <line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                      </button>
                      <button
                        className="pac-action-icon"
                        title="Lab / Resultados"
                        onClick={(e) => { e.stopPropagation(); navigate(`/ordenes/${ot.numero}/lab`) }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5V2"/>
                          <path d="M8.5 2h7"/>
                          <path d="M14.5 16h-5"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Presupuestos */}
      {activeTab === 'presupuestos' && (
        <div className="pac-tab-content">
          {presupuestos.length === 0 ? (
            <p className="pac-empty">Este paciente no tiene presupuestos</p>
          ) : (
            <table className="pac-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Total</th>
                  <th>Entregada</th>
                </tr>
              </thead>
              <tbody>
                {presupuestos.map(pr => (
                  <tr key={pr.id}>
                    <td className="pac-cell-ci">{pr.numero}</td>
                    <td>{fmtDate(pr.fecha)}</td>
                    <td>{fmtMoney(pr.monto_total)}</td>
                    <td>{fmtMoney(pr.total_factura)}</td>
                    <td>
                      <span className={`pac-status-badge ${pr.entregada ? 'pac-status-success' : 'pac-status-muted'}`}>
                        {pr.entregada ? 'Sí' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Historial */}
      {activeTab === 'historial' && (
        <div className="pac-tab-content">
          {historial.length === 0 ? (
            <p className="pac-empty">Sin historial de acciones</p>
          ) : (
            <table className="pac-table">
              <thead>
                <tr>
                  <th style={{ width: 180 }}>Fecha</th>
                  <th style={{ width: 150 }}>Usuario</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {historial.map(h => (
                  <tr key={h.id}>
                    <td>{h.fecha ? new Date(h.fecha).toLocaleString('es-MX') : '—'}</td>
                    <td>{h.usuario || '—'}</td>
                    <td className="pac-cell-action">{h.accion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
    </div>
  )
}

function calcTimeDiff(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days === 0) return 'hoy'
  if (days === 1) return '1 día'
  if (days < 30) return `${days} días`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mes${months > 1 ? 'es' : ''}`
  const years = Math.floor(months / 12)
  return `${years} año${years > 1 ? 's' : ''}`
}
