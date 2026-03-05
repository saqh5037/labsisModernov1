function progressColor(pct) {
  if (pct >= 80) return '#16a34a'
  if (pct >= 50) return '#d97706'
  return '#dc2626'
}

export default function DashboardAreaProgress({ data }) {
  if (!data || data.length === 0) return null

  const sorted = [...data].sort((a, b) => {
    const pctA = a.total > 0 ? (a.validadas / a.total) * 100 : 0
    const pctB = b.total > 0 ? (b.validadas / b.total) * 100 : 0
    return pctA - pctB
  })

  return (
    <div className="dash-card dash-card-areas">
      <div className="dash-card-title">Progreso por Área</div>

      <div className="area-progress-list">
        {sorted.map(d => {
          const pct = d.total > 0 ? Math.round((d.validadas / d.total) * 100) : 0
          return (
            <div key={d.area_id} className="area-progress-row">
              <div className="area-progress-header">
                <span className="area-progress-label" title={d.area}>{d.area}</span>
                <span className="area-progress-detail">{d.validadas}/{d.total}</span>
                <span className="area-progress-pct" style={{ color: progressColor(pct) }}>
                  {pct}%
                </span>
              </div>
              <div className="area-progress-bar">
                <div className="area-progress-fill"
                  style={{ width: `${pct}%`, background: progressColor(pct) }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
