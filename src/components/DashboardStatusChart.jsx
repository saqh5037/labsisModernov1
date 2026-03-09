import { ORDER_STATUS } from '../constants/status'

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
          const color = ORDER_STATUS[d.status_id]?.color || d.color || '#94a3b8'
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
