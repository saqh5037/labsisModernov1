import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getOrdenDetalle, getLaboratorio } from '../services/api'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
const fmtMoney = (n) => n != null ? `$ ${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$ 0.00'
const calcAge = (bd) => {
  if (!bd) return '—'
  const b = new Date(bd), n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return `${a} años`
}

export default function PrintOrdenTrabajo() {
  const { numero } = useParams()
  const [data, setData] = useState(null)
  const [lab, setLab] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getOrdenDetalle(numero), getLaboratorio()])
      .then(([orden, laboratorio]) => { setData(orden); setLab(laboratorio) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [numero])

  useEffect(() => {
    if (data && lab && !loading) {
      setTimeout(() => window.print(), 400)
    }
  }, [data, lab, loading])

  if (loading) return <div className="pot-loading">Cargando...</div>
  if (!data) return <div className="pot-loading">Orden no encontrada</div>

  const grupos = data.grupos || []
  const pruebasSinGrupo = (data.pruebas || []).filter(p => !p.gp_id && !p.gp_orden_id)
  const total = Number(data.precio) || 0

  return (
    <div className="pot-page">
      {/* ═══ HEADER: 3 columnas ═══ */}
      <table className="pot-header">
        <tbody>
          <tr>
            {/* Col 1: Logo */}
            <td className="pot-header-logo">
              {lab?.logo_url
                ? <img src={lab.logo_url} alt="Logo" className="pot-logo-img" />
                : <div className="pot-logo-placeholder">LOGO</div>
              }
            </td>
            {/* Col 2: Lab name + address + RIF */}
            <td className="pot-header-lab">
              <div className="pot-lab-name">{lab?.nombre || 'LABORATORIO'}</div>
              {lab?.rif && <div className="pot-lab-rif">RIF: {lab.rif}</div>}
              <div className="pot-lab-addr">{lab?.direccion?.replace(/\r/g, '') || ''}</div>
            </td>
            {/* Col 3: Order data table */}
            <td className="pot-header-data">
              <table className="pot-data-table">
                <tbody>
                  <tr><td className="pot-bold">Orden:</td><td className="pot-cell">{data.numero}</td></tr>
                  <tr><td className="pot-bold">Num. Ingreso:</td><td className="pot-cell">{data.num_ingreso || ''}</td></tr>
                  <tr><td className="pot-bold">Procedencia:</td><td className="pot-cell">{data.procedencia || ''}</td></tr>
                  <tr><td className="pot-bold">Servicio:</td><td className="pot-cell">{data.servicio_medico || ''}</td></tr>
                  {data.medico_nombre?.trim() && <tr><td className="pot-bold">Médico:</td><td className="pot-cell">{data.medico_nombre}</td></tr>}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ PACIENTE ═══ */}
      <table className="pot-patient">
        <tbody>
          <tr>
            <td className="pot-bold">Paciente:</td>
            <td colSpan={3} className="pot-cell">{data.paciente}</td>
            <td className="pot-bold">Cédula:</td>
            <td className="pot-cell">{data.ci_paciente}</td>
          </tr>
          <tr>
            <td className="pot-bold">Edad:</td>
            <td className="pot-cell">{calcAge(data.fecha_nacimiento)}</td>
            <td className="pot-bold">Fecha:</td>
            <td className="pot-cell">{fmtDate(data.fecha)}</td>
            {data.habitacion && <>
              <td className="pot-bold">Habitación:</td>
              <td className="pot-cell">{data.habitacion}</td>
            </>}
            {!data.habitacion && <><td /><td /></>}
          </tr>
          {data.fecha_estimada_entrega && (
            <tr>
              <td className="pot-bold">Fecha Entrega:</td>
              <td colSpan={5} className="pot-cell">{fmtDate(data.fecha_estimada_entrega)}</td>
            </tr>
          )}
          <tr><td colSpan={6} className="pot-spacer" /></tr>
        </tbody>
      </table>

      {/* ═══ TÍTULO ═══ */}
      <div className="pot-title">Exámenes a Realizarse</div>

      {/* ═══ TABLA DE EXÁMENES ═══ */}
      <table className="pot-exam-table">
        <thead>
          <tr>
            <th className="pot-col-desc">Descripción</th>
            <th className="pot-col-qty">Cantidad</th>
            <th className="pot-col-price">Precio Uni.</th>
            <th className="pot-col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map(g => (
            <tr key={`g-${g.id}`}>
              <td>{g.nombre}</td>
              <td className="pot-center">1</td>
              <td className="pot-center">{fmtMoney(g.precio)}</td>
              <td className="pot-right">{fmtMoney(g.precio)}</td>
            </tr>
          ))}
          {pruebasSinGrupo.map(p => (
            <tr key={`p-${p.id}`}>
              <td>{p.prueba}</td>
              <td className="pot-center">1</td>
              <td className="pot-center">{fmtMoney(p.precio)}</td>
              <td className="pot-right">{fmtMoney(p.precio)}</td>
            </tr>
          ))}
          <tr className="pot-spacer-row"><td colSpan={4} /></tr>
          <tr className="pot-total-row">
            <td colSpan={2} />
            <td className="pot-bold">Total</td>
            <td className="pot-right pot-bold">{fmtMoney(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
