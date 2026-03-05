import { useReducer, useCallback, useEffect } from 'react'
import { createQABug, uploadQAScreenshots } from '../services/api'
import BrandTokenPicker from './BrandTokenPicker'
import VoiceRecorder from './VoiceRecorder'

/* ── Recent bug patterns (localStorage) ── */
const RECENT_KEY = 'qa-recent-bug-patterns'
const MAX_RECENT = 6

function getRecentPatterns() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
function addRecentPattern(bug) {
  const pattern = {
    tipoError: bug.tipoError,
    severidad: bug.severidad,
    zonaPantalla: bug.zonaPantalla,
    label: `${ERROR_TYPES.find(t => t.value === bug.tipoError)?.label || bug.tipoError}${bug.zonaPantalla ? ` — ${ZONES.find(z => z.value === bug.zonaPantalla)?.label || bug.zonaPantalla}` : ''}`,
    timestamp: Date.now(),
  }
  const list = getRecentPatterns().filter(p =>
    !(p.tipoError === pattern.tipoError && p.zonaPantalla === pattern.zonaPantalla)
  )
  list.unshift(pattern)
  if (list.length > MAX_RECENT) list.length = MAX_RECENT
  localStorage.setItem(RECENT_KEY, JSON.stringify(list))
}

/* ── Constants ── */
const ERROR_TYPES = [
  { value: 'error_500', label: 'Error 500', color: '#dc2626', desc: 'Error del servidor', suggestSev: 'critico' },
  { value: 'no_carga', label: 'No carga', color: '#f97316', desc: 'Pantalla en blanco o carga infinita', suggestSev: 'mayor' },
  { value: 'visual', label: 'UI rota', color: '#8b5cf6', desc: 'Algo se ve mal visualmente', suggestSev: 'menor' },
  { value: 'datos_incorrectos', label: 'Datos mal', color: '#eab308', desc: 'Datos incorrectos o faltantes', suggestSev: 'mayor' },
  { value: 'funcionalidad', label: 'No funciona', color: '#3b82f6', desc: 'Funcionalidad no responde', suggestSev: 'mayor' },
  { value: 'crash', label: 'Crash', color: '#991b1b', desc: 'App se cierra o congela', suggestSev: 'blocker' },
]

const SEVERITIES = [
  { v: 'blocker', l: 'Blocker', c: '#7c3aed' },
  { v: 'critico', l: 'Crítico', c: '#dc2626' },
  { v: 'mayor', l: 'Mayor', c: '#f97316' },
  { v: 'menor', l: 'Menor', c: '#64748b' },
]

const ZONES = [
  { value: 'header', label: 'Header' },
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'filtros', label: 'Filtros' },
  { value: 'tabla', label: 'Tabla' },
  { value: 'formulario', label: 'Formulario' },
  { value: 'modal', label: 'Modal' },
  { value: 'boton', label: 'Botón' },
  { value: 'card', label: 'Card' },
  { value: 'footer', label: 'Footer' },
]

/* ── Reducer ── */
function wizardReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'NEXT_STEP':
      return { ...state, step: Math.min(state.step + 1, 4), direction: 1 }
    case 'PREV_STEP':
      return { ...state, step: Math.max(state.step - 1, 1), direction: -1 }
    case 'ADD_FILES':
      return { ...state, files: [...state.files, ...action.files], previews: [...state.previews, ...action.previews] }
    case 'REMOVE_FILE':
      return { ...state, files: state.files.filter((_, i) => i !== action.index), previews: state.previews.filter((_, i) => i !== action.index) }
    case 'SUBMIT_START':
      return { ...state, submitting: true, error: null }
    case 'SUBMIT_SUCCESS':
      return { ...state, submitting: false, submitted: true }
    case 'SUBMIT_ERROR':
      return { ...state, submitting: false, error: action.error }
    default:
      return state
  }
}

