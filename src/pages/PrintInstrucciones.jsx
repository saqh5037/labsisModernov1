import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getOrdenDetalle, getLaboratorio, getInstrucciones } from '../services/api'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
const calcAge = (bd) => {
  if (!bd) return '—'
  const b = new Date(bd), n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return `${a} años`
}

export default function PrintInstrucciones() {
  const { numero } = useParams()
  const [data, setData] = useState(null)
  const [lab, setLab] = useState(null)
  const [instrucciones, setInstrucciones] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getOrdenDetalle(numero), getLaboratorio(), getInstrucciones(numero)])
      .then(([orden, laboratorio, instrData]) => {
        setData(orden)
        setLab(laboratorio)
        setInstrucciones(instrData.instrucciones || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [numero])

  useEffect(() => {
    if (data && lab && !loading) {
      setTimeout(() => window.print(), 400)
    }
  }, [data, lab, loading])

  if (loading) return <div className="pin-loading">Cargando...</div>
  if (!data) return <div className="pin-loading">Orden no encontrada</div>

  return (
    <div className="pin-page">
      {/* ═══ HEADER ═══ */}
      <table className="pin-header">
        <tbody>
          <tr>
            <td className="pin-header-logo">
              {lab?.logo_url
                ? <img src={lab.logo_url} alt="Logo" className="pin-logo-img" />
                : <div className="pin-logo-placeholder">LOGO</div>
              }
            </td>
            <td className="pin-header-lab">
              <div className="pin-lab-name">{lab?.nombre || 'LABORATORIO'}</div>
              <div className="pin-lab-addr">{lab?.direccion?.replace(/\r/g, '') || ''}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ DATOS PACIENTE ═══ */}
      <table className="pin-patient">
        <tbody>
          <tr>
            <td className="pin-bold">Paciente:</td>
            <td colSpan={3}>{data.paciente}</td>
            <td className="pin-bold">Cédula:</td>
            <td>{data.ci_paciente}</td>
          </tr>
          <tr>
            <td className="pin-bold">Requisición:</td>
            <td>{data.numero}</td>
            <td className="pin-bold">Fecha:</td>
            <td>{fmtDate(data.fecha)}</td>
            <td className="pin-bold">Edad:</td>
            <td>{calcAge(data.fecha_nacimiento)}</td>
          </tr>
          <tr>
            <td className="pin-bold">Sexo:</td>
            <td>{data.sexo === 'M' ? 'Masculino' : data.sexo === 'F' ? 'Femenino' : '—'}</td>
            <td className="pin-bold">Procedencia:</td>
            <td colSpan={3}>{data.procedencia || '—'}</td>
          </tr>
        </tbody>
      </table>

      {/* ═══ TÍTULO ═══ */}
      <div className="pin-title">Instrucciones Toma de Muestra</div>

      {/* ═══ INSTRUCCIONES ═══ */}
      {instrucciones.length > 0 ? (
        <div className="pin-list">
          {instrucciones.map((instr, i) => (
            <div key={instr.id || i} className={`pin-item ${instr.condicion_especial ? 'pin-especial' : ''}`}>
              {instr.condicion_especial && <span className="pin-asterisk">* </span>}
              {instr.codigo && <span className="pin-code">[{instr.codigo}] </span>}
              <span dangerouslySetInnerHTML={{ __html: instr.informacion }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="pin-empty">
          No hay instrucciones de toma de muestra registradas para los exámenes de esta orden.
        </div>
      )}
    </div>
  )
}
