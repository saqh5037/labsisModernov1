import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import { searchMedicos, createMedico, updateOrdenMedico } from '../services/api'

export default function DoctorModal({ open, onClose, numero, onSaved }) {
  const [mode, setMode] = useState('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nombre: '', apellido_paterno: '', apellido_materno: '', email: '', telefono: '' })
  const debounceRef = useRef()

  useEffect(() => {
    if (open) {
      setMode('search')
      setQuery('')
      setResults([])
      setForm({ nombre: '', apellido_paterno: '', apellido_materno: '', email: '', telefono: '' })
    }
  }, [open])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try { setResults(await searchMedicos(query)) } catch (e) { /* ignore */ }
      setLoading(false)
    }, 300)
  }, [query])

  const selectDoctor = async (doc) => {
    setSaving(true)
    try {
      await updateOrdenMedico(numero, doc.id)
      onSaved()
      onClose()
    } catch (e) { alert('Error al guardar médico') }
    setSaving(false)
  }

  const createAndAssign = async () => {
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      const newDoc = await createMedico(form)
      await updateOrdenMedico(numero, newDoc.id)
      onSaved()
      onClose()
    } catch (e) { alert('Error al crear médico') }
    setSaving(false)
  }

  const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }))

  return (
    <Modal open={open} onClose={onClose} title={mode === 'search' ? 'Buscar Médico' : 'Crear Médico'} width={420}>
      {mode === 'search' ? (
        <>
          <label className="ot-modal-label">Buscar por nombre:</label>
          <input className="ot-modal-input" placeholder="Nombre del doctor..."
            value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          {loading && <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>Buscando...</p>}
          {results.length > 0 && (
            <div className="ot-doc-results">
              {results.map(d => (
                <div key={d.id} className="ot-doc-item" onClick={() => !saving && selectDoctor(d)}>
                  <div className="ot-doc-name">
                    {[d.nombre, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(' ')}
                  </div>
                  {(d.email || d.telefono) && (
                    <div className="ot-doc-meta">{[d.email, d.telefono].filter(Boolean).join(' — ')}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {query.length >= 2 && results.length === 0 && !loading && (
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
              Médico no encontrado. ¿Desea crearlo?
            </p>
          )}
          <div className="ot-modal-actions">
            <button className="ot-btn ot-btn-gold ot-btn-sm" onClick={() => setMode('create')}>Crear Médico</button>
            <button className="ot-btn ot-btn-muted ot-btn-sm" onClick={onClose}>Cancelar</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <label className="ot-modal-label">Nombre *</label>
              <input className="ot-modal-input" value={form.nombre}
                onChange={e => updateField('nombre', e.target.value)} autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="ot-modal-label">Apellido Paterno</label>
                <input className="ot-modal-input" value={form.apellido_paterno}
                  onChange={e => updateField('apellido_paterno', e.target.value)} />
              </div>
              <div>
                <label className="ot-modal-label">Apellido Materno</label>
                <input className="ot-modal-input" value={form.apellido_materno}
                  onChange={e => updateField('apellido_materno', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="ot-modal-label">Email</label>
                <input className="ot-modal-input" type="email" value={form.email}
                  onChange={e => updateField('email', e.target.value)} />
              </div>
              <div>
                <label className="ot-modal-label">Teléfono</label>
                <input className="ot-modal-input" value={form.telefono}
                  onChange={e => updateField('telefono', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="ot-modal-actions">
            <button className="ot-btn ot-btn-gold ot-btn-sm" onClick={createAndAssign}
              disabled={saving || !form.nombre.trim()}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button className="ot-btn ot-btn-muted ot-btn-sm" onClick={() => setMode('search')}>Volver</button>
          </div>
        </>
      )}
    </Modal>
  )
}
