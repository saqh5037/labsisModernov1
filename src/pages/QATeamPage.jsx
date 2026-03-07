import { useState, useEffect } from 'react'
import { getQAUsers, getQASuites, getQAAssignments, saveQAAssignments, getQATeamDashboard } from '../services/api'
import QANav from '../components/QANav'

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#16a34a', '#0ea5e9', '#eab308', '#dc2626']

function getInitials(nombre, apellido) {
  return `${(nombre || '')[0] || ''}${(apellido || '')[0] || ''}`.toUpperCase()
}

function getColor(userId) {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length]
}

export default function QATeamPage() {
  const [users, setUsers] = useState([])
  const [suites, setSuites] = useState([])
  const [assignments, setAssignments] = useState([])
  const [teamData, setTeamData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [expandedUser, setExpandedUser] = useState(null)

  useEffect(() => {
    Promise.all([getQAUsers(), getQASuites(), getQAAssignments(), getQATeamDashboard()])
      .then(([u, s, a, t]) => {
        setUsers(u)
        setSuites(s)
        setAssignments(a)
        setTeamData(t)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const toggleSuite = (userId, suiteId) => {
    setAssignments(prev => {
      const copy = [...prev]
      const idx = copy.findIndex(a => a.userId === userId)
      if (idx >= 0) {
        const sIds = [...copy[idx].suiteIds]
        const si = sIds.indexOf(suiteId)
        si >= 0 ? sIds.splice(si, 1) : sIds.push(suiteId)
        if (sIds.length === 0) {
          copy.splice(idx, 1) // remove assignment if no suites
        } else {
          copy[idx] = { ...copy[idx], suiteIds: sIds }
        }
      } else {
        const user = users.find(u => u.id === userId)
        copy.push({
          userId,
          userName: `${user?.nombre || ''} ${user?.apellido || ''}`.trim(),
          suiteIds: [suiteId],
          assignedAt: new Date().toISOString(),
          assignedBy: { id: 0, nombre: 'Manager' },
        })
      }
      return copy
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      await saveQAAssignments(assignments)
      setSaveMsg('Guardado!')
      setTimeout(() => setSaveMsg(''), 2000)
      // Refresh team data
      const t = await getQATeamDashboard()
      setTeamData(t)
    } catch {
      setSaveMsg('Error al guardar')
    }
    setSaving(false)
  }

  const getUserAssignment = (userId) => assignments.find(a => a.userId === userId)
  const getUserStats = (userId) => teamData?.team?.find(t => t.userId === userId)

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

  if (loading) return <div className="dv"><QANav active="team" /><div className="dv-loading"><div className="dv-spinner" />Cargando equipo...</div></div>

  return (
    <div className="dv">
      <QANav active="team" />

      {/* Hero */}
      <div className="dv-hero" style={{ minHeight: 160 }}>
        <div className="dv-hero-bg" />
        <div className="dv-hero-aurora" />
        <div className="dv-hero-content">
          <div className="dv-hero-info" style={{ textAlign: 'center', width: '100%' }}>
            <div className="dv-hero-eyebrow"><span className="dv-eyebrow-dot" />Gestión de Equipo</div>
            <h1 className="dv-hero-title">
              <span className="dv-title-num">{assignments.length}</span>
              <span className="dv-title-text">testers asignados</span>
            </h1>
            <div className="dv-hero-metrics">
              <div className="dv-metric">
                <div className="dv-metric-icon dv-metric-blue">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                </div>
                <div className="dv-metric-data">
                  <span className="dv-metric-val">{users.length}</span>
                  <span className="dv-metric-label">Usuarios</span>
                </div>
              </div>
              <div className="dv-metric">
                <div className="dv-metric-icon dv-metric-green">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                </div>
                <div className="dv-metric-data">
                  <span className="dv-metric-val">{suites.length}</span>
                  <span className="dv-metric-label">Suites</span>
                </div>
              </div>
              {teamData && (
                <div className="dv-metric">
                  <div className="dv-metric-icon" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                  </div>
                  <div className="dv-metric-data">
                    <span className="dv-metric-val">{teamData.totalOpen}</span>
                    <span className="dv-metric-label">Bugs Abiertos</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="dv-content">
        {/* Save bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Asignar testers a suites</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {saveMsg && (
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                background: saveMsg === 'Guardado!' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                color: saveMsg === 'Guardado!' ? '#16a34a' : '#dc2626',
                animation: 'fadeUp 200ms ease-out forwards',
              }}>{saveMsg}</span>
            )}
            <button onClick={handleSave} disabled={saving} className="dv-nav-link dv-nav-active" style={{ minHeight: 40 }}>
              {saving ? 'Guardando...' : 'Guardar Asignaciones'}
            </button>
          </div>
        </div>

        {/* User list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(user => {
            const assignment = getUserAssignment(user.id)
            const stats = getUserStats(user.id)
            const isExpanded = expandedUser === user.id
            const color = getColor(user.id)
            const assigned = assignment?.suiteIds || []

            return (
              <div key={user.id} className="dv-section" style={{ padding: 0, overflow: 'hidden' }}>
                {/* User row header */}
                <div
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                    cursor: 'pointer', userSelect: 'none', transition: 'background 150ms',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: `${color}15`, color, border: `2px solid ${color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800,
                  }}>
                    {getInitials(user.nombre, user.apellido)}
                  </div>

                  {/* Name + username */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{user.nombre} {user.apellido}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>@{user.username}</div>
                  </div>

                  {/* Assigned suite chips */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 280 }}>
                    {assigned.length > 0 ? assigned.map(sId => {
                      const s = suites.find(x => x.id === sId)
                      return (
                        <span key={sId} style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                          background: 'rgba(59,130,246,0.08)', color: '#3b82f6',
                          border: '1px solid rgba(59,130,246,0.15)',
                        }}>{s?.nombre || sId}</span>
                      )
                    }) : (
                      <span style={{ fontSize: 11, color: 'var(--text-4)', fontStyle: 'italic' }}>Sin asignar</span>
                    )}
                  </div>

                  {/* Stats badges */}
                  {stats && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {stats.bugsReportados > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>
                          {stats.bugsReportados} bugs
                        </span>
                      )}
                      {stats.runsCompletados > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(22,163,74,0.08)', color: '#16a34a' }}>
                          {stats.runsCompletados} runs
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expand arrow */}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" style={{ transition: 'transform 200ms', transform: isExpanded ? 'rotate(90deg)' : '', flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                    {/* Suite toggles */}
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-4)', letterSpacing: '0.04em', margin: '12px 0 8px' }}>Asignar suites</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                      {suites.map(s => {
                        const isAssigned = assigned.includes(s.id)
                        return (
                          <button key={s.id} onClick={() => toggleSuite(user.id, s.id)} style={{
                            padding: '12px', borderRadius: 10, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 10, minHeight: 52,
                            border: isAssigned ? '2px solid #3b82f6' : '2px solid var(--border, #e2e8f0)',
                            background: isAssigned ? 'rgba(59,130,246,0.04)' : 'transparent',
                            transition: 'all 200ms cubic-bezier(0.34,1.56,0.64,1)',
                            transform: isAssigned ? 'scale(1.01)' : 'scale(1)',
                          }}>
                            <div style={{
                              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                              border: isAssigned ? '2px solid #3b82f6' : '2px solid var(--border, #e2e8f0)',
                              background: isAssigned ? '#3b82f6' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 150ms',
                            }}>
                              {isAssigned && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
                            </div>
                            <div style={{ textAlign: 'left', flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{s.nombre}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{s.totalCases} test cases</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* User stats */}
                    {stats && (
                      <div style={{ marginTop: 14, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(22,163,74,0.04)', border: '1px solid rgba(22,163,74,0.1)', flex: 1, minWidth: 120 }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>{stats.runsCompletados}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase' }}>Runs completados</div>
                        </div>
                        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.1)', flex: 1, minWidth: 120 }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{stats.bugsReportados}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase' }}>Bugs reportados</div>
                        </div>
                        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)', flex: 1, minWidth: 120 }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{stats.bugsToday}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase' }}>Bugs hoy</div>
                        </div>
                        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.1)', flex: 1, minWidth: 120 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{fmtDate(stats.lastActive)}</div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase' }}>Última actividad</div>
                        </div>
                      </div>
                    )}

                    {/* Suite progress */}
                    {stats?.suiteProgress?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-4)', letterSpacing: '0.04em', marginBottom: 6 }}>Progreso por suite</div>
                        {stats.suiteProgress.map(sp => {
                          const s = suites.find(x => x.id === sp.suiteId)
                          return (
                            <div key={sp.suiteId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 500, minWidth: 120 }}>{s?.nombre || sp.suiteId}</span>
                              <div className="qa-progress-track" style={{ flex: 1, maxWidth: 200 }}>
                                <div className={`qa-progress-fill ${sp.progreso < 30 ? 'qa-progress-fill--low' : sp.progreso < 70 ? 'qa-progress-fill--mid' : 'qa-progress-fill--high'}`} style={{ width: `${sp.progreso}%` }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', minWidth: 30 }}>{sp.progreso}%</span>
                              {sp.estado && <span className={`qa-estado-${sp.estado}`}>{sp.estado}</span>}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <footer className="dv-footer">QA Testing Module — labsisModernov1</footer>
    </div>
  )
}
