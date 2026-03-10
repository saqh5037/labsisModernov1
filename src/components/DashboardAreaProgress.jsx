import { useState, useRef, useEffect } from 'react'

const exact = n => (n ?? 0).toLocaleString('es-MX')
function fmt(n) {
  if (n == null) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

function progressColor(pct) {
  if (pct >= 80) return '#16a34a'
  if (pct >= 50) return '#d97706'
  return '#dc2626'
}

const GearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)

export default function DashboardAreaProgress({
  data,
  visibleAreaIds,
  bioanalistaAreaIds,
  onChangeVisibleAreas,
  isCustomized,
}) {
  if (!data || data.length === 0) return null

  const [expanded, setExpanded] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef(null)
  const btnRef = useRef(null)

  const hasBioAreas = bioanalistaAreaIds && bioanalistaAreaIds.length > 0

  // Close picker on click outside
  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e) => {
      if (pickerRef.current?.contains(e.target)) return
      if (btnRef.current?.contains(e.target)) return
      setPickerOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  // Filter data by visibleAreaIds
  const filtered = visibleAreaIds
    ? data.filter(d => visibleAreaIds.includes(d.area_id))
    : data

  const sorted = [...filtered].sort((a, b) => {
    const pctA = a.total > 0 ? (a.validadas / a.total) * 100 : 0
    const pctB = b.total > 0 ? (b.validadas / b.total) * 100 : 0
    return pctA - pctB
  })

  // When collapsed, show top 3 areas (lowest completion)
  const visible = expanded ? sorted : sorted.slice(0, 3)
  const hasMore = sorted.length > 3

  // For picker: all areas from original data
  const allAreas = [...data].sort((a, b) => a.area.localeCompare(b.area))
  const selectedSet = new Set(visibleAreaIds || data.map(d => d.area_id))
  const bioSet = new Set(bioanalistaAreaIds || [])

  const toggleArea = (areaId) => {
    if (!onChangeVisibleAreas) return
    const current = visibleAreaIds || data.map(d => d.area_id)
    const next = current.includes(areaId)
      ? current.filter(id => id !== areaId)
      : [...current, areaId]
    onChangeVisibleAreas(next.length === 0 ? [areaId] : next)
  }

  const selectMine = () => {
    if (!onChangeVisibleAreas) return
    onChangeVisibleAreas(null) // reset → use bioanalista defaults
  }

  const selectAll = () => {
    if (!onChangeVisibleAreas) return
    onChangeVisibleAreas(data.map(d => d.area_id))
  }

  const subtitle = visibleAreaIds
    ? `${filtered.length} de ${data.length} áreas`
    : `${data.length} áreas`

  return (
    <div className={`dash-card dash-card-areas dash-card-animated ${expanded ? 'dash-card-areas--expanded' : ''}`}>
      <div className="dash-card-header" onClick={() => setExpanded(e => !e)}>
        <div>
          <div className="dash-card-title">Progreso por Área</div>
          <div className="dash-card-subtitle">{subtitle}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {hasBioAreas && (
            <button
              ref={btnRef}
              className={`dash-area-settings-btn${pickerOpen ? ' active' : ''}${isCustomized ? ' customized' : ''}`}
              title="Configurar áreas visibles"
              onClick={(e) => { e.stopPropagation(); setPickerOpen(p => !p) }}
            >
              <GearIcon />
            </button>
          )}
          <button className={`dash-collapse-btn ${!expanded ? 'dash-collapse-btn--collapsed' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Area Picker Popover */}
      {pickerOpen && (
        <div className="dash-area-picker" ref={pickerRef}>
          <div className="dash-area-picker-list">
            {allAreas.map(d => (
              <label key={d.area_id} className={`dash-area-picker-item${bioSet.has(d.area_id) ? ' mine' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedSet.has(d.area_id)}
                  onChange={() => toggleArea(d.area_id)}
                />
                <span className="dash-area-picker-name">{d.area}</span>
                {bioSet.has(d.area_id) && <span className="dash-area-picker-badge">tuya</span>}
              </label>
            ))}
          </div>
          <div className="dash-area-picker-actions">
            {hasBioAreas && (
              <button className="btn-ghost btn-xs" onClick={selectMine}>Mis áreas</button>
            )}
            <button className="btn-ghost btn-xs" onClick={selectAll}>Todas</button>
          </div>
        </div>
      )}

      <div className="dash-card-body">
        <div className="area-progress-list">
          {visible.map((d, idx) => {
            const pct = d.total > 0 ? Math.round((d.validadas / d.total) * 100) : 0
            const isMine = bioSet.has(d.area_id)
            return (
              <div key={d.area_id} className={`area-progress-row${isMine ? ' area-progress-row--mine' : ''}`}
                style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="area-progress-header">
                  <span className="area-progress-label" title={d.area}>{d.area}</span>
                  <span className="area-progress-detail" title={`${exact(d.validadas)} de ${exact(d.total)}`}>{fmt(d.validadas)}/{fmt(d.total)}</span>
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

        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-3, #94a3b8)', fontSize: 12, padding: '12px 0' }}>
            Sin datos para las áreas seleccionadas
          </div>
        )}

        {hasMore && !expanded && (
          <button className="dash-expand-btn" onClick={e => { e.stopPropagation(); setExpanded(true) }}>
            Ver {sorted.length - 3} áreas más
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
