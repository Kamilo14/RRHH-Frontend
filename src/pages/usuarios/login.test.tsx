// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  oidcUser: null as { id_token: string } | null,
  signinRedirect: vi.fn(),
  signinSilent: vi.fn(),
  removeUser: vi.fn(),
  resolver: vi.fn(),
  solicitarAcceso: vi.fn(),
  getMe: vi.fn(),
  refreshUser: vi.fn(),
  authenticate: vi.fn(),
}))

vi.mock('react-oidc-context', () => ({
  useAuth: () => ({
    user: mocks.oidcUser,
    isLoading: false,
    error: undefined,
    signinRedirect: mocks.signinRedirect,
    signinSilent: mocks.signinSilent,
    removeUser: mocks.removeUser,
  }),
}))
vi.mock('../../services/identityService', () => ({
  resolverEmpresaPorRut: mocks.resolver,
  solicitarAcceso: mocks.solicitarAcceso,
  getMe: mocks.getMe,
}))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ refreshUser: mocks.refreshUser }) }))
vi.mock('../../services/cognitoAuth', () => ({ authenticate: mocks.authenticate }))

import Login from './login'
import { getToken } from '../../services/tokenStorage'

const b64url = (texto: string) => btoa(texto).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const tok = (claims: object) => `h.${b64url(JSON.stringify(claims))}.s`

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<p>dashboard trabajador</p>} />
        <Route path="/admin/dashboard" element={<p>dashboard admin</p>} />
        <Route path="/registro-empresa" element={<p>registro empresa</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mocks.oidcUser = null
  mocks.signinRedirect.mockResolvedValue(undefined)
  mocks.removeUser.mockResolvedValue(undefined)
  mocks.refreshUser.mockResolvedValue(undefined)
  mocks.solicitarAcceso.mockResolvedValue({})
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mocks.resolver.mockReset()
  mocks.getMe.mockReset()
  mocks.signinSilent.mockReset()
  mocks.authenticate.mockReset()
  sessionStorage.clear()
  localStorage.clear()
})

