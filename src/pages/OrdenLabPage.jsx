import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getOrdenLab, saveResultados, getHistorico, getLabQueue, getLabAreas, corregirResultado, getCorrecciones, getMe, getVBOrdenArea, saveVBResultados } from '../services/api'
import { useValidationMode } from '../hooks/useValidationMode'

/* ── SVG Icons ── */
const Ico = ({ d, vb = '0 0 24 24', w = 1.8, size = 16 }) => (
  <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
)
const IcoBack = () => <Ico d={<><polyline points="15 18 9 12 15 6"/></>} w={2} />
const IcoNote = () => <Ico d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" size={12} w={2} />
const IcoCheck = () => <Ico d={<><polyline points="20 6 9 17 4 12"/></>} size={14} w={2.5} />
const IcoX = () => <Ico d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} size={14} w={2.5} />
const IcoSave = () => <Ico d={<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>} size={14} />
const IcoList = () => <Ico d={<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>} size={14} />
const IcoEye = () => <Ico d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>} size={14} />
const IcoEdit = () => <Ico d={<><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></>} size={12} w={2} />
const IcoChart = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 12 4 7 8 9 11 4 15 6" />
  </svg>
)
const IcoFilter = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)

/* ── Roles que pueden operar en Lab ── */
const ROLES_LAB = ['ADM', 'ANA', 'COORD', 'DTTEC']

/* ── Utilities ── */
const calcAge = (bd) => {
  if (!bd) return '—'
  const b = new Date(bd), n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return `${a} años`
}
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' }) : ''

