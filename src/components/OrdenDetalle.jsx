import { useState, useEffect } from 'react'
import { getOrdenDetalle } from '../services/api'

const statusMap = (id) => {
  if (id === 4) return { label: 'Validado', cls: 'green' }
  if (id === 2) return { label: 'Iniciada', cls: 'amber' }
  if (id === 1 || id === 3 || id === 5) return { label: 'Activo', cls: 'red' }
  if (id === 8) return { label: 'Por Validar', cls: 'pink' }
  if (id === 6) return { label: 'Abortada', cls: 'black' }
  if (id === 9) return { label: 'Transmitido', cls: 'blue' }
  if (id === 10) return { label: 'En Espera', cls: 'blue' }
  return { label: 'Desconocido', cls: 'gray' }
}

const calcAge = (bd) => {
  if (!bd) return null
  const b = new Date(bd), n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return a
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }) : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('es-MX', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

export default function OrdenDetalle({ numero, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('general')

  useEffect(() => {
    if (!numero) return
    setLoading(true); setError(null)
    getOrdenDetalle(numero)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [numero])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const pruebasByArea = (data?.pruebas || []).reduce((acc, p) => {
    const area = p.area || 'Sin área'
    if (!acc[area]) acc[area] = []
    acc[area].push(p)
    return acc
  }, {})

  const st = data ? statusMap(data.status_id) : { label: '', cls: 'gray' }

  return (
    <>
      <div className="od-overlay" onClick={onClose} />
      <div className="od-panel">
        {/* Header */}
        <div className="od-header">
          <div className="od-header-left">
            <span className="od-title">Orden de Trabajo {numero}</span>
            {data && <span className={`od-badge od-badge-${st.cls}`}>{data.status || st.label}</span>}
          </div>
          <button className="od-close" onClick={onClose} title="Cerrar (Esc)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="od-tabs">
          {[
            ['general', 'Información General'],
            ['pruebas', `Estructura (${data?.pruebas?.length || 0})`],
            ['muestras', `Muestras (${data?.muestras?.length || 0})`],
          ].map(([id, label]) => (
            <button key={id} className={`od-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="od-body">
          {loading && (
            <div className="od-loading"><div className="od-spinner" /><span>Cargando orden...</span></div>
          )}
          {error && <div className="od-error">Error: {error}</div>}

          {data && !loading && tab === 'general' && (
            <div className="od-general">
              {/* Paciente */}
              <section className="od-section">
                <h3 className="od-section-title">Paciente</h3>
                <div className="od-patient-name">{data.paciente}</div>
                <div className="od-patient-ci">{data.ci_paciente || '—'}</div>
                <div className="od-grid od-grid-3">
                  <Field label="Sexo" value={data.sexo === 'M' ? 'Masculino' : data.sexo === 'F' ? 'Femenino' : '—'} />
                  <Field label="Edad" value={calcAge(data.fecha_nacimiento) != null ? `${calcAge(data.fecha_nacimiento)} años` : '—'} />
                  <Field label="F. Nacimiento" value={fmtDate(data.fecha_nacimiento)} />
                  {data.num_historia && <Field label="Núm. Historia" value={data.num_historia} />}
                  {data.telefono && <Field label="Teléfono" value={data.telefono} />}
                  {data.telefono_celular && <Field label="Celular" value={data.telefono_celular} />}
                  {data.email && <Field label="Email" value={data.email} span2 />}
                  {data.direccion && <Field label="Dirección" value={data.direccion} span3 />}
                </div>
              </section>

              {/* Orden */}
              <section className="od-section">
                <h3 className="od-section-title">Datos de la Orden</h3>
                <div className="od-grid od-grid-3">
                  <Field label="Fecha" value={fmtDateTime(data.fecha)} />
                  <Field label="Procedencia" value={data.procedencia || '—'} />
                  <Field label="Departamento" value={data.departamento || '—'} />
                  <Field label="Servicio Médico" value={data.servicio_medico || '—'} />
                  <Field label="Doctor" value={data.medico_nombre?.trim() || '—'} />
                  <Field label="Registró" value={data.usuario_registro || '—'} />
                  {data.num_ingreso && <Field label="Núm. Ingreso" value={data.num_ingreso} />}
                  {data.habitacion && <Field label="Habitación" value={data.habitacion} />}
                  {data.folio && <Field label="Folio" value={data.folio} />}
                  {data.precio != null && <Field label="Precio" value={`$${Number(data.precio).toFixed(2)}`} />}
                  {data.facturada_numero && <Field label="Núm. Factura" value={data.facturada_numero} />}
                  {data.fecha_estimada_entrega && <Field label="Entrega Estimada" value={fmtDateTime(data.fecha_estimada_entrega)} />}
                </div>
                {(data.peso || data.estatura) && (
                  <div className="od-grid od-grid-3" style={{ marginTop: 8 }}>
                    {data.peso && <Field label="Peso" value={`${data.peso} kg`} />}
                    {data.estatura && <Field label="Estatura" value={`${data.estatura} m`} />}
                    {data.embarazada && <span className="od-flag-emb">Embarazada</span>}
                  </div>
                )}
                {data.informacion_clinica && (
                  <div className="od-note">
                    <span className="od-note-label">Información Clínica</span>
                    <p>{data.informacion_clinica}</p>
                  </div>
                )}
                {data.observaciones && (
                  <div className="od-note">
                    <span className="od-note-label">Observaciones</span>
                    <p>{data.observaciones}</p>
                  </div>
                )}
              </section>
            </div>
          )}

          {data && !loading && tab === 'pruebas' && (
            <div className="od-pruebas">
              {Object.entries(pruebasByArea).map(([area, pruebas]) => (
                <div key={area} className="od-area-group">
                  <div className="od-area-header">
                    <span>{area}</span>
                    <span className="od-area-count">{pruebas.length}</span>
                  </div>
                  {pruebas.map(p => {
                    const pst = statusMap(null)
                    const cls = p.color ? (p.color.includes('981f') ? 'green' : p.color.includes('d448') ? 'red' : p.color.includes('ffa5') ? 'amber' : 'gray') : 'gray'
                    return (
                      <div key={p.id} className="od-prueba-row">
                        <div className="od-prueba-left">
                          <span className={`od-prueba-dot od-dot-${cls}`} />
                          <span className="od-prueba-name">{p.prueba}</span>
                        </div>
                        <div className="od-prueba-right">
                          {p.anormal && <span className="od-flag od-flag-a">A</span>}
                          {p.critico && <span className="od-flag od-flag-c">C</span>}
                          {p.precio != null && p.precio > 0 && (
                            <span className="od-prueba-price">${Number(p.precio).toFixed(2)}</span>
                          )}
                          <span className={`od-prueba-status od-ps-${cls}`}>{p.status_prueba || '—'}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              {(!data.pruebas || data.pruebas.length === 0) && (
                <div className="od-empty">Sin pruebas registradas</div>
              )}
            </div>
          )}

          {data && !loading && tab === 'muestras' && (
            <div className="od-muestras">
              {(data.muestras || []).length === 0 ? (
                <div className="od-empty">Sin muestras registradas</div>
              ) : (
                <table className="od-muestra-table">
                  <thead>
                    <tr>
                      <th>Muestra</th>
                      <th>Contenedor</th>
                      <th>Código de Barras</th>
                      <th>Cant.</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.muestras.map(mu => (
                      <tr key={mu.id}>
                        <td className="od-mu-type">{mu.tipo_muestra || '—'}</td>
                        <td>{mu.contenedor || '—'}</td>
                        <td className="od-mu-barcode">{mu.barcode || '—'}</td>
                        <td style={{ textAlign: 'center' }}>{mu.cantidad}</td>
                        <td>
                          <span className={`od-mu-status ${mu.muestra_recibida ? 'od-mu-recv' : ''}`}>
                            {mu.muestra_recibida ? 'Recibida' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {data && !loading && (
          <div className="od-footer">
            <button className="od-btn od-btn-ghost" onClick={onClose}>Regresar</button>
            <button className="od-btn od-btn-outline" onClick={() => window.print()}>Imprimir</button>
          </div>
        )}
      </div>
    </>
  )
}

function Field({ label, value, span2, span3 }) {
  return (
    <div className={`od-field ${span2 ? 'od-span2' : ''} ${span3 ? 'od-span3' : ''}`}>
      <span className="od-label">{label}</span>
      <span className="od-value">{value}</span>
    </div>
  )
}
