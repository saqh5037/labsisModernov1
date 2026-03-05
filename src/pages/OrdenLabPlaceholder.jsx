import { useParams, useNavigate } from 'react-router-dom'

const Ico = ({ d, vb = '0 0 24 24', w = 1.8, size = 16 }) => (
  <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
)
const IcoFlask = () => <Ico d={<><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></>} />
const IcoBack = () => <Ico d={<><polyline points="15 18 9 12 15 6"/></>} w={2} />

export default function OrdenLabPlaceholder({ mode }) {
  const { numero } = useParams()
  const navigate = useNavigate()
  const isEdit = mode === 'editar'

  return (
    <div className="ot-shell">
      <nav className="app-navbar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="nav-logo"><div className="nav-logo-mark"><IcoFlask /></div><span className="nav-brand">lab<em>sis</em></span></div>
        <div className="nav-divider" />
        <button className="ot-nav-back" onClick={() => navigate(`/ordenes/${numero}`)}><IcoBack /> Orden {numero}</button>
        <div style={{ flex: 1 }} />
        <div className="nav-avatar">SQ</div>
      </nav>

      <main className="ot-content">
        <div className="ot-panel-header">
          <span className="ot-panel-title">
            {isEdit ? `Editar Orden ${numero}` : `Ingreso de Resultados — Orden ${numero}`}
          </span>
        </div>

        <div className="ot-panel" style={{ padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>
            {isEdit ? '✏️' : '🔬'}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy-d)', marginBottom: 8 }}>
            {isEdit ? 'Edición de Orden de Trabajo' : 'Ingreso de Resultados de Laboratorio'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
            {isEdit
              ? 'Esta pantalla permitirá editar los datos de la orden: paciente, doctor, pruebas, procedencia, etc.'
              : 'Esta pantalla permitirá ingresar resultados por prueba, ver rangos de referencia, histórico de resultados, y validar/guardar los valores ingresados.'
            }
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-4)', fontStyle: 'italic', marginBottom: 24 }}>
            Próxima fase de implementación (Fase 2)
          </div>
          <button
            className="ot-btn ot-btn-gold"
            onClick={() => navigate(`/ordenes/${numero}`)}
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            ← Regresar al Detalle
          </button>
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-left">
          <div className="sb-seg"><div className="sb-online-dot" /><strong>En línea</strong></div>
          <div className="sb-seg"><div className="sb-db-dot" /><span>labsisEG</span></div>
        </div>
        <div className="footer-right">
          <div className="sb-seg"><strong>Elizabeth Gutiérrez</strong></div>
          <div className="sb-seg"><span>{new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span></div>
        </div>
      </footer>
    </div>
  )
}
