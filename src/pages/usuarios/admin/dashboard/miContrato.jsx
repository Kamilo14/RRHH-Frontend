import { useEffect, useRef, useState } from 'react'
import CamposPlantillaForm from '../../../../components/CamposPlantillaForm'
import {
  aprobarMiContrato,
  guardarMisCampos,
  obtenerCamposPlantilla,
  obtenerMiContrato,
  obtenerMiContratoPdf,
  rechazarMiContrato,
} from '../../../../services/contratosService'
import '../../../../styles/contratos.css'

const SIN_CONTRATO_TEXTO = 'Aún no tienes un contrato. RRHH debe emitirlo.'
const SIN_DOCUMENTO_TEXTO = 'Tu contrato firmado no tiene documento disponible.'

function valoresIniciales(campos, guardados) {
  return Object.fromEntries(campos.map((campo) => [campo.clave, guardados?.[campo.clave] ?? '']))
}

function erroresPorCampo(errores) {
  return Object.fromEntries((errores ?? []).map((error) => [error.campo, error.detalle]))
}

/** Pestaña "Mi contrato" de Trabajador y Jefatura: muestra lo que corresponde al estado de su contrato. */
function MiContrato() {
  const [mio, setMio] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [camposRrhh, setCamposRrhh] = useState([])
  const [camposTrabajador, setCamposTrabajador] = useState([])
  const [valores, setValores] = useState({})
  const [erroresCampo, setErroresCampo] = useState({})
  const [errorAccion, setErrorAccion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [cambiosSinGuardar, setCambiosSinGuardar] = useState(false)
  const [pdfUrl, setPdfUrl] = useState(null)
  const pdfUrlRef = useRef(null)
  const montadoRef = useRef(false)

  /** Reemplaza el PDF visible; revoca el blob URL anterior. Con `null` solo lo libera. */
  const ponerPdf = (blob) => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
    pdfUrlRef.current = blob && montadoRef.current ? URL.createObjectURL(blob) : null
    setPdfUrl(pdfUrlRef.current)
  }

  const cargarPdf = async () => {
    try {
      const blob = await obtenerMiContratoPdf()
      if (montadoRef.current) ponerPdf(blob)
    } catch (error) {
      if (montadoRef.current) setErrorAccion(error.message)
    }
  }

  useEffect(() => {
    montadoRef.current = true
    async function cargar() {
      try {
        const datos = await obtenerMiContrato()
        if (!montadoRef.current) return
        if (datos.estado === 'EN_ESPERA') {
          const campos = await obtenerCamposPlantilla()
          if (!montadoRef.current) return
          const propios = campos.filter((campo) => campo.responsable === 'TRABAJADOR')
          setCamposRrhh(campos.filter((campo) => campo.responsable === 'RRHH'))
          setCamposTrabajador(propios)
          setValores(valoresIniciales(propios, datos.camposTrabajador))
        }
        setMio(datos)
        setCargando(false)
        if (datos.estado !== 'SIN_CONTRATO' && datos.documentoListo) await cargarPdf()
      } catch (error) {
        if (!montadoRef.current) return
        setErrorCarga(error.message)
        setCargando(false)
      }
    }
    cargar()
    return () => {
      montadoRef.current = false
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
      pdfUrlRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cambiarValores = (nuevos) => {
    setValores(nuevos)
    setCambiosSinGuardar(true)
  }

  const guardar = async (event) => {
    event.preventDefault()
    setEnviando(true)
    setErroresCampo({})
    setErrorAccion('')
    try {
      const datos = await guardarMisCampos(valores)
      if (!montadoRef.current) return
      setMio(datos)
      setCambiosSinGuardar(false)
      // La preview anterior ya no corresponde al documento guardado: sin la nueva, no se puede aprobar.
      ponerPdf(null)
      await cargarPdf()
    } catch (error) {
      if (!montadoRef.current) return
      setErroresCampo(erroresPorCampo(error.errores))
      setErrorAccion(error.message)
    } finally {
      if (montadoRef.current) setEnviando(false)
    }
  }

  const aprobar = async () => {
    if (!window.confirm('¿Apruebas este contrato? Esta acción lo deja firmado.')) return
    setEnviando(true)
    setErrorAccion('')
    try {
      const datos = await aprobarMiContrato()
      if (!montadoRef.current) return
      ponerPdf(null)
      setMio(datos)
      if (datos.documentoListo) await cargarPdf()
    } catch (error) {
      if (montadoRef.current) setErrorAccion(error.message)
    } finally {
      if (montadoRef.current) setEnviando(false)
    }
  }

  const rechazar = async () => {
    const motivo = window.prompt('Motivo del rechazo (opcional)')
    if (motivo === null) return
    setEnviando(true)
    setErrorAccion('')
    try {
      const datos = await rechazarMiContrato(motivo.trim() || undefined)
      if (!montadoRef.current) return
      ponerPdf(null)
      setMio(datos)
    } catch (error) {
      if (montadoRef.current) setErrorAccion(error.message)
    } finally {
      if (montadoRef.current) setEnviando(false)
    }
  }

  if (cargando) return <p className="mi-contrato__estado">Cargando tu contrato…</p>
  if (errorCarga) return <p className="form-error" role="alert">{errorCarga}</p>

  if (mio.estado === 'SIN_CONTRATO') {
    return <p className="mi-contrato__estado">{SIN_CONTRATO_TEXTO}</p>
  }

  const avisoError = errorAccion && <p className="form-error" role="alert">{errorAccion}</p>
  const visorPdf = pdfUrl && <iframe className="cont-pdf-viewer" title="Contrato en PDF" src={pdfUrl} />

  if (mio.estado === 'FIRMADO') {
    if (!mio.documentoListo) return <p className="mi-contrato__estado">{SIN_DOCUMENTO_TEXTO}</p>
    return (
      <section className="mi-contrato">
        {avisoError}
        {!pdfUrl && !errorAccion && <p className="mi-contrato__estado">Cargando documento…</p>}
        {visorPdf}
        {pdfUrl && (
          <div className="form-actions">
            <a className="btn-primary" href={pdfUrl} download={`contrato-${mio.contrato?.fechaInicio ?? 'firmado'}.pdf`}>
              Descargar PDF
            </a>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="mi-contrato">
      <div className="form-card">
        <div className="form-card-header"><h3>Datos definidos por RRHH</h3></div>
        <dl className="mi-contrato__rrhh">
          {camposRrhh.map((campo) => (
            <div key={campo.clave}>
              <dt>{campo.etiqueta}</dt>
              <dd>{mio.camposRrhh[campo.clave] || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>

      <form className="form-card" onSubmit={guardar}>
        <div className="form-card-header"><h3>Tus datos</h3></div>
        <div className="form-card-body">
          <CamposPlantillaForm
            campos={camposTrabajador}
            valores={valores}
            onChange={cambiarValores}
            errores={erroresCampo}
            disabled={enviando}
          />
          {avisoError}
          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={enviando}>Guardar y previsualizar</button>
          </div>
        </div>
      </form>

      {pdfUrl && (
        <div className="form-card">
          <div className="form-card-header"><h3>Previsualización</h3></div>
          {visorPdf}
          {cambiosSinGuardar && (
            <p className="mi-contrato__estado">Tienes cambios sin guardar. Guarda y previsualiza antes de aprobar.</p>
          )}
          <div className="form-actions">
            <button className="btn-secondary" type="button" onClick={rechazar} disabled={enviando}>Rechazar</button>
            <button className="btn-primary" type="button" onClick={aprobar} disabled={enviando || cambiosSinGuardar}>
              Aprobar contrato
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default MiContrato
