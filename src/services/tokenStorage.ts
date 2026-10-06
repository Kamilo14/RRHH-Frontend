export const TOKEN_KEY = 'rrhh_token'
export const ACCESS_TOKEN_KEY = 'rrhh_access_token'
export const REFRESH_TOKEN_KEY = 'rrhh_refresh_token'
export const TOKEN_EXP_KEY = 'rrhh_token_exp'
export const SLUG_KEY = 'rrhh_empresa_slug'

const SKEW_SECONDS = 60

export interface StoredSession {
  idToken: string
  accessToken: string
  refreshToken: string
  expiresAt: number
  slug: string
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getSlug(): string | null {
  return localStorage.getItem(SLUG_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function tokenExpiresSoon(): boolean {
  const raw = localStorage.getItem(TOKEN_EXP_KEY)
  if (!raw) return false
  const expiresAt = Number(raw)
  if (!Number.isFinite(expiresAt)) return true
  return expiresAt - SKEW_SECONDS <= Math.floor(Date.now() / 1000)
}

export function saveSession(session: StoredSession): void {
  localStorage.setItem(TOKEN_KEY, session.idToken)
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)
  localStorage.setItem(TOKEN_EXP_KEY, String(session.expiresAt))
  localStorage.setItem(SLUG_KEY, session.slug)
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXP_KEY)
  localStorage.removeItem(SLUG_KEY)
}
