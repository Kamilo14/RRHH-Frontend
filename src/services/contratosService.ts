/**
 * contratosService.ts
 * MS Contratos — puerto 8083
 *
 * Endpoints cubiertos:
 *  GET   /api/v1/contratos                          → listar todos
 *  GET   /api/v1/contratos/trabajador/:trabajadorId → contratos de un trabajador
 *  GET   /api/v1/contratos/:id                      → obtener uno
 *  POST  /api/v1/contratos                          → crear
 *  PATCH /api/v1/contratos/:id                      → actualizar
 *  POST  /api/v1/contratos/:id/finalizar            → finalizar contrato
 *  POST  /api/v1/liquidaciones/calcular             → calcular liquidación
 */

import { apiRequest, apiPost, apiPatch, type ApiResponse } from './httpClient'
import { API_BASE } from './apiConfig'

const BASE = API_BASE

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ContratoResponse {
  id: string
  tenantId: string
  trabajadorId: string
  salarioBase: number
  tipoContrato: string
  fechaInicio: string   // LocalDate → "YYYY-MM-DD"
  fechaTermino: string | null
  activo: boolean
}

export interface LiquidacionResponse {
  id: string
  contratoId: string
  periodo: string
  sueldoBase: number
  afpDescuento: number
  saludDescuento: number
  seguroCesantia: number
  impuestoSegundaCategoria: number
  sueldoLiquido: number
  estado: string
}

export interface CrearContratoRequest {
  trabajadorId: string
  salarioBase: number
  tipoContrato: string
  fechaInicio: string
  fechaTermino?: string
}

export type ActualizarContratoRequest = Partial<Omit<CrearContratoRequest, 'trabajadorId'>>

export interface CalcularLiquidacionRequest {
  contratoId: string
  periodo: string   // "YYYY-MM"
}

// ─── Funciones ────────────────────────────────────────────────────────────────

/** Lista todos los contratos del tenant */
export async function listarContratos(): Promise<ContratoResponse[]> {
  const res = await apiRequest<ApiResponse<ContratoApiResponse[]>>(`${BASE}/contratos`)
  return res.datos.map(normalizarContrato)
}

/** Lista los contratos de un trabajador específico */
export async function contratosDeTrabjador(trabajadorId: string): Promise<ContratoResponse[]> {
  const res = await apiRequest<ApiResponse<ContratoApiResponse[]>>(
    `${BASE}/contratos/trabajador/${trabajadorId}`
  )
  return res.datos.map(normalizarContrato)
}

/** Obtiene un contrato por ID */
export async function obtenerContrato(id: string): Promise<ContratoResponse> {
  const res = await apiRequest<ApiResponse<ContratoApiResponse>>(`${BASE}/contratos/${id}`)
  return normalizarContrato(res.datos)
}

/** Crea un nuevo contrato */
export async function crearContrato(data: CrearContratoRequest): Promise<ContratoResponse> {
  const res = await apiPost<ApiResponse<ContratoApiResponse>>(`${BASE}/contratos`, {
    trabajador_id: data.trabajadorId,
    salario_base: data.salarioBase,
    tipo_contrato: data.tipoContrato,
    fecha_inicio: data.fechaInicio,
    fecha_termino: data.fechaTermino,
  })
  return normalizarContrato(res.datos)
}

/** Actualiza datos de un contrato */
export async function actualizarContrato(
  id: string,
  data: ActualizarContratoRequest
): Promise<ContratoResponse> {
  const res = await apiPatch<ApiResponse<ContratoApiResponse>>(`${BASE}/contratos/${id}`, {
    salario_base: data.salarioBase,
    tipo_contrato: data.tipoContrato,
    fecha_inicio: data.fechaInicio,
    fecha_termino: data.fechaTermino,
  })
  return normalizarContrato(res.datos)
}

/** Finaliza (cierra) un contrato */
export async function finalizarContrato(id: string): Promise<ContratoResponse> {
  const res = await apiPost<ApiResponse<ContratoApiResponse>>(`${BASE}/contratos/${id}/finalizar`, {})
  return normalizarContrato(res.datos)
}

/** Calcula la liquidación de sueldo para un período */
export async function calcularLiquidacion(
  data: CalcularLiquidacionRequest
): Promise<LiquidacionResponse> {
  const res = await apiPost<ApiResponse<LiquidacionResponse>>(
    `${BASE}/liquidaciones/calcular`,
    data
  )
  return res.datos
}

interface ContratoApiResponse {
  id: string
  tenant_id?: string
  tenantId?: string
  trabajador_id?: string
  trabajadorId?: string
  salario_base?: number
  salarioBase?: number
  tipo_contrato?: string
  tipoContrato?: string
  fecha_inicio?: string
  fechaInicio?: string
  fecha_termino?: string | null
  fechaTermino?: string | null
  activo: boolean
}

function normalizarContrato(contrato: ContratoApiResponse): ContratoResponse {
  return {
    id: contrato.id,
    tenantId: contrato.tenantId ?? contrato.tenant_id ?? '',
    trabajadorId: contrato.trabajadorId ?? contrato.trabajador_id ?? '',
    salarioBase: contrato.salarioBase ?? contrato.salario_base ?? 0,
    tipoContrato: contrato.tipoContrato ?? contrato.tipo_contrato ?? '',
    fechaInicio: contrato.fechaInicio ?? contrato.fecha_inicio ?? '',
    fechaTermino: contrato.fechaTermino ?? contrato.fecha_termino ?? null,
    activo: contrato.activo,
  }
}
