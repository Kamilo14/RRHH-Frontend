import './configuracion.css'
import ConfiguracionBackButton from './ConfiguracionBackButton'
import { useAuth } from '../../../../context/AuthContext'
import { canAccessSection } from '../../../../security/accessControl'

const sections = [
  {
    title: 'Gestión de Cuenta',
    items: [
      { id: 'configuracion-cuenta', label: 'Perfil', description: 'Edita tu foto de avatar, nombre, correo y datos personales o profesionales.', icon: '◎' },
      { id: 'seguridad', label: 'Seguridad', description: 'Cambia tu contraseña, configura 2FA y revisa tus sesiones activas.', icon: '⌾' },
      { id: 'facturacion', label: 'Planes y Facturación', description: 'Administra el plan SaaS, facturas, recibos y medios de pago.', icon: '$' },
      { id: 'configuracion-roles', label: 'Roles', description: 'Administra los roles disponibles para tu organización.', icon: '♙' },
    ],
  },
  {
    title: 'Preferencias de la Interfaz',
    items: [
      { id: 'aspecto', label: 'Aspecto', description: 'Elige entre modo claro, oscuro o sincronizado con tu sistema.', icon: '◐' },
      { id: 'idioma', label: 'Idioma y Región', description: 'Configura idioma, formato de fecha, hora y zona horaria.', icon: '文' },
      { id: 'accesibilidad', label: 'Accesibilidad', description: 'Ajusta tamaño de letra, contraste y animaciones reducidas.', icon: '◉' },
    ],
  },
]

function Configuracion({ onSectionChange, onBack }) {
  const { user } = useAuth()
  function openSection(id) {
    if (['configuracion-cuenta', 'configuracion-roles', 'seguridad', 'facturacion', 'aspecto', 'idioma', 'accesibilidad'].includes(id)) {
      onSectionChange(id)
      return
    }
    window.alert('Esta sección estará disponible próximamente.')
  }

  return (
    <section className="settings-page" aria-labelledby="configuracion-title">
      <header className="config-header">
        <div className="config-header__title">
          <ConfiguracionBackButton onBack={onBack} label="Volver al resumen general" />
          <div>
            <h1 id="configuracion-title">Configuración</h1>
            <p className="config-header__description">Administra la cuenta, los accesos y las preferencias de la plataforma.</p>
          </div>
        </div>
      </header>
      <div className="settings-groups">
        {sections.map((section) => {
          const items = section.items.filter((item) => canAccessSection(user?.role, item.id))
          if (items.length === 0) return null
          return (
          <section className="settings-group" key={section.title} aria-labelledby={`settings-${section.title}`}>
            <h3 id={`settings-${section.title}`}>{section.title}</h3>
            <div className="settings-list">
              {items.map((item) => (
                <button className="settings-row" type="button" key={item.id} onClick={() => openSection(item.id)}>
                  <span className="settings-row__icon" aria-hidden="true">{item.icon}</span>
                  <span className="settings-row__content">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <span className="settings-row__arrow" aria-hidden="true">&gt;</span>
                </button>
              ))}
            </div>
          </section>
          )
        })}
      </div>
    </section>
  )
}

export default Configuracion
