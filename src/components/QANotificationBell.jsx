import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQANotifications, markQANotificationRead, markAllQANotificationsRead } from '../services/api'

export default function QANotificationBell() {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef(null)
  const navigate = useNavigate()

  const fetchNotifs = async () => {
    try {
      const all = await getQANotifications()
      setNotifs(all.slice(0, 20))
      setUnreadCount(all.filter(n => !n.read).length)
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleClick = async (notif) => {
    if (!notif.read) {
      await markQANotificationRead(notif.id)
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    setOpen(false)
    if (notif.bugId) navigate(`/qa/bugs/${notif.bugId}`)
  }

  const handleMarkAll = async () => {
    await markAllQANotificationsRead()
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const fmtTime = (d) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (diff < 60) return 'ahora'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="dv-nav-link"
        style={{ position: 'relative', padding: '6px 8px' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 16, height: 16, borderRadius: '50%',
            background: '#dc2626', color: '#fff',
            fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'wizardBounceIn 300ms cubic-bezier(0.34,1.56,0.64,1) forwards',
            boxShadow: '0 1px 4px rgba(220,38,38,0.4)',
          }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          width: 340, maxHeight: 400, overflowY: 'auto',
          background: 'var(--surface, #fff)', borderRadius: 12,
          border: '1px solid var(--border, #e2e8f0)',
          boxShadow: '0 8px 32px rgba(30,58,95,0.12)',
          zIndex: 9999,
          animation: 'fadeUp 200ms ease-out forwards',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px', borderBottom: '1px solid var(--border, #e2e8f0)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Notificaciones</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAll} style={{
                background: 'none', border: 'none', fontSize: 11, fontWeight: 600,
                color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline',
              }}>Marcar todas leídas</button>
            )}
          </div>

          {/* Notif list */}
          {notifs.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
              Sin notificaciones
            </div>
          ) : notifs.map(n => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                display: 'flex', gap: 10, padding: '12px 14px', cursor: 'pointer',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                background: n.read ? 'transparent' : 'rgba(59,130,246,0.03)',
                transition: 'background 150ms',
              }}
            >
              {/* Icon */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: n.type === 'bug_resolved' ? 'rgba(22,163,74,0.1)' : 'rgba(59,130,246,0.1)',
                color: n.type === 'bug_resolved' ? '#16a34a' : '#3b82f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {n.type === 'bug_resolved' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: 'var(--text-1)', marginBottom: 2 }}>
                  Bug #{n.bugId} resuelto
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.bugTitle}
                </div>
                {/* Gamified taunt */}
                {n.taunt && (
                  <div style={{
                    fontSize: 11, fontWeight: 600, fontStyle: 'italic',
                    color: n.type === 'bug_resolved' ? '#16a34a' : '#3b82f6',
                    padding: '3px 8px', borderRadius: 6,
                    background: n.type === 'bug_resolved' ? 'rgba(22,163,74,0.06)' : 'rgba(59,130,246,0.06)',
                    display: 'inline-block', marginBottom: 2,
                  }}>
                    "{n.taunt}"
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--text-4)' }}>
                  {n.fromUser?.nombre} — {fmtTime(n.createdAt)}
                </div>
              </div>

              {/* Unread dot */}
              {!n.read && (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#3b82f6',
                  flexShrink: 0, alignSelf: 'center',
                  boxShadow: '0 0 6px rgba(59,130,246,0.4)',
                }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
