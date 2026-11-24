// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  integrantes: vi.fn(),
  cambiarRol: vi.fn(),
  suspender: vi.fn(),
  reactivar: vi.fn(),
  mensaje: vi.fn(),
}))
vi.mock('../../services/identityService', () => ({
  listarIntegrantes: mocks.integrantes,
  cambiarRolIntegrante: mocks.cambiarRol,
  suspenderEmpresa: mocks.suspender,
  reactivarEmpresa: mocks.reactivar,
  enviarMensajeEmpresa: mocks.mensaje,
}))

import DetalleEmpresa from './DetalleEmpresa'

const empresa = {
  id: 't-1', nombreEmpresa: 'Gamma', slug: 'gamma', activo: true, estado: 'ACTIVO', rutEmpresa: '78888888-K',
  razonSocial: null, registradoPorEmail: null, cognitoError: null, grupo: 'Sur',
}
const persona = (id: string, rol: string, estado = 'ACTIVO') => ({
  id, tenantId: 't-1', email: `${id}@x.cl`, nombre: id, rol, estado, trabajadorId: null, cognitoSub: null, contrasenaTemporal: null,
  cognitoError: null as string | null,
})

function renderDetalle(estado = 'ACTIVO') {
  const onCambio = vi.fn()
  render(<DetalleEmpresa empresa={{ ...empresa, estado }} onCambio={onCambio} onCerrar={vi.fn()} />)
  return onCambio
}

afterEach(() => {
  cleanup()
  for (const fn of Object.values(mocks)) fn.mockReset()
})

