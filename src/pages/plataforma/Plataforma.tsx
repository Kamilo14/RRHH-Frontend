import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  activarEmpresa,
  crearUsuarioPlataforma,
  listarEmpresasPlataforma,
  rechazarEmpresa,
  type CrearUsuarioPlataformaData,
  type TenantResumen,
} from '../../services/identityService'
import { normalizeRole } from '../../security/accessControl'
import '../../styles/trabajadores.css'

type Pestana = 'empresas' | 'usuarios'

const FILTROS_ESTADO: { valor: string; etiqueta: string }[] = [
  { valor: 'PENDIENTE_ACTIVACION', etiqueta: 'Pendientes de activación' },
  { valor: 'ACTIVO', etiqueta: 'Activas' },
  { valor: 'RECHAZADO', etiqueta: 'Rechazadas' },
  { valor: 'SUSPENDIDO', etiqueta: 'Suspendidas' },
  { valor: '', etiqueta: 'Todas' },
]

function mensajeDe(error: unknown, porDefecto: string): string {
  return error instanceof Error && error.message ? error.message : porDefecto
}

/** Consola de plataforma (S2, S6): AdminPlataforma revisa empresas y crea cuentas; OperadorSaaS solo lee. */
function Plataforma() {
  const { user, logout } = useAuth()
  const esAdmin = normalizeRole(user?.role) === 'ADMIN_PLATAFORMA'
  const [pestana, setPestana] = useState<Pestana>('empresas')

  return (
    <main className="trab-page">
      <div className="trab-toolbar">
        <div className="trab-toolbar__left">
          <h1>Consola de plataforma</h1>
        </div>
        <button type="button" className="btn-secondary" onClick={logout}>Cerrar sesión</button>
      </div>
      <div className="trab-filter-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={pestana === 'empresas'}
          className={`trab-filter-tab${pestana === 'empresas' ? ' trab-filter-tab--active' : ''}`}
          onClick={() => setPestana('empresas')}
        >
          Empresas
        </button>
        {esAdmin && (
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'usuarios'}
            className={`trab-filter-tab${pestana === 'usuarios' ? ' trab-filter-tab--active' : ''}`}
            onClick={() => setPestana('usuarios')}
          >
            Usuarios de plataforma
          </button>
        )}
      </div>
      {pestana === 'usuarios' && esAdmin ? <UsuariosPlataforma /> : <Empresas esAdmin={esAdmin} />}
    </main>
  )
}

