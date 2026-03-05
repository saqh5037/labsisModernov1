import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQANotifications, markQANotificationRead, markAllQANotificationsRead } from '../services/api'
import { useSSE } from '../hooks/useSSE'
import { useNotificationSound } from '../hooks/useNotificationSound'
import { showToast } from './QAToast'

const NOTIF_STYLES = {
  bug_resolved:    { color: '#16a34a', bg: 'rgba(22,163,74,0.1)',  label: 'Resuelto' },
  bug_assigned:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Asignado' },
  bug_in_progress: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'En progreso' },
  bug_closed:      { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: 'Cerrado' },
  bug_no_repro:    { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'No reproducible' },
  new_comment:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Comentario' },
}

const NOTIF_ICONS = {
  bug_resolved: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
  bug_assigned: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /></svg>,
  bug_in_progress: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>,
  bug_closed: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="16 8 10 14 8 12" /></svg>,
  bug_no_repro: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  new_comment: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
}

export default function QANotificationBell() {
  const [notifs, setNotifs] = useState([])
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [permissionAsked, setPermissionAsked] = useState(
    typeof localStorage !== 'undefined' && localStorage.getItem('qa-notif-permission-asked') === 'true'
  )
  const ref = useRef(null)
  const navigate = useNavigate()
  const { playDing, showBrowserNotif, requestPermission, permission } = useNotificationSound()

  const fetchNotifs = async () => {
    try {
      const all = await getQANotifications()
      setNotifs(all.slice(0, 20))
      setUnreadCount(all.filter(n => !n.read).length)
    } catch { /* silent */ }
  }

  // Handle SSE notification
  const handleSSENotif = useCallback((notif) => {
    setNotifs(prev => [notif, ...prev].slice(0, 20))
    setUnreadCount(prev => prev + 1)
    playDing()
    showToast(notif)
    showBrowserNotif(
      NOTIF_STYLES[notif.type]?.label || 'Notificación',
      notif.message,
      () => { if (notif.bugId) navigate(`/qa/bugs/${notif.bugId}`) }
    )
  }, [playDing, showBrowserNotif, navigate])

  const { connected } = useSSE({ onNotification: handleSSENotif })

  // Initial fetch + fallback polling (only if SSE not connected)
  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(() => {
      if (!connected) fetchNotifs()
    }, 30000)
    return () => clearInterval(interval)
  }, [connected])

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

  const handleEnableNotifs = async () => {
    await requestPermission()
    setPermissionAsked(true)
    localStorage.setItem('qa-notif-permission-asked', 'true')
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
        {/* Connection indicator */}
        <div style={{
          position: 'absolute', bottom: 2, right: 2,
          width: 6, height: 6, borderRadius: '50%',
          background: connected ? '#16a34a' : '#94a3b8',
          border: '1.5px solid var(--surface, #fff)',
        }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: -2,
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
          width: 360, maxHeight: 440, overflowY: 'auto',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Notificaciones</span>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: connected ? '#16a34a' : '#94a3b8',
              }} />
            </div>
            {unreadCount > 0 && (
              <button onClick={handleMarkAll} style={{
                background: 'none', border: 'none', fontSize: 11, fontWeight: 600,
                color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline',
              }}>Marcar todas leídas</button>
            )}
          </div>

          {/* Permission prompt */}
          {!permissionAsked && permission === 'default' && (
            <div style={{
              padding: '10px 14px', background: 'rgba(59,130,246,0.04)',
              borderBottom: '1px solid var(--border, #e2e8f0)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Recibir alertas de escritorio?</span>
              <button onClick={handleEnableNotifs} style={{
                background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6,
                padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>Activar</button>
            </div>
          )}

          {/* Notif list */}
          {notifs.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
              Sin notificaciones
            </div>
          ) : notifs.map(n => {
            const style = NOTIF_STYLES[n.type] || NOTIF_STYLES.new_comment
            return (
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
                  background: style.bg, color: style.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {NOTIF_ICONS[n.type] || NOTIF_ICONS.new_comment}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: 'var(--text-1)', marginBottom: 2 }}>
                    {n.message || `Bug #${n.bugId}`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.bugTitle}
                  </div>
                  {n.taunt && (
                    <div style={{
                      fontSize: 11, fontWeight: 600, fontStyle: 'italic',
                      color: style.color,
                      padding: '3px 8px', borderRadius: 6,
                      background: style.bg,
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
            )
          })}
        </div>
      )}
    </div>
  )
}
