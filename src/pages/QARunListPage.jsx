import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQARuns, getQAUsers } from '../services/api'
import QANav from '../components/QANav'

export default function QARunListPage() {
  const [runs, setRuns] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ estado: '', usuario_id: '' })
  const navigate = useNavigate()

  const loadRuns = async () => {
    setLoading(true)
    try { const data = await getQARuns(filters); setRuns(data) } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { loadRuns() }, [filters.estado, filters.usuario_id])
  useEffect(() => { getQAUsers().then(setUsers).catch(() => {}) }, [])

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

  const selectStyle = { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border, #e2e8f0)', fontSize: 13, background: 'var(--surface, #fff)' }

  if (loading && runs.length === 0) return <div className="dv"><QANav active="runs" /><div className="dv-loading"><div className="dv-spinner" />Cargando runs...</div></div>

  return (
    <div className="dv">
      <QANav active="runs" />

      <div className="dv-hero" style={{ minHeight: 120 }}>
        <div className="dv-hero-bg" />
        <div className="dv-hero-aurora" />
        <div className="dv-hero-content">
          <div className="dv-hero-info" style={{ textAlign: 'center', width: '100%' }}>
            <div className="dv-hero-eyebrow"><span className="dv-eyebrow-dot" />Historial de ejecuciones</div>
            <h1 className="dv-hero-title">
              <span className="dv-title-num">{runs.length}</span>
              <span className="dv-title-text">test runs</span>
            </h1>
          </div>
        </div>
      </div>

      <div className="dv-content">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <select value={filters.estado} onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))} style={selectStyle}>
            <option value="">Todos los estados</option>
            <option value="en_progreso">En Progreso</option>
            <option value="pausado">Pausado</option>
            <option value="completado">Completado</option>
          </select>
          <select value={filters.usuario_id} onChange={e => setFilters(f => ({ ...f, usuario_id: e.target.value }))} style={selectStyle}>
            <option value="">Todos los testers</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
          </select>
        </div>

        {/* Run list */}
        {runs.length === 0 ? (
          <div className="dv-section" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: 'var(--text-4)', fontSize: 13 }}>No hay runs. <span style={{ color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate('/qa/suites')}>Iniciar uno desde Suites</span></p>
          </div>
        ) : (
          <div className="dv-section" style={{ padding: 0, overflow: 'hidden' }}>
            {runs.map((r, i) => (
              <div
                key={r.id}
                onClick={() => navigate(`/qa/runs/${r.id}`)}
                className="qa-row-hover"
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', borderTop: i > 0 ? '1px solid rgba(59,130,246,0.06)' : 'none' }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.suiteName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{r.tester?.nombre} — {fmtDate(r.startedAt)}</div>
                </div>
                <div className="qa-progress-track" style={{ width: 80 }}>
                  <div className={`qa-progress-fill ${r.progreso < 30 ? 'qa-progress-fill--low' : r.progreso < 70 ? 'qa-progress-fill--mid' : 'qa-progress-fill--high'}`} style={{ width: `${r.progreso}%` }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', minWidth: 30, textAlign: 'right' }}>{r.progreso}%</span>
                <span className={`qa-estado-${r.estado}`}>{r.estado}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="dv-footer">QA Testing Module — labsisModernov1</footer>
    </div>
  )
}
