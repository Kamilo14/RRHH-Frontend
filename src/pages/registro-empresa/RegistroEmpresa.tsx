import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import '../../styles/login.css'
import { registrarEmpresa, type RegistrarEmpresaData } from '../../services/identityService'
import { getToken } from '../../services/tokenStorage'

type CampoTexto = Exclude<keyof RegistrarEmpresaData, 'aceptaTerminos'>

interface Campo {
  id: CampoTexto
  label: string
  type?: string
  obligatorio: boolean
  autoComplete?: string
}

const CAMPOS: Campo[] = [
  { id: 'razonSocial', label: 'Razón social', obligatorio: true, autoComplete: 'organization' },
  { id: 'nombreFantasia', label: 'Nombre de fantasía', obligatorio: true },
  { id: 'rutEmpresa', label: 'RUT de la empresa', obligatorio: true },
  { id: 'giro', label: 'Giro', obligatorio: true },
  { id: 'codigoActividad', label: 'Código de actividad', obligatorio: false },
  { id: 'direccionCalle', label: 'Calle', obligatorio: true, autoComplete: 'address-line1' },
  { id: 'direccionNumero', label: 'Número', obligatorio: true },
  { id: 'comuna', label: 'Comuna', obligatorio: true, autoComplete: 'address-level2' },
  { id: 'region', label: 'Región', obligatorio: true, autoComplete: 'address-level1' },
  { id: 'emailContacto', label: 'Correo de contacto', type: 'email', obligatorio: true, autoComplete: 'email' },
  { id: 'telefonoContacto', label: 'Teléfono de contacto', type: 'tel', obligatorio: false, autoComplete: 'tel' },
  { id: 'representanteNombre', label: 'Nombre del representante legal', obligatorio: true },
  { id: 'representanteRut', label: 'RUT del representante legal', obligatorio: true },
]

const VACIO: Record<CampoTexto, string> = {
  razonSocial: '',
  nombreFantasia: '',
  rutEmpresa: '',
  giro: '',
  codigoActividad: '',
  direccionCalle: '',
  direccionNumero: '',
  comuna: '',
  region: '',
  emailContacto: '',
  telefonoContacto: '',
  representanteNombre: '',
  representanteRut: '',
}

/** Formulario de registro de empresa (S1) para quien vuelve de Google sin empresa. */
function RegistroEmpresa() {
  const navigate = useNavigate()
  const [valores, setValores] = useState<Record<CampoTexto, string>>(VACIO)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [empresaEnRevision, setEmpresaEnRevision] = useState<string | null>(null)

  if (!getToken()) return <Navigate to="/login" replace />

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const faltantes = CAMPOS.filter((campo) => campo.obligatorio && !valores[campo.id].trim())
    if (faltantes.length > 0) {
      setError(`Completa los campos obligatorios: ${faltantes.map((campo) => campo.label).join(', ')}.`)
      return
    }
    if (!aceptaTerminos) {
      setError('Debes aceptar los Términos y Condiciones para registrar tu empresa.')
      return
    }

    const datos = Object.fromEntries(
      Object.entries(valores).map(([clave, valor]) => [clave, valor.trim()]),
    ) as Record<CampoTexto, string>

    setEnviando(true)
    void registrarEmpresa({ ...datos, aceptaTerminos: true })
      .then((tenant) => setEmpresaEnRevision(tenant.nombreEmpresa || datos.nombreFantasia))
      .catch((registroError) => setError(registroError instanceof Error && registroError.message
        ? registroError.message
        : 'No se pudo registrar la empresa.'))
      .finally(() => setEnviando(false))
  }

  if (empresaEnRevision) {
    return (
      <main className="login-page-wrapper">
        <section className="login-card-container login-pending-card">
          <div className="login-form-static">
            <h2 className="form-title">Empresa registrada</h2>
            <p className="form-subtitle">Tu empresa {empresaEnRevision} está en revisión</p>
            <button type="button" className="btn-primary" onClick={() => navigate('/login', { replace: true })}>
              Volver al inicio
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="login-page-wrapper">
      <section className="login-card-container">
        <form onSubmit={handleSubmit} className="login-form-static" noValidate>
          <h2 className="form-title">Registrar mi empresa</h2>
          <span className="form-subtitle">
            Quedarás como SuperAdmin de tu empresa cuando la plataforma la active.
          </span>
          {error && <div className="login-error" role="alert">{error}</div>}
          {CAMPOS.map((campo) => (
            <div className="input-group" key={campo.id}>
              <label htmlFor={campo.id}>{campo.label}</label>
              <input
                id={campo.id}
                type={campo.type ?? 'text'}
                value={valores[campo.id]}
                onChange={(event) => setValores((actual) => ({ ...actual, [campo.id]: event.target.value }))}
                autoComplete={campo.autoComplete}
                required={campo.obligatorio}
              />
            </div>
          ))}
          <div className="input-group">
            <label htmlFor="aceptaTerminos">
              <input
                id="aceptaTerminos"
                type="checkbox"
                style={{ width: 'auto' }}
                checked={aceptaTerminos}
                onChange={(event) => setAceptaTerminos(event.target.checked)}
              />{' '}
              Acepto los Términos y Condiciones y la Política de Privacidad
            </label>
          </div>
          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? 'Registrando empresa...' : 'Registrar empresa'}
          </button>
          <button type="button" className="login-mode-link" onClick={() => navigate('/login', { replace: true })}>
            Volver al inicio de sesión
          </button>
        </form>
      </section>
    </main>
  )
}

export default RegistroEmpresa
