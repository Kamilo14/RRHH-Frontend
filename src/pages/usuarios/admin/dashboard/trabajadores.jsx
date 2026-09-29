import { useState, useEffect } from 'react'
import { listarTrabajadores, desactivarTrabajador } from '../../../../services/trabajadoresService'
import TrabajadorFormModal from '../../../../components/TrabajadorFormModal'
import '../../../../styles/trabajadores.css'

function Trabajadores() {
  const [trabajadores, setTrabajadores] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [search, setSearch]           = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [showModal, setShowModal]     = useState(false)

  useEffect(() => {
    fetchTrabajadores()
  }, [])

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
          </div> onClick={() => setShowModal(true)}
        </div>
        <button id="btn-nuevo-trabajador" type="button" className="trab-btn-primary">
          <span aria-hidden="true">＋</span> Nuevo trabajador
        </button>
      </div>

      {/* Estados de carga */}
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

      {showModal && (
        <TrabajadorFormModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            fetchTrabajadores()
            setShowModal(false)
          }}
        />
      )}
        </>
      )}
    </div>
  )
}

export default Trabajadores
