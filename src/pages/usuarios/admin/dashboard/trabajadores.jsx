import { useState, useEffect } from 'react'
import { listarTrabajadores, desactivarTrabajador, crearTrabajadorConCuenta, CuentaPendienteError, listarDepartamentos, listarCargos } from '../../../../services/trabajadoresService'
import '../../../../styles/trabajadores.css'
import '../../../../styles/modal.css'

function Trabajadores() {
  const [trabajadores, setTrabajadores] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [search, setSearch]           = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [showForm, setShowForm]       = useState(false)
  const [departamentos, setDepartamentos] = useState([])
  const [cargos, setCargos]           = useState([])
  const [formError, setFormError]     = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [cuentaPendiente, setCuentaPendiente] = useState(null)
  const [cuentaEnProceso, setCuentaEnProceso] = useState(null)
  const [cuentaMensaje, setCuentaMensaje] = useState('')

  async function completarCuenta(trabajador) {
    setCuentaEnProceso(trabajador.id)
    setCuentaMensaje('')
    try {
      await crearTrabajadorConCuenta({}, trabajador)
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
  })

  useEffect(() => {
    fetchTrabajadores()
    cargarCatalogos()
  }, [])

  async function cargarCatalogos() {
    try {
      const [deps, car] = await Promise.all([listarDepartamentos(), listarCargos()])
      setDepartamentos(deps)
      setCargos(car)
    } catch (err) {
      console.error('Error al cargar catálogos:', err)
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
      await crearTrabajadorConCuenta(formData, cuentaPendiente)
      setCuentaPendiente(null)
      setShowForm(false)
      setFormData({
        nombre: '',
        apellido: '',
        rutTrabajador: '',
        email: '',
        telefono: '',
        departamentoId: '',
        cargoId: '',
        jefaturaId: '',
      })
      fetchTrabajadores()
    } catch (err) {
      if (err instanceof CuentaPendienteError) setCuentaPendiente(err.trabajador)
      setFormError(err.message || 'Error al crear trabajador')
    } finally {
      setFormLoading(false)
    }
  }

  function handleCancelForm() {
    if (cuentaPendiente) fetchTrabajadores()
    setCuentaPendiente(null)
    setShowForm(false)
    setFormData({
      nombre: '',
      apellido: '',
      rutTrabajador: '',
      email: '',
      telefono: '',
      departamentoId: '',
      cargoId: '',
      jefaturaId: '',
    })
    setFormError('')
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
            <h3>Nuevo Trabajador</h3>
            <button type="button" onClick={handleCancelForm} className="btn-close">×</button>
          </div>
          <form onSubmit={handleCrearTrabajador} className="form-card-body">
            {formError && <div className="form-error">{formError}</div>}

            <div className="form-row">
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
                <select
                  id="departamento"
                  value={formData.departamentoId}
                  onChange={(e) => setFormData({ ...formData, departamentoId: e.target.value })}
                >
                  <option value="">Seleccionar departamento...</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cargo">Cargo (opcional)</label>
                <select
                  id="cargo"
                  value={formData.cargoId}
                  onChange={(e) => setFormData({ ...formData, cargoId: e.target.value })}
                >
                  <option value="">Seleccionar cargo...</option>
                  {cargos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
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
                {formLoading ? 'Guardando...' : 'Guardar trabajador'}
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
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="trab-table__empty">
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
                      <td>{t.departamentoId ?? '—'}</td>
                      <td>{t.cargoId ?? '—'}</td>
                      <td>
                        <span className={`trab-badge trab-badge--${t.activo ? 'activo' : 'inactivo'}`}>
                          {t.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="trab-table__actions">
                          {t.activo && <button type="button" className="btn-secondary" disabled={cuentaEnProceso !== null} onClick={() => completarCuenta(t)}>
                            {cuentaEnProceso === t.id ? 'Creando cuenta…' : 'Crear / reintentar cuenta'}
                          </button>}
                          <button type="button" className="trab-action-btn" title="Ver detalle">✎</button>
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
