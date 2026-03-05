import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import './App.css'
import Ordenes from './pages/Ordenes'
import OrdenDetallePage from './pages/OrdenDetallePage'
import OrdenLabPlaceholder from './pages/OrdenLabPlaceholder'
import OrdenLabPage from './pages/OrdenLabPage'
import PrintOrdenTrabajo from './pages/PrintOrdenTrabajo'
import PrintEtiqueta from './pages/PrintEtiqueta'
import PrintReciboCredito from './pages/PrintReciboCredito'
import PrintInstrucciones from './pages/PrintInstrucciones'
import PrintPreguntas from './pages/PrintPreguntas'
import PacienteListPage from './pages/PacienteListPage'
import PacienteDetallePage from './pages/PacienteDetallePage'
import PacienteEditPage from './pages/PacienteEditPage'
import OTEditPage from './pages/OTEditPage'
import FacturaCobro from './pages/FacturaCobro'
// /validacion now uses OrdenLabPage in validation mode (no separate page)
import DevDashboard from './pages/DevDashboard'
import DevScreenDetail from './pages/DevScreenDetail'
import DevArchitecture from './pages/DevArchitecture'
import DevProcess from './pages/DevProcess'
import DevDocs from './pages/DevDocs'
import DevBrand from './pages/DevBrand'
import DevAudit from './pages/DevAudit'
import QADashboardPage from './pages/QADashboardPage'
import QASuiteListPage from './pages/QASuiteListPage'
import QASuiteDetailPage from './pages/QASuiteDetailPage'
import QARunPage from './pages/QARunPage'
import QARunListPage from './pages/QARunListPage'
import QABugListPage from './pages/QABugListPage'
import QABugDetailPage from './pages/QABugDetailPage'
import QATeamPage from './pages/QATeamPage'
import QAMobileRunPage from './pages/QAMobileRunPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            <Route path="/pacientes" element={<PacienteListPage />} />
            <Route path="/pacientes/nuevo" element={<PacienteEditPage />} />
            <Route path="/pacientes/:id" element={<PacienteDetallePage />} />
            <Route path="/pacientes/:id/editar" element={<PacienteEditPage />} />
            <Route path="/validacion" element={<OrdenLabPage />} />

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
      </AuthProvider>
    </BrowserRouter>
  )
}
