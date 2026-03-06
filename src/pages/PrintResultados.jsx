import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getResultadosPrint, getLaboratorio } from '../services/api'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
const fmtDateTime = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

/* Micro range bar — tiny, elegant, inline */
function MiniRange({ valor, rangoRef }) {
  if (!rangoRef) return null
  const match = rangoRef.match(/([\d.]+)\s*-\s*([\d.]+)/)
  if (!match) return null
  const num = parseFloat(valor)
  if (isNaN(num)) return null
  const lo = parseFloat(match[1])
  const hi = parseFloat(match[2])
  const pad = (hi - lo) * 0.35
  const bMin = lo - pad
  const bMax = hi + pad
  const range = bMax - bMin || 1
  const nLeft = ((lo - bMin) / range) * 100
  const nWidth = ((hi - lo) / range) * 100
  const dot = Math.max(2, Math.min(98, ((num - bMin) / range) * 100))
  const inRange = num >= lo && num <= hi
  return (
    <div className="rpt-minibar">
      <div className="rpt-minibar-track">
        <div className="rpt-minibar-norm" style={{ left: `${nLeft}%`, width: `${nWidth}%` }} />
        <div className="rpt-minibar-dot" style={{ left: `${dot}%`, background: inRange ? '#059669' : '#dc2626' }} />
      </div>
    </div>
  )
}

