export default function DashboardProgress({ data, onClickStatus }) {
  if (!data) return null

  const { totalOrdenes = 0, ordenesValidadas = 0, porcentajeOrdenes = 0,
    totalPruebas, pruebasValidadas, porcentaje,
    muestrasProcesadas, muestrasPendientes, totalMuestras } = data

  const ordenesPendientes = totalOrdenes - ordenesValidadas
  const pruebasPendientes = totalPruebas - pruebasValidadas

  return (
    <div className="dash-card dash-card-progress">
      <div className="dash-card-title">Progreso del Día</div>

      {/* Big circular-style progress — ÓRDENES */}
      <div className="progress-ring-area">
        <div className="progress-ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={porcentajeOrdenes >= 80 ? '#16a34a' : porcentajeOrdenes >= 40 ? '#d97706' : '#dc2626'}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(porcentajeOrdenes / 100) * 327} 327`}
              transform="rotate(-90 60 60)" />
          </svg>
          <div className="progress-ring-text">
            <span className="progress-ring-pct">{porcentajeOrdenes}%</span>
            <span className="progress-ring-label">órdenes</span>
          </div>
        </div>
      </div>

      {/* Stats grid — Órdenes */}
      <div className="progress-stats-grid">
        <div className="progress-stat-card stat-green" onClick={() => onClickStatus?.([4, 7])}>
          <span className="stat-number">{ordenesValidadas}</span>
          <span className="stat-label">Validadas</span>
        </div>
        <div className="progress-stat-card stat-orange" onClick={() => onClickStatus?.([1, 2, 8, 10])}>
          <span className="stat-number">{ordenesPendientes}</span>
          <span className="stat-label">Pendientes</span>
        </div>
      </div>

      {/* Pruebas — info secundaria */}
      {totalPruebas > 0 && (
        <div className="progress-muestras-section">
          <div className="dash-card-subtitle">Pruebas</div>
          <div className="progress-stats-grid">
            <div className="progress-stat-card stat-blue">
              <span className="stat-number">{pruebasValidadas}/{totalPruebas}</span>
              <span className="stat-label">Validadas</span>
            </div>
            {pruebasPendientes > 0 && (
              <div className="progress-stat-card stat-red">
                <span className="stat-number">{pruebasPendientes}</span>
                <span className="stat-label">Pendientes</span>
              </div>
            )}
          </div>
        </div>
      )}

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
