import { useState } from 'react'
import { solicitarAusencia, type SolicitarAusenciaRequest } from '../services/ausenciasService'

interface AusenciaFormModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AusenciaFormModal({ onClose, onSuccess }: AusenciaFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<SolicitarAusenciaRequest>({
    trabajadorId: '',
    tipo: 'VACACIONES',
    fechaInicio: '',
    fechaFin: '',
    motivo: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await solicitarAusencia(formData)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al crear solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Nueva Solicitud de Ausencia</h2>
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
            <label htmlFor="tipo">Tipo de Ausencia *</label>
            <select
              id="tipo"
              required
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
            >
              <option value="VACACIONES">Vacaciones</option>
              <option value="PERMISO">Permiso</option>
              <option value="LICENCIA_MEDICA">Licencia Médica</option>
            </select>
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
            <label htmlFor="fechaFin">Fecha Fin *</label>
            <input
              id="fechaFin"
              type="date"
              required
              value={formData.fechaFin}
              onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="motivo">Motivo</label>
            <textarea
              id="motivo"
              value={formData.motivo || ''}
              onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
              rows={3}
              placeholder="Descripción del motivo (opcional)"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
