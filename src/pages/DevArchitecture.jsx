import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMemory } from '../services/devApi'

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

/* ── Animated Counter ── */
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

/* ── ProgressRing ── */
function ProgressRing({ pct, size = 56, stroke = 5, color = '#3b82f6' }) {
  const r = (size - stroke) / 2
  const C = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="dv-ring">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(15,23,42,0.05)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={C} strokeDashoffset={C - (pct / 100) * C} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1.2s ease' }}
      />
    </svg>
  )
}

export default function DevArchitecture() {
  const navigate = useNavigate()
  const [memory, setMemory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [screenFilter, setScreenFilter] = useState('all')
  const [screenSearch, setScreenSearch] = useState('')
  const [authSubTab, setAuthSubTab] = useState('overview')

  const load = useCallback(async () => {
    try { setMemory(await getMemory()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const xhtml = useCounter(memory?.codebase?.xhtmlTotal || 0, 2000)
  const beans = useCounter(memory?.codebase?.sessionBeans || 0, 1800)
  const entities = useCounter(memory?.codebase?.entities || 0, 1600)
  const parsers = useCounter(memory?.codebase?.parsers || 0, 1400)
  const converters = useCounter(memory?.codebase?.converters || 0, 1200)
  const writers = useCounter(memory?.codebase?.writers || 0, 1000)
  const config = useCounter(memory?.codebase?.configFields || 0, 1400)
  const pageXml = useCounter(memory?.codebase?.pageXml || 0, 1600)
  const totalFiles = useCounter(
    (memory?.codebase?.xhtmlTotal || 0) +
    (memory?.codebase?.sessionBeans || 0) +
    (memory?.codebase?.entities || 0) +
    (memory?.codebase?.parsers || 0) +
    (memory?.codebase?.converters || 0) +
    (memory?.codebase?.writers || 0) +
    (memory?.codebase?.pageXml || 0),
    2500
  )

  if (loading) return <div className="dv"><div className="dv-loading"><div className="dv-spinner" />Cargando arquitectura...</div></div>
  if (!memory) return <div className="dv"><div className="dv-loading">Error cargando datos</div></div>

  const tabs = [
    { id: 'overview', label: 'Vista General' },
    { id: 'mapping', label: 'Mapeo Java → React' },
    { id: 'flows', label: 'Flujos de Usuario' },
    { id: 'auth', label: 'Permisos' },
    { id: 'screens', label: 'Pantallas' },
  ]

  const userFlows = [
    {
      id: 'crear-ot',
      name: 'Crear Orden de Trabajo',
      desc: 'Flujo principal del sistema — desde el login hasta tener una OT registrada con sus pruebas',
      color: '#3b82f6',
      steps: [
        { screen: 'Login', desc: 'Autenticación con usuario y contraseña', status: 'qa', component: 'LoginPage.jsx' },
        { screen: 'Sidebar → Órdenes', desc: 'Navegar al módulo de Órdenes de Trabajo', status: 'qa', component: 'Sidebar.jsx' },
        { screen: 'OT Lista', desc: 'Ver listado de órdenes existentes, buscar por filtros', status: 'qa', component: 'Ordenes.jsx' },
        { screen: 'Buscar Paciente', desc: 'Modal de búsqueda de paciente por nombre, cédula o historia', status: 'not-started', component: null },
        { screen: 'Crear/Editar OT', desc: 'Formulario con datos del paciente, médico, pruebas solicitadas', status: 'not-started', component: null },
        { screen: 'Seleccionar Pruebas', desc: 'Agregar pruebas al perfil, ver precios, aplicar descuentos', status: 'not-started', component: null },
        { screen: 'Imprimir OT', desc: 'Preview de la orden para impresión con código de barras', status: 'qa', component: 'PrintOrdenTrabajo.jsx' },
        { screen: 'Etiqueta Barcode', desc: 'Etiqueta adhesiva con código de barras para tubos', status: 'qa', component: 'PrintEtiqueta.jsx' },
      ]
    },
    {
      id: 'ingresar-resultados',
      name: 'Ingresar Resultados',
      desc: 'Flujo del analista — desde recibir la muestra hasta validar los resultados',
      color: '#059669',
      steps: [
        { screen: 'Login (Analista)', desc: 'Autenticación con rol ANA o COORD', status: 'qa', component: 'LoginPage.jsx' },
        { screen: 'OT Lista (filtro área)', desc: 'Filtrar por área asignada, ver OTs pendientes', status: 'qa', component: 'Ordenes.jsx' },
        { screen: 'OT Detalle', desc: 'Ver información del paciente, pruebas solicitadas', status: 'desarrollo-estilos', component: 'OrdenDetallePage.jsx' },
        { screen: 'OT Resultados (Lab)', desc: 'Ingresar valores de resultados por prueba', status: 'not-started', component: null },
        { screen: 'Validación', desc: 'Analista revisa y valida los resultados ingresados', status: 'not-started', component: null },
        { screen: 'Imprimir Resultados', desc: 'PDF con resultados, valores de referencia, alarmas', status: 'not-started', component: null },
      ]
    },
    {
      id: 'consultar-resultados',
      name: 'Consultar Resultados',
      desc: 'Flujo del médico o recepcionista — buscar y ver resultados de un paciente',
      color: '#8b5cf6',
      steps: [
        { screen: 'Login', desc: 'Autenticación con cualquier rol con permiso de lectura', status: 'qa', component: 'LoginPage.jsx' },
        { screen: 'OT Lista (búsqueda)', desc: 'Buscar por número de OT, paciente o fecha', status: 'qa', component: 'Ordenes.jsx' },
        { screen: 'OT Detalle', desc: 'Ver resumen de la orden y estado de las pruebas', status: 'desarrollo-estilos', component: 'OrdenDetallePage.jsx' },
        { screen: 'OT Visualización', desc: 'Vista de solo lectura de resultados ya validados', status: 'not-started', component: null },
      ]
    },
    {
      id: 'facturacion',
      name: 'Facturación',
      desc: 'Flujo de facturación — crear facturas a partir de OTs',
      color: '#f59e0b',
      steps: [
        { screen: 'Login (Facturación)', desc: 'Autenticación con rol COORD-FAC o SUP-FAC', status: 'qa', component: 'LoginPage.jsx' },
        { screen: 'Factura Lista', desc: 'Listado de facturas con filtros por fecha, cliente, estado', status: 'not-started', component: null },
        { screen: 'Factura Crear', desc: 'Seleccionar OTs, aplicar precios, generar factura', status: 'not-started', component: null },
        { screen: 'Factura Detalle', desc: 'Ver factura generada con desglose', status: 'not-started', component: null },
        { screen: 'Imprimir Factura', desc: 'PDF de la factura para el cliente', status: 'not-started', component: null },
      ]
    }
  ]

  const legacyStack = [
    { name: 'XHTML', count: memory.codebase?.xhtmlTotal || 0, anim: xhtml, color: '#f97316', desc: 'Pantallas JSF/Facelets' },
    { name: 'Session Beans', count: memory.codebase?.sessionBeans || 0, anim: beans, color: '#8b5cf6', desc: 'EntityHome + EntityList + Logic' },
    { name: 'Entities JPA', count: memory.codebase?.entities || 0, anim: entities, color: '#3b82f6', desc: 'Modelo de datos ORM' },
    { name: 'Parsers', count: memory.codebase?.parsers || 0, anim: parsers, color: '#06b6d4', desc: 'Equipos + HL7/ASTM' },
    { name: 'Converters', count: memory.codebase?.converters || 0, anim: converters, color: '#059669', desc: 'JSF converters + validators' },
    { name: 'Writers', count: memory.codebase?.writers || 0, anim: writers, color: '#ec4899', desc: 'PDF + Excel + export' },
    { name: 'Config Fields', count: memory.codebase?.configFields || 0, anim: config, color: '#f59e0b', desc: 'Tabla laboratorio multi-tenant' },
    { name: '.page.xml', count: memory.codebase?.pageXml || 0, anim: pageXml, color: '#6366f1', desc: 'Routing Seam' },
  ]
  const maxLegacy = Math.max(...legacyStack.map(s => s.count))

  const mappings = [
    { from: 'Entity.java', to: 'SQL Directo (pg Pool)', icon: '🗄️', desc: '@Entity/@Table/@Column → pool.query() con parametrized queries. No ORM — SQL directo.', color: '#3b82f6' },
    { from: 'EntityHome.java', to: 'Express Route Handlers', icon: '🔌', desc: 'persist() → POST, update() → PUT, remove() → DELETE, getInstance() → GET /:id', color: '#8b5cf6' },
    { from: 'EntityList.java', to: 'GET con Filtros Dinámicos', icon: '🔍', desc: 'RESTRICTIONS[] → conditions[].push(), EJBQL → SELECT, setMaxResults → LIMIT/OFFSET', color: '#06b6d4' },
    { from: 'XHTML (JSF)', to: 'React Components', icon: '⚛️', desc: 'h:form → form, h:inputText → input, rich:dataTable → DataTable, a4j:commandButton → onClick+fetch', color: '#f97316' },
    { from: '.page.xml', to: 'React Router', icon: '🗺️', desc: 'view-id → Route path, <param> → useParams(), <action> → useEffect(), <navigation> → navigate()', color: '#059669' },
    { from: '@In (Injection)', to: 'Imports/Context', icon: '💉', desc: '@In EntityManager → pool.query(), @In Identity → useAuth(), @In LaboratorioHome → useConfig()', color: '#ec4899' },
    { from: 'FacesMessages', to: 'Toast System', icon: '💬', desc: 'facesMessages.add() → toast.success()/error() — notificaciones del usuario', color: '#f59e0b' },
    { from: 'rich:modalPanel', to: 'React Modal', icon: '🪟', desc: 'Modal XHTML con show/hide → Portal React con createPortal + estado local', color: '#6366f1' },
  ]

  const roleColors = ['#dc2626','#3b82f6','#059669','#8b5cf6','#06b6d4','#f59e0b','#f97316','#ec4899','#6366f1','#a16207','#0891b2','#7c3aed','#b91c1c','#15803d','#c2410c','#4f46e5','#0d9488','#ca8a04','#9333ea','#166534']
  const roles = (memory.auth?.rolesList || []).map((r, i) => ({
    ...r,
    color: roleColors[i % roleColors.length]
  }))

  const screenDocs = (memory.screens || []).filter(s => s.hasMemory)
  const allScreens = memory.screens || []
  const documented = allScreens.filter(s => s.hasMemory).length
  const total = allScreens.length

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
          <button className="dv-nav-link dv-nav-active" onClick={() => navigate('/dev/arch')}>
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
            <h1 className="da-hero-title">Arquitectura del Proyecto</h1>
            <p className="da-hero-sub">Java Seam / XHTML → React 19 + Express 5 + PostgreSQL</p>
            <p className="da-hero-desc">
              Modernización completa del frontend de Labsis. Misma base de datos (labsisEG),
              misma lógica de negocio — nueva experiencia de usuario con React moderno.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="da-tabs-wrap">
        <div className="da-tabs">
          {tabs.map(tab => (
            <button key={tab.id}
              className={`da-tab ${activeTab === tab.id ? 'da-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dv-content" style={{ maxWidth: 1400 }}>

        {/* ══ TAB: Overview ══ */}
        {activeTab === 'overview' && (
          <>
            {/* Architecture Diagram */}
            <section className="dv-section" style={{ animationDelay: '.05s' }}>
              <div className="dv-section-header">
                <div className="dv-section-title-wrap">
                  <div className="dv-section-badge dv-badge-purple">DIAGRAMA</div>
                  <h2 className="dv-section-title">Flujo de Datos</h2>
                </div>
              </div>
              <div className="da-diagram">
                <div className="da-diagram-col">
                  <div className="da-box da-box-legacy">
                    <span className="da-box-tag">LEGACY</span>
                    <span className="da-box-title">Java Seam 2</span>
                    <span className="da-box-items">XHTML · EntityHome · EntityList · .page.xml</span>
                  </div>
                </div>
                <div className="da-diagram-arrow">
                  <svg width="60" height="24" viewBox="0 0 60 24" fill="none">
                    <path d="M0 12h50" stroke="var(--blue)" strokeWidth="2" strokeDasharray="4 3" />
                    <path d="M46 6l8 6-8 6" stroke="var(--blue)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="da-arrow-label">Modernización</span>
                </div>
                <div className="da-diagram-col">
                  <div className="da-box da-box-modern">
                    <span className="da-box-tag">MODERNO</span>
                    <span className="da-box-title">React 19 + Express 5</span>
                    <span className="da-box-items">JSX · Routes · pg Pool · Vite 7</span>
                  </div>
                </div>
                <div className="da-diagram-arrow">
                  <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
                    <path d="M0 12h30" stroke="var(--success)" strokeWidth="2" />
                    <path d="M26 6l8 6-8 6" stroke="var(--success)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="da-diagram-col">
                  <div className="da-box da-box-db">
                    <span className="da-box-tag">BD</span>
                    <span className="da-box-title">PostgreSQL</span>
                    <span className="da-box-items">labsisEG · localhost:5432 · Misma BD</span>
                  </div>
                </div>
              </div>

              {/* Stack moderno */}
              <div className="da-stack-grid">
                {[
                  { name: 'React 19', ver: 'v19.0', color: '#61dafb', desc: 'UI Components' },
                  { name: 'Vite 7', ver: 'v7.0', color: '#646cff', desc: 'Build & Dev Server' },
                  { name: 'Express 5', ver: 'v5.0', color: '#68a063', desc: 'API Backend' },
                  { name: 'PostgreSQL', ver: 'labsisEG', color: '#336791', desc: 'Base de Datos' },
                  { name: 'React Router', ver: 'v7', color: '#f44250', desc: 'Client Routing' },
                  { name: 'react-select', ver: 'v5', color: '#00b8d9', desc: 'Dropdowns' },
                  { name: 'flatpickr', ver: 'v4', color: '#1fc8a3', desc: 'Date Pickers' },
                  { name: 'pg', ver: 'v8', color: '#336791', desc: 'DB Driver' },
                ].map((tech, i) => (
                  <div key={i} className="da-tech-card">
                    <div className="da-tech-dot" style={{ background: tech.color, boxShadow: `0 0 10px ${tech.color}40` }} />
                    <div className="da-tech-info">
                      <span className="da-tech-name">{tech.name}</span>
                      <span className="da-tech-ver">{tech.ver}</span>
                    </div>
                    <span className="da-tech-desc">{tech.desc}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Legacy Codebase Stats */}
            <section className="dv-section" style={{ animationDelay: '.1s' }}>
              <div className="dv-section-header">
                <div className="dv-section-title-wrap">
                  <div className="dv-section-badge dv-badge-orange">LEGACY</div>
                  <h2 className="dv-section-title">Codebase Original — Verificado</h2>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-4)', fontStyle: 'italic' }}>
                  Conteo directo de /git/labsis/ y /git/labsis-ejb/
                </span>
              </div>
              <div className="da-legacy-bars">
                {legacyStack.map((item, i) => (
                  <div key={i} className="da-bar-row">
                    <div className="da-bar-left">
                      <span className="da-bar-dot" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}40` }} />
                      <div className="da-bar-info">
                        <span className="da-bar-name">{item.name}</span>
                        <span className="da-bar-desc">{item.desc}</span>
                      </div>
                    </div>
                    <div className="da-bar-track">
                      <div className="da-bar-fill" style={{
                        width: `${(item.count / maxLegacy) * 100}%`,
                        background: `linear-gradient(90deg, ${item.color}, ${item.color}88)`
                      }} />
                    </div>
                    <span className="da-bar-num">{item.anim.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Total summary */}
              <div className="da-total-strip">
                <span className="da-total-label">Total de archivos Java + XHTML:</span>
                <span className="da-total-num">{totalFiles.toLocaleString()}</span>
              </div>
            </section>
          </>
        )}

        {/* ══ TAB: Mapping ══ */}
        {activeTab === 'mapping' && (
          <section className="dv-section" style={{ animationDelay: '.05s' }}>
            <div className="dv-section-header">
              <div className="dv-section-title-wrap">
                <div className="dv-section-badge">MAPEO</div>
                <h2 className="dv-section-title">Java Seam → Express/React</h2>
              </div>
            </div>
            <div className="da-mapping-grid">
              {mappings.map((m, i) => (
                <div key={i} className="da-mapping-card" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="da-mapping-header">
                    <span className="da-mapping-icon">{m.icon}</span>
                    <div className="da-mapping-flow">
                      <span className="da-mapping-from">{m.from}</span>
                      <svg width="20" height="12" viewBox="0 0 20 12" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M0 6h14" stroke={m.color} strokeWidth="1.5" />
                        <path d="M12 2l4 4-4 4" stroke={m.color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                      <span className="da-mapping-to">{m.to}</span>
                    </div>
                  </div>
                  <p className="da-mapping-desc">{m.desc}</p>
                </div>
              ))}
            </div>

            {/* File structure */}
            <div className="da-file-tree" style={{ marginTop: 20 }}>
              <h3 className="dv-sub-title">Estructura del Proyecto Moderno</h3>
              <pre className="da-tree-code">{`labsisModernov1/
├── server/
│   ├── index.js           → Express app, puerto 3001
│   ├── db.js              → pg Pool (labsisEG, localhost:5432)
│   ├── auth.js            → Middleware JWT
│   ├── dev-dashboard.json → Data store dashboard
│   └── routes/
│       ├── ordenes.js     → OT endpoints (14 filtros)
│       ├── catalogos.js   → Dropdowns (área, usuario, servicio, prueba)
│       ├── auth.js        → Login/logout/me
│       └── dev.js         → Dashboard + Memory API
├── src/
│   ├── App.jsx            → React Router setup
│   ├── main.jsx           → Entry point
│   ├── index.css          → Todos los estilos
│   ├── pages/             → Una page por pantalla
│   │   ├── Ordenes.jsx        → OT Lista (✅ funcional)
│   │   ├── OrdenDetallePage   → OT Detalle (🔧 en progreso)
│   │   ├── OrdenLabPage       → OT Resultados (📋 investigada)
│   │   ├── DevDashboard       → Panel de control dev
│   │   ├── DevScreenDetail    → Detalle por pantalla
│   │   └── DevArchitecture    → Esta pantalla
│   ├── components/        → Reutilizables
│   │   ├── DataTable.jsx      → Tabla con sort/pagination
│   │   ├── FilterField.jsx    → Campo de filtro
│   │   ├── DatePickerGlass    → Flatpickr wrapper
│   │   └── StatusDot.jsx      → Indicador de status
│   ├── services/
│   │   ├── api.js             → Fetch wrapper (app)
│   │   └── devApi.js          → Fetch wrapper (dashboard)
│   └── context/
│       └── AuthContext.jsx    → User + roles + JWT
└── package.json               → React 19, Vite 7, Express 5`}</pre>
            </div>
          </section>
        )}

        {/* ══ TAB: Flows ══ */}
        {activeTab === 'flows' && (
          <section className="dv-section" style={{ animationDelay: '.05s' }}>
            <div className="dv-section-header">
              <div className="dv-section-title-wrap">
                <div className="dv-section-badge dv-badge-purple">FLUJOS</div>
                <h2 className="dv-section-title">Flujos de Usuario</h2>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{userFlows.length} flujos principales</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 24 }}>
              Cada flujo representa un recorrido completo del usuario por el sistema.
              Los pasos en verde ya están implementados, los grises están pendientes.
            </p>

            <div className="da-flows-list">
              {userFlows.map(flow => {
                const done = flow.steps.filter(s => s.status !== 'not-started').length
                const total = flow.steps.length
                const pct = Math.round((done / total) * 100)
                const flowStatusColors = {
                  qa: '#22c55e', 'desarrollo-estilos': '#3b82f6', 'desarrollo-funcionalidades': '#f59e0b',
                  investigacion: '#8b5cf6', finalizado: '#059669', 'not-started': '#94a3b8'
                }
                return (
                  <div key={flow.id} className="da-flow-card" style={{ '--flow-color': flow.color }}>
                    <div className="da-flow-header">
                      <div className="da-flow-title-wrap">
                        <span className="da-flow-dot" style={{ background: flow.color, boxShadow: `0 0 12px ${flow.color}40` }} />
                        <div>
                          <span className="da-flow-name">{flow.name}</span>
                          <span className="da-flow-desc">{flow.desc}</span>
                        </div>
                      </div>
                      <div className="da-flow-progress">
                        <span className="da-flow-pct" style={{ color: flow.color }}>{pct}%</span>
                        <span className="da-flow-done">{done}/{total} pasos</span>
                      </div>
                    </div>

                    {/* Flow steps as connected pipeline */}
                    <div className="da-flow-steps">
                      {flow.steps.map((step, si) => {
                        const isDone = step.status !== 'not-started'
                        const stepColor = flowStatusColors[step.status] || '#94a3b8'
                        return (
                          <div key={si} className="da-flow-step-wrap">
                            {si > 0 && (
                              <div className="da-flow-connector" style={{ background: isDone ? stepColor : 'var(--border-s)' }} />
                            )}
                            <div className={`da-flow-step ${isDone ? 'da-flow-step-done' : ''}`}
                              style={isDone ? { borderColor: `${stepColor}30`, background: `${stepColor}06` } : {}}>
                              <div className="da-flow-step-num" style={{ background: isDone ? stepColor : 'var(--border-s)', color: isDone ? '#fff' : 'var(--text-4)' }}>
                                {isDone ? (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                ) : si + 1}
                              </div>
                              <div className="da-flow-step-info">
                                <span className="da-flow-step-name">{step.screen}</span>
                                <span className="da-flow-step-desc">{step.desc}</span>
                              </div>
                              {step.component && (
                                <span className="da-flow-step-comp">{step.component}</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Progress bar */}
                    <div className="da-flow-bar">
                      <div className="da-flow-bar-fill" style={{ width: `${pct}%`, background: flow.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ══ TAB: Auth ══ */}
        {activeTab === 'auth' && (
          <section className="dv-section" style={{ animationDelay: '.05s' }}>
            <div className="dv-section-header">
              <div className="dv-section-title-wrap">
                <div className="dv-section-badge dv-badge-purple">SEGURIDAD</div>
                <h2 className="dv-section-title">Sistema de Permisos</h2>
              </div>
            </div>

            {/* Auth sub-tabs */}
            <div className="da-auth-subtabs">
              {[
                { id: 'overview', label: 'Vista General' },
                { id: 'roles', label: `Roles (${roles.length})` },
                { id: 'modules', label: `Módulos (${memory.auth?.modules || 0})` },
                { id: 'activities', label: `Actividades (${memory.auth?.activities || 0})` },
                { id: 'resolution', label: 'Resolución' },
                { id: 'usuario', label: 'Tabla Usuario' },
              ].map(st => (
                <button key={st.id}
                  className={`da-auth-subtab ${authSubTab === st.id ? 'da-auth-subtab-active' : ''}`}
                  onClick={() => setAuthSubTab(st.id)}>
                  {st.label}
                </button>
              ))}
            </div>

            {/* ── Auth Overview ── */}
            {authSubTab === 'overview' && (
              <>
                {/* Auth flow diagram */}
                <div className="da-auth-flow">
                  <div className="da-auth-box">
                    <span className="da-auth-box-title">usuario</span>
                    <span className="da-auth-box-sub">36 columnas · SHA-1+salt</span>
                    <span className="da-auth-box-extra">{memory.auth?.userReferences || 66} tablas referencian</span>
                  </div>
                  <span className="da-auth-arrow">M:N</span>
                  <div className="da-auth-box">
                    <span className="da-auth-box-title">rol</span>
                    <span className="da-auth-box-sub">{memory.auth?.roles || 20} roles</span>
                    <span className="da-auth-box-extra">via usuario_has_rol</span>
                  </div>
                  <span className="da-auth-arrow">→</span>
                  <div className="da-auth-box">
                    <span className="da-auth-box-title">módulo</span>
                    <span className="da-auth-box-sub">{memory.auth?.modules || 17} módulos</span>
                    <span className="da-auth-box-extra">todos con acceso abierto</span>
                  </div>
                  <span className="da-auth-arrow">→</span>
                  <div className="da-auth-box">
                    <span className="da-auth-box-title">actividad</span>
                    <span className="da-auth-box-sub">{memory.auth?.activities || 23} actividades</span>
                    <span className="da-auth-box-extra">FILE | ACTION</span>
                  </div>
                  <span className="da-auth-arrow">→</span>
                  <div className="da-auth-box">
                    <span className="da-auth-box-title">permiso</span>
                    <span className="da-auth-box-sub">{memory.auth?.permissions || 17} permisos</span>
                    <span className="da-auth-box-extra">control real de acceso</span>
                  </div>
                </div>

                {/* Auth summary stats */}
                <div className="da-auth-stats">
                  {[
                    { label: 'Roles', value: memory.auth?.roles || 0, color: '#8b5cf6', icon: '👤' },
                    { label: 'Módulos', value: memory.auth?.modules || 0, color: '#3b82f6', icon: '📦' },
                    { label: 'Actividades', value: memory.auth?.activities || 0, color: '#f59e0b', icon: '⚡' },
                    { label: 'Permisos', value: memory.auth?.permissions || 0, color: '#059669', icon: '🔑' },
                    { label: 'Campos Usuario', value: memory.auth?.userFields?.length || 36, color: '#f97316', icon: '📋' },
                    { label: 'Tablas Dependientes', value: memory.auth?.userReferences || 66, color: '#dc2626', icon: '🔗' },
                  ].map((s, i) => (
                    <div key={i} className="da-auth-stat-card" style={{ '--stat-color': s.color }}>
                      <span className="da-auth-stat-icon">{s.icon}</span>
                      <span className="da-auth-stat-value">{s.value}</span>
                      <span className="da-auth-stat-label">{s.label}</span>
                    </div>
                  ))}
                </div>

                <div className="da-auth-note">
                  <strong>Dato clave:</strong> Todos los módulos en la BD de EG tienen <code>is_todos_roles_acceso = true</code>,
                  así que el check de módulo siempre pasa. El control real está en los <strong>{memory.auth?.permissions || 17} permisos</strong> a nivel actividad.
                  La autenticación usa <code>SHA-1(salt + password)</code>. El JWT contiene userId, username, nombre, apellido y array de roles.
                </div>
              </>
            )}

            {/* ── Roles ── */}
            {authSubTab === 'roles' && (
              <>
                <h3 className="dv-sub-title" style={{ marginBottom: 12 }}>Roles del Sistema ({roles.length} roles)</h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.6 }}>
                  Asignación M:N via <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(59,130,246,.08)', padding: '1px 5px', borderRadius: 4 }}>usuario_has_rol</code>.
                  IDs no consecutivos (faltan 8, 9, 13, 16-23). Código <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(59,130,246,.08)', padding: '1px 5px', borderRadius: 4 }}>EXT</code> duplicado en roles 7 y 11.
                </p>
                <div className="da-roles-grid">
                  {roles.map((role, i) => (
                    <div key={i} className="da-role-card">
                      <div className="da-role-id-badge">#{role.id}</div>
                      <span className="da-role-code" style={{ background: `${role.color}15`, color: role.color, borderColor: `${role.color}30` }}>
                        {role.code}
                      </span>
                      <div className="da-role-info">
                        <span className="da-role-name">{role.name}</span>
                        <span className="da-role-desc">{role.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="da-auth-note" style={{ marginTop: 16 }}>
                  <strong>Roles más comunes:</strong> Recepcionista → REC · Bioanalista → ANA · Admin → ADM · Doctor → MED/VIS · Portal Cliente → CLIENT
                </div>
              </>
            )}

            {/* ── Modules ── */}
            {authSubTab === 'modules' && (
              <>
                <h3 className="dv-sub-title" style={{ marginBottom: 12 }}>Módulos Registrados ({memory.auth?.modules || 0})</h3>
                <div className="da-modules-table">
                  <div className="da-modules-header">
                    <span style={{ width: 50 }}>ID</span>
                    <span style={{ flex: 2 }}>Nombre</span>
                    <span style={{ flex: 1 }}>Identificador</span>
                    <span style={{ flex: 2 }}>Notas</span>
                  </div>
                  {(memory.auth?.modulesList || []).map((mod, i) => (
                    <div key={i} className="da-modules-row">
                      <span className="da-modules-id" style={{ width: 50 }}>{mod.id}</span>
                      <span style={{ flex: 2, fontWeight: 600, color: 'var(--text-1)' }}>{mod.name}</span>
                      <span style={{ flex: 1 }}>
                        {mod.identifier && mod.identifier !== 'null' ? (
                          <code className="da-mod-code">{mod.identifier}</code>
                        ) : (
                          <span style={{ color: 'var(--text-4)', fontSize: 11 }}>—</span>
                        )}
                      </span>
                      <span style={{ flex: 2, fontSize: 11, color: 'var(--text-3)' }}>{mod.notes}</span>
                    </div>
                  ))}
                </div>
                <div className="da-auth-note" style={{ marginTop: 16 }}>
                  <strong>Importante:</strong> Todos tienen <code>is_todos_roles_acceso = true</code>.
                  Los módulos solo agrupan — el control de acceso real está en actividades/permisos.
                  Existen módulos duplicados (ej: OT tiene id 14 y 36, OT List tiene id 7 y 37).
                </div>
              </>
            )}

            {/* ── Activities ── */}
            {authSubTab === 'activities' && (
              <>
                <h3 className="dv-sub-title" style={{ marginBottom: 12 }}>Actividades ({memory.auth?.activities || 0}) — Agrupadas por Módulo</h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.6 }}>
                  Cada actividad es de tipo <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(59,130,246,.08)', padding: '1px 5px', borderRadius: 4 }}>FILE</code> (pantalla)
                  o <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(59,130,246,.08)', padding: '1px 5px', borderRadius: 4 }}>ACTION</code> (operación/botón).
                </p>
                {(() => {
                  const acts = memory.auth?.activitiesList || []
                  const grouped = {}
                  acts.forEach(a => {
                    const key = a.moduleName || 'Sin módulo'
                    if (!grouped[key]) grouped[key] = []
                    grouped[key].push(a)
                  })
                  return Object.entries(grouped).map(([modName, modActs], gi) => (
                    <div key={gi} className="da-act-group">
                      <div className="da-act-group-header">
                        <span className="da-act-group-name">{modName}</span>
                        <span className="da-act-group-count">{modActs.length} actividad{modActs.length > 1 ? 'es' : ''}</span>
                      </div>
                      {modActs.map((act, ai) => (
                        <div key={ai} className="da-act-row">
                          <code className="da-act-id">{act.identifier}</code>
                          <span className="da-act-desc">{act.desc}</span>
                        </div>
                      ))}
                    </div>
                  ))
                })()}
                {(!memory.auth?.activitiesList || memory.auth.activitiesList.length === 0) && (
                  <div className="da-auth-note">
                    Las actividades se extraen dinámicamente de <code>_AUTH.md</code>.
                    Asegúrate de que el archivo contiene secciones con formato <code>- `identificador` — descripción</code>.
                  </div>
                )}
              </>
            )}

            {/* ── Permission Resolution ── */}
            {authSubTab === 'resolution' && (
              <>
                <h3 className="dv-sub-title" style={{ marginBottom: 12 }}>Resolución de Permisos — 10 Pasos</h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.6 }}>
                  Del código Java original (<code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(59,130,246,.08)', padding: '1px 5px', borderRadius: 4 }}>PermissionResolver</code>),
                  el check se evalúa en este orden estricto. Se detiene en la primera coincidencia.
                </p>

                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>Nivel Módulo</h4>
                <div className="da-perm-steps" style={{ marginBottom: 20 }}>
                  {[
                    { step: 1, text: 'módulo.is_todos_roles_no_acceso = true → DENY (módulo desactivado)', type: 'deny' },
                    { step: 2, text: 'usuario.roles ∩ módulo.roles_no_acceso → DENY (rol excluido)', type: 'deny' },
                    { step: 3, text: 'módulo.is_todos_roles_acceso = true → ALLOW (módulo abierto)', type: 'allow' },
                    { step: 4, text: 'usuario.roles ∩ módulo.roles_acceso → ALLOW (rol permitido)', type: 'allow' },
                    { step: 5, text: 'Default módulo → DENY', type: 'deny' },
                  ].map((s, i) => (
                    <div key={i} className={`da-perm-step da-perm-${s.type}`}>
                      <span className="da-perm-num">{s.step}</span>
                      <span className="da-perm-text">{s.text}</span>
                    </div>
                  ))}
                </div>

                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>Nivel Actividad/Permiso</h4>
                <div className="da-perm-steps" style={{ marginBottom: 20 }}>
                  {[
                    { step: 6, text: 'permiso.is_todos_roles_no_acceso = true → DENY', type: 'deny' },
                    { step: 7, text: 'usuario.roles ∩ permiso.roles_no_acceso → DENY', type: 'deny' },
                    { step: 8, text: 'permiso.is_todos_roles_acceso = true → ALLOW', type: 'allow' },
                    { step: 9, text: 'usuario.roles ∩ permiso.roles_acceso → ALLOW', type: 'allow' },
                    { step: 10, text: 'Default → DENY', type: 'deny' },
                  ].map((s, i) => (
                    <div key={i} className={`da-perm-step da-perm-${s.type}`}>
                      <span className="da-perm-num">{s.step}</span>
                      <span className="da-perm-text">{s.text}</span>
                    </div>
                  ))}
                </div>

                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>Sintaxis Especial</h4>
                <div className="da-perm-steps">
                  <div className="da-perm-step da-perm-check">
                    <span className="da-perm-num">!</span>
                    <span className="da-perm-text">{`roles_acceso: ["!SUP+!SC-AGENT"] = todos EXCEPTO SUP y SC-AGENT`}</span>
                  </div>
                  <div className="da-perm-step da-perm-check">
                    <span className="da-perm-num">∅</span>
                    <span className="da-perm-text">roles_acceso: null o [] → depende de is_todos_roles_acceso flag</span>
                  </div>
                </div>

                <div className="da-auth-note" style={{ marginTop: 16 }}>
                  <strong>En la práctica (BD de EG):</strong> Todos los módulos tienen <code>is_todos_roles_acceso = true</code> (paso 3 = ALLOW siempre).
                  El control real está en los {memory.auth?.permissions || 17} permisos a nivel actividad (pasos 6-10).
                  También existe <code>rol_has_actividad</code> (M:N legacy) que coexiste con <code>permiso.roles_acceso</code>.
                  En React, usamos <code>permiso.roles_acceso</code> como fuente principal.
                </div>
              </>
            )}

            {/* ── Usuario Table ── */}
            {authSubTab === 'usuario' && (
              <>
                <h3 className="dv-sub-title" style={{ marginBottom: 12 }}>Tabla usuario — {memory.auth?.userFields?.length || 36} Campos</h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.6 }}>
                  La tabla más referenciada del sistema ({memory.auth?.userReferences || 66} FKs entrantes).
                  Autenticación <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(59,130,246,.08)', padding: '1px 5px', borderRadius: 4 }}>SHA-1(salt + password)</code>,
                  4 índices trigram para búsqueda fuzzy.
                </p>
                <div className="da-user-fields">
                  {(memory.auth?.userFields || []).map((field, i) => (
                    <div key={i} className="da-user-field-row">
                      <code className="da-user-field-name">{field.name}</code>
                      <span className="da-user-field-type">{field.type}</span>
                      <span className="da-user-field-desc">{field.desc}</span>
                    </div>
                  ))}
                </div>
                {(!memory.auth?.userFields || memory.auth.userFields.length === 0) && (
                  <div className="da-auth-note">
                    Los campos se extraen de la tabla en <code>_AUTH.md</code> sección "Tabla usuario".
                  </div>
                )}
                <div className="da-auth-note" style={{ marginTop: 16 }}>
                  <strong>FKs principales:</strong> departamento_referencia_id, centro_atencion_paciente_id, medico_id, departamento_laboratorio_por_defecto_id.
                  <br /><strong>Índices:</strong> PK en id, UNIQUE en username, 4 trigram (nombre, apellido, segundo_apellido, ci_usuario).
                </div>
              </>
            )}
          </section>
        )}

        {/* ══ TAB: Screens ══ */}
        {activeTab === 'screens' && (() => {
          const statusColors = {
            completed: '#059669', 'in-progress': '#3b82f6',
            researched: '#8b5cf6', investigacion: '#8b5cf6',
            'desarrollo-estilos': '#3b82f6', 'desarrollo-funcionalidades': '#f59e0b',
            qa: '#22c55e', finalizado: '#059669',
            'not-started': '#94a3b8', unknown: '#94a3b8'
          }
          const statusLabels = {
            completed: 'Completa', 'in-progress': 'En Progreso',
            researched: 'Investigada', investigacion: 'Investigación',
            'desarrollo-estilos': 'Desarrollo (Estilos)', 'desarrollo-funcionalidades': 'Desarrollo (Func)',
            qa: 'QA', finalizado: 'Finalizada',
            'not-started': 'Sin Iniciar', unknown: '—'
          }
          const statusOptions = [...new Set(allScreens.map(s => s.status))]
          const filteredScreens = allScreens.filter(s => {
            if (screenFilter === 'documented' && !s.hasMemory) return false
            if (screenFilter === 'not-documented' && s.hasMemory) return false
            if (screenFilter === 'with-gaps' && (!s.gaps || s.gaps.length === 0)) return false
            if (screenFilter !== 'all' && screenFilter !== 'documented' && screenFilter !== 'not-documented' && screenFilter !== 'with-gaps' && s.status !== screenFilter) return false
            if (screenSearch && !s.name.toLowerCase().includes(screenSearch.toLowerCase())) return false
            return true
          })
          return (
            <section className="dv-section" style={{ animationDelay: '.05s' }}>
              <div className="dv-section-header">
                <div className="dv-section-title-wrap">
                  <div className="dv-section-badge">PANTALLAS</div>
                  <h2 className="dv-section-title">Inventario de Modernización</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ProgressRing pct={total > 0 ? (documented / total) * 100 : 0} size={48} stroke={5} color="#8b5cf6" />
                    <span style={{ position: 'absolute', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {documented}/{total}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>documentadas</span>
                </div>
              </div>

              {/* Filters bar */}
              <div className="da-screen-filters">
                <div className="da-screen-search">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar pantalla..."
                    value={screenSearch}
                    onChange={e => setScreenSearch(e.target.value)}
                    className="da-screen-search-input"
                  />
                </div>
                <div className="da-screen-filter-chips">
                  {[
                    { id: 'all', label: 'Todas', count: allScreens.length },
                    { id: 'documented', label: 'Documentadas', count: documented },
                    { id: 'not-documented', label: 'Sin Documentar', count: total - documented },
                    { id: 'with-gaps', label: 'Con Gaps', count: allScreens.filter(s => s.gaps && s.gaps.length > 0).length },
                    ...statusOptions.filter(s => s !== 'unknown').map(s => ({
                      id: s,
                      label: statusLabels[s] || s,
                      count: allScreens.filter(x => x.status === s).length,
                      color: statusColors[s]
                    }))
                  ].map(f => (
                    <button key={f.id}
                      className={`da-screen-filter-chip ${screenFilter === f.id ? 'da-screen-filter-active' : ''}`}
                      style={screenFilter === f.id && f.color ? { borderColor: f.color, color: f.color, background: `${f.color}08` } : {}}
                      onClick={() => setScreenFilter(screenFilter === f.id ? 'all' : f.id)}>
                      {f.color && <span className="da-screen-filter-dot" style={{ background: f.color }} />}
                      {f.label}
                      <span className="da-screen-filter-count">{f.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 8 }}>
                Mostrando {filteredScreens.length} de {allScreens.length} pantallas
              </div>

              {/* Screen inventory table */}
              <div className="da-screen-table">
                <div className="da-screen-header-row">
                  <span style={{ flex: 2 }}>Pantalla</span>
                  <span style={{ flex: 1 }}>Status</span>
                  <span style={{ flex: 1 }}>Memoria</span>
                  <span style={{ flex: 2 }}>Gaps</span>
                </div>
                {filteredScreens.map((screen, i) => (
                  <div key={i} className={`da-screen-row ${screen.hasMemory ? 'da-screen-documented' : ''}`}>
                    <span className="da-screen-name" style={{ flex: 2 }}>
                      <span className="da-screen-dot" style={{ background: statusColors[screen.status] }} />
                      {screen.name}
                    </span>
                    <span style={{ flex: 1 }}>
                      <span className="da-status-badge" style={{
                        background: `${statusColors[screen.status]}12`,
                        color: statusColors[screen.status],
                        borderColor: `${statusColors[screen.status]}25`
                      }}>
                        {statusLabels[screen.status] || screen.status}
                      </span>
                    </span>
                    <span style={{ flex: 1 }}>
                      {screen.hasMemory ? (
                        <span className="da-mem-yes">Documentada</span>
                      ) : (
                        <span className="da-mem-no">—</span>
                      )}
                    </span>
                    <span style={{ flex: 2, fontSize: 11, color: 'var(--text-3)' }}>
                      {screen.gaps && screen.gaps.length > 0
                        ? screen.gaps.join(' · ')
                        : screen.hasMemory ? 'Sin gaps' : '—'}
                    </span>
                  </div>
                ))}
                {filteredScreens.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
                    No hay pantallas que coincidan con el filtro
                  </div>
                )}
              </div>
            </section>
          )
        })()}
      </div>

      <footer className="dv-footer">
        <span>labsisModernov1</span>
        <span className="dv-footer-sep" />
        <span>Arquitectura v1</span>
      </footer>
    </div>
  )
}
