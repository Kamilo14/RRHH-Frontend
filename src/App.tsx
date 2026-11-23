import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider as OidcProvider } from 'react-oidc-context'
import { AuthProvider } from './context/AuthContext'
import { TenantProvider } from './context/TenantContext'
import { oidcConfig } from './config/oidcConfig'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import Login from './pages/usuarios/login'
import Dashboard from './pages/usuarios/admin/dashboard/Dashboard'
import RegistroEmpresa from './pages/registro-empresa/RegistroEmpresa'
import Plataforma from './pages/plataforma/Plataforma'

function App() {
  return (
    <BrowserRouter>
      <OidcProvider {...oidcConfig}>
        <AuthProvider>
          <TenantProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              {/* Sin ProtectedRoute: quien registra su empresa aún no tiene rol; la página exige token. */}
              <Route path="/registro-empresa" element={<RegistroEmpresa />} />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin de RRHH']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['Jefatura', 'Trabajador']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plataforma"
                element={
                  <ProtectedRoute allowedRoles={['AdminPlataforma', 'OperadorSaaS']}>
                    <Plataforma />
                  </ProtectedRoute>
                }
              />
              <Route path="/unauthorized" element={<Navigate to="/login" replace />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </TenantProvider>
        </AuthProvider>
      </OidcProvider>
    </BrowserRouter>
  )
}

export default App
