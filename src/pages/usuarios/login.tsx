import { useState, type FormEvent } from 'react'
import '../../styles/login.css'

function Login() {
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
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
          <span className="form-subtitle">Ingresa los datos de tu empresa y tus credenciales</span>

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
            />
          </div>

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
            />
          </div>

          <a href="#" className="forgot-pass" onClick={(event) => event.preventDefault()}>
            ¿Olvidaste tu contraseña?
          </a>
          <button type="submit" className="btn-primary">Ingresar</button>
        </form>
      </div>
    </main>
  )
}

export default Login
