import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFacturaData, registrarPago } from '../services/api.js'

/* ── Icons ── */
const Ico = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const IcoBack = () => <Ico d="M19 12H5M12 19l-7-7 7-7" />
const IcoX = () => <Ico d="M18 6L6 18M6 6l12 12" size={14} />

/* ── Helpers ── */
const fmtPrice = (n) => {
  const num = parseFloat(n) || 0
  return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const fmtDate = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const statusColor = (id) => {
  const map = { 1: '#dc2626', 2: '#f59e0b', 3: '#059669', 4: '#64748b' }
  return map[id] || '#94a3b8'
}
const statusLabel = (id) => {
  const map = { 1: 'PENDIENTE', 2: 'PAGO PARCIAL', 3: 'PAGADA', 4: 'ANULADA' }
  return map[id] || 'DESCONOCIDO'
}

export default function FacturaCobro() {
  const { numero: otNumero } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  // Pago modal
  const [pagoOpen, setPagoOpen] = useState(false)
  const [pagoForm, setPagoForm] = useState({ tipo_pago_id: 3, monto: '', num_documento: '', monto_recibido: '' })
  const [pagoSaving, setPagoSaving] = useState(false)

  // ── Load factura data ──
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      // Get OT to find factura_id
      const otRes = await fetch(`/api/ordenes/${otNumero}`)
      if (!otRes.ok) throw new Error('Orden no encontrada')
      const otData = await otRes.json()

      if (!otData.orden?.factura_id) {
        setError('Esta orden no tiene factura asociada')
        setLoading(false)
        return
      }

      // Load factura by ID (endpoint supports both id and numero)
      const fData = await getFacturaData(otData.orden.factura_id)
      setData(fData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [otNumero])

  useEffect(() => { loadData() }, [loadData])

  // ── Calculated values ──
  const totalFactura = parseFloat(data?.factura?.total_factura) || 0
  const totalPagado = (data?.pagos || []).reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
  const pendiente = totalFactura - totalPagado

  // ── Open pago modal ──
  const openPago = () => {
    setPagoForm({ tipo_pago_id: 3, monto: pendiente.toFixed(2), num_documento: '', monto_recibido: '' })
    setPagoOpen(true)
  }

  // ── Submit pago ──
  const handlePago = async () => {
    if (!pagoForm.monto || parseFloat(pagoForm.monto) <= 0) return
    setPagoSaving(true)
    try {
      await registrarPago(data.factura.id, {
        tipo_pago_id: parseInt(pagoForm.tipo_pago_id),
        monto: parseFloat(pagoForm.monto),
        num_documento: pagoForm.num_documento || null,
        monto_recibido: pagoForm.monto_recibido ? parseFloat(pagoForm.monto_recibido) : null
      })
      setPagoOpen(false)
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setPagoSaving(false)
    }
  }

  // ── Cambio calculation ──
  const cambio = pagoForm.tipo_pago_id == 3 && pagoForm.monto_recibido
    ? Math.max(0, parseFloat(pagoForm.monto_recibido) - parseFloat(pagoForm.monto || 0))
    : 0

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

  const f = data.factura

  return (
    <div className="fc-page">
      <div className="ote-header">
        <button className="ot-btn ot-btn-ghost" onClick={() => navigate(`/ordenes/${otNumero}`)}>
          <IcoBack /> Ir a Orden
        </button>
        <h1 className="ote-title">Factura #{f.numero}</h1>
      </div>

      {error && (
        <div className="ote-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}><IcoX /></button>
        </div>
      )}

      {/* ── Info + Status ── */}
      <div className="fc-grid-top">
        <section className="ote-section fc-info">
          <h2 className="ote-section-title">Datos Factura</h2>
          <div className="fc-info-rows">
            <div className="fc-row"><span className="fc-label">Cliente</span><span>{f.cliente_nombre}</span></div>
            <div className="fc-row"><span className="fc-label">CI/RIF</span><span>{f.cliente_ci}</span></div>
            <div className="fc-row"><span className="fc-label">Fecha</span><span>{fmtDate(f.fecha)}</span></div>
            <div className="fc-row"><span className="fc-label">Factura</span><span>#{f.numero}</span></div>
            {data.ordenes?.length > 0 && (
              <div className="fc-row"><span className="fc-label">Orden</span><span>{data.ordenes.map(o => o.numero).join(', ')}</span></div>
            )}
          </div>
        </section>

        <section className="ote-section fc-status">
          <h2 className="ote-section-title">Pagos</h2>
          <div className="fc-status-badge" style={{ background: statusColor(f.status_id) + '18', color: statusColor(f.status_id), borderColor: statusColor(f.status_id) }}>
            {statusLabel(f.status_id)}
          </div>
          <div className="fc-amounts">
            <div className="fc-row"><span className="fc-label">Total</span><span className="fc-amount">Bs.S {fmtPrice(totalFactura)}</span></div>
            <div className="fc-row"><span className="fc-label">Pagado</span><span className="fc-amount fc-paid">Bs.S {fmtPrice(totalPagado)}</span></div>
            <div className="fc-row fc-row-pending"><span className="fc-label">Pendiente</span><span className="fc-amount fc-pending">Bs.S {fmtPrice(pendiente)}</span></div>
          </div>

          {/* Pagos registrados */}
          {data.pagos?.length > 0 && (
            <div className="fc-pagos-list">
              {data.pagos.map(p => (
                <div key={p.id} className="fc-pago-item">
                  <span>{p.tipo_pago_nombre}</span>
                  <span>Bs.S {fmtPrice(p.monto)}</span>
                  <span className="fc-pago-date">{fmtDate(p.fecha)}</span>
                </div>
              ))}
            </div>
          )}

          {pendiente > 0.01 && f.status_id !== 4 && (
            <button className="ot-btn ot-btn-primary fc-pago-btn" onClick={openPago}>
              Ingresar Pago
            </button>
          )}
        </section>
      </div>

      {/* ── Items de factura ── */}
      <section className="ote-section">
        <h2 className="ote-section-title">Items de Factura</h2>
        <table className="fc-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Descripción</th>
              <th>Cant</th>
              <th>Precio</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((item, i) => (
              <tr key={item.id}>
                <td>{i + 1}</td>
                <td>{item.nombre_item}</td>
                <td>{item.cantidad}</td>
                <td className="fc-td-right">Bs.S {fmtPrice(item.monto)}</td>
                <td className="fc-td-right">Bs.S {fmtPrice(item.monto * item.cantidad)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="fc-td-right"><strong>Total</strong></td>
              <td className="fc-td-right"><strong>Bs.S {fmtPrice(totalFactura)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* ── Bottom actions ── */}
      <div className="ote-actions">
        <button className="ot-btn ot-btn-ghost" onClick={() => navigate('/ordenes')}>
          Ir a Lista
        </button>
        <button className="ot-btn ot-btn-secondary" onClick={() => navigate(`/ordenes/${otNumero}`)}>
          Ir a Orden
        </button>
      </div>

      {/* ── Modal de Pago ── */}
      {pagoOpen && (
        <div className="fc-modal-overlay" onClick={() => setPagoOpen(false)}>
          <div className="fc-modal" onClick={e => e.stopPropagation()}>
            <div className="fc-modal-head">
              <h3>Registrar Pago</h3>
              <button className="fc-modal-close" onClick={() => setPagoOpen(false)}><IcoX /></button>
            </div>
            <div className="fc-modal-body">
              <div className="fc-modal-info">
                <div className="fc-row"><span className="fc-label">Total Factura</span><span>Bs.S {fmtPrice(totalFactura)}</span></div>
                <div className="fc-row"><span className="fc-label">Pendiente</span><span className="fc-pending">Bs.S {fmtPrice(pendiente)}</span></div>
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
                <label>Monto</label>
                <input type="number" step="0.01" value={pagoForm.monto}
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
                      Cambio: <strong>Bs.S {fmtPrice(cambio)}</strong>
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
              <button className="ot-btn ot-btn-ghost" onClick={() => setPagoOpen(false)} disabled={pagoSaving}>
                Cancelar
              </button>
              <button className="ot-btn ot-btn-primary" onClick={handlePago} disabled={pagoSaving}>
                {pagoSaving ? 'Guardando...' : 'Guardar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
