import { useState } from 'react'
import { crearContrato, type CrearContratoRequest } from '../services/contratosService'

interface ContratoFormModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function ContratoFormModal({ onClose, onSuccess }: ContratoFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<CrearContratoRequest>({
    trabajadorId: '',
    salarioBase: 0,
    tipoContrato: 'INDEFINIDO',
    fechaInicio: '',
    fechaTermino: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await crearContrato(formData)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al crear contrato')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Nuevo Contrato</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="trabajadorId">ID Trabajador *</label>
            <input
              id="trabajadorId"
              type="text"
              required
              value={formData.trabajadorId}
              onChange={(e) => setFormData({ ...formData, trabajadorId: e.target.value })}
              placeholder="UUID del trabajador"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tipoContrato">Tipo de Contrato *</label>
            <select
              id="tipoContrato"
              required
              value={formData.tipoContrato}
              onChange={(e) => setFormData({ ...formData, tipoContrato: e.target.value })}
            >
              <option value="INDEFINIDO">Indefinido</option>
              <option value="PLAZO_FIJO">Plazo Fijo</option>
              <option value="HONORARIOS">Honorarios</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="salarioBase">Sueldo Base (CLP) *</label>
            <input
              id="salarioBase"
              type="number"
              required
              min="0"
              step="1"
              value={formData.salarioBase}
              onChange={(e) => setFormData({ ...formData, salarioBase: Number(e.target.value) })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="fechaInicio">Fecha Inicio *</label>
            <input
              id="fechaInicio"
              type="date"
              required
              value={formData.fechaInicio}
              onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="fechaTermino">Fecha Término</label>
            <input
              id="fechaTermino"
              type="date"
              value={formData.fechaTermino || ''}
              onChange={(e) => setFormData({ ...formData, fechaTermino: e.target.value })}
            />
            <small>Opcional para contratos indefinidos</small>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
