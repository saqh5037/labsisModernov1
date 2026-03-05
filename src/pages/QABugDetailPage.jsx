import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getQABug, updateQABug, getQAUsers, getQABugPrompt, addQABugComment } from '../services/api'
import { useSSE } from '../hooks/useSSE'
import QANav from '../components/QANav'

/* ── Constants ── */
const TIPO_ERROR = {
  error_500:          { label: 'Error 500',          color: '#dc2626', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
  no_carga:           { label: 'No carga',           color: '#f97316', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  visual:             { label: 'UI rota',            color: '#8b5cf6', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> },
  datos_incorrectos:  { label: 'Datos incorrectos',  color: '#eab308', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg> },
  funcionalidad:      { label: 'No funciona',        color: '#3b82f6', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> },
  crash:              { label: 'Crash',              color: '#991b1b', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  error_400:          { label: 'Error 400',          color: '#f97316', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
  error_red:          { label: 'Error de red',       color: '#64748b', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/></svg> },
  validacion:         { label: 'Validación falla',   color: '#0ea5e9', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  permisos:           { label: 'Permisos',           color: '#dc2626', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  otro:               { label: 'Otro',               color: '#64748b', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
}

const ZONE_ICONS = {
  header:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>,
  sidebar:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  filtros:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  tabla:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  formulario: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="12" y2="16"/></svg>,
  modal:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="8" x2="22" y2="8"/></svg>,
  boton:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="8" width="16" height="8" rx="4"/></svg>,
  card:       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  footer:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="15" x2="21" y2="15"/></svg>,
}

const SEV_COLORS = { blocker: '#7c3aed', critico: '#dc2626', mayor: '#f97316', menor: '#64748b' }
const ESTADO_COLORS = { abierto: '#dc2626', en_progreso: '#f59e0b', resuelto: '#16a34a', cerrado: '#64748b', no_reproducible: '#94a3b8' }

export default function QABugDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bug, setBug] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null)
  const [promptStatus, setPromptStatus] = useState('idle')
  const [updateFeedback, setUpdateFeedback] = useState(null) // { field, status }
  const [commentText, setCommentText] = useState('')
  const [commentSending, setCommentSending] = useState(false)
  const commentsEndRef = useRef(null)

  // SSE: listen for new comments on this bug
  const handleSSEComment = useCallback((data) => {
    if (String(data.bugId) === String(id)) {
      setBug(prev => prev ? { ...prev, comments: [...(prev.comments || []), data] } : prev)
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [id])
  useSSE({ onComment: handleSSEComment })

  useEffect(() => {
    Promise.all([getQABug(id), getQAUsers().catch(() => [])])
      .then(([b, u]) => { setBug(b); setUsers(u); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const handleUpdate = async (field, value) => {
    setUpdateFeedback({ field, status: 'saving' })
    try {
      const updated = await updateQABug(id, { [field]: value })
      setBug(updated)
      setUpdateFeedback({ field, status: 'saved' })
      setTimeout(() => setUpdateFeedback(null), 1500)
    } catch (err) {
      setUpdateFeedback({ field, status: 'error' })
      setTimeout(() => setUpdateFeedback(null), 2000)
    }
  }

  const handleCopyPrompt = async () => {
    setPromptStatus('loading')
    try {
      const { prompt } = await getQABugPrompt(id)
      await navigator.clipboard.writeText(prompt)
      setPromptStatus('copied')
      setTimeout(() => setPromptStatus('idle'), 3000)
    } catch (err) {
      alert('Error: ' + err.message)
      setPromptStatus('idle')
    }
  }

  const handleDownloadPrompt = async () => {
    setPromptStatus('loading')
    try {
      const { prompt } = await getQABugPrompt(id)
      const blob = new Blob([prompt], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `BUG-${String(bug.id).padStart(3, '0')}-prompt.md`
      a.click()
      URL.revokeObjectURL(url)
      setPromptStatus('downloaded')
      setTimeout(() => setPromptStatus('idle'), 3000)
    } catch (err) {
      alert('Error: ' + err.message)
      setPromptStatus('idle')
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim() || commentSending) return
    setCommentSending(true)
    try {
      const comment = await addQABugComment(id, commentText.trim())
      setBug(prev => prev ? { ...prev, comments: [...(prev.comments || []), comment] } : prev)
      setCommentText('')
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch { /* silent */ }
    setCommentSending(false)
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  if (loading) return <div className="dv"><QANav active="bugs" /><div className="dv-loading"><div className="dv-spinner" />Cargando bug...</div></div>
  if (!bug) return <div className="dv"><QANav active="bugs" /><div className="dv-loading">Bug no encontrado</div></div>

  const tipoInfo = TIPO_ERROR[bug.tipoError] || { label: bug.tipoError, color: '#64748b', icon: null }
  const sevColor = SEV_COLORS[bug.severidad] || '#64748b'
  const estadoColor = ESTADO_COLORS[bug.estado] || '#64748b'
  const isAuto = bug.titulo?.startsWith('[Auto]')

  const SaveIndicator = ({ field }) => {
    if (!updateFeedback || updateFeedback.field !== field) return null
    const s = updateFeedback.status
    return (
      <span style={{
        fontSize: 10, fontWeight: 600, marginLeft: 8,
        color: s === 'saved' ? '#16a34a' : s === 'error' ? '#dc2626' : '#3b82f6',
        animation: 'fadeUp 200ms ease forwards',
      }}>
        {s === 'saving' ? 'Guardando...' : s === 'saved' ? 'Guardado!' : 'Error'}
      </span>
    )
  }

  /* ── Section card helper ── */
  const InfoCard = ({ icon, iconColor, label, children, delay = 0 }) => (
    <div className="anim" style={{
      padding: '16px 18px', borderRadius: 12,
      background: 'var(--surface, #fff)', border: '1px solid var(--border, #e2e8f0)',
      boxShadow: '0 2px 8px rgba(30,58,95,0.04)',
      animationDelay: `${delay}ms`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {icon && (
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${iconColor || '#3b82f6'}10`, color: iconColor || '#3b82f6',
          }}>{icon}</div>
        )}
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-4, #94a3b8)' }}>{label}</span>
      </div>
      {children}
    </div>
  )

  return (
    <div className="dv">
      <QANav active="bugs" />

      {/* ── Hero ── */}
      <div className="dv-hero" style={{ minHeight: 160 }}>
        <div className="dv-hero-bg" />
        <div className="dv-hero-aurora" />
        <div className="dv-hero-content">
          <div className="dv-hero-info" style={{ textAlign: 'center', width: '100%' }}>
            {/* Bug ID + badges */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-4)' }}>
                BUG-{String(bug.id).padStart(3, '0')}
              </span>
              {isAuto && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Auto</span>
              )}
              {/* Tipo badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                background: `${tipoInfo.color}12`, color: tipoInfo.color,
                border: `1px solid ${tipoInfo.color}25`,
              }}>
                {tipoInfo.icon}
                {tipoInfo.label}
              </span>
              {/* Severity badge */}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                background: `${sevColor}12`, color: sevColor,
                border: `1px solid ${sevColor}25`,
              }}>
                {bug.severidad}
              </span>
              {/* Status badge */}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                background: `${estadoColor}12`, color: estadoColor,
                border: `1px solid ${estadoColor}25`,
                textTransform: 'capitalize',
              }}>
                {bug.estado?.replace('_', ' ')}
              </span>
            </div>

            <h1 className="dv-hero-title">
              <span className="dv-title-text" style={{ fontSize: 22 }}>{bug.titulo}</span>
            </h1>

            {/* Reporter + date in hero */}
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 4 }}>
              {bug.reportadoPor?.nombre} — {fmtDate(bug.createdAt)}
            </div>
          </div>
        </div>
      </div>

      <div className="dv-content">
        {/* ── Action bar ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <button className="dv-nav-link" onClick={() => navigate('/qa/bugs')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Volver a Bugs
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCopyPrompt}
              disabled={promptStatus === 'loading'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                border: 'none', fontSize: 12, fontWeight: 700,
                background: promptStatus === 'copied' ? '#16a34a' : '#8b5cf6',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(139,92,246,0.25)',
                transition: 'all 200ms cubic-bezier(0.34,1.56,0.64,1)',
                transform: promptStatus === 'copied' ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {promptStatus === 'copied' ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Copiado!</>
              ) : promptStatus === 'loading' ? (
                <><div className="dv-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> Generando...</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar Prompt IA</>
              )}
            </button>
            <button
              onClick={handleDownloadPrompt}
              disabled={promptStatus === 'loading'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
                border: '1.5px solid var(--border, #e2e8f0)', fontSize: 12, fontWeight: 600,
                background: promptStatus === 'downloaded' ? 'rgba(22,163,74,0.06)' : 'transparent',
                color: promptStatus === 'downloaded' ? '#16a34a' : 'var(--text-3)',
                transition: 'all 200ms',
              }}
            >
              {promptStatus === 'downloaded' ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Descargado!</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> .md</>
              )}
            </button>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

          {/* ── Left: Bug details ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Quick facts row */}
            <div className="anim" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {/* Tipo */}
              {bug.tipoError && (
                <div style={{
                  flex: 1, minWidth: 140, padding: '14px 16px', borderRadius: 12,
                  background: `${tipoInfo.color}08`, border: `1.5px solid ${tipoInfo.color}20`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${tipoInfo.color}15`, color: tipoInfo.color,
                  }}>{tipoInfo.icon}</div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-4)' }}>Tipo de Error</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: tipoInfo.color }}>{tipoInfo.label}</div>
                  </div>
                </div>
              )}

              {/* Zona */}
              {bug.zonaPantalla && (
                <div style={{
                  flex: 1, minWidth: 140, padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(59,130,246,0.04)', border: '1.5px solid rgba(59,130,246,0.15)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                  }}>{ZONE_ICONS[bug.zonaPantalla] || ZONE_ICONS.formulario}</div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-4)' }}>Zona</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6', textTransform: 'capitalize' }}>{bug.zonaPantalla}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Brand tokens */}
            {bug.brandTokens?.length > 0 && (
              <InfoCard
                label="Tokens del Design System"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>}
                iconColor="#8b5cf6"
                delay={40}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {bug.brandTokens.map(t => (
                    <span key={t.code} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: 'rgba(139,92,246,0.06)', color: '#8b5cf6',
                      border: '1px solid rgba(139,92,246,0.15)',
                      borderRadius: 8, padding: '6px 12px',
                      fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono, monospace)',
                    }}>
                      {t.color && <span style={{ width: 14, height: 14, borderRadius: 4, background: t.color, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />}
                      <span>{t.code}</span>
                      {t.name && <span style={{ color: 'var(--text-3)', fontFamily: 'inherit', fontWeight: 500 }}>— {t.name}</span>}
                    </span>
                  ))}
                </div>
              </InfoCard>
            )}

            {/* Dónde ocurre */}
            {bug.dondeOcurre && (
              <InfoCard
                label="Dónde Ocurre"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
                iconColor="#f97316"
                delay={60}
              >
                <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{bug.dondeOcurre}</p>
              </InfoCard>
            )}

            {/* Error code */}
            {bug.codigoError && (
              <InfoCard
                label="Código / Mensaje de Error"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>}
                iconColor="#dc2626"
                delay={80}
              >
                <pre style={{
                  fontSize: 12, background: '#1e293b', color: '#e2e8f0',
                  padding: 14, borderRadius: 8, overflow: 'auto', whiteSpace: 'pre-wrap', margin: 0,
                  fontFamily: 'var(--font-mono, monospace)', lineHeight: 1.5,
                  border: '1px solid rgba(30,41,59,0.8)',
                }}>{bug.codigoError}</pre>
              </InfoCard>
            )}

            {/* Qué pasó vs qué se esperaba — side by side if both exist */}
            {(bug.comportamientoActual || bug.queEsperabas) && (
              <div className="anim" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', animationDelay: '100ms' }}>
                {bug.comportamientoActual && (
                  <div style={{
                    flex: 1, minWidth: 200, padding: '16px 18px', borderRadius: 12,
                    background: 'rgba(220,38,38,0.03)', border: '1.5px solid rgba(220,38,38,0.12)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#dc2626' }}>Qué pasó</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{bug.comportamientoActual}</p>
                  </div>
                )}
                {bug.queEsperabas && (
                  <div style={{
                    flex: 1, minWidth: 200, padding: '16px 18px', borderRadius: 12,
                    background: 'rgba(22,163,74,0.03)', border: '1.5px solid rgba(22,163,74,0.12)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#16a34a' }}>Qué se esperaba</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{bug.queEsperabas}</p>
                  </div>
                )}
              </div>
            )}

            {/* Resultado esperado del test case */}
            {bug.comportamientoEsperado && (
              <InfoCard
                label="Resultado Esperado (Test Case)"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
                iconColor="#16a34a"
                delay={120}
              >
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{bug.comportamientoEsperado}</p>
              </InfoCard>
            )}

            {/* Pasos para reproducir */}
            {bug.pasosReproducir && (
              <InfoCard
                label="Pasos para Reproducir"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>}
                iconColor="#3b82f6"
                delay={140}
              >
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{bug.pasosReproducir}</div>
              </InfoCard>
            )}

            {/* Contexto extra */}
            {bug.contextoExtra && (
              <InfoCard label="Contexto Extra" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>} iconColor="#64748b" delay={160}>
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{bug.contextoExtra}</p>
              </InfoCard>
            )}

            {/* Logs */}
            {bug.logs && (
              <InfoCard label="Logs / Console" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>} iconColor="#64748b" delay={180}>
                <pre style={{
                  fontSize: 11, background: '#1e293b', color: '#e2e8f0',
                  padding: 14, borderRadius: 8, overflow: 'auto', whiteSpace: 'pre-wrap', margin: 0,
                  fontFamily: 'var(--font-mono, monospace)', lineHeight: 1.5,
                  maxHeight: 200,
                }}>{bug.logs}</pre>
              </InfoCard>
            )}

            {/* Screenshots */}
            {bug.screenshots?.length > 0 && (
              <InfoCard
                label={`Screenshots (${bug.screenshots.length})`}
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
                iconColor="#0ea5e9"
                delay={200}
              >
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {bug.screenshots.map((s, i) => (
                    <img
                      key={i}
                      src={`/api/qa/screenshots/${s}`}
                      style={{
                        width: 140, height: 90, objectFit: 'cover', borderRadius: 8,
                        cursor: 'pointer', border: '2px solid transparent',
                        transition: 'all 200ms cubic-bezier(0.34,1.56,0.64,1)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      }}
                      alt={`screenshot-${i}`}
                      onClick={() => setLightbox(s)}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = '#3b82f6' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'transparent' }}
                    />
                  ))}
                </div>
              </InfoCard>
            )}

            {/* ── Comments Thread ── */}
            <InfoCard
              label={`Comentarios (${bug.comments?.length || 0})`}
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
              iconColor="#3b82f6"
              delay={220}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(!bug.comments || bug.comments.length === 0) && (
                  <p style={{ fontSize: 12, color: 'var(--text-4)', margin: 0, fontStyle: 'italic' }}>Sin comentarios aún</p>
                )}
                {bug.comments?.map(c => {
                  const initials = (c.userName || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
                  return (
                    <div key={c.id} style={{
                      display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10,
                      background: 'rgba(59,130,246,0.03)', border: '1px solid rgba(59,130,246,0.08)',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800,
                      }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{c.userName}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{fmtDate(c.createdAt)}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.text}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={commentsEndRef} />

                {/* New comment input */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
                    placeholder="Escribe un comentario..."
                    rows={2}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 10, resize: 'vertical',
                      border: '1.5px solid var(--border, #e2e8f0)', fontSize: 13,
                      background: 'var(--surface, #fff)', fontFamily: 'inherit',
                      minHeight: 42, maxHeight: 120,
                    }}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || commentSending}
                    style={{
                      padding: '10px 16px', borderRadius: 10, cursor: commentText.trim() ? 'pointer' : 'default',
                      border: 'none', background: commentText.trim() ? '#3b82f6' : 'var(--border, #e2e8f0)',
                      color: commentText.trim() ? '#fff' : 'var(--text-4)',
                      fontSize: 12, fontWeight: 700, alignSelf: 'flex-end',
                      transition: 'all 200ms',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {commentSending ? (
                      <div className="dv-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </InfoCard>
          </div>

          {/* ── Right sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 16 }}>

            {/* Info card */}
            <div className="anim" style={{
              padding: '16px 18px', borderRadius: 12,
              background: 'var(--surface, #fff)', border: '1px solid var(--border, #e2e8f0)',
              boxShadow: '0 2px 8px rgba(30,58,95,0.04)',
              animationDelay: '40ms',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-4)', marginBottom: 10 }}>Info</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <InfoRow label="Reportado por" value={bug.reportadoPor?.nombre} />
                <InfoRow label="Creado" value={fmtDate(bug.createdAt)} />
                <InfoRow label="Actualizado" value={fmtDate(bug.updatedAt)} />
                {bug.browserInfo && <InfoRow label="Browser" value={bug.browserInfo.substring(0, 50) + '...'} small />}
                {bug.testCaseId && <InfoRow label="Test Case" value={bug.testCaseId} mono />}
                {bug.runId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-4)', fontWeight: 600 }}>Run</span>
                    <span
                      style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                      onClick={() => navigate(`/qa/runs/${bug.runId}`)}
                    >Run #{bug.runId}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Estado */}
            <ActionCard label="Estado" delay={80} feedback={<SaveIndicator field="estado" />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {['abierto', 'en_progreso', 'resuelto', 'cerrado', 'no_reproducible'].map(e => {
                  const sel = bug.estado === e
                  const c = ESTADO_COLORS[e]
                  return (
                    <button key={e} onClick={() => !sel && handleUpdate('estado', e)} style={{
                      padding: '8px 12px', borderRadius: 8, cursor: sel ? 'default' : 'pointer',
                      border: sel ? `1.5px solid ${c}` : '1.5px solid transparent',
                      background: sel ? `${c}0c` : 'transparent',
                      color: sel ? c : 'var(--text-3, #64748b)',
                      fontSize: 12, fontWeight: sel ? 700 : 500, textAlign: 'left',
                      textTransform: 'capitalize',
                      transition: 'all 150ms cubic-bezier(0.34,1.56,0.64,1)',
                      transform: sel ? 'scale(1.01)' : 'scale(1)',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: sel ? c : 'var(--border, #e2e8f0)',
                        transition: 'background 150ms',
                      }} />
                      {e.replace('_', ' ')}
                    </button>
                  )
                })}
              </div>
            </ActionCard>

            {/* Severidad */}
            <ActionCard label="Severidad" delay={120} feedback={<SaveIndicator field="severidad" />}>
              <div style={{ display: 'flex', gap: 6 }}>
                {SEVERITIES_LIST.map(s => {
                  const sel = bug.severidad === s.v
                  return (
                    <button key={s.v} onClick={() => !sel && handleUpdate('severidad', s.v)} style={{
                      flex: 1, padding: '8px 4px', borderRadius: 8, cursor: sel ? 'default' : 'pointer',
                      border: sel ? `2px solid ${s.c}` : '2px solid var(--border, #e2e8f0)',
                      background: sel ? `${s.c}0c` : 'transparent',
                      color: sel ? s.c : 'var(--text-3)',
                      fontSize: 11, fontWeight: 700, textAlign: 'center',
                      transition: 'all 150ms cubic-bezier(0.34,1.56,0.64,1)',
                      transform: sel ? 'scale(1.03)' : 'scale(1)',
                    }}>{s.l}</button>
                  )
                })}
              </div>
            </ActionCard>

            {/* Asignar */}
            <ActionCard label="Asignar a" delay={160} feedback={<SaveIndicator field="asignadoA" />}>
              <select
                value={bug.asignadoA?.id || ''}
                onChange={e => {
                  const u = users.find(u => u.id === parseInt(e.target.value))
                  handleUpdate('asignadoA', u ? { id: u.id, nombre: `${u.nombre} ${u.apellido}` } : null)
                }}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1.5px solid var(--border, #e2e8f0)', fontSize: 13,
                  background: 'var(--surface, #fff)', cursor: 'pointer',
                }}
              >
                <option value="">Sin asignar</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}
              </select>
            </ActionCard>

            {/* AI Prompt card */}
            <div className="anim" style={{
              padding: '16px 18px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(139,92,246,0.05), rgba(59,130,246,0.05))',
              border: '1.5px solid rgba(139,92,246,0.15)',
              boxShadow: '0 2px 12px rgba(139,92,246,0.06)',
              animationDelay: '200ms',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8b5cf6' }}>Prompt IA</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 10px', lineHeight: 1.5 }}>
                Genera un prompt con todo el contexto para que la IA te ayude a resolver este bug.
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={handleCopyPrompt} disabled={promptStatus === 'loading'} style={{
                  flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                  border: 'none', fontSize: 11, fontWeight: 700,
                  background: '#8b5cf6', color: '#fff',
                  transition: 'all 150ms',
                }}>
                  {promptStatus === 'copied' ? 'Copiado!' : 'Copiar'}
                </button>
                <button onClick={handleDownloadPrompt} disabled={promptStatus === 'loading'} style={{
                  flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                  border: '1.5px solid rgba(139,92,246,0.3)', fontSize: 11, fontWeight: 700,
                  background: 'transparent', color: '#8b5cf6',
                  transition: 'all 150ms',
                }}>
                  {promptStatus === 'downloaded' ? 'Listo!' : 'Descargar .md'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="dv-footer">QA Testing Module — labsisModernov1</footer>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, cursor: 'pointer',
          animation: 'fadeUp 200ms ease forwards',
        }}>
          <img
            src={`/api/qa/screenshots/${lightbox}`}
            alt="screenshot"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', animation: 'wizardBounceIn 300ms cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          />
          <button onClick={() => setLightbox(null)} style={{
            position: 'absolute', top: 20, right: 20,
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: 'none',
            color: '#fff', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>&times;</button>
        </div>
      )}
    </div>
  )
}

/* ── Small helper components ── */
function InfoRow({ label, value, small, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: small ? 11 : 12, gap: 8 }}>
      <span style={{ color: 'var(--text-4)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{
        color: 'var(--text-2)', textAlign: 'right',
        fontFamily: mono ? 'var(--font-mono, monospace)' : 'inherit',
        fontSize: mono ? 11 : undefined,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</span>
    </div>
  )
}

function ActionCard({ label, children, delay = 0, feedback }) {
  return (
    <div className="anim" style={{
      padding: '16px 18px', borderRadius: 12,
      background: 'var(--surface, #fff)', border: '1px solid var(--border, #e2e8f0)',
      boxShadow: '0 2px 8px rgba(30,58,95,0.04)',
      animationDelay: `${delay}ms`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-4)' }}>{label}</span>
        {feedback}
      </div>
      {children}
    </div>
  )
}

const SEVERITIES_LIST = [
  { v: 'blocker', l: 'Blocker', c: '#7c3aed' },
  { v: 'critico', l: 'Crítico', c: '#dc2626' },
  { v: 'mayor', l: 'Mayor', c: '#f97316' },
  { v: 'menor', l: 'Menor', c: '#64748b' },
]
