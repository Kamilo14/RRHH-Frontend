/**
 * permisosService.ts
 * MS Identity — puerto 8081
 *
 * Endpoints cubiertos:
 *  GET    /api/v1/permisos                    → listar todos los permisos del sistema
 *  POST   /api/v1/permisos                    → crear permiso (solo SuperAdmin)
 *  GET    /api/v1/permisos/{id}               → obtener permiso
 */

import { apiRequest, apiPost, type ApiResponse } from './httpClient'

const BASE = import.meta.env.VITE_API_IDENTITY as string || 'http://localhost:8081'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PermisoResponse {
  id: string
  nombre: string
  descripcion: string
  categoria?: string
}

export interface CrearPermisoRequest {
  nombre: string
  descripcion: string
  categoria?: string
}

// ─── Funciones ────────────────────────────────────────────────────────────────

/** Lista todos los permisos del sistema */
export async function listarPermisos(): Promise<PermisoResponse[]> {
  const res = await apiRequest<ApiResponse<PermisoResponse[]>>(`${BASE}/permisos`)
  return res.datos
}

/** Obtiene un permiso por su ID */
export async function obtenerPermiso(id: string): Promise<PermisoResponse> {
  const res = await apiRequest<ApiResponse<PermisoResponse>>(`${BASE}/permisos/${id}`)
  return res.datos
}

/** Crea un nuevo permiso (solo SuperAdmin) */
export async function crearPermiso(data: CrearPermisoRequest): Promise<PermisoResponse> {
  const res = await apiPost<ApiResponse<PermisoResponse>>(`${BASE}/permisos`, data)
  return res.datos
}
