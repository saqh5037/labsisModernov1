import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { getQARun, saveQAResults, updateQARun, createQABug, createQASession } from '../services/api'
import QANav from '../components/QANav'
import BugReportWizard from '../components/BugReportWizard'

export default function QARunPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [run, setRun] = useState(null)
  const [suite, setSuite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState({})
  const [openSections, setOpenSections] = useState(new Set())
  const [expandedCards, setExpandedCards] = useState(new Set())
  const [obsOpen, setObsOpen] = useState(new Set())
  const [bugFormOpen, setBugFormOpen] = useState(new Set())
  const [saveStatus, setSaveStatus] = useState('idle')
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [finishLog, setFinishLog] = useState([])
  const [reportedBugs, setReportedBugs] = useState({}) // { caseId: count }
  const [qrModal, setQrModal] = useState(false)
  const [qrSession, setQrSession] = useState(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [elapsed, setElapsed] = useState('00:00:00')
  const dirtyRef = useRef({})
  const debounceRef = useRef(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    getQARun(id).then(data => {
      setRun(data)
      setSuite(data.suite)
      setResults(data.results || {})
      startTimeRef.current = new Date(data.startedAt)
      if (data.suite?.cases) {
        const secs = [...new Set(data.suite.cases.map(c => c.seccion))]
        setOpenSections(new Set(secs))
      }
      // Init reported bugs count from existing bugs
      const bugCounts = {}
      for (const b of (data.bugs || [])) {
        if (b.testCaseId) bugCounts[b.testCaseId] = (bugCounts[b.testCaseId] || 0) + 1
      }
      setReportedBugs(bugCounts)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const interval = setInterval(() => {
      if (!startTimeRef.current) return
      const diff = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000)
      const h = String(Math.floor(diff / 3600)).padStart(2, '0')
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0')
      const s = String(diff % 60).padStart(2, '0')
      setElapsed(`${h}:${m}:${s}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const flushSave = useCallback(async () => {
    const dirty = { ...dirtyRef.current }
    if (Object.keys(dirty).length === 0) return
    dirtyRef.current = {}
    setSaveStatus('saving')
    try {
      const resp = await saveQAResults(id, dirty)
      setRun(prev => prev ? { ...prev, progreso: resp.progreso, results: resp.results } : prev)
      setResults(resp.results)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('idle')
    }
  }, [id])

  const scheduleSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(flushSave, 500)
  }, [flushSave])

  const handleResult = (caseId, resultado) => {
    const current = results[caseId] || {}
    const updated = { ...current, resultado, observaciones: current.observaciones || '' }
    setResults(prev => ({ ...prev, [caseId]: updated }))
    dirtyRef.current[caseId] = updated
    scheduleSave()
  }

  const handleObs = (caseId, observaciones) => {
    const current = results[caseId] || {}
    const updated = { ...current, observaciones }
    setResults(prev => ({ ...prev, [caseId]: updated }))
    dirtyRef.current[caseId] = updated
    scheduleSave()
  }

  const toggleSection = (sec) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(sec) ? next.delete(sec) : next.add(sec)
      return next
    })
  }

  const handleFinish = async () => {
    setFinishing(true)
    setFinishLog([])
    try {
      await flushSave()

      // Re-fetch run to get latest bugs (including any reported during session)
      const freshRun = await getQARun(id)
      const allCases = freshRun.suite?.cases || []
      const existingBugs = freshRun.bugs || []
      const existingBugCaseIds = new Set(existingBugs.map(b => b.testCaseId))

      // Use server's canonical results, not local state
      const serverResults = freshRun.results || {}
      const failedCases = allCases.filter(c => {
        const r = serverResults[c.id]
        if (!r) return false
        const isFailed = r.resultado === 'fail' || r.resultado === 'blocker'
        const alreadyReported = existingBugCaseIds.has(c.id)
        return isFailed && !alreadyReported
      })

      // Auto-create bugs for each failed case
      if (failedCases.length > 0) {
        setFinishLog(prev => [...prev, `Generando ${failedCases.length} bug${failedCases.length > 1 ? 's' : ''} automático${failedCases.length > 1 ? 's' : ''}...`])
        for (const c of failedCases) {
          const r = serverResults[c.id] || {}
          try {
            const bugData = {
              runId: run.id,
              testCaseId: c.id,
              titulo: `[Auto] Fallo en: ${c.titulo}`,
              comportamientoEsperado: c.resultado_esperado,
              comportamientoActual: r.observaciones || 'No se describió el comportamiento actual.',
              pasosReproducir: c.pasos.map((p, i) => `${i + 1}. ${p}`).join('\n'),
              severidad: r.resultado === 'blocker' ? 'blocker' : 'mayor',
              tipoError: 'funcionalidad',
              dondeOcurre: `Sección: ${c.seccion} — Test: ${c.titulo}`,
              queEsperabas: c.resultado_esperado,
              contextoExtra: r.observaciones ? `Observaciones del tester: ${r.observaciones}` : '',
              browserInfo: navigator.userAgent,
            }
            await createQABug(bugData)
            setFinishLog(prev => [...prev, `  BUG creado: ${c.titulo}`])
          } catch (err) {
            setFinishLog(prev => [...prev, `  Error en ${c.titulo}: ${err.message}`])
          }
        }
        setFinishLog(prev => [...prev, 'Bugs generados correctamente.'])
      }

      // Mark run as completed
      await updateQARun(id, { estado: 'completado' })
      setFinishLog(prev => [...prev, 'Run finalizado.'])
      setTimeout(() => navigate('/qa/runs'), 1500)
    } catch (err) {
      setFinishLog(prev => [...prev, `Error: ${err.message}`])
      setFinishing(false)
    }
  }

  const handlePause = async () => {
    await flushSave()
    await updateQARun(id, { estado: 'pausado' })
    navigate('/qa/runs')
  }

  const getMobileOrigin = () => {
    const { protocol, port } = window.location
    // If accessing from localhost, swap to LAN IP so mobile can reach it
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? '192.168.1.125'
      : window.location.hostname
    return `${protocol}//${host}${port ? `:${port}` : ''}`
  }

  const handleOpenMobile = async () => {
    setQrModal(true)
    setQrLoading(true)
    try {
      const session = await createQASession(id)
      setQrSession(session)
      const url = `${getMobileOrigin()}/qa/mobile/${session.token}`
      const dataUrl = await QRCode.toDataURL(url, { width: 256, margin: 2, color: { dark: '#000', light: '#fff' } })
      setQrDataUrl(dataUrl)
    } catch { /* silent */ }
    setQrLoading(false)
  }

  if (loading) return <div className="dv"><QANav active="runs" /><div className="dv-loading"><div className="dv-spinner" />Cargando run...</div></div>
  if (!run || !suite) return <div className="dv"><QANav active="runs" /><div className="dv-loading">Run no encontrado</div></div>

  const cases = suite.cases || []
  const total = cases.length
  const vals = Object.values(results)
  const done = vals.filter(r => r.resultado !== null).length
  const passCount = vals.filter(r => r.resultado === 'pass').length
  const failCount = vals.filter(r => r.resultado === 'fail' || r.resultado === 'blocker').length
  const skipCount = vals.filter(r => r.resultado === 'skip').length
  const progreso = total > 0 ? Math.round((done / total) * 100) : 0
  const passRate = done > 0 ? Math.round((passCount / done) * 100) : 0

  const sections = []
  const sectionMap = new Map()
  for (const c of cases) {
    if (!sectionMap.has(c.seccion)) { sectionMap.set(c.seccion, []); sections.push(c.seccion) }
    sectionMap.get(c.seccion).push(c)
  }

  const resultButtons = [
    { key: 'pass', label: 'Pass', color: '#16a34a' },
    { key: 'fail', label: 'Fail', color: '#dc2626' },
    { key: 'skip', label: 'Skip', color: '#eab308' },
    { key: 'blocker', label: 'Blocker', color: '#7c3aed' },
  ]

  return (
    <div className="dv">
      <QANav active="runs" />

      {/* Hero with run info */}
      <div className="dv-hero" style={{ minHeight: 160 }}>
        <div className="dv-hero-bg" />
        <div className="dv-hero-aurora" />
        <div className="dv-hero-content">
          <div className="dv-hero-info" style={{ textAlign: 'center', width: '100%' }}>
            <div className="dv-hero-eyebrow"><span className="dv-eyebrow-dot" />{run.tester?.nombre} — Run #{run.id}</div>
            <h1 className="dv-hero-title">
              <span className="dv-title-text">{run.suiteName}</span>
            </h1>
            <div className="dv-hero-metrics">
              <div className="dv-metric">
                <div className="dv-metric-icon" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <div className="dv-metric-data">
                  <span className="dv-metric-val" style={{ color: '#16a34a' }}>{passCount}</span>
                  <span className="dv-metric-label">Pass</span>
                </div>
              </div>
              <div className="dv-metric">
                <div className="dv-metric-icon" style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </div>
                <div className="dv-metric-data">
                  <span className="dv-metric-val" style={{ color: failCount > 0 ? '#dc2626' : undefined }}>{failCount}</span>
                  <span className="dv-metric-label">Fail</span>
                </div>
              </div>
              <div className="dv-metric">
                <div className="dv-metric-icon dv-metric-blue">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                </div>
                <div className="dv-metric-data">
                  <span className="dv-metric-val">{done}/{total}</span>
                  <span className="dv-metric-label">Evaluados</span>
                </div>
              </div>
              <div className="dv-metric">
                <div className="dv-metric-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                </div>
                <div className="dv-metric-data">
                  <span className="dv-metric-val">{elapsed}</span>
                  <span className="dv-metric-label">Tiempo</span>
                </div>
              </div>
              <div className="dv-metric">
                <span className={`qa-save-indicator qa-save-indicator--${saveStatus}`}>
                  {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? 'Guardado' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dv-content">
        {/* Action bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="dv-nav-link" onClick={handlePause}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              Pausar
            </button>
            <button className="dv-nav-link" onClick={handleOpenMobile} title="Abrir en móvil">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
              Móvil
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Segmented progress bar: green=pass, red=fail, yellow=skip */}
            <div className="qa-progress-track" style={{ width: 140, alignSelf: 'center', display: 'flex', overflow: 'hidden' }}>
              {passCount > 0 && <div style={{ width: `${(passCount / total) * 100}%`, height: '100%', background: '#16a34a', transition: 'width 300ms' }} />}
              {failCount > 0 && <div style={{ width: `${(failCount / total) * 100}%`, height: '100%', background: '#dc2626', transition: 'width 300ms' }} />}
              {skipCount > 0 && <div style={{ width: `${(skipCount / total) * 100}%`, height: '100%', background: '#eab308', transition: 'width 300ms' }} />}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', minWidth: 30 }}>{progreso}%</span>
            <button className="dv-nav-link dv-nav-active" onClick={() => setShowFinishModal(true)}>
              Finalizar Run
            </button>
          </div>
        </div>

        {/* Test case sections */}
        {sections.map(sec => {
          const secCases = sectionMap.get(sec)
          const secDone = secCases.filter(c => results[c.id]?.resultado !== null && results[c.id]?.resultado !== undefined).length
          const isOpen = openSections.has(sec)
          return (
            <div key={sec} className="dv-section" style={{ marginBottom: 8, padding: 0, overflow: 'hidden' }}>
              <div onClick={() => toggleSection(sec)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}>
                <span style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform 200ms', transform: isOpen ? 'rotate(90deg)' : '' }}><polyline points="9 18 15 12 9 6" /></svg>
                  {sec}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 600 }}>{secDone}/{secCases.length} completados</span>
              </div>
              {isOpen && secCases.map(c => {
                const r = results[c.id] || {}
                const isExpanded = expandedCards.has(c.id)
                const isObsOpen = obsOpen.has(c.id)
                const isBugOpen = bugFormOpen.has(c.id)
                const showBugBtn = r.resultado === 'fail' || r.resultado === 'blocker'

                return (
                  <div key={c.id} className="qa-case-card" style={{ padding: '10px 16px 10px 36px', borderTop: '1px solid rgba(59,130,246,0.06)' }}
                    onTouchStart={e => { e.currentTarget._touchX = e.touches[0].clientX }}
                    onTouchEnd={e => {
                      const dx = e.changedTouches[0].clientX - (e.currentTarget._touchX || 0)
                      if (dx > 80) handleResult(c.id, 'pass')
                      else if (dx < -80) handleResult(c.id, 'fail')
                    }}
                  >
                    {/* Swipe hint for touch */}
                    <div className="qa-swipe-hint">
                      <span className="qa-swipe-hint-pass">← Pass</span>
                      <span className="qa-swipe-hint-fail">Fail →</span>
                    </div>

                    {/* Meta + result buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', fontFamily: 'var(--font-mono)', minWidth: 20 }}>{c.orden}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{c.titulo}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: { critico: '#991b1b', alto: '#c2410c', medio: '#3b82f6', bajo: '#64748b' }[c.prioridad] || '#64748b', padding: '2px 8px', borderRadius: 4, background: `${{ critico: '#991b1b', alto: '#c2410c', medio: '#3b82f6', bajo: '#64748b' }[c.prioridad] || '#64748b'}12` }}>{c.prioridad}</span>
                    </div>

                    {/* Result buttons */}
                    <div className="qa-result-btns" style={{ display: 'flex', gap: 6, marginTop: 8, paddingLeft: 30 }}>
                      {resultButtons.map(btn => (
                        <button
                          key={btn.key}
                          className="qa-result-btn"
                          onClick={() => handleResult(c.id, btn.key)}
                          style={{
                            fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 6, cursor: 'pointer',
                            border: `1.5px solid ${btn.color}`,
                            background: r.resultado === btn.key ? btn.color : 'transparent',
                            color: r.resultado === btn.key ? '#fff' : btn.color,
                            transition: 'all 150ms',
                          }}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    {/* Toggle links */}
                    <div className="qa-toggle-links" style={{ display: 'flex', gap: 12, marginTop: 6, paddingLeft: 30, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="qa-toggle-btn"
                        style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setExpandedCards(prev => { const next = new Set(prev); next.has(c.id) ? next.delete(c.id) : next.add(c.id); return next })}
                      >
                        {isExpanded ? 'Ocultar' : 'Detalles'}
                      </button>
                      <button
                        className="qa-toggle-btn"
                        style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setObsOpen(prev => { const next = new Set(prev); next.has(c.id) ? next.delete(c.id) : next.add(c.id); return next })}
                      >
                        Observaciones
                      </button>
                      {showBugBtn && !isBugOpen && (
                        <button
                          onClick={() => setBugFormOpen(prev => { const next = new Set(prev); next.add(c.id); return next })}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                            background: '#dc2626', color: '#fff', border: 'none',
                            fontSize: 13, fontWeight: 700, boxShadow: '0 2px 8px rgba(220,38,38,0.25)',
                            transition: 'all 150ms', marginLeft: 'auto',
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                          Reportar Bug
                        </button>
                      )}
                      {isBugOpen && (
                        <button
                          onClick={() => setBugFormOpen(prev => { const next = new Set(prev); next.delete(c.id); return next })}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                            background: 'rgba(220,38,38,0.06)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)',
                            fontSize: 11, fontWeight: 600, marginLeft: 'auto',
                          }}
                        >
                          Cerrar reporte
                        </button>
                      )}
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{ paddingLeft: 30, marginTop: 8, fontSize: 12, color: 'var(--text-2)' }}>
                        <p style={{ margin: '0 0 6px', color: 'var(--text-3)' }}>{c.descripcion}</p>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-4)', letterSpacing: '0.04em', marginBottom: 4 }}>Pasos:</div>
                        <ol style={{ paddingLeft: 18, margin: '0 0 6px' }}>
                          {c.pasos.map((p, i) => <li key={i}>{p}</li>)}
                        </ol>
                        <div style={{ fontSize: 12, padding: '6px 10px', background: 'rgba(59,130,246,0.04)', borderRadius: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-4)', letterSpacing: '0.04em' }}>Resultado Esperado: </span>
                          {c.resultado_esperado}
                        </div>
                      </div>
                    )}

                    {/* Observaciones textarea */}
                    {isObsOpen && (
                      <textarea
                        className="qa-obs-textarea"
                        placeholder="Observaciones..."
                        value={r.observaciones || ''}
                        onChange={e => handleObs(c.id, e.target.value)}
                        style={{ marginLeft: 30, marginTop: 8, width: 'calc(100% - 60px)', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border, #e2e8f0)', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', minHeight: 60 }}
                      />
                    )}

                    {/* Collapsed bug strip */}
                    {!isBugOpen && (reportedBugs[c.id] || 0) > 0 && (
                      <div
                        onClick={() => setBugFormOpen(prev => { const next = new Set(prev); next.add(c.id); return next })}
                        style={{
                          marginLeft: 30, marginTop: 8, padding: '8px 14px', borderRadius: 8,
                          background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.12)',
                          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                          transition: 'all 200ms',
                          animation: 'fadeUp 300ms ease-out forwards',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>
                          {reportedBugs[c.id]} bug{reportedBugs[c.id] > 1 ? 's' : ''} reportado{reportedBugs[c.id] > 1 ? 's' : ''}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 'auto' }}>Abrir reporte</span>
                      </div>
                    )}

                    {/* Bug Report Wizard */}
                    {isBugOpen && (
                      <BugReportWizard
                        testCase={c}
                        runId={run.id}
                        onCreated={() => {
                          setBugFormOpen(prev => { const next = new Set(prev); next.delete(c.id); return next })
                          setReportedBugs(prev => ({ ...prev, [c.id]: (prev[c.id] || 0) + 1 }))
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* QR Mobile Modal */}
      {qrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="dv-section" style={{ maxWidth: 380, width: '90%', padding: 24, textAlign: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Continuar en móvil</h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>Escanea el código QR con tu celular para ejecutar los tests desde ahí</p>

            {qrLoading ? (
              <div style={{ padding: 40 }}><div className="dv-spinner" /></div>
            ) : qrSession ? (
              <>
                {/* QR Code - real scannable */}
                <div style={{
                  margin: '0 auto 16px',
                  background: '#fff', borderRadius: 12, padding: 12,
                  border: '2px solid var(--border, #e2e8f0)',
                  display: 'inline-block',
                }}>
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" style={{ width: 200, height: 200, display: 'block' }} />
                  ) : (
                    <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="dv-spinner" />
                    </div>
                  )}
                </div>

                {/* Copyable URL */}
                <div style={{
                  padding: '8px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.04)',
                  border: '1px solid rgba(59,130,246,0.1)', marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <input
                    readOnly
                    value={`${getMobileOrigin()}/qa/mobile/${qrSession.token}`}
                    style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', outline: 'none' }}
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(`${getMobileOrigin()}/qa/mobile/${qrSession.token}`)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 11, fontWeight: 600 }}
                  >Copiar</button>
                </div>

                <div style={{ fontSize: 10, color: 'var(--text-4)', marginBottom: 12 }}>
                  Expira: {new Date(qrSession.expiresAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </>
            ) : (
              <div style={{ padding: 20, color: '#dc2626', fontSize: 12 }}>Error generando sesión</div>
            )}

            <button className="dv-nav-link" onClick={() => { setQrModal(false); setQrSession(null) }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      <footer className="dv-footer">QA Testing Module — labsisModernov1</footer>

      {/* Finish modal */}
      {showFinishModal && (() => {
        // Calculate auto-bug count for display
        const allCases = suite?.cases || []
        const existingBugs = run?.bugs || []
        const existingBugCaseIds = new Set(existingBugs.map(b => b.testCaseId))
        const autoBugCount = allCases.filter(c => {
          const r = results[c.id]
          return r && (r.resultado === 'fail' || r.resultado === 'blocker') && !existingBugCaseIds.has(c.id)
        }).length

        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="dv-section" style={{ maxWidth: 420, width: '90%', padding: 24 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 700 }}>Finalizar Run?</h3>

            {/* Results breakdown */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.15)' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{passCount}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pass</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{failCount}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fail</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#eab308' }}>{skipCount}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skip</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: 8, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#3b82f6' }}>{total - done}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pendiente</div>
              </div>
            </div>

            {/* Segmented bar */}
            <div className="qa-progress-track" style={{ height: 10, marginBottom: 12, display: 'flex', overflow: 'hidden' }}>
              {passCount > 0 && <div style={{ width: `${(passCount / total) * 100}%`, height: '100%', background: '#16a34a' }} />}
              {failCount > 0 && <div style={{ width: `${(failCount / total) * 100}%`, height: '100%', background: '#dc2626' }} />}
              {skipCount > 0 && <div style={{ width: `${(skipCount / total) * 100}%`, height: '100%', background: '#eab308' }} />}
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>
              {done === total
                ? (failCount === 0 ? 'Todos los test cases pasaron.' : `${failCount} test case${failCount > 1 ? 's' : ''} fallaron.`)
                : `Faltan ${total - done} test cases sin evaluar.`}
              {done > 0 && ` Tasa de éxito: ${passRate}%`}
            </p>

            {/* Auto-bug generation notice */}
            {autoBugCount > 0 && !finishing && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
                    Se generarán {autoBugCount} bug{autoBugCount > 1 ? 's' : ''} automáticamente
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    Cada test case fallido/blocker sin bug manual tendrá su reporte con prompt para IA
                  </div>
                </div>
              </div>
            )}

            {/* Finish progress log */}
            {finishing && finishLog.length > 0 && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)', marginBottom: 12, maxHeight: 160, overflowY: 'auto' }}>
                {finishLog.map((msg, i) => (
                  <div key={i} style={{ fontSize: 11, color: msg.startsWith('  Error') ? '#dc2626' : msg.startsWith('  BUG') ? '#16a34a' : 'var(--text-2)', fontFamily: 'var(--font-mono)', padding: '2px 0' }}>
                    {msg}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {!finishing && <button className="dv-nav-link" onClick={() => setShowFinishModal(false)}>Cancelar</button>}
              <button className="dv-nav-link dv-nav-active" onClick={handleFinish} disabled={finishing}>
                {finishing ? 'Finalizando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
        )
      })()}
    </div>
  )
}

