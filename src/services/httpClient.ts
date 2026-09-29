/**
 * httpClient.ts
 * Cliente HTTP base con axios que inyecta automáticamente:
 *  - Authorization: Bearer <token> (desde localStorage)
 *  - X-Empresa-Slug: <slug>        (desde localStorage)
 *
 * Cada service importa este helper en lugar de llamar fetch directamente.
 */

import axios, { type AxiosInstance, type AxiosError } from 'axios'

// ─── Tipos comunes de respuesta del backend ───────────────────────────────────

export interface ApiResponse<T> {
  codigo: number
  mensaje: string
  datos: T
  errores: { campo: string; detalle: string }[]
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const TOKEN_KEY = 'rrhh_token'
export const SLUG_KEY = 'rrhh_empresa_slug'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getSlug(): string | null {
  return localStorage.getItem(SLUG_KEY)
}

export function saveAuth(token: string, slug: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(SLUG_KEY, slug)
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(SLUG_KEY)
}

// ─── Cliente Axios ─────────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor de request - agrega token y slug
apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const slug = getSlug()
  if (slug) {
    config.headers['X-Empresa-Slug'] = slug
  }

  return config
})

// Interceptor de response - maneja errores
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearAuth()
      window.location.href = '/login'
    }

    let mensaje = `Error ${error.response?.status || 'desconocido'}`
    if (error.response?.data) {
      const errorData = error.response.data as ApiResponse<null>
      mensaje = errorData.mensaje || mensaje
    }

    return Promise.reject(new Error(mensaje))
  }
)

// ─── Función base ─────────────────────────────────────────────────────────────

interface RequestOptions {
  /** Si true, no adjunta Authorization header (para endpoints públicos) */
  public?: boolean
}

export async function apiRequest<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { public: isPublic = false } = options

  if (isPublic) {
    const response = await apiClient.get(url, {
      headers: { Authorization: undefined, 'X-Empresa-Slug': undefined },
    })
    return response.data as T
  }

  const response = await apiClient.get(url)
  return response.data as T
}

export async function apiPost<T>(url: string, data: any): Promise<T> {
  const response = await apiClient.post(url, data)
  return response.data as T
}

export async function apiPatch<T>(url: string, data: any): Promise<T> {
  const response = await apiClient.patch(url, data)
  return response.data as T
}

export async function apiPut<T>(url: string, data: any): Promise<T> {
  const response = await apiClient.put(url, data)
  return response.data as T
}

export async function apiDelete<T>(url: string): Promise<T> {
  const response = await apiClient.delete(url)
  return response.data as T
}

export default apiClient

