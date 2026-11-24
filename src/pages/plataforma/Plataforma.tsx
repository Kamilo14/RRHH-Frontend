import { useEffect, useState, type FormEvent } from 'react'
import { useAuth as useOidcAuth } from 'react-oidc-context'
import { useAuth } from '../../context/AuthContext'
import { signOutRedirect } from '../../config/oidcConfig'
import { clearAuth } from '../../services/tokenStorage'
import {
  activarEmpresa,
  crearUsuarioPlataforma,
  listarEmpresasPlataforma,
  rechazarEmpresa,
  type CrearUsuarioPlataformaData,
  type TenantResumen,
} from '../../services/identityService'
import { normalizeRole } from '../../security/accessControl'
import PlataformaSidebar, { type PlataformaSeccion } from '../../components/PlataformaSidebar'
import DetalleEmpresa from './DetalleEmpresa'
import Grupos from './Grupos'
import { insigniaEstado, mensajeDe } from './estadoEmpresa'
import '../../styles/admin.css'
import '../../styles/trabajadores.css'
import '../../styles/plataforma.css'

const FILTROS_ESTADO: { valor: string; etiqueta: string }[] = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'PENDIENTE_ACTIVACION', etiqueta: 'Pendientes de activación' },
  { valor: 'ACTIVO', etiqueta: 'Activas' },
  { valor: 'SUSPENDIDO', etiqueta: 'Suspendidas' },
  { valor: 'RECHAZADO', etiqueta: 'Rechazadas' },
]

const TITULOS: Record<PlataformaSeccion, string> = {
  empresas: 'Empresas',
  grupos: 'Grupos de empresas',
  usuarios: 'Usuarios de plataforma',
}

/**
 * Consola de plataforma (ADR-020), con la misma estructura que el panel administrativo: menú lateral, encabezado
 * y secciones. AdminPlataforma revisa empresas, crea cuentas y administra grupos; AdminPlataforma y OperadorSaaS
 * (en las empresas de sus grupos) gestionan integrantes, roles, suspensión y mensajes.
 */
function Plataforma() {
  const { user } = useAuth()
  const oidcAuth = useOidcAuth()
  const esAdmin = normalizeRole(user?.role) === 'ADMIN_PLATAFORMA'
  const [seccion, setSeccion] = useState<PlataformaSeccion>('empresas')
  // Cambia al elegir "Empresas" en el menú: vuelve a montar la lista y cierra el detalle abierto.
  const [vistaEmpresas, setVistaEmpresas] = useState(0)
  const nombre = user?.nombre || user?.email || 'Usuario'
  const rolLegible = esAdmin ? 'Administrador de plataforma' : 'Operador SaaS'
  const iniciales = nombre.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')

  // Igual que AdminSidebar: sin removeUser, /login vuelve a entrar con el usuario OIDC guardado.
  const cerrarSesion = async () => {
    clearAuth()
    await oidcAuth.removeUser().catch(() => undefined)
    signOutRedirect()
  }

  const elegir = (nueva: PlataformaSeccion) => {
    if (nueva === 'empresas') setVistaEmpresas((v) => v + 1)
    setSeccion(nueva)
  }

  const visible: PlataformaSeccion = esAdmin ? seccion : 'empresas'

  return (
    <div className="admin-shell">
      <PlataformaSidebar
        seccion={visible}
        esAdmin={esAdmin}
        rolLegible={rolLegible}
        onSeccion={elegir}
        onCerrarSesion={() => void cerrarSesion()}
      />
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <span className="admin-header__eyebrow">Plataforma / {TITULOS[visible]}</span>
            <h1>{TITULOS[visible]}</h1>
          </div>
          <div className="admin-header__user">
            <div className="admin-header__avatar">{iniciales}</div>
            <div>
              <strong>{nombre}</strong>
              <span>{rolLegible}</span>
            </div>
          </div>
        </header>
        {visible === 'usuarios' ? <UsuariosPlataforma />
          : visible === 'grupos' ? <Grupos />
            : <Empresas key={vistaEmpresas} esAdmin={esAdmin} />}
      </main>
    </div>
  )
}

