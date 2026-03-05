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
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  microscope: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18h8" /><path d="M3 22h18" /><path d="M14 22a7 7 0 1 0-1-13" />
      <path d="M9 14h2" /><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
      <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
    </svg>
  ),
  coin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M14.5 9a3.5 3.5 0 0 0-5 0 2.5 2.5 0 0 0 0 3.5L12 15l2.5 2.5a2.5 2.5 0 0 0 0-3.5" />
      <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="12" y2="16" />
    </svg>
  ),
  'chart-bar': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  cog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
}

const chevronDown = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const chevronRight = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

/* WIP icon — small cone/construction */
const icoWip = (
  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 2L2 14h12L9.5 2" />
    <line x1="8" y1="7" x2="8" y2="10" />
    <circle cx="8" cy="12" r="0.5" fill="currentColor" stroke="none" />
  </svg>
)

/*
 * Estructura completa del menú de Labsis.
 * Basado en menu-iconos.xhtml — cada ítem tiene:
 *   - label: texto visible
 *   - path: ruta React (si existe) o ruta /en-construccion/:slug
 *   - disabled: true si aún no está implementado
 *   - devStatus: 'en-construccion' para el dev dashboard
 *   - children: sub-sección anidada (accordion dentro de accordion)
 *   - roles: filtro de rol adicional a nivel ítem (opcional)
 */
