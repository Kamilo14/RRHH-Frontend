import { useState, useEffect, useMemo } from 'react'
import { listarMarcasAsistencia, listarMarcasPorTrabajador, listarHorasExtra, crearHoraExtra, aprobarHoraExtra, rechazarHoraExtra } from '../../../../services/asistenciaService'
import { listarTrabajadores } from '../../../../services/trabajadoresService'
import { listarSolicitudesPorTrabajador } from '../../../../services/ausenciasService'
import '../../../../styles/asistencia.css'

// La funcionalidad se conserva para su próxima integración, pero no se muestra aún en la interfaz.
const MOSTRAR_HORAS_EXTRA = false

function fechaLocalISO(fecha = new Date()) {
  const offset = fecha.getTimezoneOffset() * 60_000
  return new Date(fecha.getTime() - offset).toISOString().slice(0, 10)
}

function textoFecha(fechaISO) {
  return new Date(`${fechaISO}T12:00:00`).toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

/**
 * A partir de las marcas crudas (entrada/salida) construye
 * una fila por trabajador con su último registro del día.
 */
function procesarMarcas(marcas, fechaSeleccionada) {
  const delDia = marcas.filter((m) => m.fechaHora.slice(0, 10) === fechaSeleccionada)

  const porTrabajador = {}
  for (const m of delDia) {
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
      const e = new Date(`${fechaSeleccionada}T${r.entrada}`)
      const s = new Date(`${fechaSeleccionada}T${r.salida}`)
      const diff = Math.max(0, s - e)
      const h = Math.floor(diff / 3600000)
      const m2 = Math.floor((diff % 3600000) / 60000)
      horas = `${h}h ${m2}m`
    }

    return { ...r, estado, horas }
  })
}

