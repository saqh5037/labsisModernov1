import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDashboard, updateScreen, toggleTask, addTask, deleteTask } from '../services/devApi'

const IconBack = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
)
const IconTrash = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
)
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IconEdit = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

/* ── Progress Ring ── */
function ProgressRing({ pct, size = 80, stroke = 7, color = '#3b82f6' }) {
  const r = (size - stroke) / 2
  const C = 2 * Math.PI * r
  const offset = C - (pct / 100) * C
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="dv-ring">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(15,23,42,0.05)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={C} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  )
}

export default function DevScreenDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [db, setDb] = useState(null)
  const [screen, setScreen] = useState(null)
  const [module, setModule] = useState(null)
  const [newTask, setNewTask] = useState('')
  const [editNotes, setEditNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await getDashboard()
      setDb(data)
      for (const mod of data.modules) {
        const s = mod.screens.find(s => s.id === id)
        if (s) { setScreen(s); setModule(mod); setNotes(s.notes || ''); break }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="dv"><div className="dv-loading"><div className="dv-spinner" />Cargando...</div></div>
  if (!screen || !db) return <div className="dv"><div className="dv-loading">Pantalla no encontrada</div></div>

  const phases = db.phases
  const curIdx = phases.findIndex(p => p.id === screen.phase)
  const curPhase = phases[curIdx]

  const advance = async () => {
    if (curIdx < phases.length - 1) { await updateScreen(screen.id, { phase: phases[curIdx + 1].id }); load() }
  }
  const retreat = async () => {
    if (curIdx > 0) { await updateScreen(screen.id, { phase: phases[curIdx - 1].id }); load() }
  }
  const toggle = async (taskId) => { await toggleTask(screen.id, taskId); load() }
  const add = async (e) => {
    e.preventDefault()
    if (!newTask.trim()) return
    await addTask(screen.id, newTask.trim()); setNewTask(''); load()
  }
  const remove = async (taskId) => { await deleteTask(screen.id, taskId); load() }
  const saveNotes = async () => { await updateScreen(screen.id, { notes }); setEditNotes(false); load() }

  const doneTasks = (screen.tasks || []).filter(t => t.done).length
  const totalTasks = (screen.tasks || []).length
  const taskPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const phasePct = phases.length > 1 ? Math.round((curIdx / (phases.length - 1)) * 100) : 0

  return (
    <div className="dv">
      {/* ── Navbar ── */}
      <nav className="dv-nav">
        <div className="dv-nav-left">
          <button className="dv-nav-link" onClick={() => navigate('/dev')}>
            <IconBack /> Dashboard
          </button>
        </div>
        <div className="dv-nav-right">
          <span className="dv-nav-brand" style={{ fontSize: 13 }}>{screen.name}</span>
          <span className="dv-chip dv-chip-phase" style={{
            background: `${curPhase?.color}18`, color: curPhase?.color,
            border: `1px solid ${curPhase?.color}30`, padding: '3px 10px', fontSize: 10
          }}>{curPhase?.label}</span>
          <span className={`dv-chip dv-chip-${screen.priority.toLowerCase()}`} style={{ padding: '3px 10px', fontSize: 10 }}>{screen.priority}</span>
        </div>
      </nav>

      {/* ── Hero Strip ── */}
      <div className="dv-detail-hero">
        <div className="dv-detail-hero-bg" />
        <div className="dv-detail-hero-content">
          <div className="dv-detail-ring-wrap">
            <ProgressRing pct={phasePct} size={90} stroke={8} color={curPhase?.color || '#3b82f6'} />
            <div className="dv-detail-ring-label">
              <span className="dv-detail-ring-num">{curIdx + 1}</span>
              <span className="dv-detail-ring-of">de {phases.length}</span>
            </div>
          </div>
          <div className="dv-detail-hero-info">
            <h1 className="dv-detail-title">{screen.name}</h1>
            <p className="dv-detail-module">{module?.name} — {screen.component || 'Sin componente'}</p>
          </div>
        </div>
      </div>

      <div className="dv-content" style={{ maxWidth: 780 }}>
        {/* ── Phase Stepper ── */}
        <div className="dv-stepper-wrap">
          <div className="dv-stepper">
            {phases.map((phase, i) => {
              const done = i < curIdx
              const current = i === curIdx
              return (
                <div key={phase.id} className={`dv-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                  {i > 0 && <div className="dv-step-line" style={done || current ? { background: `linear-gradient(90deg, ${phases[i-1]?.color || phase.color}, ${phase.color})` } : {}} />}
                  <div className="dv-step-circle" style={done || current ? {
                    background: phase.color, borderColor: phase.color,
                    boxShadow: `0 0 12px ${phase.color}35`
                  } : {}}>
                    {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
                    {current && <span className="dv-step-pulse" style={{ background: phase.color }} />}
                  </div>
                  <span className="dv-step-text" style={current ? { color: phase.color } : {}}>{phase.label}</span>
                </div>
              )
            })}
          </div>
          <div className="dv-step-actions">
            <button className="dv-btn dv-btn-ghost" onClick={retreat} disabled={curIdx === 0}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
              Anterior
            </button>
            <button className="dv-btn dv-btn-primary" onClick={advance} disabled={curIdx === phases.length - 1}>
              Siguiente
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>

        {/* ── Info + Notes grid ── */}
        <div className="dv-detail-grid">
          <div className="dv-section dv-info-card">
            <h3 className="dv-section-title" style={{ marginBottom: 14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              Información
            </h3>
            <div className="dv-info-row"><span className="dv-info-label">Módulo</span><span className="dv-info-val">{module?.name}</span></div>
            <div className="dv-info-row"><span className="dv-info-label">Sprint</span><span className="dv-info-val">{screen.sprint || '—'}</span></div>
            <div className="dv-info-row"><span className="dv-info-label">Componente</span><span className="dv-info-val dv-mono">{screen.component || '—'}</span></div>
            <div className="dv-info-row"><span className="dv-info-label">Actualizado</span><span className="dv-info-val">{screen.updatedAt ? new Date(screen.updatedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span></div>
            <div className="dv-info-row">
              <span className="dv-info-label">Fase</span>
              <span className="dv-info-val" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="dv-screen-dot" style={{ background: curPhase?.color, boxShadow: `0 0 6px ${curPhase?.color}50` }} />
                {curPhase?.label}
              </span>
            </div>
          </div>

          <div className="dv-section dv-notes-card">
            <div className="dv-card-header" style={{ marginBottom: 10 }}>
              <h3 className="dv-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold-d)" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                Notas
              </h3>
              {!editNotes && <button className="dv-btn dv-btn-ghost dv-btn-sm" onClick={() => setEditNotes(true)}><IconEdit /> Editar</button>}
            </div>
            {editNotes ? (
              <>
                <textarea className="dv-textarea" value={notes} onChange={e => setNotes(e.target.value)} rows={5} autoFocus />
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button className="dv-btn dv-btn-primary dv-btn-sm" onClick={saveNotes}>Guardar</button>
                  <button className="dv-btn dv-btn-ghost dv-btn-sm" onClick={() => { setEditNotes(false); setNotes(screen.notes || '') }}>Cancelar</button>
                </div>
              </>
            ) : (
              <p className="dv-notes-text">{screen.notes || 'Sin notas aún...'}</p>
            )}
          </div>
        </div>

        {/* ── Subtareas ── */}
        <section className="dv-section dv-tasks-section">
          <div className="dv-section-header">
            <div className="dv-section-title-wrap">
              <div className="dv-section-badge" style={{ background: taskPct === 100 ? '#059669' : undefined }}>
                {taskPct === 100 ? 'LISTO' : 'TAREAS'}
              </div>
              <h2 className="dv-section-title">Subtareas</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {totalTasks > 0 && (
                <div className="dv-tasks-ring-wrap">
                  <ProgressRing pct={taskPct} size={36} stroke={4} color={taskPct === 100 ? '#059669' : '#3b82f6'} />
                  <span className="dv-tasks-ring-label">{doneTasks}/{totalTasks}</span>
                </div>
              )}
            </div>
          </div>

          {totalTasks > 0 && (
            <div className="dv-task-progress">
              <div className="dv-task-progress-fill" style={{ width: `${taskPct}%` }} />
              {taskPct > 0 && <div className="dv-task-progress-glow" style={{ left: `${taskPct}%` }} />}
            </div>
          )}

          <div className="dv-task-list">
            {(screen.tasks || []).map(task => (
              <div key={task.id} className={`dv-task ${task.done ? 'dv-task-done' : ''}`}>
                <input type="checkbox" checked={task.done} onChange={() => toggle(task.id)} className="dv-task-check" />
                <span className="dv-task-text">{task.text}</span>
                <button className="dv-task-del" onClick={() => remove(task.id)} title="Eliminar"><IconTrash /></button>
              </div>
            ))}
          </div>

          <form className="dv-add-task" onSubmit={add}>
            <input type="text" className="dv-add-input" placeholder="Nueva subtarea..." value={newTask} onChange={e => setNewTask(e.target.value)} />
            <button type="submit" className="dv-btn dv-btn-primary dv-btn-sm" disabled={!newTask.trim()}><IconPlus /></button>
          </form>
        </section>
      </div>

      {/* ── Footer ── */}
      <footer className="dv-footer">
        <span>labsisModernov1</span>
        <span className="dv-footer-sep" />
        <span>Dev Dashboard v3</span>
      </footer>
    </div>
  )
}
