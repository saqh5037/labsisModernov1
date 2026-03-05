import { useState, useEffect, useCallback, useRef } from 'react'
import { getVBAreas, getVBMuestras } from '../services/api'

function todayStr() { return new Date().toISOString().slice(0, 10) }

const LS_KEY = 'vb_last_area'

export function useValidationMode(isActive) {
  // ── Filtros ──
  const [areas, setAreas] = useState([])
  const [areaId, setAreaId] = useState('')
  const [fechaDesde, setFechaDesde] = useState(todayStr())
  const [fechaHasta, setFechaHasta] = useState(todayStr())
  const [filtroValidada, setFiltroValidada] = useState('2') // Default: Pendientes
  const [buscando, setBuscando] = useState(false)

  // ── Lista de muestras ──
  const [muestras, setMuestras] = useState([])
  const [muestraActualId, setMuestraActualId] = useState(null)
  const [searchFilter, setSearchFilter] = useState('')

  // ── Métricas ──
  const [visitados, setVisitados] = useState(new Set())
  const [validados, setValidados] = useState(new Set())
  const [tiemposValidacion, setTiemposValidacion] = useState([])
  const tiempoInicioRef = useRef(null)
  const didAutoSearch = useRef(false)

  // Return null when not active
  if (!isActive) return null

  // ── Buscar muestras (stable ref for effects) ──
  const buscarRef = useRef(null)
  buscarRef.current = async (aid, fDesde, fHasta, filtro) => {
    if (!aid) return
    setBuscando(true)
    try {
      const desde = `${fDesde}T00:00:00`
      const hasta = `${fHasta}T23:59:59`
      const data = await getVBMuestras(desde, hasta, aid, filtro)
      setMuestras(data)
      setMuestraActualId(null)
      setVisitados(new Set())
      setValidados(new Set(data.filter(m => m.area_status_id === 4).map(m => m.muestra_id)))
      setTiemposValidacion([])
    } catch (err) {
      console.error(err)
    } finally {
      setBuscando(false)
    }
  }

  const handleBuscar = () => buscarRef.current(areaId, fechaDesde, fechaHasta, filtroValidada) // eslint-disable-line react-hooks/rules-of-hooks

  // ── Load areas + auto-search with last area ──
  useEffect(() => { // eslint-disable-line react-hooks/rules-of-hooks
    if (!isActive) return
    getVBAreas().then(loaded => {
      setAreas(loaded)
      // Restore last area from localStorage
      const saved = localStorage.getItem(LS_KEY)
      if (saved && loaded.some(a => String(a.id) === saved) && !didAutoSearch.current) {
        setAreaId(saved)
        didAutoSearch.current = true
        // Auto-search with saved area
        buscarRef.current(saved, todayStr(), todayStr(), '2')
      }
    }).catch(() => {})
  }, [isActive])

  // ── Auto-buscar al cambiar área ──
  useEffect(() => { // eslint-disable-line react-hooks/rules-of-hooks
    if (!isActive || !areaId) return
    // Save to localStorage
    localStorage.setItem(LS_KEY, areaId)
    // Skip if this is the auto-search from mount
    if (didAutoSearch.current) {
      didAutoSearch.current = false
      return
    }
    buscarRef.current(areaId, fechaDesde, fechaHasta, filtroValidada)
  }, [isActive, areaId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtered list ──
  const getFilteredMuestras = () => {
    if (!searchFilter) return muestras
    const text = searchFilter.toLowerCase()
    return muestras.filter(m => {
      const s = `${m.barcode} ${m.paciente_nombre} ${m.ci_paciente} ${m.ot_numero}`.toLowerCase()
      return s.includes(text)
    })
  }

  // ── Select muestra ──
  const selectMuestra = useCallback((muestra) => { // eslint-disable-line react-hooks/rules-of-hooks
    if (muestraActualId === muestra.muestra_id) return null
    setMuestraActualId(muestra.muestra_id)
    tiempoInicioRef.current = Date.now()
    setVisitados(prev => new Set([...prev, muestra.muestra_id]))
    return { numero: muestra.ot_numero, areaId }
  }, [muestraActualId, areaId])

  // ── Nav ──
  const goNext = useCallback(() => { // eslint-disable-line react-hooks/rules-of-hooks
    const filtered = getFilteredMuestras()
    const idx = filtered.findIndex(m => m.muestra_id === muestraActualId)
    if (idx < filtered.length - 1) return selectMuestra(filtered[idx + 1])
    return null
  }, [muestras, muestraActualId, searchFilter, selectMuestra]) // eslint-disable-line

  const goPrev = useCallback(() => { // eslint-disable-line react-hooks/rules-of-hooks
    const filtered = getFilteredMuestras()
    const idx = filtered.findIndex(m => m.muestra_id === muestraActualId)
    if (idx > 0) return selectMuestra(filtered[idx - 1])
    return null
  }, [muestras, muestraActualId, searchFilter, selectMuestra]) // eslint-disable-line

  // ── Metrics helpers ──
  const markValidated = (muestraId) => {
    setValidados(prev => new Set([...prev, muestraId]))
  }

  const recordTime = () => {
    if (tiempoInicioRef.current) {
      const elapsed = Math.round((Date.now() - tiempoInicioRef.current) / 1000)
      setTiemposValidacion(prev => [...prev, elapsed])
    }
  }

  const updateMuestraStatus = (muestraId, updates) => {
    setMuestras(prev => prev.map(m =>
      m.muestra_id === muestraId ? { ...m, ...updates } : m
    ))
  }

  // ── Computed ──
  const filteredMuestras = getFilteredMuestras()
  const currentIdx = filteredMuestras.findIndex(m => m.muestra_id === muestraActualId)
  const avgTime = tiemposValidacion.length > 0
    ? Math.round(tiemposValidacion.reduce((a, b) => a + b, 0) / tiemposValidacion.length)
    : 0
  const pendientes = filteredMuestras.filter(m => m.area_status_id !== 4).length
  const validadosCount = validados.size
  const totalMuestras = muestras.length
  const pctValidado = totalMuestras > 0 ? Math.round(validadosCount / totalMuestras * 100) : 0
  const estimadoSeg = avgTime > 0 ? pendientes * avgTime : 0

  return {
    // Filtros
    areas, areaId, setAreaId,
    fechaDesde, setFechaDesde,
    fechaHasta, setFechaHasta,
    filtroValidada, setFiltroValidada,
    buscando, handleBuscar,
    // Lista
    muestras, muestraActualId, searchFilter, setSearchFilter,
    filteredMuestras, currentIdx,
    selectMuestra, goNext, goPrev,
    // Métricas
    visitados, validados, avgTime,
    pendientes, validadosCount, totalMuestras, pctValidado, estimadoSeg,
    markValidated, recordTime, updateMuestraStatus
  }
}
