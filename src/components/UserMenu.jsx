import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  ADM: 'Administrador',
  ANA: 'Analista',
  REC: 'Recepción',
  FIN: 'Finanzas',
  CLIENT: 'Cliente',
  MED: 'Médico',
  VIS: 'Visitante',
  DTTEC: 'DT Técnico',
  EXT: 'Externo',
  COORD: 'Coordinador',
  CIT: 'Citas',
  SUP: 'Supervisor',
  SALES: 'Ventas',
  VISPDF: 'Visitante PDF',
  AUXADM: 'Aux. Administrativo',
  INCID: 'Incidencias',
  ACM: 'Atención al Cliente',
  COMM: 'Comercial',
  SC_AGENT: 'Agente SC',
}

export default function UserMenu() {
  const { user, logout, hasRole } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef()

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!user) return null

  const initials = `${(user.nombre || '')[0] || ''}${(user.apellido || '')[0] || ''}`
  const fullName = `${user.nombre || ''} ${user.apellido || ''}`.trim()
  const roles = user.roles || []

  async function handleLogout() {
    await logout()
    window.location.href = '/login'
  }

  return (
    <div className="um-wrap" ref={menuRef}>
      <div
        className="nav-avatar"
        title={fullName}
        onClick={() => setOpen(o => !o)}
      >
        {initials}
      </div>

      {open && (
        <div className="um-dropdown">
          {/* Header */}
          <div className="um-header">
            <div className="um-avatar-lg">{initials}</div>
            <div className="um-info">
              <div className="um-name">{fullName}</div>
              <div className="um-username">@{user.username}</div>
            </div>
          </div>

          {/* Roles */}
          <div className="um-section">
            <div className="um-section-title">Roles</div>
            <div className="um-roles">
              {roles.map(r => (
                <span key={r} className={`um-role ${hasRole('ADM') && r === 'ADM' ? 'um-role-adm' : ''}`}>
                  {ROLE_LABELS[r] || r}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="um-divider" />
          <button className="um-action" onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
