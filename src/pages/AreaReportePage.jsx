import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAreaReporte } from '../services/api'
import useDashAreaPrefs from '../hooks/useDashAreaPrefs'

const RANGOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ayer', label: 'Ayer' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
]

/** Safely format a date value (could be ISO string or Date object from pg) */
function safeDateStr(d) {
  if (!d) return null
  if (typeof d === 'string') return d.slice(0, 10)
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return String(d).slice(0, 10)
}

function fmtDate(d) {
  const s = safeDateStr(d)
  if (!s) return ''
  return new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function fmtDateFull(d) {
  const s = safeDateStr(d)
  if (!s) return ''
  return new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtWeekday(d) {
  const s = safeDateStr(d)
  if (!s) return ''
  return new Date(s + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short' })
}

/* ── formatTat helper ── */
function formatTat(minutes) {
  if (minutes == null) return '—'
  const mins = parseInt(minutes)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/* ── Area Chips (interactive) ── */
function AreaChips({ allAreas, selectedIds, onToggle, mineIds }) {
  if (!allAreas || allAreas.length === 0) return null

  // Only show areas that belong to the user (mineIds), not all areas
  const visibleAreas = mineIds?.length > 0
    ? allAreas.filter(a => mineIds.includes(a.id))
    : allAreas

  return (
    <div className="arpt-area-chips-wrap">
      <div className="arpt-area-chips">
        {visibleAreas.map(a => {
          const active = !selectedIds || selectedIds.includes(a.id)
          return (
            <button key={a.id}
              className={`arpt-area-chip ${active ? 'arpt-area-chip--active' : 'arpt-area-chip--inactive'}`}
              onClick={() => onToggle(a.id)}
              title={a.coordinador ? `Coord: ${a.coordinador}` : undefined}>
              {a.nombre}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Smart Alerts Banner ── */
function SmartAlertsBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null

  const severityColor = { critical: '#dc2626', warning: '#f59e0b', info: '#3b82f6' }
  const severityIcon = {
    'alert-triangle': 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    'bell': 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    'check-circle': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    'info': 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  }

  return (
    <div className="arpt-alerts-banner">
      {alerts.map((a, i) => (
        <div key={i} className={`arpt-alert-card arpt-alert-card--${a.severity}`}>
          <div className="arpt-alert-icon" style={{ color: severityColor[a.severity] }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={severityIcon[a.icon] || severityIcon['info']} />
            </svg>
          </div>
          <span className="arpt-alert-msg">{a.message}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Muestras Pipeline ── */
function MuestrasPipeline({ data }) {
  if (!data || data.length === 0) return <div className="arpt-empty">Sin datos de muestras</div>

  const total = data.reduce((s, d) => s + parseInt(d.total), 0)
  const colors = ['#94a3b8', '#60a5fa', '#3b82f6', '#f59e0b', '#16a34a']

  return (
    <div className="arpt-pipeline">
      <div className="arpt-pipeline-bar">
        {data.map((d, i) => {
          const pct = total > 0 ? (parseInt(d.total) / total) * 100 : 0
          if (pct === 0) return null
          return (
            <div key={d.status_id} className="arpt-pipeline-segment"
              style={{ width: `${Math.max(pct, 3)}%`, background: colors[i % colors.length] }}
              title={`${d.status}: ${d.total}`}>
              {pct >= 8 && <span className="arpt-pipeline-seg-label">{d.total}</span>}
            </div>
          )
        })}
      </div>
      <div className="arpt-pipeline-legend">
        {data.map((d, i) => (
          <div key={d.status_id} className="arpt-pipeline-legend-item">
            <span className="arpt-pipeline-dot" style={{ background: colors[i % colors.length] }} />
            <span className="arpt-pipeline-legend-text">{d.status}</span>
            <strong>{d.total}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Equipment Workload Grid ── */
function EquipmentWorkloadGrid({ data }) {
  if (!data || data.length === 0) return <div className="arpt-empty">Sin datos de equipos</div>

  return (
    <div className="arpt-eq-grid">
      {data.map(eq => {
        const prog = parseInt(eq.programadas)
        const comp = parseInt(eq.completadas)
        const pend = parseInt(eq.pendientes)
        const pct = prog > 0 ? Math.round((comp / prog) * 100) : 0
        const circumference = 2 * Math.PI * 20
        const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#dc2626'

        return (
          <div key={eq.id} className="arpt-eq-card">
            <div className="arpt-eq-ring-wrap">
              <svg viewBox="0 0 48 48" className="arpt-eq-ring">
                <circle cx="24" cy="24" r="20" fill="none" stroke="var(--border-light, rgba(0,0,0,0.08))" strokeWidth="4" />
                <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * pct / 100)}
                  transform="rotate(-90 24 24)"
                  style={{ transition: 'stroke-dashoffset 600ms ease' }} />
              </svg>
              <span className="arpt-eq-ring-pct" style={{ color }}>{pct}%</span>
            </div>
            <div className="arpt-eq-info">
              <span className="arpt-eq-name">{eq.equipo}</span>
              <span className="arpt-eq-detail">{comp}/{prog} completadas</span>
              {pend > 5 && <span className="arpt-eq-badge-pending">{pend} pend.</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── TAT Monitor ── */
function TATMonitor({ data }) {
  if (!data || data.length === 0) return <div className="arpt-empty">Sin datos TAT</div>

  return (
    <div className="arpt-tat-grid">
      {data.map(t => {
        const hasSla = t.tat_critico != null
        const pctSla = t.pct_sla != null ? Math.round(t.pct_sla) : null
        const slaColor = pctSla >= 80 ? '#16a34a' : pctSla >= 50 ? '#f59e0b' : '#dc2626'
        const circumference = 2 * Math.PI * 24

        return (
          <div key={t.area_id} className="arpt-tat-card">
            <div className="arpt-tat-header">
              <span className="arpt-tat-area">{t.area}</span>
            </div>
            <div className="arpt-tat-body">
              {hasSla && pctSla != null ? (
                <div className="arpt-tat-ring-wrap">
                  <svg viewBox="0 0 56 56" className="arpt-tat-ring">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="var(--border-light, rgba(0,0,0,0.08))" strokeWidth="4" />
                    <circle cx="28" cy="28" r="24" fill="none" stroke={slaColor} strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (circumference * pctSla / 100)}
                      transform="rotate(-90 28 28)"
                      style={{ transition: 'stroke-dashoffset 600ms ease' }} />
                  </svg>
                  <span className="arpt-tat-ring-pct" style={{ color: slaColor }}>{pctSla}%</span>
                </div>
              ) : null}
              <div className="arpt-tat-values">
                <div className="arpt-tat-main">{formatTat(t.avg_tat_min)}</div>
                <div className="arpt-tat-sub">promedio</div>
                {t.p90_tat_min != null && (
                  <div className="arpt-tat-p90">P90: {formatTat(t.p90_tat_min)}</div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Hero Stat Card ── */
function HeroStat({ icon, value, label, color, accent }) {
  return (
    <div className={`arpt-hero-stat ${accent ? 'arpt-hero-stat--accent' : ''}`}>
      <div className="arpt-hero-stat-icon" style={{ color }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
      </div>
      <div className="arpt-hero-stat-value" style={accent ? { color } : undefined}>{value}</div>
      <div className="arpt-hero-stat-label">{label}</div>
    </div>
  )
}

/* ── Cápsulas Grid (hero stats) ── */
function CapsulasGrid({ c, tatAvg }) {
  const stats = [
    { label: 'Órdenes', value: c.ordenes, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', color: 'var(--accent, #3b82f6)' },
    { label: 'Pruebas', value: `${c.validadas}/${c.pruebas}`, icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', color: c.pruebas > 0 && c.validadas / c.pruebas >= 0.8 ? '#16a34a' : 'var(--accent, #3b82f6)' },
    { label: 'Validación', value: `${c.pctValidacion}%`, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: c.pctValidacion >= 80 ? '#16a34a' : c.pctValidacion >= 50 ? '#f59e0b' : '#dc2626', accent: true },
    { label: 'QC Alertas', value: c.equiposQcFuera, icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', color: c.equiposQcFuera > 0 ? '#dc2626' : '#16a34a', accent: c.equiposQcFuera > 0 },
    { label: 'Alarmas', value: c.alarmasNoLeidas, icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', color: c.alarmasNoLeidas > 0 ? '#dc2626' : 'var(--text-3, #94a3b8)', accent: c.alarmasNoLeidas > 0 },
    { label: 'RACCO', value: c.raccoEventos, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', color: 'var(--text-3, #94a3b8)' },
  ]

  if (tatAvg != null) {
    stats.push({
      label: 'TAT Prom',
      value: formatTat(tatAvg),
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      color: tatAvg <= 120 ? '#16a34a' : tatAvg <= 240 ? '#f59e0b' : '#dc2626',
      accent: tatAvg > 240,
    })
  }

  return (
    <div className="arpt-hero-stats">
      {stats.map(s => <HeroStat key={s.label} {...s} />)}
    </div>
  )
}

/* ── Volumen Bar Chart (SVG) — redesigned ── */
function VolumenChart({ data }) {
  if (!data || data.length === 0) return <div className="arpt-empty">Sin actividad en el periodo</div>

  const W = 700, H = 200, PAD_B = 44, PAD_T = 16, PAD_L = 40
  const chartW = W - PAD_L
  const barW = Math.min(40, Math.max(12, chartW / data.length - 6))
  const maxVal = Math.max(...data.map(d => parseInt(d.pruebas_total)), 1)
  const chartH = H - PAD_B - PAD_T
  const gridSteps = 4

  return (
    <svg className="arpt-vol-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="barGradBlue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id="barGradGreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#4ade80" />
        </linearGradient>
        <linearGradient id="barGradAmber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <filter id="barShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1" />
        </filter>
      </defs>
      {/* Y-axis grid + labels */}
      {Array.from({ length: gridSteps + 1 }, (_, i) => {
        const val = Math.round((maxVal / gridSteps) * i)
        const y = PAD_T + chartH - (chartH / gridSteps) * i
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W} y2={y}
              stroke="var(--border-light, rgba(0,0,0,0.06))" strokeWidth="0.5" />
            <text x={PAD_L - 6} y={y + 3} textAnchor="end"
              fontSize="9" fill="var(--text-3, #94a3b8)">{val}</text>
          </g>
        )
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const slotW = chartW / data.length
        const x = PAD_L + i * slotW + (slotW - barW) / 2
        const total = parseInt(d.pruebas_total)
        const validadas = parseInt(d.validadas)
        const pct = total > 0 ? validadas / total : 0
        const h = Math.max(2, (total / maxVal) * chartH)
        const y = PAD_T + chartH - h
        const grad = pct >= 0.9 ? 'url(#barGradGreen)' : pct < 0.5 ? 'url(#barGradAmber)' : 'url(#barGradBlue)'
        const label = fmtDate(d.dia)
        const weekday = fmtWeekday(d.dia)
        return (
          <g key={i} className="arpt-vol-bar-group">
            <rect x={x} y={y} width={barW} height={h} rx="4" fill={grad} filter="url(#barShadow)">
              <title>{`${label}: ${total} pruebas (${Math.round(pct * 100)}% validadas)`}</title>
            </rect>
            {/* Value on top of bar */}
            {total > 0 && data.length <= 14 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle"
                fontSize="9" fontWeight="600" fill="var(--text-2, #475569)">{total}</text>
            )}
            {/* X label: weekday + date */}
            {data.length <= 14 && (
              <>
                <text x={x + barW / 2} y={H - PAD_B + 14} textAnchor="middle"
                  fontSize="9" fontWeight="600" fill="var(--text-2, #475569)">{weekday}</text>
                <text x={x + barW / 2} y={H - PAD_B + 26} textAnchor="middle"
                  fontSize="8" fill="var(--text-3, #94a3b8)">{label}</text>
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* ── QC Sparkline (SVG) — bigger, nicer ── */
function Sparkline({ points }) {
  if (points.length === 0) return null
  const W = 160, H = 44, PAD = 4
  const maxZ = Math.max(...points.map(p => p.z), 3)
  const scaleX = (W - PAD * 2) / Math.max(points.length - 1, 1)
  const scaleY = (H - PAD * 2) / maxZ

  const polyline = points.map((p, i) => `${PAD + i * scaleX},${H - PAD - p.z * scaleY}`).join(' ')
  const thresholdY = H - PAD - 2 * scaleY
  const hasIssue = points.some(p => p.z > 2)
  const color = hasIssue ? '#dc2626' : '#16a34a'

  // Area fill path
  const areaPath = `M${PAD},${H - PAD} ` +
    points.map((p, i) => `L${PAD + i * scaleX},${H - PAD - p.z * scaleY}`).join(' ') +
    ` L${PAD + (points.length - 1) * scaleX},${H - PAD} Z`

  return (
    <svg className="arpt-sparkline" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {/* Area fill */}
      <path d={areaPath} fill={color} opacity="0.08" />
      {/* Threshold line */}
      <line x1={PAD} y1={thresholdY} x2={W - PAD} y2={thresholdY}
        stroke="#f59e0b" strokeWidth="0.7" strokeDasharray="4,3" opacity="0.6" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={PAD + i * scaleX} cy={H - PAD - p.z * scaleY} r="3"
          fill={p.z > 2 ? '#dc2626' : '#16a34a'} stroke="#fff" strokeWidth="1.5">
          <title>{`${fmtDate(p.dia)}: z=${p.z}`}</title>
        </circle>
      ))}
    </svg>
  )
}

/* ── QC Trend Section ── */
function QCTrendSection({ data }) {
  const byEquipo = {}
  for (const row of data) {
    if (!byEquipo[row.equipo_sistema_id]) byEquipo[row.equipo_sistema_id] = { nombre: row.equipo, points: [] }
    byEquipo[row.equipo_sistema_id].points.push({ dia: row.dia, z: parseFloat(row.z_avg) })
  }

  const entries = Object.entries(byEquipo)
  if (entries.length === 0) return <div className="arpt-empty">Sin datos QC en el periodo</div>

  return (
    <div className="arpt-qc-list">
      {entries.slice(0, 8).map(([id, eq]) => {
        const hasIssue = eq.points.some(p => p.z > 2)
        const lastZ = eq.points.length > 0 ? eq.points[eq.points.length - 1].z : 0
        const mid = Math.floor(eq.points.length / 2) || 1
        const firstHalf = eq.points.slice(0, mid).reduce((s, p) => s + p.z, 0) / mid
        const secondHalf = eq.points.slice(mid).reduce((s, p) => s + p.z, 0) / (eq.points.length - mid || 1)
        const drift = secondHalf - firstHalf

        return (
          <div key={id} className={`arpt-qc-card ${hasIssue ? 'arpt-qc-card--warn' : ''}`}>
            <div className="arpt-qc-info">
              <span className="arpt-qc-name">{eq.nombre}</span>
              <div className="arpt-qc-meta">
                <span className={`arpt-qc-status ${hasIssue ? 'arpt-qc-status--bad' : 'arpt-qc-status--ok'}`}>
                  {hasIssue ? 'Fuera' : 'OK'}
                </span>
                {Math.abs(drift) > 0.5 && (
                  <span className="arpt-qc-drift">
                    {drift > 0 ? '\u2197' : '\u2198'} drift
                  </span>
                )}
                <span className="arpt-qc-lastz">z={lastZ.toFixed(1)}</span>
              </div>
            </div>
            <Sparkline points={eq.points} />
          </div>
        )
      })}
      {entries.length > 8 && <div className="arpt-more">y {entries.length - 8} equipo{entries.length - 8 !== 1 ? 's' : ''} más</div>}
    </div>
  )
}

/* ── RACCO Section — timeline style ── */
function RaccoSection({ racco }) {
  const { counts, recientes } = racco
  if (counts.length === 0 && recientes.length === 0) return <div className="arpt-empty">Sin eventos RACCO</div>

  const tipoIcons = {
    'Mantenimiento': '\uD83D\uDD27',
    'Calibración': '\uD83C\uDFAF',
    'Control': '\u2705',
    'Limpieza': '\uD83E\uDDF9',
  }

  return (
    <div>
      {counts.length > 0 && (
        <div className="arpt-racco-pills">
          {counts.map(c => (
            <div key={c.tipo_registro} className="arpt-racco-pill">
              <span className="arpt-racco-pill-icon">{tipoIcons[c.tipo_registro] || '\uD83D\uDCCB'}</span>
              <span className="arpt-racco-pill-tipo">{c.tipo_registro}</span>
              <span className="arpt-racco-pill-num">{c.total}</span>
            </div>
          ))}
        </div>
      )}
      {recientes.length > 0 && (
        <div className="arpt-racco-timeline">
          {recientes.map(r => (
            <div key={r.id} className="arpt-racco-event">
              <div className="arpt-racco-dot" />
              <div className="arpt-racco-event-body">
                <div className="arpt-racco-event-top">
                  <span className="arpt-racco-event-tipo">{r.tipo_registro}</span>
                  <span className="arpt-racco-event-date">{fmtDate(r.fecha?.slice?.(0, 10) || r.fecha)}</span>
                </div>
                <span className="arpt-racco-event-equipo">{r.equipo}</span>
                {r.registrado_por && <span className="arpt-racco-event-user">{r.registrado_por}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Alarmas Section — with visual ring ── */
function AlertasSection({ alarmas }) {
  if (alarmas.total === 0) return <div className="arpt-empty">Sin alarmas en el periodo</div>

  const pctLeidas = alarmas.total > 0 ? (alarmas.leidas / alarmas.total) * 100 : 0
  const circumference = 2 * Math.PI * 32

  return (
    <div className="arpt-alarmas">
      <div className="arpt-alarmas-ring-wrap">
        <svg viewBox="0 0 80 80" className="arpt-alarmas-ring">
          <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border-light, rgba(0,0,0,0.06))" strokeWidth="6" />
          <circle cx="40" cy="40" r="32" fill="none" stroke="#16a34a" strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * pctLeidas / 100)}
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dashoffset 600ms ease' }} />
        </svg>
        <div className="arpt-alarmas-ring-center">
          <span className="arpt-alarmas-ring-num">{alarmas.total}</span>
          <span className="arpt-alarmas-ring-label">total</span>
        </div>
      </div>
      <div className="arpt-alarmas-breakdown">
        <div className="arpt-alarmas-row">
          <div className="arpt-alarmas-dot arpt-alarmas-dot--ok" />
          <span>Leídas</span>
          <strong>{alarmas.leidas}</strong>
        </div>
        <div className="arpt-alarmas-row">
          <div className="arpt-alarmas-dot arpt-alarmas-dot--bad" />
          <span>Sin leer</span>
          <strong className="arpt-alarmas-bad-num">{alarmas.noLeidas}</strong>
        </div>
      </div>
      {alarmas.topEquipos.length > 0 && (
        <div className="arpt-alarmas-top">
          <div className="arpt-section-subtitle">Top equipos</div>
          {alarmas.topEquipos.map(e => (
            <div key={e.equipo} className="arpt-alarmas-eq">
              <span className="arpt-alarmas-eq-name">{e.equipo}</span>
              <div className="arpt-alarmas-eq-bar-wrap">
                <div className="arpt-alarmas-eq-bar"
                  style={{ width: `${(parseInt(e.total) / alarmas.total) * 100}%` }} />
              </div>
              <span className="arpt-alarmas-eq-num">{e.total}</span>
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
    <div className="arpt-period">
      <div className="arpt-period-btns">
        {RANGOS.map(r => (
          <button key={r.key}
            className={`arpt-period-btn ${rango === r.key ? 'arpt-period-btn--active' : ''}`}
            onClick={() => setRango(r.key)}>
            {r.label}
          </button>
        ))}
        <button
          className={`arpt-period-btn ${rango === 'custom' ? 'arpt-period-btn--active' : ''}`}
          onClick={() => setRango('custom')}>
          Custom
        </button>
      </div>
      {rango === 'custom' && (
        <div className="arpt-period-custom">
          <input type="date" value={customDesde} onChange={e => setCustomDesde(e.target.value)} />
          <span>a</span>
          <input type="date" value={customHasta} onChange={e => setCustomHasta(e.target.value)} />
          <button className="arpt-period-btn arpt-period-btn--apply" onClick={onApply}>Aplicar</button>
        </div>
      )}
    </div>
  )
}

/* ── Rendimiento Section ── */
function RendimientoSection({ rendimiento }) {
  if (rendimiento.length <= 1) return null

  return (
    <div className="arpt-card">
      <h3 className="arpt-card-title">Rendimiento por Área</h3>
      <div className="arpt-rendimiento">
        {rendimiento.map(r => {
          const pct = parseInt(r.pruebas_total) > 0
            ? Math.round((parseInt(r.validadas) / parseInt(r.pruebas_total)) * 100) : 0
          const color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#dc2626'
          return (
            <div key={r.area_id} className="arpt-rendimiento-row">
              <span className="arpt-rendimiento-area">{r.area}</span>
              <div className="arpt-rendimiento-bar-wrap">
                <div className="arpt-rendimiento-bar" style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="arpt-rendimiento-pct" style={{ color }}>{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   Main Page Component
   ════════════════════════════════════════════════════════════ */
export default function AreaReportePage() {
  const { user, bioanalistaAreas } = useAuth()
  const hasBioAreas = bioanalistaAreas && bioanalistaAreas.length > 0

  const { visibleAreaIds } = useDashAreaPrefs(user?.id, bioanalistaAreas)

  const [rango, setRango] = useState('semana')
  const [customDesde, setCustomDesde] = useState('')
  const [customHasta, setCustomHasta] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Always start with user's areas — never "all"
  const [selectedAreaIds, setSelectedAreaIds] = useState(
    () => visibleAreaIds || bioanalistaAreas?.map(a => a.id) || null
  )

  // Sync from saved prefs once they load
  useEffect(() => {
    if (visibleAreaIds && !selectedAreaIds) {
      setSelectedAreaIds(visibleAreaIds)
    }
  }, [visibleAreaIds]) // eslint-disable-line

  const fetchData = useCallback(async (r, desde, hasta, areaIds) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAreaReporte(r, desde, hasta, areaIds)
      setData(res.reporte)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hasBioAreas) { setLoading(false); return }
    if (rango === 'custom') return
    fetchData(rango, undefined, undefined, selectedAreaIds)
  }, [rango, hasBioAreas, fetchData, selectedAreaIds])

  const handleApplyCustom = () => {
    if (customDesde && customHasta) fetchData('custom', customDesde, customHasta, selectedAreaIds)
  }

  const handleAreaToggle = (areaId) => {
    setSelectedAreaIds(prev => {
      const allIds = data?.allAreas?.map(a => a.id) || bioanalistaAreas.map(a => a.id)
      const current = prev || allIds
      if (current.includes(areaId)) {
        const next = current.filter(id => id !== areaId)
        return next.length > 0 ? next : current // don't allow empty
      }
      return [...current, areaId]
    })
  }

  if (!hasBioAreas) {
    return (
      <div className="arpt-page">
        <div className="arpt-no-areas">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <h2>Sin áreas asignadas</h2>
          <p>No tienes áreas de bioanalista vinculadas a tu usuario.</p>
          <Link to="/ordenes" className="btn btn-primary">Ir a Órdenes</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="arpt-page">
      {/* --- Hero Header --- */}
      <div className="arpt-hero">
        <div className="arpt-hero-top">
          <Link to="/ordenes" className="arpt-back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </Link>
          <div className="arpt-hero-title-wrap">
            <h1 className="arpt-title">Reporte de Área</h1>
            {data && (
              <span className="arpt-date-range">
                {fmtDateFull(data.startDate)} — {fmtDateFull(data.endDate)}
              </span>
            )}
          </div>
          <button className="arpt-print-btn" onClick={() => window.print()} title="Imprimir">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
          </button>
        </div>

        {/* Period picker */}
        <PeriodPicker rango={rango} setRango={setRango}
          customDesde={customDesde} setCustomDesde={setCustomDesde}
          customHasta={customHasta} setCustomHasta={setCustomHasta}
          onApply={handleApplyCustom} />

        {/* Area chips */}
        {(data?.allAreas || data?.areas) && (
          <AreaChips
            allAreas={data?.allAreas || data?.areas}
            selectedIds={selectedAreaIds}
            onToggle={handleAreaToggle}
            mineIds={bioanalistaAreas.map(a => a.id)}
          />
        )}
      </div>

      {loading && <div className="arpt-loading"><div className="spinner" /></div>}
      {error && <div className="arpt-error">{error}</div>}

      {!loading && !error && data && (() => {
        // compute average TAT from tatMonitor data
        const tatAvg = data.tatMonitor?.length > 0
          ? Math.round(data.tatMonitor.reduce((s, t) => s + (parseInt(t.avg_tat_min) || 0), 0) / data.tatMonitor.length)
          : null

        return (
          <div className="arpt-content">
            {/* --- Hero Stats --- */}
            <CapsulasGrid c={data.capsulas} tatAvg={tatAvg} />

            {/* --- Smart Alerts --- */}
            <SmartAlertsBanner alerts={data.smartAlerts} />

            {/* --- Muestras Pipeline --- */}
            {data.muestrasPipeline?.length > 0 && (
              <div className="arpt-card">
                <h3 className="arpt-card-title">
                  Pipeline de Muestras
                  <span className="arpt-card-title-badge">
                    {data.muestrasPipeline.reduce((s, d) => s + parseInt(d.total), 0)} muestras
                  </span>
                </h3>
                <MuestrasPipeline data={data.muestrasPipeline} />
              </div>
            )}

            {/* --- Row: Volume + QC --- */}
            <div className="arpt-grid-2">
              <div className="arpt-card arpt-card--vol">
                <h3 className="arpt-card-title">
                  Volumen Diario
                  <span className="arpt-card-title-badge">{data.volumenDiario?.length || 0} días</span>
                </h3>
                <VolumenChart data={data.volumenDiario} />
              </div>
              <div className="arpt-card arpt-card--qc">
                <h3 className="arpt-card-title">
                  Control de Calidad
                  <span className="arpt-card-title-badge">{Object.keys(
                    data.qcTrend.reduce((acc, r) => { acc[r.equipo_sistema_id] = 1; return acc }, {})
                  ).length} equipos</span>
                </h3>
                <QCTrendSection data={data.qcTrend} />
              </div>
            </div>

            {/* --- Row: Equipment Workload + TAT Monitor --- */}
            {(data.equipoWorkload?.length > 0 || data.tatMonitor?.length > 0) && (
              <div className="arpt-grid-2">
                {data.equipoWorkload?.length > 0 && (
                  <div className="arpt-card">
                    <h3 className="arpt-card-title">
                      Carga de Equipos
                      <span className="arpt-card-title-badge">{data.equipoWorkload.length} equipos</span>
                    </h3>
                    <EquipmentWorkloadGrid data={data.equipoWorkload} />
                  </div>
                )}
                {data.tatMonitor?.length > 0 && (
                  <div className="arpt-card">
                    <h3 className="arpt-card-title">
                      TAT Monitor
                      <span className="arpt-card-title-badge">{data.tatMonitor.length} áreas</span>
                    </h3>
                    <TATMonitor data={data.tatMonitor} />
                  </div>
                )}
              </div>
            )}

            {/* --- Row: RACCO + Alarmas --- */}
            <div className="arpt-grid-2">
              <div className="arpt-card">
                <h3 className="arpt-card-title">
                  Bitácora RACCO
                  {data.racco.counts.length > 0 && (
                    <span className="arpt-card-title-badge">
                      {data.racco.counts.reduce((s, c) => s + parseInt(c.total), 0)} eventos
                    </span>
                  )}
                </h3>
                <RaccoSection racco={data.racco} />
              </div>
              <div className="arpt-card">
                <h3 className="arpt-card-title">
                  Alarmas
                  {data.alarmas.noLeidas > 0 && (
                    <span className="arpt-card-title-badge arpt-card-title-badge--warn">
                      {data.alarmas.noLeidas} sin leer
                    </span>
                  )}
                </h3>
                <AlertasSection alarmas={data.alarmas} />
              </div>
            </div>

            {/* --- Rendimiento --- */}
            <RendimientoSection rendimiento={data.rendimiento} />
          </div>
        )
      })()}
    </div>
  )
}
