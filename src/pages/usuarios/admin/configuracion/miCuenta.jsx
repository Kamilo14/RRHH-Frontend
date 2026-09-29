import { useEffect, useState } from 'react'
import { useAuth } from '../../../../context/AuthContext'
import './configuracion.css'

const profileStorageKey = (userId) => `rrhh_perfil_${userId}`

function MiCuenta() {
  const { user } = useAuth()
  const [formData, setFormData] = useState({ nombre: '', email: '', celular: '', telefonoAlternativo: '', cargo: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return

    const savedProfile = localStorage.getItem(profileStorageKey(user.userId))
    const extraData = savedProfile ? JSON.parse(savedProfile) : {}
    setFormData({
      nombre: user.nombre || '',
      email: user.email || '',
      celular: '',
      telefonoAlternativo: '',
      cargo: '',
      ...extraData,
    })
  }, [user])

  function handleChange(event) {
    const { name, value } = event.target
    setSaved(false)
    setFormData((current) => ({ ...current, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!user) return

    // El servicio de identidad aún no expone actualización de perfil.
    // Conservamos los campos complementarios para que no se pierdan mientras se integra ese endpoint.
    localStorage.setItem(profileStorageKey(user.userId), JSON.stringify(formData))
    setSaved(true)
  }

  return (
    <section className="config-page" aria-labelledby="mi-cuenta-title">
      <div className="config-header">
        <div>
          <h1 id="mi-cuenta-title">Mi cuenta</h1>
          <p className="config-header__description">Administra tus datos personales y de contacto.</p>
        </div>
      </div>

      <form className="profile-card" onSubmit={handleSubmit}>
        <div className="profile-card__identity">
          <div className="profile-card__avatar" aria-hidden="true">{formData.nombre.slice(0, 1).toUpperCase() || 'U'}</div>
          <div>
            <h2>{formData.nombre || 'Usuario'}</h2>
            <p>{user?.role || 'Usuario'} · {user?.tenantSlug || 'Empresa'}</p>
          </div>
        </div>

        <div className="profile-card__section">
          <div>
            <h3>Información personal</h3>
            <p>Estos datos se usan para identificarte dentro de la plataforma.</p>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="profile-nombre">Nombre completo</label>
              <input id="profile-nombre" name="nombre" value={formData.nombre} onChange={handleChange} autoComplete="name" />
            </div>
            <div className="form-group">
              <label htmlFor="profile-cargo">Cargo</label>
              <input id="profile-cargo" name="cargo" value={formData.cargo} onChange={handleChange} placeholder="Ej.: Administrador de RRHH" autoComplete="organization-title" />
            </div>
          </div>
        </div>

        <div className="profile-card__section">
          <div>
            <h3>Datos de contacto</h3>
            <p>Mantén esta información actualizada para recibir comunicaciones importantes.</p>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="profile-email">Correo electrónico</label>
              <input id="profile-email" name="email" type="email" value={formData.email} onChange={handleChange} autoComplete="email" />
            </div>
            <div className="form-group">
              <label htmlFor="profile-celular">Celular</label>
              <input id="profile-celular" name="celular" type="tel" value={formData.celular} onChange={handleChange} placeholder="+56 9 1234 5678" autoComplete="tel" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="profile-telefono">Teléfono alternativo <span>(opcional)</span></label>
              <input id="profile-telefono" name="telefonoAlternativo" type="tel" value={formData.telefonoAlternativo} onChange={handleChange} placeholder="+56 2 2345 6789" />
            </div>
          </div>
        </div>

        <div className="profile-card__notice">
          <span aria-hidden="true">i</span>
          Los cambios se guardan en este navegador hasta que el servicio de identidad habilite la sincronización del perfil.
        </div>

        <div className="form-actions">
          {saved && <span className="profile-card__saved" role="status">Cambios guardados</span>}
          <button type="submit" className="btn-primary">Guardar cambios</button>
        </div>
      </form>
    </section>
  )
}

export default MiCuenta
