/**
 * rolesService.ts
 * MS Identity — puerto 8081
 *
 * Endpoints cubiertos:
 *  GET    /api/v1/tenants/{tenantId}/roles          → listar roles del tenant
 *  POST   /api/v1/tenants/{tenantId}/roles          → crear rol
 *  GET    /api/v1/tenants/{tenantId}/roles/{rolId}  → obtener rol
 *  PUT    /api/v1/tenants/{tenantId}/roles/{rolId}  → actualizar rol
 *  DELETE /api/v1/tenants/{tenantId}/roles/{rolId}  → eliminar rol
 *  GET    /api/v1/tenants/{tenantId}/roles/{rolId}/permisos → permisos del rol
 *  POST   /api/v1/tenants/{tenantId}/roles/{rolId}/permisos → asignar permiso
 *  DELETE /api/v1/tenants/{tenantId}/roles/{rolId}/permisos/{permisoId} → remover permiso
 */

import { apiRequest, apiPost, apiPut, apiDelete, type ApiResponse } from './httpClient'

const BASE = import.meta.env.VITE_API_IDENTITY as string || 'http://localhost:8081'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface RolResponse {
  id: string
  tenantId: string
  nombre: string
  descripcion: string
  estado: string
  creadoEn: string
  actualizadoEn: string
}

export interface PermisoResponse {
  id: string
  nombre: string
  descripcion: string
}

export interface CrearRolRequest {
  nombre: string
  descripcion: string
}

export interface ActualizarRolRequest {
  nombre?: string
  descripcion?: string
  estado?: string
}

// ─── Funciones ────────────────────────────────────────────────────────────────

/** Lista todos los roles del tenant */
export async function listarRoles(): Promise<RolResponse[]> {
  const res = await apiRequest<ApiResponse<RolResponse[]>>(`${BASE}/roles`)
  return res.datos
}

/** Obtiene un rol por su ID */
export async function obtenerRol(id: string): Promise<RolResponse> {
  const res = await apiRequest<ApiResponse<RolResponse>>(`${BASE}/roles/${id}`)
  return res.datos
}

/** Crea un nuevo rol */
export async function crearRol(data: CrearRolRequest): Promise<RolResponse> {
  const res = await apiPost<ApiResponse<RolResponse>>(`${BASE}/roles`, data)
  return res.datos
}

/** Actualiza un rol existente */
export async function actualizarRol(
  id: string,
  data: ActualizarRolRequest
): Promise<RolResponse> {
  const res = await apiPut<ApiResponse<RolResponse>>(`${BASE}/roles/${id}`, data)
  return res.datos
}

/** Elimina un rol */
export async function eliminarRol(id: string): Promise<void> {
  await apiDelete<ApiResponse<void>>(`${BASE}/roles/${id}`)
}

/** Lista los permisos asignados a un rol */
export async function listarPermisosRol(rolId: string): Promise<PermisoResponse[]> {
  const res = await apiRequest<ApiResponse<PermisoResponse[]>>(`${BASE}/roles/${rolId}/permisos`)
  return res.datos
}

/** Asigna un permiso a un rol */
export async function asignarPermiso(rolId: string, permisoId: string): Promise<void> {
  await apiPost<ApiResponse<void>>(`${BASE}/roles/${rolId}/permisos`, { permisoId })
}

/** Remueve un permiso de un rol */
export async function removerPermiso(rolId: string, permisoId: string): Promise<void> {
  await apiDelete<ApiResponse<void>>(`${BASE}/roles/${rolId}/permisos/${permisoId}`)
}
