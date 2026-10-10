import { useState, useEffect } from 'react'
import { listarPermisos, crearPermiso } from '../../../../services/permisosService'
import { listarRoles } from '../../../../services/rolesService'
import { useAuth } from '../../../../context/AuthContext'
import { PermisosModal } from './roles'
import './configuracion.css'
import ConfiguracionBackButton from './ConfiguracionBackButton'

function Permisos({ onBack }) {
  const { user } = useAuth()
  const [permisos, setPermisos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [roles, setRoles] = useState([])
  const [selectedRol, setSelectedRol] = useState(null)
  const [rolId, setRolId] = useState('')

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
  })

  const esAdminRrhh = ['Admin de RRHH', 'ADMIN_RRHH', 'ROLE_ADMIN_RRHH'].includes(user?.role)
  const rolesVisibles = esAdminRrhh ? roles.filter((rol) => rol.id !== 'superadmin') : roles

  useEffect(() => {
    fetchPermisos()
  }, [])

  async function fetchPermisos() {
    try {
      setLoading(true)
      setError(null)
      const [data, rolesData] = await Promise.all([listarPermisos(), listarRoles()])
      setPermisos(data)
      setRoles(rolesData)
    } catch (err) {
      setError(err.message ?? 'Error al cargar permisos')
    } finally {
      setLoading(false)
    }
  }

  async function handleCrearPermiso(e) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    try {
      await crearPermiso(formData)
      setShowForm(false)
      setFormData({ nombre: '', descripcion: '', categoria: '' })
      fetchPermisos()
    } catch (err) {
      setFormError(err.message || 'Error al crear permiso')
    } finally {
      setFormLoading(false)
    }
  }

  function handleCancelForm() {
    setShowForm(false)
    setFormData({ nombre: '', descripcion: '', categoria: '' })
    setFormError('')
  }

  const permisosPorCategoria = permisos.reduce((acc, permiso) => {
    const categoria = permiso.categoria || 'General'
    if (!acc[categoria]) acc[categoria] = []
    acc[categoria].push(permiso)
    return acc
  }, {})

  return (
    <div className="config-page">
      <header className="config-header">
        <div className="config-header__title">
          <ConfiguracionBackButton onBack={onBack} />
          <h1>Catálogo de Permisos</h1>
        </div>
      </header>

      {!loading && !error && (
        <section className="form-card profile-card__section" aria-label="Asignar permisos a un rol">
          <h2>Consultar permisos por rol</h2>
          <div className="form-group">
            <label htmlFor="permiso-rol">Rol</label>
            <select id="permiso-rol" value={rolId} onChange={(event) => setRolId(event.target.value)}>
              <option value="">Selecciona un rol</option>
              {rolesVisibles.map((rol) => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}
            </select>
          </div>
          <button type="button" className="btn-primary" disabled={!rolId} onClick={() => setSelectedRol(rolesVisibles.find((rol) => rol.id === rolId))}>
            Ver permisos
          </button>
          {rolesVisibles.length === 0 && <p>No hay roles disponibles para consultar.</p>}
        </section>
      )}
      {selectedRol && <PermisosModal rol={selectedRol} permisos={permisos} onClose={() => setSelectedRol(null)} />}

      {/* Formulario de nuevo permiso */}
      {showForm && (
        <div className="form-card">
          <div className="form-card-header">
            <h3>Nuevo Permiso</h3>
            <button type="button" onClick={handleCancelForm} className="btn-close">×</button>
          </div>
          <form onSubmit={handleCrearPermiso} className="form-card-body">
            {formError && <div className="form-error">{formError}</div>}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombre">Nombre del permiso *</label>
                <input
                  id="nombre"
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: trabajadores.crear, contratos.leer"
                />
              </div>

              <div className="form-group">
                <label htmlFor="categoria">Categoría (opcional)</label>
                <input
                  id="categoria"
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  placeholder="Ej: Trabajadores, Contratos, Asistencia"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="descripcion">Descripción *</label>
              <textarea
                id="descripcion"
                rows="3"
                required
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Describe qué permite este permiso..."
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleCancelForm} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={formLoading} className="btn-primary">
                {formLoading ? 'Guardando...' : 'Guardar permiso'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Estados de carga */}
      {loading && (
        <div className="trab-state">
          <div className="trab-spinner" aria-label="Cargando…" />
          <span>Cargando permisos…</span>
        </div>
      )}

      {error && !loading && (
        <div className="trab-state trab-state--error">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
          <button type="button" onClick={fetchPermisos}>Reintentar</button>
        </div>
      )}

      {/* Lista de permisos por categoría */}
      {!loading && !error && (
        <div className="permisos-container">
          {Object.keys(permisosPorCategoria).length === 0 ? (
            <div className="config-empty">
              No hay permisos configurados. Crea el primer permiso para comenzar.
            </div>
          ) : (
            Object.entries(permisosPorCategoria).map(([categoria, permisosCat]) => (
              <div key={categoria} className="permisos-categoria">
                <h3>{categoria}</h3>
                <div className="config-list">
                  {permisosCat.map((permiso) => (
                    <div key={permiso.id} className="config-card config-card--compact">
                      <div className="config-card__header">
                        <div>
                          <strong>{permiso.nombre}</strong>
                          <p>{permiso.descripcion}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default Permisos
