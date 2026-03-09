import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Select from 'react-select'
import AsyncSelect from 'react-select/async'
import { glassStyles, glassTheme } from '../styles/reactSelectGlass'
import DatePickerGlass from '../components/DatePickerGlass'
import DashboardProgress from '../components/DashboardProgress'
import DashboardStatusChart from '../components/DashboardStatusChart'
import DashboardAreaProgress from '../components/DashboardAreaProgress'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { useNavigate } from 'react-router-dom'
import { getOrdenes, getDashboard, getStatus, getProcedencias, getAreas, getUsuarios, getServiciosMedicos, searchPruebas, getLaboratorio, getCheckpoints } from '../services/api'
import { ORDER_STATUS } from '../constants/status'

/* ── Icons ── */
const Ico = ({ d, vb = '0 0 24 24', w = 1.8 }) => (
  <svg viewBox={vb} fill="none" stroke="currentColor" strokeWidth={w}
    strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
)

const IcoSearch   = () => <Ico d={<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>} w={2} />
const IcoFilter   = () => <Ico d={<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>} />
const IcoCalc     = () => <Ico d={<><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></>} />
const IcoBag      = () => <Ico d={<><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>} />
const IcoChart    = () => <Ico d={<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>} />
const IcoSend     = () => <Ico d={<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>} />
const IcoDownload = () => <Ico d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>} />
const IcoEye      = () => <Ico d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>} />
const IcoMail     = () => <Ico d={<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>} />
const IcoCopy     = () => <Ico d={<><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>} />
const IcoPrint    = () => <Ico d={<><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>} />
const IcoBarcode  = () => <Ico d={<><path d="M3 5v14M7 5v14M11 5v14M15 5v8M19 5v14M15 17v2"/></>} />
const IcoEdit     = () => <Ico d={<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>} />
const IcoPrintR   = () => <Ico d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>} />
const IcoClipboard= () => <Ico d={<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></>} />
const IcoChevron  = ({ dir = 'up' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
    {dir === 'up' ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
  </svg>
)

const STATUS_MAP = ORDER_STATUS

const StatusDot = ({ statusId, color }) => {
  const info = STATUS_MAP[statusId]
  const c = color || info?.color || '#94a3b8'
  const icon = info?.icon || 'dot'

  if (icon === 'x') return (
    <svg width="12" height="12" viewBox="0 0 12 12" style={{ verticalAlign: 'middle' }}>
      <line x1="2" y1="2" x2="10" y2="10" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="10" y1="2" x2="2" y2="10" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  )
  if (icon === 'arrows') return (
    <svg width="14" height="12" viewBox="0 0 14 12" style={{ verticalAlign: 'middle' }}>
      <polyline points="1,6 5,2 5,4 9,4 9,2 13,6 9,10 9,8 5,8 5,10 1,6" fill={c} stroke="none"/>
    </svg>
  )
  if (icon === 'check') return (
    <svg width="12" height="12" viewBox="0 0 12 12" style={{ verticalAlign: 'middle' }}>
      <circle cx="6" cy="6" r="5" fill={c}/>
      <polyline points="3.5,6 5.5,8 8.5,4" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  return <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:c, verticalAlign:'middle' }}/>
}

/* Today's date as yyyy-mm-dd */
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const TODAY = todayStr()

const INIT = {
  numero: '', cedula: '', numFactura: '',
  estado: [],  // multi-select: array of { value, label }
  fechaRange: { from: TODAY, to: TODAY },
  area: [],    // multi-select
  prueba: null,
  procedencia: '', servicioMedico: '', numIngreso: '', usuario: '',
  checkpoint: '',  // checkpoint ID (filtro por escaneo de muestras)
  orden: 'desc',
  emailFilter: 0, // 0=off, 1=sent, 2=not-sent
}
const LIMIT = 10

const hv = (val) => val ? 'has-value' : ''

/* Build API params from filters object */
function buildParams(filters) {
  const p = {}
  if (filters.numero) p.numero = filters.numero
  if (filters.cedula) p.cedula = filters.cedula
  if (filters.numFactura) p.numFactura = filters.numFactura
  if (filters.estado.length > 0) p.estado = filters.estado.map(s => s.value).join(',')
  if (filters.fechaRange?.from) p.fechaDesde = filters.fechaRange.from
  if (filters.fechaRange?.to) p.fechaHasta = filters.fechaRange.to
  if (filters.area.length > 0) p.area = filters.area.map(a => a.value).join(',')
  if (filters.prueba) p.prueba = filters.prueba.value
  if (filters.procedencia) p.procedencia = filters.procedencia
  if (filters.servicioMedico) p.servicioMedico = filters.servicioMedico
  if (filters.numIngreso) p.numIngreso = filters.numIngreso
  if (filters.usuario) p.usuario = filters.usuario
  if (filters.checkpoint) p.checkpoint = filters.checkpoint
  p.orden = filters.orden
  if (filters.emailFilter === 1) p.emailEnviado = 'si'
  else if (filters.emailFilter === 2) p.emailEnviado = 'no'
  return p
}

/* ── Skeleton rows ── */
const SkeletonRow = ({ extraCols = 0 }) => (
  <tr className="skeleton-row">
    {[90,70,80,140,80,30,...Array(extraCols).fill(20),160].map((w,i) => (
      <td key={i}><div className="skel" style={{ width: w }} /></td>
    ))}
  </tr>
)

export default function Ordenes() {
  const [filters,  setFilters]  = useState(INIT)
  const [rows,     setRows]     = useState([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [dashboard, setDashboard] = useState(null)
  const [areaStatuses, setAreaStatuses] = useState(null)
  const { toast, setToast } = useToast()

  // Lab config (for dynamic labels)
  const [labConfig, setLabConfig] = useState(null)

  // Catalogs
  const [estados,       setEstados]       = useState([])
  const [procedencias,  setProcedencias]  = useState([])
  const [areas,         setAreas]         = useState([])
  const [usuarios,      setUsuarios]      = useState([])
  const [serviciosMed,  setServiciosMed]  = useState([])
  const [checkpointList, setCheckpointList] = useState([])

  const [rowH,     setRowH]     = useState(null)
  const scrollRef  = useRef(null)
  const navigate = useNavigate()

  // Use ref to access latest filters without causing re-renders
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  useEffect(() => {
    getStatus().then(setEstados).catch(() => {})
    getProcedencias().then(setProcedencias).catch(() => {})
    getAreas().then(setAreas).catch(() => {})
    getUsuarios().then(setUsuarios).catch(() => {})
    getServiciosMedicos().then(setServiciosMed).catch(() => {})
    getCheckpoints().then(setCheckpointList).catch(() => {})
    getLaboratorio().then(setLabConfig).catch(() => {})
  }, [])

  // Dynamic labels & visibility based on lab config
  const ciLabel = labConfig?.configuracion_especial === 'Lapi' ? 'Nro. Registro' : 'Cédula'
  const ciPlaceholder = labConfig?.configuracion_especial === 'Lapi' ? '125421' : 'V-12345678'
  const showCi = labConfig?.ot_list_ci_paciente !== false
  const showProcedencia = labConfig?.ot_list_procedencia !== false
  const showServicioMed = labConfig?.ot_list_servicio_medico !== false
  const showNumIngreso = labConfig?.ot_list_num_ingreso !== false
  const showEmail = labConfig?.show_send_mail !== false

  /* react-select options */
  const estadoOpts = useMemo(() => estados.map(s => ({
    value: s.id,
    label: s.status,
    color: STATUS_MAP[s.id]?.color || s.color || '#94a3b8',
  })), [estados])
  const procedenciaOpts = useMemo(() => procedencias.map(p => ({ value: p.id, label: p.nombre })), [procedencias])
  const areaOpts = useMemo(() => areas.map(a => ({ value: a.id, label: a.nombre })), [areas])
  const usuarioOpts = useMemo(() => usuarios.map(u => ({ value: u.id, label: u.nombre })), [usuarios])
  const servicioMedOpts = useMemo(() => serviciosMed.map(s => ({ value: s.id, label: s.nombre })), [serviciosMed])

  /* Async prueba loader */
  const loadPruebas = useCallback(
    (inputValue) =>
      new Promise((resolve) => {
        if (inputValue.length < 2) return resolve([])
        setTimeout(() => {
          const areaParam = filtersRef.current.area.length > 0
            ? filtersRef.current.area.map(a => a.value).join(',')
            : undefined
          searchPruebas(inputValue, areaParam)
            .then(results => resolve(results.map(p => ({ value: p.id, label: p.nombre, area: p.area_nombre }))))
            .catch(() => resolve([]))
        }, 250)
      }),
    []
  )

  /* Row height calculation */
  useEffect(() => {
    if (!scrollRef.current || rows.length === 0) return
    const recalc = () => {
      const el = scrollRef.current
      if (!el) return
      const thead = el.querySelector('thead')
      const available = el.clientHeight - (thead?.offsetHeight || 0)
      setRowH(Math.floor(available / LIMIT))
    }
    recalc()
    const ro = new ResizeObserver(recalc)
    ro.observe(scrollRef.current)
    return () => ro.disconnect()
  }, [rows.length])

  const setF = useCallback((k, v) => setFilters(f => ({ ...f, [k]: v })), [])

  /* Core search function — reads from filtersRef to avoid stale closures */
  const doSearch = useCallback(async (p = 1, overrideFilters) => {
    const currentFilters = overrideFilters || filtersRef.current
    const apiParams = buildParams(currentFilters)
    setLoading(true)
    setSearched(true)
    try {
      const [data, dash] = await Promise.all([
        getOrdenes({ ...apiParams, page: p, limit: LIMIT }),
        getDashboard(apiParams),
      ])
      setRows(data.ordenes || [])
      setTotal(data.total || 0)
      setPage(p)
      setDashboard(dash)
      setAreaStatuses(data.areaStatuses || null)
    } catch (err) {
      console.error('Error en búsqueda:', err)
      setRows([])
      setDashboard(null)
      setToast({ type: 'error', message: 'Error al buscar órdenes' })
    } finally {
      setLoading(false)
    }
  }, [])

  /* Auto-search on mount with today's date */
  useEffect(() => {
    doSearch(1)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const clear = () => {
    setFilters(INIT)
    setRows([]); setSearched(false); setTotal(0); setDashboard(null); setAreaStatuses(null)
  }

  const totalPages = Math.ceil(total / LIMIT)

  /* Sort toggle — triggers search */
  const toggleSort = () => {
    const newOrden = filtersRef.current.orden === 'desc' ? 'asc' : 'desc'
    setFilters(f => ({ ...f, orden: newOrden }))
    const updated = { ...filtersRef.current, orden: newOrden }
    doSearch(1, updated)
  }

  /* Email filter tri-state toggle */
  const toggleEmail = () => {
    const next = (filtersRef.current.emailFilter + 1) % 3
    setF('emailFilter', next)
  }
  const emailState = filters.emailFilter === 0 ? 'off' : filters.emailFilter === 1 ? 'sent' : 'not-sent'

  /* Selected areas for dynamic columns */
  const selectedAreas = filters.area // array of { value, label }

  /* Dashboard clicks → filter table */
  const handleStatusBarClick = (statusId) => {
    const opt = estadoOpts.find(o => o.value === statusId)
    if (opt) {
      const updated = { ...filtersRef.current, estado: [opt] }
      setFilters(updated)
      doSearch(1, updated)
    }
  }

  const handleProgressClick = (statusIds) => {
    const opts = estadoOpts.filter(o => statusIds.includes(o.value))
    if (opts.length) {
      const updated = { ...filtersRef.current, estado: opts }
      setFilters(updated)
      doSearch(1, updated)
    }
  }

  return (
    <div className="ordenes-content">

      {/* ── Local toolbar — solo botón crear ── */}
      <div className="ordenes-toolbar">
        <div className="nav-tools">
          <div className="nav-tool nav-tool-crear lab-tip" data-tip="Nueva Orden de Trabajo" onClick={() => navigate('/ordenes/crear')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
        </div>
      </div>

      {/* ── 70/30 LAYOUT ── */}
      <div className="ordenes-layout">

        {/* ── LEFT PANEL (main) ── */}
        <div className="ordenes-main">

          {/* TÍTULO */}
          <div className="ot-list-section anim d1">
            <span className="ot-panel-title">Órdenes de Trabajo</span>
          </div>

          {/* ── FILTROS NIVEL 1 ── */}
          <div className="ordenes-filters-primary anim d2">
            <div className={`ordenes-fields-wrap ${showMore ? 'ordenes-fields--open' : ''}`}>
              <div className="fld fld-sm">
                <label className={hv(filters.numero)}>N. Orden</label>
                <input type="text" placeholder="2603020001"
                  className={hv(filters.numero)}
                  value={filters.numero}
                  onChange={e => setF('numero', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch(1)}
                />
              </div>
              {showCi && (
              <div className="fld fld-sm">
                <label className={hv(filters.cedula)}>{ciLabel}</label>
                <input type="text" placeholder={ciPlaceholder}
                  className={hv(filters.cedula)}
                  value={filters.cedula}
                  onChange={e => setF('cedula', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch(1)}
                />
              </div>
              )}
              <div className="fld fld-lg">
                <label className={filters.estado.length > 0 ? 'has-value' : ''}>Estado(s)</label>
                <Select styles={glassStyles} theme={glassTheme} options={estadoOpts}
                  value={filters.estado}
                  onChange={opts => setF('estado', opts || [])}
                  placeholder="Todos" isMulti isClearable isSearchable={false}
                  menuPortalTarget={document.body}
                  formatOptionLabel={opt => (
                    <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                      <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background: opt.color, flexShrink:0 }} />
                      <span>{opt.label}</span>
                    </div>
                  )}
                />
              </div>
              <div className="fld fld-lg">
                <label className={filters.fechaRange?.from ? 'has-value' : ''}>Fecha</label>
                <DatePickerGlass
                  mode="range"
                  value={filters.fechaRange}
                  onChange={v => setF('fechaRange', v)}
                  placeholder="Rango de fechas"
                />
              </div>
              <div className="fld fld-md">
                <label className={filters.area.length > 0 ? 'has-value' : ''}>Área</label>
                <Select styles={glassStyles} theme={glassTheme} options={areaOpts}
                  value={filters.area} onChange={opts => setF('area', opts || [])}
                  placeholder="Todas" isMulti isClearable closeMenuOnSelect={false}
                  noOptionsMessage={() => 'Sin áreas'}
                  menuPortalTarget={document.body}
                />
              </div>

              {checkpointList.length > 0 && (
              <div className="fld fld-md">
                <label className={hv(filters.checkpoint)}>CheckPoint</label>
                <select
                  className={`ot-filter-select ${hv(filters.checkpoint)}`}
                  value={filters.checkpoint}
                  onChange={e => setF('checkpoint', e.target.value)}
                >
                  <option value="">Todos</option>
                  {checkpointList.map(cp => (
                    <option key={cp.id} value={cp.id}>{cp.descripcion}</option>
                  ))}
                </select>
              </div>
              )}

              {/* Email toggle */}
              {showEmail && (
              <div className="email-toggle" data-state={emailState}
                title={filters.emailFilter === 0 ? 'Filtro email: off' : filters.emailFilter === 1 ? 'Solo email enviado' : 'Solo email NO enviado'}
                onClick={toggleEmail}>
                <IcoMail />
              </div>
              )}
            </div>

            <div className="ordenes-actions-wrap">
              <button className="btn btn-primary" onClick={() => doSearch(1)} disabled={loading}>
                <IcoSearch />
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
              <button className="btn-toggle-filters" onClick={() => setShowMore(!showMore)}>
                {showMore ? 'Ocultar' : 'Filtros'}
              </button>
              <button className="btn-ghost" onClick={clear}>Limpiar</button>
            </div>
          </div>

          {/* ── FILTROS NIVEL 2 (colapsable) ── */}
          {showMore && (
            <div className="ordenes-filters-secondary">
              {showProcedencia && (
              <div className="fld">
                <label className={hv(filters.procedencia)}>Procedencia</label>
                <Select styles={glassStyles} theme={glassTheme} options={procedenciaOpts}
                  value={procedenciaOpts.find(o => String(o.value) === String(filters.procedencia)) || null}
                  onChange={opt => setF('procedencia', opt ? opt.value : '')}
                  placeholder="Todas" isClearable isSearchable
                  noOptionsMessage={() => 'Sin resultados'}
                  menuPortalTarget={document.body}
                />
              </div>
              )}
              {showServicioMed && (
              <div className="fld">
                <label className={hv(filters.servicioMedico)}>Servicio médico</label>
                <Select styles={glassStyles} theme={glassTheme} options={servicioMedOpts}
                  value={servicioMedOpts.find(o => String(o.value) === String(filters.servicioMedico)) || null}
                  onChange={opt => setF('servicioMedico', opt ? opt.value : '')}
                  placeholder="Todos" isClearable
                  noOptionsMessage={() => 'Sin resultados'}
                  menuPortalTarget={document.body}
                />
              </div>
              )}
              <div className="fld">
                <label className={filters.prueba ? 'has-value' : ''}>Prueba</label>
                <AsyncSelect styles={glassStyles} theme={glassTheme}
                  value={filters.prueba} onChange={opt => setF('prueba', opt)}
                  loadOptions={loadPruebas} placeholder="Buscar prueba..." isClearable
                  noOptionsMessage={({ inputValue }) => inputValue.length < 2 ? 'Escribe 2+ caracteres' : 'Sin resultados'}
                  loadingMessage={() => 'Buscando...'}
                  menuPortalTarget={document.body}
                  formatOptionLabel={opt => (
                    <div className="async-option-row">
                      <span>{opt.label}</span>
                      {opt.area && <span className="prueba-area-badge">{opt.area}</span>}
                    </div>
                  )}
                />
              </div>
              <div className="fld">
                <label className={hv(filters.usuario)}>Usuario</label>
                <Select styles={glassStyles} theme={glassTheme} options={usuarioOpts}
                  value={usuarioOpts.find(o => String(o.value) === String(filters.usuario)) || null}
                  onChange={opt => setF('usuario', opt ? opt.value : '')}
                  placeholder="Todos" isClearable
                  noOptionsMessage={() => 'Sin resultados'}
                  menuPortalTarget={document.body}
                />
              </div>
              {showNumIngreso && (
              <div className="fld">
                <label className={hv(filters.numIngreso)}>Núm. ingreso</label>
                <input type="text" placeholder="00000"
                  className={hv(filters.numIngreso)}
                  value={filters.numIngreso}
                  onChange={e => setF('numIngreso', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch(1)}
                />
              </div>
              )}
              <div className="fld">
                <label className={hv(filters.numFactura)}>Núm. factura</label>
                <input type="text" placeholder="000-00000"
                  className={hv(filters.numFactura)}
                  value={filters.numFactura}
                  onChange={e => setF('numFactura', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch(1)}
                />
              </div>
            </div>
          )}

          {/* ── RESULTS ── */}
          {(searched || rows.length > 0) && (
            <div className="ot-list-results anim d3">
              <div className="ot-list-results-head">
                <span className="ot-section-label" key={page + '-' + total}>Órdenes de Trabajo</span>
                {!loading && total > 0 && (
                  <span className="ot-list-count">
                    <strong>{total.toLocaleString()}</strong> registros · pág. {page} / {totalPages}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="table-scroll">
                  <table className="data-table">
                    <tbody>{[...Array(8)].map((_, i) => <SkeletonRow key={i} extraCols={selectedAreas.length} />)}</tbody>
                  </table>
                </div>
              ) : rows.length === 0 ? (
                <div className="empty-state">
                  <IcoClipboard />
                  <p className="empty-title">Sin resultados</p>
                  <p className="empty-sub">Ajusta los filtros e intenta de nuevo</p>
                </div>
              ) : (
                <>
                  <div className="table-scroll" ref={scrollRef}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: selectedAreas.length ? '10%' : '11%' }}>
                          <span className="sort-toggle" onClick={toggleSort}>
                            N. de Orden
                            <IcoChevron dir={filters.orden === 'asc' ? 'up' : 'down'} />
                          </span>
                        </th>
                        <th style={{ width:'10%' }}>Procedencia</th>
                        <th style={{ width: selectedAreas.length ? '8%' : '10%' }}>Servicio</th>
                        <th style={{ width: selectedAreas.length ? '20%' : '25%' }}>Paciente</th>
                        <th style={{ width: selectedAreas.length ? '11%' : '13%' }}>
                          <span className="sort-toggle" onClick={toggleSort}>
                            Fecha
                            <IcoChevron dir={filters.orden === 'asc' ? 'up' : 'down'} />
                          </span>
                        </th>
                        <th style={{ width:'7%' }}>Estado</th>
                        {selectedAreas.map(a => (
                          <th key={a.value} className="th-area-status" title={a.label}>
                            {a.label.length > 8 ? a.label.slice(0, 7) + '.' : a.label}
                          </th>
                        ))}
                        <th style={{ textAlign:'center', width: selectedAreas.length ? '15%' : '18%' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => {
                        const sid = r.status_id ?? r.statusId
                        const info = STATUS_MAP[sid] || {}
                        return (
                          <tr key={r.numero} style={rowH ? { height: rowH } : undefined}>
                            <td>
                              <a className="order-link" href="#" onClick={e => {
                                e.preventDefault()
                                const f = filtersRef.current
                                const qs = new URLSearchParams()
                                if (f.area?.length) qs.set('area', f.area.map(a => a.value).join(','))
                                if (f.fechaRange?.from) qs.set('fechaDesde', f.fechaRange.from)
                                if (f.fechaRange?.to) qs.set('fechaHasta', f.fechaRange.to)
                                const qStr = qs.toString()
                                navigate(`/ordenes/${r.numero}/lab${qStr ? '?' + qStr : ''}`)
                              }}>{r.numero}</a>
                            </td>
                            <td className="cell-proc" title={r.procedencia || ''}>{r.procedencia || <span className="cell-muted">—</span>}</td>
                            <td className="cell-proc" title={r.servicioMedico || ''}>{r.servicioMedico || <span className="cell-muted">—</span>}</td>
                            <td className="cell-name">{r.paciente || '—'}</td>
                            <td className="cell-date">
                              {r.fecha
                                ? new Date(r.fecha).toLocaleString('es-MX', {
                                    day:'2-digit', month:'2-digit', year:'2-digit',
                                    hour:'2-digit', minute:'2-digit'
                                  })
                                : <span className="cell-muted">—</span>}
                            </td>
                            <td>
                              <span className="status-chip" style={{ color: r.color || info.color || '#94a3b8' }}>
                                <StatusDot statusId={sid} color={r.color} />
                                <span style={{ marginLeft: 4 }}>{r.status || info.label || '—'}</span>
                              </span>
                            </td>
                            {selectedAreas.map(a => {
                              const as = areaStatuses?.[r.id]?.[a.value]
                              if (!as) return <td key={a.value} className="td-area-status"><span className="cell-muted">—</span></td>
                              return (
                                <td key={a.value} className="td-area-status">
                                  <div className="area-status-cell" title={`${as.status} · ${as.progreso ?? 0}%${as.entregada ? ' · Entregada' : ''}${as.alarma ? ' · Alarma' : ''}`}>
                                    <StatusDot statusId={as.status_id} color={as.color} />
                                    {as.entregada && <span className="area-delivered-badge" title="Entregada">E</span>}
                                    {as.alarma && <span className="area-alarm-badge" title="Alarma val. ref.">!</span>}
                                  </div>
                                </td>
                              )
                            })}
                            <td>
                              <div className="action-icons">
                                <div className="action-icon ai-view lab-tip"   data-tip="Ver orden" onClick={() => navigate(`/ordenes/${r.numero}`)}><IcoEye /></div>
                                <div className="action-icon ai-bar lab-tip"    data-tip="Código de barras" onClick={() => navigate(`/ordenes/${r.numero}`)}><IcoBarcode /></div>
                                <div className="action-icon ai-edit lab-tip"   data-tip="Analizar" onClick={() => {
                                  const f = filtersRef.current
                                  const qs = new URLSearchParams()
                                  if (f.area?.length) qs.set('area', f.area.map(a => a.value).join(','))
                                  if (f.fechaRange?.from) qs.set('fechaDesde', f.fechaRange.from)
                                  if (f.fechaRange?.to) qs.set('fechaHasta', f.fechaRange.to)
                                  const qStr = qs.toString()
                                  navigate(`/ordenes/${r.numero}/lab${qStr ? '?' + qStr : ''}`)
                                }}><IcoEdit /></div>
                                <div className={`action-icon ai-result lab-tip${r.status_id >= 4 ? '' : ' ai-disabled'}`} data-tip={r.status_id >= 4 ? 'Descargar resultados PDF' : 'Sin resultados validados'} onClick={() => { if (r.status_id >= 4) window.open(`/api/ordenes/${r.numero}/resultados-pdf`, '_blank') }}><IcoDownload /></div>
                                <div className={`action-icon ai-print lab-tip${r.status_id >= 4 ? '' : ' ai-disabled'}`} data-tip={r.status_id >= 4 ? 'Imprimir resultados' : 'Sin resultados validados'} onClick={() => { if (r.status_id >= 4) window.open(`/ordenes/${r.numero}/resultados`, '_blank') }}><IcoPrint /></div>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="ot-list-pagination">
                      <button className="pag-btn" disabled={page <= 1} onClick={() => doSearch(1)} title="Primera página">&laquo;</button>
                      <button className="pag-btn" disabled={page <= 1} onClick={() => doSearch(page - 1)}>&lsaquo; Anterior</button>
                      <span className="pag-info">Página {page} de {totalPages}</span>
                      <button className="pag-btn" disabled={page >= totalPages} onClick={() => doSearch(page + 1)}>Siguiente &rsaquo;</button>
                      <button className="pag-btn" disabled={page >= totalPages} onClick={() => doSearch(totalPages)} title="Última página">&raquo;</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Estado inicial (solo si no ha buscado) */}
          {!searched && rows.length === 0 && (
            <div className="empty-state anim d3">
              <IcoClipboard />
              <p className="empty-title">Ingresa filtros y presiona <span className="text-blue">Buscar</span></p>
              <p className="empty-sub">Usa los filtros de fecha, estado o área para encontrar órdenes</p>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL (dashboard) ── */}
        <aside className="ordenes-dashboard">
          <DashboardProgress data={dashboard?.progreso} onClickStatus={handleProgressClick} />
          <DashboardStatusChart data={dashboard?.porStatus} onClickBar={handleStatusBarClick} />
          <DashboardAreaProgress data={dashboard?.porArea} />
        </aside>

      </div>

      <Toast toast={toast} />
    </div>
  )
}