const MENU_SECTIONS = [
  {
    id: 'recepcion', label: 'Recepción', icon: 'clipboard',
    roles: ['ADM', 'REC', 'COORD', 'AUXADM', 'ANA'],
    items: [
      { label: 'Órdenes de Trabajo', path: '/ordenes' },
      { label: 'Presupuestos', path: '/en-construccion/presupuestos', disabled: true, devStatus: 'en-construccion' },
      { label: 'Reimpresión Códigos de Barra', path: '/en-construccion/reimpresion-codigos', disabled: true, devStatus: 'en-construccion', roles: ['ADM', 'REC', 'AUXADM', 'ANA', 'COORD', 'ACM'] },
      { label: 'Cálculo Toma de Muestras', path: '/en-construccion/calculo-toma-muestras', disabled: true, devStatus: 'en-construccion' },
      { label: 'Puntos de Toma', path: '/en-construccion/puntos-toma', disabled: true, devStatus: 'en-construccion' },
    ]
  },
  {
    id: 'laboratorio', label: 'Laboratorio', icon: 'microscope',
    roles: ['ADM', 'ANA', 'COORD', 'REC', 'DTTEC'],
    items: [
      {
        label: 'Perfiles', isGroup: true,
        roles: ['ADM', 'ANA', 'REC'],
        children: [
          { label: 'Pruebas', path: '/en-construccion/pruebas', disabled: true, devStatus: 'en-construccion' },
          { label: 'Grupo de Pruebas', path: '/en-construccion/grupo-pruebas', disabled: true, devStatus: 'en-construccion' },
          {
            label: 'Configuración de Pruebas', isGroup: true,
            roles: ['ADM', 'COORD'],
            children: [
              { label: 'Actualizar Pruebas', path: '/en-construccion/actualizar-pruebas', disabled: true, devStatus: 'en-construccion' },
              { label: 'Tiempos Estimados', path: '/en-construccion/tiempos-estimados', disabled: true, devStatus: 'en-construccion' },
              { label: 'Notas Predefinidas', path: '/en-construccion/notas-predefinidas', disabled: true, devStatus: 'en-construccion' },
              { label: 'Notas Reflex Condicional', path: '/en-construccion/notas-reflex', disabled: true, devStatus: 'en-construccion' },
            ]
          },
          {
            label: 'Características Extra', isGroup: true,
            roles: ['ADM', 'COORD'],
            children: [
              { label: 'Preguntas Pre-analíticas', path: '/en-construccion/preguntas-preanaliticas', disabled: true, devStatus: 'en-construccion' },
              { label: 'Info Toma de Muestra', path: '/en-construccion/info-toma-muestra', disabled: true, devStatus: 'en-construccion' },
              { label: 'Info Toma Muestra Paciente', path: '/en-construccion/info-toma-muestra-paciente', disabled: true, devStatus: 'en-construccion' },
              { label: 'Info Traslado de Muestra', path: '/en-construccion/info-traslado-muestra', disabled: true, devStatus: 'en-construccion' },
            ]
          },
          { label: 'Antibióticos', path: '/en-construccion/antibioticos', disabled: true, devStatus: 'en-construccion', roles: ['ADM', 'ANA'] },
          { label: 'Bacterias', path: '/en-construccion/bacterias', disabled: true, devStatus: 'en-construccion', roles: ['ADM', 'ANA'] },
          { label: 'Reflex Tests', path: '/en-construccion/reflex-tests', disabled: true, devStatus: 'en-construccion', roles: ['ADM', 'ANA'] },
          { label: 'Reflex Condicionales', path: '/en-construccion/reflex-condicionales', disabled: true, devStatus: 'en-construccion', roles: ['ADM', 'ANA'] },
          { label: 'Rangos de Interpretación', path: '/en-construccion/rangos-interpretacion', disabled: true, devStatus: 'en-construccion', roles: ['ADM', 'ANA'] },
        ]
      },
      { label: 'Muestras Referidas', path: '/en-construccion/muestras-referidas', disabled: true, devStatus: 'en-construccion', roles: ['ANA'] },
      { label: 'Alícuotas', path: '/en-construccion/alicuotas', disabled: true, devStatus: 'en-construccion', roles: ['ANA'] },
      { label: 'Metas por Áreas', path: '/en-construccion/metas-areas', disabled: true, devStatus: 'en-construccion' },
      {
        label: 'Microbiología', isGroup: true,
        roles: ['ADM', 'ANA'],
        children: [
          { label: 'Mesas de Trabajo', path: '/en-construccion/mesas-trabajo', disabled: true, devStatus: 'en-construccion' },
          { label: 'Cultivos Positivos', path: '/en-construccion/cultivos-positivos', disabled: true, devStatus: 'en-construccion' },
        ]
      },
      { label: 'Manifiestos', path: '/en-construccion/manifiestos', disabled: true, devStatus: 'en-construccion', roles: ['ADM', 'ANA', 'REC'] },
      {
        label: 'Equipos / Analizadores', isGroup: true,
        roles: ['ADM', 'ANA'],
        children: [
          { label: 'Listas de Trabajo', path: '/en-construccion/listas-trabajo', disabled: true, devStatus: 'en-construccion' },
          { label: 'Analizadores', path: '/en-construccion/analizadores', disabled: true, devStatus: 'en-construccion' },
          { label: 'Analizadores Instalados', path: '/en-construccion/analizadores-instalados', disabled: true, devStatus: 'en-construccion' },
          { label: 'Control de Calidad', path: '/en-construccion/control-calidad', disabled: true, devStatus: 'en-construccion' },
        ]
      },
      {
        label: 'Autovalidación', isGroup: true,
        roles: ['ADM', 'ANA'],
        children: [
          { label: 'Definición de Reglas', path: '/en-construccion/autovalidacion-reglas', disabled: true, devStatus: 'en-construccion' },
          { label: 'Reportes Comportamiento', path: '/en-construccion/autovalidacion-reportes', disabled: true, devStatus: 'en-construccion' },
        ]
      },
    ]
  },
  {
    id: 'resultados', label: 'Resultados', icon: 'flask',
    roles: ['ADM', 'ANA', 'COORD', 'VIS', 'VISPDF'],
    items: [
      { label: 'Validación por Área', path: '/validacion', roles: ['ADM', 'ANA', 'COORD', 'DTTEC'] },
      { label: 'Ingreso de Resultados', path: '/en-construccion/resultados', disabled: true, devStatus: 'en-construccion' },
    ]
  },
  {
    id: 'pacientes', label: 'Pacientes', icon: 'heart',
    roles: ['ADM', 'REC', 'COORD', 'AUXADM', 'ANA'],
    items: [
      { label: 'Lista de Pacientes', path: '/pacientes' },
    ]
  },
  {
    id: 'caja', label: 'Caja', icon: 'coin',
    roles: ['ADM', 'REC', 'COORD', 'AUXADM', 'FIN'],
    items: [
      { label: 'Caja Actual', path: '/en-construccion/caja-actual', disabled: true, devStatus: 'en-construccion' },
      { label: 'Conteo de Caja', path: '/en-construccion/conteo-caja', disabled: true, devStatus: 'en-construccion' },
      { label: 'Lista de Cajas', path: '/en-construccion/lista-cajas', disabled: true, devStatus: 'en-construccion' },
    ]
  },
  {
    id: 'facturacion', label: 'Facturación y Cobranzas', icon: 'receipt',
    roles: ['ADM', 'FIN', 'COORD-FAC', 'SUP-FAC', 'AUXADM'],
    items: [
      { label: 'Clientes', path: '/en-construccion/clientes', disabled: true, devStatus: 'en-construccion' },
      { label: 'Contratos', path: '/en-construccion/contratos', disabled: true, devStatus: 'en-construccion' },
      { label: 'Lista de Precios', path: '/en-construccion/lista-precios', disabled: true, devStatus: 'en-construccion' },
      { label: 'Historial OTs por Cliente', path: '/en-construccion/historial-ots-cliente', disabled: true, devStatus: 'en-construccion' },
      { label: 'Cuentas por Cobrar', path: '/en-construccion/cuentas-cobrar', disabled: true, devStatus: 'en-construccion' },
      { label: 'Libro de Ventas', path: '/en-construccion/libro-ventas', disabled: true, devStatus: 'en-construccion' },
    ]
  },
  {
    id: 'reportes', label: 'Reportes y Estadísticas', icon: 'chart-bar',
    roles: ['ADM', 'COORD', 'ANA', 'REC', 'AUXADM'],
    items: [
      { label: 'Dashboard', path: '/en-construccion/dashboard', disabled: true, devStatus: 'en-construccion' },
      {
        label: 'Órdenes de Trabajo', isGroup: true,
        children: [
          { label: 'Reportes de OT', path: '/en-construccion/reportes-ot', disabled: true, devStatus: 'en-construccion' },
          { label: 'Reportes de Área', path: '/en-construccion/reportes-area', disabled: true, devStatus: 'en-construccion', roles: ['ADM', 'ANA'] },
        ]
      },
      {
        label: 'Pruebas', isGroup: true,
        children: [
          { label: 'Pruebas Realizadas', path: '/en-construccion/pruebas-realizadas', disabled: true, devStatus: 'en-construccion' },
          { label: 'TAT (Turnaround Time)', path: '/en-construccion/tat', disabled: true, devStatus: 'en-construccion' },
          { label: 'Pruebas Entregadas', path: '/en-construccion/pruebas-entregadas', disabled: true, devStatus: 'en-construccion' },
        ]
      },
      { label: 'Pendientes por Área', path: '/en-construccion/pendientes-area', disabled: true, devStatus: 'en-construccion' },
      { label: 'Productividad', path: '/en-construccion/productividad', disabled: true, devStatus: 'en-construccion' },
    ]
  },
  {
    id: 'admin', label: 'Administración', icon: 'cog',
    roles: ['ADM', 'DTTEC'],
    items: [
      {
        label: 'Usuarios', isGroup: true,
        children: [
          { label: 'Analistas', path: '/en-construccion/analistas', disabled: true, devStatus: 'en-construccion' },
          { label: 'Doctores', path: '/en-construccion/doctores', disabled: true, devStatus: 'en-construccion' },
          { label: 'Usuarios Generales', path: '/en-construccion/usuarios-generales', disabled: true, devStatus: 'en-construccion' },
          { label: 'Usuarios Clientes', path: '/en-construccion/usuarios-clientes', disabled: true, devStatus: 'en-construccion' },
        ]
      },
      {
        label: 'Laboratorio', isGroup: true,
        children: [
          { label: 'Áreas', path: '/en-construccion/areas', disabled: true, devStatus: 'en-construccion' },
          { label: 'Departamentos', path: '/en-construccion/departamentos', disabled: true, devStatus: 'en-construccion' },
          { label: 'Procedencias', path: '/en-construccion/procedencias', disabled: true, devStatus: 'en-construccion' },
          { label: 'Servicios Médicos', path: '/en-construccion/servicios-medicos', disabled: true, devStatus: 'en-construccion' },
          { label: 'Configuración Email', path: '/en-construccion/config-email', disabled: true, devStatus: 'en-construccion' },
          { label: 'Parámetros Generales', path: '/en-construccion/parametros', disabled: true, devStatus: 'en-construccion' },
          { label: 'Permisos por Roles', path: '/en-construccion/permisos-roles', disabled: true, devStatus: 'en-construccion' },
        ]
      },
      {
        label: 'Facturación', isGroup: true,
        children: [
          { label: 'Bancos', path: '/en-construccion/bancos', disabled: true, devStatus: 'en-construccion' },
          { label: 'Puntos de Venta', path: '/en-construccion/puntos-venta', disabled: true, devStatus: 'en-construccion' },
          { label: 'Tipos de Pago', path: '/en-construccion/tipos-pago', disabled: true, devStatus: 'en-construccion' },
        ]
      },
      {
        label: 'Turnos', isGroup: true,
        children: [
          { label: 'Días Feriados', path: '/en-construccion/dias-feriados', disabled: true, devStatus: 'en-construccion' },
          { label: 'Turnos', path: '/en-construccion/turnos', disabled: true, devStatus: 'en-construccion' },
        ]
      },
      { label: 'Incidencias', path: '/en-construccion/incidencias', disabled: true, devStatus: 'en-construccion', roles: ['ADM', 'ANA'] },
    ]
  },
]

