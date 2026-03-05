import UserMenu from './UserMenu'

export default function AppNavbar({ onToggleSidebar }) {
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
        <span className="nav-brand">lab<em>sis</em></span>
      </div>

      <div className="nav-right">
        <UserMenu />
      </div>
    </nav>
  )
}
