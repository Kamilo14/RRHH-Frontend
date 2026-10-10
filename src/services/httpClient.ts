/**
 * httpClient.ts
 * Cliente HTTP base con axios que inyecta automáticamente:
 *  - Authorization: Bearer <token> (desde localStorage)
 *  - X-Empresa-Slug: <slug>        (desde localStorage)
 *
 * Cada service importa este helper en lugar de llamar fetch directamente.
 */

import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { refreshIdToken } from './cognitoAuth'
import { clearAuth, getSlug, getToken, tokenExpiresSoon } from './tokenStorage'

export { clearAuth, getSlug, getToken } from './tokenStorage'

// ─── Tipos comunes de respuesta del backend ───────────────────────────────────

export interface ApiResponse<T> {
  codigo: number
  mensaje: string
  datos: T
  errores: { campo: string; detalle: string }[]
}

type AuthRequestConfig = InternalAxiosRequestConfig & { skipAuth?: boolean; retried?: boolean }

// ─── Cliente Axios ─────────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(async (config: AuthRequestConfig) => {
  if (!config.skipAuth && tokenExpiresSoon()) {
    await refreshIdToken()
  }

  if (!config.skipAuth) {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  const slug = getSlug()
  if (slug && !config.skipAuth) {
    config.headers['X-Empresa-Slug'] = slug
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as AuthRequestConfig | undefined
    if (error.response?.status === 401 && config && !config.skipAuth && !config.retried) {
      config.retried = true
      const next = await refreshIdToken()
      if (next) {
        config.headers.Authorization = `Bearer ${next}`
        return apiClient.request(config)
      }
      clearAuth()
      window.location.href = '/login'
    } else if (error.response?.status === 401 && config && !config.skipAuth) {
      clearAuth()
      window.location.href = '/login'
    }

    if (!error.response) {
      return Promise.reject(new Error(
        'No se pudo conectar con el servicio solicitado. Verifica que el API Gateway y los servicios conectados a la EC2 estén disponibles.',
      ))
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
    const response = await apiClient.get(url, { skipAuth: true } as AuthRequestConfig)
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
