import { useState, useEffect } from 'react'
import {
  listarContratos,
  finalizarContrato,
  obtenerCamposPlantilla,
  emitirContrato,
  obtenerContratoPdf,
} from '../../../../services/contratosService'
import { listarTrabajadores } from '../../../../services/trabajadoresService'
import CamposPlantillaForm from '../../../../components/CamposPlantillaForm'
import '../../../../styles/contratos.css'
import '../../../../styles/modal.css'
const TIPO_LABELS = {
  INDEFINIDO: 'Indefinido',
  PLAZO_FIJO: 'Plazo fijo',
  HONORARIOS: 'Honorarios',
}

const ESTADOS = ['PENDIENTE_FIRMA', 'FIRMADO', 'RECHAZADO', 'FINALIZADO']

const ESTADO_LABELS = {
  PENDIENTE_FIRMA: 'En espera de firma',
  FIRMADO: 'Firmado',
  RECHAZADO: 'Rechazado',
  FINALIZADO: 'Finalizado',
}

const estadoColor = { PENDIENTE_FIRMA: 'orange', FIRMADO: 'green', RECHAZADO: 'red', FINALIZADO: 'gray' }

/** Un trabajador con un contrato en espera o firmado no puede recibir otro (S2). */
const ESTADOS_QUE_OCUPAN = ['PENDIENTE_FIRMA', 'FIRMADO']

/** El blob URL del PDF abierto en otra pestaña se libera después de que la pestaña lo cargó. */
const LIBERAR_PDF_MS = 60_000

