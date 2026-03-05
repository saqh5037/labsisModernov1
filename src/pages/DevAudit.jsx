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
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IconWarn = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)
const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
  </svg>
)

const AUDIT_CATEGORIES = [
  {
    id: 'data-integrity',
    name: 'Integridad de Datos',
    icon: '🗄️',
    description: 'Verificar que la migración preserva la integridad de los datos',
    checks: [
      { id: 'db-connection', label: 'Conexión a BD PostgreSQL labsisEG', status: 'pass', detail: 'localhost:5432, user:labsis — conexión verificada' },
      { id: 'config-fields', label: '189 campos de configuración (tabla laboratorio)', status: 'pass', detail: 'Mapeados en _CONFIG.md, accesibles via /api/config' },
      { id: 'ot-queries', label: 'Queries de Órdenes de Trabajo', status: 'pass', detail: 'Lista, detalle, lab — queries verificados vs legacy' },
      { id: 'pac-queries', label: 'Queries de Pacientes', status: 'warn', detail: '192,211 registros. Queries de lista verificados, detalle pendiente' },
      { id: 'fact-queries', label: 'Queries de Facturación', status: 'pending', detail: 'Módulo no migrado aún' },
      { id: 'catalogo-queries', label: 'Queries de Catálogos', status: 'pending', detail: 'Pruebas, áreas, servicios — no migrado aún' },
    ]
  },
  {
    id: 'ui-consistency',
    name: 'Consistencia Visual',
    icon: '🎨',
    description: 'Validar que el UI sigue el Brand Manual v3 (Liquid Glass)',
    checks: [
      { id: 'brand-colors', label: 'Paleta de colores del Brand Manual', status: 'pass', detail: 'Blues, grays, semantic colors implementados' },
      { id: 'typography', label: 'Tipografía Inter + JetBrains Mono', status: 'pass', detail: 'Fuentes cargadas via @fontsource-variable' },
      { id: 'glass-levels', label: '3 niveles de glass aplicados correctamente', status: 'pass', detail: 'glass-1 navbar/sidebar, glass-2 cards/modals, glass-3 tooltips' },
      { id: 'glass-restrictions', label: 'Restricciones de glass respetadas', status: 'pass', detail: 'NO glass en tablas, inputs, botones, texto médico' },
      { id: 'responsive', label: 'Layout responsivo (desktop/tablet/mobile)', status: 'warn', detail: 'Desktop OK, tablet parcial, mobile pendiente' },
      { id: 'dark-mode', label: 'Modo oscuro', status: 'pending', detail: 'Solo light mode implementado' },
      { id: 'accessibility', label: 'Accesibilidad (ARIA, contraste, teclado)', status: 'pending', detail: 'No auditado aún' },
    ]
  },
  {
    id: 'security',
    name: 'Seguridad',
    icon: '🔒',
    description: 'Verificar autenticación, autorización y protección de datos',
    checks: [
      { id: 'auth-login', label: 'Login con credenciales de BD', status: 'pass', detail: 'AuthContext + bcrypt hash verification' },
      { id: 'auth-jwt', label: 'JWT token para sesiones', status: 'pass', detail: 'Token en localStorage, expiración configurada' },
      { id: 'protected-routes', label: 'Rutas protegidas (ProtectedRoute)', status: 'pass', detail: 'Todas las rutas /ordenes/* requieren auth' },
      { id: 'role-check', label: 'Verificación de roles/permisos', status: 'warn', detail: '20 roles en BD. Verificación básica implementada, granular pendiente' },
      { id: 'sql-injection', label: 'Protección contra SQL injection', status: 'pass', detail: 'Queries parametrizados con pg pool' },
      { id: 'xss', label: 'Protección contra XSS', status: 'pass', detail: 'React escapa HTML por defecto, no dangerouslySetInnerHTML' },
      { id: 'csrf', label: 'Protección CSRF', status: 'pending', detail: 'No implementado — evaluar necesidad' },
      { id: 'rate-limit', label: 'Rate limiting en API', status: 'pending', detail: 'No implementado' },
    ]
  },
  {
    id: 'performance',
    name: 'Performance',
    icon: '⚡',
    description: 'Auditar tiempos de carga, bundle size y optimizaciones',
    checks: [
      { id: 'bundle-size', label: 'Bundle size < 1MB', status: 'pass', detail: 'JS: 623KB (176KB gzip), CSS: 175KB (33KB gzip)' },
      { id: 'code-splitting', label: 'Code splitting por ruta', status: 'pending', detail: 'Todo en un chunk — considerar lazy loading' },
      { id: 'query-perf', label: 'Queries con índices apropiados', status: 'warn', detail: 'OT list tiene indexes, paciente tiene 7. Revisar queries lentos' },
      { id: 'pagination', label: 'Paginación en listas grandes', status: 'pass', detail: 'OT list: server-side pagination 25/page' },
      { id: 'image-opt', label: 'Imágenes optimizadas', status: 'pass', detail: 'Solo logo PNG (25KB), SVGs para iconos' },
      { id: 'caching', label: 'Caching de datos frecuentes', status: 'pending', detail: 'Sin cache — config flags podrían cachearse' },
    ]
  },
  {
    id: 'functionality',
    name: 'Funcionalidad',
    icon: '🧪',
    description: 'Verificar que las funciones migradas producen los mismos resultados',
    checks: [
      { id: 'ot-list-filters', label: 'OT Lista — filtros funcionan igual que legacy', status: 'pass', detail: 'Todos los filtros verificados: número, paciente, fecha, área, status' },
      { id: 'ot-list-pag', label: 'OT Lista — paginación correcta', status: 'pass', detail: 'Server-side, count total, navegación' },
      { id: 'ot-detail-view', label: 'OT Detalle — datos completos', status: 'warn', detail: 'Datos principales OK, secciones secundarias en progreso' },
      { id: 'ot-lab-results', label: 'OT Lab — entrada de resultados', status: 'pending', detail: 'Pantalla en fase de investigación' },
      { id: 'print-ot', label: 'Impresión de Orden de Trabajo', status: 'pass', detail: 'PrintOrdenTrabajo con layout de impresión' },
      { id: 'print-etiqueta', label: 'Impresión de Etiquetas', status: 'pass', detail: 'PrintEtiqueta funcional' },
      { id: 'print-recibo', label: 'Impresión de Recibo de Crédito', status: 'pass', detail: 'PrintReciboCredito funcional' },
    ]
  },
  {
    id: 'documentation',
    name: 'Documentación',
    icon: '📝',
    description: 'Estado de la documentación del proyecto',
    checks: [
      { id: 'memory-index', label: '_INDEX.md — Inventario maestro', status: 'pass', detail: '74 pantallas registradas en dashboard' },
      { id: 'memory-config', label: '_CONFIG.md — 189 campos config', status: 'pass', detail: 'Documentado completo con valores EG' },
      { id: 'memory-patterns', label: '_PATTERNS.md — Mapeo Seam→React', status: 'pass', detail: 'Patrones de conversión documentados' },
      { id: 'memory-auth', label: '_AUTH.md — Sistema de permisos', status: 'pass', detail: '20 roles, 17 módulos, 8 actividades documentados' },
      { id: 'memory-screens', label: 'Screens .md — Documentación por pantalla', status: 'warn', detail: '9 de ~110 pantallas tienen documentación individual' },
      { id: 'memory-inventory', label: '_SCREENS_INVENTORY.md — Inventario legacy', status: 'pass', detail: '110 core screens identificadas, exclusiones documentadas' },
      { id: 'brand-manual', label: 'Brand Manual v3 integrado', status: 'pass', detail: '33 secciones, visor /dev/brand' },
      { id: 'api-docs', label: 'Documentación de API endpoints', status: 'pending', detail: 'Endpoints existen pero sin documentación formal' },
    ]
  },
  {
    id: 'migration-coverage',
    name: 'Cobertura de Migración',
    icon: '🔄',
    description: 'Progreso de la migración Java Seam → React',
    checks: [
      { id: 'screens-tracked', label: '74/110 pantallas en dashboard', status: 'pass', detail: '67% de pantallas core siendo trackeadas' },
      { id: 'screens-researched', label: '9/110 pantallas investigadas', status: 'warn', detail: '8% con documentación de memoria' },
      { id: 'screens-react', label: '10 pantallas con código React', status: 'warn', detail: 'Rutas: ordenes, detalle, lab, prints, login' },
      { id: 'screens-complete', label: 'Pantallas completamente migradas', status: 'warn', detail: 'OT Lista es la única completamente funcional' },
      { id: 'video-docs', label: '9 pantallas con video-documentación', status: 'pass', detail: 'Frames extraídos en /tmp/labsis-frames/' },
      { id: 'legacy-exclusions', label: 'Exclusiones documentadas', status: 'pass', detail: '644 archivos excluidos (layouts, modals, BIRT, etc.)' },
    ]
  },
]