/* ── Recursive Item renderer ── */
function SidebarItem({ item, depth, location, navigate, onClose, userRoles, expandedGroups, toggleGroup }) {
  // Role check at item level
  if (item.roles && !item.roles.some(r => userRoles.includes(r))) return null

  // Group with children (sub-accordion) — NIVEL 2
  if (item.isGroup && item.children) {
    const groupKey = item.label
    const isOpen = expandedGroups.has(groupKey)
    return (
      <div className={`sb-group ${isOpen ? 'sb-group--open' : ''}`}>
        <button className="sb-group__toggle" onClick={() => toggleGroup(groupKey)}>
          <span className="sb-group__chevron">{chevronRight}</span>
          <span className="sb-group__label">{item.label}</span>
        </button>
        <div className="sb-group__children">
          {item.children.map(child => (
            <SidebarItem
              key={child.label}
              item={child}
              depth={depth + 1}
              location={location}
              navigate={navigate}
              onClose={onClose}
              userRoles={userRoles}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
            />
          ))}
        </div>
      </div>
    )
  }

  // Regular item (leaf) — NIVEL 3
  const isActive = item.path && !item.disabled && location.pathname.startsWith(item.path)
  const handleClick = () => {
    if (item.path) {
      navigate(item.path)
      onClose()
    }
  }

  return (
    <div
      className={`sb-link ${isActive ? 'sb-link--active' : ''}`}
      onClick={handleClick}
      title={item.label}
    >
      <span className="sb-link__label">{item.label}</span>
      {item.devStatus === 'en-construccion' && (
        <span className="sb-link__wip" title="En construcción">{icoWip}</span>
      )}
    </div>
  )
}

