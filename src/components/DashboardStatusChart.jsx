import { useState } from 'react'
import { ORDER_STATUS } from '../constants/status'

const exact = n => (n ?? 0).toLocaleString('es-MX')
function fmt(n) {
  if (n == null) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

export default function DashboardStatusChart({ data, onClickBar }) {
  if (!data || data.length === 0) return null

  const maxTotal = Math.max(...data.map(d => d.total))
  const grandTotal = data.reduce((s, d) => s + d.total, 0)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="dash-card dash-card-status dash-card-animated">
      <div className="dash-card-header" onClick={() => setCollapsed(c => !c)}>
        <div>
          <div className="dash-card-title">OTs por Estado</div>
          <div className="dash-card-subtitle" title={`${exact(grandTotal)} órdenes`}>{fmt(grandTotal)} órdenes</div>
        </div>
        <button className={`dash-collapse-btn ${collapsed ? 'dash-collapse-btn--collapsed' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      <div className={`dash-card-body ${collapsed ? 'dash-card-body--collapsed' : ''}`}>
        <div className="status-bars">
          {data.map((d, idx) => {
            const pct = grandTotal > 0 ? Math.round((d.total / grandTotal) * 100) : 0
            const barW = maxTotal > 0 ? (d.total / maxTotal) * 100 : 0
            const color = ORDER_STATUS[d.status_id]?.color || d.color || '#94a3b8'
            return (
              <div key={d.status_id} className="status-bar-row"
                onClick={() => onClickBar?.(d.status_id)}
                title={`${d.status}: ${exact(d.total)} (${pct}%)`}
                style={{ animationDelay: `${idx * 60}ms` }}>
                <div className="status-bar-indicator" style={{ background: color }} />
                <span className="status-bar-label">{d.status}</span>
                <div className="status-bar-track">
                  <div className="status-bar-fill"
                    style={{ width: `${barW}%`, background: color }} />
                </div>
                <span className="status-bar-count" style={{ color }}>{fmt(d.total)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
