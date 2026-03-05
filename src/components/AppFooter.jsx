import { useAuth } from '../context/AuthContext'

export default function AppFooter() {
  const { user, logout } = useAuth()

  return (
    <footer className="app-footer">
      <div className="footer-left">
        <div className="sb-seg">
          <div className="sb-online-dot" />
          <strong>En línea</strong>
        </div>
        <div className="sb-seg">
          <div className="sb-db-dot" />
          <span>labsisEG</span>
        </div>
      </div>
      <div className="footer-right">
        <div className="sb-seg">
          <a href="#" onClick={async (e) => { e.preventDefault(); await logout(); window.location.href = '/login' }}>Cerrar sesión</a>
        </div>
        <div className="sb-seg">
          <strong>{user ? `${user.nombre} ${user.apellido}` : ''}</strong>
        </div>
        <div className="sb-seg">
          <span>{new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
        </div>
      </div>
    </footer>
  )
}
