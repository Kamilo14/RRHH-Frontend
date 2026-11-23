import { describe, expect, it } from 'vitest'
import { leerClaims, necesitaRefrescar } from './jwtClaims'
import type { MeResponse } from '../services/identityService'

const b64url = (texto: string) => {
  const bytes = new TextEncoder().encode(texto)
  let binario = ''
  bytes.forEach((b) => { binario += String.fromCharCode(b) })
  return btoa(binario).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}
const tok = (claims: object) => `h.${b64url(JSON.stringify(claims))}.s`

describe('jwtClaims', () => {
  it('leerClaims tolera padding y basura', () => {
    const claims = leerClaims(tok({ 'custom:role': 'Trabajador', name: 'Ñandú' }))
    expect(claims['custom:role']).toBe('Trabajador')
    expect(claims.name).toBe('Ñandú')
    expect(leerClaims('basura')).toEqual({})
    expect(leerClaims('')).toEqual({})
    expect(leerClaims('h.%%%.s')).toEqual({})
    expect(leerClaims(`h.${b64url('[1,2]')}.s`)).toEqual({})
  })

  it('necesitaRefrescar compara rol y tenant del token con me', () => {
    const me = { role: 'Trabajador', tenantId: 't-1', estado: 'ACTIVO' } as MeResponse
    expect(necesitaRefrescar(tok({ 'custom:role': 'Trabajador', 'custom:tenant_id': 't-1' }), me)).toBe(false)
    expect(necesitaRefrescar(tok({}), me)).toBe(true)
    expect(necesitaRefrescar(tok({ 'custom:role': 'Trabajador', 'custom:tenant_id': 't-2' }), me)).toBe(true)
    expect(necesitaRefrescar(tok({ 'custom:role': 'AdminPlataforma' }), { role: 'AdminPlataforma', tenantId: null, estado: 'ACTIVO' } as MeResponse)).toBe(false)
    expect(necesitaRefrescar('basura', me)).toBe(true)
  })
})
