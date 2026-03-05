import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getOrdenDetalle, getLaboratorio, getPreguntas } from '../services/api'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
const calcAge = (bd) => {
  if (!bd) return '—'
  const b = new Date(bd), n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return `${a} años`
}

export default function PrintPreguntas() {
  const { numero } = useParams()
  const [data, setData] = useState(null)
  const [lab, setLab] = useState(null)
  const [preguntas, setPreguntas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getOrdenDetalle(numero), getLaboratorio(), getPreguntas(numero)])
      .then(([orden, laboratorio, pregData]) => {
        setData(orden)
        setLab(laboratorio)
        setPreguntas(pregData.preguntas || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [numero])

  useEffect(() => {
    if (data && lab && !loading) {
      setTimeout(() => window.print(), 400)
    }
  }, [data, lab, loading])

  if (loading) return <div className="ppq-loading">Cargando...</div>
  if (!data) return <div className="ppq-loading">Orden no encontrada</div>

  return (
    <div className="ppq-page">
      {/* ═══ HEADER ═══ */}
      <table className="ppq-header">
        <tbody>
          <tr>
            <td className="ppq-header-logo">
              {lab?.logo_url
                ? <img src={lab.logo_url} alt="Logo" className="ppq-logo-img" />
                : <div className="ppq-logo-placeholder">LOGO</div>
              }
            </td>
            <td className="ppq-header-lab">
              <div className="ppq-lab-name">{lab?.nombre || 'LABORATORIO'}</div>
              <div className="ppq-lab-addr">{lab?.direccion?.replace(/\r/g, '') || ''}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ═══ DATOS PACIENTE ═══ */}
      <table className="ppq-patient">
        <tbody>
          <tr>
            <td className="ppq-bold">Paciente:</td>
            <td colSpan={3}>{data.paciente}</td>
            <td className="ppq-bold">Cédula:</td>
            <td>{data.ci_paciente}</td>
          </tr>
          <tr>
            <td className="ppq-bold">Requisición:</td>
            <td>{data.numero}</td>
            <td className="ppq-bold">Fecha:</td>
            <td>{fmtDate(data.fecha)}</td>
            <td className="ppq-bold">Edad:</td>
            <td>{calcAge(data.fecha_nacimiento)}</td>
          </tr>
        </tbody>
      </table>

      {/* ═══ TÍTULO ═══ */}
      <div className="ppq-title">Preguntas Pre-Analíticas</div>

      {/* ═══ TABLA DE PREGUNTAS ═══ */}
      {preguntas.length > 0 ? (
        <table className="ppq-table">
          <thead>
            <tr>
              <th style={{ width: '50%' }}>Pregunta</th>
              <th style={{ width: '50%' }}>Respuesta</th>
            </tr>
          </thead>
          <tbody>
            {preguntas.map((q, i) => (
              <tr key={q.id || i}>
                <td>{q.pregunta}</td>
                <td>{q.respuesta || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="ppq-empty">
          No hay preguntas pre-analíticas registradas para esta orden.
        </div>
      )}
    </div>
  )
}
