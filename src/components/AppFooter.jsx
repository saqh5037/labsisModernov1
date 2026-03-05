import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getHealth } from '../services/api'

export default function AppFooter() {
  const { user, logout } = useAuth()
  const [health, setHealth] = useState({ ok: false, db: null })

  useEffect(() => {
    getHealth().then(setHealth)
    const id = setInterval(() => getHealth().then(setHealth), 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <footer className="app-footer">
      <div className="footer-left">
        <div className="sb-seg">
          <div className={`sb-online-dot ${health.ok ? '' : 'sb-online-dot--off'}`} />
          <strong>{health.ok ? 'En línea' : 'Sin conexión'}</strong>
        </div>
        <div className="sb-seg">
          <div className={`sb-db-dot ${health.ok ? '' : 'sb-db-dot--off'}`} />
          <span>{health.db || '—'}</span>
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
