import { useEffect, useState, type FormEvent } from 'react'
import {
  cambiarRolIntegrante,
  enviarMensajeEmpresa,
  listarIntegrantes,
  reactivarEmpresa,
  suspenderEmpresa,
  type TenantResumen,
  type UsuarioResponse,
} from '../../services/identityService'

/** Roles que la plataforma puede asignar a un integrante (S5): nunca SuperAdmin. */
const ROLES_ASIGNABLES = ['Admin de RRHH', 'Jefatura', 'Trabajador']
const MAX_MOTIVO = 500
const MAX_ASUNTO = 100
const MAX_CUERPO = 4000

function mensajeDe(error: unknown, porDefecto: string): string {
  return error instanceof Error && error.message ? error.message : porDefecto
}

interface Props {
  empresa: TenantResumen
  onCambio: (empresa: TenantResumen) => void
  onCerrar: () => void
}

/**
 * Detalle de una empresa en la consola de plataforma (S4-S8): integrantes con su rol, suspensión o
 * reactivación y mensaje al Admin de RRHH. Lo usan el AdminPlataforma y el OperadorSaaS de su grupo.
 */
function DetalleEmpresa({ empresa, onCambio, onCerrar }: Props) {
  const [integrantes, setIntegrantes] = useState<UsuarioResponse[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [cambiando, setCambiando] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    listarIntegrantes(empresa.id)
      .then((lista) => { if (!cancelado) setIntegrantes(lista) })
      .catch((listarError) => { if (!cancelado) setError(mensajeDe(listarError, 'No se pudieron cargar los integrantes.')) })
      .finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [empresa.id])

  const cambiarRol = (persona: UsuarioResponse, rol: string) => {
    setError('')
    setAviso('')
    setCambiando(persona.id)
    void cambiarRolIntegrante(empresa.id, persona.id, rol)
      .then((actualizado) => {
        setIntegrantes((lista) => lista.map((p) => (p.id === persona.id ? { ...p, rol: actualizado.rol } : p)))
        setAviso(actualizado.cognitoError
          ? `${persona.email} ahora es ${actualizado.rol} en la base, pero no se pudo actualizar su rol en Cognito: ${actualizado.cognitoError}. Al volver a entrar seguirá con el rol anterior.`
          : `${persona.email} ahora es ${actualizado.rol}. El cambio se ve en su próximo inicio de sesión.`)
      })
      .catch((rolError) => setError(mensajeDe(rolError, 'No se pudo cambiar el rol.')))
      .finally(() => setCambiando(null))
  }

  return (
    <section className="form-card">
      <div className="trab-toolbar">
        <div className="trab-toolbar__left">
          <h2>{empresa.nombreEmpresa}</h2>
          <span>{empresa.estado}{empresa.grupo ? ` · ${empresa.grupo}` : ''}</span>
        </div>
        <button type="button" className="btn-secondary" onClick={onCerrar}>Volver a empresas</button>
      </div>
      {error && <div className="trab-state trab-state--error" role="alert">{error}</div>}
      {aviso && <div className="trab-state" role="status">{aviso}</div>}

      <h3>Integrantes</h3>
      {cargando ? (
        <div className="trab-state">Cargando integrantes…</div>
      ) : (
        <div className="trab-table-wrap">
          <table className="trab-table">
            <thead>
              <tr><th>Correo</th><th>Nombre</th><th>Rol</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {integrantes.length === 0 ? (
                <tr><td className="trab-table__empty" colSpan={4}>La empresa no tiene integrantes.</td></tr>
              ) : integrantes.map((persona) => {
                const editable = persona.estado === 'ACTIVO' && persona.rol !== 'SuperAdmin'
                return (
                  <tr key={persona.id}>
                    <td>{persona.email}</td>
                    <td>{persona.nombre ?? '—'}</td>
                    <td>
                      {editable ? (
                        <select
                          aria-label={`Rol de ${persona.email}`}
                          value={persona.rol}
                          disabled={cambiando === persona.id}
                          onChange={(event) => cambiarRol(persona, event.target.value)}
                        >
                          {ROLES_ASIGNABLES.map((rol) => <option key={rol} value={rol}>{rol}</option>)}
                        </select>
                      ) : (persona.rol ?? '—')}
                    </td>
                    <td>{persona.estado}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Suspension empresa={empresa} onCambio={onCambio} />
      <Mensaje empresa={empresa} />
    </section>
  )
}

function Suspension({ empresa, onCambio }: { empresa: TenantResumen; onCambio: (e: TenantResumen) => void }) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [procesando, setProcesando] = useState(false)

  /** Avisa si Cognito no pudo deshabilitar o habilitar las cuentas de la empresa (S6). */
  const avisarCognito = (actualizada: TenantResumen, accion: string) => {
    setAviso(actualizada.cognitoError
      ? `La empresa quedó ${accion}, pero Cognito no pudo actualizar sus cuentas: ${actualizada.cognitoError}`
      : '')
  }

  const suspender = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setAviso('')
    const limpio = motivo.trim()
    if (!limpio) {
      setError('Indica el motivo de la suspensión.')
      return
    }
    if (limpio.length > MAX_MOTIVO) {
      setError(`El motivo admite hasta ${MAX_MOTIVO} caracteres.`)
      return
    }
    setProcesando(true)
    void suspenderEmpresa(empresa.id, limpio)
      .then((actualizada) => { setMotivo(''); avisarCognito(actualizada, 'suspendida'); onCambio(actualizada) })
      .catch((suspenderError) => setError(mensajeDe(suspenderError, 'No se pudo suspender la empresa.')))
      .finally(() => setProcesando(false))
  }

  const reactivar = () => {
    setError('')
    setAviso('')
    setProcesando(true)
    void reactivarEmpresa(empresa.id)
      .then((actualizada) => { avisarCognito(actualizada, 'activa'); onCambio(actualizada) })
      .catch((reactivarError) => setError(mensajeDe(reactivarError, 'No se pudo reactivar la empresa.')))
      .finally(() => setProcesando(false))
  }

  const avisoCognito = aviso && <div className="trab-state trab-state--error" role="status">{aviso}</div>

  if (empresa.estado === 'SUSPENDIDO') {
    return (
      <div className="form-actions">
        {avisoCognito}
        {error && <div className="form-error" role="alert">{error}</div>}
        <button type="button" className="btn-primary" disabled={procesando} onClick={reactivar}>Reactivar empresa</button>
      </div>
    )
  }
  if (empresa.estado !== 'ACTIVO') return avisoCognito || null
  return (
    <form onSubmit={suspender} noValidate>
      <h3>Suspender</h3>
      {avisoCognito}
      {error && <div className="form-error" role="alert">{error}</div>}
      <label htmlFor="motivoSuspension">Motivo de la suspensión</label>
      <textarea id="motivoSuspension" maxLength={MAX_MOTIVO} value={motivo} onChange={(event) => setMotivo(event.target.value)} />
      <div className="form-actions">
        <button type="submit" className="trab-action-btn trab-action-btn--danger" disabled={procesando}>Suspender empresa</button>
      </div>
    </form>
  )
}

function Mensaje({ empresa }: { empresa: TenantResumen }) {
  const [asunto, setAsunto] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setAviso('')
    const asuntoLimpio = asunto.trim()
    const cuerpoLimpio = cuerpo.trim()
    if (!asuntoLimpio || asuntoLimpio.length > MAX_ASUNTO || /[\r\n]/.test(asunto)) {
      setError(`El asunto es obligatorio, de hasta ${MAX_ASUNTO} caracteres y sin saltos de línea.`)
      return
    }
    if (!cuerpoLimpio || cuerpoLimpio.length > MAX_CUERPO) {
      setError(`El mensaje es obligatorio y admite hasta ${MAX_CUERPO} caracteres.`)
      return
    }
    setEnviando(true)
    void enviarMensajeEmpresa(empresa.id, asuntoLimpio, cuerpoLimpio)
      .then((destinatarios) => {
        setAviso(`Mensaje enviado a ${destinatarios} ${destinatarios === 1 ? 'destinatario' : 'destinatarios'}.`)
        setAsunto('')
        setCuerpo('')
      })
      .catch((enviarError) => setError(mensajeDe(enviarError, 'No se pudo enviar el mensaje.')))
      .finally(() => setEnviando(false))
  }

  return (
    <form aria-label="Mensaje al Admin de RRHH" onSubmit={enviar} noValidate>
      <h3>Mensaje al Admin de RRHH</h3>
      {error && <div className="form-error" role="alert">{error}</div>}
      {aviso && <div className="trab-state" role="status">{aviso}</div>}
      <label htmlFor="mensajeAsunto">Asunto</label>
      <input id="mensajeAsunto" type="text" value={asunto} onChange={(event) => setAsunto(event.target.value)} />
      <label htmlFor="mensajeCuerpo">Cuerpo</label>
      <textarea id="mensajeCuerpo" maxLength={MAX_CUERPO} value={cuerpo} onChange={(event) => setCuerpo(event.target.value)} />
      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={enviando}>Enviar mensaje</button>
      </div>
    </form>
  )
}

export default DetalleEmpresa
