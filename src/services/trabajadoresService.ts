/**
 * trabajadoresService.ts
 * MS Trabajadores — puerto 8082
 *
 * Endpoints cubiertos:
 *  GET    /api/v1/trabajadores               → listar todos
 *  GET    /api/v1/trabajadores/:id           → obtener uno
 *  POST   /api/v1/trabajadores               → crear
 *  PATCH  /api/v1/trabajadores/:id           → actualizar
 *  DELETE /api/v1/trabajadores/:id           → soft-delete (desactivar)
 *  GET    /api/v1/departamentos              → listar departamentos
 *  GET    /api/v1/cargos                     → listar cargos
 */

import { apiRequest, apiPost, apiPatch, apiDelete, type ApiResponse } from './httpClient'
import { invitarUsuario } from './identityService'

const BASE = import.meta.env.VITE_API_TRABAJADORES as string

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface TrabajadorResponse {
  id: string
  tenantId: string
  nombre: string
  apellido: string
  rutTrabajador: string
  email: string
  telefono: string | null
  departamentoId: string | null
  cargoId: string | null
  jefaturaId: string | null
  diasVacacionesDisponibles: number
  activo: boolean
}

export interface Departamento {
  id: string
  nombre: string
  tenantId: string
}

export interface Cargo {
  id: string
  nombre: string
  tenantId: string
}

export interface CrearTrabajadorRequest {
  nombre: string
  apellido: string
  rutTrabajador: string
  email: string
  telefono?: string
  departamentoId?: string
  cargoId?: string
  jefaturaId?: string
}

export type ActualizarTrabajadorRequest = Partial<CrearTrabajadorRequest>

// ─── Funciones ────────────────────────────────────────────────────────────────

/** Lista todos los trabajadores activos del tenant */
export async function listarTrabajadores(): Promise<TrabajadorResponse[]> {
  const res = await apiRequest<ApiResponse<TrabajadorResponse[]>>(`${BASE}/trabajadores`)
  return res.datos
}

/** Obtiene la ficha de un trabajador por su ID */
export async function obtenerTrabajador(id: string): Promise<TrabajadorResponse> {
  const res = await apiRequest<ApiResponse<TrabajadorResponse>>(`${BASE}/trabajadores/${id}`)
  return res.datos
}

/** Crea un nuevo trabajador */
export async function crearTrabajador(data: CrearTrabajadorRequest): Promise<TrabajadorResponse> {
  const res = await apiPost<ApiResponse<TrabajadorResponse>>(`${BASE}/trabajadores`, {
    nombre: data.nombre, apellido: data.apellido, email: data.email,
    rut_trabajador: data.rutTrabajador,
    telefono: data.telefono || null,
    departamento_id: data.departamentoId || null,
    cargo_id: data.cargoId || null,
    jefatura_id: data.jefaturaId || null,
  })
  return res.datos
}

export class CuentaPendienteError extends Error {
  trabajador: TrabajadorResponse
  constructor(trabajador: TrabajadorResponse, cause: unknown) {
    super(`La ficha ya está creada, pero la cuenta no se pudo completar. ${cause instanceof Error ? cause.message : ''} Pulsa Guardar para reintentar solo la cuenta.`)
    this.trabajador = trabajador
  }
}

export async function crearTrabajadorConCuenta(data: CrearTrabajadorRequest, pendiente: TrabajadorResponse | null = null) {
  const trabajador = pendiente ?? await crearTrabajador(data)
  try {
    await invitarUsuario({
      email: trabajador.email,
      nombre: `${trabajador.nombre} ${trabajador.apellido}`,
      trabajadorId: trabajador.id,
      crearEnCognito: true,
    })
    return trabajador
  } catch (error) {
    throw new CuentaPendienteError(trabajador, error)
  }
}

/** Actualiza datos de un trabajador (PATCH parcial) */
export async function actualizarTrabajador(
  id: string,
  data: ActualizarTrabajadorRequest
): Promise<TrabajadorResponse> {
  const res = await apiPatch<ApiResponse<TrabajadorResponse>>(`${BASE}/trabajadores/${id}`, data)
  return res.datos
}

/** Desactiva un trabajador (soft delete) */
export async function desactivarTrabajador(id: string): Promise<void> {
  await apiDelete<ApiResponse<{ activo: boolean }>>(`${BASE}/trabajadores/${id}`)
}

/** Lista los departamentos disponibles del tenant */
export async function listarDepartamentos(): Promise<Departamento[]> {
  const res = await apiRequest<ApiResponse<Departamento[]>>(`${BASE}/departamentos`)
  return res.datos
}

/** Lista los cargos disponibles del tenant */
export async function listarCargos(): Promise<Cargo[]> {
  const res = await apiRequest<ApiResponse<Cargo[]>>(`${BASE}/cargos`)
  return res.datos
}