/* ── SVG Icons ── */
const icons = {
  error_500: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  no_carga: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  visual: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
  datos_incorrectos: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  funcionalidad: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  crash: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  // Zone icons
  header: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>,
  sidebar: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  filtros: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  tabla: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
  formulario: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="12" y2="16"/></svg>,
  modal: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="8" x2="22" y2="8"/></svg>,
  boton: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="8" width="16" height="8" rx="4"/></svg>,
  card: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  footer: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="15" x2="21" y2="15"/></svg>,
}

const CONFETTI_COLORS = ['#dc2626', '#3b82f6', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9', '#f97316']

/* ── Gamification: QA taunts ── */
const QA_TAUNTS = [
  'Aquí te va otro... suerte arreglándolo',
  'Ya lo rompí. De nada.',
  'Este sí está bueno, prepárate',
  'Encontré otro. Soy imparable',
  'Esto se veía fácil... pero no',
  'QA never sleeps',
  'Con cariño, del equipo QA',
  'Otro más para la colección',
]
const randomQATaunt = () => QA_TAUNTS[Math.floor(Math.random() * QA_TAUNTS.length)]

/* ══════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════ */
export default function BugReportWizard({ testCase, runId, onCreated }) {
  const [state, dispatch] = useReducer(wizardReducer, {
    step: 1,
    direction: 1,
    tipoError: '',
    severidad: 'mayor',
    comportamientoActual: '',
    titulo: `Fallo en: ${testCase.titulo}`,
    codigoError: '',
    dondeOcurre: '',
    zonaPantalla: '',
    contextoExtra: '',
    brandTokens: [],
    comportamientoEsperado: testCase.resultado_esperado,
    pasosReproducir: testCase.pasos.map((p, i) => `${i + 1}. ${p}`).join('\n'),
    files: [],
    previews: [],
    submitting: false,
    submitted: false,
    tokenGalleryOpen: false,
    error: null,
  })

  const recentPatterns = getRecentPatterns()
  const canProceed = state.step === 1 ? state.tipoError !== '' : true

  // Auto-close after celebration
  useEffect(() => {
    if (state.submitted) {
      const t = setTimeout(() => onCreated(), 1800)
      return () => clearTimeout(t)
    }
  }, [state.submitted, onCreated])

  const handleFiles = useCallback((newFiles) => {
    const arr = Array.from(newFiles).filter(f => f.type.startsWith('image/'))
    const newPreviews = []
    let loaded = 0
    arr.forEach(f => {
      const reader = new FileReader()
      reader.onload = (e) => {
        newPreviews.push(e.target.result)
        loaded++
        if (loaded === arr.length) {
          dispatch({ type: 'ADD_FILES', files: arr, previews: newPreviews })
        }
      }
      reader.readAsDataURL(f)
    })
  }, [])

  const selectType = (value) => {
    const et = ERROR_TYPES.find(t => t.value === value)
    dispatch({ type: 'SET_FIELD', field: 'tipoError', value })
    if (et?.suggestSev) dispatch({ type: 'SET_FIELD', field: 'severidad', value: et.suggestSev })
  }

  const applyPattern = (p) => {
    dispatch({ type: 'SET_FIELD', field: 'tipoError', value: p.tipoError })
    dispatch({ type: 'SET_FIELD', field: 'severidad', value: p.severidad })
    if (p.zonaPantalla) dispatch({ type: 'SET_FIELD', field: 'zonaPantalla', value: p.zonaPantalla })
    setTimeout(() => dispatch({ type: 'NEXT_STEP' }), 250)
  }

  const handleSubmit = async () => {
    dispatch({ type: 'SUBMIT_START' })
    try {
      const bugData = {
        runId,
        testCaseId: testCase.id,
        titulo: state.titulo,
        comportamientoEsperado: state.comportamientoEsperado,
        comportamientoActual: state.comportamientoActual,
        pasosReproducir: state.pasosReproducir,
        severidad: state.severidad,
        tipoError: state.tipoError,
        codigoError: state.codigoError,
        dondeOcurre: state.dondeOcurre,
        zonaPantalla: state.zonaPantalla,
        contextoExtra: state.contextoExtra,
        brandTokens: state.brandTokens,
        browserInfo: navigator.userAgent,
      }
      const bug = await createQABug(bugData)
      if (state.files.length > 0) await uploadQAScreenshots(bug.id, state.files)
      addRecentPattern(state)
      dispatch({ type: 'SUBMIT_SUCCESS' })
    } catch (err) {
      dispatch({ type: 'SUBMIT_ERROR', error: err.message })
    }
  }

  /* ── Step Indicator ── */
  const StepDots = () => {
    const steps = [
      { num: 1, label: 'Tipo' },
      { num: 2, label: 'Describe' },
      { num: 3, label: 'Dónde' },
      { num: 4, label: 'Enviar' },
    ]
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 20 }}>
        {steps.map((s, i) => (
          <div key={s.num} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: s.num === state.step ? 34 : 26,
                height: s.num === state.step ? 34 : 26,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: s.num === state.step ? 14 : 11,
                fontWeight: 700,
                transition: 'all 300ms cubic-bezier(0.34,1.56,0.64,1)',
                background: s.num < state.step ? '#16a34a'
                  : s.num === state.step ? '#3b82f6'
                  : 'transparent',
                color: s.num <= state.step ? '#fff' : 'var(--text-4, #94a3b8)',
                border: s.num > state.step ? '2px solid var(--border, #e2e8f0)' : '2px solid transparent',
                boxShadow: s.num === state.step ? '0 0 0 4px rgba(59,130,246,0.15)' : 'none',
              }}>
                {s.num < state.step ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : s.num}
              </div>
              <span style={{
                fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: s.num === state.step ? '#3b82f6' : s.num < state.step ? '#16a34a' : 'var(--text-4, #94a3b8)',
                transition: 'color 300ms',
              }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: 32, height: 2, margin: '0 6px', marginBottom: 18,
                background: s.num < state.step ? '#16a34a' : 'var(--border, #e2e8f0)',
                transition: 'background 400ms',
                borderRadius: 1,
              }} />
            )}
          </div>
        ))}
      </div>
    )
  }

  /* ── Step 1: Tipo de error ── */
  const Step1 = () => (
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1, #0f172a)', marginBottom: 4 }}>Qué tipo de error?</div>
      <div style={{ fontSize: 12, color: 'var(--text-4, #94a3b8)', marginBottom: 14 }}>Selecciona el que mejor describa el problema</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        {ERROR_TYPES.map(type => {
          const sel = state.tipoError === type.value
          return (
            <button key={type.value} onClick={() => selectType(type.value)} style={{
              padding: '16px 12px', borderRadius: 12, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              minHeight: 88, border: sel ? `2.5px solid ${type.color}` : '2px solid var(--border, #e2e8f0)',
              background: sel ? `${type.color}0a` : 'var(--surface, #fff)',
              transform: sel ? 'scale(1.03)' : 'scale(1)',
              boxShadow: sel ? `0 4px 16px ${type.color}25` : '0 1px 2px rgba(30,58,95,0.03)',
              transition: 'all 200ms cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${type.color}12`, color: type.color,
                transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1)',
                transform: sel ? 'scale(1.15)' : 'scale(1)',
              }}>
                {icons[type.value]}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: sel ? type.color : 'var(--text-1, #0f172a)' }}>{type.label}</span>
              <span style={{ fontSize: 10, color: 'var(--text-4, #94a3b8)', textAlign: 'center', lineHeight: 1.3 }}>{type.desc}</span>
            </button>
          )
        })}
      </div>

      {/* Severidad */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-4, #94a3b8)', letterSpacing: '0.04em', marginBottom: 6 }}>Severidad</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {SEVERITIES.map(s => {
            const sel = state.severidad === s.v
            return (
              <button key={s.v} onClick={() => dispatch({ type: 'SET_FIELD', field: 'severidad', value: s.v })} style={{
                flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                fontSize: 12, fontWeight: 700, textAlign: 'center', minHeight: 44,
                border: sel ? `2px solid ${s.c}` : '2px solid var(--border, #e2e8f0)',
                background: sel ? `${s.c}0c` : 'transparent',
                color: sel ? s.c : 'var(--text-3, #64748b)',
                transition: 'all 150ms cubic-bezier(0.34,1.56,0.64,1)',
                transform: sel ? 'scale(1.02)' : 'scale(1)',
              }}>{s.l}</button>
            )
          })}
        </div>
      </div>

      {/* Patrones recientes */}
      {recentPatterns.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-4, #94a3b8)', letterSpacing: '0.04em', marginBottom: 6 }}>Reportes recientes</div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
            {recentPatterns.map((p, i) => (
              <button key={i} onClick={() => applyPattern(p)} style={{
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid var(--border, #e2e8f0)', background: 'var(--surface-r, #f8fafc)',
                fontSize: 11, fontWeight: 600, color: 'var(--text-2, #334155)',
                whiteSpace: 'nowrap', flexShrink: 0, minHeight: 40,
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 150ms',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: ERROR_TYPES.find(t => t.value === p.tipoError)?.color || '#94a3b8',
                }} />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  /* ── Step 2: Describe ── */
  const Step2 = () => (
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1, #0f172a)', marginBottom: 4 }}>Descríbelo rápido</div>
      <div style={{ fontSize: 12, color: 'var(--text-4, #94a3b8)', marginBottom: 14 }}>Qué pasó? Puedes agregar fotos y tokens</div>

      <textarea
        value={state.comportamientoActual}
        onChange={e => dispatch({ type: 'SET_FIELD', field: 'comportamientoActual', value: e.target.value })}
        placeholder="Describe el problema..."
        autoFocus
        style={{
          width: '100%', padding: '14px', borderRadius: 12,
          border: '1.5px solid var(--border, #e2e8f0)',
          fontSize: 14, fontFamily: 'inherit',
          minHeight: 80, resize: 'vertical', boxSizing: 'border-box',
          transition: 'border-color 200ms',
        }}
        onFocus={e => e.target.style.borderColor = '#3b82f6'}
        onBlur={e => e.target.style.borderColor = ''}
      />

      {/* Foto + Voz + Tokens */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button
          onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.multiple = true; input.accept = 'image/*'; input.onchange = (e) => handleFiles(e.target.files); input.click() }}
          style={{
            flex: 1, padding: '18px 12px', borderRadius: 12, cursor: 'pointer',
            border: '2px dashed var(--border, #e2e8f0)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: 'var(--surface-r, #f8fafc)',
            minHeight: 80, transition: 'all 150ms',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-3, #64748b)" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3, #64748b)' }}>
            {state.previews.length > 0 ? `${state.previews.length} foto${state.previews.length > 1 ? 's' : ''}` : 'Foto'}
          </span>
        </button>

        <VoiceRecorder onTranscription={(text) => {
          const current = state.comportamientoActual
          dispatch({ type: 'SET_FIELD', field: 'comportamientoActual', value: current ? `${current}\n${text}` : text })
        }} />

        <button
          onClick={() => dispatch({ type: 'SET_FIELD', field: 'tokenGalleryOpen', value: true })}
          style={{
            width: 100, padding: '18px 12px', borderRadius: 12, cursor: 'pointer',
            border: state.brandTokens.length > 0 ? '2px solid #8b5cf6' : '2px solid var(--border, #e2e8f0)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: state.brandTokens.length > 0 ? 'rgba(139,92,246,0.04)' : 'var(--surface-r, #f8fafc)',
            transition: 'all 150ms',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={state.brandTokens.length > 0 ? '#8b5cf6' : 'var(--text-3, #64748b)'} strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: state.brandTokens.length > 0 ? '#8b5cf6' : 'var(--text-3, #64748b)' }}>
            {state.brandTokens.length > 0 ? `${state.brandTokens.length} tokens` : 'Tokens'}
          </span>
        </button>
      </div>

      {/* Photo previews */}
      {state.previews.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {state.previews.map((p, i) => (
            <div key={i} style={{ position: 'relative', flexShrink: 0, animation: 'wizardBounceIn 300ms cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
              <img src={p} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border, #e2e8f0)' }} alt="" />
              <span onClick={() => dispatch({ type: 'REMOVE_FILE', index: i })} style={{
                position: 'absolute', top: -4, right: -4, width: 18, height: 18,
                borderRadius: '50%', background: '#dc2626', color: '#fff',
                fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}>&times;</span>
            </div>
          ))}
        </div>
      )}

      {/* Token chips */}
      {state.brandTokens.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
          {state.brandTokens.map(t => (
            <span key={t.code} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(139,92,246,0.08)', color: '#8b5cf6',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: 20, padding: '3px 8px',
              fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono, monospace)',
            }}>
              {t.color && <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: t.color, border: '1px solid rgba(0,0,0,0.1)' }} />}
              {t.code}
              <span onClick={() => dispatch({ type: 'SET_FIELD', field: 'brandTokens', value: state.brandTokens.filter(x => x.code !== t.code) })} style={{ cursor: 'pointer', opacity: 0.6, fontSize: 12 }}>&times;</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )

  /* ── Step 3: Dónde ── */
  const Step3 = () => (
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1, #0f172a)', marginBottom: 4 }}>Dónde ocurre?</div>
      <div style={{ fontSize: 12, color: 'var(--text-4, #94a3b8)', marginBottom: 14 }}>Selecciona la zona de pantalla afectada</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
        {ZONES.map(z => {
          const sel = state.zonaPantalla === z.value
          return (
            <button key={z.value} onClick={() => dispatch({ type: 'SET_FIELD', field: 'zonaPantalla', value: sel ? '' : z.value })} style={{
              padding: '12px 8px', borderRadius: 10, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              minHeight: 64, border: sel ? '2px solid #3b82f6' : '2px solid var(--border, #e2e8f0)',
              background: sel ? 'rgba(59,130,246,0.06)' : 'transparent',
              color: sel ? '#3b82f6' : 'var(--text-3, #64748b)',
              transition: 'all 150ms cubic-bezier(0.34,1.56,0.64,1)',
              transform: sel ? 'scale(1.03)' : 'scale(1)',
            }}>
              {icons[z.value]}
              <span style={{ fontSize: 11, fontWeight: 600 }}>{z.label}</span>
            </button>
          )
        })}
      </div>

      {/* Detalles opcionales */}
      <details style={{ borderRadius: 8, border: '1px solid var(--border, #e2e8f0)', overflow: 'hidden' }}>
        <summary style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text-3, #64748b)', background: 'rgba(0,0,0,0.02)', userSelect: 'none' }}>
          Detalles opcionales
        </summary>
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={state.dondeOcurre} onChange={e => dispatch({ type: 'SET_FIELD', field: 'dondeOcurre', value: e.target.value })} placeholder="Pantalla, botón, sección..." style={inputStyle} />
          <input value={state.codigoError} onChange={e => dispatch({ type: 'SET_FIELD', field: 'codigoError', value: e.target.value })} placeholder="Código o mensaje de error" style={inputStyle} />
          <textarea value={state.contextoExtra} onChange={e => dispatch({ type: 'SET_FIELD', field: 'contextoExtra', value: e.target.value })} placeholder="Notas extra o logs..." style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} />
        </div>
      </details>
    </div>
  )

  /* ── Step 4: Confirma ── */
  const Step4 = () => {
    const et = ERROR_TYPES.find(t => t.value === state.tipoError)
    const sv = SEVERITIES.find(s => s.v === state.severidad)
    const zn = ZONES.find(z => z.value === state.zonaPantalla)
    return (
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1, #0f172a)', marginBottom: 4 }}>Todo listo!</div>
        <div style={{ fontSize: 12, color: 'var(--text-4, #94a3b8)', marginBottom: 14 }}>Revisa y envía tu reporte</div>

        <div style={{
          padding: 16, borderRadius: 12,
          background: 'var(--surface-r, #f8fafc)', border: '1px solid var(--border, #e2e8f0)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Tipo + severidad */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${et?.color || '#64748b'}12`, color: et?.color || '#64748b' }}>
                {icons[state.tipoError]}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{et?.label || state.tipoError}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: `${sv?.c || '#64748b'}0c`, color: sv?.c || '#64748b', border: `1px solid ${sv?.c || '#64748b'}30` }}>
              {sv?.l}
            </span>
          </div>

          {/* Descripción */}
          {state.comportamientoActual && (
            <p style={{ fontSize: 13, color: 'var(--text-2, #334155)', margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>
              &ldquo;{state.comportamientoActual.substring(0, 150)}{state.comportamientoActual.length > 150 ? '...' : ''}&rdquo;
            </p>
          )}

          {/* Zona */}
          {zn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-3, #64748b)' }}>
              {icons[state.zonaPantalla]}
              <span>Zona: {zn.label}</span>
            </div>
          )}

          {/* Fotos */}
          {state.previews.length > 0 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-4, #94a3b8)" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span style={{ fontSize: 11, color: 'var(--text-3, #64748b)' }}>{state.previews.length} foto{state.previews.length > 1 ? 's' : ''}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {state.previews.slice(0, 4).map((p, i) => (
                  <img key={i} src={p} style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', border: '1px solid var(--border, #e2e8f0)' }} alt="" />
                ))}
                {state.previews.length > 4 && <span style={{ fontSize: 10, color: 'var(--text-4)', alignSelf: 'center' }}>+{state.previews.length - 4}</span>}
              </div>
            </div>
          )}

          {/* Tokens */}
          {state.brandTokens.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {state.brandTokens.map(t => (
                <span key={t.code} style={{
                  fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono, monospace)',
                  padding: '2px 6px', borderRadius: 4,
                  background: 'rgba(139,92,246,0.08)', color: '#8b5cf6',
                }}>{t.code}</span>
              ))}
            </div>
          )}
        </div>

        {/* Test case ref */}
        <div style={{ fontSize: 10, color: 'var(--text-4, #94a3b8)', marginTop: 8, fontFamily: 'var(--font-mono, monospace)' }}>
          Test: {testCase.titulo} — Run #{runId}
        </div>

        {state.error && (
          <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', fontSize: 12, color: '#dc2626' }}>
            Error: {state.error}
          </div>
        )}
      </div>
    )
  }

  const renderStep = () => {
    switch (state.step) {
      case 1: return <Step1 />
      case 2: return <Step2 />
      case 3: return <Step3 />
      case 4: return <Step4 />
      default: return null
    }
  }

  /* ── Main render ── */
  return (
    <div style={{
      marginLeft: 30, marginTop: 10, padding: 20, borderRadius: 14,
      border: '1.5px solid rgba(59,130,246,0.2)', background: 'rgba(255,255,255,0.98)',
      boxShadow: '0 4px 24px rgba(30,58,95,0.08)',
      position: 'relative', overflow: 'hidden',
    }}>
      <StepDots />

      {/* Animated step content */}
      <div
        key={state.step}
        style={{
          animation: `${state.direction > 0 ? 'wizardSlideInRight' : 'wizardSlideInLeft'} 300ms cubic-bezier(0.34,1.56,0.64,1) forwards`,
          minHeight: 200,
        }}
      >
        {renderStep()}
      </div>

      {/* Navigation bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border, #e2e8f0)',
      }}>
        {state.step > 1 ? (
          <button onClick={() => dispatch({ type: 'PREV_STEP' })} style={{
            padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
            border: '1.5px solid var(--border, #e2e8f0)', background: 'transparent',
            fontSize: 13, fontWeight: 600, color: 'var(--text-3, #64748b)',
            display: 'flex', alignItems: 'center', gap: 6, minHeight: 44,
            transition: 'all 150ms',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Atrás
          </button>
        ) : <div />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Skip link on steps 2-3 */}
          {state.step > 1 && state.step < 4 && (
            <button onClick={() => dispatch({ type: 'NEXT_STEP' })} style={{
              background: 'none', border: 'none', fontSize: 12, fontWeight: 500,
              color: 'var(--text-4, #94a3b8)', cursor: 'pointer', padding: '8px',
              textDecoration: 'underline',
            }}>Saltar</button>
          )}

          {state.step < 4 ? (
            <button onClick={() => dispatch({ type: 'NEXT_STEP' })} disabled={!canProceed} style={{
              padding: '10px 24px', borderRadius: 10, cursor: canProceed ? 'pointer' : 'default',
              border: 'none',
              background: canProceed ? '#3b82f6' : 'var(--surface-s, #f1f5f9)',
              color: canProceed ? '#fff' : 'var(--text-4, #94a3b8)',
              fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6, minHeight: 44,
              boxShadow: canProceed ? '0 2px 8px rgba(59,130,246,0.3)' : 'none',
              transition: 'all 200ms cubic-bezier(0.34,1.56,0.64,1)',
              transform: canProceed ? 'scale(1)' : 'scale(0.97)',
            }}>
              Siguiente
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={state.submitting} style={{
              padding: '12px 32px', borderRadius: 10, border: 'none',
              background: state.submitting ? '#94a3b8' : '#dc2626', color: '#fff',
              fontSize: 15, fontWeight: 800, cursor: state.submitting ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              minHeight: 48,
              boxShadow: state.submitting ? 'none' : '0 3px 12px rgba(220,38,38,0.25)',
              transition: 'all 200ms cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              {state.submitting ? (
                <><div className="dv-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Enviando...</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar Bug</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Celebration overlay */}
      {state.submitted && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 14,
          background: 'rgba(255,255,255,0.97)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12,
          zIndex: 10,
          animation: 'fadeUp 250ms cubic-bezier(0.4,0,0.2,1) forwards',
        }}>
          {/* Confetti */}
          {CONFETTI_COLORS.map((c, i) => (
            <div key={i} style={{
              position: 'absolute', width: 8, height: 8, borderRadius: '50%',
              background: c, opacity: 0,
              animation: `wizardConfettiPop 600ms cubic-bezier(0.34,1.56,0.64,1) ${100 + i * 50}ms forwards`,
              top: `calc(50% + ${Math.sin(i * 45 * Math.PI / 180) * 70}px)`,
              left: `calc(50% + ${Math.cos(i * 45 * Math.PI / 180) * 70}px)`,
            }} />
          ))}

          {/* Checkmark */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: '#ecfdf5', border: '3px solid #16a34a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'wizardBounceIn 500ms cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: 'wizardCheckDraw 400ms ease-out 250ms forwards' }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', marginBottom: 4 }}>Bug reportado!</div>
            <div style={{
              fontSize: 14, color: 'var(--text-2, #334155)', fontStyle: 'italic', fontWeight: 600,
              marginTop: 4, opacity: 0,
              animation: 'fadeUp 400ms ease-out 400ms forwards',
            }}>"{randomQATaunt()}"</div>
            <div style={{ fontSize: 11, color: 'var(--text-4, #94a3b8)', marginTop: 6 }}>El equipo lo revisará pronto</div>
          </div>
        </div>
      )}

      {/* Token Gallery popup */}
      {state.tokenGalleryOpen && (
        <BrandTokenPicker
          selectedTokens={state.brandTokens}
          onTokensChange={tokens => dispatch({ type: 'SET_FIELD', field: 'brandTokens', value: tokens })}
          zone={state.zonaPantalla}
          onZoneChange={z => dispatch({ type: 'SET_FIELD', field: 'zonaPantalla', value: z })}
          openAsGallery
          onClose={() => dispatch({ type: 'SET_FIELD', field: 'tokenGalleryOpen', value: false })}
        />
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--border, #e2e8f0)',
  fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
}
