import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getHealth, getMyAreaInsights } from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function AppFooter() {
  const { user, logout } = useAuth()
  const [health, setHealth] = useState({ ok: false, db: null })
  const [daySummary, setDaySummary] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getHealth().then(setHealth)
    const id = setInterval(() => getHealth().then(setHealth), 30_000)
    return () => clearInterval(id)
  }, [])

  // Fetch day summary for mini-badge
  useEffect(() => {
    if (!user) return
    getMyAreaInsights()
      .then(({ insights }) => {
        if (!insights?.volumen?.length) return
        const ordenes = insights.volumen.reduce((s, v) => s + parseInt(v.ordenes), 0)
        const pruebas = insights.volumen.reduce((s, v) => s + parseInt(v.pruebas_total), 0)
        setDaySummary({ ordenes, pruebas })
      })
      .catch(() => {})
  }, [user])

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
          <button
            className="sb-logout-btn"
            onClick={async () => { await logout(); window.location.href = '/login' }}
          >Cerrar sesión</button>
        </div>
        <div className="sb-seg sb-seg--user" onClick={() => navigate('/area-reporte')} title="Ver mi reporte del día">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="8" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M2 14.5c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
          <strong className="sb-user-highlight">{user ? `${user.nombre} ${user.apellido}` : ''}</strong>
          {daySummary && (
            <span className="sb-day-badge">
              {daySummary.ordenes} OT · {daySummary.pruebas} pruebas
            </span>
          )}
        </div>
        <div className="sb-seg">
          <span>{new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
        </div>
      </div>
    </footer>
  )
}
