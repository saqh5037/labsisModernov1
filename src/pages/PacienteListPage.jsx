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
      const limit = 10
      const params = { page: p, limit }
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

        {/* ═══ Mini-Dashboard — Compact Stats Strip ═══ */}
        {stats && (
          <div className="pac-stats-strip">
            <div className="pac-strip-item pac-strip--primary">
              <span className="pac-strip-num">{stats.total.toLocaleString()}</span>
              <span className="pac-strip-label">pacientes</span>
              <span className="pac-strip-sub">{stats.activos.toLocaleString()} activos</span>
            </div>
            <div className="pac-strip-sep" />
            <div className="pac-strip-item pac-strip--gender">
              <span className="pac-strip-num pac-strip-m">♂ {stats.masculino.toLocaleString()}</span>
              <span className="pac-strip-num pac-strip-f">♀ {stats.femenino.toLocaleString()}</span>
              <div className="pac-strip-ratio">
                <div className="pac-strip-ratio-m" style={{ width: `${pct(stats.masculino, stats.masculino + stats.femenino)}%` }} />
                <div className="pac-strip-ratio-f" style={{ width: `${pct(stats.femenino, stats.masculino + stats.femenino)}%` }} />
              </div>
            </div>
            <div className="pac-strip-sep" />
            <div className="pac-strip-item pac-strip--minors">
              <span className="pac-strip-num">{stats.menores.toLocaleString()}</span>
              <span className="pac-strip-label">menores</span>
              <span className="pac-strip-sub">{pct(stats.menores, stats.total)}%</span>
            </div>
            <div className="pac-strip-sep" />
            <div className="pac-strip-item pac-strip--vip">
              <span className="pac-strip-num">{stats.vip.toLocaleString()}</span>
              <span className="pac-strip-label">VIP</span>
              <span className="pac-strip-sub">{stats.empresa.toLocaleString()} empresa</span>
            </div>
          </div>
        )}

        {/* Body: tabla result-group-table del manual de marca */}
        <div className="page-tpl-body">
          <table className="rg-table">
            <thead>
              <tr>
                <th style={{ width: '12%' }}>CI</th>
                <th style={{ width: '30%' }}>Nombre</th>
                <th style={{ width: '6%' }}>Edad</th>
                <th style={{ width: '14%' }}>Teléfono</th>
                <th style={{ width: '16%' }}>Email</th>
                <th style={{ width: '5%' }}>OTs</th>
                <th style={{ width: '9%' }}>Estado</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Acción</th>
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
              {(page - 1) * 10 + 1}-{Math.min(page * 10, total)} de {total.toLocaleString()}
            </span>
          </div>
        )}
      </div>

    </div>
    </div>
  )
}
