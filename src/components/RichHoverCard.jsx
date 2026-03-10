import { useState, useRef, useEffect } from 'react'

function calcAge(fechaNac) {
  if (!fechaNac) return null
  const born = new Date(fechaNac)
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const m = now.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age--
  return age
}

export default function RichHoverCard({ children, type, data }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const timer = useRef(null)
  const wrapRef = useRef(null)
  const cardRef = useRef(null)

  const handleEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPos({ x: rect.left, y: rect.bottom + 6 })
    timer.current = setTimeout(() => setShow(true), 320)
  }

  const handleLeave = () => {
    clearTimeout(timer.current)
    setShow(false)
  }

  // Adjust position if card goes off screen
  useEffect(() => {
    if (!show || !cardRef.current) return
    const card = cardRef.current
    const rect = card.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let { x, y } = pos
    if (rect.right > vw - 12) x = vw - rect.width - 12
    if (rect.bottom > vh - 12) y = pos.y - rect.height - 40
    if (x !== pos.x || y !== pos.y) setPos({ x, y })
  }, [show])

  return (
    <span
      ref={wrapRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{ cursor: 'default' }}
    >
      {children}
      {show && (
        <div
          ref={cardRef}
          className="rich-hover-card"
          style={{ left: pos.x, top: pos.y }}
          onMouseEnter={() => clearTimeout(timer.current)}
          onMouseLeave={handleLeave}
        >
          {type === 'procedencia' && <ProcedenciaContent data={data} />}
          {type === 'paciente' && <PacienteContent data={data} />}
        </div>
      )}
    </span>
  )
}

function ProcedenciaContent({ data }) {
  return (
    <div className="rhc-body">
      <div className="rhc-title">{data.nombre}</div>
      <div className="rhc-stats">
        <div className="rhc-stat">
          <span className="rhc-stat-value">{data.countHoy}</span>
          <span className="rhc-stat-label">órdenes hoy</span>
        </div>
      </div>
    </div>
  )
}

function PacienteContent({ data }) {
  const age = calcAge(data.fechaNac)
  const sexLabel = data.sexo === 'M' ? 'Masculino' : data.sexo === 'F' ? 'Femenino' : data.sexo || '—'

  return (
    <div className="rhc-body">
      <div className="rhc-patient-header">
        <div className="rhc-patient-avatar">
          {(data.nombre || '?')[0].toUpperCase()}
        </div>
        <div>
          <div className="rhc-title">{data.nombre}</div>
          {data.cedula && <div className="rhc-subtitle">CI: {data.cedula}</div>}
        </div>
      </div>
      <div className="rhc-stats rhc-stats--grid">
        {age !== null && (
          <div className="rhc-stat">
            <span className="rhc-stat-value">{age}</span>
            <span className="rhc-stat-label">años</span>
          </div>
        )}
        <div className="rhc-stat">
          <span className="rhc-stat-value rhc-stat-value--sm">{sexLabel}</span>
          <span className="rhc-stat-label">sexo</span>
        </div>
        {data.telefono && (
          <div className="rhc-stat">
            <span className="rhc-stat-value rhc-stat-value--sm">{data.telefono}</span>
            <span className="rhc-stat-label">teléfono</span>
          </div>
        )}
        {data.email && (
          <div className="rhc-stat">
            <span className="rhc-stat-value rhc-stat-value--sm">{data.email}</span>
            <span className="rhc-stat-label">email</span>
          </div>
        )}
      </div>
    </div>
  )
}
