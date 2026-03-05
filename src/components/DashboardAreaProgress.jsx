function progressColor(pct) {
  if (pct >= 80) return '#16a34a'
  if (pct >= 50) return '#d97706'
  return '#dc2626'
}

export default function DashboardAreaProgress({ data }) {
  if (!data || data.length === 0) return null

  const sorted = [...data].sort((a, b) => a.progreso - b.progreso)

  return (
    <div className="dash-card dash-card-areas">
      <div className="dash-card-title">Progreso por Área</div>

      <div className="area-progress-list">
        {sorted.map(d => (
          <div key={d.area_id} className="area-progress-row">
            <div className="area-progress-header">
              <span className="area-progress-label" title={d.area}>{d.area}</span>
              <span className="area-progress-pct" style={{ color: progressColor(d.progreso) }}>
                {d.progreso}%
              </span>
            </div>
            <div className="area-progress-bar">
              <div className="area-progress-fill"
                style={{ width: `${d.progreso}%`, background: progressColor(d.progreso) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