export default function Sidebar({ open, onClose, userRoles }) {
  const [expanded, setExpanded] = useState(new Set(['recepcion']))
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const location = useLocation()
  const navigate = useNavigate()

  const toggleSection = (id) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleGroup = (label) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  const visibleSections = MENU_SECTIONS.filter(section =>
    section.roles.some(r => userRoles.includes(r))
  )

  /* Count leaf items per section (for badge) */
  const countLeaves = (items) => items.reduce((n, item) => {
    if (item.isGroup && item.children) return n + countLeaves(item.children)
    return n + 1
  }, 0)

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

      {/* Sections — NIVEL 1 */}
      <div className="sidebar-sections">
        {visibleSections.map(section => {
          const isExpanded = expanded.has(section.id)
          const count = countLeaves(section.items)
          return (
            <div key={section.id} className={`sb-section ${isExpanded ? 'sb-section--open' : ''}`}>
              <button className="sb-section__toggle" onClick={() => toggleSection(section.id)}>
                <span className="sb-section__icon-pill">{icons[section.icon]}</span>
                <span className="sb-section__label">{section.label}</span>
                <span className="sb-section__count">{count}</span>
                <span className="sb-section__arrow">{chevronDown}</span>
              </button>
              <div className="sb-section__body">
                {section.items.map(item => (
                  <SidebarItem
                    key={item.label}
                    item={item}
                    depth={0}
                    location={location}
                    navigate={navigate}
                    onClose={onClose}
                    userRoles={userRoles}
                    expandedGroups={expandedGroups}
                    toggleGroup={toggleGroup}
                  />
                ))}
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
