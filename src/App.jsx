import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

/* ── Eager: core routes ── */
import LoginPage from './pages/LoginPage'
import Ordenes from './pages/Ordenes'
import OrdenDetallePage from './pages/OrdenDetallePage'
import OrdenLabPage from './pages/OrdenLabPage'
import OTEditPage from './pages/OTEditPage'
import FacturaCobro from './pages/FacturaCobro'

/* ── Lazy: print pages ── */
const PrintOrdenTrabajo = lazy(() => import('./pages/PrintOrdenTrabajo'))
const PrintEtiqueta = lazy(() => import('./pages/PrintEtiqueta'))
const PrintReciboCredito = lazy(() => import('./pages/PrintReciboCredito'))
const PrintInstrucciones = lazy(() => import('./pages/PrintInstrucciones'))
const PrintPreguntas = lazy(() => import('./pages/PrintPreguntas'))
const PrintResultados = lazy(() => import('./pages/PrintResultados'))

/* ── Lazy: pacientes ── */
const PacienteListPage = lazy(() => import('./pages/PacienteListPage'))
const PacienteDetallePage = lazy(() => import('./pages/PacienteDetallePage'))
const PacienteEditPage = lazy(() => import('./pages/PacienteEditPage'))

/* ── Lazy: trazabilidad ── */
const TrazabilidadPage = lazy(() => import('./pages/TrazabilidadPage'))
const TrazabilidadScanPage = lazy(() => import('./pages/TrazabilidadScanPage'))
const CheckPointList = lazy(() => import('./pages/CheckPointList'))
const CheckPointEdit = lazy(() => import('./pages/CheckPointEdit'))

/* ── Lazy: QA pages ── */
const QADashboardPage = lazy(() => import('./pages/QADashboardPage'))
const QASuiteListPage = lazy(() => import('./pages/QASuiteListPage'))
const QASuiteDetailPage = lazy(() => import('./pages/QASuiteDetailPage'))
const QARunPage = lazy(() => import('./pages/QARunPage'))
const QARunListPage = lazy(() => import('./pages/QARunListPage'))
const QABugListPage = lazy(() => import('./pages/QABugListPage'))
const QABugDetailPage = lazy(() => import('./pages/QABugDetailPage'))
const QATeamPage = lazy(() => import('./pages/QATeamPage'))
const QAMobileRunPage = lazy(() => import('./pages/QAMobileRunPage'))

/* ── Lazy: dev pages ── */
const DevDashboard = lazy(() => import('./pages/DevDashboard'))
const DevScreenDetail = lazy(() => import('./pages/DevScreenDetail'))
const DevArchitecture = lazy(() => import('./pages/DevArchitecture'))
const DevProcess = lazy(() => import('./pages/DevProcess'))
const DevDocs = lazy(() => import('./pages/DevDocs'))
const DevBrand = lazy(() => import('./pages/DevBrand'))
const DevAudit = lazy(() => import('./pages/DevAudit'))

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
    <div className="spinner" />
  </div>
)

export default function App() {
  return (
    <BrowserRouter basename={window.location.pathname.startsWith('/labsis') ? '/labsis' : '/'}>
      <AuthProvider>
        <ErrorBoundary>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/ordenes" element={<Ordenes />} />
                <Route path="/ordenes/crear" element={<OTEditPage />} />
                <Route path="/ordenes/:numero" element={<OrdenDetallePage />} />
                <Route path="/ordenes/:numero/lab" element={<OrdenLabPage />} />
                <Route path="/ordenes/:numero/editar" element={<OTEditPage />} />
                <Route path="/ordenes/:numero/cobro" element={<FacturaCobro />} />
                <Route path="/ordenes/:numero/print" element={<PrintOrdenTrabajo />} />
                <Route path="/ordenes/:numero/etiqueta" element={<PrintEtiqueta />} />
                <Route path="/ordenes/:numero/recibo" element={<PrintReciboCredito />} />
                <Route path="/ordenes/:numero/instrucciones" element={<PrintInstrucciones />} />
                <Route path="/ordenes/:numero/preguntas" element={<PrintPreguntas />} />
                <Route path="/ordenes/:numero/resultados" element={<PrintResultados />} />
                <Route path="/pacientes" element={<PacienteListPage />} />
                <Route path="/pacientes/nuevo" element={<PacienteEditPage />} />
                <Route path="/pacientes/:id" element={<PacienteDetallePage />} />
                <Route path="/pacientes/:id/editar" element={<PacienteEditPage />} />
                <Route path="/analizar" element={<OrdenLabPage mode="analizar" />} />
                <Route path="/validacion" element={<OrdenLabPage />} />
                <Route path="/trazabilidad" element={<TrazabilidadPage />} />
                <Route path="/trazabilidad/:checkpointId" element={<TrazabilidadScanPage />} />
                <Route path="/admin/checkpoints" element={<CheckPointList />} />
                <Route path="/admin/checkpoints/new" element={<CheckPointEdit />} />
                <Route path="/admin/checkpoints/:id/edit" element={<CheckPointEdit />} />
              </Route>
              <Route path="/qa" element={<QADashboardPage />} />
              <Route path="/qa/suites" element={<QASuiteListPage />} />
              <Route path="/qa/suites/:id" element={<QASuiteDetailPage />} />
              <Route path="/qa/runs" element={<QARunListPage />} />
              <Route path="/qa/runs/:id" element={<QARunPage />} />
              <Route path="/qa/bugs" element={<QABugListPage />} />
              <Route path="/qa/bugs/:id" element={<QABugDetailPage />} />
              <Route path="/qa/team" element={<QATeamPage />} />
              <Route path="/qa/mobile/:token" element={<QAMobileRunPage />} />
              <Route path="/dev" element={<DevDashboard />} />
              <Route path="/dev/screen/:id" element={<DevScreenDetail />} />
              <Route path="/dev/arch" element={<DevArchitecture />} />
              <Route path="/dev/process" element={<DevProcess />} />
              <Route path="/dev/docs" element={<DevDocs />} />
              <Route path="/dev/brand" element={<DevBrand />} />
              <Route path="/dev/audit" element={<DevAudit />} />
              <Route path="*" element={<Navigate to="/ordenes" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}
