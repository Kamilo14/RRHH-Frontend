import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../styles/login.css'
import { useAuth } from '../../context/AuthContext'
import {
  CognitoAuthError,
  completeNewPassword,
  persistLogin,
  signInWithPassword,
  type NewPasswordChallenge,
} from '../../services/cognitoAuth'
import { resolverEmpresa } from '../../services/identityService'
import { clearAuth } from '../../services/httpClient'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [challenge, setChallenge] = useState<NewPasswordChallenge | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const enter = async (tokens: Awaited<ReturnType<typeof completeNewPassword>>, slug: string) => {
    persistLogin(tokens, slug)
    try {
      await login()
    } catch (err) {
      clearAuth()
      throw err
    }
    navigate('/admin/dashboard')
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const empresa = await resolverEmpresa(company.trim())
      if (challenge) {
        const tokens = await completeNewPassword(challenge.username, challenge.session, newPassword)
        await enter(tokens, empresa.slug)
        return
      }
      const result = await signInWithPassword(email.trim(), password)
      if ('challenge' in result) {
        setChallenge(result)
        return
      }
      await enter(result, empresa.slug)
    } catch (err) {
      setError(err instanceof CognitoAuthError || err instanceof Error ? err.message : 'No se pudo ingresar.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page-wrapper">
      <div className="login-card-container">
        <section className="login-branding">
          <h1>Gestión de Recursos Humanos</h1>
          <p>Centraliza la información de tus trabajadores y administra tu empresa de forma segura.</p>

          <ul className="branding-features">
            <li>Gestión centralizada de trabajadores</li>
            <li>Asistencia, contratos y ausencias</li>
            <li>Acceso seguro por roles y empresa</li>
          </ul>
        </section>

        <form onSubmit={handleLogin} className="login-form-static">
          <h2 className="form-title">Acceso a RRHH</h2>
          <span className="form-subtitle">
            {challenge ? 'Define una contraseña nueva para continuar' : 'Ingresa los datos de tu empresa y tus credenciales'}
          </span>

          {error && <div className="login-error" role="alert">{error}</div>}

          <div className="input-group">
            <label htmlFor="company">Empresa</label>
            <input
              id="company"
              type="text"
              placeholder="Nombre de la empresa"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              required
              disabled={submitting || !!challenge}
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              placeholder="correo@empresa.cl"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={submitting || !!challenge}
            />
          </div>

          {challenge ? (
            <div className="input-group">
              <label htmlFor="new-password">Nueva contraseña</label>
              <input
                id="new-password"
                type="password"
                placeholder="Nueva contraseña"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                required
                disabled={submitting}
              />
            </div>
          ) : (
            <div className="input-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                disabled={submitting}
              />
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Ingresando…' : challenge ? 'Guardar contraseña' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default Login
