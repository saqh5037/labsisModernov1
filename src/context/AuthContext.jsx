import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const API = (window.location.pathname.startsWith('/labsis') ? '/labsis' : '') + '/api'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [permisos, setPermisos] = useState({})
  const [bioanalistaAreas, setBioanalistaAreas] = useState([])
  const [loading, setLoading] = useState(true)

  // Revalidar sesión al montar (cookie httpOnly se envía automáticamente)
  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setUser(data.user)
        setPermisos(data.permisos || {})
        setBioanalistaAreas(data.bioanalistaAreas || [])
      })
      .catch(() => {
        setUser(null)
        setPermisos({})
        setBioanalistaAreas([])
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error de conexión' }))
      throw new Error(err.error || 'Error al iniciar sesión')
    }
    const data = await res.json()
    setUser(data.user)
    // Cargar permisos
    try {
      const meRes = await fetch(`${API}/auth/me`, { credentials: 'include' })
      if (meRes.ok) {
        const meData = await meRes.json()
        setPermisos(meData.permisos || {})
        setBioanalistaAreas(meData.bioanalistaAreas || [])
      }
    } catch { /* permisos se cargan lazy */ }
    return data.user
  }, [])

  const logout = useCallback(async () => {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' })
    setUser(null)
    setPermisos({})
  }, [])

  /**
   * Evalúa si el usuario tiene permiso para una actividad.
   * Replica la lógica Java: modulo check → actividad check → default deny
   */
  const hasPermission = useCallback((identificador) => {
    if (!user) return false
    const userRoles = user.roles || []

    // Buscar la actividad en todos los módulos
    for (const mod of Object.values(permisos)) {
      const act = mod.actividades?.[identificador]
      if (!act) continue

      // 1. Check módulo: deny
      if (mod.todosNoAcceso) return false
      if (mod.rolesNoAcceso?.some(r => userRoles.includes(r))) return false

      // 2. Check actividad: deny
      if (act.todosNoAcceso) return false
      if (act.rolesNoAcceso?.some(r => userRoles.includes(r))) return false

      // 3. Check módulo: allow
      if (mod.todosAcceso) {
        // 4. Check actividad restrictions
        if (act.todosAcceso) return true
        if (act.rolesAcceso?.length > 0) return act.rolesAcceso.some(r => userRoles.includes(r))
        return true // modulo permite todos, actividad sin restricción
      }
      if (mod.rolesAcceso?.some(r => userRoles.includes(r))) {
        if (act.todosAcceso) return true
        if (act.rolesAcceso?.length > 0) return act.rolesAcceso.some(r => userRoles.includes(r))
        return true
      }

      // 5. Default deny
      return false
    }

    return false // actividad no encontrada
  }, [user, permisos])

  const hasRole = useCallback((...roles) => {
    if (!user) return false
    const userRoles = user.roles || []
    return roles.some(r => userRoles.includes(r))
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, hasRole, isAuthenticated: !!user, bioanalistaAreas }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
