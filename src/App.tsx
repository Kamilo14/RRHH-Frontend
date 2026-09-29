import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TenantProvider } from './context/TenantContext'
// import ProtectedRoute from './routes/ProtectedRoute'
import Login from './pages/usuarios/login'
import Dashboard from './pages/usuarios/admin/dashboard/Dashboard'

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  )
}

export default App