export default function PrintResultados() {
  const { numero } = useParams()
  const [data, setData] = useState(null)
  const [lab, setLab] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([getResultadosPrint(numero), getLaboratorio()])
      .then(([d, l]) => { setData(d); setLab(l) })
      .catch(err => { console.error(err); setError(err.message) })
  }, [numero])

  useEffect(() => {
    if (data && lab) setTimeout(() => window.print(), 800)
  }, [data, lab])

  if (error) return <div className="rpt-load" style={{color:'#b91c1c'}}>Error: {error}</div>
  if (!data || !lab) return <div className="rpt-load">Cargando resultados...</div>

  const { ot, paciente, areas } = data

  return (
    <div className="rpt-page">

      {/* ═══ HEADER ═══ */}
      <header className="rpt-hdr">
        <div className="rpt-hdr-left">
          {lab.logo_url && <img src={lab.logo_url} alt="" className="rpt-logo" />}
          <div>
            <div className="rpt-lab-name">{lab.nombre}</div>
            {lab.rif && <div className="rpt-lab-meta">RIF: {lab.rif}</div>}
            {lab.direccion && <div className="rpt-lab-meta">{lab.direccion}</div>}
            {lab.telefono && <div className="rpt-lab-meta">Tel: {lab.telefono}</div>}
          </div>
        </div>
        <div className="rpt-hdr-right">
          <div className="rpt-hdr-badge">Reporte Final</div>
          <div className="rpt-hdr-ot">OT {ot.numero}</div>
        </div>
      </header>

      <div className="rpt-accent-line" />

      {/* ═══ PATIENT INFO ═══ */}
      <section className="rpt-info">
        <div className="rpt-info-block">
          <div className="rpt-info-head">Paciente</div>
          <div className="rpt-info-main">{paciente.nombre}</div>
          <div className="rpt-info-detail">{paciente.cedula || '—'} &middot; {paciente.edad != null ? `${paciente.edad} anos` : '—'} &middot; {paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}</div>
          {paciente.numHistoria && <div className="rpt-info-detail">Historia: {paciente.numHistoria}</div>}
        </div>
        <div className="rpt-info-block">
          <div className="rpt-info-head">Medico</div>
          <div className="rpt-info-main">{ot.medico || '—'}</div>
          {ot.medicoMpps && <div className="rpt-info-detail">MPPS: {ot.medicoMpps}</div>}
          {ot.procedencia && <div className="rpt-info-detail">{ot.procedencia}</div>}
        </div>
        <div className="rpt-info-block">
          <div className="rpt-info-head">Muestra</div>
          <div className="rpt-info-row"><span>Orden:</span> <strong>{fmtDate(ot.fecha)}</strong></div>
          {ot.fechaValidado && <div className="rpt-info-row"><span>Validado:</span> <strong>{fmtDate(ot.fechaValidado)}</strong></div>}
          <div className="rpt-info-row"><span>Reporte:</span> <strong>{fmtDateTime(new Date())}</strong></div>
        </div>
      </section>

      {/* ═══ RESULTS ═══ */}
      {areas.map(area => (
        <section key={area.id} className="rpt-area">
          {areas.length > 1 && (
            <div className="rpt-area-title">{area.nombre}</div>
          )}

          {area.grupos.map((grupo, gi) => (
            <div key={gi} className="rpt-grupo">
              {grupo.nombre && (
                <div className="rpt-grupo-hdr">
                  <span className="rpt-grupo-name">{grupo.nombre}</span>
                  {grupo.metodologia && <span className="rpt-grupo-met">{grupo.metodologia}</span>}
                </div>
              )}

              <table className="rpt-tbl">
                <thead>
                  <tr>
                    <th className="rpt-th" style={{width:'28%', textAlign:'left'}}>Prueba</th>
                    <th className="rpt-th" style={{width:'15%'}}>Resultado</th>
                    <th className="rpt-th" style={{width:'15%'}}>Rango</th>
                    <th className="rpt-th" style={{width:'8%'}}>Unidad</th>
                    <th className="rpt-th" style={{width:'7%'}}>Flag</th>
                    <th className="rpt-th" style={{width:'27%'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.pruebas.map(p => {
                    const isH = p.indicador === 'H' || p.indicador === 'HH'
                    const isL = p.indicador === 'L' || p.indicador === 'LL'
                    const abn = p.anormal || isH || isL
                    const crit = p.critico || p.indicador === 'HH' || p.indicador === 'LL'
                    const cls = crit ? 'rpt-crit' : abn ? 'rpt-abn' : ''
                    const flag = crit ? (isH ? 'Alto *' : isL ? 'Bajo *' : 'Crit.') : isH ? 'Alto' : isL ? 'Bajo' : ''
                    return (
                      <tr key={p.id} className={cls}>
                        <td className="rpt-td rpt-td-name">{p.nombre}</td>
                        <td className={`rpt-td rpt-td-val ${cls}`}>
                          {p.menor_mayor === '<' ? '<' : p.menor_mayor === '>' ? '>' : ''}{p.valor}
                        </td>
                        <td className="rpt-td rpt-td-ref">{p.rangoRef}</td>
                        <td className="rpt-td rpt-td-unit">{p.unidad}</td>
                        <td className={`rpt-td rpt-td-flag ${cls}`}>{flag}</td>
                        <td className="rpt-td rpt-td-bar">
                          <MiniRange valor={p.valor} rangoRef={p.rangoRef} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {grupo.pruebas.filter(p => p.nota).map(p => (
                <div key={`n-${p.id}`} className="rpt-note">
                  <em>{p.nombre}:</em> {p.nota}
                </div>
              ))}
            </div>
          ))}

          {area.observaciones && (
            <div className="rpt-note"><em>Observaciones:</em> {area.observaciones}</div>
          )}
        </section>
      ))}

      {/* General obs */}
      {ot.observaciones && (
        <div className="rpt-obs">
          <strong>Observaciones:</strong> {ot.observaciones}
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <footer className="rpt-foot">
        <div className="rpt-foot-line" />
        <div className="rpt-foot-row">
          <span className="rpt-foot-lab">{lab.nombre}</span>
          <span>Generado: {fmtDateTime(new Date())} &middot; <strong>Reporte Final</strong></span>
        </div>
        <div className="rpt-foot-legal">
          Los resultados aplican unicamente a la muestra analizada. Este documento no es valido sin sello del laboratorio.
          {lab.nombre && ` \u00A9 ${new Date().getFullYear()} ${lab.nombre}.`}
        </div>
      </footer>

      {/* Actions */}
      <div className="rpt-actions no-print">
        <button className="rpt-btn rpt-btn-primary" onClick={() => window.print()}>Imprimir</button>
        <button className="rpt-btn rpt-btn-accent" onClick={() => window.open(`/api/ordenes/${numero}/resultados-pdf`, '_blank')}>Descargar PDF</button>
        <button className="rpt-btn" onClick={() => window.history.back()}>Regresar</button>
      </div>
    </div>
  )
}
