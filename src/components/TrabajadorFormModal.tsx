import { useState } from 'react'
import { crearTrabajador, listarDepartamentos, listarCargos, type CrearTrabajadorRequest } from '../services/trabajadoresService'

interface TrabajadorFormModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function TrabajadorFormModal({ onClose, onSuccess }: TrabajadorFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [departamentos, setDepartamentos] = useState([])
  const [cargos, setCargos] = useState([])

  const [formData, setFormData] = useState<CrearTrabajadorRequest>({
    nombre: '',
    apellido: '',
    rutTrabajador: '',
    email: '',
    telefono: '',
    departamentoId: '',
    cargoId: '',
    jefaturaId: '',
  })

  useState(() => {
    cargarCatalogos()
  })

  async function cargarCatalogos() {
    try {
      const [deps, car] = await Promise.all([listarDepartamentos(), listarCargos()])
      setDepartamentos(deps)
      setCargos(car)
    } catch (err) {
      console.error('Error al cargar catálogos:', err)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await crearTrabajador(formData)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al crear trabajador')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Nuevo Trabajador</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="nombre">Nombre *</label>
            <input
              id="nombre"
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="apellido">Apellido *</label>
            <input
              id="apellido"
              type="text"
              required
              value={formData.apellido}
              onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="rut">RUT *</label>
            <input
              id="rut"
              type="text"
              required
              placeholder="12.345.678-9"
              value={formData.rutTrabajador}
              onChange={(e) => setFormData({ ...formData, rutTrabajador: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefono">Teléfono</label>
            <input
              id="telefono"
              type="tel"
              value={formData.telefono || ''}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="departamento">Departamento</label>
            <select
              id="departamento"
              value={formData.departamentoId || ''}
              onChange={(e) => setFormData({ ...formData, departamentoId: e.target.value })}
            >
              <option value="">Seleccionar...</option>
              {departamentos.map((d: any) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="cargo">Cargo</label>
            <select
              id="cargo"
              value={formData.cargoId || ''}
              onChange={(e) => setFormData({ ...formData, cargoId: e.target.value })}
            >
              <option value="">Seleccionar...</option>
              {cargos.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="jefatura">Jefatura</label>
            <input
              id="jefatura"
              type="text"
              value={formData.jefaturaId || ''}
              onChange={(e) => setFormData({ ...formData, jefaturaId: e.target.value })}
              placeholder="ID del jefe"
            />
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
