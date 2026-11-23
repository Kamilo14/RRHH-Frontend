import type { MeResponse } from '../services/identityService'

/**
 * Lee los claims del payload de un JWT (base64url, con o sin padding, UTF-8).
 * Nunca lanza: ante un token vacío o malformado devuelve `{}`.
 */
export function leerClaims(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1]
    if (!payload) return {}
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const conPadding = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const binario = atob(conPadding)
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0))
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return claims && typeof claims === 'object' && !Array.isArray(claims)
      ? claims as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

/**
 * true cuando el rol o el tenant del token no coinciden con los que identity
 * devuelve en `me`: el token quedó viejo y hay que refrescarlo (S7).
 */
export function necesitaRefrescar(token: string, me: MeResponse): boolean {
  const claims = leerClaims(token)
  const rolToken = claims['custom:role'] ?? null
  const tenantToken = claims['custom:tenant_id'] ?? null
  return rolToken !== (me.role ?? null) || tenantToken !== (me.tenantId ?? null)
}
