import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth as useOidcAuth } from 'react-oidc-context'
import '../../styles/login.css'
import { getMe, solicitarAcceso } from '../../services/identityService'
import { clearAuth, saveAuth } from '../../services/httpClient'
import { authenticate, confirmSignUp, signUp, type NewPasswordChallenge } from '../../services/cognitoAuth'

type AuthMode = 'login' | 'register' | 'new-password'

function dashboardForRole(): string {
  return '/admin/dashboard'
}

function Login() {
  const navigate = useNavigate()
  const oidcAuth = useOidcAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [company, setCompany] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [confirmationPending, setConfirmationPending] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('')
  const [newPasswordChallenge, setNewPasswordChallenge] = useState<NewPasswordChallenge | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isCognitoLoading, setIsCognitoLoading] = useState(false)

  useEffect(() => {
    const savedMode = sessionStorage.getItem('rrhh_google_mode')
    if (savedMode === 'register') setMode('register')
  }, [])

  useEffect(() => {
    let cancelled = false

    const finishGoogleLogin = async () => {
      if (oidcAuth.isLoading || !oidcAuth.user?.id_token || cancelled) return

      try {
        if (oidcAuth.error) throw oidcAuth.error
        const flowMode = sessionStorage.getItem('rrhh_google_mode') as AuthMode | null
        const tenantSlug = sessionStorage.getItem('rrhh_google_tenant_slug')
        saveAuth(oidcAuth.user.id_token, tenantSlug || '')

        if (flowMode === 'register') {
          if (!tenantSlug) throw new Error('Debes indicar la empresa para solicitar el registro.')
          await solicitarAcceso({ tenantSlug })
          clearAuth()
          await oidcAuth.removeUser()
          sessionStorage.removeItem('rrhh_google_mode')
          sessionStorage.removeItem('rrhh_google_tenant_slug')
          if (!cancelled) setPending(true)
          return
        }

        const user = await getMe()
        if (user.pendiente || user.estado === 'PENDIENTE' || !user.tenantId) {
          clearAuth()
          await oidcAuth.removeUser()
          if (!cancelled) setPending(true)
          return
        }

        saveAuth(oidcAuth.user.id_token, user.tenantSlug || '')
        sessionStorage.removeItem('rrhh_google_mode')
        if (!cancelled) navigate(dashboardForRole(), { replace: true })
      } catch (oauthError) {
        clearAuth()
        if (!cancelled) {
          setError(oauthError instanceof Error ? oauthError.message : 'No se pudo completar la autenticación.')
        }
      }
    }

    void finishGoogleLogin()
    return () => { cancelled = true }
  }, [navigate, oidcAuth.error, oidcAuth.isLoading, oidcAuth.user, oidcAuth.removeUser])

  const handleGoogle = async () => {
    setError('')
    if (mode === 'register' && !company.trim()) {
      setError('Ingresa la empresa para enviar la solicitud de registro.')
      return
    }
    setIsGoogleLoading(true)
    sessionStorage.setItem('rrhh_google_mode', mode)
    if (mode === 'register') {
      sessionStorage.setItem('rrhh_google_tenant_slug', company.trim())
    } else {
      sessionStorage.removeItem('rrhh_google_tenant_slug')
    }
    try {
      await oidcAuth.signinRedirect({ extraQueryParams: { identity_provider: 'Google' } })
    } catch (oauthError) {
      sessionStorage.removeItem('rrhh_google_mode')
      sessionStorage.removeItem('rrhh_google_tenant_slug')
      setIsGoogleLoading(false)
      setError(oauthError instanceof Error ? oauthError.message : 'No se pudo iniciar sesión con Google.')
    }
  }

  const handlePasswordLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.')
      return
    }

    setIsCognitoLoading(true)
    void authenticate(email.trim(), password)
      .then(async (result) => {
        if (result.kind === 'new-password') {
          setNewPasswordChallenge(result.challenge)
          setMode('new-password')
          setIsCognitoLoading(false)
          return
        }
        const token = result.token
        saveAuth(token, '')
        const user = await getMe()
        if (user.pendiente || user.estado !== 'ACTIVO' || !user.tenantId) {
          clearAuth()
          setPending(true)
          return
        }
        saveAuth(token, user.tenantSlug || '')
        navigate(dashboardForRole(), { replace: true })
      })
      .catch((cognitoError) => {
      setIsCognitoLoading(false)
      setError(cognitoError instanceof Error
        ? cognitoError.message || 'Cognito rechazó las credenciales.'
        : 'No se pudo iniciar el acceso con Cognito.')
      })
  }

  const handleNewPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!newPassword || !newPasswordConfirmation) {
      setError('Ingresa y confirma tu nueva contraseña.')
      return
    }
    if (newPassword !== newPasswordConfirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!newPasswordChallenge) {
      setError('La sesión de cambio de contraseña expiró. Inicia sesión nuevamente.')
      setMode('login')
      return
    }

    setIsCognitoLoading(true)
    void newPasswordChallenge.complete(newPassword)
      .then(async (token) => {
        saveAuth(token, '')
        const user = await getMe()
        if (user.pendiente || user.estado !== 'ACTIVO' || !user.tenantId) {
          clearAuth()
          setPending(true)
          return
        }
        saveAuth(token, user.tenantSlug || '')
        navigate(dashboardForRole(), { replace: true })
      })
      .catch((cognitoError) => {
        setError(cognitoError instanceof Error
          ? cognitoError.message || 'Cognito no pudo establecer la nueva contraseña.'
          : 'No se pudo establecer la nueva contraseña.')
      })
      .finally(() => setIsCognitoLoading(false))
  }

  const handleNativeRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!company.trim() || !name.trim() || !email.trim() || !password) {
      setError('Completa empresa, nombre, correo y contraseña.')
      return
    }
    setIsCognitoLoading(true)
    void signUp({
      email: email.trim(),
      password,
      name: name.trim(),
      phone,
    }).then(() => {
      setConfirmationPending(true)
      setIsCognitoLoading(false)
    }).catch((cognitoError) => {
      setIsCognitoLoading(false)
      setError(cognitoError instanceof Error ? cognitoError.message : 'No se pudo crear la cuenta en Cognito.')
    })
  }

  const handleConfirmation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!confirmationCode.trim()) {
      setError('Ingresa el código enviado por Cognito.')
      return
    }
    setIsCognitoLoading(true)
    void confirmSignUp(email.trim(), confirmationCode.trim())
      .then(() => authenticate(email.trim(), password))
      .then(async (result) => {
        if (result.kind === 'new-password') {
          setNewPasswordChallenge(result.challenge)
          setConfirmationPending(false)
          setMode('new-password')
          return
        }
        const token = result.token
        saveAuth(token, '')
        await solicitarAcceso({ tenantSlug: company.trim() })
        clearAuth()
        setPending(true)
      })
      .catch((cognitoError) => {
        setError(cognitoError instanceof Error ? cognitoError.message : 'No se pudo confirmar la cuenta.')
      })
      .finally(() => setIsCognitoLoading(false))
  }

  if (pending) {

    return (
      <main className="login-page-wrapper">
        <section className="login-card-container login-pending-card">
          <div className="login-form-static">
            <h2 className="form-title">Solicitud pendiente</h2>
            <p className="form-subtitle">
              Tu solicitud quedó registrada. Debes comunicarte con el Administrador de RRHH de tu empresa
              para que revise y acepte tu acceso.
            </p>
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              Volver al inicio
            </button>
          </div>
        </section>
      </main>
    )
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
        <form onSubmit={confirmationPending ? handleConfirmation : mode === 'register' ? handleNativeRegister : mode === 'new-password' ? handleNewPassword : handlePasswordLogin} className="login-form-static">
          <h2 className="form-title">{mode === 'register' ? 'Crear acceso' : mode === 'new-password' ? 'Cambia tu contraseña' : 'Acceso a RRHH'}</h2>
          <span className="form-subtitle">
            {confirmationPending
              ? 'Confirma el código enviado a tu correo'
              : mode === 'register'
                ? 'Crea tu cuenta y solicita acceso a una empresa'
                : mode === 'new-password'
                  ? 'Por seguridad, establece una contraseña permanente para continuar'
                  : 'Ingresa con tu cuenta registrada'}
          </span>
          {error && <div className="login-error" role="alert">{error}</div>}
          {mode === 'new-password' ? (
            <>
              <div className="input-group">
                <label htmlFor="newPassword">Nueva contraseña</label>
                <input id="newPassword" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required />
              </div>
              <div className="input-group">
                <label htmlFor="newPasswordConfirmation">Confirmar nueva contraseña</label>
                <input id="newPasswordConfirmation" type="password" value={newPasswordConfirmation} onChange={(event) => setNewPasswordConfirmation(event.target.value)} autoComplete="new-password" required />
              </div>
              <button type="submit" className="btn-primary" disabled={isCognitoLoading}>
                {isCognitoLoading ? 'Guardando contraseña...' : 'Guardar contraseña y continuar'}
              </button>
            </>
          ) : confirmationPending ? (
            <div className="input-group">
              <label htmlFor="confirmationCode">Código de confirmación</label>
              <input id="confirmationCode" type="text" value={confirmationCode} onChange={(event) => setConfirmationCode(event.target.value)} autoComplete="one-time-code" required />
            </div>
          ) : mode === 'register' && (
            <div className="input-group">
              <label htmlFor="company">Empresa</label>
              <input id="company" type="text" placeholder="Nombre o identificador de la empresa" value={company} onChange={(event) => setCompany(event.target.value)} />
            </div>
          )}
          {!confirmationPending && mode === 'register' && (
            <>
              <div className="input-group">
                <label htmlFor="name">Nombre completo</label>
                <input id="name" type="text" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div className="input-group">
                <label htmlFor="email">Correo</label>
                <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
              </div>
              <div className="input-group">
                <label htmlFor="phone">Celular</label>
                <input id="phone" type="tel" placeholder="+56912345678" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
              </div>
              <div className="input-group">
                <label htmlFor="password">Contraseña</label>
                <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
              </div>
              <button type="submit" className="btn-primary" disabled={isCognitoLoading}>
                {isCognitoLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </>
          )}
          {!confirmationPending && mode === 'login' && (
            <>
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
              <button type="submit" className="btn-primary" disabled={isCognitoLoading}>
                {isCognitoLoading ? 'Conectando con Cognito...' : 'Ingresar'}
              </button>
              <a href="#" className="forgot-pass" onClick={(event) => event.preventDefault()}>
                ¿Olvidaste tu contraseña?
              </a>
              <div className="login-divider" aria-hidden="true">
                <span>o</span>
              </div>
            </>
          )}
          {!confirmationPending && mode !== 'new-password' && (
            <>
              <button type="button" className="btn-google" onClick={() => void handleGoogle()} disabled={isGoogleLoading}>
                <span className="google-mark" aria-hidden="true">G</span>
                {isGoogleLoading ? 'Conectando con Google...' : 'Continuar con Google'}
              </button>
              <button type="button" className="login-mode-link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
                {mode === 'login' ? '¿No tienes acceso? Solicita registro' : 'Ya tengo una cuenta: iniciar sesión'}
              </button>
            </>
          )}
        </form>
      </div>
    </main>
  )
}

export default Login
