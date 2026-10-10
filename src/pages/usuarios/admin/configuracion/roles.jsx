import { useState, useEffect } from 'react'
import { listarRoles, crearRol, eliminarRol, listarPermisosRol, asignarPermiso, removerPermiso } from '../../../../services/rolesService'
import { listarPermisos } from '../../../../services/permisosService'
import { useAuth } from '../../../../context/AuthContext'
import './configuracion.css'
import ConfiguracionBackButton from './ConfiguracionBackButton'

function Roles({ onBack }) {
  const { user } = useAuth()
  const [roles, setRoles] = useState([])
  const [permisos, setPermisos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedRol, setSelectedRol] = useState(null)
  const [showPermisosModal, setShowPermisosModal] = useState(false)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  })

  const esAdminRrhh = ['Admin de RRHH', 'ADMIN_RRHH', 'ROLE_ADMIN_RRHH'].includes(user?.role)
  const rolesVisibles = esAdminRrhh ? roles.filter((rol) => rol.id !== 'superadmin') : roles

  useEffect(() => {
    fetchRoles()
    fetchPermisos()
  }, [])

  async function fetchRoles() {
    try {
      setLoading(true)
      setError(null)
      const data = await listarRoles()
      setRoles(data)
    } catch (err) {
      setError(err.message ?? 'Error al cargar roles')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPermisos() {
    try {
      const data = await listarPermisos()
      setPermisos(data)
    } catch (err) {
      console.error('Error al cargar permisos:', err)
    }
  }

  async function handleCrearRol(e) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    try {
      await crearRol(formData)
      setShowForm(false)
      setFormData({ nombre: '', descripcion: '' })
      fetchRoles()
    } catch (err) {
      setFormError(err.message || 'Error al crear rol')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleEliminarRol(id) {
    if (!confirm('¿Estás seguro de eliminar este rol?')) return
    try {
      await eliminarRol(id)
      fetchRoles()
    } catch (err) {
      alert(err.message ?? 'Error al eliminar rol')
    }
  }

  async function handleGestionarPermisos(rol) {
    setSelectedRol(rol)
    setShowPermisosModal(true)
  }

  function handleCancelForm() {
    setShowForm(false)
    setFormData({ nombre: '', descripcion: '' })
    setFormError('')
  }

  return (
    <div className="config-page">
      <header className="config-header">
        <div className="config-header__title">
          <ConfiguracionBackButton onBack={onBack} />
          <h1>Gestión de Roles</h1>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
          <span aria-hidden="true">＋</span> Nuevo rol
        </button>
      </header>

      {/* Formulario de nuevo rol */}
      {showForm && (
        <div className="form-card">
          <div className="form-card-header">
            <h3>Nuevo Rol</h3>
            <button type="button" onClick={handleCancelForm} className="btn-close">×</button>
          </div>
          <form onSubmit={handleCrearRol} className="form-card-body">
            {formError && <div className="form-error">{formError}</div>}

            <div className="form-group">
              <label htmlFor="nombre">Nombre del rol *</label>
              <input
                id="nombre"
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Admin RRHH, Jefatura, Trabajador"
              />
            </div>

            <div className="form-group">
              <label htmlFor="descripcion">Descripción *</label>
              <textarea
                id="descripcion"
                rows="3"
                required
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Describe las responsabilidades de este rol..."
              />
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleCancelForm} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={formLoading} className="btn-primary">
                {formLoading ? 'Guardando...' : 'Guardar rol'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Estados de carga */}
      {loading && (
        <div className="trab-state">
          <div className="trab-spinner" aria-label="Cargando…" />
          <span>Cargando roles…</span>
        </div>
      )}

      {error && !loading && (
        <div className="trab-state trab-state--error">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
          <button type="button" onClick={fetchRoles}>Reintentar</button>
        </div>
      )}

      {/* Lista de roles */}
      {!loading && !error && (
        <div className="config-list">
          {rolesVisibles.length === 0 ? (
            <div className="config-empty">
              No hay roles configurados. Crea el primer rol para comenzar.
            </div>
          ) : (
            rolesVisibles.map((rol) => (
              <div key={rol.id} className="config-card">
                <div className="config-card__header">
                  <div>
                    <h3>{rol.nombre}</h3>
                    <p>{rol.descripcion}</p>
                  </div>
                  <span className={`config-badge config-badge--${rol.estado === 'ACTIVO' ? 'active' : 'inactive'}`}>
                    {rol.estado}
                  </span>
                </div>
                <div className="config-card__actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleGestionarPermisos(rol)}
                  >
                    ☷ {rol.esPersonalizado ? 'Gestionar permisos' : 'Ver permisos'}
                  </button>
                  {rol.esPersonalizado && (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleEliminarRol(rol.id)}
                    >
                      ✕ Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal de gestión de permisos */}
      {showPermisosModal && selectedRol && (
        <PermisosModal
          rol={selectedRol}
          permisos={permisos}
          onClose={() => {
            setShowPermisosModal(false)
            setSelectedRol(null)
          }}
        />
      )}
    </div>
  )
}

export function PermisosModal({ rol, permisos, onClose }) {
  const [permisosRol, setPermisosRol] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPermisosRol()
  }, [rol.id])

  async function fetchPermisosRol() {
    try {
      setLoading(true)
      setError('')
      const data = await listarPermisosRol(rol.id)
      setPermisosRol(data)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los permisos del rol')
    } finally {
      setLoading(false)
    }
  }

  async function handleTogglePermiso(permisoId) {
    if (saving) return
    setSaving(true)
    const tienePermiso = permisosRol.some(p => p.id === permisoId)
    try {
      if (tienePermiso) {
        await removerPermiso(rol.id, permisoId)
      } else {
        await asignarPermiso(rol.id, permisoId)
      }
      await fetchPermisosRol()
    } catch (err) {
      alert(err.message ?? 'Error al actualizar permisos')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content--large" role="dialog" aria-modal="true" aria-label={`Permisos del rol: ${rol.nombre}`}>
        <div className="modal-header">
          <h2>Permisos del rol: {rol.nombre}</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="modal-body">
          <p>{rol.esPersonalizado
            ? 'Selecciona los permisos que tendrá este rol personalizado.'
            : 'Los permisos de los roles base son de solo lectura: los microservicios los validan según el rol incluido en el JWT.'}</p>
          {loading ? (
            <div className="trab-state">
              <div className="trab-spinner" />
              <span>Cargando permisos…</span>
            </div>
          ) : error ? (
            <div role="alert" className="form-error">{error}<button type="button" onClick={fetchPermisosRol}>Reintentar</button></div>
          ) : (
            <div className="permisos-list">
              {permisos.length === 0 && <p>No hay permisos disponibles para asignar.</p>}
              {permisos.map((permiso) => {
                const asignado = permisosRol.some(p => p.id === permiso.id)
                return (
                  <div key={permiso.id} className="permiso-item">
                    <div className="permiso-info">
                      <strong>{permiso.nombre}</strong>
                      <p>{permiso.descripcion}</p>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={asignado}
                        disabled={!rol.esPersonalizado || saving}
                        aria-label={`Asignar ${permiso.nombre}`}
                        onChange={() => handleTogglePermiso(permiso.id)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default Roles
