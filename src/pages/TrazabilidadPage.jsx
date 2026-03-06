import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTrazabilidadCheckpoints, getTrazabilidadCheckpointsByIp } from '../services/api'

/* ── Icons ── */
const IcoScan = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <line x1="7" y1="12" x2="17" y2="12" />
  </svg>
)

const IcoArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
)

const STATUS_COLORS = {
  REC: '#22c55e', TRA: '#f59e0b', ACM: '#3b82f6', DIS: '#8b5cf6',
  PRO: '#06b6d4', ALM: '#64748b', NOE: '#ef4444', DES: '#dc2626',
}

export default function TrazabilidadPage() {
  const navigate = useNavigate()
  const [checkpoints, setCheckpoints] = useState([])
  const [ipCheckpoints, setIpCheckpoints] = useState([])
  const [clientIp, setClientIp] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('all') // 'all' | 'ip'

  useEffect(() => {
    Promise.all([
      getTrazabilidadCheckpoints(),
      getTrazabilidadCheckpointsByIp().catch(() => ({ ip: '', checkpoints: [] }))
    ]).then(([all, byIp]) => {
      setCheckpoints(all)
      setIpCheckpoints(byIp.checkpoints)
      setClientIp(byIp.ip)
      // Default to IP view if there are IP-specific checkpoints
      if (byIp.checkpoints.length > 0) setViewMode('ip')
      setLoading(false)
    })
  }, [])

  const displayList = viewMode === 'ip' ? ipCheckpoints : checkpoints

  return (
    <div className="traz-page">
      <div className="traz-header">
        <div className="traz-header__title">
          <span className="traz-header__icon"><IcoScan /></span>
          <h1>Trazabilidad de Muestras</h1>
        </div>
        <div className="traz-header__tabs">
          <button
            className={`traz-tab ${viewMode === 'all' ? 'traz-tab--active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            Todos ({checkpoints.length})
          </button>
          {ipCheckpoints.length > 0 && (
            <button
              className={`traz-tab ${viewMode === 'ip' ? 'traz-tab--active' : ''}`}
              onClick={() => setViewMode('ip')}
            >
              Mi estación ({ipCheckpoints.length})
            </button>
          )}
        </div>
        {clientIp && <span className="traz-header__ip">IP: {clientIp}</span>}
      </div>

      {loading ? (
        <div className="traz-loading">Cargando checkpoints...</div>
      ) : displayList.length === 0 ? (
        <div className="traz-empty">
          {viewMode === 'ip'
            ? `No hay checkpoints configurados para la IP ${clientIp}`
            : 'No hay checkpoints configurados en el sistema'}
        </div>
      ) : (
        <div className="traz-grid">
          {displayList.map(cp => (
            <button
              key={cp.id}
              className="traz-card"
              onClick={() => navigate(`/trazabilidad/${cp.id}`)}
            >
              <div className="traz-card__header">
                <span className="traz-card__name">{cp.descripcion}</span>
                {cp.entrada_lab && <span className="traz-card__badge">Entrada Lab</span>}
              </div>
              {cp.comentario && (
                <p className="traz-card__comment">{cp.comentario}</p>
              )}
              <div className="traz-card__footer">
                <div className="traz-card__status">
                  <span
                    className="traz-card__status-dot"
                    style={{ background: STATUS_COLORS[cp.status_codigo] || '#94a3b8' }}
                  />
                  <span>{cp.status_nombre || '—'}</span>
                  <span className="traz-card__status-code">{cp.status_codigo || ''}</span>
                </div>
                <span className="traz-card__arrow"><IcoArrow /></span>
              </div>
              {cp.ip && <span className="traz-card__ip">{cp.ip}</span>}
              <div className="traz-card__flags">
                {cp.muestra_recibida && <span className="traz-flag">Recibida</span>}
                {cp.ingreso_automatico_lista_trabajo && <span className="traz-flag">Auto-cola</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
