import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQABugs } from '../services/api'
import QANav from '../components/QANav'

export default function QABugListPage() {
  const [bugs, setBugs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterEstado, setFilterEstado] = useState('')
  const [filterSev, setFilterSev] = useState('')
  const [filterTipo, setFilterTipo] = useState('') // '' | 'auto' | 'manual'
  const [groupBy, setGroupBy] = useState('none') // 'none' | 'run' | 'severidad' | 'estado'
  const navigate = useNavigate()

  useEffect(() => {
    getQABugs().then(b => { setBugs(b); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
  const isAuto = (b) => b.titulo?.startsWith('[Auto]')

  let filtered = bugs
  if (filterEstado) filtered = filtered.filter(b => b.estado === filterEstado)
  if (filterSev) filtered = filtered.filter(b => b.severidad === filterSev)
  if (filterTipo === 'auto') filtered = filtered.filter(b => isAuto(b))
  if (filterTipo === 'manual') filtered = filtered.filter(b => !isAuto(b))

  // Counts for quick stats
  const autoCount = bugs.filter(b => isAuto(b)).length
  const openCount = bugs.filter(b => b.estado === 'abierto' || b.estado === 'en_progreso').length

  // Grouping logic
  const grouped = useMemo(() => {
    if (groupBy === 'none') return null
    const groups = new Map()
    for (const b of filtered) {
      let key
      if (groupBy === 'run') key = b.runId ? `Run #${b.runId}` : 'Sin run'
      else if (groupBy === 'severidad') key = b.severidad || 'sin severidad'
      else if (groupBy === 'estado') key = b.estado || 'sin estado'
      else key = 'Otros'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(b)
    }
    return groups
  }, [filtered, groupBy])

  const selectStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border, #e2e8f0)', fontSize: 13, background: 'var(--surface, #fff)' }

  if (loading) return <div className="dv"><QANav active="bugs" /><div className="dv-loading"><div className="dv-spinner" />Cargando bugs...</div></div>

  const BugRow = ({ b, showBorder }) => (
    <div
      onClick={() => navigate(`/qa/bugs/${b.id}`)}
      className="qa-row-hover"
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', borderTop: showBorder ? '1px solid rgba(59,130,246,0.06)' : 'none', flexWrap: 'wrap' }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-4)', minWidth: 60 }}>BUG-{String(b.id).padStart(3, '0')}</span>
      {isAuto(b) && (
        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.08)', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Auto</span>
      )}
      <div style={{ flex: 1, fontSize: 13, fontWeight: 500, minWidth: 120 }}>{b.titulo}</div>
      <span className={`qa-sev-${b.severidad}`}>{b.severidad}</span>
      <span className={`qa-estado-${b.estado}`}>{b.estado}</span>
      <span style={{ fontSize: 11, color: 'var(--text-4)', minWidth: 50 }}>{b.reportadoPor?.nombre?.split(' ')[0]}</span>
      <span style={{ fontSize: 11, color: 'var(--text-4)', minWidth: 80 }}>{fmtDate(b.createdAt)}</span>
    </div>
  )

  return (
    <div className="dv">
      <QANav active="bugs" />

      <div className="dv-hero" style={{ minHeight: 120 }}>
        <div className="dv-hero-bg" />
        <div className="dv-hero-aurora" />
        <div className="dv-hero-content">
          <div className="dv-hero-info" style={{ textAlign: 'center', width: '100%' }}>
            <div className="dv-hero-eyebrow"><span className="dv-eyebrow-dot" />Bug Tracker</div>
            <h1 className="dv-hero-title">
              <span className="dv-title-num">{bugs.length}</span>
              <span className="dv-title-text">bugs reportados</span>
            </h1>
            <div className="dv-hero-metrics">
              <div className="dv-metric">
                <div className="dv-metric-icon" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </div>
                <div className="dv-metric-data">
                  <span className="dv-metric-val" style={{ color: '#dc2626' }}>{openCount}</span>
                  <span className="dv-metric-label">Abiertos</span>
                </div>
              </div>
              <div className="dv-metric">
                <div className="dv-metric-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                </div>
                <div className="dv-metric-data">
                  <span className="dv-metric-val">{autoCount}</span>
                  <span className="dv-metric-label">Auto</span>
                </div>
              </div>
              <div className="dv-metric">
                <div className="dv-metric-icon" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <div className="dv-metric-data">
                  <span className="dv-metric-val">{bugs.filter(b => b.estado === 'resuelto' || b.estado === 'cerrado').length}</span>
                  <span className="dv-metric-label">Resueltos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dv-content">
        {/* Filters row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} style={selectStyle}>
            <option value="">Todos los estados</option>
            <option value="abierto">Abierto</option>
            <option value="en_progreso">En Progreso</option>
            <option value="resuelto">Resuelto</option>
            <option value="cerrado">Cerrado</option>
          </select>
          <select value={filterSev} onChange={e => setFilterSev(e.target.value)} style={selectStyle}>
            <option value="">Todas las severidades</option>
            <option value="blocker">Blocker</option>
            <option value="critico">Crítico</option>
            <option value="mayor">Mayor</option>
            <option value="menor">Menor</option>
          </select>
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} style={selectStyle}>
            <option value="">Todos (auto + manual)</option>
            <option value="auto">Solo auto-generados</option>
            <option value="manual">Solo manuales</option>
          </select>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Group by */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-4)', fontWeight: 600 }}>Agrupar:</span>
            {[
              { val: 'none', label: 'Sin agrupar' },
              { val: 'run', label: 'Por Run' },
              { val: 'severidad', label: 'Severidad' },
              { val: 'estado', label: 'Estado' },
            ].map(g => (
              <button key={g.val} onClick={() => setGroupBy(g.val)} style={{
                padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 600,
                background: groupBy === g.val ? '#3b82f6' : '#f1f5f9',
                color: groupBy === g.val ? '#fff' : '#64748b',
              }}>{g.label}</button>
            ))}
          </div>
        </div>

        {/* Bug list */}
        {filtered.length === 0 ? (
          <div className="dv-section" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: 'var(--text-4)', fontSize: 13 }}>No hay bugs reportados</p>
          </div>
        ) : groupBy === 'none' ? (
          /* Flat list */
          <div className="dv-section" style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.map((b, i) => <BugRow key={b.id} b={b} showBorder={i > 0} />)}
          </div>
        ) : (
          /* Grouped list */
          [...grouped.entries()].map(([groupName, groupBugs]) => (
            <div key={groupName} style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                padding: '6px 0',
              }}>
                <span style={{
                  fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  color: '#3b82f6', letterSpacing: '0.04em',
                }}>{groupName}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#fff', background: '#3b82f6',
                  borderRadius: 10, padding: '1px 8px',
                }}>{groupBugs.length}</span>
              </div>
              <div className="dv-section" style={{ padding: 0, overflow: 'hidden' }}>
                {groupBugs.map((b, i) => <BugRow key={b.id} b={b} showBorder={i > 0} />)}
              </div>
            </div>
          ))
        )}
      </div>

      <footer className="dv-footer">QA Testing Module — labsisModernov1</footer>
    </div>
  )
}
