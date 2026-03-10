import { useState, useEffect } from 'react'

const KEY = 'labsis_welcome_'

export default function SmartWelcomeCard({ user, bioanalistaAreas, onConfirm, onCustomize }) {
  const [visible, setVisible] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    if (!user?.userId || !bioanalistaAreas?.length) return
    const key = KEY + user.userId
    if (localStorage.getItem(key)) return
    // Small delay for entrance animation
    const t = setTimeout(() => setVisible(true), 600)
    return () => clearTimeout(t)
  }, [user, bioanalistaAreas])

  if (!visible) return null

  const dismiss = (action) => {
    setFadeOut(true)
    const key = KEY + user.userId
    localStorage.setItem(key, Date.now())
    setTimeout(() => {
      setVisible(false)
      if (action === 'confirm') onConfirm?.()
      if (action === 'customize') onCustomize?.()
    }, 300)
  }

  const nombre = user.nombre || user.username
  const areaNames = bioanalistaAreas.map(a => a.nombre).join(', ')

  return (
    <div className={`welcome-card${fadeOut ? ' welcome-card--out' : ''}`}>
      <div className="welcome-card-accent" />
      <div className="welcome-card-content">
        <div className="welcome-card-greeting">
          Hola, {nombre}
        </div>
        <div className="welcome-card-msg">
          Detecto que trabajas en <strong>{areaNames}</strong>.
          Ya filtré el dashboard para mostrarte solo tus áreas.
        </div>
        <div className="welcome-card-actions">
          <button className="welcome-btn welcome-btn--primary" onClick={() => dismiss('confirm')}>
            Perfecto, así lo quiero
          </button>
          <button className="welcome-btn welcome-btn--ghost" onClick={() => dismiss('customize')}>
            Personalizar
          </button>
        </div>
      </div>
      <button className="welcome-card-close" onClick={() => dismiss()} aria-label="Cerrar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