function Empresas({ esAdmin }: { esAdmin: boolean }) {
  // S1: la consola abre con todas las empresas; el filtro sigue disponible.
  const [estado, setEstado] = useState('')
  const [empresas, setEmpresas] = useState<TenantResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [rechazando, setRechazando] = useState<TenantResumen | null>(null)
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<TenantResumen | null>(null)

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
    setDetalle((actual) => (actual && actual.id === actualizada.id ? { ...actual, ...actualizada } : actual))
  }

  if (detalle) {
    return <DetalleEmpresa empresa={detalle} onCambio={reemplazar} onCerrar={() => setDetalle(null)} />
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
    <section className="trab-page">
      <div className="trab-toolbar">
        <div className="plat-filter">
          <label htmlFor="filtroEstado">Estado</label>
          <select id="filtroEstado" value={estado} onChange={(event) => { setCargando(true); setError(''); setEstado(event.target.value) }}>
            {FILTROS_ESTADO.map((filtro) => (
              <option key={filtro.valor || 'todas'} value={filtro.valor}>{filtro.etiqueta}</option>
            ))}
          </select>
        </div>
        <span className="trab-count">{empresas.length} {empresas.length === 1 ? 'empresa' : 'empresas'}</span>
      </div>
      {error && <div className="plat-notice plat-notice--error" role="alert">{error}</div>}
      {aviso && <div className="plat-notice" role="status">{aviso}</div>}
      {rechazando && esAdmin && (
        <form className="plat-card" onSubmit={confirmarRechazo} noValidate>
          <h3>Rechazo de {rechazando.nombreEmpresa}</h3>
          <div className="plat-field">
            <label htmlFor="motivoRechazo">Motivo del rechazo</label>
            <textarea id="motivoRechazo" value={motivo} onChange={(event) => setMotivo(event.target.value)} />
          </div>
          <div className="plat-card__actions">
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
                <th>Grupo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empresas.length === 0 ? (
                <tr><td className="trab-table__empty" colSpan={5}>No hay empresas en este estado.</td></tr>
              ) : empresas.map((empresa) => {
                const insignia = insigniaEstado(empresa.estado)
                return (
                  <tr key={empresa.id}>
                    <td>
                      <strong>{empresa.nombreEmpresa}</strong>
                      {empresa.registradoPorEmail && <div className="plat-field__hint">{empresa.registradoPorEmail}</div>}
                    </td>
                    <td className="trab-table__rut">{empresa.rutEmpresa ?? '—'}</td>
                    <td>{empresa.grupo ?? 'Sin grupo'}</td>
                    <td><span className={insignia.clase}>{insignia.texto}</span></td>
                    <td>
                      <div className="trab-table__actions">
                        <button
                          type="button"
                          className="trab-action-btn"
                          aria-label={`Gestionar ${empresa.nombreEmpresa}`}
                          onClick={() => { setError(''); setAviso(''); setDetalle(empresa) }}
                        >
                          Gestionar
                        </button>
                        {esAdmin && empresa.estado === 'PENDIENTE_ACTIVACION' && (
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
                      </div>
                    </td>
                  </tr>
                )
              })}
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
    <section className="trab-page">
      <form className="plat-card" onSubmit={handleSubmit} noValidate>
        <div>
          <h3>Nuevo usuario de plataforma</h3>
          <p>Un OperadorSaaS apoya a las empresas de sus grupos; un SuperAdmin administra una empresa activa.</p>
        </div>
        {error && <div className="plat-notice plat-notice--error" role="alert">{error}</div>}
        {aviso && <div className="plat-notice" role="status">{aviso}</div>}
        <div className="plat-grid-2">
          <div className="plat-field">
            <label htmlFor="usuarioEmail">Correo</label>
            <input id="usuarioEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="plat-field">
            <label htmlFor="usuarioNombre">Nombre</label>
            <input id="usuarioNombre" type="text" value={nombre} onChange={(event) => setNombre(event.target.value)} />
          </div>
          <div className="plat-field">
            <label htmlFor="usuarioRol">Rol</label>
            <select id="usuarioRol" value={rol} onChange={(event) => setRol(event.target.value as CrearUsuarioPlataformaData['rol'])}>
              <option value="OperadorSaaS">OperadorSaaS</option>
              <option value="SuperAdmin">SuperAdmin</option>
            </select>
          </div>
          {rol === 'SuperAdmin' && (
            <div className="plat-field">
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
        <div className="plat-card__actions">
          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? 'Creando usuario...' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default Plataforma