/* ── Numeric formatting ── */
const PREFIXES = ['<=', '>=', '<', '>']
const parseNumInput = (raw) => {
  const s = String(raw || '').trim()
  for (const p of PREFIXES) {
    if (s.startsWith(p)) return { prefix: p, number: s.slice(p.length).trim() }
  }
  return { prefix: '', number: s }
}
const formatNumericValue = (value, formato) => {
  if (!value && value !== 0) return value
  const num = parseFloat(value)
  if (isNaN(num)) return String(value)
  if (!formato) return String(value)
  // "0" = entero, "0.0" = 1 decimal, "0.00" = 2, "#.##" = 2 optional, etc.
  if (!/\./.test(formato)) return Math.round(num).toString()
  const match = formato.match(/\.([#0]+)/)
  const decimals = match ? match[1].length : 2
  if (formato.includes('#')) return parseFloat(num.toFixed(decimals)).toString()
  return num.toFixed(decimals)
}
const composeNumDisplay = (prefix, number) => {
  if (!prefix) return number
  return `${prefix} ${number}`
}

/* ── Clinical flag calculation ── */
const calcFlag = (valor, ref) => {
  if (valor === '' || valor == null || !ref || (ref.min == null && ref.max == null)) return null
  const v = parseFloat(valor)
  if (isNaN(v)) return null
  if (ref.critico_max != null && v > ref.critico_max) return { flag: 'C', label: 'Crítico Alto', critical: true }
  if (ref.critico_min != null && v < ref.critico_min) return { flag: 'C', label: 'Crítico Bajo', critical: true }
  if (ref.max != null && v > ref.max) return { flag: 'H', label: 'Alto' }
  if (ref.min != null && v < ref.min) return { flag: 'L', label: 'Bajo' }
  return { flag: 'N', label: 'Normal' }
}

/* ── Flag badge component ── */
const FlagBadge = ({ flag }) => {
  if (!flag) return <span className="lab-flag lab-flag-empty">—</span>
  return (
    <span className={`lab-flag lab-flag-${flag.flag}`} title={flag.label}>
      {flag.flag}
    </span>
  )
}

/* ── Reference bar ── */
const RefBar = ({ valor, min, max }) => {
  if (min == null || max == null) return null
  const range = max - min
  const v = parseFloat(valor)
  const pct = isNaN(v) ? null : Math.min(100, Math.max(0, ((v - min) / range) * 100))
  return (
    <div className="lab-ref-bar">
      <div className="lab-ref-fill" />
      {pct !== null && <div className="lab-ref-marker" style={{ left: `${pct}%` }} />}
    </div>
  )
}

/* ── Sparkline component ── */
const Sparkline = ({ values, hasAlarm }) => {
  if (!values || values.length < 2) return null
  const w = 80, h = 28, pad = 4
  const nums = values.map(v => parseFloat(v.valor)).filter(n => !isNaN(n))
  if (nums.length < 2) return null
  const min = Math.min(...nums), max = Math.max(...nums)
  const range = max - min || 1
  const points = nums.map((v, i) => {
    const x = pad + (i / (nums.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return { x, y }
  })
  const lineColor = hasAlarm ? '#dc2626' : '#3b82f6'
  const fillColor = hasAlarm ? 'rgba(220,38,38,0.08)' : 'rgba(59,130,246,0.08)'
  const areaPath = points.map(p => `${p.x},${p.y}`).join(' ')
  const areaFull = `${pad},${h - pad} ${areaPath} ${w - pad},${h - pad}`
  const last = points[points.length - 1]
  return (
    <svg className="lab-sparkline" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polygon points={areaFull} fill={fillColor} />
      <polyline
        className="lab-sparkline-line"
        points={areaPath}
        stroke={lineColor}
      />
      <circle cx={last.x} cy={last.y} r={3}
        fill={lineColor} stroke="#fff" strokeWidth={1.5} />
    </svg>
  )
}

/* ── Collapsible sidebar card ── */
const CollapsibleCard = ({ title, defaultOpen = false, className = '', children }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`lab-side-card ${open ? '' : 'lab-side-collapsed'} ${className}`}>
      <div className="lab-side-title lab-side-toggle" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className={`lab-chevron ${open ? 'open' : ''}`}>▸</span>
      </div>
      {open && children}
    </div>
  )
}

/* ── Ripple effect ── */
function addRipple(e) {
  const btn = e.currentTarget
  const rect = btn.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const ripple = document.createElement('span')
  ripple.className = 'ot-ripple'
  ripple.style.width = ripple.style.height = size + 'px'
  ripple.style.left = (e.clientX - rect.left - size / 2) + 'px'
  ripple.style.top = (e.clientY - rect.top - size / 2) + 'px'
  btn.appendChild(ripple)
  setTimeout(() => ripple.remove(), 600)
}

/* ── Inline: Validation Panel (left sidebar in validation mode) ── */
const barColor = (pct) => pct >= 100 ? 'var(--success, #059669)' : pct >= 50 ? 'var(--success, #059669)' : pct > 0 ? 'var(--orange, #ea580c)' : 'var(--border-l, #e0e0e0)'
const fmtEst = (s) => s >= 60 ? `~${Math.round(s / 60)} min` : `~${s}s`

const ValidationPanel = ({ validation, onSelect }) => {
  if (!validation) return null
  const { areas, areaId, setAreaId, fechaDesde, setFechaDesde,
    fechaHasta, setFechaHasta, filtroValidada, setFiltroValidada,
    buscando, handleBuscar, muestras, muestraActualId, searchFilter, setSearchFilter,
    filteredMuestras, visitados, validadosCount, totalMuestras, pctValidado, avgTime, pendientes, estimadoSeg } = validation

  return (
    <div className="lab-queue-panel">
      {/* Header */}
      <div className="lab-queue-header">
        <span className="lab-queue-title">Validación por Área</span>
        {totalMuestras > 0 && <span className="lab-queue-count">{pendientes} pend.</span>}
      </div>

      {/* Filters */}
      <div className="lab-vb-filters">
        <div className="lab-vb-filter-row">
          <select className="lab-vb-filter-input" value={areaId}
            onChange={e => setAreaId(e.target.value)}
            autoFocus={!areaId}
            style={{ fontWeight: 600 }}>
            <option value="">— Área —</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
        <div className="lab-vb-filter-row">
          <input type="date" className="lab-vb-filter-input" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} title="Desde" />
          <input type="date" className="lab-vb-filter-input" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} title="Hasta" />
        </div>
        <div className="lab-vb-filter-row">
          <select className="lab-vb-filter-input" value={filtroValidada} onChange={e => setFiltroValidada(e.target.value)}>
            <option value="0">Todas</option>
            <option value="1">Validadas</option>
            <option value="2">Pendientes</option>
          </select>
          <button className="lab-queue-filter-apply" onClick={handleBuscar} disabled={buscando || !areaId} style={{ flex: 1 }}>
            {buscando ? '...' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Search */}
      {muestras.length > 0 && (
        <div className="lab-vb-search">
          <input className="lab-vb-filter-input" style={{ width: '100%' }} placeholder="Filtrar barcode/paciente..."
            value={searchFilter} onChange={e => setSearchFilter(e.target.value)} />
        </div>
      )}

      {/* Muestra list */}
      <div className="lab-queue-list">
        {filteredMuestras.map(m => {
          const isActive = muestraActualId === m.muestra_id
          const isValidated = m.area_status_id === 4
          const isVisited = visitados.has(m.muestra_id)
          const pct = m.pruebas_total ? Math.round(m.pruebas_validadas / m.pruebas_total * 100) : 0
          return (
            <div key={m.muestra_id}
              className={`lab-queue-item ${isActive ? 'active' : ''} ${isValidated ? 'vb-muestra-validated' : ''} ${isVisited && !isActive ? 'vb-muestra-visited' : ''}`}
              onClick={() => onSelect(m)}>
              <div className="lab-queue-item-top">
                <span className="lab-queue-pac" title={m.paciente_nombre}>{m.paciente_nombre}</span>
                {m.stat && <span className="lab-tag lab-tag-stat" title="STAT">S</span>}
              </div>
              <div className="lab-queue-item-bot">
                <span className="lab-queue-ord">{m.ot_numero}</span>
                <span className="vb-dot" style={{ background: m.area_status_color || '#ccc' }} />
                <span className="lab-queue-pct">{m.pruebas_validadas}/{m.pruebas_total} <span className="lab-queue-pct-sub">({pct}%)</span></span>
              </div>
              <div className="lab-queue-bar">
                <div className="lab-queue-bar-fill" style={{ width: `${pct}%`, background: barColor(pct) }} />
              </div>
            </div>
          )
        })}
        {muestras.length === 0 && !buscando && (
          <div className="lab-queue-empty">
            {areaId ? 'Sin resultados para estos filtros' : 'Selecciona un área para comenzar'}
          </div>
        )}
        {buscando && (
          <div className="lab-queue-empty">Buscando muestras...</div>
        )}
      </div>

      {/* Metrics — Progreso del Día */}
      {totalMuestras > 0 && (
        <div className="lab-vb-metrics">
          <div className="vb-metric">
            <div className="vb-metric-header">
              <span className="vb-metric-label">Progreso</span>
              <span className="vb-metric-progress-value">{validadosCount}/{totalMuestras}</span>
            </div>
            <div className="vb-progress vb-progress-green"><div className="vb-progress-fill" style={{ width: `${pctValidado}%` }} /></div>
            <div className="vb-metric-footer">
              <span>{pctValidado}% validado</span>
              <span>{pendientes} pendientes</span>
            </div>
          </div>
          <div className="vb-metric-row">
            <div className="vb-metric vb-metric-col">
              <span className="vb-metric-label">Promedio</span>
              <span className="vb-metric-value-sm">{avgTime > 0 ? `${avgTime}s` : '—'}</span>
            </div>
            <div className="vb-metric vb-metric-col">
              <span className="vb-metric-label">Estimado</span>
              <span className="vb-metric-value-sm">{estimadoSeg > 0 ? fmtEst(estimadoSeg) : '—'}</span>
            </div>
            <div className="vb-metric vb-metric-col">
              <span className="vb-metric-label">Vistas</span>
              <span className="vb-metric-value-sm">{visitados.size}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrdenLabPage() {
  const { numero } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isValidation = !numero
  const validation = useValidationMode(isValidation)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!isValidation)
  const [activeArea, setActiveArea] = useState(null)
  const [dirty, setDirty] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  // Histórico
  const [historico, setHistorico] = useState({})
  const [histOpen, setHistOpen] = useState(new Set())
  const [histLoading, setHistLoading] = useState(new Set())

  // Observaciones por área
  const [obsArea, setObsArea] = useState({})

  // Notas por prueba
  const [notaOpen, setNotaOpen] = useState(new Set())

  // Cola de órdenes pendientes
  const [queue, setQueue] = useState([])
  const [queueLoading, setQueueLoading] = useState(false)
  const [queueFilters, setQueueFilters] = useState({
    area: searchParams.get('area') || '',
    fechaDesde: '', fechaHasta: '',
    transmitido: '', estado: ''
  })
  const [showQueueFilters, setShowQueueFilters] = useState(!!searchParams.get('area'))
  const [labAreas, setLabAreas] = useState([])

  // Usuario autenticado y permisos
  const [userInfo, setUserInfo] = useState(null)
  const canLab = userInfo?.roles?.some(r => ROLES_LAB.includes(r)) || false

  // Modal de corrección
  const [correccionModal, setCorreccionModal] = useState(null) // {poId, prueba, valorActual}
  const [correccionForm, setCorreccionForm] = useState({ valor_new: '', observacion: '', razon_correccion: '' })
  const [correccionSaving, setCorreccionSaving] = useState(false)
  const [correcciones, setCorrecciones] = useState({}) // {poId: [{valor_old, valor_new, ...}]}

  // Load data (normal mode only)
  useEffect(() => {
    if (isValidation) return
    setLoading(true)
    getOrdenLab(numero)
      .then(d => {
        setData(d)
        if (d.areas?.length) setActiveArea(Number(d.areas[0].id))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [numero, isValidation])

  // Validation mode: load VB data by OT number + areaId (no re-select)
  const loadVBData = useCallback(async (otNumero, areaId) => {
    setLoading(true)
    setDirty({})
    try {
      const d = await getVBOrdenArea(otNumero, areaId)
      setData(d)
      if (d.areas?.length) setActiveArea(Number(d.areas[0].id))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Validation mode: select muestra + load data
  const loadValidationOrden = useCallback(async (muestra) => {
    if (!validation) return
    const target = validation.selectMuestra(muestra)
    if (!target) return
    await loadVBData(target.numero, target.areaId)
  }, [validation, loadVBData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Validation mode: keyboard navigation (↑↓←→)
  useEffect(() => {
    if (!isValidation || !validation) return
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        const t = validation.goNext()
        if (t) loadVBData(t.numero, t.areaId)
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const t = validation.goPrev()
        if (t) loadVBData(t.numero, t.areaId)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isValidation, validation, loadVBData])

  // Load user info
  useEffect(() => {
    getMe().then(d => setUserInfo(d.user)).catch(() => {})
  }, [])

  // Load queue with filters
  const loadQueue = useCallback((filters) => {
    const f = filters || queueFilters
    const clean = Object.fromEntries(Object.entries(f).filter(([, v]) => v))
    setQueueLoading(true)
    getLabQueue(clean).then(setQueue).catch(() => setQueue([])).finally(() => setQueueLoading(false))
  }, [queueFilters])

  useEffect(() => { loadQueue() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load areas for queue filter dropdown
  useEffect(() => {
    getLabAreas().then(r => setLabAreas(r.data || [])).catch(() => {})
  }, [])

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // Value resolution
  const getVal = (po) => dirty[po.id]?.valor ?? po.resultado ?? ''
  const getValidado = (po) => dirty[po.id]?.validado ?? (po.status_id === 4 || po.status_id === 7)
  const getNota = (po) => dirty[po.id]?.nota ?? ''

  const setResultado = (poId, valor) => {
    setDirty(prev => ({ ...prev, [poId]: { ...prev[poId], valor } }))
  }

  const toggleValidado = (poId, current) => {
    setDirty(prev => ({ ...prev, [poId]: { ...prev[poId], validado: !current } }))
  }

  const setNota = (poId, nota) => {
    setDirty(prev => ({ ...prev, [poId]: { ...prev[poId], nota } }))
  }

  const getMenorMayor = (po) => dirty[po.id]?.menor_mayor ?? po.menor_mayor ?? ''
  const setMenorMayor = (poId, mm) => {
    setDirty(prev => ({ ...prev, [poId]: { ...prev[poId], menor_mayor: mm } }))
  }

  // Evaluate CAL formula from sibling prueba values (cross-area)
  const calcFormula = (po) => {
    if (!po.formula?.raw || !data?.areas) return null
    let expr = po.formula.raw
    const allPruebas = data.areas.flatMap(a => a.pruebas)
    for (const v of (po.formula.variables || [])) {
      const sibling = allPruebas.find(p => p.prueba_id === v.id)
      if (!sibling) return null
      const sibVal = getVal(sibling)
      if (!sibVal || isNaN(parseFloat(sibVal))) return null
      expr = expr.replace(new RegExp(`\\$${v.id}\\$`, 'g'), sibVal)
    }
    try {
      const result = new Function('return ' + expr)()
      if (isNaN(result) || !isFinite(result)) return null
      return po.formato ? formatNumericValue(String(result), po.formato) : result.toFixed(2)
    } catch { return null }
  }

  // Toggle nota visibility
  const toggleNota = (poId) => {
    setNotaOpen(prev => {
      const next = new Set(prev)
      if (next.has(poId)) next.delete(poId)
      else next.add(poId)
      return next
    })
  }

  const currentArea = data?.areas?.find(a => Number(a.id) === Number(activeArea))
  const hasDirty = Object.keys(dirty).length > 0

  // Compute area stats for sidebar
  const { areaStats, alarmaList } = useMemo(() => {
    const s = { total: 0, conValor: 0, validados: 0, normales: 0, altos: 0, bajos: 0, criticos: 0 }
    const al = []
    if (!currentArea) return { areaStats: s, alarmaList: al }
    currentArea.pruebas.forEach(po => {
      s.total++
      const val = dirty[po.id]?.valor ?? po.resultado ?? ''
      if (val) s.conValor++
      const isV = dirty[po.id]?.validado ?? (po.status_id === 4 || po.status_id === 7)
      if (isV) s.validados++
      if (po.tipo === 'NUM' && val) {
        const f = calcFlag(val, po.referencia)
        if (f) {
          if (f.flag === 'N') s.normales++
          const refText = po.referencia ? `${po.referencia.min ?? ''} – ${po.referencia.max ?? ''}` : null
          if (f.flag === 'H') { s.altos++; al.push({ prueba: po.prueba, val, flag: f, ref: refText }) }
          if (f.flag === 'L') { s.bajos++; al.push({ prueba: po.prueba, val, flag: f, ref: refText }) }
          if (f.critical) { s.criticos++; al.push({ prueba: po.prueba, val, flag: f, ref: refText }) }
        }
      }
    })
    return { areaStats: s, alarmaList: al }
  }, [currentArea, dirty])

  // Load histórico for a prueba
  const loadHistorico = useCallback(async (poId) => {
    if (historico[poId]) {
      // Toggle visibility
      setHistOpen(prev => {
        const next = new Set(prev)
        if (next.has(poId)) next.delete(poId)
        else next.add(poId)
        return next
      })
      return
    }
    setHistLoading(prev => new Set(prev).add(poId))
    try {
      const data = await getHistorico(numero, poId)
      setHistorico(prev => ({ ...prev, [poId]: data }))
      setHistOpen(prev => new Set(prev).add(poId))
    } catch {
      // silently fail
    } finally {
      setHistLoading(prev => {
        const next = new Set(prev)
        next.delete(poId)
        return next
      })
    }
  }, [numero, historico])

  // Expand/collapse all históricos for current area
  const handleToggleAllHist = useCallback(async () => {
    if (!currentArea) return
    const numPruebas = currentArea.pruebas.filter(po => po.tipo === 'NUM')
    const allOpen = numPruebas.every(po => histOpen.has(po.id))

    if (allOpen) {
      // Collapse all
      setHistOpen(prev => {
        const next = new Set(prev)
        numPruebas.forEach(po => next.delete(po.id))
        return next
      })
      return
    }

    // Load and expand all
    const toLoad = numPruebas.filter(po => !historico[po.id])
    if (toLoad.length > 0) {
      const loadingIds = new Set(toLoad.map(po => po.id))
      setHistLoading(prev => new Set([...prev, ...loadingIds]))
      const results = await Promise.allSettled(
        toLoad.map(po => getHistorico(numero, po.id).then(data => ({ id: po.id, data })))
      )
      const newHist = {}
      for (const r of results) {
        if (r.status === 'fulfilled') newHist[r.value.id] = r.value.data
      }
      setHistorico(prev => ({ ...prev, ...newHist }))
      setHistLoading(prev => {
        const next = new Set(prev)
        loadingIds.forEach(id => next.delete(id))
        return next
      })
    }
    setHistOpen(prev => new Set([...prev, ...numPruebas.map(po => po.id)]))
  }, [currentArea, historico, histOpen, numero])

  // Save
  const handleSave = async (validarTodo = false) => {
    // Include calculated CAL values in save
    const saveDirty = { ...dirty }
    if (data?.areas) {
      for (const area of data.areas) {
        for (const po of area.pruebas) {
          if (po.tipo === 'CAL') {
            const cv = calcFormula(po)
            if (cv != null) saveDirty[po.id] = { ...saveDirty[po.id], valor: cv }
          }
        }
      }
    }
    if (Object.keys(saveDirty).length === 0 && !validarTodo) return
    setSaving(true)
    try {
      if (isValidation && validation) {
        // Validation mode: use VB save endpoint
        const resultados = Object.entries(saveDirty).map(([poId, changes]) => ({
          prueba_orden_id: parseInt(poId), ...changes
        }))
        const resp = await saveVBResultados(data.orden.numero, activeArea, { resultados, validarTodo })
        if (resp.areaValidated && validation.muestraActualId) {
          validation.markValidated(validation.muestraActualId)
          validation.recordTime()
          validation.updateMuestraStatus(validation.muestraActualId, {
            area_status_id: 4, area_status_nombre: 'Validado',
            area_status_color: '#63981f', pruebas_validadas: currentArea?.pruebas?.length || 0
          })
        }
        // Reload data
        const d = await getVBOrdenArea(data.orden.numero, activeArea)
        setData(d)
        setDirty({})
        if (!resp.areaValidated && validation.muestraActualId) {
          // Update muestra counts
          const validadas = d.areas?.[0]?.pruebas?.filter(p => p.status_id === 4 || p.status_id === 7).length || 0
          validation.updateMuestraStatus(validation.muestraActualId, { pruebas_validadas: validadas })
        }
        setToast({ message: validarTodo ? 'Área validada' : 'Resultados guardados', type: 'success' })
        if (resp.areaValidated) {
          // Auto-advance to next muestra
          const target = validation.goNext()
          if (target) loadVBData(target.numero, target.areaId)
        }
      } else {
        // Normal mode
        const resultados = Object.entries(saveDirty).map(([poId, changes]) => ({
          prueba_orden_id: parseInt(poId), ...changes
        }))
        await saveResultados(numero, resultados)
        const d = await getOrdenLab(numero)
        setData(d)
        setDirty({})
        setToast({ message: 'Resultados guardados', type: 'success' })
        loadQueue()
      }
    } catch (e) {
      setToast({ message: 'Error al guardar: ' + e.message, type: 'error' })
    } finally { setSaving(false) }
  }

  // Validate all in active area
  const handleValidarTodo = () => {
    const area = data.areas.find(a => Number(a.id) === Number(activeArea))
    if (!area) return
    const newDirty = { ...dirty }
    area.pruebas.forEach(po => {
      newDirty[po.id] = { ...newDirty[po.id], validado: true }
    })
    setDirty(newDirty)
    setToast({ message: `${area.nombre}: todas las pruebas marcadas como validadas`, type: 'success' })
  }

  // Invalidate all in active area
  const handleInvalidarTodo = () => {
    const area = data.areas.find(a => Number(a.id) === Number(activeArea))
    if (!area) return
    const newDirty = { ...dirty }
    area.pruebas.forEach(po => {
      newDirty[po.id] = { ...newDirty[po.id], validado: false }
    })
    setDirty(newDirty)
    setToast({ message: `${area.nombre}: validación removida de todas las pruebas`, type: 'success' })
  }

  // Autovalidar — validates only those with value and within normal range
  const handleAutovalidar = () => {
    const area = data.areas.find(a => Number(a.id) === Number(activeArea))
    if (!area) return
    const newDirty = { ...dirty }
    let count = 0
    area.pruebas.forEach(po => {
      const val = getVal(po)
      if (!val) return
      const isNumeric = po.tipo === 'NUM' || po.tipo === 'CAL'
      const flag = isNumeric ? calcFlag(val, po.referencia) : null
      // Auto-validate: numeric with normal result, or non-numeric with value
      if ((flag && flag.flag === 'N') || !isNumeric) {
        newDirty[po.id] = { ...newDirty[po.id], validado: true }
        count++
      }
    })
    setDirty(newDirty)
    setToast({ message: `Autovalidación: ${count} pruebas validadas`, type: 'success' })
  }

  // Abrir modal de corrección
  const openCorreccion = async (po) => {
    const val = getVal(po)
    setCorreccionModal({ poId: po.id, prueba: po.prueba, valorActual: val })
    setCorreccionForm({ valor_new: '', observacion: '', razon_correccion: '' })
    // Cargar historial de correcciones
    if (!correcciones[po.id]) {
      try {
        const hist = await getCorrecciones(numero, po.id)
        setCorrecciones(prev => ({ ...prev, [po.id]: hist }))
      } catch { /* ignore */ }
    }
  }

  // Ejecutar corrección
  const handleCorreccion = async () => {
    if (!correccionModal || !correccionForm.valor_new) return
    setCorreccionSaving(true)
    try {
      await corregirResultado(numero, {
        prueba_orden_id: correccionModal.poId,
        valor_new: correccionForm.valor_new,
        observacion: correccionForm.observacion,
        razon_correccion: correccionForm.razon_correccion
      })
      setToast({ message: 'Resultado corregido — requiere re-validación', type: 'success' })
      setCorreccionModal(null)
      // Recargar datos
      const d = await getOrdenLab(numero)
      setData(d)
      setDirty({})
      // Actualizar correcciones cache
      setCorrecciones(prev => ({ ...prev, [correccionModal.poId]: undefined }))
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally { setCorreccionSaving(false) }
  }

  return (
    <div className="ot-detail-content">
      <div className="ot-local-toolbar">
        {isValidation ? (
          <>
            <button className="ot-nav-back" onClick={() => navigate('/ordenes')}><IcoBack /> Órdenes</button>
            <span className="lab-vb-title">Validación por Área</span>
            <div style={{ flex: 1 }} />
            <button className="vb-fullscreen-btn" onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen()
              else document.documentElement.requestFullscreen?.()
            }}>⛶ Completa</button>
          </>
        ) : (
          <button className="ot-nav-back" onClick={() => navigate(`/ordenes/${numero}`)}><IcoBack /> Orden {numero}</button>
        )}
      </div>

      {loading && (
        <div className="ot-center"><div className="od-spinner" /> Cargando resultados...</div>
      )}

      {!loading && !data && !isValidation && (
        <div className="ot-center">Orden no encontrada</div>
      )}

      {/* Validation mode: show 3col even without data, for the left panel */}
      {((!loading && data) || (isValidation && !loading)) && (
        <div className="lab-3col">
          {/* ══ LEFT: Queue or Validation Panel ══ */}
          {isValidation ? (
            <ValidationPanel validation={validation} onSelect={loadValidationOrden} />
          ) : (
          <div className="lab-queue-panel">
            <div className="lab-queue-header">
              <span className="lab-queue-title">Cola de trabajo</span>
              <span className="lab-queue-count">{queue.length}</span>
            </div>

            {/* Filter toggle + filters */}
            <div style={{ padding: '0 8px' }}>
              <button className="lab-queue-filter-toggle" onClick={() => setShowQueueFilters(!showQueueFilters)}>
                <IcoFilter size={11} /> Filtros {showQueueFilters ? '▲' : '▼'}
              </button>

              {showQueueFilters && (
                <div className="lab-queue-filters">
                  <label>Área</label>
                  <select value={queueFilters.area} onChange={e => setQueueFilters(f => ({ ...f, area: e.target.value }))}>
                    <option value="">Todas</option>
                    {labAreas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>

                  <label>Desde</label>
                  <input type="date" value={queueFilters.fechaDesde}
                    onChange={e => setQueueFilters(f => ({ ...f, fechaDesde: e.target.value }))} />
                  <label>Hasta</label>
                  <input type="date" value={queueFilters.fechaHasta}
                    onChange={e => setQueueFilters(f => ({ ...f, fechaHasta: e.target.value }))} />

                  <label>Transmitido</label>
                  <select value={queueFilters.transmitido} onChange={e => setQueueFilters(f => ({ ...f, transmitido: e.target.value }))}>
                    <option value="">Todos</option>
                    <option value="si">Con resultados de equipo</option>
                  </select>

                  <label>Estado</label>
                  <select value={queueFilters.estado} onChange={e => setQueueFilters(f => ({ ...f, estado: e.target.value }))}>
                    <option value="">Todos</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="validado">Validados</option>
                  </select>

                  <button className="lab-queue-filter-apply" onClick={() => loadQueue()}>Buscar</button>
                </div>
              )}
            </div>

            <div className="lab-queue-list">
              {queueLoading && <div style={{ padding: 8, fontSize: 11, color: 'var(--text-4)' }}>Cargando...</div>}
              {!queueLoading && queue.length === 0 && <div style={{ padding: 8, fontSize: 11, color: 'var(--text-4)' }}>Sin resultados</div>}
              {queue.map(q => {
                const isCurrent = String(q.numero) === String(numero)
                const pct = q.total_pruebas ? Math.round(q.validadas / q.total_pruebas * 100) : 0
                const queueNav = () => {
                  if (isCurrent) return
                  const params = new URLSearchParams()
                  Object.entries(queueFilters).forEach(([k, v]) => { if (v) params.set(k, v) })
                  const qs = params.toString()
                  navigate(`/ordenes/${q.numero}/lab${qs ? '?' + qs : ''}`)
                }
                return (
                  <div key={q.numero} className={`lab-queue-item ${isCurrent ? 'active' : ''}`} onClick={queueNav}>
                    <div className="lab-queue-item-top">
                      <span className="lab-queue-pac" title={q.paciente}>{q.paciente}</span>
                      {q.stat && <span className="lab-tag lab-tag-stat" title="STAT — Orden urgente">S</span>}
                      {q.anormales > 0 && <span className="lab-queue-alert" title={`${q.anormales} resultado${q.anormales > 1 ? 's' : ''} fuera de rango`}>{q.anormales}</span>}
                    </div>
                    <div className="lab-queue-item-bot">
                      <span className="lab-queue-ord" title="Número de orden">{q.numero}</span>
                      <span className="lab-queue-pct" title={`${q.validadas} de ${q.total_pruebas} validadas (${pct}%)`}>{q.validadas}/{q.total_pruebas}</span>
                    </div>
                    {q.areas?.length > 0 && (
                      <div className="lab-queue-areas">{q.areas.map(a => <span key={a} className="lab-queue-area-tag">{a}</span>)}</div>
                    )}
                    <div className="lab-queue-bar">
                      <div className="lab-queue-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          )}

          {/* ══ CENTER + RIGHT: Main content + Sidebar ══ */}
          {data ? (
          <>
          <div className="lab-center-col">
            {/* Compact patient header */}
            <div className="lab-header-strip">
              <div className="lab-header-left">
                <div className="lab-patient-avatar">{data.paciente.sexo === 'F' ? '♀' : '♂'}</div>
                <div className="lab-header-name-block">
                  <span className="lab-header-name">{data.paciente.nombre}</span>
                  <span className="lab-header-tags">
                    <span className="lab-tag">CI: {data.paciente.ci || '—'}</span>
                    <span className="lab-tag">{data.paciente.sexo === 'M' ? 'M' : 'F'}</span>
                    <span className="lab-tag">{calcAge(data.paciente.fecha_nacimiento)}</span>
                    <span className="lab-tag">{fmtDate(data.paciente.fecha_nacimiento)}</span>
                    {data.paciente.num_historia && <span className="lab-tag">HC: {data.paciente.num_historia}</span>}
                    {data.paciente.vip && <span className="lab-tag lab-tag-vip">VIP</span>}
                  </span>
                </div>
              </div>
              <div className="lab-header-right">
                <span className="lab-header-orden">Orden {data.orden.numero}</span>
                <span className="lab-header-detail">{fmtDate(data.orden.fecha)}</span>
                {data.orden.medico && <span className="lab-header-detail">Dr. {data.orden.medico}</span>}
                {data.orden.stat && <span className="lab-tag lab-tag-stat">STAT</span>}
                {data.orden.embarazada && <span className="lab-tag lab-tag-emb">Embarazo{data.orden.semanas_embarazo ? ` ${data.orden.semanas_embarazo}s` : ''}</span>}
              </div>
            </div>

            {/* Area tabs — hide in validation mode (single area) */}
            {!isValidation && (
            <div className="ot-tab-row">
              {data.areas.map(area => (
                <button
                  key={area.id}
                  className={`ot-tab-btn ${activeArea === area.id ? 'active' : ''}`}
                  onClick={() => setActiveArea(area.id)}
                >
                  {area.nombre}
                  <span className="lab-tab-count">{area.pruebas.length}</span>
                </button>
              ))}
            </div>
            )}

            {currentArea && (
              <>
                <div className="lab-table-card">
                  <div className="lab-area-toolbar">
                    <span className="lab-area-title">{currentArea.nombre}</span>
                    <span className="lab-area-count">{currentArea.pruebas.length} pruebas</span>
                    <button
                      className="lab-btn lab-btn-ghost lab-btn-sm"
                      onClick={handleToggleAllHist}
                      title="Expandir/colapsar todos los históricos"
                    >
                      {currentArea.pruebas.filter(p => p.tipo === 'NUM').every(p => histOpen.has(p.id)) ? '▾ Ocultar Hist.' : '▸ Ver Hist.'}
                    </button>
                  </div>

                  <div className="lab-table-wrapper">
                    <table className="lab-results-table">
                      <thead>
                        <tr>
                          <th className="lab-th-prueba">Prueba</th>
                          <th className="lab-th-resultado">Resultado</th>
                          <th className="lab-th-flag"></th>
                          <th className="lab-th-unidad">Ud.</th>
                          <th className="lab-th-ref">Referencia</th>
                          <th className="lab-th-val">V</th>
                          <th className="lab-th-hist">H</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentArea.pruebas.map((po, i, arr) => {
                          const prevGrupo = i > 0 ? arr[i - 1].grupo : null
                          const showGrupo = po.grupo && po.grupo !== prevGrupo
                          const val = getVal(po)
                          const isValidado = getValidado(po)
                          const flag = (po.tipo === 'NUM' || po.tipo === 'CAL') ? calcFlag(val, po.referencia) : null
                          const isAlarm = flag && (flag.flag === 'H' || flag.flag === 'L')
                          const isCritical = flag && flag.critical
                          const nota = getNota(po)
                          const showNota = notaOpen.has(po.id)
                          const hist = historico[po.id]
                          const isHistOpen = histOpen.has(po.id)
                          const isHistLoading = histLoading.has(po.id)

                          const rowClass = [
                            isValidado ? 'lab-row-validated' : '',
                            isCritical ? 'lab-row-critical' : (isAlarm ? 'lab-row-alarm' : '')
                          ].filter(Boolean).join(' ')

                          return (
                            <Fragment key={po.id}>
                              {showGrupo && (
                                <tr><td colSpan={7} className="lab-grupo-header">{po.grupo}</td></tr>
                              )}
                              <tr className={rowClass}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span className="lab-cell-prueba">{po.prueba}</span>
                                    {po.corregida && <span className="lab-tag-corregida" title="Resultado corregido">C</span>}
                                    <button
                                      className={`lab-nota-btn ${nota ? 'has-nota' : ''}`}
                                      onClick={() => toggleNota(po.id)}
                                      title="Agregar nota"
                                    >
                                      <IcoNote />
                                    </button>
                                  </div>
                                  {showNota && (
                                    <input className="lab-nota-input" placeholder="Nota..." value={nota}
                                      onChange={e => setNota(po.id, e.target.value)} />
                                  )}
                                </td>
                                <td>
                                  {po.tipo === 'NUM' ? (
                                    <input className={`lab-input ${isAlarm || isCritical ? 'lab-input-alarm' : ''}`}
                                      type="text" inputMode="decimal"
                                      value={composeNumDisplay(getMenorMayor(po), val)}
                                      onChange={e => {
                                        const { prefix, number } = parseNumInput(e.target.value)
                                        setMenorMayor(po.id, prefix)
                                        setResultado(po.id, number)
                                      }}
                                      onBlur={e => {
                                        const { number } = parseNumInput(e.target.value)
                                        if (po.formato && number) setResultado(po.id, formatNumericValue(number, po.formato))
                                      }}
                                      readOnly={isValidado || !canLab}
                                      placeholder={po.valor_por_defecto || ''} />
                                  ) : po.tipo === 'SEL' ? (
                                    <select className="lab-input lab-select" value={val}
                                      onChange={e => setResultado(po.id, e.target.value)} disabled={isValidado || !canLab}>
                                      <option value="">— Seleccione —</option>
                                      {(po.opciones || []).map(opt => (
                                        <option key={opt.id} value={opt.opcion} data-ref={opt.referencial || false}>
                                          {opt.opcion}{opt.referencial ? ' ✓' : ''}
                                        </option>
                                      ))}
                                    </select>
                                  ) : po.tipo === 'TXT' ? (
                                    <div>
                                      <textarea className="lab-textarea-inline" value={val} maxLength={400} rows={2}
                                        onChange={e => setResultado(po.id, e.target.value)} readOnly={isValidado || !canLab}
                                        placeholder={po.valor_por_defecto || ''} />
                                      <span className="lab-textarea-counter">{(val || '').length}/400</span>
                                    </div>
                                  ) : po.tipo === 'CAL' ? (
                                    <div className="lab-input-calculated" title={po.formula?.readable || 'Calculada'}>
                                      {calcFormula(po) || '—'}
                                    </div>
                                  ) : po.tipo === 'ALF' ? (
                                    <input className="lab-input" type="text" value={val}
                                      onChange={e => setResultado(po.id, e.target.value)} readOnly={isValidado || !canLab}
                                      placeholder={po.valor_por_defecto || ''} />
                                  ) : po.tipo === 'AYU' ? (
                                    <div>
                                      <textarea className="lab-textarea-inline" value={val} rows={2}
                                        onChange={e => setResultado(po.id, e.target.value)} readOnly={isValidado || !canLab} />
                                      {po.opciones?.length > 0 && !isValidado && canLab && (
                                        <select className="lab-input lab-select" style={{ marginTop: 2, fontSize: 10 }}
                                          value="" onChange={e => { if (e.target.value) { setResultado(po.id, (val ? val + ' ' : '') + e.target.value); e.target.value = '' } }}>
                                          <option value="">+ Agregar texto...</option>
                                          {po.opciones.map(opt => <option key={opt.id} value={opt.opcion}>{opt.opcion}</option>)}
                                        </select>
                                      )}
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                      <input className="lab-input" type="text" value={val}
                                        onChange={e => setResultado(po.id, e.target.value)} readOnly={isValidado || !canLab} />
                                      <span className="lab-type-badge">{po.tipo}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="lab-td-flag"><FlagBadge flag={flag} /></td>
                                <td className="lab-td-unidad">{po.unidad}</td>
                                <td>
                                  <div className="lab-ref-text">{po.referencia?.texto || ''}</div>
                                  {po.tipo === 'NUM' && po.referencia && (
                                    <RefBar valor={val} min={po.referencia.min} max={po.referencia.max} />
                                  )}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="lab-td-actions">
                                    <input type="checkbox" className="lab-checkbox" checked={isValidado}
                                      onChange={() => toggleValidado(po.id, isValidado)} disabled={!canLab} />
                                    {isValidado && canLab && (
                                      <button className="lab-corregir-btn" onClick={() => openCorreccion(po)} title="Corregir resultado validado">
                                        <IcoEdit />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {po.tipo === 'NUM' && (
                                    <div>
                                      <button className={`lab-hist-btn ${isHistOpen ? 'open' : ''}`}
                                        onClick={() => loadHistorico(po.id)} title="Ver histórico">
                                        {isHistLoading ? '…' : <IcoChart />}
                                      </button>
                                      {isHistOpen && hist && hist.length > 0 && (
                                        <div className="lab-hist-panel">
                                          <Sparkline values={hist} hasAlarm={isAlarm || isCritical} />
                                          <div className="lab-hist-values">
                                            {hist.map((h, idx) => (
                                              <div key={idx} className="lab-hist-value">
                                                <span className="lab-hist-alarm-dot" style={{
                                                  background: h.alarma === 'H' || h.alarma === 'C' ? '#dc2626'
                                                    : h.alarma === 'L' ? '#3b82f6' : '#059669'
                                                }} />
                                                {h.valor}
                                                <span className="lab-hist-date">{fmtDateShort(h.fecha)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {isHistOpen && hist && hist.length === 0 && (
                                        <div style={{ fontSize: 9, color: 'var(--text-4)', marginTop: 2 }}>Sin datos</div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            </Fragment>
                          )
                        })}
                      </tbody>
                    </table>

                    {/* Validation bar at bottom of table */}
                    <div className="lab-validation-bar">
                      <button className="lab-btn lab-btn-primary lab-btn-sm" onClick={handleAutovalidar}>Autovalidar</button>
                      <button className="lab-btn lab-btn-ghost lab-btn-sm" onClick={handleInvalidarTodo}><IcoX /> Invalidar</button>
                      <div className="lab-toolbar-spacer" />
                      <button className="lab-btn lab-btn-danger lab-btn-sm" onClick={(e) => { addRipple(e); handleValidarTodo() }}>
                        <IcoCheck /> Validar Todo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sidebar is rendered as 3rd child of lab-3col below */}
              </>
            )}

            {/* Bottom toolbar */}
            <div className="lab-toolbar">
              {isValidation && validation ? (
                <>
                  <button className="lab-btn lab-btn-ghost lab-btn-sm" onClick={() => {
                    const t = validation.goPrev(); if (t) loadVBData(t.numero, t.areaId)
                  }} disabled={saving || validation.currentIdx <= 0}>
                    <IcoBack /> Anterior
                  </button>
                  {validation.currentIdx >= 0 && (
                    <span className="lab-vb-counter">{validation.currentIdx + 1} / {validation.filteredMuestras.length}</span>
                  )}
                  <div className="lab-toolbar-spacer" />
                  <button className="lab-btn lab-btn-success lab-btn-sm" disabled={saving || !hasDirty}
                    onClick={(e) => { addRipple(e); handleSave(false) }}>
                    <IcoSave /> {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button className="lab-btn lab-btn-danger lab-btn-sm" disabled={saving}
                    onClick={(e) => { addRipple(e); handleSave(true) }}>
                    <IcoCheck /> Validar Todo
                  </button>
                  <button className="lab-btn lab-btn-ghost lab-btn-sm" onClick={() => {
                    const t = validation.goNext(); if (t) loadVBData(t.numero, t.areaId)
                  }} disabled={saving || validation.currentIdx >= validation.filteredMuestras.length - 1}>
                    Siguiente →
                  </button>
                </>
              ) : (
                <>
                  <button className="lab-btn lab-btn-ghost" onClick={() => navigate('/ordenes')}>
                    <IcoList /> Volver a Lista
                  </button>
                  <button className="lab-btn lab-btn-ghost" onClick={() => navigate(`/ordenes/${numero}`)}>
                    <IcoEye /> Ver Detalles
                  </button>
                  <div className="lab-toolbar-spacer" />
                  <button
                    className="lab-btn lab-btn-success"
                    disabled={saving || !hasDirty}
                    onClick={(e) => { addRipple(e); handleSave() }}
                  >
                    <IcoSave /> {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </>
              )}
            </div>
          </div>{/* end lab-center-col */}

          {/* ══ RIGHT: Sidebar panel ══ */}
          {currentArea && (
            <div className="lab-split-side">
              {/* Resumen del área */}
              <div className="lab-side-card">
                <div className="lab-side-title">Resumen — {currentArea.nombre}</div>
                    <div className="lab-side-stats">
                      <div className="lab-stat">
                        <span className="lab-stat-num">{areaStats.conValor}</span>
                        <span className="lab-stat-label">resultados</span>
                      </div>
                      <div className="lab-stat">
                        <span className="lab-stat-num" style={{ color: '#059669' }}>{areaStats.validados}</span>
                        <span className="lab-stat-label">validados</span>
                      </div>
                      <div className="lab-stat">
                        <span className="lab-stat-num" style={{ color: areaStats.total - areaStats.conValor > 0 ? '#f59e0b' : 'var(--text-4)' }}>{areaStats.total - areaStats.conValor}</span>
                        <span className="lab-stat-label">pendientes</span>
                      </div>
                    </div>
                    <div className="lab-progress-bar">
                      <div className="lab-progress-fill" style={{ width: `${areaStats.total ? (areaStats.validados / areaStats.total * 100) : 0}%` }} />
                    </div>
                    <div className="lab-progress-label">
                      {areaStats.total ? Math.round(areaStats.validados / areaStats.total * 100) : 0}% validado
                    </div>
                  </div>

                  {/* Alertas — Enhanced */}
                  {alarmaList.length > 0 && (
                    <div className="lab-side-card lab-side-alertas">
                      <div className="lab-alertas-header">
                        <div className="lab-alertas-icon">!</div>
                        <div className="lab-alertas-title-group">
                          <div className="lab-alertas-title">Alertas Clínicas</div>
                          <div className="lab-alertas-subtitle">
                            {alarmaList.filter(a => a.flag.critical).length > 0
                              ? `${alarmaList.filter(a => a.flag.critical).length} crítico(s) — Revisar inmediatamente`
                              : `${alarmaList.length} fuera de rango`}
                          </div>
                        </div>
                      </div>
                      {alarmaList.map((a, idx) => (
                        <div key={idx} className="lab-alerta-item">
                          <span className={`lab-flag lab-flag-${a.flag.flag}`} style={{ width: 20, height: 20, fontSize: 10 }}>{a.flag.flag}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span className="lab-alerta-prueba">{a.prueba}</span>
                            {a.ref && <div className="lab-alerta-ref">Ref: {a.ref}</div>}
                          </div>
                          <span className="lab-alerta-val">{a.val}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Status de todas las áreas de la orden */}
                  {data.areasStatus && data.areasStatus.length > 1 && (
                    <div className="lab-side-card lab-areas-status">
                      <div className="lab-side-title">Áreas de la Orden</div>
                      {data.areasStatus.map(as => {
                        const isCurrent = Number(as.area_id) === Number(activeArea)
                        const dotClass = as.porcentaje >= 100 ? 'lab-area-dot-validada'
                          : as.conValor > 0 ? 'lab-area-dot-process'
                          : 'lab-area-dot-pending'
                        const fillColor = as.porcentaje >= 100 ? '#059669' : as.conValor > 0 ? '#f59e0b' : '#d1d5db'
                        return (
                          <div
                            key={as.area_id}
                            className={`lab-area-status-item${isCurrent ? ' is-current' : ''}`}
                            onClick={() => setActiveArea(as.area_id)}
                            style={{ cursor: isCurrent ? 'default' : 'pointer' }}
                          >
                            <div className={`lab-area-dot ${dotClass}`} />
                            <span className="lab-area-status-name">{as.nombre}</span>
                            <div className="lab-area-mini-bar">
                              <div className="lab-area-mini-fill" style={{ width: `${as.porcentaje}%`, background: fillColor }} />
                            </div>
                            <span className="lab-area-status-pct">{as.porcentaje}%</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Equipo / Metodología del área */}
                  {(() => {
                    const equipos = new Set()
                    const metodos = new Set()
                    let transmitidas = 0
                    currentArea.pruebas.forEach(po => {
                      if (po.equipo) equipos.add(`${po.equipo}${po.equipo_marca ? ` (${po.equipo_marca})` : ''}`)
                      if (po.metodo && po.metodo.trim()) metodos.add(po.metodo.trim())
                      if (po.transmision_equipo) transmitidas++
                    })
                    if (equipos.size === 0 && metodos.size === 0) return null
                    return (
                      <CollapsibleCard title="Equipo / Metodología">
                        {[...equipos].map((eq, i) => (
                          <div key={i} className="lab-side-info-row">
                            <span className="lab-side-info-label">Equipo</span>
                            <span className="lab-side-info-val">{eq}</span>
                          </div>
                        ))}
                        {[...metodos].map((m, i) => (
                          <div key={i} className="lab-side-info-row">
                            <span className="lab-side-info-label">Método</span>
                            <span className="lab-side-info-val">{m}</span>
                          </div>
                        ))}
                        {transmitidas > 0 && (
                          <div className="lab-side-info-row">
                            <span className="lab-side-info-label">Transmitidos</span>
                            <span className="lab-side-info-val">{transmitidas} de {currentArea.pruebas.length}</span>
                          </div>
                        )}
                      </CollapsibleCard>
                    )
                  })()}

                  {/* Fórmulas de pruebas calculadas */}
                  {(() => {
                    const calPruebas = currentArea.pruebas.filter(po => po.formula)
                    if (calPruebas.length === 0) return null
                    return (
                      <CollapsibleCard title={`Fórmulas (${calPruebas.length})`}>
                        {calPruebas.map(po => (
                          <div key={po.id} className="lab-formula-item">
                            <span className="lab-formula-name">{po.prueba}</span>
                            <code className="lab-formula-expr">{po.formula.readable}</code>
                          </div>
                        ))}
                      </CollapsibleCard>
                    )
                  })()}

                  {/* Info clínica de la orden */}
                  {(data.orden.informacion_clinica || data.paciente.medicamentos || data.orden.embarazada || data.orden.peso) && (
                    <CollapsibleCard title="Información Clínica">
                      {data.orden.informacion_clinica && (
                        <div className="lab-side-clinica-text">{data.orden.informacion_clinica}</div>
                      )}
                      {data.paciente.medicamentos && (
                        <>
                          <div className="lab-side-clinica-sub">Medicamentos</div>
                          <div className="lab-side-clinica-text">{data.paciente.medicamentos}</div>
                        </>
                      )}
                      {data.orden.embarazada && (
                        <div className="lab-side-info-row">
                          <span className="lab-side-info-label">Embarazo</span>
                          <span className="lab-side-info-val">{data.orden.semanas_embarazo ? `${data.orden.semanas_embarazo} semanas` : 'Sí'}</span>
                        </div>
                      )}
                      {data.orden.peso && (
                        <div className="lab-side-info-row">
                          <span className="lab-side-info-label">Peso</span>
                          <span className="lab-side-info-val">{data.orden.peso} kg{data.orden.estatura ? ` / ${data.orden.estatura} cm` : ''}</span>
                        </div>
                      )}
                    </CollapsibleCard>
                  )}

                  {/* Observaciones */}
                  <CollapsibleCard title="Observaciones">
                    <textarea
                      className="lab-obs-textarea"
                      placeholder={`Notas para ${currentArea.nombre}...`}
                      value={obsArea[currentArea.id] || ''}
                      onChange={e => setObsArea(prev => ({ ...prev, [currentArea.id]: e.target.value }))}
                      rows={3}
                    />
                    {data.orden.observaciones && (
                      <>
                        <div className="lab-side-clinica-sub">Observaciones de la orden</div>
                        <div className="lab-side-clinica-text">{data.orden.observaciones}</div>
                      </>
                    )}
                    {data.paciente.observaciones && (
                      <>
                        <div className="lab-side-clinica-sub">Observaciones del paciente</div>
                        <div className="lab-side-clinica-text">{data.paciente.observaciones}</div>
                      </>
                    )}
                  </CollapsibleCard>

                  {/* Detalles de la orden */}
                  <CollapsibleCard title="Detalles">
                    {data.orden.medico && (
                      <div className="lab-side-info-row">
                        <span className="lab-side-info-label">Médico</span>
                        <span className="lab-side-info-val">{data.orden.medico}</span>
                      </div>
                    )}
                    {data.orden.numero_solicitud && (
                      <div className="lab-side-info-row">
                        <span className="lab-side-info-label">Solicitud</span>
                        <span className="lab-side-info-val">{data.orden.numero_solicitud}</span>
                      </div>
                    )}
                    {data.orden.fecha_toma_muestra && (
                      <div className="lab-side-info-row">
                        <span className="lab-side-info-label">Toma muestra</span>
                        <span className="lab-side-info-val">{fmtDate(data.orden.fecha_toma_muestra)}</span>
                      </div>
                    )}
                    {data.orden.fecha_estimada_entrega && (
                      <div className="lab-side-info-row">
                        <span className="lab-side-info-label">Entrega est.</span>
                        <span className="lab-side-info-val">{fmtDate(data.orden.fecha_estimada_entrega)}</span>
                      </div>
                    )}
                    {data.paciente.telefono && (
                      <div className="lab-side-info-row">
                        <span className="lab-side-info-label">Teléfono</span>
                        <span className="lab-side-info-val">{data.paciente.telefono}</span>
                      </div>
                    )}
                    {data.paciente.email && (
                      <div className="lab-side-info-row">
                        <span className="lab-side-info-label">Email</span>
                        <span className="lab-side-info-val" style={{ fontSize: 10 }}>{data.paciente.email}</span>
                      </div>
                    )}
                  </CollapsibleCard>
            </div>
          )}
          </>
          ) : (
            /* Validation mode: empty center + right when no muestra selected */
            <div className="lab-center-col" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-4)', fontSize: 14 }}>
              {validation?.muestras?.length > 0 ? 'Selecciona una muestra de la lista' : 'Selecciona un área y busca muestras para comenzar'}
            </div>
          )}
        </div>
      )}

      {/* Modal de corrección */}
      {correccionModal && (
        <div className="lab-modal-overlay" onClick={() => setCorreccionModal(null)}>
          <div className="lab-modal" onClick={e => e.stopPropagation()}>
            <div className="lab-modal-header">
              <span className="lab-modal-title">Corregir Resultado</span>
              <button className="lab-modal-close" onClick={() => setCorreccionModal(null)}>&times;</button>
            </div>
            <div className="lab-modal-body">
              <div className="lab-modal-field">
                <label className="lab-modal-label">Prueba</label>
                <div className="lab-modal-value">{correccionModal.prueba}</div>
              </div>
              <div className="lab-modal-field">
                <label className="lab-modal-label">Valor actual</label>
                <div className="lab-modal-value lab-modal-old">{correccionModal.valorActual || '(vacío)'}</div>
              </div>
              <div className="lab-modal-field">
                <label className="lab-modal-label">Nuevo valor *</label>
                <input className="lab-input" autoFocus value={correccionForm.valor_new}
                  onChange={e => setCorreccionForm(f => ({ ...f, valor_new: e.target.value }))} />
              </div>
              <div className="lab-modal-field">
                <label className="lab-modal-label">Observación</label>
                <textarea className="lab-obs-textarea" rows={2} value={correccionForm.observacion}
                  onChange={e => setCorreccionForm(f => ({ ...f, observacion: e.target.value }))}
                  placeholder="Motivo de la corrección..." />
              </div>
              <div className="lab-modal-field">
                <label className="lab-modal-label">Razón de corrección</label>
                <input className="lab-input" value={correccionForm.razon_correccion}
                  onChange={e => setCorreccionForm(f => ({ ...f, razon_correccion: e.target.value }))}
                  placeholder="Ej: Error de transcripción" />
              </div>

              {/* Historial de correcciones previas */}
              {correcciones[correccionModal.poId]?.length > 0 && (
                <div className="lab-modal-hist">
                  <div className="lab-modal-label">Correcciones anteriores</div>
                  {correcciones[correccionModal.poId].map((c, i) => (
                    <div key={i} className="lab-modal-hist-item">
                      <span className="lab-modal-old">{c.valor_old}</span>
                      <span style={{ margin: '0 4px' }}>&rarr;</span>
                      <span>{c.valor_new}</span>
                      <span className="lab-modal-hist-date">{fmtDate(c.fecha_new)}</span>
                      {c.observacion && <div className="lab-modal-hist-obs">{c.observacion}</div>}
                    </div>
                  ))}
                </div>
              )}

              <div className="lab-modal-warning">
                Favor de hacer caso omiso del resultado anterior. El resultado será invalidado y requerirá re-validación.
              </div>
            </div>
            <div className="lab-modal-footer">
              <button className="lab-btn lab-btn-ghost" onClick={() => setCorreccionModal(null)}>Cancelar</button>
              <button className="lab-btn lab-btn-primary" disabled={!correccionForm.valor_new || correccionSaving}
                onClick={handleCorreccion}>
                {correccionSaving ? 'Guardando...' : 'Corregir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`lab-toast lab-toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.message}
        </div>
      )}
    </div>
  )
}
