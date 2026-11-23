// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listarContratos: vi.fn(),
  finalizarContrato: vi.fn(),
  obtenerCamposPlantilla: vi.fn(),
  emitirContrato: vi.fn(),
  obtenerContratoPdf: vi.fn(),
  listarTrabajadores: vi.fn(),
}))
vi.mock('../../../../services/contratosService', () => ({
  listarContratos: mocks.listarContratos,
  finalizarContrato: mocks.finalizarContrato,
  obtenerCamposPlantilla: mocks.obtenerCamposPlantilla,
  emitirContrato: mocks.emitirContrato,
  obtenerContratoPdf: mocks.obtenerContratoPdf,
}))
vi.mock('../../../../services/trabajadoresService', () => ({ listarTrabajadores: mocks.listarTrabajadores }))

import Contratos from './contratos'

const campo = (clave, etiqueta, responsable, tipo, extra = {}) => ({ clave, etiqueta, responsable, tipo, opciones: [], obligatorio: true, ...extra })
const campos = [
  campo('rrhh_sueldo_base', 'Sueldo base', 'RRHH', 'NUMERO'),
  campo('rrhh_horas_semanales', 'Horas semanales', 'RRHH', 'ENTERO'),
  campo('rrhh_tipo_contrato', 'Tipo contrato', 'RRHH', 'OPCION', { opciones: ['INDEFINIDO', 'PLAZO_FIJO', 'HONORARIOS'] }),
  campo('rrhh_fecha_inicio', 'Fecha inicio', 'RRHH', 'FECHA'),
  campo('rrhh_fecha_termino', 'Fecha termino', 'RRHH', 'FECHA', { obligatorio: false }),
  campo('trabajador_domicilio', 'Domicilio', 'TRABAJADOR', 'TEXTO'),
]
const trabajador = (id, activo = true) => ({ id, nombre: `Nombre ${id}`, apellido: 'Apellido', rutTrabajador: `rut-${id}`, activo })
const contrato = (id, trabajadorId, estado, extra = {}) => ({
  id,
  tenantId: 'tn',
  trabajadorId,
  salarioBase: 900000,
  tipoContrato: 'INDEFINIDO',
  fechaInicio: '2026-12-01',
  fechaTermino: null,
  activo: estado === 'FIRMADO',
  estado,
  jornadaHorasSemanales: 42,
  documentoFirmado: false,
  ...extra,
})

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:pdf')
  URL.revokeObjectURL = vi.fn()
  window.open = vi.fn(() => ({}))
  mocks.obtenerCamposPlantilla.mockResolvedValue(campos)
  mocks.listarTrabajadores.mockResolvedValue([trabajador('t1')])
  mocks.listarContratos.mockResolvedValue([])
  mocks.obtenerContratoPdf.mockResolvedValue(new Blob(['%PDF']))
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

async function abrirNuevoContrato() {
  render(<Contratos />)
  await waitFor(() => expect(mocks.listarTrabajadores).toHaveBeenCalled())
  await screen.findByRole('table')
  fireEvent.click(screen.getByRole('button', { name: /Nuevo contrato/ }))
  return screen.findByLabelText('Sueldo base')
}

