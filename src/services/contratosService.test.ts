// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiPatch: vi.fn(),
  apiGetBlob: vi.fn(),
  apiPostEmpty: vi.fn(),
}))

vi.mock('./httpClient', () => ({
  apiRequest: mocks.apiRequest,
  apiPost: mocks.apiPost,
  apiPut: mocks.apiPut,
  apiPatch: mocks.apiPatch,
  apiGetBlob: mocks.apiGetBlob,
  apiPostEmpty: mocks.apiPostEmpty,
}))

import {
  aprobarMiContrato,
  emitirContrato,
  guardarMisCampos,
  listarContratos,
  obtenerCamposPlantilla,
  obtenerContratoPdf,
  obtenerMiContrato,
  obtenerMiContratoPdf,
  rechazarMiContrato,
} from './contratosService'

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset())
})

describe('contratosService', () => {
  it('normalizaContratoSinEstado', async () => {
    mocks.apiRequest.mockResolvedValue({
      datos: [
        { id: 'c1', trabajador_id: 't1', activo: true },
        { id: 'c2', trabajador_id: 't2', activo: false },
      ],
    })
    const [a, b] = await listarContratos()
    expect([a.estado, b.estado]).toEqual(['FIRMADO', 'FINALIZADO'])
    expect(a.documentoFirmado).toBe(false)
    expect(a.jornadaHorasSemanales).toBeNull()
  })

  it('normaliza estado, jornada y documento en snake_case', async () => {
    mocks.apiRequest.mockResolvedValue({
      datos: [{ id: 'c1', activo: false, estado: 'PENDIENTE_FIRMA', jornada_horas_semanales: 42, documento_firmado: true }],
    })
    const [c] = await listarContratos()
    expect(c).toMatchObject({ estado: 'PENDIENTE_FIRMA', jornadaHorasSemanales: 42, documentoFirmado: true })
  })

  it('obtenerMiContrato normaliza snake_case', async () => {
    mocks.apiRequest.mockResolvedValue({
      datos: {
        estado: 'EN_ESPERA',
        contrato: { id: 'c1', activo: false, estado: 'PENDIENTE_FIRMA' },
        campos_rrhh: { rrhh_sueldo_base: '900000' },
        campos_trabajador: null,
        documento_listo: false,
      },
    })
    const mio = await obtenerMiContrato()
    expect(mocks.apiRequest).toHaveBeenCalledWith(expect.stringMatching(/\/contratos\/mio$/))
    expect(mio).toMatchObject({
      estado: 'EN_ESPERA',
      camposRrhh: { rrhh_sueldo_base: '900000' },
      camposTrabajador: {},
      documentoListo: false,
    })
    expect(mio.contrato?.estado).toBe('PENDIENTE_FIRMA')
  })

  it('obtenerMiContrato sin contrato deja contrato null y campos vacíos', async () => {
    mocks.apiRequest.mockResolvedValue({
      datos: { estado: 'SIN_CONTRATO', contrato: null, campos_rrhh: null, campos_trabajador: null, documento_listo: false },
    })
    const mio = await obtenerMiContrato()
    expect(mio).toEqual({ estado: 'SIN_CONTRATO', contrato: null, camposRrhh: {}, camposTrabajador: {}, documentoListo: false })
  })

  it('obtenerCamposPlantilla pide los campos de la plantilla', async () => {
    const campos = [{ clave: 'rrhh_sueldo_base', etiqueta: 'Sueldo base', responsable: 'RRHH', tipo: 'NUMERO', opciones: [], obligatorio: true }]
    mocks.apiRequest.mockResolvedValue({ datos: campos })
    await expect(obtenerCamposPlantilla()).resolves.toEqual(campos)
    expect(mocks.apiRequest).toHaveBeenCalledWith(expect.stringMatching(/\/contratos\/plantilla\/campos$/))
  })

  it('emitirContrato envía trabajador_id y campos', async () => {
    mocks.apiPost.mockResolvedValue({ datos: { id: 'c1', activo: false, estado: 'PENDIENTE_FIRMA' } })
    const c = await emitirContrato('t1', { rrhh_sueldo_base: '900000' })
    expect(mocks.apiPost).toHaveBeenCalledWith(expect.stringMatching(/\/contratos\/emitir$/), {
      trabajador_id: 't1',
      campos: { rrhh_sueldo_base: '900000' },
    })
    expect(c.estado).toBe('PENDIENTE_FIRMA')
  })

  it('guardarMisCampos hace PUT con los campos', async () => {
    mocks.apiPut.mockResolvedValue({
      datos: { estado: 'EN_ESPERA', contrato: null, campos_rrhh: {}, campos_trabajador: { trabajador_domicilio: 'x' }, documento_listo: true },
    })
    const mio = await guardarMisCampos({ trabajador_domicilio: 'x' })
    expect(mocks.apiPut).toHaveBeenCalledWith(expect.stringMatching(/\/contratos\/mio\/campos$/), {
      campos: { trabajador_domicilio: 'x' },
    })
    expect(mio.documentoListo).toBe(true)
  })

  it('aprobarMiContrato hace POST a /mio/aprobar', async () => {
    mocks.apiPostEmpty.mockResolvedValue({ datos: { estado: 'FIRMADO', contrato: null, documento_listo: true } })
    const mio = await aprobarMiContrato()
    expect(mocks.apiPostEmpty).toHaveBeenCalledWith(expect.stringMatching(/\/contratos\/mio\/aprobar$/))
    expect(mio.estado).toBe('FIRMADO')
  })

  it('rechazarMiContrato envía el motivo', async () => {
    mocks.apiPostEmpty.mockResolvedValue({ datos: { estado: 'SIN_CONTRATO', contrato: null, documento_listo: false } })
    const mio = await rechazarMiContrato('x')
    expect(mocks.apiPostEmpty).toHaveBeenCalledWith(expect.stringMatching(/\/contratos\/mio\/rechazar$/), { motivo: 'x' })
    expect(mio.estado).toBe('SIN_CONTRATO')
  })

  it('obtenerMiContratoPdf pide el blob de /mio/pdf', async () => {
    const blob = new Blob(['%PDF'])
    mocks.apiGetBlob.mockResolvedValue(blob)
    await expect(obtenerMiContratoPdf()).resolves.toBe(blob)
    expect(mocks.apiGetBlob).toHaveBeenCalledWith(expect.stringMatching(/\/contratos\/mio\/pdf$/))
  })

  it('obtenerContratoPdf pide el blob del contrato', async () => {
    const blob = new Blob(['%PDF'])
    mocks.apiGetBlob.mockResolvedValue(blob)
    await expect(obtenerContratoPdf('c1')).resolves.toBe(blob)
    expect(mocks.apiGetBlob).toHaveBeenCalledWith(expect.stringMatching(/\/contratos\/c1\/pdf$/))
  })
})

