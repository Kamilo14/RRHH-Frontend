import { useEffect, useState, type FormEvent } from 'react'
import {
  borrarGrupo,
  crearGrupo,
  fijarEmpresasGrupo,
  fijarOperadoresGrupo,
  listarEmpresasPlataforma,
  listarGrupos,
  listarOperadores,
  renombrarGrupo,
  type Grupo,
  type TenantResumen,
  type UsuarioResponse,
} from '../../services/identityService'
import { mensajeDe } from './estadoEmpresa'

const MAX_NOMBRE = 80

type EmpresaLista = Pick<TenantResumen, 'id' | 'nombreEmpresa' | 'grupo' | 'estado'>
type OperadorLista = Pick<UsuarioResponse, 'id' | 'email' | 'nombre' | 'estado'>

function nombreValido(nombre: string): boolean {
  const limpio = nombre.trim()
  return limpio.length > 0 && limpio.length <= MAX_NOMBRE
}

/**
 * Grupos de empresas (ADR-020, S2), solo para el AdminPlataforma: a la izquierda la lista de grupos y el alta de uno
 * nuevo; a la derecha el grupo elegido, con sus empresas activas y sus OperadoresSaaS para marcar. Cada empresa está en
 * a lo más un grupo. Las tres cargas son independientes: si falla una, el resto se sigue mostrando.
 */
function Grupos() {
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [empresas, setEmpresas] = useState<EmpresaLista[]>([])
  const [operadores, setOperadores] = useState<OperadorLista[]>([])
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errores, setErrores] = useState<string[]>([])
  const [nombre, setNombre] = useState('')
  const [errorAlta, setErrorAlta] = useState('')
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    let cancelado = false
    void Promise.allSettled([listarGrupos(), listarEmpresasPlataforma(), listarOperadores()]).then(([g, e, o]) => {
      if (cancelado) return
      const fallos: string[] = []
      if (g.status === 'fulfilled') {
        setGrupos(g.value)
        setSeleccionado((actual) => actual ?? g.value[0]?.id ?? null)
      } else fallos.push(mensajeDe(g.reason, 'No se pudieron cargar los grupos.'))
      if (e.status === 'fulfilled') setEmpresas(e.value)
      else fallos.push(mensajeDe(e.reason, 'No se pudieron cargar las empresas.'))
      if (o.status === 'fulfilled') setOperadores(o.value)
      else fallos.push(`No se pudieron cargar los operadores: ${mensajeDe(o.reason, 'error desconocido')}`)
      setErrores(fallos)
      setCargando(false)
    })
    return () => { cancelado = true }
  }, [])

  const crear = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorAlta('')
    if (!nombreValido(nombre)) {
      setErrorAlta(`El nombre del grupo es obligatorio y admite hasta ${MAX_NOMBRE} caracteres.`)
      return
    }
    setCreando(true)
    void crearGrupo(nombre.trim())
      .then((nuevo) => {
        setGrupos((lista) => [...lista, nuevo])
        setSeleccionado(nuevo.id)
        setNombre('')
      })
      .catch((crearError) => setErrorAlta(mensajeDe(crearError, 'No se pudo crear el grupo.')))
      .finally(() => setCreando(false))
  }

  /** Mantiene al día el grupo de cada empresa después de guardar o renombrar. */
  const actualizar = (anterior: Grupo, actualizado: Grupo) => {
    setGrupos((lista) => lista.map((g) => (g.id === actualizado.id ? actualizado : g)))
    setEmpresas((lista) => lista.map((e) => {
      if (actualizado.tenantIds.includes(e.id)) return { ...e, grupo: actualizado.nombre }
      return e.grupo === anterior.nombre ? { ...e, grupo: null } : e
    }))
  }

  const quitar = (borrado: Grupo) => {
    const restantes = grupos.filter((g) => g.id !== borrado.id)
    setGrupos(restantes)
    setSeleccionado(restantes[0]?.id ?? null)
    setEmpresas((lista) => lista.map((e) => (e.grupo === borrado.nombre ? { ...e, grupo: null } : e)))
  }

  const grupo = grupos.find((g) => g.id === seleccionado) ?? null

  return (
    <section className="trab-page">
      {errores.map((texto) => <div key={texto} className="plat-notice plat-notice--error" role="alert">{texto}</div>)}
      <div className="plat-groups">
        <div className="trab-page">
          <form className="plat-card" onSubmit={crear} noValidate>
            <h3>Nuevo grupo</h3>
            {errorAlta && <div className="plat-notice plat-notice--error" role="alert">{errorAlta}</div>}
            <div className="plat-field">
              <label htmlFor="nombreGrupo">Nombre del grupo</label>
              <input id="nombreGrupo" type="text" maxLength={MAX_NOMBRE} value={nombre} onChange={(event) => setNombre(event.target.value)} />
            </div>
            <div className="plat-card__actions">
              <button type="submit" className="btn-primary" disabled={creando}>Crear grupo</button>
            </div>
          </form>
          <div className="plat-card">
            <h3>Grupos</h3>
            {cargando ? <div className="plat-empty">Cargando grupos…</div>
              : grupos.length === 0 ? <div className="plat-empty">Aún no hay grupos.</div>
                : (
                  <div className="plat-group-list">
                    {grupos.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className={`plat-group-item${g.id === seleccionado ? ' plat-group-item--active' : ''}`}
                        aria-pressed={g.id === seleccionado}
                        aria-label={`Ver grupo ${g.nombre}`}
                        onClick={() => setSeleccionado(g.id)}
                      >
                        <strong>{g.nombre}</strong>
                        <span>{g.tenantIds.length} emp. · {g.operadorIds.length} op.</span>
                      </button>
                    ))}
                  </div>
                )}
          </div>
        </div>
        {grupo ? (
          <EditorGrupo
            key={grupo.id}
            grupo={grupo}
            empresas={empresas}
            operadores={operadores}
            onActualizado={actualizar}
            onBorrado={quitar}
          />
        ) : !cargando && (
          <div className="plat-card"><div className="plat-empty">Crea un grupo para asignarle empresas y operadores.</div></div>
        )}
      </div>
    </section>
  )
}

