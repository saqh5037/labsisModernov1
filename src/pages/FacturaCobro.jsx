import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFacturaData, registrarPago, anularPago, anularFactura, crearNotaCredito } from '../services/api.js'

/* ── Icons ── */
const Ico = ({ d, size = 16, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
    <path d={d} />
  </svg>
)
const IcoBack = () => <Ico d="M19 12H5M12 19l-7-7 7-7" />
const IcoX = () => <Ico d="M18 6L6 18M6 6l12 12" size={14} />
const IcoDollar = () => <Ico d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
const IcoFile = () => <Ico d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6" />
const IcoTrash = () => <Ico d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" size={14} />
const IcoAlertTri = () => <Ico d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
const IcoCheck = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

/* ── Helpers ── */
const fmtPrice = (n) => {
  const num = parseFloat(n) || 0
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const fmtDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const STATUS_MAP = {
  1: { label: 'PENDIENTE', color: '#dc2626', bg: '#fef2f2' },
  2: { label: 'PAGO PARCIAL', color: '#f59e0b', bg: '#fffbeb' },
  3: { label: 'PAGADA', color: '#059669', bg: '#ecfdf5' },
  4: { label: 'ANULADA', color: '#64748b', bg: '#f1f5f9' },
  6: { label: 'NC EMITIDA', color: '#6366f1', bg: '#eef2ff' },
}

export default function FacturaCobro() {
  const { numero: otNumero } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  // Modales
  const [pagoOpen, setPagoOpen] = useState(false)
  const [pagoForm, setPagoForm] = useState({ tipo_pago_id: 3, monto: '', num_documento: '', monto_recibido: '' })
  const [pagoSaving, setPagoSaving] = useState(false)

  const [anularFactOpen, setAnularFactOpen] = useState(false)
  const [anularMotivo, setAnularMotivo] = useState('')
  const [anularSaving, setAnularSaving] = useState(false)

  const [ncOpen, setNcOpen] = useState(false)
  const [ncForm, setNcForm] = useState({ monto: '', observaciones: '' })
  const [ncSaving, setNcSaving] = useState(false)

  // ── Load factura data ──
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const otRes = await fetch(`/api/ordenes/${otNumero}`)
      if (!otRes.ok) throw new Error('Orden no encontrada')
      const otData = await otRes.json()

      if (!otData.factura_id) {
        setError('Esta orden no tiene factura asociada')
        setLoading(false)
        return
      }

      const fData = await getFacturaData(otData.factura_id)
      setData(fData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [otNumero])

  useEffect(() => { loadData() }, [loadData])

  // ── Calculated values ──
  const f = data?.factura
  const pagosActivos = (data?.pagos || []).filter(p => !p.anulado)
  const totalFactura = parseFloat(f?.total_factura) || 0
  const subtotal = parseFloat(f?.monto_total) || 0
  const descuento = parseFloat(f?.descuento) || 0
  const ivaPct = parseFloat(f?.iva) || 0
  const ivaMonto = parseFloat(f?.iva_monto) || 0
  const igtfPct = parseFloat(f?.igtf) || 0
  const igtfMonto = parseFloat(f?.monto_igtf) || 0
  const totalPagado = pagosActivos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
  const pendiente = Math.max(0, totalFactura - totalPagado)

  // Dual currency
  const tasaCambio = parseFloat(f?.tasa_cambio) || 1
  const monedaNombre = f?.moneda_nombre || 'Bolivares Soberanos'
  const labMonedaId = data?.lab?.moneda_id || 1
  const isDivisas = f?.moneda_id && f.moneda_id !== labMonedaId && tasaCambio > 1
  const currSymbol = isDivisas ? 'USD' : 'Bs.S'
  const altSymbol = isDivisas ? 'Bs.S' : null

  const isAnulada = f?.status_id === 4
  const canPay = pendiente > 0.01 && !isAnulada && f?.status_id !== 6
  const status = STATUS_MAP[f?.status_id] || STATUS_MAP[1]

  // ── Pago ──
  const openPago = () => {
    setPagoForm({ tipo_pago_id: 3, monto: pendiente.toFixed(2), num_documento: '', monto_recibido: '' })
    setPagoOpen(true)
  }
  const handlePago = async () => {
    if (!pagoForm.monto || parseFloat(pagoForm.monto) <= 0) return
    setPagoSaving(true)
    try {
      await registrarPago(f.id, {
        tipo_pago_id: parseInt(pagoForm.tipo_pago_id),
        monto: parseFloat(pagoForm.monto),
        num_documento: pagoForm.num_documento || null,
        monto_recibido: pagoForm.monto_recibido ? parseFloat(pagoForm.monto_recibido) : null
      })
      setPagoOpen(false)
      setError(null)
      await loadData()
    } catch (err) { setError(err.message) }
    finally { setPagoSaving(false) }
  }
  const cambio = pagoForm.tipo_pago_id == 3 && pagoForm.monto_recibido
    ? Math.max(0, parseFloat(pagoForm.monto_recibido) - parseFloat(pagoForm.monto || 0))
    : 0

  // ── Anular pago ──
  const handleAnularPago = async (pagoId) => {
    if (!confirm('¿Anular este pago?')) return
    try {
      await anularPago(f.id, pagoId)
      setError(null)
      await loadData()
    } catch (err) { setError(err.message) }
  }

  // ── Anular factura ──
  const handleAnularFactura = async () => {
    if (!anularMotivo.trim()) return
    setAnularSaving(true)
    try {
      await anularFactura(f.id, anularMotivo.trim())
      setAnularFactOpen(false)
      setAnularMotivo('')
      setError(null)
      await loadData()
    } catch (err) { setError(err.message) }
    finally { setAnularSaving(false) }
  }

  // ── Nota de crédito ──
  const handleNC = async () => {
    if (!ncForm.monto || parseFloat(ncForm.monto) <= 0) return
    setNcSaving(true)
    try {
      await crearNotaCredito(f.id, {
        monto: parseFloat(ncForm.monto),
        observaciones: ncForm.observaciones || null
      })
      setNcOpen(false)
      setNcForm({ monto: '', observaciones: '' })
      setError(null)
      await loadData()
    } catch (err) { setError(err.message) }
    finally { setNcSaving(false) }
  }

  // ── Loading / Error states ──
  if (loading) return (
    <div className="ote-loading">
      <div className="ote-spinner" />
      <span>Cargando factura...</span>
    </div>
  )

  if (error && !data) return (
    <div className="fc-page">
      <div className="ote-error"><span>{error}</span></div>
      <button className="ot-btn ot-btn-ghost" onClick={() => navigate(-1)}>
        <IcoBack /> Volver
      </button>
    </div>
  )

  return (
    <div className="fc-page">
      {/* ═══ Header ═══ */}
      <div className="fc-header">
        <button className="ot-btn ot-btn-ghost" onClick={() => navigate(`/ordenes/${otNumero}`)}>
          <IcoBack /> Orden
        </button>
        <h1>Factura #{f.numero}</h1>
        <span className="fc-status-badge"
          style={{ background: status.bg, color: status.color, borderColor: status.color + '40' }}>
          {status.label}
        </span>
      </div>

      {error && (
        <div className="ote-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}><IcoX /></button>
        </div>
      )}

      {/* ═══ Grid: Info + Financiero ═══ */}
      <div className="fc-grid-top">
        {/* Card 1: Datos */}
        <div className="fc-card">
          <h3 className="fc-card-title"><IcoFile /> Datos de Factura</h3>
          <div className="fc-info-rows">
            <div className="fc-row"><span className="fc-label">Cliente</span><span className="fc-val">{f.cliente_nombre}</span></div>
            <div className="fc-row"><span className="fc-label">CI/RIF</span><span className="fc-val">{f.cliente_ci || '-'}</span></div>
            <div className="fc-row"><span className="fc-label">Fecha</span><span className="fc-val">{fmtDate(f.fecha)}</span></div>
            {data.ordenes?.length > 0 && (
              <div className="fc-row">
                <span className="fc-label">Orden{data.ordenes.length > 1 ? 'es' : ''}</span>
                <span className="fc-val">{data.ordenes.map(o => o.numero).join(', ')}</span>
              </div>
            )}
            {f.observaciones && (
              <div className="fc-row"><span className="fc-label">Observaciones</span><span className="fc-val">{f.observaciones}</span></div>
            )}
            {isAnulada && f.motivo_cancelacion && (
              <div className="fc-motivo">Motivo: {f.motivo_cancelacion}</div>
            )}
          </div>
        </div>

        {/* Card 2: Resumen Financiero */}
        <div className="fc-card">
          <h3 className="fc-card-title"><IcoDollar /> Resumen Financiero</h3>
          <div className="fc-breakdown">
            {/* Subtotal */}
            <div className="fc-breakdown-row">
              <span className="fc-label">Subtotal</span>
              <span className="fc-amount">{currSymbol} {fmtPrice(subtotal)}</span>
            </div>

            {/* Descuento */}
            {descuento > 0 && (
              <div className="fc-breakdown-row">
                <span className="fc-label" style={{ color: '#dc2626' }}>Descuento</span>
                <span className="fc-amount" style={{ color: '#dc2626' }}>- {currSymbol} {fmtPrice(descuento)}</span>
              </div>
            )}

            {/* IVA */}
            {ivaMonto > 0 && (
              <div className="fc-breakdown-row">
                <span className="fc-label">IVA ({ivaPct}%)</span>
                <span className="fc-amount">+ {currSymbol} {fmtPrice(ivaMonto)}</span>
              </div>
            )}

            {/* IGTF */}
            {igtfMonto > 0 && (
              <div className="fc-breakdown-row">
                <span className="fc-label">IGTF ({igtfPct}%)</span>
                <span className="fc-amount">+ {currSymbol} {fmtPrice(igtfMonto)}</span>
              </div>
            )}

            {/* Total */}
            <div className="fc-breakdown-row fc-breakdown-total">
              <span className="fc-label" style={{ fontWeight: 700, color: '#1a365d' }}>Total</span>
              <span className="fc-amount-lg">{currSymbol} {fmtPrice(totalFactura)}</span>
            </div>
            {isDivisas && (
              <div className="fc-dual-currency">Bs.S {fmtPrice(totalFactura * tasaCambio)}</div>
            )}

            <hr className="fc-divider" />

            {/* Pagado / Pendiente */}
            <div className="fc-breakdown-row">
              <span className="fc-label">Pagado</span>
              <span className="fc-amount fc-paid">{currSymbol} {fmtPrice(totalPagado)}</span>
            </div>
            <div className="fc-breakdown-row">
              <span className="fc-label">Pendiente</span>
              <span className={`fc-amount ${pendiente > 0.01 ? 'fc-pending' : 'fc-paid'}`}>
                {currSymbol} {fmtPrice(pendiente)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Items de Factura ═══ */}
      <div className="fc-card">
        <h3 className="fc-card-title">Items de Factura ({(data.items || []).length})</h3>
        <table className="fc-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Descripción</th>
              <th>Cant</th>
              <th className="fc-td-right">P.Unit</th>
              <th className="fc-td-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((item, i) => (
              <tr key={item.id}>
                <td>{i + 1}</td>
                <td>{item.nombre_item}</td>
                <td>{item.cantidad}</td>
                <td className="fc-td-right fc-td-mono">{fmtPrice(item.monto)}</td>
                <td className="fc-td-right fc-td-mono">{fmtPrice(item.monto * item.cantidad)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="fc-td-right">Total</td>
              <td className="fc-td-right fc-td-mono">{currSymbol} {fmtPrice(subtotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ═══ Historial de Pagos ═══ */}
      <div className="fc-card">
        <h3 className="fc-card-title">Historial de Pagos ({pagosActivos.length} activo{pagosActivos.length !== 1 ? 's' : ''})</h3>
        {(data.pagos || []).length > 0 ? (
          <table className="fc-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tipo</th>
                <th className="fc-td-right">Monto</th>
                <th>Ref</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(data.pagos || []).map((p, i) => (
                <tr key={p.id} className={p.anulado ? 'fc-pago-anulado' : ''}>
                  <td>{i + 1}</td>
                  <td>{p.tipo_pago_nombre}</td>
                  <td className="fc-td-right fc-td-mono">{fmtPrice(p.monto)}</td>
                  <td>{p.num_documento || '-'}</td>
                  <td>{fmtDate(p.fecha)}</td>
                  <td>
                    {p.anulado
                      ? <span className="fc-pago-badge fc-pago-badge-anul">Anulado</span>
                      : <span className="fc-pago-badge fc-pago-badge-ok"><IcoCheck /> OK</span>
                    }
                  </td>
                  <td>
                    {!p.anulado && !isAnulada && (
                      <button className="fc-pago-anular-btn" onClick={() => handleAnularPago(p.id)}
                        title="Anular pago">
                        <IcoTrash />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
            No hay pagos registrados
          </div>
        )}
      </div>

      {/* ═══ Notas de Crédito/Débito ═══ */}
      {(data.notas || []).length > 0 && (
        <div className="fc-card">
          <h3 className="fc-card-title">Notas de Crédito / Débito</h3>
          <div className="fc-notas-list">
            {data.notas.map(n => (
              <div key={n.id} className="fc-nota-item">
                <span className="fc-nota-badge">{n.tipo_nota === 1 ? 'NC' : 'ND'}</span>
                <span>{n.observaciones || `Nota ${n.tipo_nota === 1 ? 'Crédito' : 'Débito'}`}</span>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>{fmtDate(n.fecha)}</span>
                <span className="fc-nota-monto">{currSymbol} {fmtPrice(n.total_nota)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Actions ═══ */}
      <div className="fc-actions">
        {canPay && (
          <button className="ot-btn ot-btn-primary" onClick={openPago}>
            <IcoDollar /> Ingresar Pago
          </button>
        )}
        {!isAnulada && (
          <button className="ot-btn ot-btn-secondary" onClick={() => {
            setNcForm({ monto: '', observaciones: '' })
            setNcOpen(true)
          }}>
            <IcoFile /> Nota de Crédito
          </button>
        )}
        {!isAnulada && (
          <button className="ot-btn ot-btn-danger" onClick={() => {
            setAnularMotivo('')
            setAnularFactOpen(true)
          }}>
            <IcoAlertTri /> Anular Factura
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button className="ot-btn ot-btn-ghost" onClick={() => navigate('/ordenes')}>Ir a Lista</button>
        <button className="ot-btn ot-btn-ghost" onClick={() => navigate(`/ordenes/${otNumero}`)}>
          Ir a Orden
        </button>
      </div>

      {/* ═══ Modal: Registrar Pago ═══ */}
      {pagoOpen && (
        <div className="fc-modal-overlay" onClick={() => setPagoOpen(false)}>
          <div className="fc-modal" onClick={e => e.stopPropagation()}>
            <div className="fc-modal-head">
              <h3>Registrar Pago</h3>
              <button className="fc-modal-close" onClick={() => setPagoOpen(false)}><IcoX /></button>
            </div>
            <div className="fc-modal-body">
              <div className="fc-modal-info">
                <div className="fc-row"><span className="fc-label">Total</span><span className="fc-amount">{currSymbol} {fmtPrice(totalFactura)}</span></div>
                <div className="fc-row"><span className="fc-label">Pendiente</span><span className="fc-amount fc-pending">{currSymbol} {fmtPrice(pendiente)}</span></div>
              </div>

              <div className="ote-field">
                <label>Tipo de Pago</label>
                <select value={pagoForm.tipo_pago_id}
                  onChange={e => setPagoForm(f => ({ ...f, tipo_pago_id: e.target.value }))}>
                  {(data.tiposPago || []).map(tp => (
                    <option key={tp.id} value={tp.id}>{tp.tipo}</option>
                  ))}
                </select>
              </div>

              <div className="ote-field">
                <label>Monto ({currSymbol})</label>
                <input type="number" step="0.01" min="0.01" value={pagoForm.monto}
                  onChange={e => setPagoForm(f => ({ ...f, monto: e.target.value }))} />
              </div>

              {pagoForm.tipo_pago_id == 3 && (
                <>
                  <div className="ote-field">
                    <label>Monto Recibido</label>
                    <input type="number" step="0.01" value={pagoForm.monto_recibido}
                      onChange={e => setPagoForm(f => ({ ...f, monto_recibido: e.target.value }))} />
                  </div>
                  {cambio > 0 && (
                    <div className="fc-cambio">
                      Cambio: <strong>{currSymbol} {fmtPrice(cambio)}</strong>
                    </div>
                  )}
                </>
              )}

              <div className="ote-field">
                <label>Nro. Documento</label>
                <input value={pagoForm.num_documento}
                  onChange={e => setPagoForm(f => ({ ...f, num_documento: e.target.value }))}
                  placeholder="Referencia (opcional)" />
              </div>
            </div>
            <div className="fc-modal-foot">
              <button className="ot-btn ot-btn-ghost" onClick={() => setPagoOpen(false)} disabled={pagoSaving}>Cancelar</button>
              <button className="ot-btn ot-btn-primary" onClick={handlePago} disabled={pagoSaving}>
                {pagoSaving ? 'Guardando...' : 'Guardar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal: Anular Factura ═══ */}
      {anularFactOpen && (
        <div className="fc-modal-overlay" onClick={() => setAnularFactOpen(false)}>
          <div className="fc-modal" onClick={e => e.stopPropagation()}>
            <div className="fc-modal-head">
              <h3>Anular Factura #{f.numero}</h3>
              <button className="fc-modal-close" onClick={() => setAnularFactOpen(false)}><IcoX /></button>
            </div>
            <div className="fc-modal-body">
              <div className="fc-modal-info" style={{ borderColor: 'rgba(220,38,38,0.2)', background: '#fef2f2' }}>
                <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                  Esta acción es irreversible. La factura quedará marcada como ANULADA.
                </div>
              </div>
              <div className="ote-field">
                <label>Motivo de anulación *</label>
                <textarea value={anularMotivo}
                  onChange={e => setAnularMotivo(e.target.value)}
                  placeholder="Ingrese el motivo..."
                  rows={3} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="fc-modal-foot">
              <button className="ot-btn ot-btn-ghost" onClick={() => setAnularFactOpen(false)} disabled={anularSaving}>Cancelar</button>
              <button className="ot-btn ot-btn-danger" onClick={handleAnularFactura}
                disabled={anularSaving || !anularMotivo.trim()}>
                {anularSaving ? 'Anulando...' : 'Anular Factura'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal: Nota de Crédito ═══ */}
      {ncOpen && (
        <div className="fc-modal-overlay" onClick={() => setNcOpen(false)}>
          <div className="fc-modal" onClick={e => e.stopPropagation()}>
            <div className="fc-modal-head">
              <h3>Nota de Crédito</h3>
              <button className="fc-modal-close" onClick={() => setNcOpen(false)}><IcoX /></button>
            </div>
            <div className="fc-modal-body">
              <div className="fc-modal-info">
                <div className="fc-row"><span className="fc-label">Factura</span><span>#{f.numero}</span></div>
                <div className="fc-row"><span className="fc-label">Total Factura</span><span className="fc-amount">{currSymbol} {fmtPrice(totalFactura)}</span></div>
              </div>

              <div className="ote-field">
                <label>Monto de la Nota ({currSymbol}) *</label>
                <input type="number" step="0.01" min="0.01" value={ncForm.monto}
                  onChange={e => setNcForm(f => ({ ...f, monto: e.target.value }))} />
              </div>

              <div className="ote-field">
                <label>Observaciones</label>
                <textarea value={ncForm.observaciones}
                  onChange={e => setNcForm(f => ({ ...f, observaciones: e.target.value }))}
                  placeholder="Motivo de la nota de crédito..."
                  rows={3} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="fc-modal-foot">
              <button className="ot-btn ot-btn-ghost" onClick={() => setNcOpen(false)} disabled={ncSaving}>Cancelar</button>
              <button className="ot-btn ot-btn-secondary" onClick={handleNC}
                disabled={ncSaving || !ncForm.monto || parseFloat(ncForm.monto) <= 0}>
                {ncSaving ? 'Creando...' : 'Crear Nota de Crédito'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
