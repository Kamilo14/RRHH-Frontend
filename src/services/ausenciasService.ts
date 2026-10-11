/**
 * ausenciasService.ts
 * MS Ausencias — puerto 8085
 *
 * Endpoints cubiertos:
 *  GET /api/v1/solicitudes-ausencia              → listar solicitudes del tenant
 *  GET /api/v1/ausencias/trabajador/:id          → solicitudes de un trabajador
 *  GET /api/v1/ausencias/:id                      → obtener detalle de solicitud
 *  GET /api/v1/ausencias/mis-solicitudes         → mis solicitudes
 *  POST /api/v1/ausencias/solicitar              → crear solicitud de ausencia
 *  PATCH /api/v1/ausencias/:id/aprobar           → aprobar solicitud
 *  PATCH /api/v1/ausencias/:id/rechazar          → rechazar solicitud
 *  GET /api/v1/ausencias/status                  → estado del servicio
 */

import { apiRequest, apiPost, apiPatch, type ApiResponse } from './httpClient'
import { API_BASE } from './apiConfig'

const BASE = API_BASE

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'

export interface SolicitudAusenciaResponse {
  id: string
  tenantId: string
  trabajadorId: string
  tipo: string
  fechaInicio: string   // LocalDate → "YYYY-MM-DD"
  fechaFin: string      // LocalDate → "YYYY-MM-DD"
  estado: EstadoSolicitud
  motivo: string | null
  motivoRechazo?: string | null
  fechaEvaluacion?: string | null
  creadoEn: string      // Instant → ISO-8601
}

export interface ServiceStatusResponse {
  service: string
  version: string
  status: string
}

export interface SolicitarAusenciaRequest {
  trabajadorId: string
  tipo: string
  fechaInicio: string
  fechaFin: string
  motivo?: string
}

export interface RechazarAusenciaRequest {
  motivo: string
}

export interface CrearSolicitudPropiaRequest {
  tipo: string
  fecha: string
  motivo: string
}

// ─── Funciones ────────────────────────────────────────────────────────────────

/** Lista todas las solicitudes de ausencia del tenant */
export async function listarSolicitudesAusencia(): Promise<SolicitudAusenciaResponse[]> {
  const res = await apiRequest<ApiResponse<SolicitudAusenciaApiResponse[]>>(
    `${BASE}/solicitudes-ausencia`
  )
  return res.datos.map(normalizarSolicitud)
}

/** Lista las solicitudes de un trabajador específico */
export async function listarSolicitudesPorTrabajador(trabajadorId: string): Promise<SolicitudAusenciaResponse[]> {
  const res = await apiRequest<ApiResponse<SolicitudAusenciaApiResponse[]>>(
    `${BASE}/ausencias/trabajador/${trabajadorId}`
  )
  return res.datos.map(normalizarSolicitud)
}

/** Obtiene el detalle de una solicitud por su ID */
export async function obtenerSolicitudAusencia(id: string): Promise<SolicitudAusenciaResponse> {
  const res = await apiRequest<ApiResponse<SolicitudAusenciaApiResponse>>(`${BASE}/ausencias/${id}`)
  return normalizarSolicitud(res.datos)
}

/** Lista las solicitudes del usuario autenticado */
export async function misSolicitudes(): Promise<SolicitudAusenciaResponse[]> {
  const res = await apiRequest<ApiResponse<SolicitudAusenciaApiResponse[]>>(`${BASE}/ausencias/mis-solicitudes`)
  return res.datos.map(normalizarSolicitud)
}

/** Crea una solicitud para el trabajador autenticado. */
export async function crearSolicitudPropia(data: CrearSolicitudPropiaRequest): Promise<SolicitudAusenciaResponse> {
  const res = await apiPost<ApiResponse<SolicitudAusenciaApiResponse>>(`${BASE}/solicitudes-ausencia`, data)
  return normalizarSolicitud(res.datos)
}

/** Crea una nueva solicitud de ausencia */
export async function solicitarAusencia(data: SolicitarAusenciaRequest): Promise<SolicitudAusenciaResponse> {
  const res = await apiPost<ApiResponse<SolicitudAusenciaApiResponse>>(`${BASE}/ausencias/solicitar`, {
    trabajador_id: data.trabajadorId,
    tipo: data.tipo,
    fecha_inicio: data.fechaInicio,
    fecha_fin: data.fechaFin,
    motivo: data.motivo,
  })
  return normalizarSolicitud(res.datos)
}

/** Aprueba una solicitud de ausencia */
export async function aprobarSolicitud(id: string): Promise<SolicitudAusenciaResponse> {
  const res = await apiPatch<ApiResponse<SolicitudAusenciaApiResponse>>(`${BASE}/ausencias/${id}/aprobar`, {})
  return normalizarSolicitud(res.datos)
}

/** Rechaza una solicitud de ausencia */
export async function rechazarSolicitud(id: string, data: RechazarAusenciaRequest): Promise<SolicitudAusenciaResponse> {
  const res = await apiPatch<ApiResponse<SolicitudAusenciaApiResponse>>(`${BASE}/ausencias/${id}/rechazar`, data)
  return normalizarSolicitud(res.datos)
}

/** Health check del servicio de ausencias */
export async function statusAusencias(): Promise<ServiceStatusResponse> {
  const res = await apiRequest<ApiResponse<ServiceStatusResponse>>(
    `${BASE}/ausencias/status`
  )
  return res.datos
}

interface SolicitudAusenciaApiResponse {
  id: string
  tenant_id?: string
  tenantId?: string
  trabajador_id?: string
  trabajadorId?: string
  tipo: string
  fecha_inicio?: string
  fechaInicio?: string
  fecha_fin?: string
  fechaFin?: string
  estado: EstadoSolicitud
  motivo: string | null
  motivo_rechazo?: string | null
  motivoRechazo?: string | null
  fecha_evaluacion?: string | null
  fechaEvaluacion?: string | null
  creado_en?: string
  creadoEn?: string
}

function normalizarSolicitud(solicitud: SolicitudAusenciaApiResponse): SolicitudAusenciaResponse {
  return {
    id: solicitud.id,
    tenantId: solicitud.tenantId ?? solicitud.tenant_id ?? '',
    trabajadorId: solicitud.trabajadorId ?? solicitud.trabajador_id ?? '',
    tipo: solicitud.tipo,
    fechaInicio: solicitud.fechaInicio ?? solicitud.fecha_inicio ?? '',
    fechaFin: solicitud.fechaFin ?? solicitud.fecha_fin ?? '',
    estado: solicitud.estado,
    motivo: solicitud.motivo,
    motivoRechazo: solicitud.motivoRechazo ?? solicitud.motivo_rechazo ?? null,
    fechaEvaluacion: solicitud.fechaEvaluacion ?? solicitud.fecha_evaluacion ?? null,
    creadoEn: solicitud.creadoEn ?? solicitud.creado_en ?? '',
  }
}
