import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAreaReporte } from '../services/api'

const RANGOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ayer', label: 'Ayer' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
]

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function fmtDateFull(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── Cápsulas Grid ── */
function CapsulasGrid({ c }) {
  const caps = [
    { label: 'Ordenes', value: c.ordenes, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'var(--accent, #3b82f6)' },
    { label: 'Pruebas', value: `${c.validadas}/${c.pruebas}`, icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', color: c.pruebas > 0 && c.validadas / c.pruebas >= 0.8 ? '#16a34a' : 'var(--accent, #3b82f6)' },
    { label: 'Validacion', value: `${c.pctValidacion}%`, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: c.pctValidacion >= 80 ? '#16a34a' : c.pctValidacion >= 50 ? '#f59e0b' : '#dc2626' },
    { label: 'QC Alertas', value: c.equiposQcFuera, icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: c.equiposQcFuera > 0 ? '#dc2626' : '#16a34a' },
    { label: 'Alarmas', value: c.alarmasNoLeidas, icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', color: c.alarmasNoLeidas > 0 ? '#dc2626' : 'var(--text-3, #94a3b8)' },
    { label: 'RACCO', value: c.raccoEventos, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', color: 'var(--text-3, #94a3b8)' },
  ]

  return (
    <div className="area-rpt-capsulas">
      {caps.map(cap => (
        <div key={cap.label} className="area-rpt-capsule">
          <svg className="area-rpt-capsule-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke={cap.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d={cap.icon} />
          </svg>
          <div className="area-rpt-capsule-value" style={{ color: cap.color }}>{cap.value}</div>
          <div className="area-rpt-capsule-label">{cap.label}</div>
        </div>
      ))}
    </div>
  )
}

/* ── Volumen Bar Chart (SVG) ── */
function VolumenChart({ data }) {
  if (!data || data.length === 0) return <div className="area-rpt-empty">Sin actividad en el periodo</div>

  const W = 600, H = 140, PAD_B = 24, PAD_T = 8
  const barW = Math.min(32, Math.max(8, (W - 20) / data.length - 4))
  const maxVal = Math.max(...data.map(d => parseInt(d.pruebas_total)), 1)
  const chartH = H - PAD_B - PAD_T

  return (
    <svg className="area-rpt-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {/* grid lines */}
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1="0" y1={PAD_T + chartH * (1 - f)} x2={W} y2={PAD_T + chartH * (1 - f)}
          stroke="var(--border-light, rgba(0,0,0,0.06))" strokeWidth="0.5" />
      ))}
      {data.map((d, i) => {
        const x = 10 + i * ((W - 20) / data.length) + ((W - 20) / data.length - barW) / 2
        const total = parseInt(d.pruebas_total)
        const validadas = parseInt(d.validadas)
        const pct = total > 0 ? validadas / total : 0
        const h = (total / maxVal) * chartH
        const y = PAD_T + chartH - h
        const fill = pct >= 0.9 ? '#16a34a' : pct < 0.5 ? '#f59e0b' : 'var(--accent, #3b82f6)'
        const label = fmtDate(d.dia)
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx="2" fill={fill} opacity="0.8">
              <title>{`${label}: ${total} pruebas (${Math.round(pct * 100)}% validadas)`}</title>
            </rect>
            {data.length <= 14 && (
              <text x={x + barW / 2} y={H - 4} textAnchor="middle"
                fontSize="8" fill="var(--text-3, #94a3b8)">{label}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* ── QC Trend Section ── */
function QCTrendSection({ data, equipos }) {
  // Group by equipo
  const byEquipo = {}
  for (const row of data) {
    if (!byEquipo[row.equipo_sistema_id]) byEquipo[row.equipo_sistema_id] = { nombre: row.equipo, points: [] }
    byEquipo[row.equipo_sistema_id].points.push({ dia: row.dia, z: parseFloat(row.z_avg) })
  }

  const entries = Object.entries(byEquipo)
  if (entries.length === 0) return <div className="area-rpt-empty">Sin datos QC en el periodo</div>

  const show = entries.slice(0, 8)
  const more = entries.length - show.length

  return (
    <div className="area-rpt-qc-list">
      {show.map(([id, eq]) => {
        const pts = eq.points
        const hasIssue = pts.some(p => p.z > 2)
        // Drift detection: compare first half avg vs second half avg
        const mid = Math.floor(pts.length / 2) || 1
        const firstHalf = pts.slice(0, mid).reduce((s, p) => s + p.z, 0) / mid
        const secondHalf = pts.slice(mid).reduce((s, p) => s + p.z, 0) / (pts.length - mid || 1)
        const drift = secondHalf - firstHalf
        const driftLabel = drift > 0.5 ? ' (drift +)' : drift < -0.5 ? ' (drift -)' : ''

        return (
          <div key={id} className="area-rpt-qc-item">
            <div className="area-rpt-qc-header">
              <span className={`area-rpt-qc-name ${hasIssue ? 'area-rpt-qc-name--warn' : ''}`}>
                {eq.nombre}
              </span>
              {driftLabel && <span className="area-rpt-qc-drift">{driftLabel}</span>}
            </div>
            <Sparkline points={pts} />
          </div>
        )
      })}
      {more > 0 && <div className="area-rpt-more">y {more} equipo{more !== 1 ? 's' : ''} mas</div>}
    </div>
  )
}

/* ── QC Sparkline (SVG) ── */
function Sparkline({ points }) {
  if (points.length === 0) return null
  const W = 120, H = 28, PAD = 2
  const maxZ = Math.max(...points.map(p => p.z), 3)
  const scaleX = (W - PAD * 2) / Math.max(points.length - 1, 1)
  const scaleY = (H - PAD * 2) / maxZ

  const polyline = points.map((p, i) => `${PAD + i * scaleX},${H - PAD - p.z * scaleY}`).join(' ')
  const thresholdY = H - PAD - 2 * scaleY
  const color = points.some(p => p.z > 2) ? '#dc2626' : '#16a34a'

  return (
    <svg className="area-rpt-sparkline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <line x1={PAD} y1={thresholdY} x2={W - PAD} y2={thresholdY}
        stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="3,2" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      {points.length <= 7 && points.map((p, i) => (
        <circle key={i} cx={PAD + i * scaleX} cy={H - PAD - p.z * scaleY} r="2"
          fill={p.z > 2 ? '#dc2626' : '#16a34a'}>
          <title>{`${fmtDate(p.dia)}: z=${p.z}`}</title>
        </circle>
      ))}
    </svg>
  )
}

/* ── RACCO Section ── */
function RaccoSection({ racco }) {
  const { counts, recientes } = racco
  if (counts.length === 0 && recientes.length === 0) return <div className="area-rpt-empty">Sin eventos RACCO</div>

  return (
    <div>
      {counts.length > 0 && (
        <div className="area-rpt-racco-counts">
          {counts.map(c => (
            <div key={c.tipo_registro} className="area-rpt-racco-pill">
              <span className="area-rpt-racco-tipo">{c.tipo_registro}</span>
              <span className="area-rpt-racco-num">{c.total}</span>
            </div>
          ))}
        </div>
      )}
      {recientes.length > 0 && (
        <div className="area-rpt-racco-timeline">
          {recientes.map(r => (
            <div key={r.id} className="area-rpt-racco-event">
              <span className="area-rpt-racco-event-tipo">{r.tipo_registro}</span>
              <span className="area-rpt-racco-event-equipo">{r.equipo}</span>
              <span className="area-rpt-racco-event-date">{fmtDate(r.fecha?.slice(0, 10))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Alarmas Section ── */
function AlertasSection({ alarmas }) {
  if (alarmas.total === 0) return <div className="area-rpt-empty">Sin alarmas en el periodo</div>

  return (
    <div>
      <div className="area-rpt-alarmas-summary">
        <div className="area-rpt-alarmas-stat">
          <span className="area-rpt-alarmas-num area-rpt-alarmas-num--total">{alarmas.total}</span>
          <span>total</span>
        </div>
        <div className="area-rpt-alarmas-stat">
          <span className="area-rpt-alarmas-num area-rpt-alarmas-num--ok">{alarmas.leidas}</span>
          <span>leidas</span>
        </div>
        <div className="area-rpt-alarmas-stat">
          <span className="area-rpt-alarmas-num area-rpt-alarmas-num--bad">{alarmas.noLeidas}</span>
          <span>sin leer</span>
        </div>
      </div>
      {alarmas.topEquipos.length > 0 && (
        <div className="area-rpt-alarmas-top">
          <div className="area-rpt-section-subtitle">Top equipos</div>
          {alarmas.topEquipos.map(e => (
            <div key={e.equipo} className="area-rpt-alarmas-eq">
              <span>{e.equipo}</span>
              <span className="area-rpt-alarmas-eq-num">{e.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Period Picker ── */
function PeriodPicker({ rango, setRango, customDesde, setCustomDesde, customHasta, setCustomHasta, onApply }) {
  return (
    <div className="area-rpt-period">
      <div className="area-rpt-period-btns">
        {RANGOS.map(r => (
          <button key={r.key}
            className={`area-rpt-period-btn ${rango === r.key ? 'area-rpt-period-btn--active' : ''}`}
            onClick={() => setRango(r.key)}>
            {r.label}
          </button>
        ))}
        <button
          className={`area-rpt-period-btn ${rango === 'custom' ? 'area-rpt-period-btn--active' : ''}`}
          onClick={() => setRango('custom')}>
          Custom
        </button>
      </div>
      {rango === 'custom' && (
        <div className="area-rpt-period-custom">
          <input type="date" value={customDesde} onChange={e => setCustomDesde(e.target.value)} />
          <span>a</span>
          <input type="date" value={customHasta} onChange={e => setCustomHasta(e.target.value)} />
          <button className="area-rpt-period-btn area-rpt-period-btn--apply" onClick={onApply}>Aplicar</button>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   Main Page Component
   ════════════════════════════════════════════════════════════ */
export default function AreaReportePage() {
  const { bioanalistaAreas } = useAuth()
  const hasBioAreas = bioanalistaAreas && bioanalistaAreas.length > 0

  const [rango, setRango] = useState('semana')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async (r, desde, hasta) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAreaReporte(r, desde, hasta)
      setData(res.reporte)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hasBioAreas) { setLoading(false); return }
    if (rango === 'custom') return // wait for Apply
    fetchData(rango)
  }, [rango, hasBioAreas, fetchData])

  const handleApplyCustom = () => {
    if (customDesde && customHasta) fetchData('custom', customDesde, customHasta)
  }

  if (!hasBioAreas) {
    return (
      <div className="area-rpt-page">
        <div className="area-rpt-no-areas">
          <h2>Sin areas asignadas</h2>
          <p>No tienes areas de bioanalista vinculadas a tu usuario.</p>
          <Link to="/ordenes" className="btn btn-primary">Ir a Ordenes</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="area-rpt-page">
      {/* Toolbar */}
      <div className="area-rpt-toolbar">
        <Link to="/ordenes" className="area-rpt-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver
        </Link>
        <h1 className="area-rpt-title">Reporte de Area</h1>
        <button className="btn btn-glass area-rpt-print-btn" onClick={() => window.print()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Imprimir
        </button>
      </div>

      {/* Period picker */}
      <PeriodPicker rango={rango} setRango={setRango}
        customDesde={customDesde} setCustomDesde={setCustomDesde}
        customHasta={customHasta} setCustomHasta={setCustomHasta}
        onApply={handleApplyCustom} />

      {/* Period label */}
      {data && (
        <div className="area-rpt-period-label">
          {fmtDateFull(data.startDate)} — {fmtDateFull(data.endDate)}
          {data.areas && <span className="area-rpt-areas-label">
            {' · '}{data.areas.map(a => a.nombre).join(', ')}
          </span>}
        </div>
      )}

      {loading && <div className="area-rpt-loading"><div className="spinner" /></div>}
      {error && <div className="area-rpt-error">{error}</div>}

      {!loading && !error && data && (
        <div className="area-rpt-content">
          {/* Row 1: Cápsulas + QC Trend */}
          <div className="area-rpt-row area-rpt-row--top">
            <div className="area-rpt-section area-rpt-section--capsulas">
              <h3 className="area-rpt-section-title">Resumen</h3>
              <CapsulasGrid c={data.capsulas} />
            </div>
            <div className="area-rpt-section area-rpt-section--qc">
              <h3 className="area-rpt-section-title">Control de Calidad</h3>
              <QCTrendSection data={data.qcTrend} equipos={data.equipos} />
            </div>
          </div>

          {/* Row 2: Volumen diario (full width) */}
          <div className="area-rpt-section area-rpt-section--volumen">
            <h3 className="area-rpt-section-title">Volumen Diario</h3>
            <VolumenChart data={data.volumenDiario} />
          </div>

          {/* Row 3: RACCO + Alarmas */}
          <div className="area-rpt-row area-rpt-row--bottom">
            <div className="area-rpt-section area-rpt-section--racco">
              <h3 className="area-rpt-section-title">Bitacora RACCO</h3>
              <RaccoSection racco={data.racco} />
            </div>
            <div className="area-rpt-section area-rpt-section--alarmas">
              <h3 className="area-rpt-section-title">Alarmas</h3>
              <AlertasSection alarmas={data.alarmas} />
            </div>
          </div>

          {/* Rendimiento por área (if multiple) */}
          {data.rendimiento.length > 1 && (
            <div className="area-rpt-section area-rpt-section--rendimiento">
              <h3 className="area-rpt-section-title">Rendimiento por Area</h3>
              <div className="area-rpt-rendimiento-grid">
                {data.rendimiento.map(r => {
                  const pct = parseInt(r.pruebas_total) > 0
                    ? Math.round((parseInt(r.validadas) / parseInt(r.pruebas_total)) * 100) : 0
                  return (
                    <div key={r.area_id} className="area-rpt-rendimiento-item">
                      <span className="area-rpt-rendimiento-area">{r.area}</span>
                      <div className="area-rpt-rendimiento-bar-wrap">
                        <div className="area-rpt-rendimiento-bar" style={{ width: `${pct}%`,
                          background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#dc2626' }} />
                      </div>
                      <span className="area-rpt-rendimiento-pct">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