// Enrich static checks with live data from APIs
function enrichChecks(categories, stats, memory, dashboard) {
  if (!stats || !memory) return categories

  const totalScreens = stats.total || 0
  const coreTotal = memory.codebase?.coreScreensTotal || 110
  const documented = (memory.screens || []).filter(s => s.hasMemory).length
  const videoScreens = memory.videoScreens?.length || 0
  const reactRoutes = memory.codebase?.reactRoutes || 0
  const xhtml = memory.codebase?.xhtmlTotal || 2455
  const paciente = memory.pacienteModule || {}
  const configFields = memory.codebase?.configFields || 189
  const roles = memory.auth?.roles || 20
  const modules = memory.auth?.modulesList?.length || 17

  const overrides = {
    'config-fields': { detail: `${configFields} campos mapeados en _CONFIG.md, accesibles via /api/config` },
    'pac-queries': { detail: `${(paciente.totalRecords || 192211).toLocaleString()} registros, ${paciente.columns || 74} columnas. Queries de lista verificados, detalle pendiente` },
    'bundle-size': { detail: `JS: 623KB (176KB gzip), CSS: 175KB (33KB gzip) — ${totalScreens} pantallas` },
    'role-check': { detail: `${roles} roles, ${modules} módulos en BD. Verificación básica implementada, granular pendiente` },
    'memory-screens': { detail: `${documented} de ~${coreTotal} pantallas tienen documentación individual` },
    'memory-index': { detail: `${totalScreens} pantallas registradas en dashboard` },
    'screens-tracked': {
      label: `${totalScreens}/${coreTotal} pantallas en dashboard`,
      detail: `${Math.round((totalScreens/coreTotal)*100)}% de pantallas core siendo trackeadas`,
      status: totalScreens >= coreTotal * 0.6 ? 'pass' : 'warn'
    },
    'screens-researched': {
      label: `${documented}/${coreTotal} pantallas investigadas`,
      detail: `${Math.round((documented/coreTotal)*100)}% con documentación de memoria`,
    },
    'screens-react': {
      label: `${reactRoutes} pantallas con código React`,
      detail: `Rutas React activas: ordenes, detalle, lab, prints, login, pacientes`,
    },
    'video-docs': {
      label: `${videoScreens} pantallas con video-documentación`,
      detail: `Frames extraídos en /tmp/labsis-frames/`,
    },
    'legacy-exclusions': {
      detail: `${Object.values(memory.codebase?.exclusions || {}).reduce((a, b) => a + b, 0)} archivos excluidos (layouts, modals, BIRT, etc.)`,
    },
  }

  return categories.map(cat => ({
    ...cat,
    checks: cat.checks.map(check => {
      const o = overrides[check.id]
      return o ? { ...check, ...o } : check
    })
  }))
}

