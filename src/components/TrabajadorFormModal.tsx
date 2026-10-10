import { useState, useEffect } from 'react'
import { crearTrabajadorConCuenta, CuentaPendienteError, listarDepartamentos, listarCargos, type CrearTrabajadorRequest, type TrabajadorResponse, type Departamento, type Cargo } from '../services/trabajadoresService'
import '../styles/modal.css'

interface TrabajadorFormModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function TrabajadorFormModal({ onClose, onSuccess }: TrabajadorFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [cuentaPendiente, setCuentaPendiente] = useState<TrabajadorResponse | null>(null)

  const [formData, setFormData] = useState<CrearTrabajadorRequest>({
    nombre: '',
    apellido: '',
    rutTrabajador: '',
    email: '',
    telefono: '',
    departamentoId: '',
    cargoId: '',
    jefaturaId: '',
    rol: 'TRABAJADOR',
  })

  useEffect(() => {
    cargarCatalogos()
  }, [])

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
      await crearTrabajadorConCuenta(formData, cuentaPendiente)
      onSuccess()
      onClose()
    } catch (err: any) {
      if (err instanceof CuentaPendienteError) {
        setCuentaPendiente(err.trabajador)
      }
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
            <input
              id="departamento"
              type="text"
              list="modal-departamentos-opciones"
              value={formData.departamentoId || ''}
              onChange={(e) => setFormData({ ...formData, departamentoId: e.target.value })}
              placeholder="Ej. Recursos Humanos"
            />
            <datalist id="modal-departamentos-opciones">
              {departamentos.map((d) => <option key={d.id} value={d.nombre} />)}
            </datalist>
          </div>

          <div className="form-group">
            <label htmlFor="cargo">Cargo</label>
            <input
              id="cargo"
              type="text"
              list="modal-cargos-opciones"
              value={formData.cargoId || ''}
              onChange={(e) => setFormData({ ...formData, cargoId: e.target.value })}
              placeholder="Ej. Analista de RRHH"
            />
            <datalist id="modal-cargos-opciones">
              {cargos.map((c) => <option key={c.id} value={c.nombre} />)}
            </datalist>
          </div>

          <div className="form-group">
            <label htmlFor="rol">Rol de acceso *</label>
            <select id="rol" required value={formData.rol} onChange={(e) => setFormData({ ...formData, rol: e.target.value })}>
              <option value="TRABAJADOR">Trabajador</option>
              <option value="JEFATURA">Jefatura</option>
              <option value="ADMIN_RRHH">Admin de RRHH</option>
            </select>
            <small>SUPERADMIN no puede ser asignado desde este módulo.</small>
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
