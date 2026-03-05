import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboard, getStats, getMemory } from '../services/devApi'

/* ── Icons ── */
const IconBack = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
)
const IconCode = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
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
      setVal(Math.round((1 - Math.pow(1 - t, 3)) * target))
      if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return val
}

/* ── Phase Icon ── */
function PhaseIcon({ phaseId }) {
  const icons = {
    'not-started': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
    'investigacion': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    'desarrollo-estilos': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>,
    'desarrollo-funcionalidades': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
    'qa': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>,
    'finalizado': <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  }
  return icons[phaseId] || icons['not-started']
}

export default function DevProcess() {
  const navigate = useNavigate()
  const [db, setDb] = useState(null)
  const [stats, setStats] = useState(null)
  const [memory, setMemory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPhase, setSelectedPhase] = useState(null)

  const load = useCallback(async () => {
    try {
      const [d, s, m] = await Promise.all([getDashboard(), getStats(), getMemory()])
      setDb(d); setStats(s); setMemory(m)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalAnim = useCounter(stats?.total || 0)

  if (loading) return <div className="dv"><div className="dv-loading"><div className="dv-spinner" />Cargando proceso...</div></div>
  if (!db || !stats) return <div className="dv"><div className="dv-loading">Error cargando datos</div></div>

  const allScreens = db.modules.flatMap(m => m.screens)
  const phases = db.phases
  const phaseMap = Object.fromEntries(phases.map(p => [p.id, p]))

  // Group screens by phase
  const screensByPhase = {}
  phases.forEach(p => { screensByPhase[p.id] = [] })
  allScreens.forEach(s => {
    if (screensByPhase[s.phase]) screensByPhase[s.phase].push(s)
  })

  // Process descriptions
  const phaseDescriptions = {
    'not-started': 'Pantallas identificadas en el sistema legacy que aún no han comenzado el proceso de modernización.',
    'investigacion': 'Análisis del código original: XHTML, Java beans, flujos de datos, endpoints, permisos. Se documenta en archivos de memoria.',
    'desarrollo-estilos': 'Implementación del componente React con estilos CSS, layout responsive, y diseño visual siguiendo el brand manual.',
    'desarrollo-funcionalidades': 'Conexión con backend Express, endpoints API, lógica de negocio, filtros, paginación, validaciones.',
    'qa': 'Pruebas funcionales, revisión de UI, comparación con sistema legacy, validación de datos y permisos.',
    'finalizado': 'Pantalla completa, probada y lista para producción. Funcionalidad equivalente al sistema legacy.',
  }

  const phaseActivities = {
    'not-started': ['Identificar XHTML original', 'Mapear Java beans involucrados', 'Priorizar (P0-P3)', 'Asignar a sprint'],
    'investigacion': ['Leer código XHTML original', 'Documentar campos y filtros', 'Analizar lógica en Java beans', 'Crear archivo en memory/screens/', 'Identificar gaps y dependencias'],
    'desarrollo-estilos': ['Crear componente React (.jsx)', 'Diseñar layout con CSS', 'Implementar responsive design', 'Agregar skeleton loading', 'Seguir brand manual de colores'],
    'desarrollo-funcionalidades': ['Crear Express route handler', 'Implementar queries SQL (pg Pool)', 'Conectar frontend con fetch/API', 'Implementar filtros dinámicos', 'Agregar validaciones', 'Manejar permisos por rol'],
    'qa': ['Comparar con pantalla legacy', 'Probar todos los filtros', 'Verificar permisos por rol', 'Validar datos contra BD', 'Revisar responsive en móvil', 'Probar edge cases'],
    'finalizado': ['Deploy a producción', 'Documentar en _INDEX.md', 'Actualizar dashboard', 'Marcar como completada'],
  }

  return (
    <div className="dv">
      {/* Navbar */}
      <nav className="dv-nav">
        <div className="dv-nav-left">
          <button className="dv-nav-link" onClick={() => navigate('/dev')}>
            <IconBack /> Dashboard
          </button>
          <div className="dv-nav-icon"><IconCode /></div>
          <span className="dv-nav-brand">Lab<span>sis</span></span>
        </div>
        <div className="dv-nav-right">
          <button className="dv-nav-link dv-nav-active" onClick={() => navigate('/dev/process')}>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 3h6v8l4 8H5l4-8V3z" /><line x1="9" y1="3" x2="15" y2="3" /></svg>
            Ir a la App
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="dv-hero" style={{ padding: '32px 32px 24px' }}>
        <div className="dv-hero-bg" />
        <div className="dv-hero-aurora" />
        <div className="dv-hero-particles" />
        <div className="dv-hero-content">
          <div className="da-hero-inner">
            <h1 className="da-hero-title">Proceso de Desarrollo</h1>
            <p className="da-hero-sub">{totalAnim} pantallas · {phases.length} fases · De legacy a moderno</p>
            <p className="da-hero-desc">
              Cada pantalla del sistema Labsis pasa por este flujo de modernización.
              De XHTML/Java a React/Express, manteniendo la misma lógica y base de datos.
            </p>
          </div>
        </div>
      </div>

      <div className="dv-content" style={{ maxWidth: 1400 }}>

        {/* ══ PIPELINE FLOW — Visual horizontal ══ */}
        <section className="dv-section" style={{ animationDelay: '.05s' }}>
          <div className="dv-section-header">
            <div className="dv-section-title-wrap">
              <div className="dv-section-badge dv-badge-purple">PIPELINE</div>
              <h2 className="dv-section-title">Flujo de Modernización</h2>
            </div>
          </div>

          <div className="dp-pipeline">
            {phases.map((phase, i) => {
              const count = screensByPhase[phase.id]?.length || 0
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
              const isSelected = selectedPhase === phase.id
              return (
                <div key={phase.id} className="dp-pipeline-stage" onClick={() => setSelectedPhase(isSelected ? null : phase.id)}>
                  {i > 0 && (
                    <div className="dp-pipeline-arrow">
                      <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                        <path d="M0 12h30" stroke={phases[i-1].color} strokeWidth="2" strokeDasharray="4 3" />
                        <path d="M26 6l8 6-8 6" stroke={phase.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  <div className={`dp-stage-card ${isSelected ? 'dp-stage-active' : ''}`}
                    style={{ '--stage-color': phase.color }}>
                    <div className="dp-stage-icon" style={{ background: `${phase.color}15`, color: phase.color }}>
                      <PhaseIcon phaseId={phase.id} />
                    </div>
                    <span className="dp-stage-name">{phase.label}</span>
                    <div className="dp-stage-count-wrap">
                      <span className="dp-stage-count" style={{ color: phase.color }}>{count}</span>
                      <span className="dp-stage-pct">{pct}%</span>
                    </div>
                    <div className="dp-stage-bar">
                      <div className="dp-stage-bar-fill" style={{ width: `${pct}%`, background: phase.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ══ PHASE DETAIL — Expandable ══ */}
        {selectedPhase && (
          <section className="dv-section dp-detail-section" style={{ animationDelay: '.05s' }}>
            <div className="dv-section-header">
              <div className="dv-section-title-wrap">
                <span className="dv-screen-dot" style={{
                  background: phaseMap[selectedPhase]?.color,
                  boxShadow: `0 0 8px ${phaseMap[selectedPhase]?.color}40`,
                  width: 10, height: 10
                }} />
                <h2 className="dv-section-title">{phaseMap[selectedPhase]?.label}</h2>
              </div>
              <button className="dv-btn dv-btn-ghost dv-btn-sm" onClick={() => setSelectedPhase(null)}>Cerrar</button>
            </div>

            <p className="dp-phase-desc">{phaseDescriptions[selectedPhase]}</p>

            <div className="dp-detail-grid">
              {/* Activities */}
              <div className="dp-activities">
                <h3 className="dv-sub-title">Actividades en esta fase</h3>
                <div className="dp-activity-list">
                  {(phaseActivities[selectedPhase] || []).map((act, i) => (
                    <div key={i} className="dp-activity-item">
                      <span className="dp-activity-num" style={{ background: `${phaseMap[selectedPhase]?.color}15`, color: phaseMap[selectedPhase]?.color }}>{i + 1}</span>
                      <span className="dp-activity-text">{act}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Screens in this phase */}
              <div className="dp-phase-screens">
                <h3 className="dv-sub-title">Pantallas en esta fase ({screensByPhase[selectedPhase]?.length || 0})</h3>
                {(screensByPhase[selectedPhase] || []).length > 0 ? (
                  <div className="dp-screen-list">
                    {screensByPhase[selectedPhase].map(screen => {
                      const doneTasks = (screen.tasks || []).filter(t => t.done).length
                      const totalTasks = (screen.tasks || []).length
                      return (
                        <div key={screen.id} className="dp-screen-card" onClick={() => navigate(`/dev/screen/${screen.id}`)}>
                          <div className="dp-screen-card-top">
                            <span className="dp-screen-card-name">{screen.name}</span>
                            <span className={`dv-chip dv-chip-${screen.priority.toLowerCase()}`}>{screen.priority}</span>
                          </div>
                          {totalTasks > 0 && (
                            <div className="dp-screen-card-tasks">
                              <div className="dp-mini-bar">
                                <div className="dp-mini-bar-fill" style={{
                                  width: `${(doneTasks/totalTasks)*100}%`,
                                  background: phaseMap[selectedPhase]?.color
                                }} />
                              </div>
                              <span className="dp-screen-card-count">{doneTasks}/{totalTasks} tareas</span>
                            </div>
                          )}
                          {screen.notes && <span className="dp-screen-card-note">{screen.notes}</span>}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="dv-empty-state" style={{ padding: '30px 20px' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" />
                    </svg>
                    <span>Sin pantallas en esta fase</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ══ ALL SCREENS — Swimlane by Module ══ */}
        <section className="dv-section" style={{ animationDelay: '.15s' }}>
          <div className="dv-section-header">
            <div className="dv-section-title-wrap">
              <div className="dv-section-badge">MAPA</div>
              <h2 className="dv-section-title">Todas las Pantallas por Módulo y Fase</h2>
            </div>
          </div>

          <div className="dp-swimlane-table">
            {/* Header */}
            <div className="dp-swim-header">
              <div className="dp-swim-module-col">Módulo</div>
              {phases.map(p => (
                <div key={p.id} className="dp-swim-phase-col">
                  <span className="dp-swim-phase-dot" style={{ background: p.color }} />
                  <span className="dp-swim-phase-label">{p.label}</span>
                </div>
              ))}
            </div>

            {/* Rows */}
            {db.modules.map(mod => (
              <div key={mod.id} className="dp-swim-row">
                <div className="dp-swim-module-col">
                  <span className="dp-swim-mod-name">{mod.name}</span>
                  <span className="dp-swim-mod-count">{mod.screens.length} pantallas</span>
                </div>
                {phases.map(phase => {
                  const screensInPhase = mod.screens.filter(s => s.phase === phase.id)
                  return (
                    <div key={phase.id} className="dp-swim-cell">
                      {screensInPhase.map(s => (
                        <div key={s.id} className="dp-swim-chip"
                          style={{ background: `${phase.color}12`, color: phase.color, borderColor: `${phase.color}25` }}
                          onClick={() => navigate(`/dev/screen/${s.id}`)}
                          title={s.notes || s.name}>
                          {s.name}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </section>

        {/* ══ GUIDE — What each phase means ══ */}
        <section className="dv-section" style={{ animationDelay: '.2s' }}>
          <div className="dv-section-header">
            <div className="dv-section-title-wrap">
              <div className="dv-section-badge dv-badge-orange">GUÍA</div>
              <h2 className="dv-section-title">Guía del Proceso</h2>
            </div>
          </div>

          <div className="dp-guide-grid">
            {phases.map((phase, i) => (
              <div key={phase.id} className="dp-guide-card">
                <div className="dp-guide-header">
                  <div className="dp-guide-step" style={{ background: phase.color }}>
                    {i + 1}
                  </div>
                  <div className="dp-guide-title-wrap">
                    <span className="dp-guide-title">{phase.label}</span>
                    <span className="dp-guide-subtitle">{screensByPhase[phase.id]?.length || 0} pantallas</span>
                  </div>
                </div>
                <p className="dp-guide-desc">{phaseDescriptions[phase.id]}</p>
                <div className="dp-guide-activities">
                  {(phaseActivities[phase.id] || []).slice(0, 4).map((act, ai) => (
                    <div key={ai} className="dp-guide-act">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={phase.color} strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
                {i < phases.length - 1 && (
                  <div className="dp-guide-next" style={{ color: phases[i+1].color }}>
                    Siguiente: {phases[i+1].label} →
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ══ STATS SUMMARY ══ */}
        {memory && (
          <section className="dv-section" style={{ animationDelay: '.25s' }}>
            <div className="dv-section-header">
              <div className="dv-section-title-wrap">
                <div className="dv-section-badge">RESUMEN</div>
                <h2 className="dv-section-title">Estado General del Proyecto</h2>
              </div>
            </div>
            <div className="dp-summary-grid">
              <div className="dp-summary-card">
                <span className="dp-summary-num" style={{ color: '#3b82f6' }}>{stats.total}</span>
                <span className="dp-summary-label">Pantallas Total</span>
                <span className="dp-summary-sub">Trackeadas en {db.modules.length} módulos</span>
              </div>
              <div className="dp-summary-card">
                <span className="dp-summary-num" style={{ color: '#059669' }}>{stats.completed}</span>
                <span className="dp-summary-label">Finalizadas</span>
                <span className="dp-summary-sub">{stats.percentComplete}% completado</span>
              </div>
              <div className="dp-summary-card">
                <span className="dp-summary-num" style={{ color: '#f59e0b' }}>{stats.inProgress}</span>
                <span className="dp-summary-label">En Progreso</span>
                <span className="dp-summary-sub">Investigación + Desarrollo + QA</span>
              </div>
              <div className="dp-summary-card">
                <span className="dp-summary-num" style={{ color: '#f97316' }}>{memory.codebase?.xhtmlTotal?.toLocaleString()}</span>
                <span className="dp-summary-label">XHTML Legacy</span>
                <span className="dp-summary-sub">Archivos en sistema original</span>
              </div>
              <div className="dp-summary-card">
                <span className="dp-summary-num" style={{ color: '#8b5cf6' }}>{(memory.screens || []).filter(s => s.hasMemory).length}</span>
                <span className="dp-summary-label">Documentadas</span>
                <span className="dp-summary-sub">Con archivo de memoria</span>
              </div>
              <div className="dp-summary-card">
                <span className="dp-summary-num" style={{ color: '#06b6d4' }}>{stats.pendingTasks + stats.doneTasks}</span>
                <span className="dp-summary-label">Subtareas Total</span>
                <span className="dp-summary-sub">{stats.doneTasks} completadas, {stats.pendingTasks} pendientes</span>
              </div>
            </div>
          </section>
        )}
      </div>

      <footer className="dv-footer">
        <span>labsisModernov1</span>
        <span className="dv-footer-sep" />
        <span>Proceso de Desarrollo</span>
      </footer>
    </div>
  )
}
