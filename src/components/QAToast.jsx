import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const NOTIF_ICONS = {
  bug_resolved: { icon: '✓', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  bug_assigned: { icon: '→', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  bug_in_progress: { icon: '▶', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  bug_closed: { icon: '✓', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  bug_no_repro: { icon: '?', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  new_comment: { icon: '💬', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
}

let globalAddToast = null

export function showToast(notif) {
  globalAddToast?.(notif)
}

export default function QAToastContainer() {
  const [toasts, setToasts] = useState([])
  const navigate = useNavigate()

  const addToast = useCallback((notif) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-2), { ...notif, _toastId: id }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t._toastId !== id))
    }, 4000)
  }, [])

  useEffect(() => {
    globalAddToast = addToast
    return () => { globalAddToast = null }
  }, [addToast])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 10000,
      display: 'flex', flexDirection: 'column-reverse', gap: 8,
    }}>
      {toasts.map(t => {
        const style = NOTIF_ICONS[t.type] || NOTIF_ICONS.new_comment
        return (
          <div
            key={t._toastId}
            onClick={() => { if (t.bugId) navigate(`/qa/bugs/${t.bugId}`) }}
            style={{
              padding: '12px 16px', borderRadius: 12, maxWidth: 360,
              background: 'var(--surface, #fff)',
              border: '1px solid var(--border, #e2e8f0)',
              boxShadow: '0 8px 32px rgba(30,58,95,0.15)',
              cursor: t.bugId ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 10,
              animation: 'wizardSlideInRight 300ms cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: style.bg, color: style.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 800,
            }}>{style.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1, #0f172a)', marginBottom: 2 }}>
                {t.message}
              </div>
              {t.taunt && (
                <div style={{ fontSize: 11, fontStyle: 'italic', color: style.color }}>"{t.taunt}"</div>
              )}
              {t.fromUser?.nombre && (
                <div style={{ fontSize: 10, color: 'var(--text-4, #94a3b8)', marginTop: 2 }}>
                  {t.fromUser.nombre}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
