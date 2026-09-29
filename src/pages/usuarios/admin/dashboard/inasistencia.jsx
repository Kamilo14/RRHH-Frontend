import { useState, useEffect } from 'react'
import { listarSolicitudesAusencia, aprobarSolicitud, rechazarSolicitud } from '../../../../services/ausenciasService'
import AusenciaFormModal from '../../../../components/AusenciaFormModal'
import '../../../../styles/inasistencia.css'

const estadoColor = {
  PENDIENTE: 'orange',
  APROBADA:  'green',
  RECHAZADA: 'red',
}

const estadoLabel = {
  PENDIENTE: 'Pendiente',
  APROBADA:  'Aprobada',
  RECHAZADA: 'Rechazada',
}

function calcularDias(fechaInicio, fechaFin) {
  const inicio = new Date(fechaInicio)
  const fin    = new Date(fechaFin)
  return Math.max(1, Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1)
}

function Inasistencia() {
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [filtro, setFiltro]           = useState('todos')
  const [search, setSearch]           = useState('')
  const [showModal, setShowModal]     = useState(false)
  const [expandido, setExpandido]     = useState(null)

  useEffect(() => { fetchSolicitudes() }, [])

  async function fetchSolicitudes() {
    try {
      setLoading(true)
      setError(null)
      const data = await listarSolicitudesAusencia()
      setSolicitudes(data)
    } catch (err) {
      setError(err.message ?? 'Error al cargar solicitudes')
    } finally {
      setLoading(false)
    }
  }

  const filtradas = solicitudes.filter((s) => {
    const matchSearch =
      s.trabajadorId.toLowerCase().includes(search.toLowerCase()) ||
      (s.tipo ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFiltro = filtro === 'todos' || s.estado === filtro
    return matchSearch && matchFiltro
  })

  const counts = {
    PENDIENTE: solicitudes.filter(s => s.estado === 'PENDIENTE').length,
    APROBADA:  solicitudes.filter(s => s.estado === 'APROBADA').length,
    RECHAZADA: solicitudes.filter(s => s.estado === 'RECHAZADA').length,
  }

  const initials = (id) => id.slice(0, 2).toUpperCase()

  return (
    <div className="inas-page">
      {/* Resumen */}
      {!loading && !error && (
        <div className="inas-summary">
          {[
            { label: 'Pendientes', count: counts.PENDIENTE, color: 'orange' },
            { label: 'Aprobadas',  count: counts.APROBADA,  color: 'green'  },
            { label: 'Rechazadas', count: counts.RECHAZADA, color: 'red'    },
          ].map((item) => (
            <div key={item.label} className={`inas-summary-card inas-summary-card--${item.color}`}>
              <span className="inas-summary-card__count">{item.count}</span>
              <span className="inas-summary-card__label">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="inas-toolbar">
        <div className="inas-search">
          <span aria-hidden="true">⌕</span>
          <input
            id="inasistencia-search"
            type="text"
            placeholder="Buscar por ID trabajador o tipo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="inas-filter-tabs">
          {[
            { key: 'todos',     label: 'Todos'     },
            { key: 'PENDIENTE', label: 'Pendiente' },
            { key: 'APROBADA',  label: 'Aprobada'  },
            { key: 'RECHAZADA', label: 'Rechazada' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`inas-filter-tab${filtro === key ? ' inas-filter-tab--active' : ''}`}
              onClick={() => setFiltro(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <button id="btn-nueva-solicitud" type="button" className="inas-btn-primary">
          <span aria-hidden="true">＋</span> Nueva solicitud
        </button>
      </div>

      {/* Estados */}
      {loading && (
        <div className="trab-state">
          <div className="trab-spinner" />
          <span>Cargando solicitudes de ausencia…</span>
        </div>
      )}

      {error && !loading && (
        <div className="trab-state trab-state--error">
          <span>⚠</span><span>{error}</span>
          <button type="button" onClick={fetchSolicitudes}>Reintentar</button>
        </div>
      )}

      {/* Listado */}
      {!loading && !error && (
        <div className="inas-list">
          {filtradas.length === 0 ? (
            <div className="inas-empty">No hay solicitudes que coincidan con el filtro.</div>
          ) : (
            filtradas.map((s) => {
              const dias  = calcularDias(s.fechaInicio, s.fechaFin)
              const color = estadoColor[s.estado] ?? 'orange'
              return (
                <article key={s.id} className={`inas-card inas-card--${color}`}>
                  <div className="inas-card__header">
                    <div className="inas-card__info">
                      <div className="inas-card__avatar" aria-hidden="true">{initials(s.trabajadorId)}</div>
                      <div>
                        <strong className="inas-card__name">{s.trabajadorId}</strong>
                        <span className="inas-card__tipo">{s.tipo}</span>
                      </div>
                    </div>
                    <div className="inas-card__right">
                      <span className={`inas-badge inas-badge--${color}`}>
                        {estadoLabel[s.estado] ?? s.estado}
                      </span>
                      <span className="inas-card__dias">{dias} día{dias !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="inas-card__dates">
                    <span>Desde: <strong>{new Date(s.fechaInicio).toLocaleDateString('es-CL')}</strong></span>
                    <span>Hasta: <strong>{new Date(s.fechaFin).toLocaleDateString('es-CL')}</strong></span>
                  </div>

                  {s.motivo && (
                    <>
                      <button
                        type="button"
                        className="inas-card__toggle"
                        onClick={() => setExpandido(expandido === s.id ? null : s.id)}
                      >
                        {expandido === s.id ? '▲ Ocultar motivo' : '▼ Ver motivo'}
                      </button>
                      {expandido === s.id && (
                        <p className="inas-card__motivo">{s.motivo}</p>
                      )}
                    </>
                  )}

                  {s.estado === 'PENDIENTE' && (
                    <div className="inas-card__actions">
                      <button
                        type="button"
                        className="inas-action-btn inas-action-btn--approve"
                        onClick={() => handleAprobar(s.id)}
                      >
                        ✓ Aprobar
                      </button>
                      <button
                        type="button"
                        className="inas-action-btn inas-action-btn--reject"
                        onClick={() => handleRechazar(s.id)}
                      >
                        ✕ Rechazar
                      </button>
                    </div>
                  )}
                </article>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default Inasistencia
