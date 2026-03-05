import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Select from 'react-select'
import AsyncSelect from 'react-select/async'
import { glassStyles, glassTheme } from '../styles/reactSelectGlass'
import DatePickerGlass from '../components/DatePickerGlass'
import { useNavigate } from 'react-router-dom'
import { getOrdenes, getStatus, getProcedencias, getAreas, getUsuarios, getServiciosMedicos, searchPruebas } from '../services/api'

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
const IcoX        = () => <Ico d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} w={2} />
const IcoClipboard= () => <Ico d={<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></>} />

/* ── Status logic ── */
const getStatusColor = (s = '') => {
  const l = s.toLowerCase()
  if (l.includes('valid') || l.includes('finaliz') || l.includes('entregad')) return 'green'
  if (l.includes('pendient') || l.includes('proceso'))                          return 'amber'
  if (l.includes('cancel') || l.includes('error') || l.includes('alarm'))      return 'red'
  if (l.includes('ingres') || l.includes('registr') || l.includes('recibid'))  return 'blue'
  return 'gray'
}
const getStatusLabel = (s = '') => {
  const l = s.toLowerCase()
  if (l.includes('valid'))   return 'Validado'
  if (l.includes('finaliz')) return 'Finalizado'
  if (l.includes('entregad'))return 'Entregado'
  if (l.includes('pendient'))return 'Pendiente'
  if (l.includes('proceso')) return 'En proceso'
  if (l.includes('alarm'))   return 'Alarma'
  if (l.includes('cancel'))  return 'Cancelado'
  if (l.includes('ingres'))  return 'Ingresado'
  if (l.includes('recibid')) return 'Recibido'
  return s || '—'
}

const INIT = {
  numero: '', cedula: '', numFactura: '', numInicial: '', numFinal: '',
  estado: '', fechaDesde: '', fechaHasta: '', area: '', prueba: '',
  procedencia: '', servicioMedico: '', numIngreso: '', usuario: '',
  orden: 'desc', enviarEmail: '', emailEnviado: '', segmento: ''
}
const AREA_INIT = []   // multi-select: array de ids
const PRUEBA_INIT = null // autocomplete: { id, nombre } o null
const LIMIT = 10

/* helper: clases has-value para inputs y labels */
const hv = (val) => val ? 'has-value' : ''

/* ── Skeleton rows ── */
const SkeletonRow = () => (
  <tr className="skeleton-row">
    {[90,70,80,140,80,30,160].map((w,i) => (
      <td key={i}><div className="skel" style={{ width: w }} /></td>
    ))}
  </tr>
)

