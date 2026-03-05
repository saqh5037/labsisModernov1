import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, getStats, getMemory, toggleTask, updateScreen } from '../services/devApi'

/* ── SVG Icons ── */
const IconCode = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
  </svg>
)
const IconChevron = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform 200ms', transform: open ? 'rotate(90deg)' : 'rotate(0)' }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
)
const IconFlask = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6v8l4 8H5l4-8V3z" /><line x1="9" y1="3" x2="15" y2="3" />
  </svg>
)
const IconDatabase = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
)
const IconLayers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
  </svg>
)
const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const IconGitBranch = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 01-9 9" />
  </svg>
)
const IconFile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
)
const IconTarget = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
)

/* ── Animated Counter Hook ── */
function useCounter(target, duration = 1200) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const t = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(ease * target))
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return val
}

/* ── Donut Chart Component ── */
function DonutChart({ segments, size = 180, stroke = 16 }) {
  const r = (size - stroke) / 2
  const C = 2 * Math.PI * r
  let offset = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="dv-donut">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(15,23,42,0.04)" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const dash = (seg.pct / 100) * C
        const gap = C - dash
        const o = offset
        offset += dash
        return (
          <circle key={i} cx={size/2} cy={size/2} r={r}
            fill="none" stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-o}
            strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: 'stroke-dasharray 1s ease, stroke-dashoffset 1s ease' }}
          />
        )
      })}
    </svg>
  )
}

/* ── Progress Ring (circular) ── */
function ProgressRing({ pct, size = 56, stroke = 5, color = '#3b82f6' }) {
  const r = (size - stroke) / 2
  const C = 2 * Math.PI * r
  const offset = C - (pct / 100) * C
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="dv-ring">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(15,23,42,0.05)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1.2s ease' }}
      />
    </svg>
  )
}

