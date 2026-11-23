import { describe, expect, it } from 'vitest'
import { estadoDeAcceso } from './estadoAcceso'
import type { MeResponse } from '../services/identityService'

describe('estadoDeAcceso', () => {
  it.each([
    [{ estado: 'NO_REGISTRADO' }, 'no-registrado', 'Tu cuenta no está asociada a una empresa'],
    [{ estado: 'PENDIENTE', tenantEstado: 'PENDIENTE_ACTIVACION', tenantNombre: 'Acme' }, 'empresa-en-revision', 'Tu empresa Acme está en revisión'],
    [{ estado: 'PENDIENTE', tenantEstado: 'ACTIVO', tenantNombre: 'Acme' }, 'solicitud-enviada', 'Tu solicitud fue enviada a Acme. RRHH fue notificado'],
    [{ estado: 'RECHAZADO', tenantNombre: 'Acme' }, 'rechazado', 'Tu solicitud fue rechazada'],
    [{ estado: 'ACTIVO', role: 'Trabajador', tenantId: 't' }, 'activo', ''],
  ])('estadoAcceso %o', (me, tipo, texto) => {
    expect(estadoDeAcceso(me as MeResponse)).toEqual({ tipo, texto })
  })

  it('estadoAcceso pendiente sin tenant_estado', () => {
    const r = estadoDeAcceso({ estado: 'PENDIENTE', tenantEstado: null, tenantNombre: 'Acme' } as MeResponse)
    expect(r.tipo).toBe('solicitud-enviada')
    expect(r.texto).not.toContain('null')
  })
})
