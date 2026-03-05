import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { getQASession, saveQASessionResult, createQASessionBug } from '../services/api'
import VoiceRecorder from '../components/VoiceRecorder'

/* ── Gamification taunts ── */
const QA_TAUNTS = [
  'Aquí te va otro... suerte arreglándolo',
  'Ya lo rompí. De nada.',
  'Este sí está bueno, prepárate',
  'Encontré otro. Soy imparable',
  'QA never sleeps',
  'Con cariño, del equipo QA',
  'Otro más para la colección',
  'Esto se veía fácil... pero no',
]

const ERROR_TYPES = [
  { value: 'error_500', label: '500', color: '#dc2626', icon: '⚠' },
  { value: 'no_carga', label: 'No carga', color: '#f97316', icon: '⏳' },
  { value: 'visual', label: 'UI rota', color: '#8b5cf6', icon: '🎨' },
  { value: 'datos_incorrectos', label: 'Datos', color: '#eab308', icon: '📋' },
  { value: 'funcionalidad', label: 'No func.', color: '#3b82f6', icon: '⚙' },
  { value: 'crash', label: 'Crash', color: '#991b1b', icon: '💥' },
]

const CONFETTI = ['#dc2626', '#3b82f6', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9', '#f97316']

export default function QAMobileRunPage() {
  const { token } = useParams()
  const [session, setSession] = useState(null)
  const [run, setRun] = useState(null)
  const [suite, setSuite] = useState(null)
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bugForm, setBugForm] = useState(null) // caseId being reported
  const [bugData, setBugData] = useState({ tipoError: 'funcionalidad', descripcion: '' })
  const [bugPhotos, setBugPhotos] = useState([]) // File objects for photos
  const [bugSending, setBugSending] = useState(false)
  const [celebration, setCelebration] = useState(null) // 'pass' | 'bug' | 'done'
  const [celebTaunt, setCelebTaunt] = useState('')
  const [allDone, setAllDone] = useState(false)
  const saveRef = useRef(null)
  const cardRefs = useRef({})

  useEffect(() => {
    getQASession(token)
      .then(data => {
        setSession(data.session)
        setRun(data.run)
        setSuite(data.run.suite)
        setResults(data.run.results || {})
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [token])

  // Check completion — must be before any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (!suite) return
    const cases = suite.cases || []
    const total = cases.length
    const done = Object.values(results).filter(r => r.resultado !== null).length
    const completed = done === total && total > 0
    if (completed && !allDone) {
      setAllDone(true)
      setCelebTaunt(QA_TAUNTS[Math.floor(Math.random() * QA_TAUNTS.length)])
      setCelebration('done')
    }
  }, [results, suite])

  const saveResult = async (caseId, resultado) => {
    const current = results[caseId] || {}
    const updated = { ...current, resultado, observaciones: current.observaciones || '' }
    setResults(prev => ({ ...prev, [caseId]: updated }))

    // Debounced save
    clearTimeout(saveRef.current)
    saveRef.current = setTimeout(async () => {
      try {
        const resp = await saveQASessionResult(token, { [caseId]: updated })
        setResults(resp.results)
        setRun(prev => prev ? { ...prev, progreso: resp.progreso } : prev)
      } catch { /* silent */ }
    }, 300)
  }

  const handlePass = (caseId) => {
    saveResult(caseId, 'pass')
    // Mini celebration
    setCelebration('pass')
    setTimeout(() => setCelebration(null), 600)
    // Auto-scroll to next unanswered
    setTimeout(() => scrollToNext(caseId), 400)
  }

  const handleFail = (caseId) => {
    saveResult(caseId, 'fail')
    setBugForm(caseId)
    setBugData({ tipoError: 'funcionalidad', descripcion: '' })
    setBugPhotos([])
  }

  const handleSkip = (caseId) => {
    saveResult(caseId, 'skip')
    setTimeout(() => scrollToNext(caseId), 300)
  }

  const scrollToNext = (currentId) => {
    const cases = suite?.cases || []
    const idx = cases.findIndex(c => c.id === currentId)
    for (let i = idx + 1; i < cases.length; i++) {
      const r = results[cases[i].id]
      if (!r || r.resultado === null) {
        cardRefs.current[cases[i].id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
    }
  }

  const handleSubmitBug = async () => {
    if (!bugForm) return
    setBugSending(true)
    const tc = suite?.cases?.find(c => c.id === bugForm)
    try {
      const bug = await createQASessionBug(token, {
        testCaseId: bugForm,
        titulo: `Fallo en: ${tc?.titulo || bugForm}`,
        comportamientoActual: bugData.descripcion,
        comportamientoEsperado: tc?.resultado_esperado || '',
        pasosReproducir: tc?.pasos?.map((p, i) => `${i + 1}. ${p}`).join('\n') || '',
        tipoError: bugData.tipoError,
        severidad: 'mayor',
        browserInfo: navigator.userAgent,
        dondeOcurre: `Sección: ${tc?.seccion} — ${tc?.titulo}`,
      })

      // Upload photos if any
      if (bugPhotos.length > 0 && bug?.id) {
        const formData = new FormData()
        formData.append('bugId', bug.id)
        bugPhotos.forEach(f => formData.append('screenshots', f))
        try {
          await fetch(`/api/qa/sessions/${token}/screenshots`, { method: 'POST', body: formData })
        } catch { /* silent */ }
      }

      const caseId = bugForm
      setBugForm(null)
      setBugPhotos([])
      setCelebTaunt(QA_TAUNTS[Math.floor(Math.random() * QA_TAUNTS.length)])
      setCelebration('bug')
      setTimeout(() => setCelebration(null), 1200)
      setTimeout(() => scrollToNext(caseId), 800)
    } catch { /* silent */ }
    setBugSending(false)
  }

  const handlePhotoCapture = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) setBugPhotos(prev => [...prev, ...files].slice(0, 5))
    e.target.value = '' // Reset so same file can be re-selected
  }

  const removePhoto = (idx) => {
    setBugPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  // Memoize object URLs to avoid memory leaks — revoke old ones when photos change
  const photoUrls = useMemo(() => {
    const urls = bugPhotos.map(f => URL.createObjectURL(f))
    return urls
  }, [bugPhotos])
  useEffect(() => {
    return () => photoUrls.forEach(url => URL.revokeObjectURL(url))
  }, [photoUrls])

  if (loading) return (
    <div style={styles.container}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
        <div className="dv-spinner" style={{ width: 32, height: 32 }} />
        <span style={{ fontSize: 14, color: '#64748b' }}>Conectando...</span>
      </div>
    </div>
  )

  if (error) return (
    <div style={styles.container}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>😵</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>Sesión inválida</div>
        <div style={{ fontSize: 14, color: '#64748b' }}>{error}</div>
      </div>
    </div>
  )

  const cases = suite?.cases || []
  const total = cases.length
  const done = Object.values(results).filter(r => r.resultado !== null).length
  const progreso = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div style={styles.container}>
      {/* Mobile header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Progress donut */}
          <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
            <circle cx="22" cy="22" r="18" fill="none" stroke="#e2e8f0" strokeWidth="4" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="#3b82f6" strokeWidth="4"
              strokeDasharray={`${progreso * 1.13} 113`}
              strokeLinecap="round" transform="rotate(-90 22 22)"
              style={{ transition: 'stroke-dasharray 500ms ease' }}
            />
            <text x="22" y="24" textAnchor="middle" fontSize="10" fontWeight="800" fill="#3b82f6">{progreso}%</text>
          </svg>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{run?.suiteName}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{session?.userName}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>{done}/{total}</div>
      </div>

      {/* Test case cards */}
      <div style={styles.cardList}>
        {cases.map(c => {
          const r = results[c.id] || {}
          const isBugOpen = bugForm === c.id
          const resultColor = r.resultado === 'pass' ? 'rgba(22,163,74,0.06)' : r.resultado === 'fail' ? 'rgba(220,38,38,0.06)' : r.resultado === 'skip' ? 'rgba(234,179,8,0.06)' : 'transparent'
          const borderColor = r.resultado === 'pass' ? 'rgba(22,163,74,0.2)' : r.resultado === 'fail' ? 'rgba(220,38,38,0.2)' : r.resultado === 'skip' ? 'rgba(234,179,8,0.2)' : '#e2e8f0'

          return (
            <div
              key={c.id}
              ref={el => { cardRefs.current[c.id] = el }}
              style={{
                ...styles.card,
                background: resultColor,
                borderColor,
                transition: 'all 300ms ease',
              }}
            >
              {/* Title + priority */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{c.titulo}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{c.seccion}</div>
                </div>
                {r.resultado && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    textTransform: 'uppercase',
                    background: r.resultado === 'pass' ? 'rgba(22,163,74,0.1)' : r.resultado === 'fail' ? 'rgba(220,38,38,0.1)' : 'rgba(234,179,8,0.1)',
                    color: r.resultado === 'pass' ? '#16a34a' : r.resultado === 'fail' ? '#dc2626' : '#eab308',
                  }}>{r.resultado}</span>
                )}
              </div>

              {/* 3 big action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handlePass(c.id)} style={{
                  ...styles.actionBtn,
                  background: r.resultado === 'pass' ? '#16a34a' : 'rgba(22,163,74,0.06)',
                  color: r.resultado === 'pass' ? '#fff' : '#16a34a',
                  border: `2px solid ${r.resultado === 'pass' ? '#16a34a' : 'rgba(22,163,74,0.2)'}`,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  Pasa
                </button>
                <button onClick={() => handleFail(c.id)} style={{
                  ...styles.actionBtn,
                  background: r.resultado === 'fail' ? '#dc2626' : 'rgba(220,38,38,0.06)',
                  color: r.resultado === 'fail' ? '#fff' : '#dc2626',
                  border: `2px solid ${r.resultado === 'fail' ? '#dc2626' : 'rgba(220,38,38,0.2)'}`,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  Falla
                </button>
                <button onClick={() => handleSkip(c.id)} style={{
                  ...styles.actionBtn,
                  background: r.resultado === 'skip' ? '#eab308' : 'rgba(234,179,8,0.06)',
                  color: r.resultado === 'skip' ? '#fff' : '#eab308',
                  border: `2px solid ${r.resultado === 'skip' ? '#eab308' : 'rgba(234,179,8,0.2)'}`,
                  flex: 0.7,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
                  Skip
                </button>
              </div>

              {/* Inline bug form */}
              {isBugOpen && (
                <div style={{
                  marginTop: 10, padding: 14, borderRadius: 10,
                  background: 'rgba(220,38,38,0.03)', border: '1px solid rgba(220,38,38,0.1)',
                  animation: 'fadeUp 200ms ease-out forwards',
                }}>
                  {/* Error type pills */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {ERROR_TYPES.map(et => (
                      <button key={et.value} onClick={() => setBugData(d => ({ ...d, tipoError: et.value }))} style={{
                        padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                        fontSize: 12, fontWeight: 700, minHeight: 40,
                        border: bugData.tipoError === et.value ? `2px solid ${et.color}` : '2px solid #e2e8f0',
                        background: bugData.tipoError === et.value ? `${et.color}0c` : 'transparent',
                        color: bugData.tipoError === et.value ? et.color : '#64748b',
                        transition: 'all 150ms',
                      }}>
                        {et.icon} {et.label}
                      </button>
                    ))}
                  </div>

                  {/* Description */}
                  <textarea
                    value={bugData.descripcion}
                    onChange={e => setBugData(d => ({ ...d, descripcion: e.target.value }))}
                    placeholder="Describe el problema..."
                    autoFocus
                    style={{
                      width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0',
                      fontSize: 14, fontFamily: 'inherit', minHeight: 60, resize: 'vertical',
                      boxSizing: 'border-box', marginBottom: 8,
                    }}
                  />

                  {/* Attachments: Voice + Photo */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <VoiceRecorder
                      apiBase="/api"
                      onTranscription={(text) => {
                        setBugData(d => ({ ...d, descripcion: d.descripcion ? `${d.descripcion}\n${text}` : text }))
                      }}
                    />

                    {/* Camera button */}
                    <label style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      padding: '10px 10px', borderRadius: 10, cursor: 'pointer',
                      minHeight: 56, minWidth: 64,
                      background: '#f8fafc', border: '2px solid #e2e8f0', color: '#64748b',
                      transition: 'all 200ms',
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <span style={{ fontSize: 10, fontWeight: 600 }}>Foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoCapture}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {/* Gallery button */}
                    <label style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      padding: '10px 10px', borderRadius: 10, cursor: 'pointer',
                      minHeight: 56, minWidth: 64,
                      background: '#f8fafc', border: '2px solid #e2e8f0', color: '#64748b',
                      transition: 'all 200ms',
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span style={{ fontSize: 10, fontWeight: 600 }}>Galería</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoCapture}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  {/* Photo previews */}
                  {bugPhotos.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      {bugPhotos.map((file, idx) => (
                        <div key={idx} style={{ position: 'relative', width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                          <img
                            src={photoUrls[idx]}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <button onClick={() => removePhoto(idx)} style={{
                            position: 'absolute', top: 2, right: 2,
                            width: 20, height: 20, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.6)', color: '#fff',
                            border: 'none', cursor: 'pointer', fontSize: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            lineHeight: 1,
                          }}>x</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit bug */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => setBugForm(null)} style={{
                      flex: 1, padding: '12px', borderRadius: 8, cursor: 'pointer',
                      border: '1px solid #e2e8f0', background: 'transparent',
                      fontSize: 13, fontWeight: 600, color: '#64748b', minHeight: 48,
                    }}>Cancelar</button>
                    <button onClick={handleSubmitBug} disabled={bugSending} style={{
                      flex: 2, padding: '12px', borderRadius: 8, cursor: 'pointer',
                      border: 'none', background: '#dc2626', color: '#fff',
                      fontSize: 14, fontWeight: 800, minHeight: 48,
                      boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
                    }}>
                      {bugSending ? 'Enviando...' : 'Reportar Bug'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Fixed footer progress */}
      <div style={styles.footer}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#e2e8f0', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: progreso < 30 ? '#eab308' : progreso < 70 ? '#3b82f6' : '#16a34a',
            width: `${progreso}%`, transition: 'width 500ms ease',
          }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', minWidth: 80, textAlign: 'right' }}>
          {done} de {total}
        </span>
      </div>

      {/* Micro celebrations */}
      {celebration === 'pass' && (
        <div style={styles.microCeleb}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" style={{ animation: 'wizardBounceIn 300ms ease forwards' }}><polyline points="20 6 9 17 4 12" /></svg>
        </div>
      )}

      {/* Bug reported celebration */}
      {celebration === 'bug' && (
        <div style={styles.celebOverlay}>
          {CONFETTI.map((c, i) => (
            <div key={i} style={{
              position: 'absolute', width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0,
              animation: `wizardConfettiPop 600ms ease ${i * 50}ms forwards`,
              top: `calc(50% + ${Math.sin(i * 45 * Math.PI / 180) * 60}px)`,
              left: `calc(50% + ${Math.cos(i * 45 * Math.PI / 180) * 60}px)`,
            }} />
          ))}
          <div style={{ animation: 'wizardBounceIn 400ms ease forwards', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🐛</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>Bug reportado!</div>
            <div style={{ fontSize: 13, fontStyle: 'italic', color: '#64748b', marginTop: 4 }}>"{celebTaunt}"</div>
          </div>
        </div>
      )}

      {/* All done celebration */}
      {celebration === 'done' && (
        <div style={styles.celebOverlay}>
          {CONFETTI.map((c, i) => (
            <div key={i} style={{
              position: 'absolute', width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0,
              animation: `wizardConfettiPop 800ms ease ${i * 60}ms forwards`,
              top: `calc(40% + ${Math.sin(i * 45 * Math.PI / 180) * 90}px)`,
              left: `calc(50% + ${Math.cos(i * 45 * Math.PI / 180) * 90}px)`,
            }} />
          ))}
          <div style={{ animation: 'wizardBounceIn 500ms ease forwards', textAlign: 'center', zIndex: 2 }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>Completado!</div>
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Todos los tests evaluados</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontStyle: 'italic', color: '#3b82f6', marginTop: 8 }}>"{celebTaunt}"</div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: 64,
  },
  header: {
    position: 'sticky', top: 0, zIndex: 100,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #e2e8f0',
  },
  cardList: {
    padding: '12px 12px 80px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  card: {
    padding: '14px 16px', borderRadius: 14,
    background: '#fff',
    border: '2px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  actionBtn: {
    flex: 1, padding: '14px 8px', borderRadius: 10, cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    fontSize: 12, fontWeight: 700, minHeight: 56,
    transition: 'all 200ms cubic-bezier(0.34,1.56,0.64,1)',
  },
  footer: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
    borderTop: '1px solid #e2e8f0',
  },
  microCeleb: {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    zIndex: 9999, pointerEvents: 'none',
  },
  celebOverlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(255,255,255,0.95)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column',
  },
}
