import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth as useOidcAuth } from 'react-oidc-context'
import { useAuth as useAppAuth } from '../../context/AuthContext'
import '../../styles/login.css'
import { getMe, resolverEmpresaPorRut, solicitarAcceso, type MeResponse } from '../../services/identityService'
import { clearAuth, saveAuth } from '../../services/httpClient'
import { authenticate, type NewPasswordChallenge } from '../../services/cognitoAuth'
import { dashboardForRole } from '../../security/accessControl'
import { estadoDeAcceso, type EstadoAcceso } from '../../utils/estadoAcceso'
import { necesitaRefrescar } from '../../utils/jwtClaims'

type AuthMode = 'login' | 'unirme' | 'new-password'
type GoogleMode = 'login' | 'unirme' | 'registro-empresa'

const GOOGLE_MODE_KEY = 'rrhh_google_mode'
const GOOGLE_RUT_KEY = 'rrhh_google_rut'
const MENSAJE_REFRESCO = 'Cierra sesión y vuelve a ingresar para actualizar tus permisos'
const MENSAJE_CUENTA_INACTIVA = 'Tu cuenta no está activa. Contacta al área de RRHH de tu empresa.'

const TITULO_ESTADO: Record<Exclude<EstadoAcceso['tipo'], 'activo'>, string> = {
  'no-registrado': 'Cuenta sin empresa',
  'empresa-en-revision': 'Empresa en revisión',
  'solicitud-enviada': 'Solicitud enviada',
  rechazado: 'Solicitud rechazada',
}

function leerGoogleMode(): GoogleMode {
  const valor = sessionStorage.getItem(GOOGLE_MODE_KEY)
  return valor === 'unirme' || valor === 'registro-empresa' ? valor : 'login'
}

function limpiarGoogleSession(): void {
  sessionStorage.removeItem(GOOGLE_MODE_KEY)
  sessionStorage.removeItem(GOOGLE_RUT_KEY)
}

function mensajeDe(error: unknown, porDefecto: string): string {
  return error instanceof Error && error.message ? error.message : porDefecto
}

