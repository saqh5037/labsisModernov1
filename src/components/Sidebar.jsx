import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/* ── Section Icons (inline SVGs, 20x20) ── */
const icons = {
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
  ),
  flask: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6v8l4 8H5l4-8V3z" /><line x1="9" y1="3" x2="15" y2="3" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  'check-circle': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  'scan': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  ),
}

const chevronDown = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

/*
 * Menú simplificado — solo pantallas implementadas.
 * 4 secciones, 7 ítems.
 */
const MENU_SECTIONS = [
  {
    id: 'recepcion', label: 'Recepción', icon: 'clipboard',
    items: [
      { label: 'Órdenes de Trabajo', path: '/ordenes' },
    ]
  },
  {
    id: 'resultados', label: 'Resultados', icon: 'flask',
    items: [
      { label: 'Validación por Área', path: '/validacion' },
    ]
  },
  {
    id: 'pacientes', label: 'Pacientes', icon: 'heart',
    items: [
      { label: 'Lista de Pacientes', path: '/pacientes' },
    ]
  },
  {
    id: 'trazabilidad', label: 'Trazabilidad', icon: 'scan',
    items: [
      { label: 'Checkpoints', path: '/trazabilidad' },
    ]
  },
  {
    id: 'qa', label: 'QA Testing', icon: 'check-circle',
    items: [
      { label: 'Dashboard', path: '/qa' },
      { label: 'Test Suites', path: '/qa/suites' },
      { label: 'Mis Runs', path: '/qa/runs' },
      { label: 'Bugs', path: '/qa/bugs' },
    ]
  },
]

export default function Sidebar({ open, onClose }) {
  const [expanded, setExpanded] = useState(new Set(['recepcion']))
  const location = useLocation()
  const navigate = useNavigate()

  const toggleSection = (id) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <aside className={`app-sidebar ${open ? 'open' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <span className="sidebar-logo">lab<em>sis</em></span>
        <button className="sidebar-close" onClick={onClose} title="Cerrar menú">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="sidebar-header-line" />

      {/* Sections */}
      <div className="sidebar-sections">
        {MENU_SECTIONS.map(section => {
          const isExpanded = expanded.has(section.id)
          return (
            <div key={section.id} className={`sb-section ${isExpanded ? 'sb-section--open' : ''}`}>
              <button className="sb-section__toggle" onClick={() => toggleSection(section.id)}>
                <span className="sb-section__icon-pill">{icons[section.icon]}</span>
                <span className="sb-section__label">{section.label}</span>
                <span className="sb-section__arrow">{chevronDown}</span>
              </button>
              <div className="sb-section__body">
                {section.items.map(item => {
                  const isActive = location.pathname.startsWith(item.path)
                  return (
                    <div
                      key={item.path}
                      className={`sb-link ${isActive ? 'sb-link--active' : ''}`}
                      onClick={() => { navigate(item.path); onClose() }}
                      title={item.label}
                    >
                      <span className="sb-link__label">{item.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">v1.0 — labsisModerno</div>
    </aside>
  )
}

export { MENU_SECTIONS }
