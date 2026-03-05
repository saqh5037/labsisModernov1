export default function DashboardProgress({ data, onClickStatus }) {
  if (!data) return null

  const { totalPruebas, pruebasValidadas, porcentaje,
    muestrasProcesadas, muestrasPendientes, totalMuestras } = data

  const enProceso = totalPruebas - pruebasValidadas

  return (
    <div className="dash-card dash-card-progress">
      <div className="dash-card-title">Progreso del Día</div>

      {/* Big circular-style progress */}
      <div className="progress-ring-area">
        <div className="progress-ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={porcentaje >= 80 ? '#16a34a' : porcentaje >= 40 ? '#d97706' : '#dc2626'}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(porcentaje / 100) * 327} 327`}
              transform="rotate(-90 60 60)" />
          </svg>
          <div className="progress-ring-text">
            <span className="progress-ring-pct">{porcentaje}%</span>
            <span className="progress-ring-label">validadas</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="progress-stats-grid">
        <div className="progress-stat-card stat-green" onClick={() => onClickStatus?.([4, 7])}>
          <span className="stat-number">{pruebasValidadas}</span>
          <span className="stat-label">Validadas</span>
        </div>
        <div className="progress-stat-card stat-orange" onClick={() => onClickStatus?.([2, 8])}>
          <span className="stat-number">{enProceso}</span>
          <span className="stat-label">Pendientes</span>
        </div>
      </div>

      {/* Muestras */}
      {totalMuestras > 0 && (
        <div className="progress-muestras-section">
          <div className="dash-card-subtitle">Muestras</div>
          <div className="progress-stats-grid">
            <div className="progress-stat-card stat-blue">
              <span className="stat-number">{muestrasProcesadas}/{totalMuestras}</span>
              <span className="stat-label">Procesadas</span>
            </div>
            {muestrasPendientes > 0 && (
              <div className="progress-stat-card stat-red">
                <span className="stat-number">{muestrasPendientes}</span>
                <span className="stat-label">Pendientes</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