describe('Login multiempresa', () => {
  it('unirme no redirige sin rut o con rut inexistente', async () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: 'Unirme a mi empresa' }))
    fireEvent.change(screen.getByLabelText('RUT de la empresa'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar empresa' }))
    expect(mocks.resolver).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('Ingresa el RUT de tu empresa.')
    mocks.resolver.mockRejectedValueOnce(new Error('La empresa no está registrada en el sistema'))
    fireEvent.change(screen.getByLabelText('RUT de la empresa'), { target: { value: '11.111.111-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar empresa' }))
    expect(await screen.findByText('La empresa no está registrada en el sistema')).toBeTruthy()
    expect(mocks.resolver).toHaveBeenCalledWith('11.111.111-1')
    expect(mocks.signinRedirect).not.toHaveBeenCalled()
  })

  it('unirme confirma la empresa antes de ir a Google', async () => {
    mocks.resolver.mockResolvedValueOnce({ existe: true, slug: 'acme', nombreEmpresa: 'Acme' })
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: 'Unirme a mi empresa' }))
    fireEvent.change(screen.getByLabelText('RUT de la empresa'), { target: { value: ' 76.086.428-5 ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar empresa' }))
    expect(await screen.findByText('¿Te refieres a Acme?')).toBeTruthy()
    expect(mocks.signinRedirect).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Sí, continuar con Google' }))
    expect(sessionStorage.getItem('rrhh_google_rut')).toBe('76.086.428-5')
    expect(sessionStorage.getItem('rrhh_google_mode')).toBe('unirme')
    expect(mocks.signinRedirect).toHaveBeenCalledWith({ extraQueryParams: { identity_provider: 'Google' } })
  })

  it('al volver de Google en modo unirme envía la solicitud y muestra el estado', async () => {
    sessionStorage.setItem('rrhh_google_mode', 'unirme'); sessionStorage.setItem('rrhh_google_rut', '76.086.428-5')
    mocks.oidcUser = { id_token: 'tok' }
    mocks.getMe.mockResolvedValue({ estado: 'PENDIENTE', tenantEstado: 'ACTIVO', tenantNombre: 'Acme' })
    renderLogin()
    expect(await screen.findByText('Tu solicitud fue enviada a Acme. RRHH fue notificado')).toBeTruthy()
    expect(mocks.solicitarAcceso).toHaveBeenCalledWith({ rutEmpresa: '76.086.428-5' })
    expect(sessionStorage.getItem('rrhh_google_rut')).toBeNull()
  })

  it('si la solicitud falla muestra el error del servidor', async () => {
    sessionStorage.setItem('rrhh_google_mode', 'unirme'); sessionStorage.setItem('rrhh_google_rut', '76.086.428-5')
    mocks.oidcUser = { id_token: 'tok' }
    mocks.solicitarAcceso.mockRejectedValueOnce(new Error('Tu solicitud fue rechazada por esta empresa'))
    renderLogin()
    expect(await screen.findByText('Tu solicitud fue rechazada por esta empresa')).toBeTruthy()
    expect(mocks.removeUser).toHaveBeenCalled()
  })

  it('cuenta sin empresa ve las dos opciones', async () => {
    sessionStorage.setItem('rrhh_google_mode', 'login'); mocks.oidcUser = { id_token: 'tok' }
    mocks.getMe.mockResolvedValue({ estado: 'NO_REGISTRADO' })
    renderLogin()
    expect(await screen.findByText('Tu cuenta no está asociada a una empresa')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Registrar mi empresa' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Unirme a mi empresa' })).toBeTruthy()
  })

  it('registrar mi empresa redirige a Google en modo registro-empresa', async () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar mi empresa' }))
    await waitFor(() => expect(mocks.signinRedirect).toHaveBeenCalled())
    expect(sessionStorage.getItem('rrhh_google_mode')).toBe('registro-empresa')
  })

  it('al volver de Google sin empresa en modo registro-empresa va al formulario', async () => {
    sessionStorage.setItem('rrhh_google_mode', 'registro-empresa'); mocks.oidcUser = { id_token: 'tok' }
    mocks.getMe.mockResolvedValue({ estado: 'NO_REGISTRADO' })
    renderLogin()
    expect(await screen.findByText('registro empresa')).toBeTruthy()
    expect(getToken()).toBe('tok')
  })

  it('un trabajador activo con token al día entra a su dashboard sin refrescar', async () => {
    const token = tok({ 'custom:role': 'Trabajador', 'custom:tenant_id': 't-1' })
    sessionStorage.setItem('rrhh_google_mode', 'login'); mocks.oidcUser = { id_token: token }
    mocks.getMe.mockResolvedValue({ estado: 'ACTIVO', role: 'Trabajador', tenantId: 't-1', tenantSlug: 'acme' })
    renderLogin()
    expect(await screen.findByText('dashboard trabajador')).toBeTruthy()
    expect(mocks.signinSilent).not.toHaveBeenCalled()
  })

  it('refresca el token cuando el rol cambió y luego navega', async () => {
    sessionStorage.setItem('rrhh_google_mode', 'login'); mocks.oidcUser = { id_token: tok({}) }
    const nuevo = tok({ 'custom:role': 'SuperAdmin', 'custom:tenant_id': 't-1' })
    mocks.signinSilent.mockResolvedValue({ id_token: nuevo })
    mocks.getMe.mockResolvedValue({ estado: 'ACTIVO', role: 'SuperAdmin', tenantId: 't-1', tenantSlug: 'acme' })
    renderLogin()
    expect(await screen.findByText('dashboard admin')).toBeTruthy()
    expect(mocks.signinSilent).toHaveBeenCalledTimes(1)
    expect(getToken()).toBe(nuevo)
  })

  it('si el refresco falla pide cerrar sesión', async () => {
    sessionStorage.setItem('rrhh_google_mode', 'login'); mocks.oidcUser = { id_token: tok({}) }
    mocks.signinSilent.mockRejectedValue(new Error('invalid_grant'))
    mocks.getMe.mockResolvedValue({ estado: 'ACTIVO', role: 'SuperAdmin', tenantId: 't-1', tenantSlug: 'acme' })
    renderLogin()
    expect(await screen.findByText('Cierra sesión y vuelve a ingresar para actualizar tus permisos')).toBeTruthy()
    expect(screen.queryByText('dashboard admin')).toBeNull()
  })

  it('una cuenta inactiva no entra al dashboard', async () => {
    sessionStorage.setItem('rrhh_google_mode', 'login'); mocks.oidcUser = { id_token: 'tok' }
    mocks.getMe.mockResolvedValue({ estado: 'INACTIVO', role: 'Trabajador', tenantId: 't-1', tenantSlug: 'acme' })
    renderLogin()
    expect(await screen.findByText('Tu cuenta no está activa. Contacta al área de RRHH de tu empresa.')).toBeTruthy()
    expect(screen.queryByText('dashboard trabajador')).toBeNull()
  })

  it('no existe registro con correo y contraseña', () => {
    renderLogin()
    expect(screen.queryByRole('button', { name: 'Crear cuenta' })).toBeNull()
    expect(screen.queryByLabelText('Celular')).toBeNull()
  })
})
