const STATUS_COLORS = {
  6:  '#000000',  // Abortada
  0:  '#94a3b8',  // Inactivo
  1:  '#d44836',  // Activo
  2:  '#ffa500',  // Iniciada
  8:  '#f472b6',  // Por Validar
  9:  '#3e65b0',  // Transmitido
  10: '#4888f1',  // En Espera
  11: '#919386',  // Reflejo
  7:  '#63981f',  // Vacío Validado
  5:  '#d44836',  // No Validado
  4:  '#63981f',  // Validado
  3:  '#d44836',  // Finalizada
}

export default function DashboardStatusChart({ data, onClickBar }) {
  if (!data || data.length === 0) return null

  const maxTotal = Math.max(...data.map(d => d.total))
  const grandTotal = data.reduce((s, d) => s + d.total, 0)

  return (
    <div className="dash-card dash-card-status">
      <div className="dash-card-title">OTs por Estado</div>
      <div className="dash-card-subtitle">{grandTotal} órdenes</div>

      <div className="status-bars">
        {data.map(d => {
          const pct = grandTotal > 0 ? Math.round((d.total / grandTotal) * 100) : 0
          const barW = maxTotal > 0 ? (d.total / maxTotal) * 100 : 0
          const color = STATUS_COLORS[d.status_id] || d.color || '#94a3b8'
          return (
            <div key={d.status_id} className="status-bar-row" onClick={() => onClickBar?.(d.status_id)}
              title={`${d.status}: ${d.total} (${pct}%)`}>
              <div className="status-bar-indicator" style={{ background: color }} />
              <span className="status-bar-label">{d.status}</span>
              <div className="status-bar-track">
                <div className="status-bar-fill"
                  style={{ width: `${barW}%`, background: color }} />
              </div>
              <span className="status-bar-count" style={{ color }}>{d.total}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
