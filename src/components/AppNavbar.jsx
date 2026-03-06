import { useLocation, useNavigate } from 'react-router-dom'
import UserMenu from './UserMenu'
import logoSmall from '../assets/logolabsis-small.png'

const NAV_LINKS = [
  { label: 'Órdenes', path: '/ordenes', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
  )},
  { label: 'Resultados', path: '/validacion', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6v8l4 8H5l4-8V3z" /><line x1="9" y1="3" x2="15" y2="3" />
    </svg>
  )},
  { label: 'Pacientes', path: '/pacientes', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )},
  { label: 'Trazabilidad', path: '/trazabilidad', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  )},
  { label: 'QA', path: '/qa', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )},
]

export default function AppNavbar({ onToggleSidebar }) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="app-navbar">
      <button className="nav-hamburger" onClick={onToggleSidebar} title="Menú">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className="nav-logo">
        <img src={logoSmall} alt="Labsis" className="nav-logo-img" />
      </div>

      <div className="nav-shortcuts">
        {NAV_LINKS.map(link => {
          const isActive = location.pathname.startsWith(link.path)
          return (
            <button
              key={link.path}
              className={`nav-shortcut ${isActive ? 'nav-shortcut--active' : ''}`}
              onClick={() => navigate(link.path)}
              title={link.label}
            >
              <span className="nav-shortcut__icon">{link.icon}</span>
              <span className="nav-shortcut__label">{link.label}</span>
            </button>
          )
        })}
      </div>

      <div className="nav-right">
        <UserMenu />
      </div>
    </nav>
  )
}
