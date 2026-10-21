import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../../context/AuthContext'
import { listarNotificaciones, marcarLeida } from '../../../../services/notificacionesService'
import { NOMBRE_SECCION, seccionDestino } from '../../../../utils/notificacionesNavegacion'
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

function Notificaciones({ onChange, onNavigate }) {
  const { user } = useAuth()
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

  async function abrir(notificacion, destino) {
    if (notificacion.estado === 'PENDIENTE') {
      try {
        const actualizada = await marcarLeida(notificacion.id, { leido: true })
        setNotificaciones((actuales) => actuales.map((item) => item.id === actualizada.id ? actualizada : item))
        onChange?.()
      } catch {
        // No bloquea la redirección: la notificación queda como no leída.
      }
    }
    onNavigate?.(destino)
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
            const destino = onNavigate ? seccionDestino(notificacion.tipoEvento, user?.role) : null
            const abrirDestino = destino ? () => abrir(notificacion, destino) : undefined
            return (
              <article key={notificacion.id} className={`notif-item${pendiente ? ' notif-item--unread' : ''}${destino ? ' notif-item--link' : ''}`}>
                <div className="notif-item__indicator" aria-hidden="true" />
                <div
                  className="notif-item__content"
                  {...(destino && {
                    role: 'link',
                    tabIndex: 0,
                    'aria-label': `${notificacion.asunto}. Ir a ${NOMBRE_SECCION[destino]}`,
                    onClick: abrirDestino,
                    onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); abrirDestino() } },
                  })}
                >
                  <div className="notif-item__meta"><span>{etiquetaCanal(notificacion.canal)}</span><time dateTime={notificacion.creadoEn}>{fechaRelativa(notificacion.creadoEn)}</time></div>
                  <h2>{notificacion.asunto}</h2>
                  <p>{notificacion.cuerpo}</p>
                  {destino && <span className="notif-item__goto">Ir a {NOMBRE_SECCION[destino]} →</span>}
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
