import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPaciente, getPacienteConfig, getPacientes, createPaciente, updatePaciente, validarCiPaciente, getVinculos, getCatalogoRazas, getCatalogoSaludos } from '../services/api'

export default function PacienteEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const [form, setForm] = useState({
    ci_paciente: '', nombre: '', apellido: '', apellido_segundo: '',
    sexo: '', fecha_nacimiento: '', email: '',
    telefono: '', telefono_celular: '',
    direccion1: '', direccion2: '', direccion3: '', direccion4: '',
    codigo_postal: '', observaciones: '', vip: false,
    paciente_representante_id: null, vinculo_representante_id: null,
    estado_civil: '', nacionalidad: '', raza_id: '', paciente_saludo_id: '',
    lugar_nacimiento: '', num_historia: '', empresa: false
  })
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [ciStatus, setCiStatus] = useState(null)
  const [ciConflict, setCiConflict] = useState(null)
  const ciDebounceRef = useRef(null)
  const [editHistory, setEditHistory] = useState([])

  // Catálogos demográficos
  const [razas, setRazas] = useState([])
  const [saludos, setSaludos] = useState([])

  // Representante state
  const [vinculos, setVinculos] = useState([])
  const [repSearch, setRepSearch] = useState('')
  const [repResults, setRepResults] = useState([])
  const [repSearching, setRepSearching] = useState(false)
  const [selectedRep, setSelectedRep] = useState(null)
  const repDebounceRef = useRef(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cfg, vincs, razasCat, saludosCat] = await Promise.all([
          getPacienteConfig(),
          getVinculos(),
          getCatalogoRazas().catch(() => []),
          getCatalogoSaludos().catch(() => [])
        ])
        setConfig(cfg)
        setVinculos(vincs)
        setRazas(razasCat)
        setSaludos(saludosCat)

        if (!isNew) {
          const data = await getPaciente(id)
          const p = data.paciente
          setForm({
            ci_paciente: p.ci_paciente || '',
            nombre: p.nombre || '',
            apellido: p.apellido || '',
            apellido_segundo: p.apellido_segundo || '',
            sexo: p.sexo || '',
            fecha_nacimiento: p.fecha_nacimiento ? p.fecha_nacimiento.split('T')[0] : '',
            email: p.email || '',
            telefono: p.telefono || '',
            telefono_celular: p.telefono_celular || '',
            direccion1: p.direccion1 || '',
            direccion2: p.direccion2 || '',
            direccion3: p.direccion3 || '',
            direccion4: p.direccion4 || '',
            codigo_postal: p.codigo_postal || '',
            observaciones: p.observaciones || '',
            vip: p.vip || false,
            paciente_representante_id: p.paciente_representante_id || null,
            vinculo_representante_id: p.vinculo_representante_id || null,
            estado_civil: p.estado_civil || '',
            nacionalidad: p.nacionalidad || '',
            raza_id: p.raza_id || '',
            paciente_saludo_id: p.paciente_saludo_id || '',
            lugar_nacimiento: p.lugar_nacimiento || '',
            num_historia: p.num_historia || '',
            empresa: p.empresa || false
          })
          if (data.representante) {
            setSelectedRep(data.representante)
          }
          // Filter edit history (EDICION + CREACION only)
          if (data.historial) {
            const ediciones = data.historial.filter(h =>
              h.accion && (h.accion.startsWith('EDICION') || h.accion.startsWith('CREACION'))
            ).slice(0, 10)
            setEditHistory(ediciones)
          }
        }
      } catch {
        navigate('/pacientes')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, isNew, navigate])

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const checkCi = useCallback((ci) => {
    if (ciDebounceRef.current) clearTimeout(ciDebounceRef.current)
    if (!ci || !ci.trim()) {
      setCiStatus(null)
      setCiConflict(null)
      return
    }
    setCiStatus('checking')
    ciDebounceRef.current = setTimeout(async () => {
      try {
        const result = await validarCiPaciente(ci.trim(), isNew ? undefined : id)
        if (result.exists) {
          setCiStatus('exists')
          setCiConflict(result.paciente)
        } else {
          setCiStatus('ok')
          setCiConflict(null)
        }
      } catch {
        setCiStatus(null)
      }
    }, 500)
  }, [id, isNew])

  const handleCiChange = (value) => {
    set('ci_paciente', value)
    checkCi(value)
  }

  // Representante search
  const searchRep = useCallback((q) => {
    if (repDebounceRef.current) clearTimeout(repDebounceRef.current)
    if (!q || q.trim().length < 2) {
      setRepResults([])
      setRepSearching(false)
      return
    }
    setRepSearching(true)
    repDebounceRef.current = setTimeout(async () => {
      try {
        const data = await getPacientes({ q: q.trim(), limit: 5 })
        const filtered = (data.pacientes || []).filter(p => String(p.id) !== String(id))
        setRepResults(filtered)
      } catch {
        setRepResults([])
      } finally {
        setRepSearching(false)
      }
    }, 400)
  }, [id])

  const selectRep = (pac) => {
    setSelectedRep(pac)
    set('paciente_representante_id', pac.id)
    setRepSearch('')
    setRepResults([])
  }

  const removeRep = () => {
    setSelectedRep(null)
    set('paciente_representante_id', null)
    set('vinculo_representante_id', null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!form.nombre.trim()) return setError('El nombre es requerido')
    if (!form.apellido.trim()) return setError('El apellido es requerido')
    if (!form.sexo) return setError('El sexo es requerido')
    if (ciStatus === 'exists') return setError('Ya existe un paciente con esa cédula. Verifica antes de guardar.')

    setSaving(true)
    try {
      if (isNew) {
        const result = await createPaciente(form)
        navigate(`/pacientes/${result.id}`)
      } else {
        await updatePaciente(id, form)
        navigate(`/pacientes/${id}`)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="pac-loading">Cargando...</div>

  const cfg = config || {}
  const show = (field) => {
    const alwaysShow = ['nombre', 'apellido', 'sexo', 'fecha_nacimiento', 'email', 'telefono_celular']
    if (alwaysShow.includes(field)) return true
    const map = {
      ci_paciente: 'ci_paciente',
      apellido_segundo: 'apellido_segundo',
      telefono: 'telefono',
      direccion1: 'direccion_1',
      direccion2: 'direccion_2',
      direccion3: 'direccion_3',
      direccion4: 'direccion_4',
      codigo_postal: 'codigo_postal',
      observaciones: true,
      estado_civil: 'estado_civil',
      nacionalidad: 'nacionalidad',
      raza_id: 'raza',
      paciente_saludo_id: 'saludo_paciente',
      lugar_nacimiento: 'lugar_nacimiento',
      num_historia: 'historia_medica',
    }
    const cfgKey = map[field]
    if (cfgKey === true) return true
    if (!cfgKey) return true
    return cfg[cfgKey] !== false
  }

  return (
    <div className="ot-shell">
    <div className="ot-content">
      {/* Header */}
      <div className="pac-detail-header">
        <button className="ot-btn ot-btn-muted" onClick={() => navigate(isNew ? '/pacientes' : `/pacientes/${id}`)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          {isNew ? 'Pacientes' : 'Detalle'}
        </button>
        <h2 className="pac-edit-title">
          {isNew ? 'Nuevo Paciente' : `Editar: ${form.nombre} ${form.apellido}`}
        </h2>
      </div>

      <form className="pac-edit-form" onSubmit={handleSubmit}>
        {error && (
          <div className="pac-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginRight: 8 }}>
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            {error}
          </div>
        )}

        {/* Grid 2 columnas: Identificación + Datos Personales */}
        <div className="pac-edit-grid">
          {/* Identificación */}
          <div className="pac-form-section">
            <h3>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: '-2px' }}>
                <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
              </svg>
              Identificación
            </h3>
            <div className="pac-form-grid">
              {show('ci_paciente') && (
                <div className="pac-form-field">
                  <label>Cédula / CI</label>
                  <input
                    value={form.ci_paciente}
                    onChange={e => handleCiChange(e.target.value)}
                    maxLength={30}
                    placeholder="Ej: 12345678"
                    className={ciStatus === 'exists' ? 'pac-input-error' : ciStatus === 'ok' ? 'pac-input-ok' : ''}
                  />
                  {ciStatus === 'checking' && <span className="pac-field-hint">Verificando...</span>}
                  {ciStatus === 'ok' && <span className="pac-field-hint pac-hint-ok">CI disponible</span>}
                  {ciStatus === 'exists' && ciConflict && (
                    <span className="pac-field-hint pac-hint-error">
                      Ya existe: {ciConflict.nombre} {ciConflict.apellido}
                    </span>
                  )}
                </div>
              )}
              <div className="pac-form-field pac-field-required">
                <label>Nombre *</label>
                <input value={form.nombre} onChange={e => set('nombre', e.target.value)} required placeholder="Nombre(s)" />
              </div>
              <div className="pac-form-field pac-field-required">
                <label>Apellido *</label>
                <input value={form.apellido} onChange={e => set('apellido', e.target.value)} required placeholder="Primer apellido" />
              </div>
              {show('apellido_segundo') && (
                <div className="pac-form-field">
                  <label>Segundo Apellido</label>
                  <input value={form.apellido_segundo} onChange={e => set('apellido_segundo', e.target.value)} placeholder="Segundo apellido" />
                </div>
              )}
            </div>
          </div>

          {/* Datos personales */}
          <div className="pac-form-section">
            <h3>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: '-2px' }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Datos Personales
            </h3>
            <div className="pac-form-grid">
              <div className="pac-form-field pac-field-required">
                <label>Sexo *</label>
                <div className="pac-radio-group">
                  <label className={`pac-radio ${form.sexo === 'M' ? 'pac-radio-active' : ''}`}>
                    <input type="radio" name="sexo" value="M" checked={form.sexo === 'M'} onChange={e => set('sexo', e.target.value)} />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="10" cy="14" r="5"/><path d="M19 5l-4.5 4.5"/><path d="M15 5h4v4"/>
                    </svg>
                    M
                  </label>
                  <label className={`pac-radio ${form.sexo === 'F' ? 'pac-radio-active' : ''}`}>
                    <input type="radio" name="sexo" value="F" checked={form.sexo === 'F'} onChange={e => set('sexo', e.target.value)} />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="5"/><path d="M12 13v8"/><path d="M9 18h6"/>
                    </svg>
                    F
                  </label>
                </div>
              </div>
              <div className="pac-form-field">
                <label>Fecha de Nacimiento</label>
                <input type="date" value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} max={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="pac-form-field">
                <label>VIP</label>
                <label className={`pac-toggle ${form.vip ? 'pac-toggle-active' : ''}`}>
                  <input type="checkbox" checked={form.vip} onChange={e => set('vip', e.target.checked)} />
                  <span className="pac-toggle-track">
                    <span className="pac-toggle-thumb" />
                  </span>
                  <span className="pac-toggle-label">{form.vip ? 'VIP' : 'No VIP'}</span>
                </label>
              </div>
              <div className="pac-form-field">
                <label>Empresa</label>
                <label className={`pac-toggle ${form.empresa ? 'pac-toggle-active' : ''}`}>
                  <input type="checkbox" checked={form.empresa} onChange={e => set('empresa', e.target.checked)} />
                  <span className="pac-toggle-track">
                    <span className="pac-toggle-thumb" />
                  </span>
                  <span className="pac-toggle-label">{form.empresa ? 'Es empresa' : 'Persona'}</span>
                </label>
              </div>
              {show('estado_civil') && (
                <div className="pac-form-field">
                  <label>Estado Civil</label>
                  <select value={form.estado_civil} onChange={e => set('estado_civil', e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    <option value="Soltero">Soltero</option>
                    <option value="Casado">Casado</option>
                    <option value="Divorciado">Divorciado</option>
                    <option value="Viudo">Viudo</option>
                    <option value="Unión Libre">Unión Libre</option>
                  </select>
                </div>
              )}
              {show('nacionalidad') && (
                <div className="pac-form-field">
                  <label>Nacionalidad</label>
                  <input value={form.nacionalidad} onChange={e => set('nacionalidad', e.target.value)} maxLength={20} placeholder="Ej: Mexicana" />
                </div>
              )}
              {show('lugar_nacimiento') && (
                <div className="pac-form-field">
                  <label>Lugar de Nacimiento</label>
                  <input value={form.lugar_nacimiento} onChange={e => set('lugar_nacimiento', e.target.value)} maxLength={20} />
                </div>
              )}
              {show('raza_id') && razas.length > 0 && (
                <div className="pac-form-field">
                  <label>Raza</label>
                  <select value={form.raza_id} onChange={e => set('raza_id', e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {razas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
              )}
              {show('paciente_saludo_id') && saludos.length > 0 && (
                <div className="pac-form-field">
                  <label>Saludo</label>
                  <select value={form.paciente_saludo_id} onChange={e => set('paciente_saludo_id', e.target.value)}>
                    <option value="">— Seleccionar —</option>
                    {saludos.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
              {show('num_historia') && (
                <div className="pac-form-field">
                  <label>Num. Historia</label>
                  <input value={form.num_historia} onChange={e => set('num_historia', e.target.value)} placeholder="Número de expediente" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grid 2 columnas: Contacto + Dirección */}
        <div className="pac-edit-grid">
          {/* Contacto */}
          <div className="pac-form-section">
            <h3>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: '-2px' }}>
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              Contacto
            </h3>
            <div className="pac-form-grid">
              <div className="pac-form-field">
                <label>Celular</label>
                <input value={form.telefono_celular} onChange={e => set('telefono_celular', e.target.value)} placeholder="Ej: 55 1234 5678" />
              </div>
              {show('telefono') && (
                <div className="pac-form-field">
                  <label>Teléfono Fijo</label>
                  <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="Ej: 55 1234 5678" />
                </div>
              )}
              <div className="pac-form-field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
              </div>
            </div>
          </div>

          {/* Dirección */}
          {(show('direccion1') || show('direccion2') || show('direccion3') || show('direccion4')) && (
            <div className="pac-form-section">
              <h3>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: '-2px' }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                Dirección
              </h3>
              <div className="pac-form-grid">
                {show('direccion1') && (
                  <div className="pac-form-field">
                    <label>Ciudad</label>
                    <input value={form.direccion1} onChange={e => set('direccion1', e.target.value)} placeholder="Ciudad" />
                  </div>
                )}
                {show('direccion2') && (
                  <div className="pac-form-field">
                    <label>Municipio</label>
                    <input value={form.direccion2} onChange={e => set('direccion2', e.target.value)} placeholder="Municipio" />
                  </div>
                )}
                {show('direccion3') && (
                  <div className="pac-form-field">
                    <label>Calle</label>
                    <input value={form.direccion3} onChange={e => set('direccion3', e.target.value)} placeholder="Calle o avenida" />
                  </div>
                )}
                {show('direccion4') && (
                  <div className="pac-form-field">
                    <label>Número</label>
                    <input value={form.direccion4} onChange={e => set('direccion4', e.target.value)} placeholder="No." />
                  </div>
                )}
                {show('codigo_postal') && (
                  <div className="pac-form-field">
                    <label>Código Postal</label>
                    <input value={form.codigo_postal} onChange={e => set('codigo_postal', e.target.value)} placeholder="C.P." />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Representante / Tutor (ancho completo) */}
        <div className="pac-form-section">
          <h3>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: '-2px' }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Representante / Tutor
          </h3>
          {selectedRep ? (
            <div className="pac-rep-card" style={{ position: 'relative', zIndex: 1 }}>
              <div className="pac-rep-info">
                <strong>{selectedRep.nombre} {selectedRep.apellido}</strong>
                {selectedRep.ci_paciente && <span className="pac-rep-ci">CI: {selectedRep.ci_paciente}</span>}
              </div>
              <div className="pac-rep-actions">
                <div className="pac-form-field" style={{ minWidth: 150 }}>
                  <label>Vínculo</label>
                  <select
                    value={form.vinculo_representante_id || ''}
                    onChange={e => set('vinculo_representante_id', e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Seleccionar...</option>
                    {vinculos.map(v => (
                      <option key={v.id} value={v.id}>{v.nombre}</option>
                    ))}
                  </select>
                </div>
                <button type="button" className="ot-btn ot-btn-red" onClick={removeRep} style={{ alignSelf: 'flex-end' }}>
                  Quitar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="pac-form-field">
                <label>Buscar paciente representante</label>
                <input
                  value={repSearch}
                  onChange={e => { setRepSearch(e.target.value); searchRep(e.target.value) }}
                  placeholder="Escribe nombre, apellido o CI..."
                />
                {repSearching && <span className="pac-field-hint">Buscando...</span>}
              </div>
              {repResults.length > 0 && (
                <div className="pac-rep-dropdown">
                  {repResults.map(r => (
                    <div key={r.id} className="pac-rep-option" onClick={() => selectRep(r)}>
                      <strong>{r.apellido} {r.apellido_segundo || ''}, {r.nombre}</strong>
                      {r.ci_paciente && <span className="pac-rep-ci">CI: {r.ci_paciente}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Observaciones (ancho completo) */}
        <div className="pac-form-section">
          <h3>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6, verticalAlign: '-2px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Observaciones
          </h3>
          <textarea
            className="pac-textarea"
            value={form.observaciones}
            onChange={e => set('observaciones', e.target.value)}
            rows={2}
            placeholder="Notas o comentarios sobre el paciente..."
          />
        </div>

        {/* Botones */}
        <div className="pac-form-actions">
          <button type="submit" className="ot-btn ot-btn-green" disabled={saving || ciStatus === 'exists'}>
            {saving ? 'Guardando...' : (isNew ? 'Crear Paciente' : 'Guardar Cambios')}
          </button>
          <button type="button" className="ot-btn ot-btn-muted" onClick={() => navigate(isNew ? '/pacientes' : `/pacientes/${id}`)}>
            Cancelar
          </button>
        </div>
      </form>

      {/* Histórico de ediciones */}
      {!isNew && editHistory.length > 0 && (
        <div className="pac-edit-history">
          <div className="pac-edit-history-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Histórico de ediciones ({editHistory.length})
          </div>
          <div className="pac-edit-history-list">
            {editHistory.map(h => (
              <div key={h.id} className="pac-edit-history-row">
                <span className="pac-edit-history-date">
                  {h.fecha ? new Date(h.fecha).toLocaleString('es-MX', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  }) : '—'}
                </span>
                <span className="pac-edit-history-user">{h.usuario || '—'}</span>
                <span className="pac-edit-history-action">
                  <span className={`pac-edit-history-badge ${h.accion?.startsWith('CREACION') ? 'pac-edit-history-badge--create' : 'pac-edit-history-badge--edit'}`}>
                    {h.accion?.startsWith('CREACION') ? 'CREACIÓN' : 'EDICIÓN'}
                  </span>
                  {h.accion?.replace(/^(EDICION|CREACION)\s*-?\s*/i, '')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
