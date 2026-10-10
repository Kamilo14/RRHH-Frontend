import { useState, useEffect } from 'react'
import { useAuth } from '../../../../context/AuthContext'
import { listarTrabajadores, desactivarTrabajador, actualizarTrabajador, crearTrabajadorConCuenta, CuentaPendienteError, listarDepartamentos, listarCargos } from '../../../../services/trabajadoresService'
import { listarUsuarios } from '../../../../services/identityService'
import '../../../../styles/trabajadores.css'
import '../../../../styles/modal.css'

function Trabajadores() {
  const { user } = useAuth()
  const [trabajadores, setTrabajadores] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [search, setSearch]           = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [showForm, setShowForm]       = useState(false)
  const [editingTrabajadorId, setEditingTrabajadorId] = useState(null)
  const [departamentos, setDepartamentos] = useState([])
  const [cargos, setCargos]           = useState([])
  const [formError, setFormError]     = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [cuentaPendiente, setCuentaPendiente] = useState(null)
  const [rolCuentaPendiente, setRolCuentaPendiente] = useState('TRABAJADOR')
  const [cuentaEnProceso, setCuentaEnProceso] = useState(null)
  const [cuentaMensaje, setCuentaMensaje] = useState('')

  async function completarCuenta(trabajador) {
    setCuentaEnProceso(trabajador.id)
    setCuentaMensaje('')
    try {
      await crearTrabajadorConCuenta({ rol: trabajador.rol ?? rolCuentaPendiente }, trabajador)
      setCuentaMensaje(`Cuenta de ${trabajador.email} registrada en Cognito.`)
    } catch (err) {
      setCuentaMensaje(err.message)
    } finally {
      setCuentaEnProceso(null)
    }
  }

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    rutTrabajador: '',
    email: '',
    telefono: '',
    departamentoId: '',
    cargoId: '',
    jefaturaId: '',
    rol: 'TRABAJADOR',
  })

  useEffect(() => {
    cargarDatos()
  }, [user?.tenantId, user?.trabajadorId])

  async function cargarDatos() {
    try {
      const [trabajadoresData, deps, car, usuarios] = await Promise.all([
        listarTrabajadores(),
        listarDepartamentos(),
        listarCargos(),
        listarUsuarios(),
      ])
      const tenantId = user?.tenantId
      const tenantDeps = deps.filter((departamento) => !tenantId || departamento.tenantId === tenantId)
      const tenantCargos = car.filter((cargo) => !tenantId || cargo.tenantId === tenantId)
      const rolPorTrabajador = new Map(
        usuarios
          .filter((usuario) => usuario.trabajadorId)
          .map((usuario) => [usuario.trabajadorId, usuario.rol])
      )
      const rolPorEmail = new Map(usuarios.map((usuario) => [usuario.email.toLowerCase(), usuario.rol]))
      setTrabajadores(trabajadoresData.map((trabajador) => ({
        ...trabajador,
        rol: rolPorTrabajador.get(trabajador.id)
          ?? rolPorEmail.get(trabajador.email.toLowerCase())
          ?? trabajador.rol,
      })))
      setDepartamentos(tenantDeps)
      setCargos(tenantCargos)
      setFormData((current) => {
        if (current.departamentoId || !user?.trabajadorId) return current
        const admin = trabajadoresData.find((trabajador) => trabajador.id === user.trabajadorId)
        const departamentoId = admin?.departamentoId
        const departamento = tenantDeps.find((item) => item.id === departamentoId)
        return departamento
          ? { ...current, departamentoId: departamento.nombre }
          : current
      })
    } catch (err) {
      setError(err.message ?? 'Error al cargar trabajadores y catálogos')
    } finally {
      setLoading(false)
    }
  }

  async function fetchTrabajadores() {
    try {
      setLoading(true)
      setError(null)
      const data = await listarTrabajadores()
      setTrabajadores(data)
    } catch (err) {
      setError(err.message ?? 'Error al cargar trabajadores')
    } finally {
      setLoading(false)
    }
  }

  async function handleDesactivar(id) {
    if (!confirm('¿Deseas desactivar este trabajador?')) return
    try {
      await desactivarTrabajador(id)
      setTrabajadores((prev) => prev.map((t) => t.id === id ? { ...t, activo: false } : t))
    } catch (err) {
      alert(err.message ?? 'Error al desactivar trabajador')
    }
  }

  async function handleCrearTrabajador(e) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    try {
      if (editingTrabajadorId) {
        const actualizado = await actualizarTrabajador(editingTrabajadorId, formData)
        setTrabajadores((prev) => prev.map((trabajador) => (
          trabajador.id === actualizado.id ? actualizado : trabajador
        )))
      } else {
        await crearTrabajadorConCuenta(formData, cuentaPendiente)
      }
      setCuentaPendiente(null)
      setShowForm(false)
      setEditingTrabajadorId(null)
      setFormData({
        nombre: '',
        apellido: '',
        rutTrabajador: '',
        email: '',
        telefono: '',
        departamentoId: '',
        cargoId: '',
        jefaturaId: '',
        rol: 'TRABAJADOR',
      })
      cargarDatos()
    } catch (err) {
      if (err instanceof CuentaPendienteError) {
        setCuentaPendiente(err.trabajador)
        setRolCuentaPendiente(err.rol)
      }
      setFormError(err.message || 'Error al crear trabajador')
    } finally {
      setFormLoading(false)
    }
  }

  function handleCancelForm() {
    if (cuentaPendiente) fetchTrabajadores()
    setCuentaPendiente(null)
    setShowForm(false)
    setEditingTrabajadorId(null)
    setFormData({
      nombre: '',
      apellido: '',
      rutTrabajador: '',
      email: '',
      telefono: '',
      departamentoId: '',
      cargoId: '',
      jefaturaId: '',
      rol: 'TRABAJADOR',
    })
    setFormError('')
  }

  function handleEditarTrabajador(trabajador) {
    setCuentaPendiente(null)
    setFormError('')
    setEditingTrabajadorId(trabajador.id)
    setFormData({
      nombre: trabajador.nombre ?? '',
      apellido: trabajador.apellido ?? '',
      rutTrabajador: trabajador.rutTrabajador ?? '',
      email: trabajador.email ?? '',
      telefono: trabajador.telefono ?? '',
      departamentoId: departamentos.find((departamento) => departamento.id === trabajador.departamentoId)?.nombre ?? '',
      cargoId: cargos.find((cargo) => cargo.id === trabajador.cargoId)?.nombre ?? '',
      jefaturaId: trabajador.jefaturaId ?? '',
      rol: trabajador.rol ?? 'TRABAJADOR',
    })
    setShowForm(true)
  }

  const filtrados = trabajadores.filter((t) => {
    const matchSearch =
      `${t.nombre} ${t.apellido}`.toLowerCase().includes(search.toLowerCase()) ||
      (t.rutTrabajador ?? '').includes(search) ||
      (t.email ?? '').toLowerCase().includes(search.toLowerCase())

    const estado = t.activo ? 'activo' : 'inactivo'
    const matchEstado = filtroEstado === 'todos' || estado === filtroEstado
    return matchSearch && matchEstado
  })

  const initials = (t) =>
    `${t.nombre?.[0] ?? ''}${t.apellido?.[0] ?? ''}`.toUpperCase()

  const rolLabel = (rol) => ({
    ADMIN_RRHH: 'Admin de RRHH',
    ROLE_ADMIN_RRHH: 'Admin de RRHH',
    JEFATURA: 'Jefatura',
    ROLE_JEFATURA: 'Jefatura',
    TRABAJADOR: 'Trabajador',
    ROLE_TRABAJADOR: 'Trabajador',
    SUPERADMIN: 'SuperAdmin',
    ROLE_SUPERADMIN: 'SuperAdmin',
    OperadorSaaS: 'Operador SaaS',
    ROLE_OPERADOR_SAAS: 'Operador SaaS',
  }[rol] ?? rol ?? 'Sin rol asignado')

  return (
    <div className="trab-page">
      {/* Toolbar */}
      <div className="trab-toolbar">
        <div className="trab-toolbar__left">
          <div className="trab-search">
            <span className="trab-search__icon" aria-hidden="true">⌕</span>
            <input
              id="trabajadores-search"
              type="text"
              placeholder="Buscar por nombre, RUT o email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="trab-filter-tabs" role="group" aria-label="Filtrar por estado">
            {['todos', 'activo', 'inactivo'].map((estado) => (
              <button
                key={estado}
                type="button"
                className={`trab-filter-tab${filtroEstado === estado ? ' trab-filter-tab--active' : ''}`}
                onClick={() => setFiltroEstado(estado)}
              >
                {estado === 'todos' ? 'Todos' : estado.charAt(0).toUpperCase() + estado.slice(1) + 's'}
              </button>
            ))}
          </div>
        </div>
        <button
          id="btn-nuevo-trabajador"
          type="button"
          className="trab-btn-primary"
          onClick={() => setShowForm(true)}
        >
          <span aria-hidden="true">＋</span> Nuevo trabajador
        </button>
      </div>

      {/* Formulario de nuevo trabajador */}
      {showForm && (
        <div className="form-card">
          <div className="form-card-header">
            <h3>{editingTrabajadorId ? 'Editar trabajador' : 'Nuevo trabajador'}</h3>
            <button type="button" onClick={handleCancelForm} className="btn-close">×</button>
          </div>
          <form onSubmit={handleCrearTrabajador} className="form-card-body">
            {formError && <div className="form-error">{formError}</div>}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="rol">Rol de acceso *</label>
                <select id="rol" required value={formData.rol} onChange={(e) => setFormData({ ...formData, rol: e.target.value })}>
                  <option value="TRABAJADOR">Trabajador</option>
                  <option value="JEFATURA">Jefatura</option>
                  <option value="ADMIN_RRHH">Admin de RRHH</option>
                </select>
                <small>SUPERADMIN es exclusivo del propietario de la plataforma.</small>
              </div>
              <div className="form-group">
                <label htmlFor="nombre">Nombre *</label>
                <input
                  id="nombre"
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre del trabajador"
                />
              </div>

              <div className="form-group">
                <label htmlFor="apellido">Apellido *</label>
                <input
                  id="apellido"
                  type="text"
                  required
                  value={formData.apellido}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  placeholder="Apellido del trabajador"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="rut">RUT *</label>
                <input
                  id="rut"
                  type="text"
                  required
                  value={formData.rutTrabajador}
                  onChange={(e) => setFormData({ ...formData, rutTrabajador: e.target.value })}
                  placeholder="12.345.678-9"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="correo@empresa.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="telefono">Teléfono (opcional)</label>
                <input
                  id="telefono"
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+56 9 1234 5678"
                />
              </div>

              <div className="form-group">
                <label htmlFor="departamento">Departamento (opcional)</label>
                <input
                  id="departamento"
                  type="text"
                  list="departamentos-opciones"
                  value={formData.departamentoId}
                  onChange={(e) => setFormData({ ...formData, departamentoId: e.target.value })}
                  placeholder="Ej. Recursos Humanos"
                />
                <datalist id="departamentos-opciones">
                  {departamentos.map((d) => <option key={d.id} value={d.nombre} />)}
                </datalist>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cargo">Cargo (opcional)</label>
                <input
                  id="cargo"
                  type="text"
                  list="cargos-opciones"
                  value={formData.cargoId}
                  onChange={(e) => setFormData({ ...formData, cargoId: e.target.value })}
                  placeholder="Ej. Analista de RRHH"
                />
                <datalist id="cargos-opciones">
                  {cargos.map((c) => <option key={c.id} value={c.nombre} />)}
                </datalist>
              </div>

              <div className="form-group">
                <label htmlFor="jefatura">Jefatura (opcional)</label>
                <input
                  id="jefatura"
                  type="text"
                  value={formData.jefaturaId}
                  onChange={(e) => setFormData({ ...formData, jefaturaId: e.target.value })}
                  placeholder="ID del jefe directo"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleCancelForm} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={formLoading} className="btn-primary">
                {formLoading ? 'Guardando...' : editingTrabajadorId ? 'Guardar cambios' : 'Guardar trabajador'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Estados de carga */}
      {cuentaMensaje && <p role="status">{cuentaMensaje}</p>}
      {loading && (
        <div className="trab-state">
          <div className="trab-spinner" aria-label="Cargando…" />
          <span>Cargando trabajadores…</span>
        </div>
      )}

      {error && !loading && (
        <div className="trab-state trab-state--error">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
          <button type="button" onClick={fetchTrabajadores}>Reintentar</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <p className="trab-count">
            Mostrando <strong>{filtrados.length}</strong> de {trabajadores.length} trabajadores
          </p>

          <div className="trab-table-wrap">
            <table className="trab-table">
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th>RUT</th>
                  <th>Email</th>
                  <th>Departamento</th>
                  <th>Cargo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="trab-table__empty">
                      No se encontraron trabajadores con ese criterio.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="trab-table__worker">
                          <div className="trab-table__avatar" aria-hidden="true">{initials(t)}</div>
                          <span>{t.nombre} {t.apellido}</span>
                        </div>
                      </td>
                      <td className="trab-table__rut">{t.rutTrabajador ?? '—'}</td>
                      <td>{t.email}</td>
                      <td>{departamentos.find((departamento) => departamento.id === t.departamentoId)?.nombre ?? '—'}</td>
                      <td>{cargos.find((cargo) => cargo.id === t.cargoId)?.nombre ?? '—'}</td>
                      <td>{rolLabel(t.rol)}</td>
                      <td>
                        <span className={`trab-badge trab-badge--${t.activo ? 'activo' : 'inactivo'}`}>
                          {t.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="trab-table__actions">
                          {t.activo && <button type="button" className="btn-secondary" disabled={cuentaEnProceso !== null} onClick={() => completarCuenta(t)}>
                            {cuentaEnProceso === t.id ? 'Sincronizando…' : 'Sincronizar cuenta'}
                          </button>}
                          <button type="button" className="trab-action-btn" title="Editar trabajador" aria-label={`Editar a ${t.nombre} ${t.apellido}`} onClick={() => handleEditarTrabajador(t)}>✎</button>
                          {t.activo && (
                            <button
                              type="button"
                              className="trab-action-btn trab-action-btn--danger"
                              title="Desactivar"
                              onClick={() => handleDesactivar(t.id)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default Trabajadores
