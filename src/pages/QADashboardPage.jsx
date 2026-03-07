import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQADashboard, getQATeamDashboard, getQAMyBugs } from '../services/api'
import QANav from '../components/QANav'

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#16a34a', '#0ea5e9', '#eab308', '#dc2626']

export default function QADashboardPage() {
  const [data, setData] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [myBugs, setMyBugs] = useState(null)
  const [myBugsFilter, setMyBugsFilter] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      getQADashboard(),
      getQATeamDashboard().catch(() => null),
      getQAMyBugs().catch(() => null),
    ])
      .then(([d, t, m]) => { setData(d); setTeamData(t); setMyBugs(m); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="dv"><QANav active="dashboard" /><div className="dv-loading"><div className="dv-spinner" />Cargando dashboard...</div></div>
  )
  if (!data) return (
    <div className="dv"><QANav active="dashboard" /><div className="dv-loading">Error cargando dashboard</div></div>
  )

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="dv">
      <QANav active="dashboard" />

      {/* Hero */}
      <div className="dv-hero" style={{ minHeight: 200 }}>
        <div className="dv-hero-bg" />
        <div className="dv-hero-aurora" />
        <div className="dv-hero-content">
          <div className="dv-hero-info" style={{ textAlign: 'center', width: '100%' }}>
            <div className="dv-hero-eyebrow"><span className="dv-eyebrow-dot" />QA Testing Module</div>
            <h1 className="dv-hero-title">
              <span className="dv-title-num">{data.totalCases}</span>
              <span className="dv-title-text">test cases en {data.totalSuites} suites</span>
            </h1>
            <div className="dv-hero-metrics">
              <div className="dv-metric">
                <div className="dv-metric-icon dv-metric-green">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>
                </div>
                <div className="dv-metric-data">
                  <span className="dv-metric-val">{data.activeRuns}</span>
                  <span className="dv-metric-label">Runs Activos</span>
                </div>
              </div>
              <div className="dv-metric">
                <div className="dv-metric-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                </div>
                <div className="dv-metric-data">
                  <span className="dv-metric-val">{data.openBugs}</span>
                  <span className="dv-metric-label">Bugs Abiertos</span>
                </div>
              </div>
              <div className="dv-metric">
                <div className="dv-metric-icon" style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                </div>
                <div className="dv-metric-data">
                  <span className="dv-metric-val">{data.avgProgress}%</span>
                  <span className="dv-metric-label">Progreso Prom.</span>
                </div>
              </div>
              <div className="dv-metric">
                <div className="dv-metric-icon dv-metric-blue">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                </div>
                <div className="dv-metric-data">
                  <span className="dv-metric-val">{data.totalRuns}</span>
                  <span className="dv-metric-label">Total Runs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mis Bugs */}
      {myBugs && (myBugs.reported?.length > 0 || myBugs.assigned?.length > 0) && (
        <div className="dv-content" style={{ paddingBottom: 0 }}>
          <div className="dv-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Mis Bugs</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { key: 'pendingMyAction', label: 'Pendientes', count: myBugs.quickFilters?.pendingMyAction, color: '#dc2626' },
                  { key: 'inProgress', label: 'En progreso', count: myBugs.quickFilters?.inProgress, color: '#f59e0b' },
                  { key: 'resolvedPendingVerification', label: 'Por verificar', count: myBugs.quickFilters?.resolvedPendingVerification, color: '#16a34a' },
                  { key: 'waitingOnDev', label: 'Esperando Dev', count: myBugs.quickFilters?.waitingOnDev, color: '#3b82f6' },
                ].filter(f => f.count > 0).map(f => (
                  <button
                    key={f.key}
                    onClick={() => setMyBugsFilter(myBugsFilter === f.key ? null : f.key)}
                    style={{
                      padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                      border: myBugsFilter === f.key ? `1.5px solid ${f.color}` : '1.5px solid var(--border, #e2e8f0)',
                      background: myBugsFilter === f.key ? `${f.color}0c` : 'transparent',
                      fontSize: 11, fontWeight: 700,
                      color: myBugsFilter === f.key ? f.color : 'var(--text-3)',
                      display: 'flex', alignItems: 'center', gap: 5,
                      transition: 'all 150ms',
                    }}
                  >
                    {f.label}
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center',
                      background: `${f.color}15`, color: f.color,
                      fontSize: 10, fontWeight: 800,
                    }}>{f.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Reported by me */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-4)', marginBottom: 8 }}>Reportados por mí</div>
                {myBugs.reported?.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-4)' }}>Ninguno</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {myBugs.reported.filter(b => {
                      if (!myBugsFilter) return true
                      if (myBugsFilter === 'resolvedPendingVerification') return b.estado === 'resuelto'
                      if (myBugsFilter === 'waitingOnDev') return b.asignadoA && b.estado !== 'resuelto' && b.estado !== 'cerrado'
                      return false
                    }).map(b => (
                      <div key={b.id} onClick={() => navigate(`/qa/bugs/${b.id}`)} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                        cursor: 'pointer', border: '1px solid var(--border-s, #e2e8f0)', transition: 'all .15s',
                      }} className="qa-row-hover">
                        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-4)' }}>#{String(b.id).padStart(3, '0')}</span>
                        <div style={{ flex: 1, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.titulo}</div>
                        <span className={`qa-estado-${b.estado}`} style={{ fontSize: 10 }}>{b.estado?.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assigned to me */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-4)', marginBottom: 8 }}>Asignados a mí</div>
                {myBugs.assigned?.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-4)' }}>Ninguno</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {myBugs.assigned.filter(b => {
                      if (!myBugsFilter) return true
                      if (myBugsFilter === 'pendingMyAction') return b.estado === 'abierto'
                      if (myBugsFilter === 'inProgress') return b.estado === 'en_progreso'
                      return false
                    }).map(b => (
                      <div key={b.id} onClick={() => navigate(`/qa/bugs/${b.id}`)} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                        cursor: 'pointer', border: '1px solid var(--border-s, #e2e8f0)', transition: 'all .15s',
                      }} className="qa-row-hover">
                        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-4)' }}>#{String(b.id).padStart(3, '0')}</span>
                        <div style={{ flex: 1, fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.titulo}</div>
                        <span className={`qa-sev-${b.severidad}`} style={{ fontSize: 10 }}>{b.severidad}</span>
                        <span className={`qa-estado-${b.estado}`} style={{ fontSize: 10 }}>{b.estado?.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="dv-content">
        {/* Severity summary */}
        {(data.bugsBySeverity.blocker > 0 || data.bugsBySeverity.critico > 0) && (
          <div className="dv-section" style={{ marginBottom: 16, borderLeft: '3px solid #ef4444' }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>Bugs por Severidad:</span>
              {data.bugsBySeverity.blocker > 0 && <span className="qa-sev-blocker">{data.bugsBySeverity.blocker} Blocker</span>}
              {data.bugsBySeverity.critico > 0 && <span className="qa-sev-critico">{data.bugsBySeverity.critico} Crítico</span>}
              {data.bugsBySeverity.mayor > 0 && <span className="qa-sev-mayor">{data.bugsBySeverity.mayor} Mayor</span>}
              {data.bugsBySeverity.menor > 0 && <span className="qa-sev-menor">{data.bugsBySeverity.menor} Menor</span>}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Recent Runs */}
          <div className="dv-section">
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-1)' }}>Runs Recientes</div>
            {data.recentRuns.length === 0 ? (
              <p style={{ color: 'var(--text-4)', fontSize: 13 }}>No hay runs todavía. <span style={{ color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/qa/suites')}>Iniciar uno</span></p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.recentRuns.map(r => (
                  <div key={r.id} onClick={() => navigate(`/qa/runs/${r.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border-s, #e2e8f0)', transition: 'all .2s' }} className="qa-row-hover">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{r.suiteName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{r.tester?.nombre} — {fmtDate(r.startedAt)}</div>
                    </div>
                    <div className="qa-progress-track" style={{ width: 60 }}>
                      <div className={`qa-progress-fill ${r.progreso < 30 ? 'qa-progress-fill--low' : r.progreso < 70 ? 'qa-progress-fill--mid' : 'qa-progress-fill--high'}`} style={{ width: `${r.progreso}%` }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', minWidth: 30, textAlign: 'right' }}>{r.progreso}%</span>
                    <span className={`qa-estado-${r.estado}`}>{r.estado}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Bugs */}
          <div className="dv-section">
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-1)' }}>Bugs Recientes</div>
            {data.recentBugs.length === 0 ? (
              <p style={{ color: 'var(--text-4)', fontSize: 13 }}>No hay bugs reportados</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.recentBugs.map(b => (
                  <div key={b.id} onClick={() => navigate(`/qa/bugs/${b.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border-s, #e2e8f0)', transition: 'all .2s' }} className="qa-row-hover">
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-4)' }}>#{String(b.id).padStart(3, '0')}</span>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{b.titulo}</div>
                    <span className={`qa-sev-${b.severidad}`}>{b.severidad}</span>
                    <span className={`qa-estado-${b.estado}`}>{b.estado}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team section */}
      {teamData?.team?.length > 0 && (
        <div className="dv-content" style={{ paddingTop: 0 }}>
          <div className="dv-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Equipo QA</div>
              <button className="dv-nav-link" onClick={() => navigate('/qa/team')} style={{ fontSize: 11 }}>
                Gestionar equipo
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {teamData.team.map(t => {
                const color = AVATAR_COLORS[t.userId % AVATAR_COLORS.length]
                const initials = t.userName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
                return (
                  <div key={t.userId} style={{
                    padding: 14, borderRadius: 10,
                    border: '1px solid var(--border, #e2e8f0)',
                    display: 'flex', flexDirection: 'column', gap: 10,
                    animation: 'fadeUp 300ms ease-out forwards',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: `${color}15`, color, border: `2px solid ${color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800,
                      }}>{initials}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{t.userName}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-4)' }}>
                          {t.runsActivos > 0 ? `${t.runsActivos} run${t.runsActivos > 1 ? 's' : ''} activo${t.runsActivos > 1 ? 's' : ''}` : 'Sin runs activos'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 6, background: 'rgba(22,163,74,0.04)' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>{t.runsCompletados}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase' }}>Runs</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 6, background: 'rgba(220,38,38,0.04)' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>{t.bugsReportados}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase' }}>Bugs</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: 6, background: 'rgba(59,130,246,0.04)' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#3b82f6' }}>{t.bugsToday}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase' }}>Hoy</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <footer className="dv-footer">QA Testing Module — labsisModernov1</footer>
    </div>
  )
}
