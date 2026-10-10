import { useEffect, useMemo, useState } from 'react'
import { listarNotificaciones, marcarLeida } from '../../../../services/notificacionesService'
import '../../../../styles/notificaciones.css'

function fechaRelativa(fecha) {
  const instante = new Date(fecha)
  const diferencia = Date.now() - instante.getTime()
  const minutos = Math.floor(diferencia / 60_000)
  if (minutos < 1) return 'Ahora'
  if (minutos < 60) return `Hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `Hace ${horas} h`
  return instante.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function etiquetaCanal(canal) {
  const nombres = { EMAIL: 'Correo', INTERNO: 'Plataforma', SISTEMA: 'Sistema' }
  return nombres[canal?.toUpperCase()] ?? canal ?? 'Plataforma'
}

function Notificaciones({ onChange }) {
  const [notificaciones, setNotificaciones] = useState([])
  const [filtro, setFiltro] = useState('todas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function cargar() {
    try {
      setLoading(true)
      setError(null)
      setNotificaciones(await listarNotificaciones())
    } catch (err) {
      setError(err.message ?? 'No fue posible cargar las notificaciones.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const pendientes = notificaciones.filter((notificacion) => notificacion.estado === 'PENDIENTE').length
  const visibles = useMemo(() => filtro === 'no-leidas'
    ? notificaciones.filter((notificacion) => notificacion.estado === 'PENDIENTE')
    : notificaciones, [notificaciones, filtro])

  async function cambiarLectura(notificacion) {
    const leido = notificacion.estado === 'PENDIENTE'
    try {
      const actualizada = await marcarLeida(notificacion.id, { leido })
      setNotificaciones((actuales) => actuales.map((item) => item.id === actualizada.id ? actualizada : item))
      onChange?.()
    } catch (err) {
      setError(err.message ?? 'No fue posible actualizar la notificación.')
    }
  }

  return (
    <section className="notif-page">
      <div className="notif-toolbar">
        <div className="notif-tabs" role="tablist" aria-label="Filtrar notificaciones">
          <button type="button" role="tab" aria-selected={filtro === 'todas'} className={filtro === 'todas' ? 'notif-tab notif-tab--active' : 'notif-tab'} onClick={() => setFiltro('todas')}>Todas</button>
          <button type="button" role="tab" aria-selected={filtro === 'no-leidas'} className={filtro === 'no-leidas' ? 'notif-tab notif-tab--active' : 'notif-tab'} onClick={() => setFiltro('no-leidas')}>No leídas {pendientes > 0 && <span>{pendientes}</span>}</button>
        </div>
        <button type="button" className="notif-reload" onClick={cargar}>Actualizar</button>
      </div>

      {loading && <div className="notif-state">Cargando notificaciones…</div>}
      {error && !loading && <div className="notif-state notif-state--error">{error} <button type="button" onClick={cargar}>Reintentar</button></div>}
      {!loading && !error && visibles.length === 0 && <div className="notif-state">No tienes notificaciones {filtro === 'no-leidas' ? 'sin leer' : 'todavía'}.</div>}

      {!loading && !error && visibles.length > 0 && (
        <div className="notif-list">
          {visibles.map((notificacion) => {
            const pendiente = notificacion.estado === 'PENDIENTE'
            return (
              <article key={notificacion.id} className={`notif-item${pendiente ? ' notif-item--unread' : ''}`}>
                <div className="notif-item__indicator" aria-hidden="true" />
                <div className="notif-item__content">
                  <div className="notif-item__meta"><span>{etiquetaCanal(notificacion.canal)}</span><time dateTime={notificacion.creadoEn}>{fechaRelativa(notificacion.creadoEn)}</time></div>
                  <h2>{notificacion.asunto}</h2>
                  <p>{notificacion.cuerpo}</p>
                </div>
                <button type="button" className="notif-item__action" onClick={() => cambiarLectura(notificacion)}>
                  {pendiente ? 'Marcar como leída' : 'Marcar como no leída'}
                </button>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default Notificaciones
