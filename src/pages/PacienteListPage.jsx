import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPacientes, getPacienteStats } from '../services/api'

export default function PacienteListPage() {
  const navigate = useNavigate()
  const [pacientes, setPacientes] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [filters, setFilters] = useState({
    nombre: '', apellido: '', ci: '', email: '', telefono: ''
  })
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [soloEmpresa, setSoloEmpresa] = useState(false)
  const [stats, setStats] = useState(null)
  const debounceRef = useRef(null)
  const searchIdRef = useRef(0)

  const search = useCallback(async (searchQ, advFilters, p = 1, opts = {}) => {
    const id = ++searchIdRef.current

    setLoading(true)
    try {
      const params = { page: p, limit: 25 }
      if (searchQ && searchQ.trim()) {
        params.q = searchQ.trim()
      } else {
        Object.entries(advFilters).forEach(([k, v]) => {
          if (v && v.trim()) params[k] = v.trim()
        })
      }
      if (opts.incluirInactivos) params.incluirInactivos = 'true'
      if (opts.soloEmpresa) params.empresa = 'true'
      const data = await getPacientes(params)
      if (id === searchIdRef.current) {
        setPacientes(data.pacientes || [])
        setTotal(data.total || 0)
        setPage(data.page || 1)
        setTotalPages(data.totalPages || 1)
      }
    } catch (e) {
      console.error('Error buscando pacientes:', e)
      if (id === searchIdRef.current) {
        setPacientes([])
        setTotal(0)
      }
    } finally {
      if (id === searchIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(q, filters, 1, { incluirInactivos, soloEmpresa })
    }, q.length === 0 ? 0 : 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [q, search, filters, incluirInactivos, soloEmpresa])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      search(q, filters, 1, { incluirInactivos, soloEmpresa })
    }
  }

  const handleAdvancedSearch = () => {
    search('', filters, 1, { incluirInactivos, soloEmpresa })
  }

  const clearFilters = () => {
    setQ('')
    setFilters({ nombre: '', apellido: '', ci: '', email: '', telefono: '' })
    setIncluirInactivos(false)
    setSoloEmpresa(false)
    search('', { nombre: '', apellido: '', ci: '', email: '', telefono: '' }, 1, {})
  }

  // Load global stats once on mount
  useEffect(() => {
    getPacienteStats().then(setStats).catch(err => console.error('Stats error:', err))
  }, [])

  const pct = (n, t) => t > 0 ? Math.round((n / t) * 100) : 0

  const calcAge = (fechaNac) => {
    if (!fechaNac) return '—'
    const born = new Date(fechaNac)
    const now = new Date()
    let age = now.getFullYear() - born.getFullYear()
    if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--
    return age
  }

  const goPage = (p) => search(q, filters, p, { incluirInactivos, soloEmpresa })

  return (
    <div className="ot-shell">
    <div className="ot-content">

      {/* ═══ Page Template — Brand Manual v3 ═══ */}
      <div className="page-tpl">

        {/* Header: titulo + search + boton */}
        <div className="page-tpl-header">
          <div className="page-tpl-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            Pacientes
          </div>
          <div className="page-tpl-actions">
            <div className="page-tpl-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar paciente..."
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              {loading && <span className="page-tpl-spinner" />}
              {q && (
                <button className="page-tpl-clear" onClick={clearFilters}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
            <button className="btn-brand btn-brand-primary" onClick={() => navigate('/pacientes/nuevo')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nuevo
            </button>
          </div>
        </div>

        {/* Filtros avanzados colapsable */}
        <div className="page-tpl-filters">
          <button className="page-tpl-filter-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filtros
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <span className="page-tpl-count">
            {total.toLocaleString()} pacientes
          </span>
        </div>

        {showAdvanced && (
          <div className="page-tpl-adv-filters">
            <div className="page-tpl-adv-row">
              <div className="page-tpl-field">
                <label>Nombre</label>
                <input value={filters.nombre} onChange={e => setFilters(f => ({ ...f, nombre: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdvancedSearch()} />
              </div>
              <div className="page-tpl-field">
                <label>Apellido</label>
                <input value={filters.apellido} onChange={e => setFilters(f => ({ ...f, apellido: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdvancedSearch()} />
              </div>
              <div className="page-tpl-field">
                <label>CI</label>
                <input value={filters.ci} onChange={e => setFilters(f => ({ ...f, ci: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdvancedSearch()} />
              </div>
              <div className="page-tpl-field">
                <label>Email</label>
                <input value={filters.email} onChange={e => setFilters(f => ({ ...f, email: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdvancedSearch()} />
              </div>
              <div className="page-tpl-field">
                <label>Telefono</label>
                <input value={filters.telefono} onChange={e => setFilters(f => ({ ...f, telefono: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdvancedSearch()} />
              </div>
            </div>
            <div className="page-tpl-adv-bottom">
              <label className="page-tpl-check">
                <input type="checkbox" checked={incluirInactivos} onChange={e => setIncluirInactivos(e.target.checked)} />
                Ver inactivos
              </label>
              <label className="page-tpl-check">
                <input type="checkbox" checked={soloEmpresa} onChange={e => setSoloEmpresa(e.target.checked)} />
                Solo empresa
              </label>
              <button className="btn-brand btn-brand-primary btn-brand-sm" onClick={handleAdvancedSearch}>Buscar</button>
              <button className="btn-brand btn-brand-ghost btn-brand-sm" onClick={clearFilters}>Limpiar</button>
            </div>
          </div>
        )}

        {/* ═══ Mini-Dashboard — Demographic Stats ═══ */}
        {stats && (
          <div className="pac-stats-grid">
            {/* Card 1: Total Pacientes */}
            <div className="pac-stat-card pac-stat-card--primary">
              <div className="pac-stat-icon pac-stat-icon--primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <span className="pac-stat-label">Total Pacientes</span>
              <span className="pac-stat-value">{stats.total.toLocaleString()}</span>
              <span className="pac-stat-sub">{stats.activos.toLocaleString()} activos</span>
            </div>

            {/* Card 2: Genero M/F con barra ratio */}
            <div className="pac-stat-card pac-stat-card--gender">
              <div className="pac-stat-icon pac-stat-icon--gender">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 00-16 0"/>
                </svg>
              </div>
              <span className="pac-stat-label">Género</span>
              <div className="pac-stat-gender-row">
                <span className="pac-stat-gender-m">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="10" cy="14" r="5"/><line x1="19" y1="5" x2="13.6" y2="10.4"/><polyline points="19 5 19 10"/><polyline points="14 5 19 5"/></svg>
                  {stats.masculino.toLocaleString()}
                </span>
                <span className="pac-stat-gender-f">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg>
                  {stats.femenino.toLocaleString()}
                </span>
              </div>
              <div className="pac-stat-ratio-bar">
                <div className="pac-stat-ratio-m" style={{ width: `${pct(stats.masculino, stats.masculino + stats.femenino)}%` }} />
                <div className="pac-stat-ratio-f" style={{ width: `${pct(stats.femenino, stats.masculino + stats.femenino)}%` }} />
              </div>
              <div className="pac-stat-ratio-labels">
                <span>{pct(stats.masculino, stats.masculino + stats.femenino)}% M</span>
                <span>{pct(stats.femenino, stats.masculino + stats.femenino)}% F</span>
              </div>
            </div>

            {/* Card 3: Menores de edad */}
            <div className="pac-stat-card pac-stat-card--minors">
              <div className="pac-stat-icon pac-stat-icon--minors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="7" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
                </svg>
              </div>
              <span className="pac-stat-label">Menores de edad</span>
              <span className="pac-stat-value">{stats.menores.toLocaleString()}</span>
              <span className="pac-stat-sub">{pct(stats.menores, stats.total)}% del total</span>
            </div>

            {/* Card 4: VIP */}
            <div className="pac-stat-card pac-stat-card--vip">
              <div className="pac-stat-icon pac-stat-icon--vip">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <span className="pac-stat-label">VIP</span>
              <span className="pac-stat-value">{stats.vip.toLocaleString()}</span>
              <span className="pac-stat-sub">{stats.empresa.toLocaleString()} empresa</span>
            </div>
          </div>
        )}

        {/* Body: tabla result-group-table del manual de marca */}
        <div className="page-tpl-body">
          <table className="rg-table">
            <thead>
              <tr>
                <th style={{ width: '10%' }}>CI</th>
                <th style={{ width: '28%' }}>Nombre</th>
                <th style={{ width: '5%' }}>Edad</th>
                <th style={{ width: '14%' }}>Telefono</th>
                <th style={{ width: '18%' }}>Email</th>
                <th style={{ width: '6%' }}>OTs</th>
                <th style={{ width: '10%' }}>Estado</th>
                <th style={{ width: '9%', textAlign: 'center' }}>Accion</th>
              </tr>
            </thead>
            <tbody>
              {pacientes.map(p => (
                <tr key={p.id} className={p.vip ? 'row-vip' : ''} onClick={() => navigate(`/pacientes/${p.id}`)}>
                  <td className="cell-mono">{p.ci_paciente || '—'}</td>
                  <td className="cell-name">
                    {p.apellido}{p.apellido_segundo ? ' ' + p.apellido_segundo : ''}, {p.nombre}
                    {p.vip && <span className="badge-pill badge-pill-gold lab-tip" data-tip="Paciente VIP">VIP</span>}
                    {p.empresa && <span className="badge-pill badge-pill-blue lab-tip" data-tip="Paciente de empresa (convenio)">E</span>}
                    {p.activo === false && <span className="badge-pill badge-pill-red">Inactivo</span>}
                  </td>
                  <td className="cell-dim">{calcAge(p.fecha_nacimiento)} / {p.sexo}</td>
                  <td className="cell-mono">{p.telefono_celular || p.telefono || '—'}</td>
                  <td className="cell-dim cell-ellipsis">{p.email || '—'}</td>
                  <td className="cell-center">
                    <span className="notif-count-static">{p.total_ordenes}</span>
                  </td>
                  <td>
                    <span className={`badge-sm ${p.activo === false ? 'badge-sm-error' : 'badge-sm-success'}`}>
                      <span className="badge-dot" />
                      {p.activo === false ? 'Inactivo' : 'Activo'}
                    </span>
                  </td>
                  <td className="cell-center">
                    <div className="cell-actions-row">
                      <button className="action-icon lab-tip" data-tip="Ver paciente" onClick={(e) => { e.stopPropagation(); navigate(`/pacientes/${p.id}`) }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 16 16 12 12 8"/>
                          <line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                      </button>
                      <button className="action-icon lab-tip" data-tip="Editar paciente" onClick={(e) => { e.stopPropagation(); navigate(`/pacientes/${p.id}/editar`) }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && pacientes.length === 0 && (
                <tr><td colSpan="8" className="cell-empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-4)' }}>No se encontraron pacientes</div>
                  <div style={{ fontSize: 11, color: 'var(--text-5, #b0b8c4)', marginTop: 4 }}>Intenta con otro término de búsqueda o ajusta los filtros</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination — glass bar */}
        {totalPages > 1 && (
          <div className="page-tpl-pagination">
            <button className="pg-btn" disabled={page <= 1} onClick={() => goPage(page - 1)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            {(() => {
              const btns = []
              let s = 1, e = totalPages
              if (totalPages > 7) {
                if (page <= 4) { s = 1; e = 7 }
                else if (page >= totalPages - 3) { s = totalPages - 6; e = totalPages }
                else { s = page - 3; e = page + 3 }
              }
              for (let i = s; i <= e; i++) {
                btns.push(<button key={i} className={`pg-btn ${i === page ? 'active' : ''}`} onClick={() => goPage(i)}>{i}</button>)
              }
              return btns
            })()}
            <button className="pg-btn" disabled={page >= totalPages} onClick={() => goPage(page + 1)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <span className="pg-info">
              {(page - 1) * 25 + 1}-{Math.min(page * 25, total)} de {total.toLocaleString()}
            </span>
          </div>
        )}
      </div>

    </div>
    </div>
  )
}
