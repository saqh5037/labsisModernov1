import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getOrdenDetalle, getLaboratorio } from '../services/api'

const calcAge = (bd) => {
  if (!bd) return ''
  const b = new Date(bd), n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return a
}

const fmtBarcode = (bc) => {
  if (!bc) return ''
  const p1 = bc.substring(0, 6)
  const p2 = bc.substring(6, 10)
  const p3 = bc.length > 10 ? bc.substring(10) : ''
  return `${p1} ${p2} ${p3}`.trim()
}

export default function PrintEtiqueta() {
  const { numero } = useParams()
  const [searchParams] = useSearchParams()
  const muestraId = searchParams.get('muestra')
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
    if (data && !loading) {
      setTimeout(() => window.print(), 400)
    }
  }, [data, loading])

  if (loading) return <div className="pet-loading">Cargando...</div>
  if (!data) return <div className="pet-loading">No encontrada</div>

  const muestras = muestraId
    ? (data.muestras || []).filter(m => String(m.id) === muestraId)
    : (data.muestras || [])

  if (muestras.length === 0) return <div className="pet-loading">Muestra no encontrada</div>

  const pacNombre = data.paciente || ''
  const ci = data.ci_paciente || ''
  const sexo = data.sexo || ''
  const edad = calcAge(data.fecha_nacimiento)
  const stat = data.stat
  const labNombre = lab?.nombre || ''

  return (
    <div className="pet-page">
      {muestras.map((mu, i) => (
        <div key={mu.id} className="pet-label" style={i < muestras.length - 1 ? { pageBreakAfter: 'always' } : undefined}>
          <table className="pet-table">
            <tbody>
              {/* Row 0: Lab name */}
              {labNombre && (
                <tr>
                  <td colSpan={2} className="pet-lab-name">{labNombre}</td>
                </tr>
              )}
              {/* Row 1: Patient + sample type */}
              <tr>
                <td className="pet-patient">
                  {ci} <span className="pet-patient-name">{pacNombre}</span>
                </td>
                <td className="pet-sample-type">
                  {(mu.tipo_muestra || '').toUpperCase()} {mu.contenedor_abrev || ''}
                </td>
              </tr>
              {/* Row 2: Barcode + metadata */}
              <tr>
                <td colSpan={2} className="pet-barcode-row">
                  <div className="pet-barcode-flex">
                    <div className="pet-barcode-visual">{mu.barcode}</div>
                    <div className="pet-barcode-fallback">{mu.barcode}</div>
                    <div className="pet-meta">
                      [{sexo} - {edad}]
                      {stat && <div className="pet-stat">ST</div>}
                    </div>
                  </div>
                </td>
              </tr>
              {/* Row 3: Barcode number + nomenclatura */}
              <tr>
                <td colSpan={2} className="pet-barcode-text">
                  <span className="pet-barcode-num">{fmtBarcode(mu.barcode)}</span>
                  {mu.nomenclatura && <span className="pet-nomenclatura">{mu.nomenclatura}</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
