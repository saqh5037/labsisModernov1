import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import AppNavbar from './AppNavbar'
import AppFooter from './AppFooter'
import { useAuth } from '../context/AuthContext'

const PRINT_PATTERNS = ['/print', '/etiqueta', '/recibo', '/instrucciones', '/preguntas']

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()

  // Print pages: render without layout
  if (PRINT_PATTERNS.some(p => location.pathname.includes(p))) {
    return <Outlet />
  }

  return (
    <div className="app-layout">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRoles={user?.roles || []}
      />
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <div className="app-layout-main">
        <AppNavbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <main className="app-layout-content">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
