import { calcAge } from './useOTEditState.js'

const IcoX = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const IcoSearch = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
  </svg>
)
const IcoUser = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const IcoCheck = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function PatientCard({
  paciente, setPaciente, isEdit,
  pacSearchQuery, pacSearchResults, pacSearchOpen,
  handlePacSearchChange, selectPaciente, resetPaciente,
  pacKb, pacSearchRef, pacInputRef, stepStatus
}) {
  const isCollapsed = !!paciente.id
  const edad = calcAge(paciente.fecha_nacimiento)

  return (
    <section className="ote-card ote-card-pac">
      <div className="ote-card-header">
        <span className={`ote-card-step ${stepStatus}`}>
          {stepStatus === 'completed' ? <IcoCheck /> : '1'}
        </span>
        <h2 className="ote-card-title">Paciente</h2>
      </div>

      {/* Compact summary when patient selected */}
      {isCollapsed && (
        <div className="ote-pac-summary">
          <div className="ote-pac-line1">
            <IcoUser />
            <span className="ote-pac-ci">{paciente.ci_paciente}</span>
            <span className="ote-pac-name">
              {paciente.apellido} {paciente.apellido_segundo ? paciente.apellido_segundo + ' ' : ''}{paciente.nombre}
            </span>
          </div>
          <div className="ote-pac-line2">
            <span>{paciente.sexo === 'M' ? 'Masc' : paciente.sexo === 'F' ? 'Fem' : ''}</span>
            {edad && <span>{edad}</span>}
            {paciente.email && <span>{paciente.email}</span>}
            {paciente.telefono && <span>{paciente.telefono}</span>}
          </div>
          {!isEdit && (
            <button className="ote-pac-change" onClick={resetPaciente} type="button">
              Cambiar paciente
            </button>
          )}
        </div>
      )}

      {/* Search + form when no patient selected */}
      {!isCollapsed && !isEdit && (
        <div className="ote-pac-form">
          {/* Search input */}
          <div className="ote-pac-search" ref={pacSearchRef}>
            <div className="ote-search-input-wrap">
              <IcoSearch />
              <input
                ref={pacInputRef}
                value={pacSearchQuery || paciente.ci_paciente}
                onChange={handlePacSearchChange}
                onKeyDown={pacKb.onKeyDown}
                placeholder="Buscar por CI, nombre o apellido..."
                autoComplete="off"
                className="ote-search-input"
                autoFocus
              />
            </div>
            {pacSearchOpen && pacSearchResults.length > 0 && (
              <div className="ote-autocomplete-dropdown">
                {pacSearchResults.map((p, i) => (
                  <button key={p.id}
                    className={`ote-autocomplete-item${i === pacKb.hlIdx ? ' ote-ac-hl' : ''}`}
                    onClick={() => selectPaciente(p)}>
                    <span className="ote-ac-ci">{p.ci_paciente}</span>
                    <span className="ote-ac-name">{p.apellido} {p.nombre}</span>
                    <span className="ote-ac-meta">{p.sexo} {calcAge(p.fecha_nacimiento)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual entry fields */}
          <div className="ote-pac-fields">
            <div className="ote-field">
              <label>CI / ID *</label>
              <input value={paciente.ci_paciente}
                onChange={e => setPaciente(p => ({ ...p, ci_paciente: e.target.value }))}
                className={!paciente.ci_paciente?.trim() ? 'ote-input-warn' : ''} />
            </div>
            <div className="ote-field">
              <label>Sexo *</label>
              <select value={paciente.sexo}
                onChange={e => setPaciente(p => ({ ...p, sexo: e.target.value }))}
                className={!paciente.sexo ? 'ote-input-warn' : ''}>
                <option value="">Sel.</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <div className="ote-field">
              <label>Nombre *</label>
              <input value={paciente.nombre}
                onChange={e => setPaciente(p => ({ ...p, nombre: e.target.value }))}
                className={!paciente.nombre?.trim() ? 'ote-input-warn' : ''} />
            </div>
            <div className="ote-field">
              <label>F. Nacimiento</label>
              <input type="date" value={paciente.fecha_nacimiento}
                onChange={e => setPaciente(p => ({ ...p, fecha_nacimiento: e.target.value }))} />
            </div>
            <div className="ote-field">
              <label>Apellido *</label>
              <input value={paciente.apellido}
                onChange={e => setPaciente(p => ({ ...p, apellido: e.target.value }))}
                className={!paciente.apellido?.trim() ? 'ote-input-warn' : ''} />
            </div>
            <div className="ote-field">
              <label>Edad</label>
              <input value={edad} readOnly className="ote-readonly" />
            </div>
            <div className="ote-field">
              <label>2do Apellido</label>
              <input value={paciente.apellido_segundo}
                onChange={e => setPaciente(p => ({ ...p, apellido_segundo: e.target.value }))} />
            </div>
            <div className="ote-field">
              <label>Email</label>
              <input type="email" value={paciente.email}
                onChange={e => setPaciente(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="ote-field">
              <label>Telefono</label>
              <input value={paciente.telefono}
                onChange={e => setPaciente(p => ({ ...p, telefono: e.target.value }))} />
            </div>
            <div className="ote-field">
              <label>Celular</label>
              <input value={paciente.telefono_celular}
                onChange={e => setPaciente(p => ({ ...p, telefono_celular: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      {/* Edit mode: always show compact read-only */}
      {isEdit && !isCollapsed && (
        <div className="ote-pac-summary ote-pac-readonly">
          <div className="ote-pac-line1">
            <IcoUser />
            <span className="ote-pac-ci">{paciente.ci_paciente}</span>
            <span className="ote-pac-name">
              {paciente.apellido} {paciente.nombre}
            </span>
          </div>
          <div className="ote-pac-line2">
            <span>{paciente.sexo === 'M' ? 'Masc' : 'Fem'}</span>
            {edad && <span>{edad}</span>}
          </div>
        </div>
      )}
    </section>
  )
}
