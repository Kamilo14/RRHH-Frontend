import { useState, useEffect } from 'react'
import { listarContratos, finalizarContrato, crearContrato } from '../../../../services/contratosService'
import { listarTrabajadores } from '../../../../services/trabajadoresService'
import '../../../../styles/contratos.css'
import '../../../../styles/modal.css'
const TIPO_LABELS = {
  INDEFINIDO: 'Indefinido',
  PLAZO_FIJO: 'Plazo fijo',
  HONORARIOS: 'Honorarios',
}

function calcularEstado(contrato) {
  if (!contrato.activo) return 'vencido'
  if (!contrato.fechaTermino) return 'vigente'
  const hoy = new Date()
  const termino = new Date(contrato.fechaTermino)
  const diffDias = Math.ceil((termino - hoy) / (1000 * 60 * 60 * 24))
  if (diffDias <= 30) return 'por vencer'
  if (diffDias < 0) return 'vencido'
  return 'vigente'
}

const estadoColor = { vigente: 'green', vencido: 'red', 'por vencer': 'orange' }

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

  const [formData, setFormData] = useState({
    trabajadorId: '',
    salarioBase: '',
    tipoContrato: '',
    fechaInicio: '',
    fechaTermino: '',
  }) 
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

  async function handleCrearContrato(e) {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    try {
      const contratoData = {
        ...formData,
        salarioBase: Number(formData.salarioBase),
        fechaTermino: formData.fechaTermino || undefined,
      }
      await crearContrato(contratoData)
      setShowForm(false)
      setFormData({
        trabajadorId: '',
        salarioBase: '',
        tipoContrato: '',
        fechaInicio: '',
        fechaTermino: '',
      })
      fetchContratos()
    } catch (err) {
      setFormError(err.message || 'Error al crear contrato')
    } finally {
      setFormLoading(false)
    }
  }

  function handleCancelForm() {
    setShowForm(false)
    setFormData({
      trabajadorId: '',
      salarioBase: '',
      tipoContrato: '',
      fechaInicio: '',
      fechaTermino: '',
    })
    setFormError('')
  }

  const contratosConEstado = contratos.map((c) => ({ ...c, _estado: calcularEstado(c) }))
  const nombresPorTrabajador = new Map(trabajadores.map((trabajador) => [
    trabajador.id,
    `${trabajador.nombre} ${trabajador.apellido}`.trim(),
  ]))
  const contratosPresentables = contratosConEstado.map((contrato) => ({
    ...contrato,
    trabajadorNombre: nombresPorTrabajador.get(contrato.trabajadorId) ?? 'Trabajador sin ficha',
  }))

  const filtrados = contratosPresentables.filter((c) => {
    const matchSearch = c.trabajadorNombre.toLowerCase().includes(search.toLowerCase()) ||
      c.trabajadorId.toLowerCase().includes(search.toLowerCase()) ||
      (c.tipoContrato ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFiltro = filtro === 'todos' || c._estado === filtro
    return matchSearch && matchFiltro
  })

  const counts = {
    vigente: contratosConEstado.filter(c => c._estado === 'vigente').length,
    'por vencer': contratosConEstado.filter(c => c._estado === 'por vencer').length,
    vencido: contratosConEstado.filter(c => c._estado === 'vencido').length,
  }

  const formatMonto = (n) =>
    n != null ? `$${Number(n).toLocaleString('es-CL')}` : '—'

  const formatFecha = (s) =>
    s ? new Date(s).toLocaleDateString('es-CL') : null

  return (
    <div className="cont-page">
      {/* Resumen */}
      {!loading && !error && (
        <div className="cont-summary">
          {[
            { label: 'Vigentes', count: counts.vigente, color: 'green' },
            { label: 'Por vencer', count: counts['por vencer'], color: 'orange' },
            { label: 'Vencidos', count: counts.vencido, color: 'red' },
          ].map((item) => (
            <div key={item.label} className={`cont-summary-card cont-summary-card--${item.color}`}>
              <span className="cont-summary-card__count">{item.count}</span>
              <span className="cont-summary-card__label">{item.label}</span>
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
          {['todos', 'vigente', 'por vencer', 'vencido'].map((est) => (
            <button
              key={est}
              type="button"
              className={`cont-filter-tab${filtro === est ? ' cont-filter-tab--active' : ''}`}
              onClick={() => setFiltro(est)}
            >
              {est.charAt(0).toUpperCase() + est.slice(1)}
            </button>
          ))}
        </div>
        <button id="btn-nuevo-contrato" type="button" className="cont-btn-primary" onClick={() => setShowForm(true)}>
          <span aria-hidden="true">＋</span> Nuevo contrato
        </button>
      </div>

      {/* Formulario de nuevo contrato */}
      {showForm && (
        <div className="form-card">
          <div className="form-card-header">
            <h3>Nuevo Contrato</h3>
            <button type="button" onClick={handleCancelForm} className="btn-close">×</button>
          </div>
          <form onSubmit={handleCrearContrato} className="form-card-body">
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
                <label htmlFor="tipoContrato">Tipo de contrato *</label>
                <select
                  id="tipoContrato"
                  required
                  value={formData.tipoContrato}
                  onChange={(e) => setFormData({ ...formData, tipoContrato: e.target.value })}
                >
                  <option value="">Seleccionar tipo...</option>
                  <option value="INDEFINIDO">Indefinido</option>
                  <option value="PLAZO_FIJO">Plazo fijo</option>
                  <option value="HONORARIOS">Honorarios</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="salarioBase">Sueldo base *</label>
                <input
                  id="salarioBase"
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={formData.salarioBase}
                  onChange={(e) => setFormData({ ...formData, salarioBase: e.target.value })}
                  placeholder="Ej: 500000"
                />
              </div>

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
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fechaTermino">Fecha de término (opcional)</label>
                <input
                  id="fechaTermino"
                  type="date"
                  value={formData.fechaTermino}
                  onChange={(e) => setFormData({ ...formData, fechaTermino: e.target.value })}
                  placeholder="Solo para contratos a plazo fijo"
                />
                <small>Dejar vacío para contratos indefinidos</small>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" onClick={handleCancelForm} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={formLoading} className="btn-primary">
                {formLoading ? 'Guardando...' : 'Guardar contrato'}
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
                      <span className={`cont-badge cont-badge--${estadoColor[c._estado]}`}>
                        {c._estado.charAt(0).toUpperCase() + c._estado.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="cont-actions">
                        <button 
                          type="button" 
                          className="cont-action-btn" 
                          title="Ver detalle del contrato"
                          aria-label={`Ver detalle del contrato de ${c.trabajadorNombre}`}
                          onClick={() => alert('Funcionalidad de ver contrato en desarrollo')}
                        >
                          Ver detalle
                        </button>
                        {c.activo && (
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