/* ── Horizontal Bar Chart ── */
function HBarChart({ items, maxVal }) {
  return (
    <div className="dv-hbar-chart">
      {items.map((item, i) => (
        <div key={i} className="dv-hbar-row">
          <span className="dv-hbar-label">{item.label}</span>
          <div className="dv-hbar-track">
            <div className="dv-hbar-fill" style={{
              width: `${maxVal > 0 ? (item.value / maxVal) * 100 : 0}%`,
              background: item.color || 'var(--blue)',
              animationDelay: `${i * 0.08}s`
            }} />
          </div>
          <span className="dv-hbar-val">{item.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Radial Stat ── */
function RadialStat({ value, label, color, icon, max = 100 }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="dv-radial-stat">
      <div className="dv-radial-ring-wrap">
        <ProgressRing pct={pct} size={72} stroke={6} color={color} />
        <div className="dv-radial-icon" style={{ color }}>{icon}</div>
      </div>
      <span className="dv-radial-val">{typeof value === 'number' ? value.toLocaleString() : value}</span>
      <span className="dv-radial-label">{label}</span>
    </div>
  )
}

export default function DevDashboard() {
  const navigate = useNavigate()
  const [db, setDb] = useState(null)
  const [stats, setStats] = useState(null)
  const [memory, setMemory] = useState(null)
  const [expanded, setExpanded] = useState({ ordenes: true })
  const [loading, setLoading] = useState(true)
  const [dragId, setDragId] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const heroRef = useRef(null)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const [d, s, m] = await Promise.all([getDashboard(), getStats(), getMemory()])
      setDb(d)
      setStats(s)
      setMemory(m)
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Mouse glow follower on hero
  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const handleMove = (e) => {
      const rect = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
      el.style.setProperty('--my', `${e.clientY - rect.top}px`)
    }
    el.addEventListener('mousemove', handleMove)
    return () => el.removeEventListener('mousemove', handleMove)
  }, [db])

  const handleToggleTask = async (screenId, taskId) => {
    await toggleTask(screenId, taskId)
    load()
  }

  // Drag & Drop for Kanban
  const handleDragStart = (e, screenId) => {
    setDragId(screenId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', screenId)
    e.target.style.opacity = '0.5'
  }
  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
    setDragId(null)
    setDragOver(null)
  }
  const handleDragOver = (e, phaseId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(phaseId)
  }
  const handleDragLeave = () => { setDragOver(null) }
  const handleDrop = async (e, phaseId) => {
    e.preventDefault()
    setDragOver(null)
    const screenId = e.dataTransfer.getData('text/plain')
    if (!screenId || !db) return
    const all = db.modules.flatMap(m => m.screens)
    const screen = all.find(s => s.id === screenId)
    if (screen && screen.phase !== phaseId) {
      await updateScreen(screenId, { phase: phaseId })
      load()
    }
  }

  // Animated counters
  const totalAnim = useCounter(stats?.total || 0)
  const completedAnim = useCounter(stats?.completed || 0)
  const inProgressAnim = useCounter(stats?.inProgress || 0)
  const pendingAnim = useCounter(stats?.pending || 0)
  const pctAnim = useCounter(stats?.percentComplete || 0, 1500)

  // Legacy codebase counters
  const xhtmlAnim = useCounter(memory?.codebase?.xhtmlTotal || 0, 2000)
  const beansAnim = useCounter(memory?.codebase?.sessionBeans || 0, 1800)
  const entitiesAnim = useCounter(memory?.codebase?.entities || 0, 1600)

  // Inventory counters
  const coreScreensAnim = useCounter(memory?.codebase?.coreScreensTotal || 110, 1400)
  const researchedAnim = useCounter((memory?.screens || []).filter(s => s.hasMemory).length, 1000)

  if (loading) return (
    <div className="dv"><div className="dv-loading"><div className="dv-spinner" />Cargando panel de control...</div></div>
  )
  if (!db || !stats) return <div className="dv"><div className="dv-loading">Error cargando datos</div></div>

  const allScreens = db.modules.flatMap(m => m.screens)
  const activeSprint = db.sprints.find(s => s.status === 'active')
  const sprintScreens = activeSprint ? allScreens.filter(s => activeSprint.screenIds.includes(s.id)) : []
  const activeTasks = allScreens
    .filter(s => !['not-started', 'finalizado'].includes(s.phase))
    .flatMap(s => (s.tasks || []).filter(t => !t.done).map(t => ({ ...t, screenId: s.id, screenName: s.name })))
  const phaseMap = Object.fromEntries(db.phases.map(p => [p.id, p]))

  // Donut data
  const donutSegments = db.phases.filter(p => (stats.byPhase[p.id] || 0) > 0).map(p => ({
    pct: Math.round(((stats.byPhase[p.id] || 0) / stats.total) * 100),
    color: p.color,
    label: p.label,
    count: stats.byPhase[p.id] || 0
  }))

  // Legacy bar chart data
  const legacyBars = memory ? [
    { label: 'XHTML', value: memory.codebase?.xhtmlTotal || 0, color: '#f97316' },
    { label: 'Beans', value: memory.codebase?.sessionBeans || 0, color: '#8b5cf6' },
    { label: 'Entities', value: memory.codebase?.entities || 0, color: '#3b82f6' },
    { label: 'Parsers', value: memory.codebase?.parsers || 0, color: '#06b6d4' },
    { label: 'Converters', value: memory.codebase?.converters || 0, color: '#059669' },
    { label: 'Writers', value: memory.codebase?.writers || 0, color: '#ec4899' },
  ] : []
  const legacyMax = Math.max(...legacyBars.map(b => b.value), 1)

  // Screens by documentation status
  const documentedScreens = (memory?.screens || []).filter(s => s.hasMemory)

  // Build lookup maps for badges
  const memoryFileSet = new Set((memory?.screens || []).filter(s => s.hasMemory).map(s => s.file?.replace('.md', '').replace(/-/g, ' ').toLowerCase()))
  const videoScreenSet = new Set((memory?.videoScreens || []).map(v => v.dashboardId?.toLowerCase()))
  const screenHasMemory = (screenId) => {
    const normalized = screenId.toLowerCase().replace(/-/g, ' ')
    return memoryFileSet.has(normalized) || (memory?.screens || []).some(s => s.file?.replace('.md', '') === screenId)
  }
  const screenHasVideo = (screenId) => videoScreenSet.has(screenId.toLowerCase())
  const screenHasReact = (screenId) => {
    const s = allScreens.find(sc => sc.id === screenId)
    return s?.component && s.component !== ''
  }

  return (
    <div className="dv">
      {/* ── Glassmorphic Navbar ── */}
      <nav className="dv-nav">
        <div className="dv-nav-left">
          <div className="dv-nav-icon"><IconCode /></div>
          <span className="dv-nav-brand">Lab<span>sis</span></span>
          <span className="dv-nav-tag">Dev Control</span>
        </div>
        <div className="dv-nav-right">
          <div className="dv-nav-live"><span className="dv-live-dot" />En desarrollo</div>
          <button className="dv-nav-link" onClick={load} disabled={refreshing}
            style={{ opacity: refreshing ? 0.6 : 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
          <button className="dv-nav-link" onClick={() => navigate('/dev/process')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            Proceso
          </button>
          <button className="dv-nav-link" onClick={() => navigate('/dev/arch')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
            Arquitectura
          </button>
          <button className="dv-nav-link" onClick={() => navigate('/dev/docs')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
            Docs
          </button>
          <button className="dv-nav-link" onClick={() => navigate('/dev/brand')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
            Brand
          </button>
          <button className="dv-nav-link" onClick={() => navigate('/dev/audit')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
            Auditoría
          </button>
          <button className="dv-nav-link" onClick={() => navigate('/ordenes')}>
            <IconFlask /> Ir a la App
          </button>
        </div>
      </nav>

      {/* ── Hero Section — Aurora + Glass ── */}
      <div className="dv-hero" ref={heroRef}>
        <div className="dv-hero-bg" />
        <div className="dv-hero-aurora" />
        <div className="dv-hero-particles" />
        <div className="dv-hero-glow" />

        <div className="dv-hero-content">
          <div className="dv-hero-row">
            {/* Big Donut */}
            <div className="dv-hero-donut-wrap">
              <DonutChart segments={donutSegments} size={200} stroke={18} />
              <div className="dv-donut-center">
                <span className="dv-donut-num">{pctAnim}</span>
                <span className="dv-donut-pct">%</span>
              </div>
            </div>

            {/* Central info */}
            <div className="dv-hero-info">
              <div className="dv-hero-eyebrow">
                <span className="dv-eyebrow-dot" />
                Panel de Control — labsisModernov1
              </div>
              <h1 className="dv-hero-title">
                <span className="dv-title-num">{totalAnim}</span>
                <span className="dv-title-text">pantallas trackeadas</span>
              </h1>

              <div className="dv-hero-metrics">
                <div className="dv-metric">
                  <div className="dv-metric-icon dv-metric-green">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div className="dv-metric-data">
                    <span className="dv-metric-val">{completedAnim}</span>
                    <span className="dv-metric-label">Completadas</span>
                  </div>
                </div>
                <div className="dv-metric">
                  <div className="dv-metric-icon dv-metric-blue">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                  </div>
                  <div className="dv-metric-data">
                    <span className="dv-metric-val">{inProgressAnim}</span>
                    <span className="dv-metric-label">En progreso</span>
                  </div>
                </div>
                <div className="dv-metric">
                  <div className="dv-metric-icon dv-metric-gray">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                  </div>
                  <div className="dv-metric-data">
                    <span className="dv-metric-val">{pendingAnim}</span>
                    <span className="dv-metric-label">Pendientes</span>
                  </div>
                </div>
              </div>

              {/* Global progress bar */}
              <div className="dv-hero-bar">
                <div className="dv-hero-bar-fill" style={{ width: `${Math.max(stats.percentComplete, 2)}%` }} />
                <div className="dv-hero-bar-glow" style={{ left: `${Math.max(stats.percentComplete, 2)}%` }} />
              </div>

              {/* Inventory stat cards */}
              {memory && (() => {
                const coreTotal = memory.codebase?.coreScreensTotal || 110
                const inDashboard = stats?.total || 0
                const researched = (memory.screens || []).filter(s => s.hasMemory).length
                const xhtml = memory.codebase?.xhtmlTotal || 2455
                const trackPct = coreTotal > 0 ? Math.round((inDashboard / coreTotal) * 100) : 0
                const resPct = coreTotal > 0 ? Math.round((researched / coreTotal) * 100) : 0
                return (
                  <>
                    <div className="dv-inventory-cards">
                      <div className="dv-inv-card">
                        <span className="dv-inv-num">~{coreScreensAnim}</span>
                        <span className="dv-inv-label">Core Screens</span>
                        <span className="dv-inv-sub">legacy</span>
                      </div>
                      <div className="dv-inv-card">
                        <span className="dv-inv-num">{totalAnim}</span>
                        <span className="dv-inv-label">In Dashboard</span>
                        <span className="dv-inv-sub">tracking</span>
                      </div>
                      <div className="dv-inv-card">
                        <span className="dv-inv-num">{researchedAnim}/{coreTotal}</span>
                        <span className="dv-inv-label">Researched</span>
                        <span className="dv-inv-sub">memoria</span>
                      </div>
                      <div className="dv-inv-card">
                        <span className="dv-inv-num">{xhtml.toLocaleString()}</span>
                        <span className="dv-inv-label">Legacy XHTML</span>
                        <span className="dv-inv-sub">total</span>
                      </div>
                    </div>

                    {/* Legacy Coverage bars */}
                    <div className="dv-coverage-bars">
                      <div className="dv-coverage-row">
                        <span className="dv-coverage-label">Tracking</span>
                        <div className="dv-coverage-track">
                          <div className="dv-coverage-fill dv-coverage-blue" style={{ width: `${trackPct}%` }} />
                        </div>
                        <span className="dv-coverage-pct">{trackPct}%</span>
                        <span className="dv-coverage-detail">{inDashboard}/{coreTotal}</span>
                      </div>
                      <div className="dv-coverage-row">
                        <span className="dv-coverage-label">Investigado</span>
                        <div className="dv-coverage-track">
                          <div className="dv-coverage-fill dv-coverage-purple" style={{ width: `${resPct}%` }} />
                        </div>
                        <span className="dv-coverage-pct">{resPct}%</span>
                        <span className="dv-coverage-detail">{researched}/{coreTotal}</span>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Donut Legend */}
            <div className="dv-donut-legend">
              {db.phases.map(phase => {
                const count = stats.byPhase[phase.id] || 0
                return (
                  <div key={phase.id} className="dv-legend-item">
                    <span className="dv-legend-dot" style={{ background: phase.color, boxShadow: `0 0 8px ${phase.color}40` }} />
                    <span className="dv-legend-label">{phase.label}</span>
                    <span className="dv-legend-count">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="dv-content">

        {/* ══ LEGACY CODEBASE — Big Visual Section ══ */}
        {memory && (
          <section className="dv-section dv-legacy-section" style={{ animationDelay: '.05s' }}>
            <div className="dv-section-header">
              <div className="dv-section-title-wrap">
                <div className="dv-section-badge dv-badge-orange">LEGACY</div>
                <h2 className="dv-section-title">Codebase Original — Java Seam</h2>
              </div>
              <span className="dv-legacy-tag">Lo que estamos modernizando</span>
            </div>

            <div className="dv-legacy-grid">
              {/* Big counter cards */}
              <div className="dv-big-stat">
                <div className="dv-big-stat-icon" style={{ background: 'rgba(249,115,22,.1)', color: '#f97316' }}>
                  <IconFile />
                </div>
                <span className="dv-big-stat-num">{xhtmlAnim.toLocaleString()}</span>
                <span className="dv-big-stat-label">Archivos XHTML</span>
                <span className="dv-big-stat-sub">Pantallas legacy</span>
              </div>
              <div className="dv-big-stat">
                <div className="dv-big-stat-icon" style={{ background: 'rgba(139,92,246,.1)', color: '#8b5cf6' }}>
                  <IconDatabase />
                </div>
                <span className="dv-big-stat-num">{beansAnim.toLocaleString()}</span>
                <span className="dv-big-stat-label">Session Beans</span>
                <span className="dv-big-stat-sub">Lógica de negocio</span>
              </div>
              <div className="dv-big-stat">
                <div className="dv-big-stat-icon" style={{ background: 'rgba(59,130,246,.1)', color: '#3b82f6' }}>
                  <IconLayers />
                </div>
                <span className="dv-big-stat-num">{entitiesAnim.toLocaleString()}</span>
                <span className="dv-big-stat-label">Entidades JPA</span>
                <span className="dv-big-stat-sub">Modelo de datos</span>
              </div>
              <div className="dv-big-stat">
                <div className="dv-big-stat-icon" style={{ background: 'rgba(5,150,105,.1)', color: '#059669' }}>
                  <IconShield />
                </div>
                <span className="dv-big-stat-num">{memory.codebase?.configFields || 189}</span>
                <span className="dv-big-stat-label">Config Fields</span>
                <span className="dv-big-stat-sub">Tabla laboratorio</span>
              </div>

              {/* Bar chart */}
              <div className="dv-legacy-bars">
                <h3 className="dv-sub-title">Composición del codebase</h3>
                <HBarChart items={legacyBars} maxVal={legacyMax} />
              </div>

              {/* Architecture & Auth */}
              <div className="dv-legacy-info-grid">
                <div className="dv-info-mini-card">
                  <div className="dv-info-mini-icon" style={{ color: '#8b5cf6' }}><IconGitBranch /></div>
                  <div className="dv-info-mini-body">
                    <span className="dv-info-mini-title">Arquitectura</span>
                    {(memory.architecture?.mappings || []).map((m, i) => (
                      <span key={i} className="dv-arch-mapping">{m}</span>
                    ))}
                  </div>
                </div>
                <div className="dv-info-mini-card">
                  <div className="dv-info-mini-icon" style={{ color: '#059669' }}><IconShield /></div>
                  <div className="dv-info-mini-body">
                    <span className="dv-info-mini-title">Sistema de Permisos</span>
                    <div className="dv-auth-stats">
                      <span className="dv-auth-pill"><strong>{memory.auth?.roles || 20}</strong> roles</span>
                      <span className="dv-auth-pill"><strong>{memory.auth?.modules || 17}</strong> módulos</span>
                      <span className="dv-auth-pill"><strong>{memory.auth?.activities || 23}</strong> actividades</span>
                      <span className="dv-auth-pill"><strong>{memory.auth?.permissions || 17}</strong> permisos</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══ SPRINT BOARD ══ */}
        {activeSprint && (
          <section className="dv-section" style={{ animationDelay: '.1s' }}>
            <div className="dv-section-header">
              <div className="dv-section-title-wrap">
                <div className="dv-section-badge">SPRINT</div>
                <h2 className="dv-section-title">{activeSprint.name}</h2>
              </div>
              <div className="dv-section-meta">
                <span className="dv-date-badge">{activeSprint.startDate} → {activeSprint.endDate}</span>
                <span className="dv-goal-text">{activeSprint.goal}</span>
              </div>
            </div>
            <div className="dv-kanban">
              {db.phases.filter(p => p.id !== 'not-started').map(phase => {
                const cards = sprintScreens.filter(s => s.phase === phase.id)
                return (
                  <div key={phase.id}
                    className={`dv-kanban-col ${dragOver === phase.id ? 'dv-kanban-col-over' : ''}`}
                    onDragOver={(e) => handleDragOver(e, phase.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, phase.id)}>
                    <div className="dv-kanban-head">
                      <span className="dv-kanban-dot" style={{ background: phase.color, boxShadow: `0 0 8px ${phase.color}40` }} />
                      <span className="dv-kanban-label">{phase.label}</span>
                      <span className="dv-kanban-count">{cards.length}</span>
                    </div>
                    <div className="dv-kanban-cards">
                      {cards.map(screen => {
                        const done = (screen.tasks || []).filter(t => t.done).length
                        const total = (screen.tasks || []).length
                        return (
                          <div key={screen.id} className="dv-kanban-card"
                            draggable
                            onDragStart={(e) => handleDragStart(e, screen.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => navigate(`/dev/screen/${screen.id}`)}>
                            <span className="dv-kanban-card-name">{screen.name}</span>
                            <div className="dv-kanban-card-foot">
                              <span className={`dv-chip dv-chip-${screen.priority.toLowerCase()}`}>{screen.priority}</span>
                              {total > 0 && (
                                <div className="dv-kanban-mini-bar">
                                  <div className="dv-kanban-mini-fill" style={{ width: `${(done/total)*100}%` }} />
                                </div>
                              )}
                              {total > 0 && <span className="dv-kanban-card-tasks">{done}/{total}</span>}
                            </div>
                          </div>
                        )
                      })}
                      {cards.length === 0 && <div className="dv-kanban-empty">—</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ══ DOCUMENTED SCREENS — Memory Status ══ */}
        {documentedScreens.length > 0 && (
          <section className="dv-section" style={{ animationDelay: '.15s' }}>
            <div className="dv-section-header">
              <div className="dv-section-title-wrap">
                <div className="dv-section-badge dv-badge-purple">MEMORIA</div>
                <h2 className="dv-section-title">Pantallas Documentadas</h2>
              </div>
              <span className="dv-memory-count">{documentedScreens.length} de ~{memory?.codebase?.coreScreens || 30} core</span>
            </div>
            <div className="dv-memory-grid">
              {documentedScreens.map((screen, i) => {
                const memStatusColors = { completed: '#059669', 'in-progress': '#3b82f6', researched: '#8b5cf6', investigacion: '#8b5cf6', 'desarrollo-estilos': '#3b82f6', 'desarrollo-funcionalidades': '#f59e0b', qa: '#22c55e', finalizado: '#059669', unknown: '#94a3b8', 'not-started': '#94a3b8' }
                const memStatusLabels = { completed: 'Completa', 'in-progress': 'En Progreso', researched: 'Investigada', investigacion: 'Investigación', 'desarrollo-estilos': 'Desarrollo', 'desarrollo-funcionalidades': 'Desarrollo', qa: 'QA', finalizado: 'Finalizada', unknown: 'Desconocido', 'not-started': 'Sin iniciar' }
                return (
                  <div key={i} className="dv-memory-card">
                    <div className="dv-memory-card-head">
                      <IconTarget />
                      <span className="dv-memory-card-name">{screen.name}</span>
                      <span className="dv-memory-status" style={{ background: `${memStatusColors[screen.status] || '#94a3b8'}18`, color: memStatusColors[screen.status] || '#94a3b8', borderColor: `${memStatusColors[screen.status] || '#94a3b8'}30` }}>
                        {memStatusLabels[screen.status] || screen.status}
                      </span>
                    </div>
                    {screen.gaps && screen.gaps.length > 0 && (
                      <div className="dv-memory-gaps">
                        <span className="dv-memory-gaps-title">Gaps identificados:</span>
                        {screen.gaps.map((gap, gi) => (
                          <span key={gi} className="dv-gap-item">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="2" x2="12" y2="14" /><circle cx="12" cy="19" r="1" fill="#f59e0b" /></svg>
                            {gap}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="dv-memory-file">{screen.file}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ══ INVENTORY GAP — Screens without memory ══ */}
        {memory && (() => {
          const withMemory = allScreens.filter(s => screenHasMemory(s.id))
          const withoutMemory = allScreens.filter(s => !screenHasMemory(s.id))
          const withVideo = allScreens.filter(s => screenHasVideo(s.id))
          const withReact = allScreens.filter(s => screenHasReact(s.id))
          return (
            <section className="dv-section" style={{ animationDelay: '.17s' }}>
              <div className="dv-section-header">
                <div className="dv-section-title-wrap">
                  <div className="dv-section-badge dv-badge-amber">INVENTARIO</div>
                  <h2 className="dv-section-title">Inventory Gap</h2>
                </div>
                <div className="dv-inv-summary">
                  <span className="dv-inv-pill dv-inv-pill-green">{withMemory.length} con memoria</span>
                  <span className="dv-inv-pill dv-inv-pill-red">{withoutMemory.length} sin memoria</span>
                  <span className="dv-inv-pill dv-inv-pill-blue">{withVideo.length} con video</span>
                  <span className="dv-inv-pill dv-inv-pill-cyan">{withReact.length} con React</span>
                </div>
              </div>
              <div className="dv-gap-grid">
                <div className="dv-gap-col">
                  <h4 className="dv-gap-col-title dv-gap-col-ok">Con Memoria ({withMemory.length})</h4>
                  {withMemory.map(s => (
                    <div key={s.id} className="dv-gap-item-row" onClick={() => navigate(`/dev/screen/${s.id}`)}>
                      <span className="dv-gap-dot dv-gap-dot-green" />
                      <span>{s.name}</span>
                    </div>
                  ))}
                </div>
                <div className="dv-gap-col">
                  <h4 className="dv-gap-col-title dv-gap-col-missing">Sin Memoria ({withoutMemory.length})</h4>
                  {withoutMemory.slice(0, 20).map(s => (
                    <div key={s.id} className="dv-gap-item-row" onClick={() => navigate(`/dev/screen/${s.id}`)}>
                      <span className="dv-gap-dot dv-gap-dot-red" />
                      <span>{s.name}</span>
                    </div>
                  ))}
                  {withoutMemory.length > 20 && (
                    <span className="dv-gap-more">+{withoutMemory.length - 20} más</span>
                  )}
                </div>
              </div>
            </section>
          )
        })()}

        {/* ══ MODULES — Full Width Cards ══ */}
        <section className="dv-section" style={{ animationDelay: '.2s' }}>
          <div className="dv-section-header">
            <div className="dv-section-title-wrap">
              <div className="dv-section-badge">MÓDULOS</div>
              <h2 className="dv-section-title">{db.modules.length} módulos · {stats.total} pantallas</h2>
            </div>
          </div>
          <div className="dv-modules-grid">
            {db.modules.map((mod, mi) => {
              const total = mod.screens.length
              const done = mod.screens.filter(s => s.phase === 'finalizado').length
              const active = mod.screens.filter(s => !['not-started', 'finalizado'].includes(s.phase)).length
              const pct = total > 0 ? Math.round(((done + active * 0.3) / total) * 100) : 0
              const isOpen = expanded[mod.id]
              const tierColors = ['#3b82f6','#8b5cf6','#f59e0b','#06b6d4','#059669']

              return (
                <div key={mod.id} className={`dv-mod-card ${isOpen ? 'dv-mod-card-open' : ''}`}>
                  <div className="dv-mod-card-head" onClick={() => setExpanded(e => ({ ...e, [mod.id]: !e[mod.id] }))}>
                    <div className="dv-mod-card-top">
                      <div className="dv-mod-ring-wrap">
                        <ProgressRing pct={pct} size={52} stroke={5} color={tierColors[mi] || '#3b82f6'} />
                        <span className="dv-mod-ring-pct">{pct}%</span>
                      </div>
                      <div className="dv-mod-card-info">
                        <span className="dv-mod-card-name">{mod.name}</span>
                        <span className="dv-mod-card-count">{active + done}/{total} pantallas</span>
                      </div>
                      <span className="dv-module-tier">T{mod.tier}</span>
                      <IconChevron open={isOpen} />
                    </div>
                    {/* Mini phase bar */}
                    <div className="dv-mod-phase-bar">
                      {db.phases.map(phase => {
                        const c = mod.screens.filter(s => s.phase === phase.id).length
                        if (c === 0) return null
                        return <div key={phase.id} className="dv-mod-phase-seg" style={{ flex: c, background: phase.color }} title={`${phase.label}: ${c}`} />
                      })}
                    </div>
                  </div>
                  {isOpen && (
                    <div className="dv-mod-card-body">
                      {mod.screens.map(screen => {
                        const ph = phaseMap[screen.phase]
                        const tasksDone = (screen.tasks || []).filter(t => t.done).length
                        const tasksTotal = (screen.tasks || []).length
                        return (
                          <div key={screen.id} className="dv-screen-row" onClick={() => navigate(`/dev/screen/${screen.id}`)}>
                            <span className="dv-screen-dot" style={{ background: ph?.color, boxShadow: `0 0 6px ${ph?.color}50` }} />
                            <span className="dv-screen-name">{screen.name}</span>
                            <div className="dv-screen-badges">
                              {screenHasMemory(screen.id) && <span className="dv-badge-sm dv-badge-researched">Investigado</span>}
                              {screenHasVideo(screen.id) && <span className="dv-badge-sm dv-badge-video">Video</span>}
                              {screenHasReact(screen.id) && <span className="dv-badge-sm dv-badge-react">React</span>}
                            </div>
                            {tasksTotal > 0 && (
                              <span className="dv-screen-tasks">{tasksDone}/{tasksTotal}</span>
                            )}
                            <span className="dv-chip dv-chip-phase" style={{ background: `${ph?.color}15`, color: ph?.color, border: `1px solid ${ph?.color}25` }}>{ph?.label}</span>
                            <span className={`dv-chip dv-chip-${screen.priority.toLowerCase()}`}>{screen.priority}</span>
                            <IconArrow />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ══ Bottom Row: Distribution + Radials | Tasks ══ */}
        <div className="dv-grid-2">
          {/* Distribution + Radials */}
          <section className="dv-section" style={{ animationDelay: '.3s' }}>
            <div className="dv-section-header">
              <div className="dv-section-title-wrap">
                <div className="dv-section-badge">VISIÓN</div>
                <h2 className="dv-section-title">Distribución por Fase</h2>
              </div>
            </div>

            {/* Big distribution bars */}
            <div className="dv-dist-enhanced">
              {db.phases.map(phase => {
                const count = stats.byPhase[phase.id] || 0
                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                return (
                  <div key={phase.id} className="dv-dist-row-lg">
                    <span className="dv-dist-dot-lg" style={{ background: phase.color, boxShadow: `0 0 8px ${phase.color}40` }} />
                    <span className="dv-dist-label-lg">{phase.label}</span>
                    <div className="dv-dist-bar-lg">
                      <div className="dv-dist-fill-lg" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${phase.color}, ${phase.color}88)` }} />
                    </div>
                    <span className="dv-dist-count-lg">{count}</span>
                    <span className="dv-dist-pct-lg">{pct}%</span>
                  </div>
                )
              })}
            </div>

            {/* Radial stats row */}
            {memory && (
              <div className="dv-radials-row">
                <RadialStat value={memory.auth?.roles || 20} label="Roles" color="#8b5cf6" max={30} icon={<IconShield />} />
                <RadialStat value={memory.codebase?.menuSections || 9} label="Secciones Menú" color="#06b6d4" max={12} icon={<IconLayers />} />
                <RadialStat value={memory.codebase?.menuItems || 80} label="Ítems Menú" color="#f59e0b" max={100} icon={<IconDatabase />} />
                <RadialStat value={memory.codebase?.coreScreens || 30} label="Core Screens" color="#3b82f6" max={50} icon={<IconTarget />} />
              </div>
            )}
          </section>

          {/* Tasks */}
          <section className="dv-section" style={{ animationDelay: '.4s' }}>
            <div className="dv-section-header">
              <div className="dv-section-title-wrap">
                <div className="dv-section-badge">TAREAS</div>
                <h2 className="dv-section-title">Pendientes</h2>
              </div>
              <span className="dv-task-count">{activeTasks.length}</span>
            </div>
            {activeTasks.length > 0 ? (
              <div className="dv-task-list">
                {activeTasks.map(task => (
                  <label key={`${task.screenId}-${task.id}`} className="dv-task">
                    <input type="checkbox" checked={false} onChange={() => handleToggleTask(task.screenId, task.id)} className="dv-task-check" />
                    <div className="dv-task-info">
                      <span className="dv-task-text">{task.text}</span>
                      <span className="dv-task-from">{task.screenName}</span>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="dv-empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
                <span>Todo al día</span>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="dv-footer">
        <span>labsisModernov1</span>
        <span className="dv-footer-sep" />
        <span>Dev Dashboard v4</span>
        {memory && (
          <>
            <span className="dv-footer-sep" />
            <span>{memory.codebase?.xhtmlTotal?.toLocaleString() || '2,455'} XHTML → React</span>
          </>
        )}
      </footer>
    </div>
  )
}
