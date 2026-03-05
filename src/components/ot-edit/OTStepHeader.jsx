/* ── SVG Icons ── */
const IcoBack = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
)
const IcoSave = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
  </svg>
)
const IcoCheck = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const STEPS = [
  { key: 'paciente', label: 'Paciente', num: 1 },
  { key: 'orden', label: 'Orden', num: 2 },
  { key: 'examenes', label: 'Examenes', num: 3 },
]

export default function OTStepHeader({
  stepStatus, isEdit, numero, saving, handleSave, navigate,
  pacInputRef, procInputRef, examSearchInputRef
}) {
  const focusStep = (key) => {
    const refs = { paciente: pacInputRef, orden: procInputRef, examenes: examSearchInputRef }
    refs[key]?.current?.focus()
  }

  return (
    <div className="ote-header-bar">
      <button className="ote-back-btn" onClick={() => navigate(-1)} title="Volver">
        <IcoBack />
      </button>

      <div className="ote-steps">
        {STEPS.map((step, i) => {
          const status = stepStatus[step.key]
          return (
            <div key={step.key} className="ote-step-group">
              {i > 0 && (
                <div className={`ote-step-line ${status !== 'pending' ? 'ote-step-line-active' : ''}`} />
              )}
              <button
                className={`ote-step ${status}`}
                onClick={() => focusStep(step.key)}
                type="button"
              >
                <span className="ote-step-circle">
                  {status === 'completed' ? <IcoCheck /> : step.num}
                </span>
                <span className="ote-step-label">{step.label}</span>
              </button>
            </div>
          )
        })}
      </div>

      <h1 className="ote-title-bar">
        {isEdit ? `Editar OT #${numero}` : 'Crear Orden de Trabajo'}
      </h1>

      <div className="ote-header-actions">
        {isEdit ? (
          <button className="ot-btn ot-btn-primary" onClick={() => handleSave(false)} disabled={saving}>
            <IcoSave /> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        ) : (
          <>
            <button className="ot-btn ot-btn-secondary" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button className="ot-btn ot-btn-primary" onClick={() => handleSave(true)} disabled={saving}>
              <IcoSave /> {saving ? 'Guardando...' : 'Guardar y Cobrar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
