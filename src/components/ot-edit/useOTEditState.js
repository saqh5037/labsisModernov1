import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  getOTEditNew, getOTEdit, searchPruebasOT,
  getGrupoPruebas, createOT, updateOT, facturarOT,
  resolveServicio, recalcPrecios,
  searchPacienteOT, searchMedicoOT, createMedicoOT,
  getOTDescuentos
} from '../../services/api.js'

/* ── Helpers ── */
export const fmtPrice = (n) => {
  const num = parseFloat(n) || 0
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const calcAge = (bd) => {
  if (!bd) return ''
  const birth = new Date(bd)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--
  return age + ' a'
}

/* ── Keyboard navigation hook for autocomplete dropdowns ── */
export function useDropdownKeyboard(items, isOpen, onSelect, onClose) {
  const [hlIdx, setHlIdx] = useState(-1)
  useEffect(() => { setHlIdx(-1) }, [items, isOpen])

  const onKeyDown = useCallback((e) => {
    if (!isOpen || !items.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHlIdx(i => (i + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHlIdx(i => (i <= 0 ? items.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (hlIdx >= 0 && hlIdx < items.length) onSelect(items[hlIdx])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [isOpen, items, hlIdx, onSelect, onClose])

  return { hlIdx, onKeyDown }
}

export default function useOTEditState() {
  const { numero } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = !!numero

  // ── Refs ──
  const searchRef = useRef(null)
  const debounceRef = useRef(null)
  const pacSearchRef = useRef(null)
  const pacDebounceRef = useRef(null)
  const medSearchRef = useRef(null)
  const medDebounceRef = useRef(null)
  const procSearchRef = useRef(null)
  const procDebounceRef = useRef(null)

  // Refs for auto-advance focus targets
  const pacInputRef = useRef(null)
  const procInputRef = useRef(null)
  const medInputRef = useRef(null)
  const examSearchInputRef = useRef(null)

  // ── Callback refs for stable keyboard nav ──
  const selectProcRef = useRef(null)
  const selectPacRef = useRef(null)
  const selectMedRef = useRef(null)
  const addPruebaRef = useRef(null)
  const addGrupoRef = useRef(null)

  // ── State ──
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [paciente, setPaciente] = useState({
    id: null, ci_paciente: '', nombre: '', apellido: '', apellido_segundo: '',
    sexo: '', fecha_nacimiento: '', email: '', telefono: '', telefono_celular: ''
  })
  const [orden, setOrden] = useState({
    procedencia_id: null, procedencia_nombre: '', servicio_id: null,
    servicio_medico_id: null, medico_id: null, medico_nombre: '',
    stat: false, embarazada: false, semanas_embarazo: 0,
    habitacion: '', num_ingreso: '', num_episodio: '',
    observaciones: '', informacion_clinica: '', centro_atencion_paciente_id: 1
  })
  const [selectedPruebas, setSelectedPruebas] = useState([])
  const [selectedGrupos, setSelectedGrupos] = useState([])
  const [catalogs, setCatalogs] = useState({ procedencias: [], serviciosMedicos: [], caps: [], lab: {} })
  const [servicioInfo, setServicioInfo] = useState(null)

  // Descuento & cantidades
  const [descuento, setDescuento] = useState({ porcentaje: 0, esManual: false })
  const [descuentoCategorias, setDescuentoCategorias] = useState([])
  const [selectedCategoriaId, setSelectedCategoriaId] = useState(null)
  const [ivaPorcentaje, setIvaPorcentaje] = useState(0)
  const [grupoCantidades, setGrupoCantidades] = useState({}) // { gpId: cantidad }

  // Search pruebas
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState({ pruebas: [], grupos: [] })
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  // Patient search
  const [pacSearchQuery, setPacSearchQuery] = useState('')
  const [pacSearchResults, setPacSearchResults] = useState([])
  const [pacSearchOpen, setPacSearchOpen] = useState(false)

  // Doctor search
  const [medSearchQuery, setMedSearchQuery] = useState('')
  const [medSearchResults, setMedSearchResults] = useState([])
  const [medSearchOpen, setMedSearchOpen] = useState(false)

  // Crear medico inline
  const [showNewMedico, setShowNewMedico] = useState(false)
  const [newMedico, setNewMedico] = useState({ nombre: '', apellido_paterno: '', id_profesional: '', email: '' })

  // Procedencia search
  const [procSearchQuery, setProcSearchQuery] = useState('')
  const [procSearchOpen, setProcSearchOpen] = useState(false)
  const [procFiltered, setProcFiltered] = useState([])

  // ── Keyboard nav hooks ──
  const procKb = useDropdownKeyboard(
    procFiltered, procSearchOpen,
    useCallback((p) => selectProcRef.current?.(p), []),
    useCallback(() => setProcSearchOpen(false), [])
  )
  const pacKb = useDropdownKeyboard(
    pacSearchResults, pacSearchOpen,
    useCallback((p) => selectPacRef.current?.(p), []),
    useCallback(() => setPacSearchOpen(false), [])
  )
  const medKb = useDropdownKeyboard(
    medSearchResults, medSearchOpen,
    useCallback((m) => selectMedRef.current?.(m), []),
    useCallback(() => setMedSearchOpen(false), [])
  )

  const searchFlatItems = useMemo(() => {
    const items = []
    for (const gp of searchResults.grupos) items.push({ type: 'grupo', data: gp })
    for (const p of searchResults.pruebas) items.push({ type: 'prueba', data: p })
    return items
  }, [searchResults])

  const handleSearchSelect = useCallback((item) => {
    if (item.type === 'grupo') addGrupoRef.current?.(item.data)
    else addPruebaRef.current?.(item.data)
  }, [])

  const searchKb = useDropdownKeyboard(
    searchFlatItems, searchOpen,
    handleSearchSelect,
    useCallback(() => setSearchOpen(false), [])
  )

  // ── Auto-advance focus ──
  const advanceTo = useCallback((ref) => {
    requestAnimationFrame(() => {
      if (ref?.current) {
        ref.current.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
        ref.current.focus?.()
      }
    })
  }, [])

  // ── Load initial data ──
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        if (isEdit) {
          const data = await getOTEdit(numero)
          const ot = data.orden
          setPaciente({
            id: ot.paciente_id, ci_paciente: ot.ci_paciente || '',
            nombre: ot.pac_nombre || '', apellido: ot.pac_apellido || '',
            apellido_segundo: ot.apellido_segundo || '', sexo: ot.sexo || '',
            fecha_nacimiento: ot.fecha_nacimiento ? ot.fecha_nacimiento.substring(0, 10) : '',
            email: ot.pac_email || '', telefono: ot.pac_telefono || '',
            telefono_celular: ot.telefono_celular || ''
          })
          setOrden({
            procedencia_id: ot.procedencia_id, procedencia_nombre: ot.procedencia_nombre || '',
            servicio_id: ot.servicio_id, servicio_medico_id: ot.servicio_medico_id,
            medico_id: ot.medico_id, medico_nombre: ot.medico || '',
            stat: ot.stat || false, embarazada: ot.embarazada || false,
            semanas_embarazo: ot.semanas_embarazo || 0, habitacion: ot.habitacion || '',
            num_ingreso: ot.num_ingreso || '', num_episodio: ot.num_episodio || '',
            observaciones: ot.observaciones || '', informacion_clinica: ot.informacion_clinica || '',
            centro_atencion_paciente_id: ot.centro_atencion_paciente_id || 1
          })
          setSelectedPruebas(data.pruebas.map(p => ({
            prueba_id: p.prueba_id, nombre: p.prueba, codigo: p.nomenclatura || p.codigo,
            precio: parseFloat(p.precio), area_id: p.area_id, gp_id: p.gp_id,
            area_nombre: p.area_nombre,
            tipo_muestra: p.tipo_muestra, tipo_muestra_id: p.tipo_muestra_id,
            tipo_contenedor_id: p.tipo_contenedor_id, contenedor: p.contenedor,
            color: p.color
          })))
          setSelectedGrupos(data.grupos.map(g => ({
            id: g.gp_id, nombre: g.grupo, precio: parseFloat(g.precio),
            abreviacion: g.abreviacion
          })))
          setCatalogs({
            procedencias: data.procedencias, serviciosMedicos: data.serviciosMedicos,
            caps: [], lab: data.lab
          })
          if (ot.procedencia_id) {
            setProcSearchQuery(ot.procedencia_nombre || '')
            try {
              const { servicio } = await resolveServicio(ot.procedencia_id)
              setServicioInfo(servicio)
            } catch { /* ignore */ }
          }
        } else {
          const pacienteId = searchParams.get('pacienteId')
          const data = await getOTEditNew(pacienteId)
          if (data.paciente) {
            const p = data.paciente
            setPaciente({
              id: p.id, ci_paciente: p.ci_paciente || '',
              nombre: p.nombre || '', apellido: p.apellido || '',
              apellido_segundo: p.apellido_segundo || '', sexo: p.sexo || '',
              fecha_nacimiento: p.fecha_nacimiento ? p.fecha_nacimiento.substring(0, 10) : '',
              email: p.email || '', telefono: p.telefono || '',
              telefono_celular: p.telefono_celular || ''
            })
          }
          setCatalogs({
            procedencias: data.procedencias, serviciosMedicos: data.serviciosMedicos,
            caps: data.caps, lab: data.lab
          })
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [numero, isEdit, searchParams])

  // ── Patient search ──
  const handlePacSearch = useCallback(async (q) => {
    if (q.length < 2) { setPacSearchResults([]); setPacSearchOpen(false); return }
    try {
      const results = await searchPacienteOT(q)
      setPacSearchResults(results)
      setPacSearchOpen(results.length > 0)
    } catch { /* ignore */ }
  }, [])

  const handlePacSearchChange = (e) => {
    const q = e.target.value
    setPacSearchQuery(q)
    setPaciente(p => ({ ...p, ci_paciente: q }))
    clearTimeout(pacDebounceRef.current)
    pacDebounceRef.current = setTimeout(() => handlePacSearch(q), 300)
  }

  function selectPaciente(p) {
    setPaciente({
      id: p.id, ci_paciente: p.ci_paciente || '',
      nombre: p.nombre || '', apellido: p.apellido || '',
      apellido_segundo: p.apellido_segundo || '', sexo: p.sexo || '',
      fecha_nacimiento: p.fecha_nacimiento ? p.fecha_nacimiento.substring(0, 10) : '',
      email: p.email || '', telefono: p.telefono || '',
      telefono_celular: p.telefono_celular || ''
    })
    setPacSearchQuery('')
    setPacSearchOpen(false)
    // Auto-advance to procedencia
    advanceTo(procInputRef)
  }
  selectPacRef.current = selectPaciente

  // Reset patient (for "Cambiar paciente")
  const resetPaciente = () => {
    setPaciente({
      id: null, ci_paciente: '', nombre: '', apellido: '', apellido_segundo: '',
      sexo: '', fecha_nacimiento: '', email: '', telefono: '', telefono_celular: ''
    })
    setPacSearchQuery('')
    requestAnimationFrame(() => pacInputRef.current?.focus())
  }

  // ── Doctor search ──
  const handleMedSearch = useCallback(async (q) => {
    if (q.length < 2) { setMedSearchResults([]); setMedSearchOpen(false); return }
    try {
      const results = await searchMedicoOT(q)
      setMedSearchResults(results)
      setMedSearchOpen(results.length > 0)
    } catch { /* ignore */ }
  }, [])

  const handleMedSearchChange = (e) => {
    const q = e.target.value
    setMedSearchQuery(q)
    setOrden(o => ({ ...o, medico_nombre: q, medico_id: null }))
    clearTimeout(medDebounceRef.current)
    medDebounceRef.current = setTimeout(() => handleMedSearch(q), 300)
  }

  function selectMedico(m) {
    const nombre = [m.nombre, m.apellido_paterno, m.apellido_materno].filter(Boolean).join(' ')
    setOrden(o => ({ ...o, medico_id: m.id, medico_nombre: nombre }))
    setMedSearchQuery('')
    setMedSearchOpen(false)
    // Auto-advance to exam search
    advanceTo(examSearchInputRef)
  }
  selectMedRef.current = selectMedico

  // ── Create medico inline ──
  const handleCreateMedico = async () => {
    if (!newMedico.nombre.trim()) return
    try {
      const created = await createMedicoOT(newMedico)
      const nombre = [created.nombre, created.apellido_paterno].filter(Boolean).join(' ')
      setOrden(o => ({ ...o, medico_id: created.id, medico_nombre: nombre }))
      setShowNewMedico(false)
      setNewMedico({ nombre: '', apellido_paterno: '', id_profesional: '', email: '' })
      advanceTo(examSearchInputRef)
    } catch { setError('Error al crear medico') }
  }

  // ── Search pruebas ──
  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setSearchResults({ pruebas: [], grupos: [] }); setSearchOpen(false); return }
    setSearchLoading(true)
    try {
      const results = await searchPruebasOT(q, servicioInfo?.id)
      setSearchResults(results)
      setSearchOpen(true)
    } catch { /* ignore */ }
    setSearchLoading(false)
  }, [servicioInfo])

  const handleSearchChange = (e) => {
    const q = e.target.value
    setSearchQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q), 300)
  }

  // ── Add prueba ──
  function addPrueba(p) {
    if (selectedPruebas.some(sp => sp.prueba_id === p.id)) return
    setSelectedPruebas(prev => [...prev, {
      prueba_id: p.id, nombre: p.nombre, codigo: p.nomenclatura,
      precio: parseFloat(p.precio) || 0, area_id: p.area_id,
      gp_id: null, area_nombre: p.area_nombre,
      tipo_muestra: p.tipo_muestra, tipo_muestra_id: p.tipo_muestra_id,
      tipo_contenedor_id: p.tipo_contenedor_id, contenedor: p.contenedor,
      color: p.color
    }])
    setSearchQuery('')
    setSearchOpen(false)
    // Keep focus on search for rapid entry
    requestAnimationFrame(() => examSearchInputRef.current?.focus())
  }
  addPruebaRef.current = addPrueba

  // ── Add grupo ──
  async function addGrupo(gp) {
    if (selectedGrupos.some(sg => sg.id === gp.id)) return
    setSelectedGrupos(prev => [...prev, {
      id: gp.id, nombre: gp.nombre, precio: parseFloat(gp.precio) || 0,
      abreviacion: gp.abreviacion
    }])
    try {
      const hijas = await getGrupoPruebas(gp.id)
      const nuevas = hijas.filter(h => !selectedPruebas.some(sp => sp.prueba_id === h.id))
        .map(h => ({
          prueba_id: h.id, nombre: h.nombre, codigo: h.nomenclatura,
          precio: parseFloat(h.precio) || 0, area_id: h.area_id,
          gp_id: gp.id, area_nombre: h.area_nombre,
          tipo_muestra: h.tipo_muestra, tipo_muestra_id: h.tipo_muestra_id,
          tipo_contenedor_id: h.tipo_contenedor_id, contenedor: h.contenedor,
          color: h.color
        }))
      setSelectedPruebas(prev => [...prev, ...nuevas])
    } catch { /* ignore */ }
    setSearchQuery('')
    setSearchOpen(false)
    requestAnimationFrame(() => examSearchInputRef.current?.focus())
  }
  addGrupoRef.current = addGrupo

  // ── Remove ──
  const removePrueba = (idx) => {
    setSelectedPruebas(prev => prev.filter((_, i) => i !== idx))
  }

  const removeGrupo = (gpId) => {
    setSelectedGrupos(prev => prev.filter(g => g.id !== gpId))
    setSelectedPruebas(prev => prev.filter(p => p.gp_id !== gpId))
  }

  // ── Update descuento + load categories when servicioInfo changes ──
  useEffect(() => {
    if (servicioInfo?.descuento_activo) {
      const pctFijo = parseFloat(servicioInfo.porcentaje_descuento_activo)
      if (pctFijo > 0) {
        setDescuento({ porcentaje: pctFijo, esManual: false })
      } else {
        setDescuento(prev => ({ ...prev, esManual: true }))
      }
      // Load descuento categories for this servicio
      getOTDescuentos(servicioInfo.id).then(data => {
        setDescuentoCategorias(data.categorias || [])
        setIvaPorcentaje(data.ivaPorcentaje || 0)
      }).catch(() => {
        setDescuentoCategorias([])
      })
    } else {
      setDescuento({ porcentaje: 0, esManual: false })
      setDescuentoCategorias([])
      setSelectedCategoriaId(null)
      // Still load IVA even without descuento
      if (servicioInfo?.id) {
        getOTDescuentos(servicioInfo.id).then(data => {
          setIvaPorcentaje(data.ivaPorcentaje || 0)
        }).catch(() => {})
      }
    }
  }, [servicioInfo])

  const updateDescuento = useCallback((pct) => {
    setDescuento(prev => ({ ...prev, porcentaje: Math.max(0, Math.min(100, parseFloat(pct) || 0)) }))
  }, [])

  const selectDescuentoCategoria = useCallback((catId) => {
    if (!catId) {
      setSelectedCategoriaId(null)
      // Reset to servicio default or manual
      if (servicioInfo?.descuento_activo) {
        const pctFijo = parseFloat(servicioInfo.porcentaje_descuento_activo) || 0
        setDescuento(pctFijo > 0 ? { porcentaje: pctFijo, esManual: false } : { porcentaje: 0, esManual: true })
      }
      return
    }
    setSelectedCategoriaId(catId)
    const cat = descuentoCategorias.find(c => c.id === parseInt(catId))
    if (cat) {
      const pct = parseFloat(cat.porcentaje_servicio || cat.limite) || 0
      setDescuento({ porcentaje: pct, esManual: true })
    }
  }, [descuentoCategorias, servicioInfo])

  const updateGrupoCantidad = useCallback((gpId, cantidad) => {
    setGrupoCantidades(prev => ({ ...prev, [gpId]: Math.max(1, Math.min(99, parseInt(cantidad) || 1)) }))
  }, [])

  // ── Price calculation with descuento, copago, IGTF ──
  const calcTotales = useMemo(() => {
    const gpIds = new Set(selectedGrupos.map(g => g.id))
    const pruebasSueltas = selectedPruebas.filter(p => !p.gp_id || !gpIds.has(p.gp_id))
    const sumPruebas = pruebasSueltas.reduce((s, p) => s + (parseFloat(p.precio) || 0), 0)
    const sumGrupos = selectedGrupos.reduce((s, g) => {
      const qty = grupoCantidades[g.id] || 1
      return s + (parseFloat(g.precio) || 0) * qty
    }, 0)
    const subtotal = sumPruebas + sumGrupos

    const descPct = descuento.porcentaje || 0
    const descMonto = parseFloat((subtotal * descPct / 100).toFixed(2))
    const subtotalConDesc = subtotal - descMonto

    const copagoPct = parseFloat(servicioInfo?.porcentaje_pago_servicio) || 0
    const montoPaciente = copagoPct > 0
      ? parseFloat((subtotalConDesc * (100 - copagoPct) / 100).toFixed(2))
      : subtotalConDesc

    // IVA (tabla iva)
    const ivaPct = ivaPorcentaje || 0
    const ivaMonto = ivaPct > 0 ? parseFloat((montoPaciente * ivaPct / 100).toFixed(2)) : 0

    // IGTF (laboratorio — impuesto adicional en divisas)
    const aplicarIgtf = servicioInfo?.aplicar_igtf || false
    const igtfPct = aplicarIgtf ? (parseFloat(servicioInfo?.igtf_porcentaje) || 0) : 0
    const igtfMonto = igtfPct > 0 ? parseFloat((montoPaciente * igtfPct / 100).toFixed(2)) : 0

    const total = montoPaciente + ivaMonto + igtfMonto

    return {
      subtotal, descPct, descMonto, subtotalConDesc,
      copagoPct, montoPaciente,
      ivaPct, ivaMonto,
      aplicarIgtf, igtfPct, igtfMonto,
      total
    }
  }, [selectedPruebas, selectedGrupos, grupoCantidades, descuento, servicioInfo, ivaPorcentaje])

  // Keep totalPrice as alias for compatibility
  const totalPrice = calcTotales.subtotal

  // ── Muestras preview ──
  const muestrasPreview = useMemo(() => {
    const map = new Map()
    for (const p of selectedPruebas) {
      if (p.tipo_muestra_id) {
        const key = `${p.tipo_muestra_id}-${p.tipo_contenedor_id || 0}`
        if (!map.has(key)) {
          map.set(key, {
            tipo_muestra: p.tipo_muestra || 'Muestra',
            contenedor: p.contenedor || '',
            color: p.color || '#ccc',
            areas: new Set([p.area_nombre].filter(Boolean)),
            pruebas: [p.nombre]
          })
        } else {
          const existing = map.get(key)
          if (p.area_nombre) existing.areas.add(p.area_nombre)
          if (!existing.pruebas.includes(p.nombre)) existing.pruebas.push(p.nombre)
        }
      }
    }
    return Array.from(map.values()).map(m => ({ ...m, areas: Array.from(m.areas) }))
  }, [selectedPruebas])

  // ── Step status ──
  const stepStatus = useMemo(() => ({
    paciente: paciente.id ? 'completed' : 'active',
    orden: paciente.id && orden.procedencia_id ? 'completed' : (paciente.id ? 'active' : 'pending'),
    examenes: orden.procedencia_id ? (selectedPruebas.length > 0 || selectedGrupos.length > 0 ? 'completed' : 'active') : 'pending'
  }), [paciente.id, orden.procedencia_id, selectedPruebas.length, selectedGrupos.length])

  // ── Validation ──
  const validate = () => {
    if (!paciente.nombre?.trim()) return 'Nombre del paciente requerido'
    if (!paciente.apellido?.trim()) return 'Apellido del paciente requerido'
    if (!paciente.sexo) return 'Sexo del paciente requerido'
    if (catalogs.lab?.procedencia_obligatorio && !orden.procedencia_id) return 'Procedencia requerida'
    if (orden.procedencia_id) {
      const proc = catalogs.procedencias.find(p => p.id === orden.procedencia_id)
      if (proc?.medico_obligatorio && !orden.medico_id && !orden.medico_nombre?.trim()) {
        return 'Medico obligatorio para esta procedencia'
      }
      if (proc?.ingreso_obligatorio && !orden.num_ingreso?.trim()) {
        return 'Numero de ingreso obligatorio para esta procedencia'
      }
    }
    if (selectedPruebas.length === 0 && selectedGrupos.length === 0) return 'Agregue al menos una prueba o examen'
    return null
  }

  // ── Save ──
  const handleSave = async (withFactura = false) => {
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setSaving(true)
    try {
      const pruebasPayload = selectedPruebas.map(p => ({
        prueba_id: p.prueba_id, nombre: p.nombre, precio: p.precio,
        area_id: p.area_id, gp_id: p.gp_id
      }))
      const gruposPayload = selectedGrupos.map(g => ({ id: g.id, precio: g.precio }))

      const descPayload = {
        descuento_porcentaje: calcTotales.descPct,
        descuento_monto: calcTotales.descMonto
      }

      if (isEdit) {
        await updateOT(numero, { orden, pruebas: pruebasPayload, grupos: gruposPayload, ...descPayload })
        navigate(`/ordenes/${numero}`)
      } else {
        const result = await createOT({
          paciente, orden, pruebas: pruebasPayload,
          grupos: gruposPayload, facturar: withFactura, ...descPayload
        })
        if (withFactura && result.ok) {
          const factResult = await facturarOT(result.orden.numero, { grupoCantidades })
          if (factResult.ok) {
            navigate(`/ordenes/${result.orden.numero}/cobro`)
            return
          }
        }
        navigate('/ordenes')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Close dropdowns on outside click + cleanup ──
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
      if (pacSearchRef.current && !pacSearchRef.current.contains(e.target)) setPacSearchOpen(false)
      if (medSearchRef.current && !medSearchRef.current.contains(e.target)) setMedSearchOpen(false)
      if (procSearchRef.current && !procSearchRef.current.contains(e.target)) setProcSearchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      clearTimeout(debounceRef.current)
      clearTimeout(pacDebounceRef.current)
      clearTimeout(medDebounceRef.current)
      clearTimeout(procDebounceRef.current)
    }
  }, [])

  // ── Procedencia search (local filter) ──
  const handleProcSearchChange = (e) => {
    const q = e.target.value
    setProcSearchQuery(q)
    if (!q.trim()) {
      setOrden(prev => ({ ...prev, procedencia_id: null, procedencia_nombre: '' }))
      setServicioInfo(null)
      setProcFiltered([])
      setProcSearchOpen(false)
      return
    }
    clearTimeout(procDebounceRef.current)
    procDebounceRef.current = setTimeout(() => {
      const lower = q.toLowerCase()
      const filtered = catalogs.procedencias.filter(p =>
        p.nombre.toLowerCase().includes(lower) ||
        (p.codigo || '').toLowerCase().includes(lower)
      )
      setProcFiltered(filtered)
      setProcSearchOpen(filtered.length > 0)
    }, 150)
  }

  async function selectProcedencia(proc) {
    setProcSearchQuery(proc.nombre)
    setProcSearchOpen(false)
    setOrden(prev => ({ ...prev, procedencia_id: proc.id, procedencia_nombre: proc.nombre }))
    try {
      const { servicio } = await resolveServicio(proc.id)
      setServicioInfo(servicio)
      if (servicio) {
        setOrden(prev => ({ ...prev, servicio_id: servicio.id }))
        if (selectedPruebas.length || selectedGrupos.length) {
          const pIds = selectedPruebas.map(p => p.prueba_id)
          const gIds = selectedGrupos.map(g => g.id)
          const { precios } = await recalcPrecios(servicio.id, pIds, gIds)
          setSelectedPruebas(prev => prev.map(p => ({
            ...p, precio: precios[`p_${p.prueba_id}`] ?? p.precio
          })))
          setSelectedGrupos(prev => prev.map(g => ({
            ...g, precio: precios[`gp_${g.id}`] ?? g.precio
          })))
        }
      }
    } catch { /* ignore */ }
    // Auto-advance: check if medico required
    const needsMedico = proc.medico_obligatorio
    if (needsMedico) {
      advanceTo(medInputRef)
    } else {
      advanceTo(examSearchInputRef)
    }
  }
  selectProcRef.current = selectProcedencia

  const clearProcedencia = () => {
    setProcSearchQuery('')
    setProcSearchOpen(false)
    setOrden(prev => ({ ...prev, procedencia_id: null, procedencia_nombre: '', servicio_id: null }))
    setServicioInfo(null)
  }

  // ── Flat index helpers for search dropdown ──
  const getSearchItemFlatIdx = (type, idx) => {
    if (type === 'grupo') return idx
    return searchResults.grupos.length + idx
  }

  // ── Any dropdown open (for Escape handling) ──
  const anyDropdownOpen = searchOpen || pacSearchOpen || medSearchOpen || procSearchOpen

  return {
    // Router
    numero, navigate, isEdit,
    // State
    loading, saving, error, setError,
    paciente, setPaciente, orden, setOrden,
    selectedPruebas, selectedGrupos,
    catalogs, servicioInfo,
    // Search state
    searchQuery, searchResults, searchOpen, searchLoading, searchFlatItems,
    pacSearchQuery, pacSearchResults, pacSearchOpen,
    medSearchQuery, medSearchResults, medSearchOpen,
    procSearchQuery, procFiltered, procSearchOpen,
    showNewMedico, setShowNewMedico, newMedico, setNewMedico,
    // Handlers
    handlePacSearchChange, selectPaciente, resetPaciente,
    handleMedSearchChange, selectMedico, handleCreateMedico,
    handleProcSearchChange, selectProcedencia, clearProcedencia,
    handleSearchChange, addPrueba, addGrupo, removePrueba, removeGrupo,
    handleSave,
    // Computed
    totalPrice, calcTotales, muestrasPreview, stepStatus,
    // Descuento & cantidades
    descuento, updateDescuento, descuentoCategorias, selectedCategoriaId, selectDescuentoCategoria,
    grupoCantidades, updateGrupoCantidad,
    getSearchItemFlatIdx, anyDropdownOpen,
    // Keyboard nav
    procKb, pacKb, medKb, searchKb,
    // Refs
    searchRef, pacSearchRef, medSearchRef, procSearchRef,
    pacInputRef, procInputRef, medInputRef, examSearchInputRef,
    // Focus helper
    advanceTo,
  }
}