export default function Ordenes() {
  // Auth is handled by AppLayout (navbar, footer, sidebar)
  const [filters,  setFilters]  = useState(INIT)
  const [rows,     setRows]     = useState([])
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const [estados,       setEstados]       = useState([])
  const [procedencias,  setProcedencias]  = useState([])
  const [areas,         setAreas]         = useState([])
  const [usuarios,      setUsuarios]      = useState([])
  const [serviciosMed,  setServiciosMed]  = useState([])
  const [selectedAreas, setSelectedAreas] = useState(AREA_INIT)
  const [selectedPrueba, setSelectedPrueba] = useState(PRUEBA_INIT)
  const [rowH,          setRowH]          = useState(null)
  const scrollRef  = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    getStatus().then(setEstados).catch(() => {})
    getProcedencias().then(setProcedencias).catch(() => {})
    getAreas().then(setAreas).catch(() => {})
    getUsuarios().then(setUsuarios).catch(() => {})
    getServiciosMedicos().then(setServiciosMed).catch(() => {})
  }, [])

  /* Opciones react-select */
  const estadoOpts = useMemo(() => estados.map(s => ({ value: s.id, label: s.status })), [estados])
  const procedenciaOpts = useMemo(() => procedencias.map(p => ({ value: p.id, label: p.nombre })), [procedencias])
  const areaOpts = useMemo(() => areas.map(a => ({ value: a.id, label: a.nombre })), [areas])
  const usuarioOpts = useMemo(() => usuarios.map(u => ({ value: u.id, label: u.nombre })), [usuarios])
  const servicioMedOpts = useMemo(() => serviciosMed.map(s => ({ value: s.id, label: s.nombre })), [serviciosMed])
  const ordenOpts = [{ value: 'desc', label: 'Descendente' }, { value: 'asc', label: 'Ascendente' }]
  const siNoOpts = [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]

  /* Carga async de pruebas para AsyncSelect */
  const loadPruebas = useCallback(
    (inputValue) =>
      new Promise((resolve) => {
        if (inputValue.length < 2) return resolve([])
        setTimeout(() => {
          const areaParam = selectedAreas.length > 0 ? selectedAreas.map(a => a.value).join(',') : undefined
          searchPruebas(inputValue, areaParam)
            .then(results => resolve(results.map(p => ({ value: p.id, label: p.nombre, area: p.area_nombre }))))
            .catch(() => resolve([]))
        }, 250)
      }),
    [selectedAreas]
  )

  /* Calcula el alto exacto de cada fila para que llenen el espacio */
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

  const search = useCallback(async (p = 1) => {
    setLoading(true); setSearched(true)
    try {
      const params = { ...filters, page: p, limit: LIMIT }
      if (selectedAreas.length > 0) params.area = selectedAreas.map(a => a.value).join(',')
      if (selectedPrueba) params.prueba = selectedPrueba.value
      const d = await getOrdenes(params)
      setRows(d.ordenes || [])
      setTotal(d.total || 0)
      setPage(p)
    } catch { setRows([]) }
    finally   { setLoading(false) }
  }, [filters, selectedAreas, selectedPrueba])

  const clear = () => {
    setFilters(INIT); setRows([]); setSearched(false); setTotal(0)
    setSelectedAreas(AREA_INIT); setSelectedPrueba(null)
  }

  const totalPages = Math.ceil(total / LIMIT)
  const hasFilters = Object.entries(filters).some(([k, v]) => v !== '' && v !== INIT[k]) || selectedAreas.length > 0 || selectedPrueba

  /* Contadores de estado de la página actual */
  const statusCounts = rows.reduce((acc, r) => {
    const c = r.statusColor || getStatusColor(r.status || '')
    acc[c] = (acc[c] || 0) + 1
    return acc
  }, {})

  return (
    <div className="ordenes-content">

      {/* ── Local toolbar ── */}
      <div className="ordenes-toolbar">
        <div className="nav-tools">
          <div className="nav-tool nav-tool-crear" title="Crear Orden de Trabajo" onClick={() => navigate('/ordenes/crear')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <div className="nav-tool" title="Filtros avanzados"><IcoFilter /></div>
          <div className="nav-tool" title="Calculadora"><IcoCalc /></div>
          <div className="nav-tool" title="Facturación"><IcoBag /></div>
          <div className="nav-tool" title="BsF. Ingresos">
            <span className="nav-tool-bsf">BsF.</span>
          </div>
          <div className="nav-tool" title="Estadísticas"><IcoChart /></div>
          <div className="nav-tool" title="Enviar"><IcoSend /></div>
          <div className="nav-tool" title="Descargar"><IcoDownload /></div>
        </div>
      </div>

        {/* ── TÍTULO + FILTROS (flotantes, sin caja) ── */}
        <div className="ot-list-section anim d1">
          <span className="ot-panel-title">Órdenes de Trabajo</span>
        </div>
        <div className="ot-list-filters anim d2">
            {/* Fila 1 */}
            <div className="fg fg-6">
              <div className="fld">
                <label className={hv(filters.numero)}>Número de orden</label>
                <input type="text" placeholder="2603020001"
                  className={hv(filters.numero)}
                  value={filters.numero}
                  onChange={e => setF('numero', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search(1)}
                />
              </div>
              <div className="fld">
                <label className={hv(filters.cedula)}>Cédula</label>
                <input type="text" placeholder="V-12345678"
                  className={hv(filters.cedula)}
                  value={filters.cedula}
                  onChange={e => setF('cedula', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && search(1)}
                />
              </div>
              <div className="fld">
                <label className={hv(filters.numFactura)}>Núm. de factura</label>
                <input type="text" placeholder="000-00000"
                  className={hv(filters.numFactura)}
                  value={filters.numFactura}
                  onChange={e => setF('numFactura', e.target.value)}
                />
              </div>
              <div className="fld">
                <label className={hv(filters.numInicial)}>Núm. inicial</label>
                <input type="text" placeholder="Desde"
                  className={hv(filters.numInicial)}
                  value={filters.numInicial}
                  onChange={e => setF('numInicial', e.target.value)}
                />
              </div>
              <div className="fld">
                <label className={hv(filters.numFinal)}>Núm. final</label>
                <input type="text" placeholder="Hasta"
                  className={hv(filters.numFinal)}
                  value={filters.numFinal}
                  onChange={e => setF('numFinal', e.target.value)}
                />
              </div>
              <div className="fld">
                <label className={hv(filters.estado)}>Estado</label>
                <Select styles={glassStyles} theme={glassTheme} options={estadoOpts}
                  value={estadoOpts.find(o => String(o.value) === String(filters.estado)) || null}
                  onChange={opt => setF('estado', opt ? opt.value : '')}
                  placeholder="Todos los estados" isClearable isSearchable={false}
                  menuPortalTarget={document.body}
                />
              </div>
            </div>

            {/* Fila 2 */}
            <div className="fg fg-6">
              <div className="fld">
                <label className={hv(filters.fechaDesde)}>Fecha desde</label>
                <DatePickerGlass value={filters.fechaDesde} onChange={v => setF('fechaDesde', v)} placeholder="dd/mm/aaaa" />
              </div>
              <div className="fld">
                <label className={hv(filters.fechaHasta)}>Fecha hasta</label>
                <DatePickerGlass value={filters.fechaHasta} onChange={v => setF('fechaHasta', v)} placeholder="dd/mm/aaaa" />
              </div>
              <div className="fld">
                <label className={selectedAreas.length > 0 ? 'has-value' : ''}>Área</label>
                <Select styles={glassStyles} theme={glassTheme} options={areaOpts}
                  value={selectedAreas} onChange={opts => setSelectedAreas(opts || [])}
                  placeholder="Todas las áreas" isMulti isClearable closeMenuOnSelect={false}
                  noOptionsMessage={() => 'Sin áreas'}
                  menuPortalTarget={document.body}
                />
              </div>
              <div className="fld">
                <label className={selectedPrueba ? 'has-value' : ''}>Prueba</label>
                <AsyncSelect styles={glassStyles} theme={glassTheme}
                  value={selectedPrueba} onChange={opt => setSelectedPrueba(opt)}
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
                <label className={hv(filters.procedencia)}>Procedencia</label>
                <Select styles={glassStyles} theme={glassTheme} options={procedenciaOpts}
                  value={procedenciaOpts.find(o => String(o.value) === String(filters.procedencia)) || null}
                  onChange={opt => setF('procedencia', opt ? opt.value : '')}
                  placeholder="Todas" isClearable isSearchable
                  noOptionsMessage={() => 'Sin resultados'}
                  menuPortalTarget={document.body}
                />
              </div>
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
            </div>

            {/* Fila 3 */}
            <div className="fg fg-6">
              <div className="fld">
                <label className={hv(filters.numIngreso)}>Núm. ingreso</label>
                <input type="text" placeholder="00000"
                  className={hv(filters.numIngreso)}
                  value={filters.numIngreso}
                  onChange={e => setF('numIngreso', e.target.value)}
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
              <div className="fld">
                <label className={hv(filters.orden)}>Orden</label>
                <Select styles={glassStyles} theme={glassTheme} options={ordenOpts}
                  value={ordenOpts.find(o => o.value === filters.orden) || null}
                  onChange={opt => setF('orden', opt ? opt.value : 'desc')}
                  placeholder="Orden" isSearchable={false}
                  menuPortalTarget={document.body}
                />
              </div>
              <div className="fld">
                <label className={hv(filters.enviarEmail)}>Enviar email</label>
                <Select styles={glassStyles} theme={glassTheme} options={siNoOpts}
                  value={siNoOpts.find(o => o.value === filters.enviarEmail) || null}
                  onChange={opt => setF('enviarEmail', opt ? opt.value : '')}
                  placeholder="Todos" isClearable isSearchable={false}
                  menuPortalTarget={document.body}
                />
              </div>
              <div className="fld">
                <label className={hv(filters.emailEnviado)}>Email enviado</label>
                <Select styles={glassStyles} theme={glassTheme} options={siNoOpts}
                  value={siNoOpts.find(o => o.value === filters.emailEnviado) || null}
                  onChange={opt => setF('emailEnviado', opt ? opt.value : '')}
                  placeholder="Todos" isClearable isSearchable={false}
                  menuPortalTarget={document.body}
                />
              </div>
              <div className="fld">
                <label className={hv(filters.segmento)}>Segmento</label>
                <Select styles={glassStyles} theme={glassTheme} options={[]}
                  value={null} onChange={opt => setF('segmento', opt ? opt.value : '')}
                  placeholder="Todos" isClearable isSearchable={false}
                  noOptionsMessage={() => 'Sin segmentos'}
                  menuPortalTarget={document.body}
                />
              </div>
            </div>

          <div className="ot-list-actions">
            <button className="btn btn-primary" onClick={() => search(1)} disabled={loading}>
              <IcoSearch />
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
            <button className="btn-ghost" onClick={clear}>Limpiar filtros</button>
          </div>
        </div>

        {/* ── RESULTS (floating, sin caja) ── */}
        {(searched || rows.length > 0) && (
          <div className="ot-list-results anim d3">
            <div className="ot-list-results-head">
              <span className="ot-section-label" key={page + '-' + total}>Órdenes de Trabajo</span>
              {!loading && total > 0 && (
                <span className="ot-list-count">
                  {total.toLocaleString()} registros · pág. {page} / {totalPages}
                </span>
              )}
            </div>

            {loading ? (
              <div className="table-scroll">
                <table className="data-table">
                  <tbody>{[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}</tbody>
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
                      <th style={{ width:'11%' }}>N. de Orden</th>
                      <th style={{ width:'10%' }}>Procedencia</th>
                      <th style={{ width:'10%' }}>Servicio</th>
                      <th style={{ width:'25%' }}>Paciente</th>
                      <th style={{ width:'13%' }}>Fecha</th>
                      <th style={{ width:'8%' }}>Estado</th>
                      <th style={{ textAlign:'center', width:'23%' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const dot = r.statusColor || getStatusColor(r.status || '')
                      return (
                        <tr key={r.numero} style={rowH ? { height: rowH } : undefined}>
                          <td>
                            <a className="order-link" href="#" onClick={e => { e.preventDefault(); navigate(`/ordenes/${r.numero}`) }}>{r.numero}</a>
                          </td>
                          <td className="cell-proc">{r.procedencia || <span className="cell-muted">—</span>}</td>
                          <td className="cell-proc">{r.servicioMedico || <span className="cell-muted">—</span>}</td>
                          <td className="cell-name">{r.paciente || '—'}</td>
                          <td className="cell-date">
                            {r.fecha
                              ? new Date(r.fecha).toLocaleString('es-VE', {
                                  day:'2-digit', month:'2-digit', year:'2-digit',
                                  hour:'2-digit', minute:'2-digit'
                                })
                              : <span className="cell-muted">—</span>}
                          </td>
                          <td>
                            <span className={`status-chip chip-${dot}`}>
                              {getStatusLabel(r.status || '')}
                            </span>
                          </td>
                          <td>
                            <div className="action-icons">
                              <div className="action-icon ai-view"   title="Ver orden" onClick={() => navigate(`/ordenes/${r.numero}`)}><IcoEye /></div>
                              <div className="action-icon ai-mail"   title="Enviar email"><IcoMail /></div>
                              <div className="action-icon ai-copy"   title="Copiar número" onClick={() => { navigator.clipboard.writeText(r.numero); }}><IcoCopy /></div>
                              <div className="action-icon ai-print"  title="Imprimir" onClick={() => window.open(`/ordenes/${r.numero}/print`, '_blank')}><IcoPrint /></div>
                              <div className="action-icon ai-bar"    title="Código de barras" onClick={() => navigate(`/ordenes/${r.numero}`)}><IcoBarcode /></div>
                              <div className="action-icon ai-bsf"    title="Factura BsF.">BsF.</div>
                              <div className="action-icon ai-edit"   title="Reportar resultados" onClick={() => {
                                const areaQs = selectedAreas?.length ? `?area=${selectedAreas.map(a => a.value).join(',')}` : ''
                                navigate(`/ordenes/${r.numero}/lab${areaQs}`)
                              }}><IcoEdit /></div>
                              <div className="action-icon ai-result" title="Ver resultados" onClick={() => navigate(`/ordenes/${r.numero}`)}><IcoPrintR /></div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>

                {/* Pagination — simplificada */}
                {totalPages > 1 && (
                  <div className="ot-list-pagination">
                    <button className="pag-btn" disabled={page <= 1} onClick={() => search(page - 1)}>‹ Anterior</button>
                    <span className="pag-info">Página {page} de {totalPages}</span>
                    <button className="pag-btn" disabled={page >= totalPages} onClick={() => search(page + 1)}>Siguiente ›</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Estado inicial */}
        {!searched && rows.length === 0 && (
          <div className="empty-state anim d3">
            <IcoClipboard />
            <p className="empty-title">Ingresa filtros y presiona <span className="text-blue">Buscar</span></p>
            <p className="empty-sub">455,204 registros · Laboratorio EG · 2014 — hoy</p>
          </div>
        )}

      {/* end of content */}
    </div>
  )
}
