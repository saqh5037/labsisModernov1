import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useQANotepad from '../hooks/useQANotepad'

const ERROR_TYPES = [
  { value: 'error_500', label: '500', icon: '💥' },
  { value: 'no_carga', label: 'No carga', icon: '⏳' },
  { value: 'visual', label: 'Visual', icon: '👁' },
  { value: 'datos_incorrectos', label: 'Datos', icon: '📊' },
  { value: 'funcionalidad', label: 'Función', icon: '⚙️' },
  { value: 'crash', label: 'Crash', icon: '💀' },
]

const SEVERITIES = [
  { value: 'blocker', label: 'Blocker', color: '#dc2626' },
  { value: 'critico', label: 'Crítico', color: '#ea580c' },
  { value: 'mayor', label: 'Mayor', color: '#ca8a04' },
  { value: 'menor', label: 'Menor', color: '#2563eb' },
]

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

export default function QANotepad() {
  const navigate = useNavigate()
  const {
    notes, queue, submitting, lastBatch, setLastBatch,
    addNote, removeNote, promoteNoteToQueue, promoteNoteToBug,
    addToQueue, editQueueItem, removeFromQueue, clearQueue, submitQueue,
    notesCount, queueCount,
  } = useQANotepad()

  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('notes') // 'notes' | 'queue'
  const [noteInput, setNoteInput] = useState('')
  const [promoteId, setPromoteId] = useState(null)
  const [promoteData, setPromoteData] = useState({ titulo: '', tipoError: '', severidad: 'mayor' })
  const [queueInput, setQueueInput] = useState({ titulo: '', tipoError: '', severidad: 'mayor' })
  const noteRef = useRef(null)
  const queueRef = useRef(null)

  useEffect(() => {
    if (open && tab === 'notes') noteRef.current?.focus()
    if (open && tab === 'queue') queueRef.current?.focus()
  }, [open, tab])

  const totalCount = notesCount + queueCount

  const handleAddNote = () => {
    if (!noteInput.trim()) return
    addNote(noteInput)
    setNoteInput('')
  }

  const handleStartPromote = (note) => {
    setPromoteId(note.id)
    setPromoteData({ titulo: note.text, tipoError: '', severidad: 'mayor' })
  }

  const handlePromoteToQueue = () => {
    if (!promoteId) return
    const note = notes.find(n => n.id === promoteId)
    if (note) {
      addToQueue({
        titulo: promoteData.titulo || note.text,
        tipoError: promoteData.tipoError,
        severidad: promoteData.severidad,
      })
      removeNote(promoteId)
    }
    setPromoteId(null)
  }

  const handlePromoteToBug = async () => {
    if (!promoteId) return
    await promoteNoteToBug(promoteId, promoteData)
    setPromoteId(null)
  }

  const handleAddToQueue = () => {
    if (!queueInput.titulo.trim()) return
    addToQueue(queueInput)
    setQueueInput({ titulo: '', tipoError: '', severidad: 'mayor' })
    queueRef.current?.focus()
  }

  const handleSubmit = async () => {
    await submitQueue()
  }

  // ─── Styles ──────────────────────────────────────────
  const fabStyle = {
    position: 'fixed', bottom: 20, right: 20, width: 48, height: 48,
    borderRadius: '50%', background: '#3b82f6', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(59,130,246,.4)', zIndex: 9990,
    transition: 'transform .15s', color: '#fff',
  }
  const badgeStyle = {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18,
    borderRadius: 9, background: '#ef4444', color: '#fff', fontSize: 11,
    fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 5px',
  }
  const panelStyle = {
    position: 'fixed', bottom: 20, right: 20, width: 370, maxHeight: 520,
    background: '#1a1a2e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,.5)', zIndex: 9990,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    animation: 'fadeInUp .2s ease',
  }
  const tabBarStyle = {
    display: 'flex', alignItems: 'center', gap: 0, padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,.08)', background: 'rgba(0,0,0,.2)',
  }
  const tabStyle = (active) => ({
    padding: '4px 12px', border: 'none', borderRadius: 6, cursor: 'pointer',
    fontSize: 12, fontWeight: 600, transition: 'all .15s',
    background: active ? 'rgba(59,130,246,.25)' : 'transparent',
    color: active ? '#93c5fd' : 'rgba(255,255,255,.5)',
  })
  const contentStyle = {
    flex: 1, overflowY: 'auto', padding: '8px 12px',
    maxHeight: 360, minHeight: 120,
  }
  const inputRowStyle = {
    display: 'flex', gap: 6, padding: '8px 12px',
    borderTop: '1px solid rgba(255,255,255,.08)',
  }
  const inputStyle = {
    flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 6, padding: '6px 10px', color: '#e2e8f0', fontSize: 12,
    outline: 'none',
  }
  const btnSmall = (bg = '#3b82f6') => ({
    border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11,
    fontWeight: 600, cursor: 'pointer', background: bg, color: '#fff',
    transition: 'opacity .15s',
  })
  const pillStyle = (active, color = '#3b82f6') => ({
    border: `1px solid ${active ? color : 'rgba(255,255,255,.15)'}`,
    background: active ? `${color}22` : 'transparent',
    color: active ? color : 'rgba(255,255,255,.4)',
    borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 600,
    cursor: 'pointer', transition: 'all .15s',
  })
  const noteCardStyle = {
    padding: '6px 8px', marginBottom: 4, borderRadius: 6,
    background: 'rgba(255,255,255,.04)', fontSize: 12, color: '#e2e8f0',
  }
  const queueCardStyle = {
    padding: '8px', marginBottom: 6, borderRadius: 6,
    background: 'rgba(255,255,255,.04)', fontSize: 12, color: '#e2e8f0',
  }

  if (!open) {
    return (
      <button style={fabStyle} onClick={() => setOpen(true)} title="QA Notepad">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        {totalCount > 0 && <span style={badgeStyle}>{totalCount}</span>}
      </button>
    )
  }

  return (
    <div style={panelStyle}>
      {/* Tab Bar */}
      <div style={tabBarStyle}>
        <button style={tabStyle(tab === 'notes')} onClick={() => setTab('notes')}>
          Notas{notesCount > 0 ? ` (${notesCount})` : ''}
        </button>
        <button style={tabStyle(tab === 'queue')} onClick={() => setTab('queue')}>
          Cola{queueCount > 0 ? ` (${queueCount})` : ''}
        </button>
        <div style={{ flex: 1 }} />
        {tab === 'queue' && queueCount > 0 && (
          <button
            style={{ ...btnSmall('#22c55e'), opacity: submitting ? 0.5 : 1 }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Enviando...' : `Enviar ${queueCount} bug${queueCount > 1 ? 's' : ''}`}
          </button>
        )}
        <button
          style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,.4)', cursor: 'pointer', padding: '2px 6px', fontSize: 16 }}
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {/* ─── Last Batch Result ─── */}
        {lastBatch && tab === 'queue' && (
          <div style={{ padding: 10, marginBottom: 8, borderRadius: 8, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>
              {lastBatch.count} bug{lastBatch.count > 1 ? 's' : ''} creado{lastBatch.count > 1 ? 's' : ''}
            </div>
            {lastBatch.created.map(b => (
              <div key={b.id} style={{ fontSize: 11, color: '#86efac', cursor: 'pointer', padding: '1px 0' }}
                onClick={() => { navigate(`/qa/bugs/${b.id}`); setOpen(false) }}>
                BUG-{String(b.id).padStart(3, '0')}: {b.titulo}
              </div>
            ))}
            <button style={{ ...btnSmall('transparent'), color: '#86efac', padding: '2px 0', marginTop: 4, fontSize: 10 }}
              onClick={() => setLastBatch(null)}>
              Cerrar
            </button>
          </div>
        )}

        {/* ─── Notes Tab ─── */}
        {tab === 'notes' && (
          <>
            {notes.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.3)', padding: '24px 0', fontSize: 12 }}>
                Sin notas. Escribe algo abajo.
              </div>
            )}
            {notes.map(note => (
              <div key={note.id} style={noteCardStyle}>
                {promoteId === note.id ? (
                  /* Promote inline form */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input
                      style={inputStyle}
                      value={promoteData.titulo}
                      onChange={e => setPromoteData(p => ({ ...p, titulo: e.target.value }))}
                      placeholder="Título del bug"
                    />
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {ERROR_TYPES.map(t => (
                        <button key={t.value}
                          style={pillStyle(promoteData.tipoError === t.value)}
                          onClick={() => setPromoteData(p => ({ ...p, tipoError: t.value }))}>
                          {t.icon} {t.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {SEVERITIES.map(s => (
                        <button key={s.value}
                          style={pillStyle(promoteData.severidad === s.value, s.color)}
                          onClick={() => setPromoteData(p => ({ ...p, severidad: s.value }))}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button style={btnSmall('#ca8a04')} onClick={handlePromoteToQueue}>A la Cola</button>
                      <button style={btnSmall('#22c55e')} onClick={handlePromoteToBug}>Crear Bug</button>
                      <button style={btnSmall('rgba(255,255,255,.1)')} onClick={() => setPromoteId(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  /* Normal note display */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ flex: 1, lineHeight: 1.4 }}>{note.text}</span>
                      <button style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,.2)', cursor: 'pointer', padding: '0 2px', fontSize: 13, flexShrink: 0 }}
                        onClick={() => removeNote(note.id)} title="Eliminar">✕</button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,.25)' }}>{timeAgo(note.createdAt)}</span>
                      <button
                        style={{ border: 'none', background: 'transparent', color: '#93c5fd', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}
                        onClick={() => handleStartPromote(note)}>
                        → Bug
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* ─── Queue Tab ─── */}
        {tab === 'queue' && !lastBatch && (
          <>
            {queue.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,.3)', padding: '24px 0', fontSize: 12 }}>
                Cola vacía. Agrega bugs abajo.
              </div>
            )}
            {queue.map(item => (
              <div key={item.queueId} style={queueCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <input
                    style={{ ...inputStyle, flex: 1, padding: '2px 6px', fontSize: 12, fontWeight: 600 }}
                    value={item.titulo}
                    onChange={e => editQueueItem(item.queueId, { titulo: e.target.value })}
                  />
                  <button style={{ border: 'none', background: 'transparent', color: 'rgba(255,255,255,.2)', cursor: 'pointer', padding: '0 4px', fontSize: 13, flexShrink: 0 }}
                    onClick={() => removeFromQueue(item.queueId)} title="Quitar">✕</button>
                </div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {ERROR_TYPES.map(t => (
                    <button key={t.value}
                      style={pillStyle(item.tipoError === t.value)}
                      onClick={() => editQueueItem(item.queueId, { tipoError: t.value })}>
                      {t.icon}
                    </button>
                  ))}
                  <span style={{ width: 1, background: 'rgba(255,255,255,.1)', margin: '0 2px' }} />
                  {SEVERITIES.map(s => (
                    <button key={s.value}
                      style={pillStyle(item.severidad === s.value, s.color)}
                      onClick={() => editQueueItem(item.queueId, { severidad: s.value })}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ─── Input Area ─── */}
      {tab === 'notes' && (
        <div style={inputRowStyle}>
          <input
            ref={noteRef}
            style={inputStyle}
            value={noteInput}
            onChange={e => setNoteInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddNote()}
            placeholder="Anotar..."
          />
          <button style={btnSmall()} onClick={handleAddNote}>+</button>
        </div>
      )}

      {tab === 'queue' && !lastBatch && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            ref={queueRef}
            style={inputStyle}
            value={queueInput.titulo}
            onChange={e => setQueueInput(p => ({ ...p, titulo: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleAddToQueue()}
            placeholder="Título del bug..."
          />
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            {ERROR_TYPES.map(t => (
              <button key={t.value}
                style={pillStyle(queueInput.tipoError === t.value)}
                onClick={() => setQueueInput(p => ({ ...p, tipoError: p.tipoError === t.value ? '' : t.value }))}>
                {t.icon}
              </button>
            ))}
            <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,.1)', margin: '0 2px' }} />
            {SEVERITIES.map(s => (
              <button key={s.value}
                style={pillStyle(queueInput.severidad === s.value, s.color)}
                onClick={() => setQueueInput(p => ({ ...p, severidad: s.value }))}>
                {s.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button style={btnSmall()} onClick={handleAddToQueue}>+ Cola</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px) }
          to { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </div>
  )
}
