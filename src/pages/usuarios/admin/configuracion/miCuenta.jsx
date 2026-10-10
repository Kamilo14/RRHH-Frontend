import { useEffect, useState } from 'react'
import { useAuth } from '../../../../context/AuthContext'
import './configuracion.css'
import ConfiguracionBackButton from './ConfiguracionBackButton'

const profileStorageKey = (userId) => `rrhh_perfil_${userId}`
const roleLabel = (role) => ({
  ADMIN_RRHH: 'Admin de RRHH',
  'Admin de RRHH': 'Admin de RRHH',
  JEFATURA: 'Jefatura',
  Jefatura: 'Jefatura',
  TRABAJADOR: 'Trabajador',
  Trabajador: 'Trabajador',
  SUPERADMIN: 'Superadmin',
  SuperAdmin: 'Superadmin',
}[role] || role || 'Usuario')

function MiCuenta({ onBack }) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({ nombre: '', email: '', celular: '', telefonoAlternativo: '', cargo: '' })
  const [draft, setDraft] = useState(formData)
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    const stored = localStorage.getItem(profileStorageKey(user.userId))
    const profile = stored ? JSON.parse(stored) : {}
    const next = { nombre: user.nombre || '', email: user.email || '', celular: '', telefonoAlternativo: '', cargo: '', ...profile }
    setFormData(next)
    setDraft(next)
  }, [user])

  function handleChange(event) {
    setSaved(false)
    setDraft((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!user) return
    localStorage.setItem(profileStorageKey(user.userId), JSON.stringify(draft))
    setFormData(draft)
    setEditing(false)
    setSaved(true)
  }

  function cancelEditing() {
    setDraft(formData)
    setEditing(false)
  }

  const displayName = formData.nombre || 'Usuario'
  const initials = displayName.trim().slice(0, 1).toUpperCase() || 'U'

  return (
    <section className="config-page" aria-labelledby="mi-cuenta-title">
      <header className="config-header">
        <div className="config-header__title">
          <ConfiguracionBackButton onBack={onBack} />
          <div>
          <span className="config-header__eyebrow">Configuración de cuenta</span>
          <h1 id="mi-cuenta-title">Mi cuenta</h1>
          <p className="config-header__description">Consulta tu perfil y edita solo la información personal que necesitas mantener actualizada.</p>
          </div>
        </div>
      </header>

      <div className="profile-card">
        <div className="profile-card__hero">
          <div className="profile-card__identity">
            <div className="profile-card__avatar" aria-hidden="true">{initials}</div>
            <div>
              <span className="profile-card__eyebrow">Perfil activo</span>
              <h2>{displayName}</h2>
              <p>{formData.email || 'Correo no disponible'}</p>
            </div>
          </div>
          <div className="profile-card__summary">
            <div><span>Rol</span><strong className="profile-role-badge">{roleLabel(user?.role)}</strong></div>
            <div><span>Empresa</span><strong>{user?.tenantSlug || 'No asignada'}</strong></div>
          </div>
          {!editing && (
            <button
              type="button"
              className="profile-card__edit-button"
              onClick={() => { setDraft(formData); setEditing(true) }}
            >
              Editar información
            </button>
          )}
        </div>

        {!editing ? (
          <div className="profile-card__section profile-readonly" aria-label="Información del perfil">
            <div className="profile-card__section-heading"><h3>Información del perfil</h3><p>Estos datos se muestran según tu identidad y preferencias guardadas.</p></div>
            <div className="profile-readonly__grid">
              <div><span>Nombre completo</span><strong>{formData.nombre || 'Sin informar'}</strong></div>
              <div><span>Cargo</span><strong>{formData.cargo || 'Sin informar'}</strong></div>
              <div><span>Celular</span><strong>{formData.celular || 'Sin informar'}</strong></div>
              <div><span>Teléfono alternativo</span><strong>{formData.telefonoAlternativo || 'Sin informar'}</strong></div>
            </div>
            {saved && <p className="profile-card__saved" role="status">Cambios guardados en este navegador.</p>}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="profile-card__section">
              <div className="profile-card__section-heading"><h3>Editar información personal</h3><p>El rol, la empresa y el correo de identidad no se pueden cambiar desde aquí.</p></div>
              <div className="form-row">
                <div className="form-group"><label htmlFor="profile-nombre">Nombre completo</label><input id="profile-nombre" name="nombre" value={draft.nombre} onChange={handleChange} autoComplete="name" /></div>
                <div className="form-group"><label htmlFor="profile-cargo">Cargo</label><input id="profile-cargo" name="cargo" value={draft.cargo} onChange={handleChange} placeholder="Ej.: Administrador de RRHH" /></div>
              </div>
            </div>
            <div className="profile-card__section">
              <div className="profile-card__section-heading"><h3>Datos de contacto</h3><p>Estos datos complementarios se guardan localmente mientras se habilita la sincronización con Identity.</p></div>
              <div className="form-row">
                <div className="form-group"><label htmlFor="profile-celular">Celular</label><input id="profile-celular" name="celular" type="tel" value={draft.celular} onChange={handleChange} placeholder="+56 9 1234 5678" /></div>
                <div className="form-group"><label htmlFor="profile-telefono">Teléfono alternativo</label><input id="profile-telefono" name="telefonoAlternativo" type="tel" value={draft.telefonoAlternativo} onChange={handleChange} placeholder="+56 2 2345 6789" /></div>
              </div>
            </div>
            <div className="form-actions"><button type="button" className="btn-secondary" onClick={cancelEditing}>Cancelar</button><button type="submit" className="btn-primary">Guardar cambios</button></div>
          </form>
        )}
      </div>
    </section>
  )
}

export default MiCuenta
