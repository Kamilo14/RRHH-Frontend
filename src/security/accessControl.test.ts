import { describe, expect, it } from 'vitest'
import { canAccessSection, dashboardForRole, normalizeRole } from './accessControl'

describe('accessControl', () => {
  it('dashboardForRole roles de plataforma', () => {
    expect(dashboardForRole('AdminPlataforma')).toBe('/plataforma')
    expect(dashboardForRole('OperadorSaaS')).toBe('/plataforma')
    expect(dashboardForRole('ROLE_ADMIN_PLATAFORMA')).toBe('/plataforma')
    expect(dashboardForRole('Admin de RRHH')).toBe('/admin/dashboard')
    expect(dashboardForRole('SuperAdmin')).toBe('/admin/dashboard')
    expect(dashboardForRole('Trabajador')).toBe('/dashboard')
    expect(dashboardForRole(null)).toBe('/dashboard')
    expect(canAccessSection('AdminPlataforma', 'plataforma')).toBe(true)
    expect(canAccessSection('OperadorSaaS', 'plataforma')).toBe(true)
    expect(canAccessSection('Admin de RRHH', 'plataforma')).toBe(false)
    expect(canAccessSection('SuperAdmin', 'plataforma')).toBe(false)
  })

  it('seccionMiContrato', () => {
    expect(canAccessSection('Trabajador', 'mi-contrato')).toBe(true)
    expect(canAccessSection('Jefatura', 'mi-contrato')).toBe(true)
    expect(canAccessSection('Admin de RRHH', 'mi-contrato')).toBe(false)
    expect(canAccessSection('SuperAdmin', 'mi-contrato')).toBe(false)
    expect(canAccessSection('Trabajador', 'contratos')).toBe(false)
  })

  it('normaliza AdminPlataforma', () => {
    expect(normalizeRole('AdminPlataforma')).toBe('ADMIN_PLATAFORMA')
    expect(normalizeRole('ROLE_ADMIN_PLATAFORMA')).toBe('ADMIN_PLATAFORMA')
  })
})
