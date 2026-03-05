import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getQASuite, createQARun } from '../services/api'
import QANav from '../components/QANav'

export default function QASuiteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [suite, setSuite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openSections, setOpenSections] = useState(new Set())
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    getQASuite(id).then(s => {
      setSuite(s)
      const secs = [...new Set(s.cases.map(c => c.seccion))]
      if (secs.length) setOpenSections(new Set([secs[0]]))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const toggleSection = (sec) => {
    setOpenSections(prev => { const next = new Set(prev); next.has(sec) ? next.delete(sec) : next.add(sec); return next })
  }

  const handleStartRun = async () => {
    setStarting(true)
    try {
      const run = await createQARun(id)
      navigate(`/qa/runs/${run.id}`)
    } catch (err) { alert('Error: ' + err.message); setStarting(false) }
  }

  if (loading) return <div className="dv"><QANav active="suites" /><div className="dv-loading"><div className="dv-spinner" />Cargando suite...</div></div>
  if (!suite) return <div className="dv"><QANav active="suites" /><div className="dv-loading">Suite no encontrada</div></div>

  const sections = []
  const sectionMap = new Map()
  for (const c of suite.cases) {
    if (!sectionMap.has(c.seccion)) { sectionMap.set(c.seccion, []); sections.push(c.seccion) }
    sectionMap.get(c.seccion).push(c)
  }

  const priColors = { critico: '#991b1b', alto: '#c2410c', medio: '#3b82f6', bajo: '#64748b' }

  return (
    <div className="dv">
      <QANav active="suites" />

      <div className="dv-hero" style={{ minHeight: 140 }}>
        <div className="dv-hero-bg" />
        <div className="dv-hero-aurora" />
        <div className="dv-hero-content">
          <div className="dv-hero-info" style={{ textAlign: 'center', width: '100%' }}>
            <div className="dv-hero-eyebrow"><span className="dv-eyebrow-dot" />{suite.modulo} — v{suite.version}</div>
            <h1 className="dv-hero-title">
              <span className="dv-title-num">{suite.cases.length}</span>
              <span className="dv-title-text">{suite.nombre}</span>
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(15,23,42,0.6)', maxWidth: 600, margin: '8px auto 0' }}>{suite.descripcion}</p>
          </div>
        </div>
      </div>

      <div className="dv-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <button className="dv-nav-link" onClick={() => navigate('/qa/suites')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Volver a Suites
          </button>
          <button className="dv-nav-link dv-nav-active" onClick={handleStartRun} disabled={starting}>
            {starting ? 'Iniciando...' : 'Iniciar Run con esta Suite'}
          </button>
        </div>

        {sections.map(sec => {
          const cases = sectionMap.get(sec)
          const isOpen = openSections.has(sec)
          return (
            <div key={sec} className="dv-section" style={{ marginBottom: 8, padding: 0, overflow: 'hidden' }}>
              <div onClick={() => toggleSection(sec)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}>
                <span style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform 200ms', transform: isOpen ? 'rotate(90deg)' : '' }}><polyline points="9 18 15 12 9 6" /></svg>
                  {sec}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 600 }}>{cases.length} cases</span>
              </div>
              {isOpen && cases.map(c => (
                <div key={c.id} style={{ padding: '10px 16px 10px 36px', borderTop: '1px solid rgba(59,130,246,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', fontFamily: 'var(--font-mono)', minWidth: 20 }}>{c.orden}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{c.titulo}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: priColors[c.prioridad] || '#64748b', padding: '2px 8px', borderRadius: 4, background: `${priColors[c.prioridad] || '#64748b'}12` }}>{c.prioridad}</span>
                  </div>
                  <div style={{ paddingLeft: 30, marginTop: 6 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 4px' }}>{c.descripcion}</p>
                    <ol style={{ fontSize: 12, color: 'var(--text-2)', paddingLeft: 18, margin: '4px 0' }}>
                      {c.pasos.map((p, i) => <li key={i}>{p}</li>)}
                    </ol>
                    <div style={{ fontSize: 12, padding: '6px 10px', background: 'rgba(59,130,246,0.04)', borderRadius: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-4)', letterSpacing: '0.04em' }}>Resultado Esperado: </span>
                      {c.resultado_esperado}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <footer className="dv-footer">QA Testing Module — labsisModernov1</footer>
    </div>
  )
}
