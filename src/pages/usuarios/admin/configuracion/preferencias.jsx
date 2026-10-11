import { useEffect, useState } from 'react'
import './configuracion.css'
import ConfiguracionBackButton from './ConfiguracionBackButton'

const STORAGE_KEY = 'rrhh_preferencias_configuracion'

const content = {
  seguridad: { eyebrow: 'Cuenta y acceso', title: 'Seguridad', description: 'Revisa cómo proteges el acceso a tu cuenta y administra las sesiones activas.' },
  facturacion: { eyebrow: 'Cuenta y suscripción', title: 'Planes y facturación', description: 'Consulta el plan actual, tus datos de cobro y el historial de documentos.' },
  aspecto: { eyebrow: 'Preferencias de la interfaz', title: 'Aspecto', description: 'Personaliza la apariencia de la plataforma para trabajar con mayor comodidad.' },
  idioma: { eyebrow: 'Preferencias de la interfaz', title: 'Idioma y región', description: 'Define cómo se muestran el idioma, las fechas y la zona horaria.' },
  accesibilidad: { eyebrow: 'Preferencias de la interfaz', title: 'Accesibilidad', description: 'Ajusta la interfaz para que se adapte mejor a tus necesidades.' },
}

const initial = { dosFactores: false, tema: 'sistema', tamanoTexto: 'normal', idioma: 'es-CL', zonaHoraria: 'America/Santiago', formatoFecha: 'dd/mm/aaaa', altoContraste: false, reducirAnimaciones: false }

function readSettings() {
  try { return { ...initial, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } } catch { return initial }
}

