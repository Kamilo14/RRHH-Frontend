/**
 * Dibuja los campos de la plantilla de contrato con el control de su tipo.
 * Lo usan "Mi contrato" (campos del trabajador) y "Nuevo contrato" (campos de RRHH).
 *
 * Props:
 *  - campos: CampoPlantilla[]
 *  - valores: Record<string, string>
 *  - onChange(valores): recibe todos los valores con el campo cambiado
 *  - errores: Record<string, string> (clave → detalle)
 *  - disabled: deshabilita todos los controles
 */

const PROPS_POR_TIPO = {
  TEXTO: { type: 'text', maxLength: 500 },
  NUMERO: { type: 'number', min: '1', step: '1' },
  ENTERO: { type: 'number', min: '1', max: '42', step: '1' },
  FECHA: { type: 'date' },
}

function CamposPlantillaForm({ campos, valores, onChange, errores = {}, disabled = false }) {
  const cambiar = (clave, valor) => onChange({ ...valores, [clave]: valor })

  return (
    <div className="campos-plantilla">
      {campos.map((campo) => {
        const id = `campo-${campo.clave}`
        const error = errores[campo.clave]
        const comunes = {
          id,
          name: campo.clave,
          value: valores[campo.clave] ?? '',
          required: campo.obligatorio,
          disabled,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': error ? `${id}-error` : undefined,
          onChange: (e) => cambiar(campo.clave, e.target.value),
        }
        return (
          <div className="form-group" key={campo.clave}>
            <label htmlFor={id}>{campo.etiqueta}</label>
            {campo.tipo === 'OPCION' ? (
              <select {...comunes}>
                <option value="">Selecciona una opción</option>
                {(campo.opciones ?? []).map((opcion) => (
                  <option key={opcion} value={opcion}>{opcion}</option>
                ))}
              </select>
            ) : (
              <input {...(PROPS_POR_TIPO[campo.tipo] ?? PROPS_POR_TIPO.TEXTO)} {...comunes} />
            )}
            {error && <small className="campo-error" id={`${id}-error`}>{error}</small>}
          </div>
        )
      })}
    </div>
  )
}

export default CamposPlantillaForm
