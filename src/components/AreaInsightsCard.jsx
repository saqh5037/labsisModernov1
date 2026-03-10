import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyAreaInsights } from '../services/api'

function ZScoreDot({ z }) {
  if (z == null) return <span className="aic-qc-dot aic-qc-dot--unknown" title="Sin datos" />
  if (z <= 2) return <span className="aic-qc-dot aic-qc-dot--ok" title={`z=${z} — OK`} />
  if (z <= 3) return <span className="aic-qc-dot aic-qc-dot--warn" title={`z=${z} — Alerta`} />
  return <span className="aic-qc-dot aic-qc-dot--fail" title={`z=${z} — Fuera de control`} />
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days}d`
  if (days < 30) return `hace ${Math.floor(days / 7)}sem`
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

export default function AreaInsightsCard({ bioanalistaAreas }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  const hasBioAreas = bioanalistaAreas && bioanalistaAreas.length > 0

  useEffect(() => {
    if (!hasBioAreas) { setLoading(false); return }
    getMyAreaInsights()
      .then(r => setData(r.insights))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [hasBioAreas])

  if (!hasBioAreas || loading || !data) return null

  const { equipos, qcStatus, volumen, alarmas, bitacora } = data

  // Group QC by equipo
  const qcByEquipo = {}
  for (const qc of qcStatus) {
    if (!qcByEquipo[qc.equipo_sistema_id]) qcByEquipo[qc.equipo_sistema_id] = { equipo: qc.equipo, niveles: [] }
    qcByEquipo[qc.equipo_sistema_id].niveles.push(qc)
  }

  const totalPruebas = volumen.reduce((s, v) => s + v.pruebas_total, 0)
  const totalSinResultado = volumen.reduce((s, v) => s + v.sin_resultado, 0)
  const totalAlarmas = volumen.reduce((s, v) => s + v.con_alarma, 0)
  const hasQcIssues = qcStatus.some(q => q.z_score > 2)
  const hasUnreadAlarms = alarmas.length > 0

  // Nothing interesting to show?
  if (totalPruebas === 0 && equipos.length === 0 && !hasUnreadAlarms) return null

  return (
    <div className={`dash-card dash-card-animated aic-card${hasQcIssues || hasUnreadAlarms ? ' aic-card--attention' : ''}`}>
      <div className="dash-card-header" onClick={() => setExpanded(e => !e)}>
        <div>
          <div className="dash-card-title">
            Mi Área
            {(hasQcIssues || hasUnreadAlarms) && <span className="aic-alert-dot" />}
          </div>
          <div className="dash-card-subtitle">
            {equipos.length} equipo{equipos.length !== 1 ? 's' : ''} · {totalPruebas} pruebas hoy
          </div>
        </div>
        <button className={`dash-collapse-btn ${!expanded ? 'dash-collapse-btn--collapsed' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="dash-card-body">
          {/* Volumen hoy */}
          {totalPruebas > 0 && (
            <div className="aic-section">
              <div className="aic-stats-row">
                <div className="aic-stat">
                  <span className="aic-stat-value">{totalSinResultado}</span>
                  <span className="aic-stat-label">pendientes</span>
                </div>
                <div className="aic-stat">
                  <span className="aic-stat-value aic-stat-value--ok">{totalPruebas - totalSinResultado}</span>
                  <span className="aic-stat-label">procesadas</span>
                </div>
                {totalAlarmas > 0 && (
                  <div className="aic-stat">
                    <span className="aic-stat-value aic-stat-value--alert">{totalAlarmas}</span>
                    <span className="aic-stat-label">con alarma</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QC de equipos */}
          {Object.keys(qcByEquipo).length > 0 && (
            <div className="aic-section">
              <div className="aic-section-title">Control de Calidad</div>
              {Object.values(qcByEquipo).map((eq) => (
                <div key={eq.equipo} className="aic-equipo-row">
                  <span className="aic-equipo-name">{eq.equipo}</span>
                  <div className="aic-qc-dots">
                    {eq.niveles.map((n, i) => (
                      <ZScoreDot key={i} z={n.z_score ? parseFloat(n.z_score) : null} />
                    ))}
                  </div>
                  <span className="aic-qc-date">{timeAgo(eq.niveles[0]?.fecha)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Alarmas de equipos */}
          {hasUnreadAlarms && (
            <div className="aic-section">
              <div className="aic-section-title aic-section-title--alert">
                Alarmas ({alarmas.length})
              </div>
              {alarmas.slice(0, 3).map(a => (
                <div key={a.id} className="aic-alarm-row">
                  <span className="aic-alarm-equipo">{a.equipo}</span>
                  <span className="aic-alarm-desc">{a.descripcion}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bitácora RACCO */}
          {bitacora.length > 0 && (
            <div className="aic-section">
              <div className="aic-section-title">Bitácora RACCO</div>
              {bitacora.slice(0, 3).map(b => (
                <div key={b.id} className="aic-bitacora-row">
                  <span className="aic-bitacora-tipo">{b.tipo_registro}</span>
                  <span className="aic-bitacora-equipo">{b.equipo}</span>
                  <span className="aic-qc-date">{timeAgo(b.fecha)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Link to="/area-reporte" className="aic-report-link">Ver reporte completo →</Link>
    </div>
  )
}
