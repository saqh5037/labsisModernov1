import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTrazabilidadCheckpoints, deleteCheckpoint } from '../services/api'

const STATUS_COLORS = {
  REC: '#22c55e', TRA: '#f59e0b', ACM: '#3b82f6', DIS: '#8b5cf6',
  PRO: '#06b6d4', ALM: '#64748b', NOE: '#ef4444', DES: '#dc2626',
}

export default function CheckPointList() {
  const navigate = useNavigate()
  const [checkpoints, setCheckpoints] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    getTrazabilidadCheckpoints()
      .then(setCheckpoints)
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = checkpoints.filter(cp => {
    const q = search.toLowerCase()
    return !q || (cp.descripcion || '').toLowerCase().includes(q) || (cp.ip || '').toLowerCase().includes(q)
  })

  const handleDelete = async (id, descripcion) => {
    if (!confirm(`Eliminar checkpoint "${descripcion}"?`)) return
    try {
      await deleteCheckpoint(id)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="cp-admin">
      <div className="cp-admin-header">
        <button className="cp-admin-back" onClick={() => navigate('/trazabilidad')} title="Volver">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1>Administracion de CheckPoints</h1>
        <button className="cp-btn-new" onClick={() => navigate('/admin/checkpoints/new')}>+ Nuevo</button>
      </div>

      <div className="cp-search">
        <input
          type="text"
          placeholder="Buscar por descripcion o IP..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#94a3b8' }}>Cargando...</p>
      ) : (
        <table className="cp-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Descripcion</th>
              <th>IP</th>
              <th>Status</th>
              <th>Flags</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>Sin resultados</td></tr>
            ) : filtered.map(cp => (
              <tr key={cp.id}>
                <td>{cp.orden ?? '—'}</td>
                <td>{cp.descripcion}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{cp.ip || '—'}</td>
                <td>
                  <span className="cp-dot" style={{ background: STATUS_COLORS[cp.status_codigo] || '#94a3b8' }} />
                  {cp.status_codigo || '—'}
                </td>
                <td>
                  {cp.muestra_recibida && <span className="cp-flag">MR</span>}
                  {cp.entrada_lab && <span className="cp-flag cp-flag--green">EL</span>}
                  {cp.ingreso_automatico_lista_trabajo && <span className="cp-flag cp-flag--amber">Auto</span>}
                  {cp.reporte && <span className="cp-flag">RPT</span>}
                </td>
                <td>
                  <div className="cp-actions">
                    <button className="cp-action-btn" title="Editar" onClick={() => navigate(`/admin/checkpoints/${cp.id}/edit`)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button className="cp-action-btn cp-action-btn--danger" title="Eliminar" onClick={() => handleDelete(cp.id, cp.descripcion)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