function Contratos() {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [filtro, setFiltro]       = useState('todos')
  const [showForm, setShowForm]   = useState(false)
  const [search, setSearch]       = useState('')
  const [trabajadores, setTrabajadores] = useState([])
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [camposRrhh, setCamposRrhh] = useState(null)
  const [trabajadorId, setTrabajadorId] = useState('')
  const [valores, setValores] = useState({})
  const [erroresCampo, setErroresCampo] = useState({})

  useEffect(() => {
    fetchContratos()
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

  async function fetchContratos() {
    try {
      setLoading(true)
      setError(null)
      const data = await listarContratos()
      setContratos(data)
    } catch (err) {
      setError(err.message ?? 'Error al cargar contratos')
    } finally {
      setLoading(false)
    }
  }

  async function handleFinalizar(id) {
    if (!confirm('¿Deseas finalizar este contrato?')) return
    try {
      const actualizado = await finalizarContrato(id)
      setContratos((prev) => prev.map((c) => c.id === id ? actualizado : c))
    } catch (err) {
      alert(err.message ?? 'Error al finalizar contrato')
    }
  }

  async function handleVerDetalle(id) {
    try {
      const url = URL.createObjectURL(await obtenerContratoPdf(id))
      const ventana = window.open(url, '_blank')
      if (!ventana) alert('El navegador bloqueó la ventana del PDF. Permite las ventanas emergentes para este sitio.')
      setTimeout(() => URL.revokeObjectURL(url), LIBERAR_PDF_MS)
    } catch (err) {
      alert(err.message ?? 'Error al abrir el contrato')
    }
  }

  function limpiarFormulario(campos) {
    setTrabajadorId('')
    setValores(Object.fromEntries((campos ?? []).map((campo) => [campo.clave, ''])))
    setErroresCampo({})
    setFormError('')
  }

  async function handleNuevoContrato() {
    setShowForm(true)
    limpiarFormulario(camposRrhh)
    if (camposRrhh) return
    try {
      const campos = (await obtenerCamposPlantilla()).filter((campo) => campo.responsable === 'RRHH')
      setCamposRrhh(campos)
      limpiarFormulario(campos)
    } catch (err) {
      setFormError(err.message || 'No se pudieron cargar los campos de la plantilla')
    }
  }

  async function handleEmitirContrato(e) {
    e.preventDefault()
    setFormError('')
    setErroresCampo({})
    setFormLoading(true)

    try {
      await emitirContrato(trabajadorId, valores)
      setShowForm(false)
      limpiarFormulario(camposRrhh)
      fetchContratos()
    } catch (err) {
      setErroresCampo(Object.fromEntries((err.errores ?? []).map((item) => [item.campo, item.detalle])))
      setFormError(err.message || 'Error al emitir contrato')
    } finally {
      setFormLoading(false)
    }
  }

  function handleCancelForm() {
    setShowForm(false)
    limpiarFormulario(camposRrhh)
  }

  const ocupados = new Set(
    contratos.filter((c) => ESTADOS_QUE_OCUPAN.includes(c.estado)).map((c) => c.trabajadorId)
  )
  const trabajadoresSinContrato = trabajadores.filter((t) => t.activo && !ocupados.has(t.id))

  const nombresPorTrabajador = new Map(trabajadores.map((trabajador) => [
    trabajador.id,
    `${trabajador.nombre} ${trabajador.apellido}`.trim(),
  ]))
  const contratosPresentables = contratos.map((contrato) => ({
    ...contrato,
    trabajadorNombre: nombresPorTrabajador.get(contrato.trabajadorId) ?? 'Trabajador sin ficha',
  }))

  const filtrados = contratosPresentables.filter((c) => {
    const matchSearch = c.trabajadorNombre.toLowerCase().includes(search.toLowerCase()) ||
      c.trabajadorId.toLowerCase().includes(search.toLowerCase()) ||
      (c.tipoContrato ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFiltro = filtro === 'todos' || c.estado === filtro
    return matchSearch && matchFiltro
  })

  const counts = Object.fromEntries(
    ESTADOS.map((estado) => [estado, contratos.filter((c) => c.estado === estado).length])
  )

  const formatMonto = (n) =>
    n != null ? `$${Number(n).toLocaleString('es-CL')}` : '—'

  const formatFecha = (s) =>
    s ? new Date(s).toLocaleDateString('es-CL') : null

  return (
    <div className="cont-page">
      {/* Resumen */}
      {!loading && !error && (
        <div className="cont-summary">
          {ESTADOS.map((estado) => (
            <div key={estado} className={`cont-summary-card cont-summary-card--${estadoColor[estado]}`}>
              <span className="cont-summary-card__count">{counts[estado]}</span>
              <span className="cont-summary-card__label">{ESTADO_LABELS[estado]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="cont-toolbar">
        <div className="cont-search">
          <span aria-hidden="true">⌕</span>
          <input
            id="contratos-search"
            type="text"
            placeholder="Buscar por trabajador o tipo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="cont-filter-tabs">
          {['todos', ...ESTADOS].map((est) => (
            <button
              key={est}
              type="button"
              className={`cont-filter-tab${filtro === est ? ' cont-filter-tab--active' : ''}`}
              onClick={() => setFiltro(est)}
            >
              {est === 'todos' ? 'Todos' : ESTADO_LABELS[est]}
            </button>
          ))}
        </div>
        <button id="btn-nuevo-contrato" type="button" className="cont-btn-primary" onClick={handleNuevoContrato}>
          <span aria-hidden="true">＋</span> Nuevo contrato
        </button>
      </div>

      {/* Formulario de nuevo contrato: campos de RRHH de la plantilla */}
      {showForm && (
        <div className="form-card">
          <div className="form-card-header">
            <h3>Nuevo Contrato</h3>
            <button type="button" onClick={handleCancelForm} className="btn-close" aria-label="Cerrar formulario">×</button>
          </div>
          <form onSubmit={handleEmitirContrato} className="form-card-body">
            {formError && <div className="form-error" role="alert">{formError}</div>}

            <div className="form-group">
              <label htmlFor="trabajador">Trabajador *</label>
              <select
                id="trabajador"
                required
                disabled={formLoading}
                value={trabajadorId}
                onChange={(e) => setTrabajadorId(e.target.value)}
              >
                <option value="">Seleccionar trabajador...</option>
                {trabajadoresSinContrato.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} {t.apellido} ({t.rutTrabajador})
                  </option>
                ))}
              </select>
              {trabajadoresSinContrato.length === 0 && <small>No hay trabajadores activos sin contrato.</small>}
              {erroresCampo.trabajador_id && <small className="campo-error">{erroresCampo.trabajador_id}</small>}
            </div>

            {camposRrhh === null && !formError && <p>Cargando campos de la plantilla…</p>}
            {camposRrhh && (
              <CamposPlantillaForm
                campos={camposRrhh}
                valores={valores}
                onChange={setValores}
                errores={erroresCampo}
                disabled={formLoading}
              />
            )}

            <div className="form-actions">
              <button type="button" onClick={handleCancelForm} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={formLoading || !camposRrhh} className="btn-primary">
                {formLoading ? 'Enviando...' : 'Enviar contrato'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Estados de carga */}
      {loading && (
        <div className="trab-state">
          <div className="trab-spinner" aria-label="Cargando…" />
          <span>Cargando contratos…</span>
        </div>
      )}

      {error && !loading && (
        <div className="trab-state trab-state--error">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
          <button type="button" onClick={fetchContratos}>Reintentar</button>
        </div>
      )}

      {/* Tabla */}
      {!loading && !error && (
        <div className="cont-table-wrap">
          <table className="cont-table">
            <thead>
              <tr>
                <th>Trabajador</th>
                <th>Tipo</th>
                <th>Inicio</th>
                <th>Término</th>
                <th>Sueldo base</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="cont-table__empty">
                    No hay contratos que coincidan con el filtro.
                  </td>
                </tr>
              ) : (
                filtrados.map((c) => (
                  <tr key={c.id}>
                    <td className="cont-table__name">{c.trabajadorNombre}</td>
                    <td>{TIPO_LABELS[c.tipoContrato] ?? c.tipoContrato}</td>
                    <td>{formatFecha(c.fechaInicio)}</td>
                    <td>
                      {c.fechaTermino
                        ? formatFecha(c.fechaTermino)
                        : <span className="cont-indefinido">Indefinido</span>}
                    </td>
                    <td><strong>{formatMonto(c.salarioBase)}</strong></td>
                    <td>
                      <span className={`cont-badge cont-badge--${estadoColor[c.estado] ?? 'gray'}`}>
                        {ESTADO_LABELS[c.estado] ?? c.estado}
                      </span>
                    </td>
                    <td>
                      <div className="cont-actions">
                        {c.documentoFirmado && (
                          <button
                            type="button"
                            className="cont-action-btn"
                            title="Ver el contrato firmado en PDF"
                            aria-label={`Ver detalle del contrato de ${c.trabajadorNombre}`}
                            onClick={() => handleVerDetalle(c.id)}
                          >
                            Ver detalle
                          </button>
                        )}
                        {c.estado === 'FIRMADO' && (
                          <button
                            type="button"
                            className="cont-action-btn cont-action-btn--danger"
                            title="Finalizar contrato"
                            aria-label={`Finalizar contrato de ${c.trabajadorNombre}`}
                            onClick={() => handleFinalizar(c.id)}
                          >
                            Finalizar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Contratos
