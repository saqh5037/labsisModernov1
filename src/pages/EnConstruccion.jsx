import { useParams, useNavigate } from 'react-router-dom'

const LABELS = {
  // Recepción
  'presupuestos': 'Presupuestos',
  'reimpresion-codigos': 'Reimpresión Códigos de Barra',
  'calculo-toma-muestras': 'Cálculo Toma de Muestras',
  'puntos-toma': 'Puntos de Toma',
  // Laboratorio > Perfiles
  'pruebas': 'Pruebas',
  'grupo-pruebas': 'Grupo de Pruebas',
  'actualizar-pruebas': 'Actualizar Pruebas',
  'tiempos-estimados': 'Tiempos Estimados de Entrega',
  'notas-predefinidas': 'Notas Predefinidas',
  'notas-reflex': 'Notas Reflex Condicional',
  'preguntas-preanaliticas': 'Preguntas Pre-analíticas',
  'info-toma-muestra': 'Info Toma de Muestra',
  'info-toma-muestra-paciente': 'Info Toma Muestra Paciente',
  'info-traslado-muestra': 'Info Traslado de Muestra',
  'antibioticos': 'Antibióticos',
  'bacterias': 'Bacterias',
  'reflex-tests': 'Reflex Tests',
  'reflex-condicionales': 'Reflex Condicionales',
  'rangos-interpretacion': 'Rangos de Interpretación',
  // Laboratorio otros
  'muestras-referidas': 'Muestras Referidas',
  'alicuotas': 'Alícuotas',
  'metas-areas': 'Metas por Áreas',
  'mesas-trabajo': 'Mesas de Trabajo (Microbiología)',
  'cultivos-positivos': 'Búsqueda de Cultivos Positivos',
  'manifiestos': 'Manifiestos',
  'listas-trabajo': 'Listas de Trabajo',
  'analizadores': 'Analizadores',
  'analizadores-instalados': 'Analizadores Instalados',
  'control-calidad': 'Control de Calidad',
  'autovalidacion-reglas': 'Definición de Reglas (Autovalidación)',
  'autovalidacion-reportes': 'Reportes de Comportamiento',
  // Resultados
  'resultados': 'Ingreso de Resultados',
  // Pacientes
  'pacientes-lista': 'Lista de Pacientes',
  // Caja
  'caja-actual': 'Caja Actual',
  'conteo-caja': 'Conteo de Caja',
  'lista-cajas': 'Lista de Cajas',
  // Facturación
  'clientes': 'Clientes',
  'contratos': 'Contratos',
  'lista-precios': 'Lista de Precios',
  'historial-ots-cliente': 'Historial OTs por Cliente',
  'cuentas-cobrar': 'Cuentas por Cobrar',
  'libro-ventas': 'Libro de Ventas',
  // Reportes
  'dashboard': 'Dashboard',
  'reportes-ot': 'Reportes de Órdenes de Trabajo',
  'reportes-area': 'Reportes de Área',
  'pruebas-realizadas': 'Pruebas Realizadas',
  'tat': 'TAT (Turnaround Time)',
  'pruebas-entregadas': 'Pruebas Entregadas',
  'pendientes-area': 'Pendientes por Área',
  'productividad': 'Productividad',
  // Administración
  'analistas': 'Analistas de Laboratorio',
  'doctores': 'Doctores',
  'usuarios-generales': 'Usuarios Generales',
  'usuarios-clientes': 'Usuarios Clientes',
  'areas': 'Áreas',
  'departamentos': 'Departamentos',
  'procedencias': 'Procedencias',
  'servicios-medicos': 'Servicios Médicos',
  'config-email': 'Configuración de Email',
  'parametros': 'Parámetros Generales',
  'permisos-roles': 'Permisos por Roles',
  'bancos': 'Bancos',
  'puntos-venta': 'Puntos de Venta',
  'tipos-pago': 'Tipos de Pago',
  'dias-feriados': 'Días Feriados',
  'turnos': 'Turnos',
  'incidencias': 'Incidencias',
}

export default function EnConstruccion() {
  const { seccion } = useParams()
  const navigate = useNavigate()
  const label = LABELS[seccion] || seccion || 'Página'

  return (
    <div className="ec-page" data-dev-status="en-construccion" data-dev-label={label}>
      <div className="ec-card">
        <div className="ec-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--gold, #f59e0b)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
            <path d="M17 18h1" /><path d="M12 18h1" /><path d="M7 18h1" />
          </svg>
        </div>
        <h2 className="ec-title">{label}</h2>
        <p className="ec-subtitle">Esta pantalla está en construcción</p>
        <span className="ec-badge">EN CONSTRUCCIÓN</span>
        <button className="ec-back" onClick={() => navigate('/ordenes')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver a Órdenes
        </button>
      </div>
    </div>
  )
}

export { LABELS as EN_CONSTRUCCION_LABELS }
