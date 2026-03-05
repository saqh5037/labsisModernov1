import UserMenu from './UserMenu'

const Ico = ({ d, vb = '0 0 24 24', w = 1.8 }) => (
  <svg viewBox={vb} fill="none" stroke="currentColor" strokeWidth={w}
    strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
)

const IcoFlask = () => <Ico d={<><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></>} />
const IcoSearch = () => <Ico d={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>} w={2} />
const IcoBell = () => <Ico d={<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>} />
const IcoSettings = () => <Ico d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>} />

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
        <div className="nav-logo-mark"><IcoFlask /></div>
        <span className="nav-brand">lab<em>sis</em></span>
      </div>

      <div className="nav-divider" />

      <div className="nav-right">
        <div className="nav-search-bar">
          <IcoSearch />
          <span>Buscar...</span>
        </div>
        <div style={{ position: 'relative' }}>
          <button className="nav-icon-btn" title="Notificaciones"><IcoBell /></button>
          <span className="nav-badge">3</span>
        </div>
        <button className="nav-icon-btn" title="Configuración"><IcoSettings /></button>
        <UserMenu />
      </div>
    </nav>
  )
}
