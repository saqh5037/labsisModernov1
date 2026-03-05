import { fmtPrice } from './useOTEditState.js'

const IcoSave = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
  </svg>
)

export default function ExamSidebar({
  muestrasPreview, totalPrice, calcTotales, servicioInfo,
  descuento, updateDescuento,
  descuentoCategorias, selectedCategoriaId, selectDescuentoCategoria,
  saving, isEdit, handleSave, navigate
}) {
  const isDivisas = servicioInfo?.is_facturacion_con_divisas && servicioInfo?.moneda_nombre === 'Dolar'
  const tasa = servicioInfo?.tasa_cambio || 1
  const currencySymbol = isDivisas ? 'USD' : 'Bs.S'

  const t = calcTotales || {}
  const showDesc = t.descPct > 0 || descuento?.esManual
  const showCopago = t.copagoPct > 0
  const showIva = t.ivaPct > 0
  const showIgtf = t.aplicarIgtf && t.igtfPct > 0
  const showBreakdown = showDesc || showCopago || showIva || showIgtf

  const hasCategorias = descuentoCategorias && descuentoCategorias.length > 0

  return (
    <aside className="ote-sidebar">
      {/* Muestras preview */}
      {muestrasPreview.length > 0 && (
        <div className="ote-sidebar-card">
          <h4 className="ote-sidebar-title">Muestras ({muestrasPreview.length})</h4>
          {muestrasPreview.map((m, i) => (
            <div key={i} className="ote-muestra-item">
              <span className="ote-muestra-dot" style={{ background: m.color || '#94a3b8' }} />
              <div className="ote-muestra-info">
                <span className="ote-muestra-name">{m.contenedor || m.tipo_muestra}</span>
                <span className="ote-muestra-tipo">{m.tipo_muestra}</span>
                {m.areas.length > 0 && (
                  <span className="ote-muestra-area">{m.areas.join(', ')}</span>
                )}
                <span className="ote-muestra-pruebas">
                  {m.pruebas.length} {m.pruebas.length === 1 ? 'prueba' : 'pruebas'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Descuento categoría selector */}
      {servicioInfo?.descuento_activo && hasCategorias && (
        <div className="ote-sidebar-card ote-discount-section">
          <h4 className="ote-sidebar-title">Descuento</h4>
          <select
            value={selectedCategoriaId || ''}
            onChange={(e) => selectDescuentoCategoria(e.target.value)}
            className="ote-input ote-discount-select"
          >
            <option value="">Sin categoría</option>
            {descuentoCategorias.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre} {cat.limite ? `(máx ${cat.limite}%)` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Price breakdown */}
      <div className="ote-total-card">
        {showBreakdown ? (
          <div className="ote-breakdown">
            {/* Subtotal */}
            <div className="ote-breakdown-row">
              <span>Subtotal</span>
              <span>{currencySymbol} {fmtPrice(t.subtotal)}</span>
            </div>

            {/* Descuento input + amount */}
            {(descuento?.esManual || t.descPct > 0) && (
              <div className="ote-breakdown-row ote-breakdown-discount">
                <span className="ote-breakdown-desc-label">
                  Descuento
                  {descuento?.esManual ? (
                    <input
                      type="number" min={0} max={100} step={0.5}
                      className="ote-descuento-input"
                      value={descuento.porcentaje || ''}
                      onChange={(e) => updateDescuento(e.target.value)}
                      placeholder="0"
                    />
                  ) : (
                    <span className="ote-breakdown-pct">({t.descPct}%)</span>
                  )}
                </span>
                <span>- {currencySymbol} {fmtPrice(t.descMonto)}</span>
              </div>
            )}

            {/* Copago */}
            {showCopago && (
              <div className="ote-breakdown-row ote-breakdown-copago">
                <span>Copago servicio ({t.copagoPct}%)</span>
                <span>- {currencySymbol} {fmtPrice(t.subtotalConDesc - t.montoPaciente)}</span>
              </div>
            )}

            {/* IVA */}
            {showIva && (
              <div className="ote-breakdown-row ote-breakdown-iva">
                <span>IVA ({t.ivaPct}%)</span>
                <span>+ {currencySymbol} {fmtPrice(t.ivaMonto)}</span>
              </div>
            )}

            {/* IGTF */}
            {showIgtf && (
              <div className="ote-breakdown-row ote-breakdown-igtf">
                <span>IGTF ({t.igtfPct}%)</span>
                <span>+ {currencySymbol} {fmtPrice(t.igtfMonto)}</span>
              </div>
            )}

            {/* Divider */}
            <div className="ote-breakdown-divider" />

            {/* Total */}
            <div className="ote-breakdown-row ote-breakdown-total">
              <span>Total</span>
              <span>{currencySymbol} {fmtPrice(t.total)}</span>
            </div>
            {isDivisas && (
              <div className="ote-breakdown-row ote-breakdown-converted">
                <span></span>
                <span>Bs.S {fmtPrice(t.total * tasa)}</span>
              </div>
            )}
          </div>
        ) : (
          /* Simple total (no breakdown needed) */
          <>
            <span className="ote-total-label">Total</span>
            <div className="ote-total-prices">
              <span className="ote-total-amount">
                {currencySymbol} {fmtPrice(totalPrice)}
              </span>
              {isDivisas && (
                <span className="ote-total-converted">
                  Bs.S {fmtPrice(totalPrice * tasa)}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="ote-sidebar-actions">
        {isEdit ? (
          <button className="ot-btn ot-btn-primary ote-sidebar-btn" onClick={() => handleSave(false)} disabled={saving}>
            <IcoSave /> {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        ) : (
          <>
            <button className="ot-btn ot-btn-primary ote-sidebar-btn" onClick={() => handleSave(true)} disabled={saving}>
              <IcoSave /> {saving ? 'Guardando...' : 'Guardar y Cobrar'}
            </button>
            <button className="ot-btn ot-btn-secondary ote-sidebar-btn" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? 'Guardando...' : 'Solo Guardar'}
            </button>
          </>
        )}
        <button className="ot-btn ot-btn-ghost ote-sidebar-btn" onClick={() => navigate(-1)} disabled={saving}>
          Cancelar
        </button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="ote-shortcuts">
        <div className="ote-shortcut-row">
          <kbd>Ctrl+S</kbd><span>Guardar</span>
        </div>
        <div className="ote-shortcut-row">
          <kbd>Ctrl+Shift+S</kbd><span>Guardar+Cobrar</span>
        </div>
        <div className="ote-shortcut-row">
          <kbd>Ctrl+1/2/3</kbd><span>Ir a paso</span>
        </div>
        <div className="ote-shortcut-row">
          <kbd>/</kbd><span>Buscar examen</span>
        </div>
        <div className="ote-shortcut-row">
          <kbd>Esc</kbd><span>Volver</span>
        </div>
      </div>
    </aside>
  )
}