describe('DetalleEmpresa', () => {
  it('listaIntegrantesYCambiaRol', async () => {
    mocks.integrantes.mockResolvedValue([persona('u-1', 'Trabajador')])
    mocks.cambiarRol.mockResolvedValue(persona('u-1', 'Jefatura'))
    renderDetalle()
    const select = await screen.findByLabelText('Rol de u-1@x.cl')
    fireEvent.change(select, { target: { value: 'Jefatura' } })
    await waitFor(() => expect(mocks.cambiarRol).toHaveBeenCalledWith('t-1', 'u-1', 'Jefatura'))
    await waitFor(() => expect((screen.getByLabelText('Rol de u-1@x.cl') as HTMLSelectElement).value).toBe('Jefatura'))
  })

  it('sinSelectorParaSuperAdminNiCuentasNoActivas', async () => {
    mocks.integrantes.mockResolvedValue([persona('s-1', 'SuperAdmin'), persona('i-1', 'Trabajador', 'INVITADO'), persona('p-1', 'Trabajador', 'PENDIENTE')])
    renderDetalle()
    expect(await screen.findByText('s-1@x.cl')).toBeTruthy()
    expect(screen.queryByLabelText('Rol de s-1@x.cl')).toBeNull()
    expect(screen.queryByLabelText('Rol de i-1@x.cl')).toBeNull()
    expect(screen.queryByLabelText('Rol de p-1@x.cl')).toBeNull()
  })

  it('suspenderExigeMotivo', async () => {
    mocks.integrantes.mockResolvedValue([])
    mocks.suspender.mockResolvedValue({ ...empresa, estado: 'SUSPENDIDO', activo: false })
    const onCambio = renderDetalle()
    fireEvent.click(await screen.findByRole('button', { name: 'Suspender empresa' }))
    expect(await screen.findByText('Indica el motivo de la suspensión.')).toBeTruthy()
    expect(mocks.suspender).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Motivo de la suspensión'), { target: { value: 'Impago' } })
    fireEvent.click(screen.getByRole('button', { name: 'Suspender empresa' }))
    await waitFor(() => expect(mocks.suspender).toHaveBeenCalledWith('t-1', 'Impago'))
    await waitFor(() => expect(onCambio).toHaveBeenCalledWith(expect.objectContaining({ estado: 'SUSPENDIDO' })))
  })

  it('reactivarSoloSiSuspendida', async () => {
    mocks.integrantes.mockResolvedValue([])
    mocks.reactivar.mockResolvedValue({ ...empresa, estado: 'ACTIVO' })
    renderDetalle('SUSPENDIDO')
    fireEvent.click(await screen.findByRole('button', { name: 'Reactivar empresa' }))
    await waitFor(() => expect(mocks.reactivar).toHaveBeenCalledWith('t-1'))
    expect(screen.queryByRole('button', { name: 'Suspender empresa' })).toBeNull()
    cleanup()
    renderDetalle('ACTIVO')
    expect(await screen.findByRole('button', { name: 'Suspender empresa' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reactivar empresa' })).toBeNull()
  })

  it('mensajeMuestraDestinatariosYElError409', async () => {
    mocks.integrantes.mockResolvedValue([])
    renderDetalle()
    const form = await screen.findByRole('form', { name: 'Mensaje al Admin de RRHH' })
    const enviar = within(form).getByRole('button', { name: 'Enviar mensaje' })
    fireEvent.change(within(form).getByLabelText('Cuerpo'), { target: { value: 'Hola' } })
    // Un input de texto no acepta saltos de línea (el navegador los quita); el backend también los rechaza.
    fireEvent.change(within(form).getByLabelText('Asunto'), { target: { value: 'x'.repeat(101) } })
    fireEvent.click(enviar)
    expect(await within(form).findByRole('alert')).toBeTruthy()
    fireEvent.change(within(form).getByLabelText('Asunto'), { target: { value: '' } })
    fireEvent.click(enviar)
    expect(mocks.mensaje).not.toHaveBeenCalled()
    mocks.mensaje.mockResolvedValueOnce(2)
    fireEvent.change(within(form).getByLabelText('Asunto'), { target: { value: 'Aviso' } })
    fireEvent.click(enviar)
    await waitFor(() => expect(mocks.mensaje).toHaveBeenCalledWith('t-1', 'Aviso', 'Hola'))
    expect(await screen.findByText('Mensaje enviado a 2 destinatarios.')).toBeTruthy()
    mocks.mensaje.mockRejectedValueOnce(new Error('La empresa no tiene un Admin de RRHH ni un SuperAdmin activo'))
    fireEvent.change(within(form).getByLabelText('Asunto'), { target: { value: 'Aviso 2' } })
    fireEvent.change(within(form).getByLabelText('Cuerpo'), { target: { value: 'Hola 2' } })
    fireEvent.click(enviar)
    expect(await within(form).findByText('La empresa no tiene un Admin de RRHH ni un SuperAdmin activo')).toBeTruthy()
  })

  it('avisaSiCognitoFallaAlCambiarElRol', async () => {
    mocks.integrantes.mockResolvedValue([persona('u-1', 'Trabajador')])
    mocks.cambiarRol.mockResolvedValue({ ...persona('u-1', 'Jefatura'), cognitoError: 'AccessDeniedException' })
    renderDetalle()
    fireEvent.change(await screen.findByLabelText('Rol de u-1@x.cl'), { target: { value: 'Jefatura' } })
    expect(await screen.findByText(/AccessDeniedException/)).toBeTruthy()
    expect(screen.queryByText(/próximo inicio de sesión/)).toBeNull()
  })

  it('avisaSiCognitoFallaAlSuspenderOReactivar', async () => {
    mocks.integrantes.mockResolvedValue([])
    mocks.reactivar.mockResolvedValue({ ...empresa, estado: 'ACTIVO', cognitoError: 'UserNotFoundException' })
    renderDetalle('SUSPENDIDO')
    fireEvent.click(await screen.findByRole('button', { name: 'Reactivar empresa' }))
    expect(await screen.findByText(/UserNotFoundException/)).toBeTruthy()
    cleanup()
    mocks.suspender.mockResolvedValue({ ...empresa, estado: 'SUSPENDIDO', cognitoError: 'AccessDeniedException' })
    renderDetalle('ACTIVO')
    fireEvent.change(await screen.findByLabelText('Motivo de la suspensión'), { target: { value: 'Impago' } })
    fireEvent.click(screen.getByRole('button', { name: 'Suspender empresa' }))
    expect(await screen.findByText(/AccessDeniedException/)).toBeTruthy()
  })
})