function Login() {
  const navigate = useNavigate()
  const oidcAuth = useOidcAuth()
  const { refreshUser } = useAppAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rutEmpresa, setRutEmpresa] = useState('')
  const [empresaEncontrada, setEmpresaEncontrada] = useState<string | null>(null)
  const [isResolviendo, setIsResolviendo] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('')
  const [newPasswordChallenge, setNewPasswordChallenge] = useState<NewPasswordChallenge | null>(null)
  const [error, setError] = useState('')
  const [acceso, setAcceso] = useState<EstadoAcceso | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isCognitoLoading, setIsCognitoLoading] = useState(false)
  const procesandoGoogleRef = useRef(false)

  /**
   * Decide qué hacer con la respuesta de `/auth/me`: entrar al dashboard (refrescando el token si
   * sus claims quedaron viejos), ir al registro de empresa o mostrar la pantalla de estado (S7, S8).
   * Devuelve true si navegó fuera del login.
   */
  const completarAcceso = async (
    me: MeResponse,
    token: string,
    refrescar: () => Promise<string | null>,
    googleMode: GoogleMode,
  ): Promise<boolean> => {
    const estado = estadoDeAcceso(me)

    if (estado.tipo === 'no-registrado' && googleMode === 'registro-empresa') {
      saveAuth(token, '')
      navigate('/registro-empresa', { replace: true })
      return true
    }

    if (estado.tipo !== 'activo') {
      clearAuth()
      setAcceso(estado)
      return false
    }

    if (me.estado !== 'ACTIVO') {
      clearAuth()
      setError(MENSAJE_CUENTA_INACTIVA)
      return false
    }

    let vigente = token
    if (necesitaRefrescar(token, me)) {
      const nuevo = await refrescar().catch(() => null)
      if (!nuevo || necesitaRefrescar(nuevo, me)) {
        clearAuth()
        setError(MENSAJE_REFRESCO)
        return false
      }
      vigente = nuevo
    }

    saveAuth(vigente, me.tenantSlug || '')
    await refreshUser()
    navigate(dashboardForRole(me.role), { replace: true })
    return true
  }

  useEffect(() => {
    const idToken = oidcAuth.user?.id_token
    if (oidcAuth.isLoading || !idToken || procesandoGoogleRef.current) return
    procesandoGoogleRef.current = true

    const googleMode = leerGoogleMode()
    const rutGuardado = sessionStorage.getItem(GOOGLE_RUT_KEY)
    limpiarGoogleSession()

    const finishGoogleLogin = async () => {
      try {
        if (oidcAuth.error) throw oidcAuth.error
        saveAuth(idToken, '')

        if (googleMode === 'unirme') {
          if (!rutGuardado) throw new Error('Debes indicar el RUT de tu empresa para solicitar acceso.')
          await solicitarAcceso({ rutEmpresa: rutGuardado })
        }

        const me = await getMe()
        const refrescar = async () => (await oidcAuth.signinSilent())?.id_token ?? null
        const salio = await completarAcceso(me, idToken, refrescar, googleMode)
        if (!salio) await oidcAuth.removeUser()
      } catch (oauthError) {
        clearAuth()
        setError(mensajeDe(oauthError, 'No se pudo completar la autenticación.'))
        await oidcAuth.removeUser().catch(() => undefined)
      } finally {
        procesandoGoogleRef.current = false
      }
    }

    void finishGoogleLogin()
    // completarAcceso se recrea en cada render; el efecto solo debe reaccionar al usuario OIDC.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oidcAuth.isLoading, oidcAuth.user])

  const redirigirAGoogle = async (googleMode: GoogleMode, rut?: string) => {
    setError('')
    setIsGoogleLoading(true)
    sessionStorage.setItem(GOOGLE_MODE_KEY, googleMode)
    if (rut) {
      sessionStorage.setItem(GOOGLE_RUT_KEY, rut)
    } else {
      sessionStorage.removeItem(GOOGLE_RUT_KEY)
    }
    try {
      await oidcAuth.signinRedirect({ extraQueryParams: { identity_provider: 'Google' } })
    } catch (oauthError) {
      limpiarGoogleSession()
      setIsGoogleLoading(false)
      setError(mensajeDe(oauthError, 'No se pudo iniciar sesión con Google.'))
    }
  }

  const irAUnirme = () => {
    setAcceso(null)
    setError('')
    setEmpresaEncontrada(null)
    setMode('unirme')
  }

  const volverAlInicio = () => {
    setAcceso(null)
    setError('')
    setEmpresaEncontrada(null)
    setMode('login')
  }

  const handleBuscarEmpresa = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setEmpresaEncontrada(null)
    const rut = rutEmpresa.trim()
    if (!rut) {
      setError('Ingresa el RUT de tu empresa.')
      return
    }
    setIsResolviendo(true)
    void resolverEmpresaPorRut(rut)
      .then((empresa) => {
        if (!empresa.existe) {
          setError('La empresa no está registrada en el sistema')
          return
        }
        setEmpresaEncontrada(empresa.nombreEmpresa)
      })
      .catch((resolverError) => setError(mensajeDe(resolverError, 'No se pudo buscar la empresa.')))
      .finally(() => setIsResolviendo(false))
  }

  const entrarConToken = async (token: string, refrescar: () => Promise<string | null>) => {
    saveAuth(token, '')
    const me = await getMe()
    await completarAcceso(me, token, refrescar, 'login')
  }

  const handlePasswordLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.')
      return
    }

    const credenciales = { email: email.trim(), password }
    // Una cuenta con contraseña no tiene refresh token de OIDC: refrescar es volver a autenticarse.
    const reautenticar = async () => {
      const result = await authenticate(credenciales.email, credenciales.password)
      return result.kind === 'authenticated' ? result.token : null
    }

    setIsCognitoLoading(true)
    void authenticate(credenciales.email, credenciales.password)
      .then(async (result) => {
        if (result.kind === 'new-password') {
          setNewPasswordChallenge(result.challenge)
          setMode('new-password')
          return
        }
        await entrarConToken(result.token, reautenticar)
      })
      .catch((cognitoError) => {
        clearAuth()
        setError(cognitoError instanceof Error
          ? cognitoError.message || 'Cognito rechazó las credenciales.'
          : 'No se pudo iniciar el acceso con Cognito.')
      })
      .finally(() => setIsCognitoLoading(false))
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

    const credenciales = { email: email.trim(), password: newPassword }
    const reautenticar = async () => {
      const result = await authenticate(credenciales.email, credenciales.password)
      return result.kind === 'authenticated' ? result.token : null
    }

    setIsCognitoLoading(true)
    void newPasswordChallenge.complete(newPassword)
      .then((token) => entrarConToken(token, reautenticar))
      .catch((cognitoError) => {
        clearAuth()
        setError(cognitoError instanceof Error
          ? cognitoError.message || 'Cognito no pudo establecer la nueva contraseña.'
          : 'No se pudo establecer la nueva contraseña.')
      })
      .finally(() => setIsCognitoLoading(false))
  }

  if (acceso && acceso.tipo !== 'activo') {
    return (
      <main className="login-page-wrapper">
        <section className="login-card-container login-pending-card">
          <div className="login-form-static">
            <h2 className="form-title">{TITULO_ESTADO[acceso.tipo]}</h2>
            <p className="form-subtitle">{acceso.texto}</p>
            {acceso.tipo === 'no-registrado' ? (
              <>
                <button type="button" className="btn-primary" onClick={irAUnirme}>
                  Unirme a mi empresa
                </button>
                <button type="button" className="btn-google" onClick={() => void redirigirAGoogle('registro-empresa')} disabled={isGoogleLoading}>
                  Registrar mi empresa
                </button>
              </>
            ) : (
              <button type="button" className="btn-primary" onClick={volverAlInicio}>
                Volver al inicio
              </button>
            )}
          </div>
        </section>
      </main>
    )
  }

  const branding = (
    <section className="login-branding">
      <h1>Gestión de Recursos Humanos</h1>
      <p>Centraliza la información de tus trabajadores y administra tu empresa de forma segura.</p>
      <ul className="branding-features">
        <li>Gestión centralizada de trabajadores</li>
        <li>Asistencia, contratos y ausencias</li>
        <li>Acceso seguro por roles y empresa</li>
      </ul>
    </section>
  )

  if (mode === 'unirme') {
    return (
      <main className="login-page-wrapper">
        <div className="login-card-container">
          {branding}
          <form onSubmit={handleBuscarEmpresa} className="login-form-static" noValidate>
            <h2 className="form-title">Unirme a mi empresa</h2>
            <span className="form-subtitle">Ingresa el RUT de tu empresa para solicitar acceso</span>
            {error && <div className="login-error" role="alert">{error}</div>}
            <div className="input-group">
              <label htmlFor="rutEmpresa">RUT de la empresa</label>
              <input
                id="rutEmpresa"
                type="text"
                placeholder="76.086.428-5"
                value={rutEmpresa}
                onChange={(event) => { setRutEmpresa(event.target.value); setEmpresaEncontrada(null) }}
              />
            </div>
            {empresaEncontrada ? (
              <>
                <p className="form-subtitle">¿Te refieres a {empresaEncontrada}?</p>
                <button type="button" className="btn-google" onClick={() => void redirigirAGoogle('unirme', rutEmpresa.trim())} disabled={isGoogleLoading}>
                  <span className="google-mark" aria-hidden="true">G</span>
                  {isGoogleLoading ? 'Conectando con Google...' : 'Sí, continuar con Google'}
                </button>
                <button type="button" className="login-mode-link" onClick={() => setEmpresaEncontrada(null)}>
                  No, buscar otra empresa
                </button>
              </>
            ) : (
              <button type="submit" className="btn-primary" disabled={isResolviendo}>
                {isResolviendo ? 'Buscando empresa...' : 'Buscar empresa'}
              </button>
            )}
            <button type="button" className="login-mode-link" onClick={volverAlInicio}>
              Volver al inicio de sesión
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="login-page-wrapper">
      <div className="login-card-container">
        {branding}
        <form onSubmit={mode === 'new-password' ? handleNewPassword : handlePasswordLogin} className="login-form-static">
          <h2 className="form-title">{mode === 'new-password' ? 'Cambia tu contraseña' : 'Acceso a RRHH'}</h2>
          <span className="form-subtitle">
            {mode === 'new-password'
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
          ) : (
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
              <button type="button" className="btn-google" onClick={() => void redirigirAGoogle('login')} disabled={isGoogleLoading}>
                <span className="google-mark" aria-hidden="true">G</span>
                {isGoogleLoading ? 'Conectando con Google...' : 'Continuar con Google'}
              </button>
              <div className="login-divider" aria-hidden="true">
                <span>¿Aún no tienes acceso?</span>
              </div>
              <button type="button" className="login-mode-link" onClick={irAUnirme}>
                Unirme a mi empresa
              </button>
              <button type="button" className="login-mode-link" onClick={() => void redirigirAGoogle('registro-empresa')} disabled={isGoogleLoading}>
                Registrar mi empresa
              </button>
            </>
          )}
        </form>
      </div>
    </main>
  )
}

export default Login
