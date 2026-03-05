import { useState } from 'react'

const IcoX = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const IcoPlus = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)
const IcoChevron = ({ open }) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const IcoCheck = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function OrderCard({
  orden, setOrden, paciente, catalogs, servicioInfo,
  procSearchQuery, procFiltered, procSearchOpen,
  handleProcSearchChange, selectProcedencia, clearProcedencia,
  medSearchQuery, medSearchResults, medSearchOpen,
  handleMedSearchChange, selectMedico, handleCreateMedico,
  showNewMedico, setShowNewMedico, newMedico, setNewMedico,
  procKb, medKb, procSearchRef, medSearchRef,
  procInputRef, medInputRef, stepStatus
}) {
  // Collapsible extras — auto-open if any optional field has data
  const hasExtrasData = !!(orden.servicio_medico_id || orden.stat || orden.embarazada ||
    orden.habitacion || orden.num_ingreso || orden.num_episodio ||
    orden.observaciones || orden.informacion_clinica)
  const [extrasOpen, setExtrasOpen] = useState(hasExtrasData)

  const procRequired = catalogs.lab?.procedencia_obligatorio
  const medicoRequired = orden.procedencia_id &&
    catalogs.procedencias.find(p => p.id === orden.procedencia_id)?.medico_obligatorio
  const ingresoRequired = orden.procedencia_id &&
    catalogs.procedencias.find(p => p.id === orden.procedencia_id)?.ingreso_obligatorio

  return (
    <section className="ote-card ote-card-orden">
      <div className="ote-card-header">
        <span className={`ote-card-step ${stepStatus}`}>
          {stepStatus === 'completed' ? <IcoCheck /> : '2'}
        </span>
        <h2 className="ote-card-title">Orden</h2>
      </div>

      <div className="ote-orden-main">
        {/* Procedencia */}
        <div className="ote-field" ref={procSearchRef} style={{ position: 'relative' }}>
          <label>Procedencia {procRequired ? '*' : ''}</label>
          <div className="ote-proc-input-wrap">
            <input
              ref={procInputRef}
              value={procSearchQuery}
              onChange={handleProcSearchChange}
              onKeyDown={procKb.onKeyDown}
              onFocus={() => {
                if (!orden.procedencia_id && procSearchQuery.length >= 1) {
                  const lower = procSearchQuery.toLowerCase()
                  const filtered = catalogs.procedencias.filter(p =>
                    p.nombre.toLowerCase().includes(lower) || (p.codigo || '').toLowerCase().includes(lower)
                  )
                  // We can't call setProcFiltered here directly, it's handled by handleProcSearchChange
                }
              }}
              placeholder="Buscar procedencia..."
              autoComplete="off"
            />
            {orden.procedencia_id && (
              <button className="ote-proc-clear" onClick={clearProcedencia} type="button" title="Limpiar">
                <IcoX />
              </button>
            )}
          </div>
          {procSearchOpen && procFiltered.length > 0 && (
            <div className="ote-autocomplete-dropdown">
              {procFiltered.map((p, i) => (
                <button key={p.id}
                  className={`ote-autocomplete-item${i === procKb.hlIdx ? ' ote-ac-hl' : ''}`}
                  onClick={() => selectProcedencia(p)}>
                  <span className="ote-ac-name">{p.nombre}</span>
                  {p.codigo && <span className="ote-ac-meta">{p.codigo}</span>}
                </button>
              ))}
            </div>
          )}
          {servicioInfo && (
            <div className="ote-servicio-badge">
              {servicioInfo.descripcion}
              {servicioInfo.moneda_nombre && <span> ({servicioInfo.moneda_nombre})</span>}
            </div>
          )}
        </div>

        {/* Medico */}
        <div className="ote-field" ref={medSearchRef} style={{ position: 'relative' }}>
          <label>Medico {medicoRequired ? '*' : ''}</label>
          <input
            ref={medInputRef}
            value={orden.medico_nombre}
            onChange={handleMedSearchChange}
            onKeyDown={medKb.onKeyDown}
            placeholder="Buscar medico..."
            autoComplete="off"
          />
          {medSearchOpen && medSearchResults.length > 0 && (
            <div className="ote-autocomplete-dropdown">
              {medSearchResults.map((m, i) => (
                <button key={m.id}
                  className={`ote-autocomplete-item${i === medKb.hlIdx ? ' ote-ac-hl' : ''}`}
                  onClick={() => selectMedico(m)}>
                  <span className="ote-ac-name">{m.nombre} {m.apellido_paterno || ''} {m.apellido_materno || ''}</span>
                  <span className="ote-ac-meta">{m.id_profesional || m.email || ''}</span>
                </button>
              ))}
            </div>
          )}
          {!orden.medico_id && !showNewMedico && (
            <button className="ote-new-medico-btn" type="button"
              onClick={() => { setShowNewMedico(true) }}>
              <IcoPlus /> Nuevo medico
            </button>
          )}
          {showNewMedico && (
            <div className="ote-new-medico-form">
              <input placeholder="Nombre *" value={newMedico.nombre}
                onChange={e => setNewMedico(m => ({ ...m, nombre: e.target.value }))} />
              <input placeholder="Apellido" value={newMedico.apellido_paterno}
                onChange={e => setNewMedico(m => ({ ...m, apellido_paterno: e.target.value }))} />
              <input placeholder="Cedula / ID Prof." value={newMedico.id_profesional}
                onChange={e => setNewMedico(m => ({ ...m, id_profesional: e.target.value }))} />
              <input placeholder="Email" value={newMedico.email}
                onChange={e => setNewMedico(m => ({ ...m, email: e.target.value }))} />
              <div className="ote-new-medico-actions">
                <button type="button" className="ot-btn ot-btn-primary" onClick={handleCreateMedico}>Guardar</button>
                <button type="button" className="ot-btn ot-btn-ghost" onClick={() => setShowNewMedico(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collapsible extras */}
      <button className="ote-extras-toggle" type="button"
        onClick={() => setExtrasOpen(!extrasOpen)}
        aria-expanded={extrasOpen}>
        <IcoChevron open={extrasOpen} />
        <span>Opciones adicionales</span>
      </button>

      {extrasOpen && (
        <div className="ote-orden-extras">
          <div className="ote-field">
            <label>Servicio Medico</label>
            <select value={orden.servicio_medico_id || ''}
              onChange={e => setOrden(o => ({ ...o, servicio_medico_id: parseInt(e.target.value) || null }))}>
              <option value="">Ninguno</option>
              {catalogs.serviciosMedicos.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div className="ote-extras-checks">
            {catalogs.lab?.show_stat && (
              <label className="ote-check-label">
                <input type="checkbox" checked={orden.stat}
                  onChange={e => setOrden(o => ({ ...o, stat: e.target.checked }))} />
                <span className="ote-stat-badge">STAT</span>
              </label>
            )}
            {paciente.sexo === 'F' && (
              <label className="ote-check-label">
                <input type="checkbox" checked={orden.embarazada}
                  onChange={e => setOrden(o => ({ ...o, embarazada: e.target.checked, semanas_embarazo: e.target.checked ? o.semanas_embarazo : 0 }))} />
                Embarazada
              </label>
            )}
            {orden.embarazada && (
              <div className="ote-field ote-field-inline">
                <label>Sem.</label>
                <input type="number" min="0" max="45" value={orden.semanas_embarazo}
                  onChange={e => setOrden(o => ({ ...o, semanas_embarazo: parseInt(e.target.value) || 0 }))}
                  style={{ width: 60 }} />
              </div>
            )}
          </div>

          <div className="ote-field">
            <label>Habitacion</label>
            <input value={orden.habitacion}
              onChange={e => setOrden(o => ({ ...o, habitacion: e.target.value }))} />
          </div>
          <div className="ote-field">
            <label>Nro. Ingreso {ingresoRequired ? '*' : ''}</label>
            <input value={orden.num_ingreso}
              onChange={e => setOrden(o => ({ ...o, num_ingreso: e.target.value }))} />
          </div>
          <div className="ote-field">
            <label>Protocolo</label>
            <input value={orden.num_episodio}
              onChange={e => setOrden(o => ({ ...o, num_episodio: e.target.value }))} />
          </div>
          <div className="ote-field ote-field-wide">
            <label>Observaciones</label>
            <textarea rows={2} value={orden.observaciones}
              onChange={e => setOrden(o => ({ ...o, observaciones: e.target.value }))} />
          </div>
          <div className="ote-field ote-field-wide">
            <label>Info Clinica</label>
            <textarea rows={2} value={orden.informacion_clinica}
              onChange={e => setOrden(o => ({ ...o, informacion_clinica: e.target.value }))} />
          </div>
        </div>
      )}
    </section>
  )
}
