import { useState, useEffect, useMemo } from 'react'
import { listarMarcasAsistencia } from '../../../../services/asistenciaService'
import '../../../../styles/asistencia.css'

const hoyStr = new Date().toLocaleDateString('es-CL', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
})

const HOY_ISO = new Date().toISOString().slice(0, 10)  // "YYYY-MM-DD"

/**
 * A partir de las marcas crudas (entrada/salida) construye
 * una fila por trabajador con su último registro del día.
 */
function procesarMarcas(marcas) {
  // filtrar solo las de hoy
  const deHoy = marcas.filter((m) => m.fechaHora.slice(0, 10) === HOY_ISO)

  const porTrabajador = {}
  for (const m of deHoy) {
    if (!porTrabajador[m.trabajadorId]) {
      porTrabajador[m.trabajadorId] = { trabajadorId: m.trabajadorId, entrada: null, salida: null }
    }
    const hora = new Date(m.fechaHora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    if (m.tipo === 'ENTRADA') porTrabajador[m.trabajadorId].entrada = hora
    if (m.tipo === 'SALIDA')  porTrabajador[m.trabajadorId].salida  = hora
  }

  return Object.values(porTrabajador).map((r) => {
    let estado = 'ausente'
    let horas  = '—'
    if (r.entrada && r.salida)  { estado = 'presente' }
    else if (r.entrada)         { estado = 'activo' }

    if (r.entrada && r.salida) {
      const e = new Date(`${HOY_ISO}T${r.entrada}`)
      const s = new Date(`${HOY_ISO}T${r.salida}`)
      const diff = Math.max(0, s - e)
      const h = Math.floor(diff / 3600000)
      const m2 = Math.floor((diff % 3600000) / 60000)
      horas = `${h}h ${m2}m`
    }

    return { ...r, estado, horas }
  })
}

const estadoInfo = {
  presente:    { label: 'Completó jornada', color: 'green' },
  activo:      { label: 'En jornada',       color: 'blue'  },
  ausente:     { label: 'Sin registro',     color: 'red'   },
  justificado: { label: 'Justificado',      color: 'orange'},
}

function Asistencia() {
  const [marcas, setMarcas]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filtro, setFiltro]   = useState('todos')
  const [search, setSearch]   = useState('')

  useEffect(() => { fetchMarcas() }, [])

  async function fetchMarcas() {
    try {
      setLoading(true)
      setError(null)
      const data = await listarMarcasAsistencia()
      setMarcas(data)
    } catch (err) {
      setError(err.message ?? 'Error al cargar asistencia')
    } finally {
      setLoading(false)
    }
  }

  const registros = useMemo(() => procesarMarcas(marcas), [marcas])

  const filtrados = registros.filter((r) => {
    const matchSearch = r.trabajadorId.toLowerCase().includes(search.toLowerCase())
    const matchFiltro = filtro === 'todos' || r.estado === filtro
    return matchSearch && matchFiltro
  })

  const stats = {
    total:       registros.length,
    presentes:   registros.filter(r => r.estado === 'presente' || r.estado === 'activo').length,
    ausentes:    registros.filter(r => r.estado === 'ausente').length,
    justificados:registros.filter(r => r.estado === 'justificado').length,
  }
  const porcentaje = stats.total > 0 ? Math.round((stats.presentes / stats.total) * 100) : 0

  return (
    <div className="asist-page">
      {/* Top */}
      {!loading && !error && (
        <>
          <div className="asist-top">
            <div className="asist-date-card">
              <span className="asist-date-card__label">Registros del día</span>
              <strong className="asist-date-card__date">{hoyStr}</strong>
            </div>
            <div className="asist-stats">
              <div className="asist-stat">
                <span className="asist-stat__value asist-stat__value--green">{stats.presentes}</span>
                <span className="asist-stat__label">Presentes</span>
              </div>
              <div className="asist-stat">
                <span className="asist-stat__value asist-stat__value--red">{stats.ausentes}</span>
                <span className="asist-stat__label">Ausentes</span>
              </div>
              <div className="asist-stat">
                <span className="asist-stat__value asist-stat__value--orange">{stats.justificados}</span>
                <span className="asist-stat__label">Justificados</span>
              </div>
              <div className="asist-stat">
                <span className="asist-stat__value asist-stat__value--blue">{porcentaje}%</span>
                <span className="asist-stat__label">Asistencia</span>
              </div>
            </div>
          </div>

          <div className="asist-progress-bar" role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100}>
            <div className="asist-progress-bar__fill" style={{ width: `${porcentaje}%` }} />
            <span>{porcentaje}% de asistencia hoy</span>
          </div>
        </>
      )}

      {/* Toolbar */}
      <div className="asist-toolbar">
        <div className="asist-search">
          <span aria-hidden="true">⌕</span>
          <input
            id="asistencia-search"
            type="text"
            placeholder="Buscar por ID trabajador…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="asist-filter-tabs">
          {['todos', 'activo', 'presente', 'ausente'].map((est) => (
            <button
              key={est}
              type="button"
              className={`asist-filter-tab${filtro === est ? ' asist-filter-tab--active' : ''}`}
              onClick={() => setFiltro(est)}
            >
              {est.charAt(0).toUpperCase() + est.slice(1)}
            </button>
          ))}
        </div>
        <button
          id="btn-recargar-asistencia"
          type="button"
          className="asist-btn-secondary"
          onClick={fetchMarcas}
        >
          ↺ Recargar
        </button>
      </div>

      {/* Estados */}
      {loading && (
        <div className="trab-state">
          <div className="trab-spinner" />
          <span>Cargando marcas de asistencia…</span>
        </div>
      )}

      {error && !loading && (
        <div className="trab-state trab-state--error">
          <span>⚠</span><span>{error}</span>
          <button type="button" onClick={fetchMarcas}>Reintentar</button>
        </div>
      )}

      {!loading && !error && registros.length === 0 && (
        <div className="trab-state">
          <span>No hay marcas de asistencia registradas para hoy.</span>
        </div>
      )}

      {/* Tabla */}
      {!loading && !error && registros.length > 0 && (
        <div className="asist-table-wrap">
          <table className="asist-table">
            <thead>
              <tr>
                <th>ID Trabajador</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Horas trabajadas</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r) => (
                <tr key={r.trabajadorId}>
                  <td className="asist-table__name">{r.trabajadorId}</td>
                  <td className="asist-table__time">{r.entrada ?? '—'}</td>
                  <td className="asist-table__time">{r.salida ?? '—'}</td>
                  <td>{r.horas}</td>
                  <td>
                    <span className={`asist-badge asist-badge--${estadoInfo[r.estado].color}`}>
                      {estadoInfo[r.estado].label}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="asist-action-btn">
                      Ver historial
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Asistencia