function Preferencias({ section, onBack }) {
  const [settings, setSettings] = useState(initial)
  const [saved, setSaved] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')

  useEffect(() => {
    const next = readSettings()
    setSettings(next)
    applyVisualSettings(next)
  }, [])

  function update(patch) {
    const next = { ...settings, ...patch }
    setSettings(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    applyVisualSettings(next)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  const info = content[section]
  return (
    <section className="config-page config-page--preferences" aria-labelledby={`config-${section}-title`}>
      <header className="config-header">
        <div className="config-header__title">
          <ConfiguracionBackButton onBack={onBack} />
          <div><span className="config-header__eyebrow">{info.eyebrow}</span><h1 id={`config-${section}-title`}>{info.title}</h1><p className="config-header__description">{info.description}</p></div>
        </div>
      </header>
      {section === 'seguridad' && <Security settings={settings} update={update} passwordMessage={passwordMessage} setPasswordMessage={setPasswordMessage} />}
      {section === 'facturacion' && <Billing />}
      {section === 'aspecto' && <Appearance settings={settings} update={update} />}
      {section === 'idioma' && <Language settings={settings} update={update} />}
      {section === 'accesibilidad' && <Accessibility settings={settings} update={update} />}
      {saved && <p className="profile-card__saved" role="status">Preferencias guardadas en este navegador.</p>}
    </section>
  )
}

function Security({ settings, update, passwordMessage, setPasswordMessage }) {
  function submit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (data.get('nueva') !== data.get('confirmacion')) return setPasswordMessage('Las contraseñas no coinciden.')
    setPasswordMessage('Por seguridad, el cambio de contraseña se realiza desde Cognito al iniciar sesión.')
  }
  return <div className="config-preferences">
    <section className="config-panel"><div><h2>Verificación en dos pasos</h2><p>Solicita una verificación adicional al iniciar sesión.</p></div><label className="config-switch"><input type="checkbox" checked={settings.dosFactores} onChange={(e) => update({ dosFactores: e.target.checked })} /><span /><strong>{settings.dosFactores ? 'Activada' : 'Desactivada'}</strong></label></section>
    <form className="config-panel config-panel--stack" onSubmit={submit}><div><h2>Contraseña</h2><p>Tu contraseña se administra de forma segura en Cognito.</p></div><div className="form-row"><div className="form-group"><label htmlFor="new-password">Nueva contraseña</label><input id="new-password" name="nueva" type="password" minLength="8" required autoComplete="new-password" /></div><div className="form-group"><label htmlFor="confirm-password">Confirmar contraseña</label><input id="confirm-password" name="confirmacion" type="password" minLength="8" required autoComplete="new-password" /></div></div>{passwordMessage && <p className="config-inline-message">{passwordMessage}</p>}<div className="form-actions"><button className="btn-secondary" type="submit">Validar cambio</button></div></form>
    <section className="config-panel config-panel--stack"><div><h2>Sesiones activas</h2><p>Este dispositivo tiene una sesión activa.</p></div><div className="config-session"><span className="config-session__device">◉ Este navegador</span><span>Sesión actual</span></div></section>
  </div>
}

function Billing() {
  return <div className="config-preferences config-preferences--billing"><section className="config-plan"><div><span className="config-header__eyebrow">Plan actual</span><h2>Plan Profesional</h2><p>Gestión de trabajadores, contratos, asistencia y ausencias.</p></div><strong>Activo</strong></section><section className="config-panel config-panel--stack"><div><h2>Método de pago</h2><p>Aún no has registrado un método de pago.</p></div><button className="btn-secondary" type="button" onClick={() => window.alert('La integración de pagos estará disponible próximamente.')}>Agregar método de pago</button></section><section className="config-panel config-panel--stack"><div><h2>Facturas y recibos</h2><p>No hay documentos de cobro disponibles todavía.</p></div><div className="config-empty">Cuando se emita una factura, aparecerá aquí para su descarga.</div></section></div>
}

function Appearance({ settings, update }) {
  return <div className="config-preferences"><section className="config-panel config-panel--stack"><div><h2>Tema</h2><p>Selecciona la apariencia general de la plataforma.</p></div><div className="config-choice-grid">{[['sistema', 'Usar configuración del sistema'], ['claro', 'Modo claro'], ['oscuro', 'Modo oscuro']].map(([value, label]) => <label className={`config-choice${settings.tema === value ? ' config-choice--selected' : ''}`} key={value}><input type="radio" name="tema" value={value} checked={settings.tema === value} onChange={() => update({ tema: value })} /><span>{label}</span></label>)}</div></section><section className="config-panel"><div><h2>Tamaño del texto</h2><p>Escoge una escala cómoda para leer.</p></div><select className="config-select" value={settings.tamanoTexto} onChange={(e) => update({ tamanoTexto: e.target.value })}><option value="pequeno">Pequeño</option><option value="normal">Normal</option><option value="grande">Grande</option></select></section></div>
}

function Language({ settings, update }) {
  return <div className="config-preferences"><section className="config-panel config-panel--stack"><div><h2>Configuración regional</h2><p>Estos ajustes determinan cómo se presentan fechas, horas y textos.</p></div><div className="form-row"><div className="form-group"><label htmlFor="language">Idioma</label><select id="language" value={settings.idioma} onChange={(e) => update({ idioma: e.target.value })}><option value="es-CL">Español (Chile)</option><option value="es">Español</option><option value="en-US">English (United States)</option></select></div><div className="form-group"><label htmlFor="timezone">Zona horaria</label><select id="timezone" value={settings.zonaHoraria} onChange={(e) => update({ zonaHoraria: e.target.value })}><option value="America/Santiago">Santiago, Chile</option><option value="America/Argentina/Buenos_Aires">Buenos Aires, Argentina</option><option value="America/Lima">Lima, Perú</option></select></div></div><div className="form-group"><label htmlFor="date-format">Formato de fecha</label><select id="date-format" value={settings.formatoFecha} onChange={(e) => update({ formatoFecha: e.target.value })}><option value="dd/mm/aaaa">dd/mm/aaaa</option><option value="mm/dd/aaaa">mm/dd/aaaa</option><option value="aaaa-mm-dd">aaaa-mm-dd</option></select></div></section></div>
}

function Accessibility({ settings, update }) {
  return <div className="config-preferences"><section className="config-panel"><div><h2>Alto contraste</h2><p>Refuerza la diferencia visual entre textos, fondos y controles.</p></div><label className="config-switch"><input type="checkbox" checked={settings.altoContraste} onChange={(e) => update({ altoContraste: e.target.checked })} /><span /><strong>{settings.altoContraste ? 'Activado' : 'Desactivado'}</strong></label></section><section className="config-panel"><div><h2>Reducir animaciones</h2><p>Minimiza los movimientos decorativos de la interfaz.</p></div><label className="config-switch"><input type="checkbox" checked={settings.reducirAnimaciones} onChange={(e) => update({ reducirAnimaciones: e.target.checked })} /><span /><strong>{settings.reducirAnimaciones ? 'Activado' : 'Desactivado'}</strong></label></section><section className="config-panel"><div><h2>Tamaño del texto</h2><p>También puedes ajustar esta preferencia desde Aspecto.</p></div><select className="config-select" value={settings.tamanoTexto} onChange={(e) => update({ tamanoTexto: e.target.value })}><option value="pequeno">Pequeño</option><option value="normal">Normal</option><option value="grande">Grande</option></select></section></div>
}

function applyVisualSettings(settings) {
  const root = document.documentElement
  root.dataset.theme = settings.tema
  root.dataset.textSize = settings.tamanoTexto
  root.dataset.highContrast = String(settings.altoContraste)
  root.dataset.reduceMotion = String(settings.reducirAnimaciones)
}

export default Preferencias
