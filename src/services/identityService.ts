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
import { API_BASE } from './apiConfig'

const BASE = API_BASE

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MeResponse {
  userId: string | null
  tenantId: string | null
  email: string | null
  nombre: string | null
  role: string | null
  trabajadorId: string | null
  cognitoSub: string | null
  estado: string
  codigo: string | null
  pendiente: boolean
  tenantSlug: string | null
}

interface MeResponseApi {
  user_id: string
  tenant_id: string | null
  email: string
  nombre: string | null
  role: string | null
  trabajador_id: string | null
  cognito_sub: string | null
  estado: string
  codigo: string | null
  pendiente: boolean
  tenant_slug: string | null
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
  trabajadorId: string
  nombre: string
  rol: string
  crearEnCognito: boolean
}

export interface AsignarUsuarioRequest {
  tenantId: string
  rol: string
}

export interface CambiarEstadoRequest {
  estado: string
}

export interface SolicitarAccesoRequest {
  tenantSlug: string
}

// ─── Funciones ────────────────────────────────────────────────────────────────

/** Obtiene el perfil del usuario autenticado */
export async function getMe(): Promise<MeResponse> {
  const res = await apiRequest<ApiResponse<MeResponseApi>>(`${BASE}/auth/me`)
  return {
    userId: res.datos.user_id,
    tenantId: res.datos.tenant_id,
    email: res.datos.email,
    nombre: res.datos.nombre,
    role: res.datos.role,
    trabajadorId: res.datos.trabajador_id,
    cognitoSub: res.datos.cognito_sub,
    estado: res.datos.estado,
    codigo: res.datos.codigo,
    pendiente: res.datos.pendiente,
    tenantSlug: res.datos.tenant_slug,
  }
}

export async function solicitarAcceso(data: SolicitarAccesoRequest): Promise<UsuarioResponse> {
  const res = await apiPost<ApiResponse<UsuarioResponse>>(`${BASE}/auth/access-requests`, {
    tenant_slug: data.tenantSlug,
  })
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
  const res = await apiRequest<ApiResponse<UsuarioResponseApi[]>>(`${BASE}/usuarios`)
  return res.datos.map(normalizarUsuario)
}

/** Lista usuarios pendientes de asignación */
export async function listarUsuariosPendientes(): Promise<UsuarioResponse[]> {
  const res = await apiRequest<ApiResponse<UsuarioResponseApi[]>>(`${BASE}/usuarios/pendientes`)
  return res.datos.map(normalizarUsuario)
}

/** Obtiene un usuario por ID */
export async function obtenerUsuario(id: string): Promise<UsuarioResponse> {
  const res = await apiRequest<ApiResponse<UsuarioResponseApi>>(`${BASE}/usuarios/${id}`)
  return normalizarUsuario(res.datos)
}

/** Crea un usuario en el tenant */
export async function crearUsuario(data: CrearUsuarioRequest): Promise<UsuarioResponse> {
  const res = await apiPost<ApiResponse<UsuarioResponse>>(`${BASE}/usuarios`, data)
  return res.datos
}

/** Invita un trabajador al tenant */
export async function invitarUsuario(data: InvitarUsuarioRequest): Promise<UsuarioResponse> {
  const res = await apiPost<ApiResponse<UsuarioResponse>>(`${BASE}/usuarios/invitar`, {
    email: data.email,
    trabajador_id: data.trabajadorId,
    nombre: data.nombre,
    rol: data.rol,
    crear_en_cognito: data.crearEnCognito,
  })
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

interface UsuarioResponseApi {
  id: string
  tenant_id?: string
  tenantId?: string
  email: string
  nombre: string | null
  rol: string
  estado: string
  trabajador_id?: string | null
  trabajadorId?: string | null
  cognito_sub?: string | null
  cognitoSub?: string | null
}

function normalizarUsuario(usuario: UsuarioResponseApi): UsuarioResponse {
  return {
    id: usuario.id,
    tenantId: usuario.tenantId ?? usuario.tenant_id ?? '',
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    estado: usuario.estado,
    trabajadorId: usuario.trabajadorId ?? usuario.trabajador_id ?? null,
    cognitoSub: usuario.cognitoSub ?? usuario.cognito_sub ?? null,
  }
}
