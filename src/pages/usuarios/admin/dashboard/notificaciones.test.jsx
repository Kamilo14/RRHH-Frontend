// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ user: { role: 'Admin de RRHH' }, listar: vi.fn(), marcar: vi.fn() }))
vi.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }))
vi.mock('../../../../services/notificacionesService', () => ({ listarNotificaciones: mocks.listar, marcarLeida: mocks.marcar }))

import Notificaciones from './notificaciones'

const base = { tenantId: 't', destinatarioId: 'd', canal: 'IN_APP', cuerpo: 'cuerpo', creadoEn: new Date().toISOString(), referenciaId: null }
const N = (id, asunto, tipoEvento, estado = 'PENDIENTE') => ({ ...base, id, asunto, tipoEvento, estado })

beforeEach(() => {
  mocks.user.role = 'Admin de RRHH'
  mocks.listar.mockResolvedValue([
    N('1', 'Nueva solicitud de ausencia', 'ausencia.solicitada'),
    N('2', 'Contrato registrado', 'contrato.creado', 'LEIDA'),
    N('3', 'Sin tipo', null),
  ])
  mocks.marcar.mockImplementation(async (id, { leido }) => ({ ...N(id, 'Nueva solicitud de ausencia', 'ausencia.solicitada', leido ? 'LEIDA' : 'PENDIENTE') }))
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Notificaciones clicables', () => {
  it('solo las notificaciones con destino son enlaces', async () => {
    render(<Notificaciones onNavigate={vi.fn()} />)
    await screen.findByText('Nueva solicitud de ausencia')
    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.getByText('Ir a Ausencias →')).toBeTruthy()
    expect(screen.getByText('Ir a Contratos →')).toBeTruthy()
  })

  it('clic: marca como leída, avisa y navega a la sección', async () => {
    const onNavigate = vi.fn(); const onChange = vi.fn()
    render(<Notificaciones onNavigate={onNavigate} onChange={onChange} />)
    fireEvent.click(await screen.findByRole('link', { name: /Nueva solicitud de ausencia/ }))
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('ausencias'))
    expect(mocks.marcar).toHaveBeenCalledWith('1', { leido: true })
    expect(onChange).toHaveBeenCalled()
  })

  it('clic en una ya leída navega sin llamar a la API', async () => {
    const onNavigate = vi.fn()
    render(<Notificaciones onNavigate={onNavigate} />)
    fireEvent.click(await screen.findByRole('link', { name: /Contrato registrado/ }))
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('contratos'))
    expect(mocks.marcar).not.toHaveBeenCalled()
  })

  it('Enter y espacio también navegan', async () => {
    const onNavigate = vi.fn()
    render(<Notificaciones onNavigate={onNavigate} />)
    const link = await screen.findByRole('link', { name: /Contrato registrado/ })
    fireEvent.keyDown(link, { key: 'Enter' })
    fireEvent.keyDown(link, { key: ' ' })
    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(2))
  })

  it('si marcar como leída falla, igual navega', async () => {
    mocks.marcar.mockRejectedValue(new Error('500'))
    const onNavigate = vi.fn()
    render(<Notificaciones onNavigate={onNavigate} />)
    fireEvent.click(await screen.findByRole('link', { name: /Nueva solicitud de ausencia/ }))
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('ausencias'))
  })

  it('el botón "Marcar como leída" no navega', async () => {
    const onNavigate = vi.fn()
    render(<Notificaciones onNavigate={onNavigate} />)
    await screen.findByText('Nueva solicitud de ausencia')
    fireEvent.click(screen.getAllByRole('button', { name: /Marcar como/ })[0])
    await waitFor(() => expect(mocks.marcar).toHaveBeenCalled())
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('un Trabajador no ve enlace en eventos de contratos', async () => {
    mocks.user.role = 'Trabajador'
    render(<Notificaciones onNavigate={vi.fn()} />)
    await screen.findByText('Contrato registrado')
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByText('Ir a Contratos →')).toBeNull()
  })

  it('sin onNavigate no hay enlaces', async () => {
    render(<Notificaciones />)
    await screen.findByText('Contrato registrado')
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
