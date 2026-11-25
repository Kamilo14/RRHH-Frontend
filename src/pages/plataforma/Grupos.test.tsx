// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listarGrupos: vi.fn(),
  crearGrupo: vi.fn(),
  renombrarGrupo: vi.fn(),
  borrarGrupo: vi.fn(),
  fijarEmpresas: vi.fn(),
  fijarOperadores: vi.fn(),
  listarOperadores: vi.fn(),
  listarEmpresas: vi.fn(),
}))
vi.mock('../../services/identityService', () => ({
  listarGrupos: mocks.listarGrupos,
  crearGrupo: mocks.crearGrupo,
  renombrarGrupo: mocks.renombrarGrupo,
  borrarGrupo: mocks.borrarGrupo,
  fijarEmpresasGrupo: mocks.fijarEmpresas,
  fijarOperadoresGrupo: mocks.fijarOperadores,
  listarOperadores: mocks.listarOperadores,
  listarEmpresasPlataforma: mocks.listarEmpresas,
}))

import Grupos from './Grupos'

const grupo = { id: 'g-1', nombre: 'Sur', tenantIds: [] as string[], operadorIds: [] as string[] }
const acme = { id: 't-9', nombreEmpresa: 'Acme', grupo: null, estado: 'ACTIVO' }
const beta = { id: 't-8', nombreEmpresa: 'Beta', grupo: 'Norte', estado: 'ACTIVO' }
const delta = { id: 't-7', nombreEmpresa: 'Delta', grupo: null, estado: 'PENDIENTE_ACTIVACION' }
const operador = { id: 'op-1', email: 'op@rrhh.cl', nombre: 'Op', estado: 'ACTIVO' }

function datos(grupos = [grupo]) {
  mocks.listarGrupos.mockResolvedValue(grupos)
  mocks.listarEmpresas.mockResolvedValue([acme, beta, delta])
  mocks.listarOperadores.mockResolvedValue([operador])
}

afterEach(() => {
  cleanup()
  for (const fn of Object.values(mocks)) fn.mockReset()
  vi.restoreAllMocks()
})

describe('Grupos', () => {
  it('creaYRenombraUnGrupo', async () => {
    datos([])
    mocks.crearGrupo.mockResolvedValue(grupo)
    mocks.renombrarGrupo.mockResolvedValue({ ...grupo, nombre: 'Sur Austral' })
    render(<Grupos />)
    const crear = await screen.findByRole('button', { name: 'Crear grupo' })
    fireEvent.click(crear)
    expect(await screen.findByRole('alert')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Nombre del grupo'), { target: { value: 'x'.repeat(81) } })
    fireEvent.click(crear)
    expect(mocks.crearGrupo).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Nombre del grupo'), { target: { value: 'Sur' } })
    fireEvent.click(crear)
    await waitFor(() => expect(mocks.crearGrupo).toHaveBeenCalledWith('Sur'))
    expect(await screen.findByRole('heading', { name: 'Sur' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Nuevo nombre de Sur'), { target: { value: 'Sur Austral' } })
    fireEvent.click(screen.getByRole('button', { name: 'Renombrar Sur' }))
    await waitFor(() => expect(mocks.renombrarGrupo).toHaveBeenCalledWith('g-1', 'Sur Austral'))
    expect(await screen.findByRole('heading', { name: 'Sur Austral' })).toBeTruthy()
  })

  it('eligeEmpresasYOperadores', async () => {
    datos()
    mocks.fijarEmpresas.mockResolvedValue({ ...grupo, tenantIds: ['t-9'] })
    mocks.fijarOperadores.mockResolvedValue({ ...grupo, tenantIds: ['t-9'], operadorIds: ['op-1'] })
    render(<Grupos />)
    const tarjeta = await screen.findByRole('region', { name: 'Grupo Sur' })
    fireEvent.click(within(tarjeta).getByLabelText('Acme'))
    expect(within(tarjeta).getByText('(en Norte)')).toBeTruthy()
    fireEvent.click(within(tarjeta).getByRole('button', { name: 'Guardar empresas' }))
    await waitFor(() => expect(mocks.fijarEmpresas).toHaveBeenCalledWith('g-1', ['t-9']))
    fireEvent.click(within(tarjeta).getByLabelText('op@rrhh.cl'))
    fireEvent.click(within(tarjeta).getByRole('button', { name: 'Guardar operadores' }))
    await waitFor(() => expect(mocks.fijarOperadores).toHaveBeenCalledWith('g-1', ['op-1']))
  })

  it('guardarListasVaciasEsValido', async () => {
    datos([{ ...grupo, tenantIds: ['t-9'] }])
    mocks.fijarEmpresas.mockResolvedValue({ ...grupo, tenantIds: [] })
    render(<Grupos />)
    const tarjeta = await screen.findByRole('region', { name: 'Grupo Sur' })
    const casilla = within(tarjeta).getByLabelText('Acme') as HTMLInputElement
    expect(casilla.checked).toBe(true)
    fireEvent.click(casilla)
    fireEvent.click(within(tarjeta).getByRole('button', { name: 'Guardar empresas' }))
    await waitFor(() => expect(mocks.fijarEmpresas).toHaveBeenCalledWith('g-1', []))
  })

  it('muestraElError409DelBackend', async () => {
    datos()
    mocks.fijarEmpresas.mockRejectedValue(new Error('La empresa ya pertenece a otro grupo'))
    render(<Grupos />)
    const tarjeta = await screen.findByRole('region', { name: 'Grupo Sur' })
    fireEvent.click(within(tarjeta).getByLabelText(/^Beta/))
    fireEvent.click(within(tarjeta).getByRole('button', { name: 'Guardar empresas' }))
    expect(await within(tarjeta).findByText('La empresa ya pertenece a otro grupo')).toBeTruthy()
  })

  it('borrarPideConfirmacion', async () => {
    datos()
    mocks.borrarGrupo.mockResolvedValue(undefined)
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    render(<Grupos />)
    const borrar = await screen.findByRole('button', { name: 'Borrar Sur' })
    fireEvent.click(borrar)
    expect(mocks.borrarGrupo).not.toHaveBeenCalled()
    fireEvent.click(borrar)
    await waitFor(() => expect(mocks.borrarGrupo).toHaveBeenCalledWith('g-1'))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Sur' })).toBeNull())
    expect(confirmar).toHaveBeenCalledTimes(2)
  })

  it('soloOfreceEmpresasActivas', async () => {
    datos()
    render(<Grupos />)
    const tarjeta = await screen.findByRole('region', { name: 'Grupo Sur' })
    expect(within(tarjeta).getByLabelText('Acme')).toBeTruthy()
    expect(within(tarjeta).queryByLabelText(/^Delta/)).toBeNull()
  })

  it('cargaParcialSiFallanLosOperadores', async () => {
    mocks.listarGrupos.mockResolvedValue([grupo])
    mocks.listarEmpresas.mockResolvedValue([acme])
    mocks.listarOperadores.mockRejectedValue(new Error('Recurso no encontrado'))
    render(<Grupos />)
    expect(await screen.findByText('No se pudieron cargar los operadores: Recurso no encontrado')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ver grupo Sur' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Grupo Sur' })).toBeTruthy()
  })
})