export default function DevAudit() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [memory, setMemory] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [expandedCats, setExpandedCats] = useState(
    Object.fromEntries(AUDIT_CATEGORIES.map(c => [c.id, true]))
  )
  const [filterStatus, setFilterStatus] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)

  const loadData = useCallback(async () => {
    setRefreshing(true)
    try {
      const [s, m, d] = await Promise.all([getStats(), getMemory(), getDashboard()])
      setStats(s)
      setMemory(m)
      setDashboard(d)
      setLastRefresh(new Date())
    } catch (e) { console.error(e) }
    finally { setRefreshing(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const toggleCat = (id) => setExpandedCats(e => ({ ...e, [id]: !e[id] }))

  // Enrich with live data
  const liveCategories = enrichChecks(AUDIT_CATEGORIES, stats, memory, dashboard)

  // Count totals
  const allChecks = liveCategories.flatMap(c => c.checks)
  const passCount = allChecks.filter(c => c.status === 'pass').length
  const warnCount = allChecks.filter(c => c.status === 'warn').length
  const pendingCount = allChecks.filter(c => c.status === 'pending').length
  const totalCount = allChecks.length
  const healthPct = Math.round((passCount / totalCount) * 100)

  const statusColors = { pass: '#059669', warn: '#f59e0b', pending: '#94a3b8' }
  const statusLabels = { pass: 'OK', warn: 'Atención', pending: 'Pendiente' }
  const statusIcons = { pass: <IconCheck />, warn: <IconWarn />, pending: <IconClock /> }

  const filteredCategories = liveCategories.map(cat => ({
    ...cat,
    checks: filterStatus === 'all' ? cat.checks : cat.checks.filter(c => c.status === filterStatus)
  })).filter(cat => cat.checks.length > 0)

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
          <button className="dv-nav-link dv-nav-active" onClick={() => navigate('/dev/audit')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" /></svg>
            Auditoría
          </button>
          <button className="dv-nav-link" onClick={() => navigate('/qa')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            QA
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
        <div className="dv-hero-content" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: 0 }}>Auditoría del Proyecto</h1>
            <button
              className="dv-nav-link dau-refresh-btn"
              onClick={loadData}
              disabled={refreshing}
              style={{
                background: refreshing ? 'rgba(255,255,255,.1)' : 'rgba(59,130,246,.2)',
                borderColor: 'rgba(59,130,246,.4)',
                color: '#fff',
                cursor: refreshing ? 'wait' : 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              {refreshing ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)', margin: '4px 0 16px' }}>
            Verificación sistemática de la migración Java Seam → React
            {lastRefresh && (
              <span style={{ marginLeft: '12px', fontSize: '11px', opacity: 0.6 }}>
                Actualizado: {lastRefresh.toLocaleTimeString('es-MX')}
              </span>
            )}
          </p>

          {/* Summary cards */}
          <div className="dv-inventory-cards">
            <div className="dv-inv-card" style={{ borderColor: 'rgba(5,150,105,.4)' }}>
              <span className="dv-inv-num" style={{ color: '#34d399' }}>{passCount}</span>
              <span className="dv-inv-label">Aprobados</span>
              <span className="dv-inv-sub">verificados</span>
            </div>
            <div className="dv-inv-card" style={{ borderColor: 'rgba(245,158,11,.4)' }}>
              <span className="dv-inv-num" style={{ color: '#fbbf24' }}>{warnCount}</span>
              <span className="dv-inv-label">Atención</span>
              <span className="dv-inv-sub">parciales</span>
            </div>
            <div className="dv-inv-card" style={{ borderColor: 'rgba(148,163,184,.4)' }}>
              <span className="dv-inv-num" style={{ color: '#94a3b8' }}>{pendingCount}</span>
              <span className="dv-inv-label">Pendientes</span>
              <span className="dv-inv-sub">sin auditar</span>
            </div>
            <div className="dv-inv-card" style={{ borderColor: 'rgba(59,130,246,.4)' }}>
              <span className="dv-inv-num" style={{ color: '#60a5fa' }}>{healthPct}%</span>
              <span className="dv-inv-label">Health Score</span>
              <span className="dv-inv-sub">{passCount}/{totalCount}</span>
            </div>
          </div>

          {/* Health bar */}
          <div className="dv-coverage-bars" style={{ marginTop: '16px' }}>
            <div className="dv-coverage-row">
              <span className="dv-coverage-label">Salud</span>
              <div className="dv-coverage-track" style={{ height: '12px', borderRadius: '6px' }}>
                <div style={{
                  height: '100%', borderRadius: '6px',
                  background: `linear-gradient(90deg, #059669 0%, #059669 ${(passCount/totalCount)*100}%, #f59e0b ${(passCount/totalCount)*100}%, #f59e0b ${((passCount+warnCount)/totalCount)*100}%, #94a3b8 ${((passCount+warnCount)/totalCount)*100}%)`,
                  width: '100%'
                }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="dv-content">
        {/* Filter */}
        <div className="da-screen-filter-chips" style={{ marginBottom: '16px' }}>
          {[
            { id: 'all', label: `Todos (${totalCount})` },
            { id: 'pass', label: `Aprobados (${passCount})` },
            { id: 'warn', label: `Atención (${warnCount})` },
            { id: 'pending', label: `Pendientes (${pendingCount})` },
          ].map(f => (
            <button key={f.id}
              className={`da-screen-filter-chip ${filterStatus === f.id ? 'da-screen-chip-active' : ''}`}
              onClick={() => setFilterStatus(f.id)}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Categories */}
        {filteredCategories.map(cat => {
          const catPass = cat.checks.filter(c => c.status === 'pass').length
          const catTotal = cat.checks.length
          const isOpen = expandedCats[cat.id]

          return (
            <section key={cat.id} className="dv-section dau-category" style={{ animationDelay: '.05s' }}>
              <div className="dv-section-header dau-cat-header" onClick={() => toggleCat(cat.id)} style={{ cursor: 'pointer' }}>
                <div className="dv-section-title-wrap">
                  <span className="dau-cat-icon">{cat.icon}</span>
                  <h2 className="dv-section-title">{cat.name}</h2>
                  <span className="dau-cat-score">{catPass}/{catTotal}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="dau-cat-desc">{cat.description}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    style={{ transition: 'transform 200ms', transform: isOpen ? 'rotate(90deg)' : 'rotate(0)' }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>

              {isOpen && (
                <div className="dau-checks">
                  {cat.checks.map(check => (
                    <div key={check.id} className={`dau-check dau-check-${check.status}`}>
                      <div className="dau-check-icon" style={{ color: statusColors[check.status] }}>
                        {statusIcons[check.status]}
                      </div>
                      <div className="dau-check-body">
                        <span className="dau-check-label">{check.label}</span>
                        <span className="dau-check-detail">{check.detail}</span>
                      </div>
                      <span className="dau-check-status" style={{
                        background: `${statusColors[check.status]}15`,
                        color: statusColors[check.status],
                        border: `1px solid ${statusColors[check.status]}30`
                      }}>
                        {statusLabels[check.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {/* Footer */}
      <footer className="dv-footer">
        <span>labsisModernov1</span>
        <span className="dv-footer-sep" />
        <span>Auditoría — {totalCount} verificaciones</span>
        <span className="dv-footer-sep" />
        <span>Health: {healthPct}%</span>
      </footer>
    </div>
  )
}
