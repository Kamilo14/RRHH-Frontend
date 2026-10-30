// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: { role: 'AdminPlataforma' },
  listar: vi.fn(),
  activar: vi.fn(),
  rechazar: vi.fn(),
  crear: vi.fn(),
  logout: vi.fn(),
}))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user, logout: mocks.logout }) }))
vi.mock('../../services/identityService', () => ({
  listarEmpresasPlataforma: mocks.listar,
  activarEmpresa: mocks.activar,
  rechazarEmpresa: mocks.rechazar,
  crearUsuarioPlataforma: mocks.crear,
}))

import Plataforma from './Plataforma'

const empresa = { id: 't-9', nombreEmpresa: 'Acme', rutEmpresa: '76086428-5', estado: 'PENDIENTE_ACTIVACION', registradoPorEmail: 'a@gmail.com', cognitoError: null }

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  for (const fn of [mocks.listar, mocks.activar, mocks.rechazar, mocks.crear]) fn.mockReset()
})

describe('Plataforma', () => {
  it('lista las empresas pendientes por defecto y filtra por estado', async () => {
    mocks.user.role = 'AdminPlataforma'; mocks.listar.mockResolvedValue([empresa])
    render(<Plataforma />)
    expect(await screen.findByText('Acme')).toBeTruthy()
    expect(mocks.listar).toHaveBeenCalledWith('PENDIENTE_ACTIVACION')
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: '' } })
    await waitFor(() => expect(mocks.listar).toHaveBeenLastCalledWith(undefined))
  })

  it('admin plataforma activa una empresa pendiente', async () => {
    mocks.user.role = 'AdminPlataforma'; mocks.listar.mockResolvedValue([empresa]); mocks.activar.mockResolvedValue({ ...empresa, estado: 'ACTIVO' })
    render(<Plataforma />)
    fireEvent.click(await screen.findByRole('button', { name: 'Activar Acme' }))
    await waitFor(() => expect(mocks.activar).toHaveBeenCalledWith('t-9'))
    expect(await screen.findByText('ACTIVO')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Activar Acme' })).toBeNull()
  })

  it('muestra el error de Cognito al activar', async () => {
    mocks.user.role = 'AdminPlataforma'; mocks.listar.mockResolvedValue([empresa])
    mocks.activar.mockResolvedValue({ ...empresa, estado: 'ACTIVO', cognitoError: 'UserNotFoundException' })
    render(<Plataforma />)
    fireEvent.click(await screen.findByRole('button', { name: 'Activar Acme' }))
    expect(await screen.findByText(/UserNotFoundException/)).toBeTruthy()
  })

  it('rechazar exige motivo', async () => {
    mocks.user.role = 'AdminPlataforma'; mocks.listar.mockResolvedValue([empresa]); mocks.rechazar.mockResolvedValue({ ...empresa, estado: 'RECHAZADO' })
    render(<Plataforma />)
    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar Acme' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }))
    expect(mocks.rechazar).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Motivo del rechazo'), { target: { value: 'Datos falsos' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }))
    await waitFor(() => expect(mocks.rechazar).toHaveBeenCalledWith('t-9', 'Datos falsos'))
    expect(await screen.findByText('RECHAZADO')).toBeTruthy()
  })

  it('operador ve la lista sin acciones ni creación de usuarios', async () => {
    mocks.user.role = 'OperadorSaaS'; mocks.listar.mockResolvedValue([empresa])
    render(<Plataforma />)
    expect(await screen.findByText('Acme')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Activar Acme' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rechazar Acme' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Usuarios de plataforma' })).toBeNull()
  })

  it('admin crea un OperadorSaaS', async () => {
    mocks.user.role = 'AdminPlataforma'; mocks.listar.mockResolvedValue([]); mocks.crear.mockResolvedValue({ email: 'soporte@rrhh.cl' })
    render(<Plataforma />)
    fireEvent.click(screen.getByRole('tab', { name: 'Usuarios de plataforma' }))
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'soporte@rrhh.cl' } })
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Soporte' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    await waitFor(() => expect(mocks.crear).toHaveBeenCalledWith({ email: 'soporte@rrhh.cl', nombre: 'Soporte', rol: 'OperadorSaaS' }))
  })

  it('crear un SuperAdmin exige una empresa activa', async () => {
    mocks.user.role = 'AdminPlataforma'
    mocks.listar.mockImplementation(async (estado?: string) => (estado === 'ACTIVO' ? [{ ...empresa, id: 't-1', nombreEmpresa: 'Beta', estado: 'ACTIVO' }] : []))
    mocks.crear.mockResolvedValue({ email: 'jefe@beta.cl' })
    render(<Plataforma />)
    fireEvent.click(screen.getByRole('tab', { name: 'Usuarios de plataforma' }))
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'jefe@beta.cl' } })
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Jefa' } })
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'SuperAdmin' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    expect(mocks.crear).not.toHaveBeenCalled()
    await screen.findByRole('option', { name: 'Beta' })
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 't-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))
    await waitFor(() => expect(mocks.crear).toHaveBeenCalledWith({ email: 'jefe@beta.cl', nombre: 'Jefa', rol: 'SuperAdmin', tenantId: 't-1' }))
  })
})
