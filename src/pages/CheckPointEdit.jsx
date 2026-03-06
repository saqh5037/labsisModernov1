import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCheckpointDetail, createCheckpoint, updateCheckpoint, getStatusMuestra, getTrazDepartamentos, getTrazCAPs } from '../services/api'

export default function CheckPointEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id

  const [form, setForm] = useState({
    descripcion: '', ip: '', comentario: '', orden: '',
    codigo_local_storage: '', status_muestra_id: '',
    departamento_laboratorio_id: '', centro_atencion_paciente_id: '',
    mesa_trabajo_microbiologia_id: '',
    entrada_lab: false, muestra_recibida: false,
    ingreso_automatico_lista_trabajo: false, reporte: false,
    envio_estructura_orden: false,
  })
  const [statusList, setStatusList] = useState([])
  const [deptos, setDeptos] = useState([])
  const [caps, setCaps] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      getStatusMuestra(),
      getTrazDepartamentos(),
      getTrazCAPs(),
      id ? getCheckpointDetail(id) : Promise.resolve(null),
    ]).then(([sm, dl, cap, cp]) => {
      setStatusList(sm)
      setDeptos(dl)
      setCaps(cap)
      if (cp) {
        setForm({
          descripcion: cp.descripcion || '',
          ip: cp.ip || '',
          comentario: cp.comentario || '',
          orden: cp.orden ?? '',
          codigo_local_storage: cp.codigo_local_storage || '',
          status_muestra_id: cp.status_muestra_id ?? '',
          departamento_laboratorio_id: cp.departamento_laboratorio_id ?? '',
          centro_atencion_paciente_id: cp.centro_atencion_paciente_id ?? '',
          mesa_trabajo_microbiologia_id: cp.mesa_trabajo_microbiologia_id ?? '',
          entrada_lab: cp.entrada_lab || false,
          muestra_recibida: cp.muestra_recibida || false,
          ingreso_automatico_lista_trabajo: cp.ingreso_automatico_lista_trabajo || false,
          reporte: cp.reporte || false,
          envio_estructura_orden: cp.envio_estructura_orden || false,
        })
      }
      setLoading(false)
    }).catch(err => {
      setError(err.message)
      setLoading(false)
    })
  }, [id])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.descripcion.trim()) { setError('Descripcion es requerida'); return }
    setSaving(true)
    setError('')
    try {
      const data = {
        ...form,
        orden: form.orden === '' ? null : Number(form.orden),
        status_muestra_id: form.status_muestra_id || null,
        departamento_laboratorio_id: form.departamento_laboratorio_id || null,
        centro_atencion_paciente_id: form.centro_atencion_paciente_id || null,
        mesa_trabajo_microbiologia_id: form.mesa_trabajo_microbiologia_id || null,
      }
      if (isNew) {
        await createCheckpoint(data)
      } else {
        await updateCheckpoint(id, data)
      }
      navigate('/admin/checkpoints')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>

  return (
    <form className="cp-form" onSubmit={handleSubmit}>
      <div className="cp-form-header">
        <button type="button" className="cp-admin-back" onClick={() => navigate('/admin/checkpoints')} title="Volver">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1>{isNew ? 'Nuevo CheckPoint' : `Editar CheckPoint: ${form.descripcion}`}</h1>
      </div>

      {error && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: 13 }}>{error}</div>}

      <div className="cp-form-section">
        <h3>Informacion General</h3>
        <div className="cp-field">
          <label>Descripcion *</label>
          <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} required />
        </div>
        <div className="cp-field-row">
          <div className="cp-field">
            <label>IP Estacion</label>
            <input value={form.ip} onChange={e => set('ip', e.target.value)} placeholder="192.168.1.x" />
          </div>
          <div className="cp-field">
            <label>Orden</label>
            <input type="number" value={form.orden} onChange={e => set('orden', e.target.value)} />
          </div>
        </div>
        <div className="cp-field">
          <label>Comentario</label>
          <input value={form.comentario} onChange={e => set('comentario', e.target.value)} />
        </div>
        <div className="cp-field">
          <label>Cod. Offline</label>
          <input value={form.codigo_local_storage} onChange={e => set('codigo_local_storage', e.target.value)} maxLength={10} />
        </div>
      </div>

      <div className="cp-form-section">
        <h3>Comportamiento</h3>
        <div className="cp-field">
          <label>Status Muestra</label>
          <select value={form.status_muestra_id} onChange={e => set('status_muestra_id', e.target.value)}>
            <option value="">— Sin asignar —</option>
            {statusList.map(s => (
              <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>
            ))}
          </select>
        </div>
        <div className="cp-field-row">
          <div className="cp-field">
            <label>Departamento Lab</label>
            <select value={form.departamento_laboratorio_id} onChange={e => set('departamento_laboratorio_id', e.target.value)}>
              <option value="">— Ninguno —</option>
              {deptos.map(d => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>
          <div className="cp-field">
            <label>Centro Atencion</label>
            <select value={form.centro_atencion_paciente_id} onChange={e => set('centro_atencion_paciente_id', e.target.value)}>
              <option value="">— Ninguno —</option>
              {caps.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="cp-form-section">
        <h3>Opciones</h3>
        <div className="cp-toggle-group">
          <label className="cp-toggle">
            <input type="checkbox" checked={form.entrada_lab} onChange={e => set('entrada_lab', e.target.checked)} />
            Entrada Lab (activa areas de analisis)
          </label>
          <label className="cp-toggle">
            <input type="checkbox" checked={form.muestra_recibida} onChange={e => set('muestra_recibida', e.target.checked)} />
            Marca muestra como recibida
          </label>
          <label className="cp-toggle">
            <input type="checkbox" checked={form.ingreso_automatico_lista_trabajo} onChange={e => set('ingreso_automatico_lista_trabajo', e.target.checked)} />
            Ingreso automatico a lista de trabajo
          </label>
          <label className="cp-toggle">
            <input type="checkbox" checked={form.reporte} onChange={e => set('reporte', e.target.checked)} />
            Aparece en reportes
          </label>
          <label className="cp-toggle">
            <input type="checkbox" checked={form.envio_estructura_orden} onChange={e => set('envio_estructura_orden', e.target.checked)} />
            Envio estructura orden
          </label>
        </div>
      </div>

      <div className="cp-form-actions">
        <button type="button" className="cp-btn cp-btn--cancel" onClick={() => navigate('/admin/checkpoints')}>Cancelar</button>
        <button type="submit" className="cp-btn cp-btn--save" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </form>
  )
}
