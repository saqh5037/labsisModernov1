import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

/* ── Icons ── */
const IconBack = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
)
const IconExternal = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)
const IconCode = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
  </svg>
)

const MANUAL_URL = '/labsis-brand-manual-v3.html'

const sections = [
  {
    group: 'Identidad', items: [
      { id: 'principios', label: 'Principios de Diseño' },
      { id: 'logo', label: 'Logo' },
      { id: 'colores', label: 'Colores' },
      { id: 'tipografía', label: 'Tipografía' },
    ]
  },
  {
    group: 'Controles', items: [
      { id: 'botones', label: 'Botones' },
      { id: 'badges', label: 'Badges' },
      { id: 'formularios', label: 'Formularios' },
      { id: 'controles', label: 'Checkboxes & Toggles' },
    ]
  },
  {
    group: 'Datos', items: [
      { id: 'tarjetas', label: 'Tarjetas' },
      { id: 'tabla', label: 'Tablas' },
      { id: 'stats', label: 'Stat Cards / KPIs' },
      { id: 'flags', label: 'Flags de Resultados' },
      { id: 'marcas', label: 'Marcas por Tipo de Dato' },
    ]
  },
  {
    group: 'Layout', items: [
      { id: 'zonas', label: 'Anatomía de Zonas' },
      { id: 'preview', label: 'Vista Previa UI' },
      { id: 'sidebar', label: 'Sidebar' },
      { id: 'tabs', label: 'Tabs & Breadcrumbs' },
      { id: 'menubar', label: 'Menu Bar' },
    ]
  },
  {
    group: 'Feedback', items: [
      { id: 'alertas', label: 'Alertas & Animaciones' },
      { id: 'modales', label: 'Modales & Diálogos' },
      { id: 'toasts', label: 'Toasts' },
      { id: 'tooltips', label: 'Tooltips' },
    ]
  },
  {
    group: 'Navegación', items: [
      { id: 'dropdowns', label: 'Dropdowns' },
      { id: 'páginación', label: 'Paginación' },
      { id: 'filtros', label: 'Filtros' },
    ]
  },
  {
    group: 'Visual', items: [
      { id: 'sombras', label: 'Sombras' },
      { id: 'radios', label: 'Border Radius' },
      { id: 'espaciado', label: 'Espaciado' },
      { id: 'modos', label: 'Dark vs Light' },
      { id: 'iconografía', label: 'Iconografía' },
      { id: 'graficas', label: 'Gráficas & Sparklines' },
    ]
  },
  {
    group: 'Avanzado', items: [
      { id: 'templates', label: 'Templates' },
      { id: 'liquid-glass', label: 'Liquid Glass' },
    ]
  },
]

export default function DevBrand() {
  const navigate = useNavigate()
  const iframeRef = useRef(null)
  const [activeSection, setActiveSection] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navigateTo = (sectionId) => {
    setActiveSection(sectionId)
    if (iframeRef.current) {
      iframeRef.current.src = `${MANUAL_URL}#${sectionId}`
    }
  }

  const openInNewTab = () => {
    const hash = activeSection ? `#${activeSection}` : ''
    window.open(`${MANUAL_URL}${hash}`, '_blank')
  }

  return (
    <div className="db-shell">
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
          <button className="dv-nav-link dv-nav-active" onClick={() => navigate('/dev/brand')}>
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

      <div className="db-layout">
        {/* Sidebar */}
        <aside className={`db-sidebar ${sidebarOpen ? '' : 'db-sidebar-collapsed'}`}>
          <div className="db-sidebar-header">
            <span className="db-sidebar-title">Secciones</span>
            <button className="db-sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {sidebarOpen ? (
                  <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
                ) : (
                  <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
                )}
              </svg>
            </button>
          </div>

          <div className="db-sidebar-sections">
            {sections.map((group, gi) => (
              <div key={gi} className="db-group">
                <div className="db-group-label">{group.group}</div>
                {group.items.map(item => (
                  <button
                    key={item.id}
                    className={`db-section-btn ${activeSection === item.id ? 'db-section-active' : ''}`}
                    onClick={() => navigateTo(item.id)}
                  >
                    <span className="db-section-dot" />
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="db-sidebar-footer">
            <button className="db-open-btn" onClick={openInNewTab}>
              <IconExternal /> Abrir en nueva pestaña
            </button>
            <span className="db-section-count">33 secciones</span>
          </div>
        </aside>

        {/* Iframe */}
        <main className="db-main">
          <iframe
            ref={iframeRef}
            src={MANUAL_URL}
            className="db-iframe"
            title="Labsis Brand Manual v3"
          />
        </main>
      </div>
    </div>
  )
}
