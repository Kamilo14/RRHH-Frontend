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
import { API_BASE } from './apiConfig'

const BASE = API_BASE

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
  rol?: string
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
  rol?: string
}

export type ActualizarTrabajadorRequest = Partial<CrearTrabajadorRequest>

// ─── Funciones ────────────────────────────────────────────────────────────────

/** Lista todos los trabajadores activos del tenant */
export async function listarTrabajadores(): Promise<TrabajadorResponse[]> {
  const res = await apiRequest<ApiResponse<TrabajadorApiResponse[]>>(`${BASE}/trabajadores`)
  return res.datos.map(normalizarTrabajador)
}

/** Obtiene la ficha de un trabajador por su ID */
export async function obtenerTrabajador(id: string): Promise<TrabajadorResponse> {
  const res = await apiRequest<ApiResponse<TrabajadorApiResponse>>(`${BASE}/trabajadores/${id}`)
  return normalizarTrabajador(res.datos)
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
  return normalizarTrabajador(res.datos)
}

export class CuentaPendienteError extends Error {
  trabajador: TrabajadorResponse
  rol: string
  constructor(trabajador: TrabajadorResponse, cause: unknown, rol: string) {
    super(`La ficha ya está creada, pero la cuenta no se pudo completar. ${cause instanceof Error ? cause.message : ''} Usa “Sincronizar cuenta” para volver a intentarlo.`)
    this.trabajador = trabajador
    this.rol = rol
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
      rol: data.rol ?? 'TRABAJADOR',
    })
    return trabajador
  } catch (error) {
    throw new CuentaPendienteError(trabajador, error, data.rol ?? 'TRABAJADOR')
  }
}

/** Actualiza datos de un trabajador (PATCH parcial) */
export async function actualizarTrabajador(
  id: string,
  data: ActualizarTrabajadorRequest
): Promise<TrabajadorResponse> {
  const res = await apiPatch<ApiResponse<TrabajadorResponse>>(`${BASE}/trabajadores/${id}`, {
    nombre: data.nombre,
    apellido: data.apellido,
    email: data.email,
    telefono: data.telefono || null,
    departamentoId: data.departamentoId || null,
    cargoId: data.cargoId || null,
    jefaturaId: data.jefaturaId || null,
  })
  return normalizarTrabajador(res.datos)
}

/** Desactiva un trabajador (soft delete) */
export async function desactivarTrabajador(id: string): Promise<void> {
  await apiDelete<ApiResponse<{ activo: boolean }>>(`${BASE}/trabajadores/${id}`)
}

/** Lista los departamentos disponibles del tenant */
export async function listarDepartamentos(): Promise<Departamento[]> {
  const res = await apiRequest<ApiResponse<DepartamentoApiResponse[]>>(`${BASE}/departamentos`)
  return res.datos.map((departamento) => ({
    id: departamento.id,
    nombre: departamento.nombre ?? departamento.nombre_departamento ?? '',
    tenantId: departamento.tenantId ?? departamento.tenant_id,
  }))
}

/** Lista los cargos disponibles del tenant */
export async function listarCargos(): Promise<Cargo[]> {
  const res = await apiRequest<ApiResponse<CargoApiResponse[]>>(`${BASE}/cargos`)
  return res.datos.map((cargo) => ({
    id: cargo.id,
    nombre: cargo.nombre ?? cargo.nombre_cargo ?? '',
    tenantId: cargo.tenantId ?? cargo.tenant_id,
  }))
}

interface TrabajadorApiResponse {
  id: string
  tenantId?: string
  tenant_id?: string
  nombre: string
  apellido: string
  rutTrabajador?: string
  rut_trabajador?: string
  email: string
  telefono: string | null
  departamentoId?: string | null
  departamento_id?: string | null
  cargoId?: string | null
  cargo_id?: string | null
  jefaturaId?: string | null
  jefatura_id?: string | null
  diasVacacionesDisponibles?: number
  dias_vacaciones_disponibles?: number
  rol?: string
  activo: boolean
}

interface DepartamentoApiResponse {
  id: string
  nombre?: string
  nombre_departamento?: string
  tenantId?: string
  tenant_id: string
}

interface CargoApiResponse {
  id: string
  nombre?: string
  nombre_cargo?: string
  tenantId?: string
  tenant_id: string
}

function normalizarTrabajador(trabajador: TrabajadorApiResponse): TrabajadorResponse {
  return {
    id: trabajador.id,
    tenantId: trabajador.tenantId ?? trabajador.tenant_id ?? '',
    nombre: trabajador.nombre,
    apellido: trabajador.apellido,
    rutTrabajador: trabajador.rutTrabajador ?? trabajador.rut_trabajador ?? '',
    email: trabajador.email,
    telefono: trabajador.telefono,
    departamentoId: trabajador.departamentoId ?? trabajador.departamento_id ?? null,
    cargoId: trabajador.cargoId ?? trabajador.cargo_id ?? null,
    jefaturaId: trabajador.jefaturaId ?? trabajador.jefatura_id ?? null,
    diasVacacionesDisponibles: trabajador.diasVacacionesDisponibles
      ?? trabajador.dias_vacaciones_disponibles
      ?? 0,
    activo: trabajador.activo,
    rol: trabajador.rol,
  }
}