describe('interceptor de errores de httpClient', () => {
  function adapterQueResponde(status: number, data: unknown) {
    return (config: InternalAxiosRequestConfig) => {
      const response = { data, status, statusText: 'Bad Request', headers: {}, config } as AxiosResponse
      return Promise.reject(new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, response))
    }
  }

  it('errorConservaErroresPorCampo', async () => {
    const real = await vi.importActual<typeof import('./httpClient')>('./httpClient')
    const promesa = real.default.get('/x', {
      adapter: adapterQueResponde(400, {
        mensaje: 'Validación fallida',
        errores: [{ campo: 'rrhh_sueldo_base', detalle: 'Debe ser mayor que 0' }],
      }),
    })
    await expect(promesa).rejects.toMatchObject({
      message: 'Validación fallida',
      errores: [{ campo: 'rrhh_sueldo_base', detalle: 'Debe ser mayor que 0' }],
    })
  })

  it('error sin errores por campo trae errores vacío', async () => {
    const real = await vi.importActual<typeof import('./httpClient')>('./httpClient')
    const promesa = real.default.get('/x', { adapter: adapterQueResponde(409, { mensaje: 'Estado inválido' }) })
    await expect(promesa).rejects.toMatchObject({ message: 'Estado inválido', errores: [] })
  })

  it('error de una descarga blob conserva el mensaje del backend', async () => {
    const real = await vi.importActual<typeof import('./httpClient')>('./httpClient')
    const cuerpo = new Blob([JSON.stringify({ mensaje: 'Aún no hay documento para previsualizar' })], { type: 'application/json' })
    const promesa = real.default.get('/x', { responseType: 'blob', adapter: adapterQueResponde(409, cuerpo) })
    await expect(promesa).rejects.toMatchObject({ message: 'Aún no hay documento para previsualizar', errores: [] })
  })
})