interface EditorProps {
  grupo: Grupo
  empresas: EmpresaLista[]
  operadores: OperadorLista[]
  onActualizado: (anterior: Grupo, actualizado: Grupo) => void
  onBorrado: (grupo: Grupo) => void
}

function EditorGrupo({ grupo, empresas, operadores, onActualizado, onBorrado }: EditorProps) {
  const [nuevoNombre, setNuevoNombre] = useState(grupo.nombre)
  const [elegidas, setElegidas] = useState<string[]>(grupo.tenantIds)
  const [elegidos, setElegidos] = useState<string[]>(grupo.operadorIds)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState(false)

  // Se ofrecen las empresas activas y, además, las que ya están en el grupo aunque hoy no estén activas.
  const disponibles = empresas.filter((e) => e.estado === 'ACTIVO' || grupo.tenantIds.includes(e.id))
  const alternar = (lista: string[], id: string) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id])

  const ejecutar = (accion: () => Promise<void>, porDefecto: string) => {
    setError('')
    setAviso('')
    setOcupado(true)
    void accion().catch((accionError) => setError(mensajeDe(accionError, porDefecto))).finally(() => setOcupado(false))
  }

  const renombrar = () => {
    if (!nombreValido(nuevoNombre)) {
      setAviso('')
      setError(`El nombre del grupo es obligatorio y admite hasta ${MAX_NOMBRE} caracteres.`)
      return
    }
    ejecutar(async () => {
      const actualizado = await renombrarGrupo(grupo.id, nuevoNombre.trim())
      onActualizado(grupo, actualizado)
      setAviso('Grupo renombrado.')
    }, 'No se pudo renombrar el grupo.')
  }

  const guardarEmpresas = () => ejecutar(async () => {
    const actualizado = await fijarEmpresasGrupo(grupo.id, elegidas)
    onActualizado(grupo, actualizado)
    setAviso('Empresas del grupo guardadas.')
  }, 'No se pudieron guardar las empresas.')

  const guardarOperadores = () => ejecutar(async () => {
    const actualizado = await fijarOperadoresGrupo(grupo.id, elegidos)
    onActualizado(grupo, actualizado)
    setAviso('Operadores del grupo guardados.')
  }, 'No se pudieron guardar los operadores.')

  const borrar = () => {
    if (!window.confirm(`¿Borrar el grupo ${grupo.nombre}? Sus empresas quedan sin grupo.`)) return
    ejecutar(async () => {
      await borrarGrupo(grupo.id)
      onBorrado(grupo)
    }, 'No se pudo borrar el grupo.')
  }

  return (
    <section className="trab-page" aria-label={`Grupo ${grupo.nombre}`}>
      <div className="plat-card">
        <div className="plat-detail-header">
          <h2>{grupo.nombre}</h2>
          <button type="button" className="trab-action-btn trab-action-btn--danger" aria-label={`Borrar ${grupo.nombre}`} disabled={ocupado} onClick={borrar}>
            Borrar grupo
          </button>
        </div>
        {error && <div className="plat-notice plat-notice--error" role="alert">{error}</div>}
        {aviso && <div className="plat-notice" role="status">{aviso}</div>}
        <div className="plat-inline">
          <div className="plat-field">
            <label htmlFor={`nombre-${grupo.id}`}>Nuevo nombre de {grupo.nombre}</label>
            <input id={`nombre-${grupo.id}`} type="text" maxLength={MAX_NOMBRE} value={nuevoNombre} onChange={(event) => setNuevoNombre(event.target.value)} />
          </div>
          <button type="button" className="btn-secondary" aria-label={`Renombrar ${grupo.nombre}`} disabled={ocupado} onClick={renombrar}>Renombrar</button>
        </div>
      </div>

      <div className="plat-grid-2">
        <div className="plat-card">
          <div>
            <h3>Empresas</h3>
            <p>Marca las empresas activas de este grupo. Cada empresa puede estar en un solo grupo.</p>
          </div>
          {disponibles.length === 0 ? <div className="plat-empty">No hay empresas activas.</div> : (
            <div className="plat-checklist">
              {disponibles.map((empresa) => (
                <label key={empresa.id} className="plat-check">
                  <input
                    type="checkbox"
                    checked={elegidas.includes(empresa.id)}
                    onChange={() => setElegidas((lista) => alternar(lista, empresa.id))}
                  />
                  <span>{empresa.nombreEmpresa}</span>
                  {empresa.grupo && empresa.grupo !== grupo.nombre && <small>(en {empresa.grupo})</small>}
                  {empresa.estado !== 'ACTIVO' && <small>({empresa.estado})</small>}
                </label>
              ))}
            </div>
          )}
          <div className="plat-card__actions">
            <span className="plat-field__hint">{elegidas.length} seleccionadas</span>
            <button type="button" className="btn-primary" disabled={ocupado} onClick={guardarEmpresas}>Guardar empresas</button>
          </div>
        </div>

        <div className="plat-card">
          <div>
            <h3>Operadores</h3>
            <p>Cuentas OperadorSaaS que gestionan las empresas de este grupo.</p>
          </div>
          {operadores.length === 0 ? <div className="plat-empty">No hay cuentas OperadorSaaS. Créalas en Usuarios de plataforma.</div> : (
            <div className="plat-checklist">
              {operadores.map((operador) => (
                <label key={operador.id} className="plat-check">
                  <input
                    type="checkbox"
                    checked={elegidos.includes(operador.id)}
                    onChange={() => setElegidos((lista) => alternar(lista, operador.id))}
                  />
                  <span>{operador.email}</span>
                  {operador.estado !== 'ACTIVO' && <small>({operador.estado})</small>}
                </label>
              ))}
            </div>
          )}
          <div className="plat-card__actions">
            <span className="plat-field__hint">{elegidos.length} seleccionados</span>
            <button type="button" className="btn-primary" disabled={ocupado} onClick={guardarOperadores}>Guardar operadores</button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Grupos
