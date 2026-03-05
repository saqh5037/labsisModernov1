import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getOrdenDetalle, getLaboratorio, getReciboData } from '../services/api'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : ''
const fmtMoney = (n) => n != null ? `$ ${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$ 0.00'
const calcAge = (bd) => {
  if (!bd) return '—'
  const b = new Date(bd), n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return `${a} años`
}

export default function PrintReciboCredito() {
  const { numero } = useParams()
  const [data, setData] = useState(null)
  const [lab, setLab] = useState(null)
  const [recibo, setRecibo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getOrdenDetalle(numero), getLaboratorio(), getReciboData(numero)])
      .then(([orden, laboratorio, reciboData]) => { setData(orden); setLab(laboratorio); setRecibo(reciboData) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [numero])

  useEffect(() => {
    if (data && lab && !loading) {
      setTimeout(() => window.print(), 400)
    }
  }, [data, lab, loading])

  if (loading) return <div className="prc-loading">Cargando...</div>
  if (!data) return <div className="prc-loading">Orden no encontrada</div>

  const grupos = data.grupos || []
  const pruebasSinGrupo = (data.pruebas || []).filter(p => !p.gp_id && !p.gp_orden_id)
  const subtotal = Number(data.precio) || 0
  const iva = subtotal * 0.16
  const total = subtotal + iva

  return (
    <div className="prc-page">
      {/* ═══ HEADER ═══ */}
      <table className="prc-header">
        <tbody>
          <tr>
            <td className="prc-header-logo">
              {lab?.logo_url
                ? <img src={lab.logo_url} alt="Logo" className="prc-logo-img" />
                : <div className="prc-logo-placeholder">LOGO</div>
              }
            </td>
            <td className="prc-header-lab">
              <div className="prc-lab-name">{lab?.nombre || 'LABORATORIO'}</div>
              {lab?.rif && <div className="prc-lab-rif">RFC: {lab.rif}</div>}
              <div className="prc-lab-addr">{lab?.direccion?.replace(/\r/g, '') || ''}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="prc-title">Recibo de Crédito</div>

      {/* ═══ 2 COLUMNAS: Fiscal + Servicio ═══ */}
      <div className="prc-two-col">
        {/* Col izq: datos fiscales del cliente */}
        <div className="prc-col">
          <div className="prc-col-title">Datos del Cliente</div>
          <table className="prc-info-table">
            <tbody>
              <tr><td className="prc-bold">Cliente:</td><td>{recibo?.cliente_nombre || '—'}</td></tr>
              <tr><td className="prc-bold">RFC:</td><td>{recibo?.ci_rif || '—'}</td></tr>
              <tr><td className="prc-bold">Email:</td><td>{recibo?.cliente_email || '—'}</td></tr>
              <tr><td className="prc-bold">Dirección:</td><td>{recibo?.cliente_direccion || '—'}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Col der: datos del servicio y paciente */}
        <div className="prc-col">
          <div className="prc-col-title">Datos del Servicio</div>
          <table className="prc-info-table">
            <tbody>
              <tr><td className="prc-bold">Requisición:</td><td>{data.numero}</td></tr>
              <tr><td className="prc-bold">Fecha:</td><td>{fmtDateTime(data.fecha)}</td></tr>
              <tr><td className="prc-bold">Convenio:</td><td>{recibo?.servicio_desc || '—'}</td></tr>
              <tr><td className="prc-bold">Paciente:</td><td>{data.paciente}</td></tr>
              <tr><td className="prc-bold">Edad:</td><td>{calcAge(data.fecha_nacimiento)}</td></tr>
              <tr><td className="prc-bold">Sexo:</td><td>{data.sexo === 'M' ? 'Masculino' : data.sexo === 'F' ? 'Femenino' : '—'}</td></tr>
              {data.medico_nombre?.trim() && <tr><td className="prc-bold">Médico:</td><td>{data.medico_nombre}</td></tr>}
              {data.habitacion && <tr><td className="prc-bold">Habitación:</td><td>{data.habitacion}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ TABLA DE SERVICIOS ═══ */}
      <table className="prc-exam-table">
        <thead>
          <tr>
            <th style={{ width: '8%' }}>Código</th>
            <th style={{ width: '8%' }}>Cant</th>
            <th style={{ width: '34%' }}>Descripción / Procedimiento</th>
            <th style={{ width: '18%' }}>Precio</th>
            <th style={{ width: '14%' }}>Descuento</th>
            <th style={{ width: '18%', textAlign: 'right' }}>Neto</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map(g => (
            <tr key={`g-${g.id}`}>
              <td>—</td>
              <td className="prc-center">1</td>
              <td>{g.nombre}</td>
              <td className="prc-center">{fmtMoney(g.precio)}</td>
              <td className="prc-center">$ 0.00</td>
              <td className="prc-right">{fmtMoney(g.precio)}</td>
            </tr>
          ))}
          {pruebasSinGrupo.map(p => (
            <tr key={`p-${p.id}`}>
              <td>—</td>
              <td className="prc-center">1</td>
              <td>{p.prueba}</td>
              <td className="prc-center">{fmtMoney(p.precio)}</td>
              <td className="prc-center">$ 0.00</td>
              <td className="prc-right">{fmtMoney(p.precio)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ═══ TOTALES ═══ */}
      <div className="prc-totals">
        <div className="prc-total-row">
          <span>Sub Total:</span>
          <span>{fmtMoney(subtotal)}</span>
        </div>
        <div className="prc-total-row">
          <span>IVA (16%):</span>
          <span>{fmtMoney(iva)}</span>
        </div>
        <div className="prc-total-row prc-total-final">
          <span>Total a Pagar:</span>
          <span>{fmtMoney(total)}</span>
        </div>
      </div>

      {/* ═══ ATENDIDO POR ═══ */}
      <div className="prc-footer">
        Atendido por: {data.usuario_registro || '—'} | Fecha: {fmtDate(data.fecha)}
      </div>
    </div>
  )
}
