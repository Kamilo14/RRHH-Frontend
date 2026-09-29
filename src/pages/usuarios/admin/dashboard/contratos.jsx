import { useState, useEffect } from 'react'
import { listarContratos, finalizarContrato } from '../../../../services/contratosService'
import tratos.css'
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
  const [showModal, setShowModal] = useState(false)
  const [Se 
  useEffect(() => {
    fetchContratos()
  }, [])

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

  const contratosConEstado = contratos.map((c) => ({ ...c, _estado: calcularEstado(c) }))

  const filtrados = contratosConEstado.filter((c) => {
    const matchSearch = c.trabajadorId.toLowerCase().includes(search.toLowerCase()) ||
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
            placeholder="Buscar por ID trabajador o tipo…"
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
        </div> onClick={() => setShowModal(true)}
        <button id="btn-nuevo-contrato" type="button" className="cont-btn-primary">
          <span aria-hidden="true">＋</span> Nuevo contrato
        </button>
      </div>

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
                <th>ID Trabajador</th>
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
                    <td className="cont-table__name">{c.trabajadorId}</td>
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
                        <button type="button" className="cont-action-btn" title="Ver contrato">✎ Ver</button>
                        {c.activo && (
                          <button
                            type="button"
                            className="cont-action-btn cont-action-btn--renew"
                            title="Finalizar"
                            onClick={() => handleFinalizar(c.id)}
                          >
                            ✕ Finalizar
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
      )}>
      )}

      {showModal && (
        <ContratoFormModal
          onClose={() = setShowModal(false)}
      </  onSuccess={(d => {
            fetchContratos()
            setShowModal(false)
          }iv>
  )    />
      )}
    

e

export default Contratosxport default Contratos}

export default Contratos
