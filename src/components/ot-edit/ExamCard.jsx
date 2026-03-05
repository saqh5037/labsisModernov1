import { fmtPrice } from './useOTEditState.js'

const IcoSearch = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
  </svg>
)
const IcoX = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)
const IcoPlus = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)
const IcoCheck = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function ExamCard({
  servicioInfo, searchQuery, searchResults, searchOpen, searchLoading,
  handleSearchChange, addPrueba, addGrupo,
  selectedPruebas, selectedGrupos, removePrueba, removeGrupo,
  grupoCantidades, updateGrupoCantidad,
  searchKb, searchRef, examSearchInputRef,
  getSearchItemFlatIdx, stepStatus
}) {
  const canSearch = !!servicioInfo

  return (
    <section className="ote-card ote-card-exam">
      <div className="ote-card-header">
        <span className={`ote-card-step ${stepStatus}`}>
          {stepStatus === 'completed' ? <IcoCheck /> : '3'}
        </span>
        <h2 className="ote-card-title">Examenes</h2>
        {(selectedPruebas.length > 0 || selectedGrupos.length > 0) && (
          <span className="ote-exam-count">
            {selectedGrupos.length > 0 && `${selectedGrupos.length} grupo${selectedGrupos.length > 1 ? 's' : ''}`}
            {selectedGrupos.length > 0 && selectedPruebas.filter(p => !p.gp_id).length > 0 && ' + '}
            {selectedPruebas.filter(p => !p.gp_id).length > 0 &&
              `${selectedPruebas.filter(p => !p.gp_id).length} prueba${selectedPruebas.filter(p => !p.gp_id).length > 1 ? 's' : ''}`}
          </span>
        )}
      </div>

      {!canSearch && (
        <div className="ote-exam-disabled-msg">
          Selecciona una procedencia para buscar examenes
        </div>
      )}

      {/* Search bar */}
      <div className="ote-search-wrap" ref={searchRef}>
        <div className={`ote-search-input-wrap ${!canSearch ? 'ote-search-disabled' : ''}`}>
          <IcoSearch />
          <input
            ref={examSearchInputRef}
            placeholder={canSearch ? 'Buscar prueba, grupo o codigo...' : 'Selecciona procedencia primero'}
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={searchKb.onKeyDown}
            onFocus={() => searchQuery.length >= 2 && canSearch && searchResults.pruebas.length + searchResults.grupos.length > 0 && !searchOpen && ({})}
            disabled={!canSearch}
            className="ote-search-input"
          />
          {searchLoading && <div className="ote-search-spinner" />}
        </div>

        {searchOpen && (searchResults.pruebas.length > 0 || searchResults.grupos.length > 0) && (
          <div className="ote-search-dropdown">
            {searchResults.grupos.length > 0 && (
              <>
                <div className="ote-search-heading">Grupos / Perfiles</div>
                {searchResults.grupos.map((gp, i) => {
                  const flatIdx = getSearchItemFlatIdx('grupo', i)
                  const isHl = flatIdx === searchKb.hlIdx
                  const alreadySelected = selectedGrupos.some(sg => sg.id === gp.id)
                  return (
                    <button key={`gp-${gp.id}`}
                      className={`ote-search-item ote-search-grupo${gp.source === 'servicio' ? ' ote-search-svc' : ''}${isHl ? ' ote-search-hl' : ''}${alreadySelected ? ' ote-search-selected' : ''}`}
                      onClick={() => addGrupo(gp)}
                      disabled={alreadySelected}>
                      <span className="ote-si-badge">GP</span>
                      <span className="ote-search-code">{gp.codigo_servicio || gp.codigo_caja || ''}</span>
                      <span className="ote-search-name">{gp.nombre}</span>
                      <span className="ote-search-meta">{gp.area_nombre || ''}</span>
                      <span className="ote-search-price">{fmtPrice(gp.precio)}</span>
                    </button>
                  )
                })}
              </>
            )}
            {searchResults.pruebas.length > 0 && (
              <>
                <div className="ote-search-heading">Pruebas Individuales</div>
                {searchResults.pruebas.map((p, i) => {
                  const flatIdx = getSearchItemFlatIdx('prueba', i)
                  const isHl = flatIdx === searchKb.hlIdx
                  const alreadySelected = selectedPruebas.some(sp => sp.prueba_id === p.id)
                  return (
                    <button key={`pr-${p.id}`}
                      className={`ote-search-item${p.source === 'servicio' ? ' ote-search-svc' : ''}${isHl ? ' ote-search-hl' : ''}${alreadySelected ? ' ote-search-selected' : ''}`}
                      onClick={() => addPrueba(p)}
                      disabled={alreadySelected}>
                      <span className="ote-search-code">{p.codigo_servicio || p.codigo_caja || ''}</span>
                      <span className="ote-search-name">{p.nombre}</span>
                      <span className="ote-search-meta">{p.area_nombre || ''}</span>
                      <span className="ote-search-price">{fmtPrice(p.precio)}</span>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Selected items */}
      <div className="ote-exam-list">
        {selectedGrupos.length === 0 && selectedPruebas.filter(p => !p.gp_id).length === 0 && (
          <div className="ote-exam-empty">
            <IcoPlus /> Busca y agrega examenes arriba
          </div>
        )}

        {/* Grupos */}
        {selectedGrupos.map(gp => {
          const qty = grupoCantidades?.[gp.id] || 1
          const gpPrecio = parseFloat(gp.precio) || 0
          return (
            <div key={`gp-${gp.id}`} className="ote-exam-row ote-exam-grupo-row">
              <span className="ote-exam-badge">GP</span>
              <span className="ote-exam-name">{gp.nombre}</span>
              <span className="ote-grupo-qty-wrap">
                <span className="ote-grupo-qty-x">&times;</span>
                <input
                  type="number" min={1} max={99}
                  className="ote-grupo-qty"
                  value={qty}
                  onChange={(e) => updateGrupoCantidad?.(gp.id, e.target.value)}
                />
              </span>
              <span className="ote-exam-price">{fmtPrice(gpPrecio * qty)}</span>
              <button className="ote-exam-remove" onClick={() => removeGrupo(gp.id)} title="Quitar">
                <IcoX />
              </button>
              <div className="ote-exam-children">
                {selectedPruebas.filter(p => p.gp_id === gp.id).map(p => (
                  <span key={p.prueba_id} className="ote-exam-child">{p.nombre}</span>
                ))}
              </div>
            </div>
          )
        })}

        {/* Pruebas sueltas */}
        {selectedPruebas.filter(p => !p.gp_id).map((p, idx) => {
          const realIdx = selectedPruebas.indexOf(p)
          return (
            <div key={`pr-${realIdx}`} className="ote-exam-row">
              <span className="ote-exam-badge ote-exam-badge-pr">&mdash;</span>
              <span className="ote-exam-name">{p.nombre}</span>
              <span className="ote-exam-area">{p.area_nombre}</span>
              <span className="ote-exam-price">{fmtPrice(p.precio)}</span>
              <button className="ote-exam-remove" onClick={() => removePrueba(realIdx)} title="Quitar">
                <IcoX />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
