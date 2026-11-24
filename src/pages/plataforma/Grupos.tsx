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

const MAX_NOMBRE = 80

function mensajeDe(error: unknown, porDefecto: string): string {
  return error instanceof Error && error.message ? error.message : porDefecto
}

function nombreValido(nombre: string): boolean {
  const limpio = nombre.trim()
  return limpio.length > 0 && limpio.length <= MAX_NOMBRE
}

/**
 * Grupos de empresas (ADR-020, S2), solo para el AdminPlataforma: crea, renombra y borra grupos y elige sus
 * empresas (cada empresa en a lo más un grupo) y sus OperadoresSaaS.
 */
function Grupos() {
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [empresas, setEmpresas] = useState<Pick<TenantResumen, 'id' | 'nombreEmpresa' | 'grupo'>[]>([])
  const [operadores, setOperadores] = useState<Pick<UsuarioResponse, 'id' | 'email' | 'estado'>[]>([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelado = false
    Promise.all([listarGrupos(), listarEmpresasPlataforma(), listarOperadores()])
      .then(([g, e, o]) => {
        if (cancelado) return
        setGrupos(g)
        setEmpresas(e)
        setOperadores(o)
      })
      .catch((cargarError) => { if (!cancelado) setError(mensajeDe(cargarError, 'No se pudieron cargar los grupos.')) })
      .finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [])

  const crear = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!nombreValido(nombre)) {
      setError(`El nombre del grupo es obligatorio y admite hasta ${MAX_NOMBRE} caracteres.`)
      return
    }
    void crearGrupo(nombre.trim())
      .then((nuevo) => { setGrupos((lista) => [...lista, nuevo]); setNombre('') })
      .catch((crearError) => setError(mensajeDe(crearError, 'No se pudo crear el grupo.')))
  }

  /** Mantiene la columna "Grupo" de las casillas al día después de guardar o renombrar. */
  const actualizar = (anterior: Grupo, actualizado: Grupo) => {
    setGrupos((lista) => lista.map((g) => (g.id === actualizado.id ? actualizado : g)))
    setEmpresas((lista) => lista.map((e) => {
      if (actualizado.tenantIds.includes(e.id)) return { ...e, grupo: actualizado.nombre }
      return e.grupo === anterior.nombre ? { ...e, grupo: null } : e
    }))
  }

  const quitar = (borrado: Grupo) => {
    setGrupos((lista) => lista.filter((g) => g.id !== borrado.id))
    setEmpresas((lista) => lista.map((e) => (e.grupo === borrado.nombre ? { ...e, grupo: null } : e)))
  }

  return (
    <section role="tabpanel">
      <form className="form-card" onSubmit={crear} noValidate>
        <div className="form-card-header"><h2>Grupos de empresas</h2></div>
        <div className="form-card-body">
          {error && <div className="form-error" role="alert">{error}</div>}
          <label htmlFor="nombreGrupo">Nombre del grupo</label>
          <input id="nombreGrupo" type="text" value={nombre} onChange={(event) => setNombre(event.target.value)} />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-primary">Crear grupo</button>
        </div>
      </form>
      {cargando ? (
        <div className="trab-state">Cargando grupos…</div>
      ) : grupos.length === 0 ? (
        <div className="trab-state">Aún no hay grupos.</div>
      ) : grupos.map((grupo) => (
        <GrupoTarjeta
          key={grupo.id}
          grupo={grupo}
          empresas={empresas}
          operadores={operadores}
          onActualizado={actualizar}
          onBorrado={quitar}
        />
      ))}
    </section>
  )
}

interface TarjetaProps {
  grupo: Grupo
  empresas: Pick<TenantResumen, 'id' | 'nombreEmpresa' | 'grupo'>[]
  operadores: Pick<UsuarioResponse, 'id' | 'email' | 'estado'>[]
  onActualizado: (anterior: Grupo, actualizado: Grupo) => void
  onBorrado: (grupo: Grupo) => void
}

