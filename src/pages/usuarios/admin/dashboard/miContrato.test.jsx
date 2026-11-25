// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  obtenerMiContrato: vi.fn(),
  obtenerCamposPlantilla: vi.fn(),
  guardarMisCampos: vi.fn(),
  obtenerMiContratoPdf: vi.fn(),
  aprobarMiContrato: vi.fn(),
  rechazarMiContrato: vi.fn(),
}))
vi.mock('../../../../services/contratosService', () => mocks)

import MiContrato from './miContrato'

const SIN_CONTRATO_TEXTO = 'Aún no tienes un contrato. RRHH debe emitirlo.'

const contrato = { id: 'c1', trabajadorId: 't1', fechaInicio: '2026-12-01', estado: 'PENDIENTE_FIRMA', activo: false }
const campos = [
  { clave: 'rrhh_sueldo_base', etiqueta: 'Sueldo base', responsable: 'RRHH', tipo: 'NUMERO', opciones: [], obligatorio: true },
  { clave: 'trabajador_domicilio', etiqueta: 'Domicilio', responsable: 'TRABAJADOR', tipo: 'TEXTO', opciones: [], obligatorio: true },
]
const sinContrato = { estado: 'SIN_CONTRATO', contrato: null, camposRrhh: {}, camposTrabajador: {}, documentoListo: false }
const enEspera = (extra = {}) => ({
  estado: 'EN_ESPERA',
  contrato,
  camposRrhh: { rrhh_sueldo_base: '900000' },
  camposTrabajador: {},
  documentoListo: false,
  ...extra,
})
const firmado = (extra = {}) => ({
  estado: 'FIRMADO',
  contrato: { ...contrato, estado: 'FIRMADO', activo: true },
  camposRrhh: { rrhh_sueldo_base: '900000' },
  camposTrabajador: { trabajador_domicilio: 'Av. Siempre Viva 742' },
  documentoListo: true,
  ...extra,
})

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:pdf')
  URL.revokeObjectURL = vi.fn()
  window.confirm = vi.fn(() => true)
  window.prompt = vi.fn(() => '')
  mocks.obtenerCamposPlantilla.mockResolvedValue(campos)
  mocks.obtenerMiContratoPdf.mockResolvedValue(new Blob(['%PDF']))
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

