// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getToken: vi.fn(), registrar: vi.fn() }))
vi.mock('../../services/tokenStorage', () => ({ getToken: mocks.getToken, clearAuth: vi.fn() }))
vi.mock('../../services/identityService', () => ({ registrarEmpresa: mocks.registrar }))

import RegistroEmpresa from './RegistroEmpresa'

const OBLIGATORIOS: [string, string][] = [
  ['Razón social', 'Acme Servicios SpA'],
  ['Nombre de fantasía', 'Acme'],
  ['RUT de la empresa', '76.086.428-5'],
  ['Giro', 'Servicios'],
  ['Calle', 'Av. Siempre Viva'],
  ['Número', '742'],
  ['Comuna', 'Santiago'],
  ['Región', 'Metropolitana'],
  ['Correo de contacto', 'contacto@acme.cl'],
  ['Nombre del representante legal', 'Rita'],
  ['RUT del representante legal', '11.111.111-1'],
]

function llenarObligatorios() {
  for (const [label, value] of OBLIGATORIOS) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  }
  fireEvent.click(screen.getByLabelText(/Acepto los Términos/))
}

afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.registrar.mockReset() })

describe('RegistroEmpresa', () => {
  it('envía los datos y muestra empresa en revisión', async () => {
    mocks.getToken.mockReturnValue('tok'); mocks.registrar.mockResolvedValue({ nombreEmpresa: 'Acme', estado: 'PENDIENTE_ACTIVACION' })
    render(<MemoryRouter><RegistroEmpresa /></MemoryRouter>)
    llenarObligatorios()
    fireEvent.change(screen.getByLabelText('Teléfono de contacto'), { target: { value: '+56912345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar empresa' }))
    expect(await screen.findByText('Tu empresa Acme está en revisión')).toBeTruthy()
    expect(mocks.registrar).toHaveBeenCalledWith({
      razonSocial: 'Acme Servicios SpA', nombreFantasia: 'Acme', rutEmpresa: '76.086.428-5', giro: 'Servicios',
      codigoActividad: '', direccionCalle: 'Av. Siempre Viva', direccionNumero: '742', comuna: 'Santiago',
      region: 'Metropolitana', emailContacto: 'contacto@acme.cl', telefonoContacto: '+56912345678',
      representanteNombre: 'Rita', representanteRut: '11.111.111-1', aceptaTerminos: true,
    })
  })

  it('sin aceptar términos no envía', () => {
    mocks.getToken.mockReturnValue('tok')
    render(<MemoryRouter><RegistroEmpresa /></MemoryRouter>)
    for (const [label, value] of OBLIGATORIOS) fireEvent.change(screen.getByLabelText(label), { target: { value } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar empresa' }))
    expect(mocks.registrar).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('Términos')
  })

  it('con un obligatorio vacío no envía', () => {
    mocks.getToken.mockReturnValue('tok')
    render(<MemoryRouter><RegistroEmpresa /></MemoryRouter>)
    llenarObligatorios()
    fireEvent.change(screen.getByLabelText('Giro'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar empresa' }))
    expect(mocks.registrar).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('muestra el error del servidor', async () => {
    mocks.getToken.mockReturnValue('tok'); mocks.registrar.mockRejectedValue(new Error('Ya existe una empresa registrada con ese RUT'))
    render(<MemoryRouter><RegistroEmpresa /></MemoryRouter>)
    llenarObligatorios()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar empresa' }))
    expect(await screen.findByText('Ya existe una empresa registrada con ese RUT')).toBeTruthy()
  })

  it('sin token vuelve al login', () => {
    mocks.getToken.mockReturnValue(null)
    render(<MemoryRouter initialEntries={['/registro-empresa']}><Routes><Route path="/registro-empresa" element={<RegistroEmpresa />} /><Route path="/login" element={<p>login</p>} /></Routes></MemoryRouter>)
    expect(screen.getByText('login')).toBeTruthy()
  })
})
