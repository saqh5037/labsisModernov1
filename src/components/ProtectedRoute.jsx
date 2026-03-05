import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requiredPermission }) {
  const { isAuthenticated, loading, hasPermission } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-page, #f8faff)' }}>
        <div className="login-spinner" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-page, #f8faff)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-2)' }}>
          <h2>Sin permisos</h2>
          <p>No tienes acceso a esta sección.</p>
        </div>
      </div>
    )
  }

  return children
}
