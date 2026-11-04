/**
 * httpClient.ts
 * Cliente HTTP base con axios que inyecta automáticamente:
 *  - Authorization: Bearer <token> (desde localStorage)
 *  - X-Empresa-Slug: <slug>        (desde localStorage)
 *
 * Cada service importa este helper en lugar de llamar fetch directamente.
 */

import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { clearAuth, getSlug, getToken } from './tokenStorage'

export { clearAuth, getSlug, getToken, saveAuth } from './tokenStorage'

// ─── Tipos comunes de respuesta del backend ───────────────────────────────────

export interface ApiResponse<T> {
  codigo: number
  mensaje: string
  datos: T
  errores: { campo: string; detalle: string }[]
}

export interface ErrorDeCampo {
  campo: string
  detalle: string
}

/** Error que rechaza el interceptor: `message` es el `mensaje` del backend y `errores` sus errores por campo. */
export type ApiError = Error & { errores: ErrorDeCampo[] }

type AuthRequestConfig = InternalAxiosRequestConfig & { skipAuth?: boolean }

// ─── Cliente Axios ─────────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(async (config: AuthRequestConfig) => {
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

/** Cuerpo de error como objeto; una descarga con `responseType: 'blob'` lo trae como Blob con JSON. */
async function leerCuerpoDeError(data: unknown): Promise<Partial<ApiResponse<null>> | null> {
  if (!data) return null
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      return JSON.parse(await data.text()) as Partial<ApiResponse<null>>
    } catch {
      return null
    }
  }
  return typeof data === 'object' ? (data as Partial<ApiResponse<null>>) : null
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as AuthRequestConfig | undefined
    if (error.response?.status === 401 && config && !config.skipAuth) {
      clearAuth()
      window.location.href = '/login'
    }

    if (!error.response) {
      return Promise.reject(Object.assign(new Error(
        'No se pudo conectar con el servicio solicitado. Verifica que el API Gateway y los servicios conectados a la EC2 estén disponibles.',
      ), { errores: [] }) as ApiError)
    }

    let mensaje = `Error ${error.response?.status || 'desconocido'}`
    let errores: ErrorDeCampo[] = []
    const errorData = await leerCuerpoDeError(error.response.data)
    if (errorData) {
      mensaje = errorData.mensaje || mensaje
      if (Array.isArray(errorData.errores)) errores = errorData.errores
    }

    return Promise.reject(Object.assign(new Error(mensaje), { errores }) as ApiError)
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

/** POST cuyo cuerpo puede faltar (acciones sin datos, como aprobar). */
export async function apiPostEmpty<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiClient.post(url, data)
  return response.data as T
}

/** GET de un archivo binario (por ejemplo, un PDF). */
export async function apiGetBlob(url: string): Promise<Blob> {
  const response = await apiClient.get(url, { responseType: 'blob' })
  return response.data as Blob
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