describe('Contratos (admin)', () => {
  it('listaSoloTrabajadoresSinContrato', async () => {
    mocks.listarTrabajadores.mockResolvedValue(['t1', 't2', 't3', 't4', 't5'].map((id) => trabajador(id)).concat(trabajador('t6', false)))
    mocks.listarContratos.mockResolvedValue([
      contrato('c2', 't2', 'PENDIENTE_FIRMA'),
      contrato('c3', 't3', 'FIRMADO'),
      contrato('c4', 't4', 'RECHAZADO'),
      contrato('c5', 't5', 'FINALIZADO'),
    ])
    await abrirNuevoContrato()
    const opciones = within(screen.getByLabelText(/^Trabajador/)).getAllByRole('option')
      .map((opcion) => opcion.value)
      .filter(Boolean)
    expect(opciones).toEqual(['t1', 't4', 't5'])
  })

  it('formularioSoloTieneCamposRrhh', async () => {
    await abrirNuevoContrato()
    expect(screen.getByLabelText('Sueldo base')).toBeTruthy()
    expect(screen.queryByLabelText('Domicilio')).toBeNull()
  })

  it('emiteConFechaTerminoVacia', async () => {
    mocks.emitirContrato.mockResolvedValue(contrato('c1', 't1', 'PENDIENTE_FIRMA'))
    await abrirNuevoContrato()
    fireEvent.change(screen.getByLabelText(/^Trabajador/), { target: { value: 't1' } })
    fireEvent.change(screen.getByLabelText('Sueldo base'), { target: { value: '900000' } })
    fireEvent.change(screen.getByLabelText('Horas semanales'), { target: { value: '42' } })
    fireEvent.change(screen.getByLabelText('Tipo contrato'), { target: { value: 'INDEFINIDO' } })
    fireEvent.change(screen.getByLabelText('Fecha inicio'), { target: { value: '2026-12-01' } })
    const llamadasAntes = mocks.listarContratos.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Enviar contrato' }))
    await waitFor(() => expect(mocks.emitirContrato).toHaveBeenCalledWith('t1', {
      rrhh_sueldo_base: '900000',
      rrhh_horas_semanales: '42',
      rrhh_tipo_contrato: 'INDEFINIDO',
      rrhh_fecha_inicio: '2026-12-01',
      rrhh_fecha_termino: '',
    }))
    await waitFor(() => expect(mocks.listarContratos.mock.calls.length).toBeGreaterThan(llamadasAntes))
    await waitFor(() => expect(screen.queryByLabelText('Sueldo base')).toBeNull())
  })

  it('muestraErroresDeEmision', async () => {
    mocks.emitirContrato.mockRejectedValue(
      Object.assign(new Error('Validación fallida'), { errores: [{ campo: 'rrhh_horas_semanales', detalle: 'Debe estar entre 1 y 42' }] }),
    )
    await abrirNuevoContrato()
    fireEvent.change(screen.getByLabelText(/^Trabajador/), { target: { value: 't1' } })
    fireEvent.change(screen.getByLabelText('Sueldo base'), { target: { value: '900000' } })
    fireEvent.change(screen.getByLabelText('Horas semanales'), { target: { value: '40' } })
    fireEvent.change(screen.getByLabelText('Tipo contrato'), { target: { value: 'INDEFINIDO' } })
    fireEvent.change(screen.getByLabelText('Fecha inicio'), { target: { value: '2026-12-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar contrato' }))
    expect(await screen.findByText('Debe estar entre 1 y 42')).toBeTruthy()
    expect(screen.getByLabelText('Sueldo base')).toBeTruthy()
  })

  it('etiquetasDeEstado', async () => {
    mocks.listarTrabajadores.mockResolvedValue(['t1', 't2', 't3', 't4'].map((id) => trabajador(id)))
    mocks.listarContratos.mockResolvedValue([
      contrato('c1', 't1', 'PENDIENTE_FIRMA'),
      contrato('c2', 't2', 'FIRMADO'),
      contrato('c3', 't3', 'RECHAZADO'),
      contrato('c4', 't4', 'FINALIZADO'),
    ])
    render(<Contratos />)
    const tabla = await screen.findByRole('table')
    for (const etiqueta of ['En espera de firma', 'Firmado', 'Rechazado', 'Finalizado']) {
      expect(within(tabla).getByText(etiqueta)).toBeTruthy()
    }
  })

  it('verDetalleSoloConDocumento', async () => {
    mocks.listarTrabajadores.mockResolvedValue(['t1', 't2', 't3'].map((id) => trabajador(id)))
    mocks.listarContratos.mockResolvedValue([
      contrato('c1', 't1', 'FIRMADO', { documentoFirmado: true }),
      contrato('c2', 't2', 'FIRMADO', { documentoFirmado: false }),
      contrato('c3', 't3', 'PENDIENTE_FIRMA'),
    ])
    render(<Contratos />)
    await screen.findByRole('table')
    const botones = await screen.findAllByRole('button', { name: /Ver detalle/ })
    expect(botones).toHaveLength(1)
    fireEvent.click(botones[0])
    await waitFor(() => expect(window.open).toHaveBeenCalledWith('blob:pdf', '_blank'))
    expect(mocks.obtenerContratoPdf).toHaveBeenCalledWith('c1')
  })

  it('finalizarSoloEnFirmado', async () => {
    mocks.listarTrabajadores.mockResolvedValue(['t1', 't2'].map((id) => trabajador(id)))
    mocks.listarContratos.mockResolvedValue([
      contrato('c1', 't1', 'FIRMADO'),
      contrato('c2', 't2', 'PENDIENTE_FIRMA'),
    ])
    render(<Contratos />)
    await screen.findByRole('table')
    const finalizar = await screen.findAllByRole('button', { name: /^Finalizar contrato/ })
    expect(finalizar).toHaveLength(1)
    expect(finalizar[0].getAttribute('aria-label')).toBe('Finalizar contrato de Nombre t1 Apellido')
  })
})
