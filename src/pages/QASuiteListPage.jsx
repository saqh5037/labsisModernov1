import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQASuites, createQARun } from '../services/api'
import QANav from '../components/QANav'

export default function QASuiteListPage() {
  const [suites, setSuites] = useState([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(null)
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getQASuites().then(s => { setSuites(s); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const handleStartRun = async (suiteId) => {
    setStarting(suiteId)
    try {
      const run = await createQARun(suiteId)
      navigate(`/qa/runs/${run.id}`)
    } catch (err) {
      setToast({ type: 'error', message: 'Error creando run: ' + err.message })
      setStarting(null)
    }
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

  if (loading) return (
    <div className="dv"><QANav active="suites" /><div className="dv-loading"><div className="dv-spinner" />Cargando suites...</div></div>
  )

  return (
    <div className="dv">
      <QANav active="suites" />

      <div className="dv-hero" style={{ minHeight: 120 }}>
        <div className="dv-hero-bg" />
        <div className="dv-hero-aurora" />
        <div className="dv-hero-content">
          <div className="dv-hero-info" style={{ textAlign: 'center', width: '100%' }}>
            <div className="dv-hero-eyebrow"><span className="dv-eyebrow-dot" />Biblioteca de Tests</div>
            <h1 className="dv-hero-title">
              <span className="dv-title-num">{suites.length}</span>
              <span className="dv-title-text">test suites disponibles</span>
            </h1>
          </div>
        </div>
      </div>

      <div className="dv-content">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {suites.map(s => (
            <div key={s.id} className="dv-section" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{s.nombre}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--blue)', marginTop: 2 }}>{s.modulo}</div>
                </div>
                <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--blue)' }}>{s.totalCases}</span>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>{s.descripcion}</p>

              {s.lastRun && (
                <div style={{ fontSize: 11, color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Último run: {fmtDate(s.lastRun.startedAt)}</span>
                  <span className={`qa-estado-${s.lastRun.estado}`}>{s.lastRun.estado}</span>
                  <span style={{ fontWeight: 600 }}>{s.lastRun.progreso}%</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button
                  className="dv-nav-link"
                  style={{ flex: 1, justifyContent: 'center', fontWeight: 600, background: 'rgba(59,130,246,.1)', color: 'var(--blue)', borderColor: 'rgba(59,130,246,.3)' }}
                  onClick={() => handleStartRun(s.id)}
                  disabled={starting === s.id}
                >
                  {starting === s.id ? 'Iniciando...' : 'Iniciar Run'}
                </button>
                <button className="dv-nav-link" onClick={() => navigate(`/qa/suites/${s.id}`)} title="Ver detalle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div className={`lab-toast lab-toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <footer className="dv-footer">QA Testing Module — labsisModernov1</footer>
    </div>
  )
}
