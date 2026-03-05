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
const IconPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
)

export default function DevDocs() {
  const navigate = useNavigate()
  const [db, setDb] = useState(null)
  const [stats, setStats] = useState(null)
  const [memory, setMemory] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [d, s, m] = await Promise.all([getDashboard(), getStats(), getMemory()])
      setDb(d); setStats(s); setMemory(m)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="dv"><div className="dv-loading"><div className="dv-spinner" />Cargando...</div></div>
  if (!db || !stats) return <div className="dv"><div className="dv-loading">Error</div></div>

  const allScreens = db.modules.flatMap(m => m.screens)
  const documented = (memory?.screens || []).filter(s => s.hasMemory).length

  const sections = [
    {
      title: 'Dashboard Principal',
      route: '/dev',
      desc: 'Centro de control del proyecto. Muestra el estado general de las ' + stats.total + ' pantallas que estamos modernizando, agrupadas por módulo y fase.',
      monitors: [
        'Total de pantallas trackeadas y porcentaje de avance global',
        'Distribución por fase: cuántas pantallas están en cada etapa del proceso',
        'Sprint activo: tablero Kanban con drag & drop para mover pantallas entre fases',
        'Tareas pendientes: subtareas activas de las pantallas en progreso',
        'Codebase legacy: métricas del sistema original (XHTML, beans, entidades)',
        'Pantallas documentadas: cuáles tienen archivo de memoria con investigación'
      ],
      why: 'Para tener visibilidad completa del avance del proyecto en un solo vistazo. El sprint board permite reorganizar prioridades rápidamente.'
    },
    {
      title: 'Proceso de Desarrollo',
      route: '/dev/process',
      desc: 'Guía visual del flujo que sigue cada pantalla desde que se identifica hasta que está finalizada.',
      monitors: [
        'Pipeline visual: cada fase del proceso con la cantidad de pantallas en ella',
        'Detalle por fase: al hacer click, muestra las actividades y las pantallas actuales',
        'Mapa de swimlanes: todas las pantallas organizadas por módulo y fase simultáneamente',
        'Guía completa: descripción paso a paso de qué se hace en cada fase',
        'Resumen estadístico: métricas generales del proyecto y subtareas'
      ],
      why: 'Para entender el método de trabajo y poder compartirlo con otros. Cada pantalla pasa por: Investigación → Desarrollo (Estilos + Funcionalidades) → QA → Finalizado.'
    },
    {
      title: 'Arquitectura',
      route: '/dev/arch',
      desc: 'Documentación técnica de cómo estamos transformando el sistema legacy Java Seam a React + Express moderno.',
      monitors: [
        'Diagrama de flujo: Legacy → Moderno → Base de Datos',
        'Stack tecnológico: React 19, Vite 7, Express 5, PostgreSQL, etc.',
        'Codebase verificado: conteo real de archivos legacy (XHTML, beans, entidades, parsers)',
        'Mapeo Java → React: cómo se traduce cada componente del sistema original',
        'Sistema de permisos: ' + (memory?.auth?.roles || 0) + ' roles, módulos, actividades, permisos',
        'Inventario de pantallas: status de documentación y gaps identificados'
      ],
      why: 'Para entender la magnitud del proyecto y las decisiones técnicas. Los ' + (memory?.codebase?.xhtmlTotal?.toLocaleString() || '2,455') + ' archivos XHTML del sistema legacy son verificados directamente del código fuente.'
    },
    {
      title: 'Detalle de Pantalla',
      route: '/dev/screen/:id',
      desc: 'Vista individual de cada pantalla del proyecto. Accesible desde cualquier card/chip del dashboard.',
      monitors: [
        'Stepper visual: progreso de la pantalla por las fases del proceso',
        'Información: módulo, sprint, componente React, fecha de actualización',
        'Notas editables: contexto libre para documentar observaciones y decisiones',
        'Subtareas: checklist interactivo (agregar, completar, eliminar)',
        'Navegación de fase: botones para avanzar o retroceder la pantalla en el pipeline'
      ],
      why: 'Para hacer seguimiento granular de cada pantalla individual. Las subtareas son el nivel más bajo de tracking — cada una representa un entregable específico.'
    }
  ]

  const dataFlows = [
    {
      source: 'dev-dashboard.json',
      desc: 'Archivo JSON en el servidor. Contiene módulos, pantallas, fases, sprints, subtareas.',
      usage: 'Dashboard, Proceso, Detalle — todo lo operativo del proyecto',
      type: 'CRUD'
    },
    {
      source: 'memory/labsis/_INDEX.md',
      desc: 'Inventario maestro del proyecto. Conteo de archivos legacy, status de pantallas.',
      usage: 'Métricas del codebase legacy, estadísticas verificadas',
      type: 'Read-only'
    },
    {
      source: 'memory/labsis/_AUTH.md',
      desc: 'Sistema de permisos: roles, módulos, actividades, permisos.',
      usage: 'Arquitectura → tab Permisos, conteo de roles dinámico',
      type: 'Read-only'
    },
    {
      source: 'memory/labsis/_PATTERNS.md',
      desc: 'Mapeo de componentes Java Seam a React/Express.',
      usage: 'Arquitectura → tab Mapeo, cards de traducción',
      type: 'Read-only'
    },
    {
      source: 'memory/labsis/screens/*.md',
      desc: 'Documentación individual por pantalla. Gaps, campos, endpoints.',
      usage: 'Dashboard → Pantallas Documentadas, Arquitectura → Inventario',
      type: 'Read-only (auto-discovered)'
    }
  ]

  return (
    <div className="dv">
      <nav className="dv-nav">
        <div className="dv-nav-left">
          <button className="dv-nav-link" onClick={() => navigate('/dev')}>
            <IconBack /> Dashboard
          </button>
          <div className="dv-nav-icon"><IconCode /></div>
          <span className="dv-nav-brand">Lab<span>sis</span></span>
        </div>
        <div className="dv-nav-right">
          <button className="dv-nav-link" onClick={() => navigate('/dev/process')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            Proceso
          </button>
          <button className="dv-nav-link" onClick={() => navigate('/dev/arch')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
            Arquitectura
          </button>
          <button className="dv-nav-link dv-nav-active" onClick={() => navigate('/dev/docs')}>
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
          <button className="dv-nav-link" onClick={() => window.print()}>
            <IconPrint /> Imprimir
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
            <h1 className="da-hero-title">Documentación del Dev Dashboard</h1>
            <p className="da-hero-sub">Qué monitoreamos, por qué, y cómo funciona</p>
            <p className="da-hero-desc">
              Este documento explica cada sección del panel de desarrollo de labsisModernov1.
              Los datos se leen dinámicamente de los archivos de memoria del proyecto.
            </p>
          </div>
        </div>
      </div>

      <div className="dv-content" style={{ maxWidth: 900 }}>

        {/* ══ Project Overview ══ */}
        <section className="dv-section dd-doc-section" style={{ animationDelay: '.05s' }}>
          <div className="dv-section-header">
            <div className="dv-section-title-wrap">
              <div className="dv-section-badge">PROYECTO</div>
              <h2 className="dv-section-title">Resumen del Proyecto</h2>
            </div>
          </div>
          <div className="dd-overview-grid">
            <div className="dd-overview-item">
              <span className="dd-ov-label">Proyecto</span>
              <span className="dd-ov-value">labsisModernov1</span>
            </div>
            <div className="dd-overview-item">
              <span className="dd-ov-label">Objetivo</span>
              <span className="dd-ov-value">Modernizar el frontend de Labsis de Java/XHTML a React + Express</span>
            </div>
            <div className="dd-overview-item">
              <span className="dd-ov-label">Filosofía</span>
              <span className="dd-ov-value">"Remodelar la casa, no reconstruirla" — misma BD, misma lógica, nueva UI</span>
            </div>
            <div className="dd-overview-item">
              <span className="dd-ov-label">Stack</span>
              <span className="dd-ov-value">React 19 + Vite 7 + Express 5 + PostgreSQL (labsisEG)</span>
            </div>
            <div className="dd-overview-item">
              <span className="dd-ov-label">Pantallas trackeadas</span>
              <span className="dd-ov-value dd-ov-mono">{stats.total}</span>
            </div>
            <div className="dd-overview-item">
              <span className="dd-ov-label">Módulos</span>
              <span className="dd-ov-value dd-ov-mono">{db.modules.length}</span>
            </div>
            <div className="dd-overview-item">
              <span className="dd-ov-label">Archivos legacy</span>
              <span className="dd-ov-value dd-ov-mono">{memory?.codebase?.xhtmlTotal?.toLocaleString()} XHTML + {memory?.codebase?.sessionBeans?.toLocaleString()} beans</span>
            </div>
            <div className="dd-overview-item">
              <span className="dd-ov-label">Pantallas documentadas</span>
              <span className="dd-ov-value dd-ov-mono">{documented} con archivo de memoria</span>
            </div>
          </div>
        </section>

        {/* ══ Process Flow ══ */}
        <section className="dv-section dd-doc-section" style={{ animationDelay: '.1s' }}>
          <div className="dv-section-header">
            <div className="dv-section-title-wrap">
              <div className="dv-section-badge dv-badge-purple">PROCESO</div>
              <h2 className="dv-section-title">Fases del Desarrollo</h2>
            </div>
          </div>
          <p className="dd-doc-text">
            Cada pantalla del sistema pasa por estas {db.phases.length} fases en orden.
            El avance se mide automáticamente según la fase actual de cada pantalla.
          </p>
          <div className="dd-phases-list">
            {db.phases.map((phase, i) => {
              const count = stats.byPhase[phase.id] || 0
              return (
                <div key={phase.id} className="dd-phase-item">
                  <div className="dd-phase-num" style={{ background: phase.color }}>{i + 1}</div>
                  <div className="dd-phase-info">
                    <div className="dd-phase-header">
                      <span className="dd-phase-name">{phase.label}</span>
                      <span className="dd-phase-count" style={{ color: phase.color }}>{count} pantallas</span>
                    </div>
                    <p className="dd-phase-desc">
                      {phase.id === 'not-started' && 'Pantallas identificadas que aún no comienzan. Están priorizadas (P0-P3) pero sin trabajo activo.'}
                      {phase.id === 'investigacion' && 'Análisis del código legacy: XHTML, Java beans, flujos de datos. Se crea documentación en archivos de memoria.'}
                      {phase.id === 'desarrollo-estilos' && 'Creación del componente React con layout, CSS responsive, skeleton loading. Diseño visual siguiendo el brand manual.'}
                      {phase.id === 'desarrollo-funcionalidades' && 'Backend Express (routes, SQL queries), conexión con API, filtros, validaciones, permisos por rol.'}
                      {phase.id === 'qa' && 'Pruebas funcionales, comparación con sistema legacy, validación de datos, responsive, permisos.'}
                      {phase.id === 'finalizado' && 'Pantalla completa y lista para producción. Funcionalidad equivalente al sistema original.'}
                    </p>
                  </div>
                  {i < db.phases.length - 1 && (
                    <div className="dd-phase-arrow">→</div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ══ Dashboard Sections ══ */}
        <section className="dv-section dd-doc-section" style={{ animationDelay: '.15s' }}>
          <div className="dv-section-header">
            <div className="dv-section-title-wrap">
              <div className="dv-section-badge dv-badge-orange">SECCIONES</div>
              <h2 className="dv-section-title">Qué Monitoreamos</h2>
            </div>
          </div>
          <p className="dd-doc-text">
            El dashboard tiene 4 pantallas principales. Cada una muestra datos en tiempo real
            leídos de los archivos del proyecto.
          </p>
          <div className="dd-sections-list">
            {sections.map((section, i) => (
              <div key={i} className="dd-section-card">
                <div className="dd-sec-header">
                  <span className="dd-sec-num">{i + 1}</span>
                  <div className="dd-sec-title-wrap">
                    <span className="dd-sec-title">{section.title}</span>
                    <span className="dd-sec-route">{section.route}</span>
                  </div>
                </div>
                <p className="dd-sec-desc">{section.desc}</p>
                <div className="dd-sec-monitors">
                  <span className="dd-sec-monitors-title">Qué se monitorea:</span>
                  {section.monitors.map((m, mi) => (
                    <div key={mi} className="dd-sec-monitor">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
                <div className="dd-sec-why">
                  <strong>Por qué:</strong> {section.why}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ Data Sources ══ */}
        <section className="dv-section dd-doc-section" style={{ animationDelay: '.2s' }}>
          <div className="dv-section-header">
            <div className="dv-section-title-wrap">
              <div className="dv-section-badge">DATOS</div>
              <h2 className="dv-section-title">Fuentes de Datos</h2>
            </div>
          </div>
          <p className="dd-doc-text">
            Todos los datos del dashboard son dinámicos. No hay datos hardcodeados — todo
            se lee en tiempo real de estos archivos:
          </p>
          <div className="dd-data-table">
            <div className="dd-data-header">
              <span style={{ flex: 2 }}>Fuente</span>
              <span style={{ flex: 2 }}>Descripción</span>
              <span style={{ flex: 2 }}>Se usa en</span>
              <span style={{ flex: 1 }}>Tipo</span>
            </div>
            {dataFlows.map((df, i) => (
              <div key={i} className="dd-data-row">
                <span className="dd-data-source" style={{ flex: 2 }}>{df.source}</span>
                <span style={{ flex: 2 }}>{df.desc}</span>
                <span style={{ flex: 2 }}>{df.usage}</span>
                <span className="dd-data-type" style={{ flex: 1 }}>{df.type}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ══ Current State ══ */}
        <section className="dv-section dd-doc-section" style={{ animationDelay: '.25s' }}>
          <div className="dv-section-header">
            <div className="dv-section-title-wrap">
              <div className="dv-section-badge">ESTADO</div>
              <h2 className="dv-section-title">Estado Actual (en vivo)</h2>
            </div>
          </div>
          <div className="dd-state-grid">
            {db.modules.map(mod => {
              const done = mod.screens.filter(s => s.phase === 'finalizado').length
              const active = mod.screens.filter(s => !['not-started', 'finalizado'].includes(s.phase)).length
              return (
                <div key={mod.id} className="dd-state-card">
                  <span className="dd-state-mod">{mod.name}</span>
                  <span className="dd-state-tier">Tier {mod.tier}</span>
                  <div className="dd-state-bar">
                    {db.phases.map(p => {
                      const c = mod.screens.filter(s => s.phase === p.id).length
                      return c > 0 ? <div key={p.id} style={{ flex: c, background: p.color, height: 6, borderRadius: 3 }} title={`${p.label}: ${c}`} /> : null
                    })}
                  </div>
                  <span className="dd-state-nums">{done + active}/{mod.screens.length} activas · {done} finalizadas</span>
                </div>
              )
            })}
          </div>
        </section>

        <div className="dd-footer-note">
          <p>Este documento se genera dinámicamente con datos reales del proyecto.</p>
          <p>Última actualización de datos: {new Date(db.meta.lastUpdated).toLocaleString('es-MX')}</p>
        </div>
      </div>

      <footer className="dv-footer">
        <span>labsisModernov1</span>
        <span className="dv-footer-sep" />
        <span>Documentación</span>
      </footer>
    </div>
  )
}