function procesarHistorial(marcas) {
  const porDia = {}
  for (const marca of marcas) {
    const fecha = marca.fechaHora.slice(0, 10)
    if (!porDia[fecha]) porDia[fecha] = { fecha, entrada: null, salida: null, entradaFecha: null, salidaFecha: null }
    if (marca.tipo === 'ENTRADA' && (!porDia[fecha].entradaFecha || marca.fechaHora < porDia[fecha].entradaFecha)) {
      porDia[fecha].entradaFecha = marca.fechaHora
      porDia[fecha].entrada = new Date(marca.fechaHora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    }
    if (marca.tipo === 'SALIDA' && (!porDia[fecha].salidaFecha || marca.fechaHora > porDia[fecha].salidaFecha)) {
      porDia[fecha].salidaFecha = marca.fechaHora
      porDia[fecha].salida = new Date(marca.fechaHora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
    }
  }

  return Object.values(porDia)
    .map((dia) => {
      if (!dia.entradaFecha || !dia.salidaFecha) return { ...dia, horas: 'Jornada en curso' }
      const minutos = Math.max(0, Math.round((new Date(dia.salidaFecha) - new Date(dia.entradaFecha)) / 60_000))
      return { ...dia, horas: `${Math.floor(minutos / 60)}h ${minutos % 60}m` }
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
}

function etiquetaAusencia(tipo) {
  return (tipo ?? '').replaceAll('_', ' ').toLowerCase().replace(/^./, (letra) => letra.toUpperCase())
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
  const [trabajadores, setTrabajadores] = useState([])
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaLocalISO())
  const [historial, setHistorial] = useState(null)
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [errorHistorial, setErrorHistorial] = useState(null)
  const [horasExtra, setHorasExtra] = useState([])
  const [horasExtraLoading, setHorasExtraLoading] = useState(false)
  const [horasExtraError, setHorasExtraError] = useState(null)
  const [mostrarFormularioHoraExtra, setMostrarFormularioHoraExtra] = useState(false)
  const [formHoraExtra, setFormHoraExtra] = useState({ trabajadorId: '', fecha: fechaLocalISO(), tipo: 'NORMAL', cantidadHoras: '', valorHora: '', recargoPorcentaje: '0', motivo: '' })

  useEffect(() => {
    fetchMarcas()
    cargarTrabajadores()
  }, [])

  const periodoHorasExtra = fechaSeleccionada.slice(0, 7)

  useEffect(() => {
    cargarHorasExtra()
  }, [periodoHorasExtra])

  async function cargarTrabajadores() {
    try {
      setTrabajadores(await listarTrabajadores())
    } catch (err) {
      console.error('Error al cargar trabajadores:', err)
    }
  }

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

  async function cargarHorasExtra() {
    try {
      setHorasExtraLoading(true)
      setHorasExtraError(null)
      setHorasExtra(await listarHorasExtra(periodoHorasExtra))
    } catch (err) {
      setHorasExtraError(err.message ?? 'No fue posible cargar las horas extra.')
    } finally {
      setHorasExtraLoading(false)
    }
  }

  async function registrarHoraExtra(event) {
    event.preventDefault()
    try {
      await crearHoraExtra({
        ...formHoraExtra,
        cantidadHoras: Number(formHoraExtra.cantidadHoras),
        valorHora: Number(formHoraExtra.valorHora),
        recargoPorcentaje: Number(formHoraExtra.recargoPorcentaje || 0),
      })
      setMostrarFormularioHoraExtra(false)
      setFormHoraExtra({ trabajadorId: '', fecha: fechaLocalISO(), tipo: 'NORMAL', cantidadHoras: '', valorHora: '', recargoPorcentaje: '0', motivo: '' })
      cargarHorasExtra()
    } catch (err) {
      setHorasExtraError(err.message ?? 'No fue posible registrar la hora extra.')
    }
  }

  async function evaluarHoraExtra(id, aprobar) {
    if (!confirm(`¿Deseas ${aprobar ? 'aprobar' : 'rechazar'} esta hora extra?`)) return
    try {
      await (aprobar ? aprobarHoraExtra(id) : rechazarHoraExtra(id))
      cargarHorasExtra()
    } catch (err) {
      setHorasExtraError(err.message ?? 'No fue posible evaluar la hora extra.')
    }
  }

  async function abrirHistorial(registro) {
    setHistorial({ trabajador: registro, marcas: [], ausencias: [] })
    setCargandoHistorial(true)
    setErrorHistorial(null)
    try {
      const [marcasTrabajador, ausenciasTrabajador] = await Promise.all([
        listarMarcasPorTrabajador(registro.trabajadorId),
        listarSolicitudesPorTrabajador(registro.trabajadorId),
      ])
      setHistorial({ trabajador: registro, marcas: procesarHistorial(marcasTrabajador), ausencias: ausenciasTrabajador })
    } catch (err) {
      setErrorHistorial(err.message ?? 'No fue posible cargar el historial del trabajador.')
    } finally {
      setCargandoHistorial(false)
    }
  }

  const registros = useMemo(() => {
    const nombresPorTrabajador = new Map(trabajadores.map((trabajador) => [
      trabajador.id,
      `${trabajador.nombre} ${trabajador.apellido}`.trim(),
    ]))
    return procesarMarcas(marcas, fechaSeleccionada).map((registro) => ({
      ...registro,
      trabajadorNombre: nombresPorTrabajador.get(registro.trabajadorId) ?? 'Trabajador sin ficha',
    }))
  }, [marcas, trabajadores, fechaSeleccionada])

  const hoy = fechaLocalISO()
  const ayer = fechaLocalISO(new Date(Date.now() - 86_400_000))

  const filtrados = registros.filter((r) => {
    const matchSearch = r.trabajadorNombre.toLowerCase().includes(search.toLowerCase()) ||
      r.trabajadorId.toLowerCase().includes(search.toLowerCase())
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
              <strong className="asist-date-card__date">{textoFecha(fechaSeleccionada)}</strong>
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
            <span>{porcentaje}% de asistencia para la fecha seleccionada</span>
          </div>
        </>
      )}

      {/* Toolbar */}
      <div className="asist-toolbar">
        <div className="asist-date-filter" aria-label="Filtrar asistencia por fecha">
          <button
            type="button"
            className={`asist-date-filter__quick${fechaSeleccionada === hoy ? ' asist-date-filter__quick--active' : ''}`}
            onClick={() => setFechaSeleccionada(hoy)}
          >
            Hoy
          </button>
          <button
            type="button"
            className={`asist-date-filter__quick${fechaSeleccionada === ayer ? ' asist-date-filter__quick--active' : ''}`}
            onClick={() => setFechaSeleccionada(ayer)}
          >
            Ayer
          </button>
          <label className="asist-date-filter__input">
            <span>Fecha</span>
            <input
              type="date"
              value={fechaSeleccionada}
              max={hoy}
              onChange={(event) => setFechaSeleccionada(event.target.value)}
            />
          </label>
        </div>
        <div className="asist-search">
          <span aria-hidden="true">⌕</span>
          <input
            id="asistencia-search"
            type="text"
            placeholder="Buscar por trabajador…"
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
          <span>No hay marcas de asistencia registradas para la fecha seleccionada.</span>
        </div>
      )}

      {/* Tabla */}
      {!loading && !error && registros.length > 0 && (
        <div className="asist-table-wrap">
          <table className="asist-table">
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r) => (
                <tr key={r.trabajadorId}>
                  <td className="asist-table__name">{r.trabajadorNombre}</td>
                  <td className="asist-table__time">{r.entrada ?? '—'}</td>
                  <td className="asist-table__time">{r.salida ?? '—'}</td>
                  <td>
                    <span className={`asist-badge asist-badge--${estadoInfo[r.estado].color}`}>
                      {estadoInfo[r.estado].label}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="asist-action-btn" aria-label={`Ver historial de ${r.trabajadorNombre}`} onClick={() => abrirHistorial(r)}>
                      Historial
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {MOSTRAR_HORAS_EXTRA && <section className="asist-overtime">
        <header className="asist-overtime__header">
          <div>
            <span>Pago variable</span>
            <h2>Horas extra · {periodoHorasExtra}</h2>
            <p>Registra el valor acordado por RRHH y aprueba los montos antes de la liquidación.</p>
          </div>
          <button type="button" className="asist-btn-secondary" onClick={() => setMostrarFormularioHoraExtra((visible) => !visible)}>
            {mostrarFormularioHoraExtra ? 'Cancelar' : '+ Registrar hora extra'}
          </button>
        </header>

        {mostrarFormularioHoraExtra && (
          <form className="asist-overtime__form" onSubmit={registrarHoraExtra}>
            <select required value={formHoraExtra.trabajadorId} onChange={(event) => setFormHoraExtra({ ...formHoraExtra, trabajadorId: event.target.value })}>
              <option value="">Seleccionar trabajador…</option>
              {trabajadores.map((trabajador) => <option key={trabajador.id} value={trabajador.id}>{trabajador.nombre} {trabajador.apellido}</option>)}
            </select>
            <input type="date" required value={formHoraExtra.fecha} onChange={(event) => setFormHoraExtra({ ...formHoraExtra, fecha: event.target.value })} />
            <select value={formHoraExtra.tipo} onChange={(event) => setFormHoraExtra({ ...formHoraExtra, tipo: event.target.value })}>
              <option value="NORMAL">Normal</option><option value="FIN_DE_SEMANA">Fin de semana</option><option value="FESTIVO">Festivo</option><option value="TURNO_ESPECIAL">Turno especial</option>
            </select>
            <input type="number" required min="0.01" step="0.25" placeholder="Cantidad de horas" value={formHoraExtra.cantidadHoras} onChange={(event) => setFormHoraExtra({ ...formHoraExtra, cantidadHoras: event.target.value })} />
            <input type="number" required min="1" step="1" placeholder="Valor por hora" value={formHoraExtra.valorHora} onChange={(event) => setFormHoraExtra({ ...formHoraExtra, valorHora: event.target.value })} />
            <input type="number" min="0" step="1" placeholder="Recargo %" value={formHoraExtra.recargoPorcentaje} onChange={(event) => setFormHoraExtra({ ...formHoraExtra, recargoPorcentaje: event.target.value })} />
            <input className="asist-overtime__reason" required maxLength="500" placeholder="Motivo o acuerdo" value={formHoraExtra.motivo} onChange={(event) => setFormHoraExtra({ ...formHoraExtra, motivo: event.target.value })} />
            <button type="submit" className="asist-action-btn">Guardar</button>
          </form>
        )}

        {horasExtraError && <div className="asist-overtime__error">{horasExtraError}</div>}
        {horasExtraLoading ? <p className="asist-overtime__empty">Cargando horas extra…</p> : horasExtra.length === 0 ? <p className="asist-overtime__empty">No hay horas extra registradas para este período.</p> : (
          <div className="asist-table-wrap"><table className="asist-table asist-overtime__table"><thead><tr><th>Trabajador</th><th>Fecha</th><th>Tipo</th><th>Horas</th><th>Valor/hora</th><th>Total</th><th>Estado</th><th /></tr></thead><tbody>
            {horasExtra.map((registro) => <tr key={registro.id}><td>{trabajadores.find((trabajador) => trabajador.id === registro.trabajadorId)?.nombre ?? 'Trabajador'} {trabajadores.find((trabajador) => trabajador.id === registro.trabajadorId)?.apellido ?? ''}</td><td>{registro.fecha}</td><td>{registro.tipo.replaceAll('_', ' ')}</td><td>{registro.cantidadHoras}</td><td>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(registro.valorHora)}</td><td>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(registro.montoTotal)}</td><td><span className={`asist-badge asist-badge--${registro.estado === 'APROBADA' ? 'green' : registro.estado === 'RECHAZADA' ? 'red' : 'orange'}`}>{registro.estado.replaceAll('_', ' ')}</span></td><td>{registro.estado === 'PENDIENTE' && <div className="asist-overtime__actions"><button type="button" onClick={() => evaluarHoraExtra(registro.id, true)}>Aprobar</button><button type="button" onClick={() => evaluarHoraExtra(registro.id, false)}>Rechazar</button></div>}</td></tr>)}
          </tbody></table></div>
        )}
      </section>}

      {historial && (
        <div className="asist-history-overlay" role="presentation" onMouseDown={() => setHistorial(null)}>
          <section className="asist-history-modal" role="dialog" aria-modal="true" aria-labelledby="historial-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="asist-history-modal__header">
              <div>
                <span>Historial laboral</span>
                <h2 id="historial-title">{historial.trabajador.trabajadorNombre}</h2>
              </div>
              <button type="button" className="asist-history-modal__close" aria-label="Cerrar historial" onClick={() => setHistorial(null)}>×</button>
            </header>

            {cargandoHistorial && <div className="asist-history-state">Cargando asistencia y ausencias…</div>}
            {errorHistorial && <div className="asist-history-state asist-history-state--error">{errorHistorial}</div>}

            {!cargandoHistorial && !errorHistorial && (
              <div className="asist-history-content">
                <section>
                  <div className="asist-history-heading"><h3>Asistencia registrada</h3><span>{historial.marcas.length} días</span></div>
                  {historial.marcas.length === 0 ? <p className="asist-history-empty">No hay marcas de asistencia para este trabajador.</p> : (
                    <div className="asist-history-table-wrap">
                      <table className="asist-history-table">
                        <thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Jornada</th></tr></thead>
                        <tbody>{historial.marcas.map((dia) => <tr key={dia.fecha}><td>{textoFecha(dia.fecha)}</td><td>{dia.entrada ?? '—'}</td><td>{dia.salida ?? '—'}</td><td>{dia.horas}</td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                </section>
                <section>
                  <div className="asist-history-heading"><h3>Ausencias</h3><span>{historial.ausencias.length} solicitudes</span></div>
                  {historial.ausencias.length === 0 ? <p className="asist-history-empty">No hay ausencias registradas para este trabajador.</p> : (
                    <ul className="asist-history-absences">
                      {historial.ausencias.map((ausencia) => <li key={ausencia.id}><div><strong>{etiquetaAusencia(ausencia.tipo)}</strong><span>{ausencia.fechaInicio} al {ausencia.fechaFin}{ausencia.motivo ? ` · ${ausencia.motivo}` : ''}</span></div><span className={`asist-badge asist-badge--${ausencia.estado === 'APROBADO' ? 'green' : ausencia.estado === 'RECHAZADO' ? 'red' : 'orange'}`}>{etiquetaAusencia(ausencia.estado)}</span></li>)}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default Asistencia