function GrupoTarjeta({ grupo, empresas, operadores, onActualizado, onBorrado }: TarjetaProps) {
  const [nuevoNombre, setNuevoNombre] = useState(grupo.nombre)
  const [elegidas, setElegidas] = useState<string[]>(grupo.tenantIds)
  const [elegidos, setElegidos] = useState<string[]>(grupo.operadorIds)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  const alternar = (lista: string[], id: string) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id])
  const fallo = (porDefecto: string) => (accionError: unknown) => setError(mensajeDe(accionError, porDefecto))
  const limpiar = () => { setError(''); setAviso('') }

  const renombrar = () => {
    limpiar()
    if (!nombreValido(nuevoNombre)) {
      setError(`El nombre del grupo es obligatorio y admite hasta ${MAX_NOMBRE} caracteres.`)
      return
    }
    void renombrarGrupo(grupo.id, nuevoNombre.trim())
      .then((actualizado) => { onActualizado(grupo, actualizado); setAviso('Grupo renombrado.') })
      .catch(fallo('No se pudo renombrar el grupo.'))
  }

  const guardarEmpresas = () => {
    limpiar()
    void fijarEmpresasGrupo(grupo.id, elegidas)
      .then((actualizado) => { onActualizado(grupo, actualizado); setAviso('Empresas guardadas.') })
      .catch(fallo('No se pudieron guardar las empresas.'))
  }

  const guardarOperadores = () => {
    limpiar()
    void fijarOperadoresGrupo(grupo.id, elegidos)
      .then((actualizado) => { onActualizado(grupo, actualizado); setAviso('Operadores guardados.') })
      .catch(fallo('No se pudieron guardar los operadores.'))
  }

  const borrar = () => {
    limpiar()
    if (!window.confirm(`¿Borrar el grupo ${grupo.nombre}? Sus empresas quedan sin grupo.`)) return
    void borrarGrupo(grupo.id)
      .then(() => onBorrado(grupo))
      .catch(fallo('No se pudo borrar el grupo.'))
  }

  return (
    <section className="form-card" aria-label={`Grupo ${grupo.nombre}`}>
      <div className="trab-toolbar">
        <div className="trab-toolbar__left"><h3>{grupo.nombre}</h3></div>
        <button type="button" className="trab-action-btn trab-action-btn--danger" aria-label={`Borrar ${grupo.nombre}`} onClick={borrar}>
          Borrar
        </button>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {aviso && <div className="trab-state" role="status">{aviso}</div>}
      <div className="form-row">
        <input
          type="text"
          aria-label={`Nuevo nombre de ${grupo.nombre}`}
          value={nuevoNombre}
          onChange={(event) => setNuevoNombre(event.target.value)}
        />
        <button type="button" className="btn-secondary" aria-label={`Renombrar ${grupo.nombre}`} onClick={renombrar}>Renombrar</button>
      </div>
      <fieldset>
        <legend>Empresas</legend>
        {empresas.map((empresa) => (
          <div key={empresa.id}>
            <input
              id={`${grupo.id}-empresa-${empresa.id}`}
              type="checkbox"
              checked={elegidas.includes(empresa.id)}
              onChange={() => setElegidas((lista) => alternar(lista, empresa.id))}
            />
            <label htmlFor={`${grupo.id}-empresa-${empresa.id}`}>{empresa.nombreEmpresa}</label>
            {empresa.grupo && empresa.grupo !== grupo.nombre && <span> (en {empresa.grupo})</span>}
          </div>
        ))}
        <button type="button" className="btn-primary" onClick={guardarEmpresas}>Guardar empresas</button>
      </fieldset>
      <fieldset>
        <legend>Operadores</legend>
        {operadores.length === 0 ? <div className="trab-state">No hay cuentas OperadorSaaS.</div> : operadores.map((operador) => (
          <div key={operador.id}>
            <input
              id={`${grupo.id}-operador-${operador.id}`}
              type="checkbox"
              checked={elegidos.includes(operador.id)}
              onChange={() => setElegidos((lista) => alternar(lista, operador.id))}
            />
            <label htmlFor={`${grupo.id}-operador-${operador.id}`}>{operador.email}</label>
            {operador.estado !== 'ACTIVO' && <span> ({operador.estado})</span>}
          </div>
        ))}
        <button type="button" className="btn-primary" onClick={guardarOperadores}>Guardar operadores</button>
      </fieldset>
    </section>
  )
}

export default Grupos
