import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { canAccessAnyDashboard, normalizeRole } from '../security/accessControl'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) return <div className="admin-panel__empty">Cargando sesión…</div>
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />

  const role = normalizeRole(user?.role)
  const allowed = !allowedRoles || allowedRoles.map(normalizeRole).includes(role)
  if (!allowed || !canAccessAnyDashboard(role)) return <Navigate to="/unauthorized" replace />

  return children
}