function Empresas({ esAdmin }: { esAdmin: boolean }) {
  const [estado, setEstado] = useState('PENDIENTE_ACTIVACION')
  const [empresas, setEmpresas] = useState<TenantResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [rechazando, setRechazando] = useState<TenantResumen | null>(null)
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    listarEmpresasPlataforma(estado || undefined)
      .then((lista) => { if (!cancelado) setEmpresas(lista) })
      .catch((listarError) => { if (!cancelado) setError(mensajeDe(listarError, 'No se pudieron cargar las empresas.')) })
      .finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [estado])

  const reemplazar = (actualizada: TenantResumen) => {
    setEmpresas((lista) => lista.map((empresa) => (empresa.id === actualizada.id ? { ...empresa, ...actualizada } : empresa)))
  }

  const activar = (empresa: TenantResumen) => {
    setError('')
    setAviso('')
    setProcesando(empresa.id)
    void activarEmpresa(empresa.id)
      .then((actualizada) => {
        reemplazar(actualizada)
        setAviso(actualizada.cognitoError
          ? `${empresa.nombreEmpresa} quedó activa, pero no se pudieron sincronizar sus permisos en Cognito: ${actualizada.cognitoError}`
          : `${empresa.nombreEmpresa} quedó activa.`)
      })
      .catch((activarError) => setError(mensajeDe(activarError, 'No se pudo activar la empresa.')))
      .finally(() => setProcesando(null))
  }

  const confirmarRechazo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!rechazando) return
    setError('')
    setAviso('')
    if (!motivo.trim()) {
      setError('Indica el motivo del rechazo.')
      return
    }
    const empresa = rechazando
    setProcesando(empresa.id)
    void rechazarEmpresa(empresa.id, motivo.trim())
      .then((actualizada) => {
        reemplazar(actualizada)
        setRechazando(null)
        setMotivo('')
        setAviso(`${empresa.nombreEmpresa} fue rechazada.`)
      })
      .catch((rechazarError) => setError(mensajeDe(rechazarError, 'No se pudo rechazar la empresa.')))
      .finally(() => setProcesando(null))
  }

  return (
    <section role="tabpanel">
      <div className="trab-toolbar">
        <div className="trab-toolbar__left">
          <label htmlFor="filtroEstado">Estado</label>
          <select id="filtroEstado" value={estado} onChange={(event) => { setCargando(true); setError(''); setEstado(event.target.value) }}>
            {FILTROS_ESTADO.map((filtro) => (
              <option key={filtro.valor || 'todas'} value={filtro.valor}>{filtro.etiqueta}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <div className="trab-state trab-state--error" role="alert">{error}</div>}
      {aviso && <div className="trab-state" role="status">{aviso}</div>}
      {rechazando && esAdmin && (
        <form className="form-card" onSubmit={confirmarRechazo} noValidate>
          <div className="form-card-header"><h2>Rechazo de {rechazando.nombreEmpresa}</h2></div>
          <div className="form-card-body">
            <label htmlFor="motivoRechazo">Motivo del rechazo</label>
            <textarea id="motivoRechazo" value={motivo} onChange={(event) => setMotivo(event.target.value)} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => { setRechazando(null); setMotivo('') }}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={procesando === rechazando.id}>Confirmar rechazo</button>
          </div>
        </form>
      )}
      {cargando ? (
        <div className="trab-state">Cargando empresas…</div>
      ) : (
        <div className="trab-table-wrap">
          <table className="trab-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>RUT</th>
                <th>Registrada por</th>
                <th>Estado</th>
                {esAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {empresas.length === 0 ? (
                <tr><td className="trab-table__empty" colSpan={esAdmin ? 5 : 4}>No hay empresas en este estado.</td></tr>
              ) : empresas.map((empresa) => (
                <tr key={empresa.id}>
                  <td>{empresa.nombreEmpresa}</td>
                  <td className="trab-table__rut">{empresa.rutEmpresa ?? '—'}</td>
                  <td>{empresa.registradoPorEmail ?? '—'}</td>
                  <td>{empresa.estado}</td>
                  {esAdmin && (
                    <td className="trab-table__actions">
                      {empresa.estado === 'PENDIENTE_ACTIVACION' && (
                        <>
                          <button
                            type="button"
                            className="trab-action-btn"
                            aria-label={`Activar ${empresa.nombreEmpresa}`}
                            disabled={procesando === empresa.id}
                            onClick={() => activar(empresa)}
                          >
                            Activar
                          </button>
                          <button
                            type="button"
                            className="trab-action-btn trab-action-btn--danger"
                            aria-label={`Rechazar ${empresa.nombreEmpresa}`}
                            disabled={procesando === empresa.id}
                            onClick={() => { setRechazando(empresa); setMotivo(''); setError('') }}
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function UsuariosPlataforma() {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<CrearUsuarioPlataformaData['rol']>('OperadorSaaS')
  const [tenantId, setTenantId] = useState('')
  const [empresasActivas, setEmpresasActivas] = useState<TenantResumen[]>([])
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (rol !== 'SuperAdmin') return
    let cancelado = false
    listarEmpresasPlataforma('ACTIVO')
      .then((lista) => { if (!cancelado) setEmpresasActivas(lista) })
      .catch((listarError) => { if (!cancelado) setError(mensajeDe(listarError, 'No se pudieron cargar las empresas activas.')) })
    return () => { cancelado = true }
  }, [rol])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setAviso('')
    if (!email.trim() || !nombre.trim()) {
      setError('Ingresa el correo y el nombre.')
      return
    }
    if (rol === 'SuperAdmin' && !tenantId) {
      setError('Elige la empresa activa del SuperAdmin.')
      return
    }
    const datos: CrearUsuarioPlataformaData = rol === 'SuperAdmin'
      ? { email: email.trim(), nombre: nombre.trim(), rol, tenantId }
      : { email: email.trim(), nombre: nombre.trim(), rol }
    setEnviando(true)
    void crearUsuarioPlataforma(datos)
      .then(() => {
        setAviso(`Usuario ${datos.email} creado. Debe ingresar con Google usando ese correo.`)
        setEmail('')
        setNombre('')
        setTenantId('')
      })
      .catch((crearError) => setError(mensajeDe(crearError, 'No se pudo crear el usuario.')))
      .finally(() => setEnviando(false))
  }

  return (
    <section role="tabpanel">
      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <div className="form-card-header"><h2>Nuevo usuario de plataforma</h2></div>
        <div className="form-card-body">
          {error && <div className="form-error" role="alert">{error}</div>}
          {aviso && <div className="trab-state" role="status">{aviso}</div>}
          <div className="form-row">
            <label htmlFor="usuarioEmail">Correo</label>
            <input id="usuarioEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="form-row">
            <label htmlFor="usuarioNombre">Nombre</label>
            <input id="usuarioNombre" type="text" value={nombre} onChange={(event) => setNombre(event.target.value)} />
          </div>
          <div className="form-row">
            <label htmlFor="usuarioRol">Rol</label>
            <select id="usuarioRol" value={rol} onChange={(event) => setRol(event.target.value as CrearUsuarioPlataformaData['rol'])}>
              <option value="OperadorSaaS">OperadorSaaS</option>
              <option value="SuperAdmin">SuperAdmin</option>
            </select>
          </div>
          {rol === 'SuperAdmin' && (
            <div className="form-row">
              <label htmlFor="usuarioEmpresa">Empresa</label>
              <select id="usuarioEmpresa" value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
                <option value="">Elige una empresa activa</option>
                {empresasActivas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>{empresa.nombreEmpresa}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? 'Creando usuario...' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default Plataforma
