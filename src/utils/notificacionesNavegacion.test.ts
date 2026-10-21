import { describe, expect, it } from 'vitest'
import { seccionDestino } from './notificacionesNavegacion'

describe('seccionDestino', () => {
  it.each([
    ['ausencia.solicitada', 'ausencias'],
    ['ausencia.aprobada', 'ausencias'],
    ['ausencia.rechazada', 'ausencias'],
    ['contrato.creado', 'contratos'],
    ['contrato.finalizado', 'contratos'],
    ['asistencia.editada', 'asistencia'],
  ])('%s lleva a %s para Admin de RRHH', (evento, seccion) => {
    expect(seccionDestino(evento, 'Admin de RRHH')).toBe(seccion)
  })

  it('acepta el rol en formato ROLE_*', () => {
    expect(seccionDestino('ausencia.solicitada', 'ROLE_ADMIN_RRHH')).toBe('ausencias')
  })

  it('no ofrece destino si el rol no accede a la sección', () => {
    expect(seccionDestino('contrato.creado', 'Trabajador')).toBeNull()
    expect(seccionDestino('contrato.creado', 'Jefatura')).toBeNull()
  })

  it('los eventos de ausencias sí llevan a un Trabajador', () => {
    expect(seccionDestino('ausencia.aprobada', 'Trabajador')).toBe('ausencias')
  })

  it.each([null, undefined, '', 'evento.desconocido', 'sinpunto'])('tipo %s no tiene destino', (tipo) => {
    expect(seccionDestino(tipo, 'Admin de RRHH')).toBeNull()
  })

  it('sin rol no hay destino', () => {
    expect(seccionDestino('ausencia.solicitada', null)).toBeNull()
  })
})