async function guardarDomicilio() {
  fireEvent.change(await screen.findByLabelText('Domicilio'), { target: { value: 'Av. Siempre Viva 742' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y previsualizar' }))
  await screen.findByTitle('Contrato en PDF')
}

describe('Mi contrato', () => {
  it('sinContratoSoloMuestraMensaje', async () => {
    mocks.obtenerMiContrato.mockResolvedValue(sinContrato)
    render(<MiContrato />)
    expect(await screen.findByText(SIN_CONTRATO_TEXTO)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(mocks.obtenerCamposPlantilla).not.toHaveBeenCalled()
  })

  it('enEsperaMuestraRrhhEnLecturaYFormulario', async () => {
    mocks.obtenerMiContrato.mockResolvedValue(enEspera())
    render(<MiContrato />)
    expect(await screen.findByLabelText('Domicilio')).toBeTruthy()
    expect(screen.getByText('900000')).toBeTruthy()
    expect(screen.queryByDisplayValue('900000')).toBeNull()
    expect(screen.queryByLabelText('Sueldo base')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Aprobar contrato' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rechazar' })).toBeNull()
  })

  it('guardarMuestraPreviewYBotones', async () => {
    mocks.obtenerMiContrato.mockResolvedValue(enEspera())
    mocks.guardarMisCampos.mockResolvedValue(enEspera({ camposTrabajador: { trabajador_domicilio: 'Av. Siempre Viva 742' }, documentoListo: true }))
    render(<MiContrato />)
    await guardarDomicilio()
    expect(mocks.guardarMisCampos).toHaveBeenCalledWith({ trabajador_domicilio: 'Av. Siempre Viva 742' })
    expect(mocks.obtenerMiContratoPdf).toHaveBeenCalled()
    expect(screen.getByTitle('Contrato en PDF').getAttribute('src')).toBe('blob:pdf')
    expect(screen.getByRole('button', { name: 'Aprobar contrato' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeTruthy()
  })

  it('enEsperaConDocumentoMuestraPreviewAlCargar', async () => {
    mocks.obtenerMiContrato.mockResolvedValue(enEspera({ camposTrabajador: { trabajador_domicilio: 'Calle 1' }, documentoListo: true }))
    render(<MiContrato />)
    expect(await screen.findByTitle('Contrato en PDF')).toBeTruthy()
    expect(screen.getByLabelText('Domicilio').value).toBe('Calle 1')
    expect(screen.getByRole('button', { name: 'Aprobar contrato' })).toBeTruthy()
  })

  it('muestraErroresPorCampo', async () => {
    mocks.obtenerMiContrato.mockResolvedValue(enEspera())
    mocks.guardarMisCampos.mockRejectedValue(
      Object.assign(new Error('Validación fallida'), { errores: [{ campo: 'trabajador_domicilio', detalle: 'Es obligatorio' }] }),
    )
    render(<MiContrato />)
    fireEvent.change(await screen.findByLabelText('Domicilio'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y previsualizar' }))
    expect(await screen.findByText('Es obligatorio')).toBeTruthy()
    expect(screen.queryByTitle('Contrato en PDF')).toBeNull()
  })

  it('aprobarPasaAFirmado', async () => {
    mocks.obtenerMiContrato.mockResolvedValue(enEspera())
    mocks.guardarMisCampos.mockResolvedValue(enEspera({ documentoListo: true }))
    mocks.aprobarMiContrato.mockResolvedValue(firmado())
    render(<MiContrato />)
    await guardarDomicilio()
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar contrato' }))
    expect(await screen.findByRole('link', { name: 'Descargar PDF' })).toBeTruthy()
    expect(window.confirm).toHaveBeenCalled()
    expect(mocks.aprobarMiContrato).toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rechazar' })).toBeNull()
  })

  it('aprobarNoEnviaSiNoSeConfirma', async () => {
    window.confirm = vi.fn(() => false)
    mocks.obtenerMiContrato.mockResolvedValue(enEspera())
    mocks.guardarMisCampos.mockResolvedValue(enEspera({ documentoListo: true }))
    render(<MiContrato />)
    await guardarDomicilio()
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar contrato' }))
    expect(mocks.aprobarMiContrato).not.toHaveBeenCalled()
  })

  it('cambiosSinGuardarBloqueanAprobar', async () => {
    mocks.obtenerMiContrato.mockResolvedValue(enEspera())
    mocks.guardarMisCampos.mockResolvedValue(enEspera({ documentoListo: true }))
    render(<MiContrato />)
    await guardarDomicilio()
    expect(screen.getByRole('button', { name: 'Aprobar contrato' }).disabled).toBe(false)
    fireEvent.change(screen.getByLabelText('Domicilio'), { target: { value: 'Otra calle 1' } })
    expect(screen.getByRole('button', { name: 'Aprobar contrato' }).disabled).toBe(true)
  })

  it('previewFallidaTrasGuardarNoDejaAprobarLaAnterior', async () => {
    mocks.obtenerMiContrato.mockResolvedValue(enEspera())
    mocks.guardarMisCampos.mockResolvedValue(enEspera({ documentoListo: true }))
    render(<MiContrato />)
    await guardarDomicilio()
    mocks.obtenerMiContratoPdf.mockRejectedValueOnce(new Error('No se pudo generar la previsualización'))
    fireEvent.change(screen.getByLabelText('Domicilio'), { target: { value: 'Otra calle 1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y previsualizar' }))
    expect(await screen.findByText('No se pudo generar la previsualización')).toBeTruthy()
    expect(screen.queryByTitle('Contrato en PDF')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Aprobar contrato' })).toBeNull()
  })

  it('rechazarVuelveASinContrato', async () => {
    window.prompt = vi.fn(() => 'Sueldo distinto')
    mocks.obtenerMiContrato.mockResolvedValue(enEspera())
    mocks.guardarMisCampos.mockResolvedValue(enEspera({ documentoListo: true }))
    mocks.rechazarMiContrato.mockResolvedValue(sinContrato)
    render(<MiContrato />)
    await guardarDomicilio()
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))
    expect(await screen.findByText(SIN_CONTRATO_TEXTO)).toBeTruthy()
    expect(mocks.rechazarMiContrato).toHaveBeenCalledWith('Sueldo distinto')
    expect(screen.queryByTitle('Contrato en PDF')).toBeNull()
  })

  it('rechazarCanceladoNoEnvia', async () => {
    window.prompt = vi.fn(() => null)
    mocks.obtenerMiContrato.mockResolvedValue(enEspera())
    mocks.guardarMisCampos.mockResolvedValue(enEspera({ documentoListo: true }))
    render(<MiContrato />)
    await guardarDomicilio()
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))
    expect(mocks.rechazarMiContrato).not.toHaveBeenCalled()
  })

  it('firmadoSoloPdfYDescarga', async () => {
    mocks.obtenerMiContrato.mockResolvedValue(firmado())
    render(<MiContrato />)
    expect(await screen.findByTitle('Contrato en PDF')).toBeTruthy()
    const descarga = await screen.findByRole('link', { name: 'Descargar PDF' })
    expect(descarga.getAttribute('download')).toBe('contrato-2026-12-01.pdf')
    expect(descarga.getAttribute('href')).toBe('blob:pdf')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(mocks.obtenerCamposPlantilla).not.toHaveBeenCalled()
    expect(mocks.obtenerMiContratoPdf).toHaveBeenCalledTimes(1)
  })

  it('firmadoSinDocumentoMuestraAviso', async () => {
    mocks.obtenerMiContrato.mockResolvedValue(firmado({ documentoListo: false }))
    render(<MiContrato />)
    expect(await screen.findByText('Tu contrato firmado no tiene documento disponible.')).toBeTruthy()
    expect(screen.queryByTitle('Contrato en PDF')).toBeNull()
    expect(mocks.obtenerMiContratoPdf).not.toHaveBeenCalled()
  })

  it('errorDeCargaMuestraMensaje', async () => {
    mocks.obtenerMiContrato.mockRejectedValue(new Error('Tu usuario no está vinculado a una ficha de trabajador'))
    render(<MiContrato />)
    expect(await screen.findByText('Tu usuario no está vinculado a una ficha de trabajador')).toBeTruthy()
  })

  it('revocaElBlobAlDesmontar', async () => {
    mocks.obtenerMiContrato.mockResolvedValue(firmado())
    const { unmount } = render(<MiContrato />)
    await screen.findByTitle('Contrato en PDF')
    unmount()
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf'))
  })
})
