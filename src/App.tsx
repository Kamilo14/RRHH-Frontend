import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider as OidcProvider } from 'react-oidc-context'
import { AuthProvider } from './context/AuthContext'
import { TenantProvider } from './context/TenantContext'
import { oidcConfig } from './config/oidcConfig'
// import ProtectedRoute from './routes/ProtectedRoute'
import Login from './pages/usuarios/login'
import Dashboard from './pages/usuarios/admin/dashboard/Dashboard'

function App() {
  return (
    <BrowserRouter>
      <OidcProvider {...oidcConfig}>
        <AuthProvider>
          <TenantProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/admin/dashboard"
                element={
                  // <ProtectedRoute>
                    <Dashboard />
                  // </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </TenantProvider>
        </AuthProvider>
      </OidcProvider>
    </BrowserRouter>
  )
}

export default App
