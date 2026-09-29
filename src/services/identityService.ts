/**
 * identityService.ts
 * MS Identity — puerto 8081
 *
 * Endpoints cubiertos:
 *  GET  /api/v1/auth/me                       → perfil del usuario autenticado
 *  GET  /api/v1/tenants/resolver?nombre=xxx   → resolver empresa por nombre (público)
 *  GET  /api/v1/usuarios                      → listar usuarios del tenant
 *  GET  /api/v1/usuarios/pendientes           → usuarios pendientes de asignación
 *  GET  /api/v1/usuarios/:id                  → obtener usuario por id
 *  POST /api/v1/usuarios                      → crear usuario en el tenant
 *  POST /api/v1/usuarios/invitar              → invitar trabajador
 *  POST /api/v1/usuarios/:id/asignar          → asignar usuario a tenant
 *  PATCH /api/v1/usuarios/:id/estado          → cambiar estado del usuario
 */

import { apiRequest, apiPost, apiPatch, type ApiResponse } from './httpClient'

const BASE = import.meta.env.VITE_API_IDENTITY as string

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MeResponse {
  userId: string
  tenantId: string
  email: string
  nombre: string
  role: string
  trabajadorId: string | null
  cognitoSub: string
  estado: string
  codigo: string
  pendiente: boolean
  tenantSlug: string
}

export interface UsuarioResponse {
  id: string
  tenantId: string
  email: string
  nombre: string | null
  rol: string
  estado: string
  trabajadorId: string | null
  cognitoSub: string | null
}

export interface TenantResolverResponse {
  tenantId: string
  nombre: string
  slug: string
}

export interface CrearUsuarioRequest {
  email: string
  rol: string
  trabajadorId?: string
  cognitoSub?: string
}

export interface InvitarUsuarioRequest {
  email: string
  rol: string
}

export interface AsignarUsuarioRequest {
  tenantId: string
  rol: string
}

export interface CambiarEstadoRequest {
  estado: string
}

// ─── Funciones ────────────────────────────────────────────────────────────────

/** Obtiene el perfil del usuario autenticado */
export async function getMe(): Promise<MeResponse> {
  const res = await apiRequest<ApiResponse<MeResponse>>(`${BASE}/auth/me`)
  return res.datos
}

/**
 * Resuelve el tenantId/slug a partir del nombre de empresa.
 * Es público (no requiere token).
 */
export async function resolverEmpresa(nombre: string): Promise<TenantResolverResponse> {
  const url = `${BASE}/tenants/resolver?nombre=${encodeURIComponent(nombre)}`
  const res = await apiRequest<ApiResponse<TenantResolverResponse>>(url, { public: true })
  return res.datos
}

/** Lista todos los usuarios del tenant */
export async function listarUsuarios(): Promise<UsuarioResponse[]> {
  const res = await apiRequest<ApiResponse<UsuarioResponse[]>>(`${BASE}/usuarios`)
  return res.datos
}

/** Lista usuarios pendientes de asignación */
export async function listarUsuariosPendientes(): Promise<UsuarioResponse[]> {
  const res = await apiRequest<ApiResponse<UsuarioResponse[]>>(`${BASE}/usuarios/pendientes`)
  return res.datos
}

/** Obtiene un usuario por ID */
export async function obtenerUsuario(id: string): Promise<UsuarioResponse> {
  const res = await apiRequest<ApiResponse<UsuarioResponse>>(`${BASE}/usuarios/${id}`)
  return res.datos
}

/** Crea un usuario en el tenant */
export async function crearUsuario(data: CrearUsuarioRequest): Promise<UsuarioResponse> {
  const res = await apiPost<ApiResponse<UsuarioResponse>>(`${BASE}/usuarios`, data)
  return res.datos
}

/** Invita un trabajador al tenant */
export async function invitarUsuario(data: InvitarUsuarioRequest): Promise<UsuarioResponse> {
  const res = await apiPost<ApiResponse<UsuarioResponse>>(`${BASE}/usuarios/invitar`, data)
  return res.datos
}

/** Asigna un usuario a un tenant */
export async function asignarUsuario(id: string, data: AsignarUsuarioRequest): Promise<UsuarioResponse> {
  const res = await apiPost<ApiResponse<UsuarioResponse>>(`${BASE}/usuarios/${id}/asignar`, data)
  return res.datos
}

/** Cambia el estado de un usuario (ACTIVO / INACTIVO) */
export async function cambiarEstadoUsuario(id: string, data: CambiarEstadoRequest): Promise<UsuarioResponse> {
  const res = await apiPatch<ApiResponse<UsuarioResponse>>(`${BASE}/usuarios/${id}/estado`, data)
  return res.datos
}
