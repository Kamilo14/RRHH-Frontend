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
 *  GET   /api/v1/contratos/plantilla/campos         → campos de la plantilla .docx
 *  POST  /api/v1/contratos/emitir                   → emitir contrato desde plantilla (RRHH)
 *  GET   /api/v1/contratos/:id/pdf                  → PDF firmado (RRHH)
 *  GET   /api/v1/contratos/mio                      → mi contrato (Trabajador / Jefatura)
 *  PUT   /api/v1/contratos/mio/campos               → guardar mis campos
 *  GET   /api/v1/contratos/mio/pdf                  → previsualización o PDF firmado
 *  POST  /api/v1/contratos/mio/aprobar              → aprobar (firma simulada)
 *  POST  /api/v1/contratos/mio/rechazar             → rechazar con motivo opcional
 */

import { apiRequest, apiPost, apiPatch, apiPut, apiGetBlob, apiPostEmpty, type ApiResponse } from './httpClient'
import { API_BASE } from './apiConfig'

const BASE = API_BASE

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type EstadoContrato = 'PENDIENTE_FIRMA' | 'FIRMADO' | 'RECHAZADO' | 'FINALIZADO'

export interface ContratoResponse {
  id: string
  tenantId: string
  trabajadorId: string
  salarioBase: number
  tipoContrato: string
  fechaInicio: string   // LocalDate → "YYYY-MM-DD"
  fechaTermino: string | null
  activo: boolean
  estado: EstadoContrato
  jornadaHorasSemanales: number | null
  documentoFirmado: boolean
}

export interface CampoPlantilla {
  clave: string
  etiqueta: string
  responsable: 'RRHH' | 'TRABAJADOR'
  tipo: 'TEXTO' | 'NUMERO' | 'ENTERO' | 'FECHA' | 'OPCION'
  opciones: string[]
  obligatorio: boolean
}

export interface MiContrato {
  estado: 'SIN_CONTRATO' | 'EN_ESPERA' | 'FIRMADO'
  contrato: ContratoResponse | null
  camposRrhh: Record<string, string>
  camposTrabajador: Record<string, string>
  documentoListo: boolean
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

/** Campos de la plantilla de contrato, en orden de aparición */
export async function obtenerCamposPlantilla(): Promise<CampoPlantilla[]> {
  const res = await apiRequest<ApiResponse<CampoPlantilla[]>>(`${BASE}/contratos/plantilla/campos`)
  return res.datos.map((c) => ({ ...c, opciones: c.opciones ?? [] }))
}

/** Emite un contrato desde la plantilla con los campos de RRHH; queda en espera de firma */
export async function emitirContrato(
  trabajadorId: string,
  campos: Record<string, string>
): Promise<ContratoResponse> {
  const res = await apiPost<ApiResponse<ContratoApiResponse>>(`${BASE}/contratos/emitir`, {
    trabajador_id: trabajadorId,
    campos,
  })
  return normalizarContrato(res.datos)
}

/** PDF firmado de un contrato (vista del admin) */
export async function obtenerContratoPdf(id: string): Promise<Blob> {
  return apiGetBlob(`${BASE}/contratos/${id}/pdf`)
}

/** Estado del contrato del trabajador autenticado */
export async function obtenerMiContrato(): Promise<MiContrato> {
  const res = await apiRequest<ApiResponse<MiContratoApiResponse>>(`${BASE}/contratos/mio`)
  return normalizarMiContrato(res.datos)
}

/** Guarda los campos del trabajador y genera el documento para previsualizar */
export async function guardarMisCampos(campos: Record<string, string>): Promise<MiContrato> {
  const res = await apiPut<ApiResponse<MiContratoApiResponse>>(`${BASE}/contratos/mio/campos`, { campos })
  return normalizarMiContrato(res.datos)
}

/** PDF de mi contrato: previsualización en espera, documento guardado si está firmado */
export async function obtenerMiContratoPdf(): Promise<Blob> {
  return apiGetBlob(`${BASE}/contratos/mio/pdf`)
}

/** Aprueba mi contrato en espera; queda firmado */
export async function aprobarMiContrato(): Promise<MiContrato> {
  const res = await apiPostEmpty<ApiResponse<MiContratoApiResponse>>(`${BASE}/contratos/mio/aprobar`)
  return normalizarMiContrato(res.datos)
}

/** Rechaza mi contrato en espera, con un motivo opcional */
export async function rechazarMiContrato(motivo?: string): Promise<MiContrato> {
  const res = await apiPostEmpty<ApiResponse<MiContratoApiResponse>>(`${BASE}/contratos/mio/rechazar`, { motivo })
  return normalizarMiContrato(res.datos)
}

interface MiContratoApiResponse {
  estado: MiContrato['estado']
  contrato?: ContratoApiResponse | null
  campos_rrhh?: Record<string, string> | null
  camposRrhh?: Record<string, string> | null
  campos_trabajador?: Record<string, string> | null
  camposTrabajador?: Record<string, string> | null
  documento_listo?: boolean
  documentoListo?: boolean
}

function normalizarMiContrato(mio: MiContratoApiResponse): MiContrato {
  return {
    estado: mio.estado,
    contrato: mio.contrato ? normalizarContrato(mio.contrato) : null,
    camposRrhh: mio.camposRrhh ?? mio.campos_rrhh ?? {},
    camposTrabajador: mio.camposTrabajador ?? mio.campos_trabajador ?? {},
    documentoListo: mio.documentoListo ?? mio.documento_listo ?? false,
  }
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
  estado?: EstadoContrato
  jornada_horas_semanales?: number | null
  jornadaHorasSemanales?: number | null
  documento_firmado?: boolean
  documentoFirmado?: boolean
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
    estado: contrato.estado ?? (contrato.activo ? 'FIRMADO' : 'FINALIZADO'),
    jornadaHorasSemanales: contrato.jornadaHorasSemanales ?? contrato.jornada_horas_semanales ?? null,
    documentoFirmado: contrato.documentoFirmado ?? contrato.documento_firmado ?? false,
  }
}
