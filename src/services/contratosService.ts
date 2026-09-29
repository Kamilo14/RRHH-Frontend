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

const BASE = import.meta.env.VITE_API_CONTRATOS as string

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
  const res = await apiRequest<ApiResponse<ContratoResponse[]>>(`${BASE}/contratos`)
  return res.datos
}

/** Lista los contratos de un trabajador específico */
export async function contratosDeTrabjador(trabajadorId: string): Promise<ContratoResponse[]> {
  const res = await apiRequest<ApiResponse<ContratoResponse[]>>(
    `${BASE}/contratos/trabajador/${trabajadorId}`
  )
  return res.datos
}

/** Obtiene un contrato por ID */
export async function obtenerContrato(id: string): Promise<ContratoResponse> {
  const res = await apiRequest<ApiResponse<ContratoResponse>>(`${BASE}/contratos/${id}`)
  return res.datos
}

/** Crea un nuevo contrato */
export async function crearContrato(data: CrearContratoRequest): Promise<ContratoResponse> {
  const res = await apiPost<ApiResponse<ContratoResponse>>(`${BASE}/contratos`, data)
  return res.datos
}

/** Actualiza datos de un contrato */
export async function actualizarContrato(
  id: string,
  data: ActualizarContratoRequest
): Promise<ContratoResponse> {
  const res = await apiPatch<ApiResponse<ContratoResponse>>(`${BASE}/contratos/${id}`, data)
  return res.datos
}

/** Finaliza (cierra) un contrato */
export async function finalizarContrato(id: string): Promise<ContratoResponse> {
  const res = await apiPost<ApiResponse<ContratoResponse>>(`${BASE}/contratos/${id}/finalizar`, {})
  return res.datos
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
