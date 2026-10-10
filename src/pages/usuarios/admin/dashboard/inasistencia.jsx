import { useState, useEffect } from 'react'
import { listarSolicitudesAusencia, aprobarSolicitud, rechazarSolicitud, solicitarAusencia } from '../../../../services/ausenciasService'
import { listarTrabajadores } from '../../../../services/trabajadoresService'
import '../../../../styles/inasistencia.css'
import '../../../../styles/modal.css'

const estadoColor = {
  PENDIENTE: 'orange',
  APROBADO:  'green',
  RECHAZADO: 'red',
}

const estadoLabel = {
  PENDIENTE: 'Pendiente',
  APROBADO:  'Aprobado',
  RECHAZADO: 'Rechazado',
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
  const [showForm, setShowForm]       = useState(false)
  const [expandido, setExpandido]     = useState(null)
  const [trabajadores, setTrabajadores] = useState([])
  const [formError, setFormError]     = useState('')
  const [formLoading, setFormLoading] = useState(false)

  const [formData, setFormData] = useState({
    trabajadorId: '',
    tipo: '',
    fechaInicio: '',
    fechaFin: '',
    motivo: '',
  })

  useEffect(() => {
    fetchSolicitudes()
    cargarTrabajadores()
  }, [])

  async function cargarTrabajadores() {
    try {
      const data = await listarTrabajadores()
      setTrabajadores(data)
    } catch (err) {
      console.error('Error al cargar trabajadores:', err)
    }
  }

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

  async function handleAprobar(id) {
    if (!confirm('¿Deseas aprobar esta solicitud?')) return
    try {
      await aprobarSolicitud(id)
      fetchSolicitudes()
    } catch (err) {
      alert(err.message ?? 'Error al aprobar solicitud')
    }
  }

  async function handleRechazar(id) {
    const motivo = prompt('Motivo del rechazo:')
    if (!motivo) return
    try {
      await rechazarSolicitud(id, { motivo })
      fetchSolicitudes()
    } catch (err) {
      alert(err.message ?? 'Error al rechazar solicitud')
    }
  }

  async function handleCrearSolicitud(e) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    try {
      await solicitarAusencia(formData)
      setShowForm(false)
      setFormData({
        trabajadorId: '',
        tipo: '',
        fechaInicio: '',
        fechaFin: '',
        motivo: '',
      })
      fetchSolicitudes()
    } catch (err) {
      setFormError(err.message || 'Error al crear solicitud')
    } finally {
      setFormLoading(false)
    }
  }

  function handleCancelForm() {
    setShowForm(false)
    setFormData({
      trabajadorId: '',
      tipo: '',
      fechaInicio: '',
      fechaFin: '',
      motivo: '',
    })
    setFormError('')
  }

  const nombresPorTrabajador = new Map(trabajadores.map((trabajador) => [
    trabajador.id,
    `${trabajador.nombre} ${trabajador.apellido}`.trim(),
  ]))
  const solicitudesPresentables = solicitudes.map((solicitud) => ({
    ...solicitud,
    trabajadorNombre: nombresPorTrabajador.get(solicitud.trabajadorId) ?? 'Trabajador sin ficha',
  }))

  const filtradas = solicitudesPresentables.filter((s) => {
    const matchSearch =
      s.trabajadorNombre.toLowerCase().includes(search.toLowerCase()) ||
      s.trabajadorId.toLowerCase().includes(search.toLowerCase()) ||
      (s.tipo ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFiltro = filtro === 'todos' || s.estado === filtro
    return matchSearch && matchFiltro
  })

  const counts = {
    PENDIENTE: solicitudes.filter(s => s.estado === 'PENDIENTE').length,
    APROBADO:  solicitudes.filter(s => s.estado === 'APROBADO').length,
    RECHAZADO: solicitudes.filter(s => s.estado === 'RECHAZADO').length,
  }

  const initials = (nombre) => nombre.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase()

  return (
    <div className="inas-page">
      {/* Resumen */}
      {!loading && !error && (
        <div className="inas-summary">
          {[
            { label: 'Pendientes', count: counts.PENDIENTE, color: 'orange' },
            { label: 'Aprobadas',  count: counts.APROBADO,  color: 'green'  },
            { label: 'Rechazadas', count: counts.RECHAZADO, color: 'red'    },
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
            placeholder="Buscar por trabajador o tipo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="inas-filter-tabs">
          {[
            { key: 'todos',     label: 'Todos'     },
            { key: 'PENDIENTE', label: 'Pendiente' },
            { key: 'APROBADO',  label: 'Aprobada'  },
            { key: 'RECHAZADO', label: 'Rechazada' },
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
        <button id="btn-nueva-solicitud" type="button" className="inas-btn-primary" onClick={() => setShowForm(true)}>
          <span aria-hidden="true">＋</span> Nueva solicitud
        </button>
      </div>

      {/* Formulario de nueva solicitud */}
      {showForm && (
        <div className="form-card">
          <div className="form-card-header">
            <h3>Nueva Solicitud de Ausencia</h3>
            <button type="button" onClick={handleCancelForm} className="btn-close">×</button>
          </div>
          <form onSubmit={handleCrearSolicitud} className="form-card-body">
            {formError && <div className="form-error">{formError}</div>}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="trabajador">Trabajador *</label>
                <select
                  id="trabajador"
                  required
                  value={formData.trabajadorId}
                  onChange={(e) => setFormData({ ...formData, trabajadorId: e.target.value })}
                >
                  <option value="">Seleccionar trabajador...</option>
                  {trabajadores.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} {t.apellido} ({t.rutTrabajador})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tipo">Tipo de ausencia *</label>
                <select
                  id="tipo"
                  required
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                >
                  <option value="">Seleccionar tipo...</option>
                  <option value="VACACION">Vacaciones</option>
                  <option value="LICENCIA_MEDICA">Licencia médica</option>
                  <option value="PERMISO">Permiso</option>
                  <option value="AUSENCIA_JUSTIFICADA">Ausencia justificada</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fechaInicio">Fecha de inicio *</label>
                <input
                  id="fechaInicio"
                  type="date"
                  required
                  value={formData.fechaInicio}
                  onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fechaFin">Fecha de término *</label>
                <input
                  id="fechaFin"
                  type="date"
                  required
                  value={formData.fechaFin}
                  onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="motivo">Motivo (opcional)</label>
                <textarea
                  id="motivo"
                  rows="3"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  placeholder="Describe el motivo de la ausencia..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleCancelForm} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={formLoading} className="btn-primary">
                {formLoading ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </form>
        </div>
      )}

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
                      <div className="inas-card__avatar" aria-hidden="true">{initials(s.trabajadorNombre)}</div>
                      <div>
                        <strong className="inas-card__name">{s.trabajadorNombre}</strong>
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
                        Aprobar
                      </button>
                      <button
                        type="button"
                        className="inas-action-btn inas-action-btn--reject"
                        onClick={() => handleRechazar(s.id)}
                      >
                        Rechazar
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
