import { useState } from 'react'

const exact = n => (n ?? 0).toLocaleString('es-MX')
function fmt(n) {
  if (n == null) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

function ringColor(pct) {
  // Smooth gradient: red → amber → green
  if (pct <= 30) return '#dc2626'
  if (pct <= 50) return '#ea580c'
  if (pct <= 70) return '#d97706'
  if (pct <= 85) return '#65a30d'
  return '#16a34a'
}

function ringGlow(pct) {
  const c = ringColor(pct)
  return `0 0 12px ${c}44, 0 0 24px ${c}22`
}

export default function DashboardProgress({ data, onClickStatus }) {
  if (!data) return null

  const { totalOrdenes = 0, ordenesValidadas = 0, porcentajeOrdenes = 0,
    totalPruebas, pruebasValidadas, porcentaje,
    muestrasProcesadas, muestrasPendientes, totalMuestras } = data

  const ordenesPendientes = totalOrdenes - ordenesValidadas
  const pruebasPendientes = totalPruebas - pruebasValidadas
  const isCelebrating = porcentajeOrdenes >= 100

  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={`dash-card dash-card-progress dash-card-animated ${isCelebrating ? 'dash-celebrating' : ''}`}>
      <div className="dash-card-header" onClick={() => setCollapsed(c => !c)}>
        <div className="dash-card-title">Progreso del Día</div>
        <button className={`dash-collapse-btn ${collapsed ? 'dash-collapse-btn--collapsed' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <div className={`dash-card-body ${collapsed ? 'dash-card-body--collapsed' : ''}`}>
        {/* Big circular progress — ÓRDENES */}
        <div className="progress-ring-area">
          <div className="progress-ring" style={{ filter: `drop-shadow(${ringGlow(porcentajeOrdenes)})` }}>
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" />
              <circle cx="60" cy="60" r="52" fill="none"
                stroke={ringColor(porcentajeOrdenes)}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(porcentajeOrdenes / 100) * 327} 327`}
                transform="rotate(-90 60 60)"
                className={isCelebrating ? 'ring-celebrate' : ''} />
            </svg>
            <div className="progress-ring-text">
              <span className="progress-ring-pct" style={{ color: ringColor(porcentajeOrdenes) }}>
                {porcentajeOrdenes}%
              </span>
              <span className="progress-ring-label">órdenes</span>
            </div>
            {isCelebrating && (
              <div className="ring-celebration-burst">
                {[...Array(8)].map((_, i) => <span key={i} className="burst-particle" style={{ '--i': i }} />)}
              </div>
            )}
          </div>
        </div>

        {/* Stats grid — Órdenes */}
        <div className="progress-stats-grid">
          <div className="progress-stat-card stat-green" onClick={() => onClickStatus?.([4, 7])}
            title={`${exact(ordenesValidadas)} órdenes validadas`}>
            <span className="stat-number">{fmt(ordenesValidadas)}</span>
            <span className="stat-label">Validadas</span>
          </div>
          <div className="progress-stat-card stat-orange" onClick={() => onClickStatus?.([1, 2, 8, 10])}
            title={`${exact(ordenesPendientes)} órdenes pendientes`}>
            <span className="stat-number">{fmt(ordenesPendientes)}</span>
            <span className="stat-label">Pendientes</span>
          </div>
        </div>

        {/* Pruebas */}
        {totalPruebas > 0 && (
          <div className="progress-muestras-section">
            <div className="dash-card-subtitle">Pruebas</div>
            <div className="progress-stats-grid">
              <div className="progress-stat-card stat-blue"
                title={`${exact(pruebasValidadas)} de ${exact(totalPruebas)} pruebas validadas`}>
                <span className="stat-number">{fmt(pruebasValidadas)}/{fmt(totalPruebas)}</span>
                <span className="stat-label">Validadas</span>
              </div>
              {pruebasPendientes > 0 && (
                <div className="progress-stat-card stat-red"
                  title={`${exact(pruebasPendientes)} pruebas pendientes`}>
                  <span className="stat-number">{fmt(pruebasPendientes)}</span>
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
              <div className="progress-stat-card stat-blue"
                title={`${exact(muestrasProcesadas)} de ${exact(totalMuestras)} muestras procesadas`}>
                <span className="stat-number">{fmt(muestrasProcesadas)}/{fmt(totalMuestras)}</span>
                <span className="stat-label">Procesadas</span>
              </div>
              {muestrasPendientes > 0 && (
                <div className="progress-stat-card stat-red"
                  title={`${exact(muestrasPendientes)} muestras pendientes`}>
                  <span className="stat-number">{fmt(muestrasPendientes)}</span>
                  <span className="stat-label">Pendientes</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
