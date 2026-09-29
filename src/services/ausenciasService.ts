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

const BASE = import.meta.env.VITE_API_AUSENCIAS as string

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

// ─── Funciones ────────────────────────────────────────────────────────────────

/** Lista todas las solicitudes de ausencia del tenant */
export async function listarSolicitudesAusencia(): Promise<SolicitudAusenciaResponse[]> {
  const res = await apiRequest<ApiResponse<SolicitudAusenciaResponse[]>>(
    `${BASE}/solicitudes-ausencia`
  )
  return res.datos
}

/** Lista las solicitudes de un trabajador específico */
export async function listarSolicitudesPorTrabajador(trabajadorId: string): Promise<SolicitudAusenciaResponse[]> {
  const res = await apiRequest<ApiResponse<SolicitudAusenciaResponse[]>>(
    `${BASE}/ausencias/trabajador/${trabajadorId}`
  )
  return res.datos
}

/** Obtiene el detalle de una solicitud por su ID */
export async function obtenerSolicitudAusencia(id: string): Promise<SolicitudAusenciaResponse> {
  const res = await apiRequest<ApiResponse<SolicitudAusenciaResponse>>(`${BASE}/ausencias/${id}`)
  return res.datos
}

/** Lista las solicitudes del usuario autenticado */
export async function misSolicitudes(): Promise<SolicitudAusenciaResponse[]> {
  const res = await apiRequest<ApiResponse<SolicitudAusenciaResponse[]>>(`${BASE}/ausencias/mis-solicitudes`)
  return res.datos
}

/** Crea una nueva solicitud de ausencia */
export async function solicitarAusencia(data: SolicitarAusenciaRequest): Promise<SolicitudAusenciaResponse> {
  const res = await apiPost<ApiResponse<SolicitudAusenciaResponse>>(`${BASE}/ausencias/solicitar`, data)
  return res.datos
}

/** Aprueba una solicitud de ausencia */
export async function aprobarSolicitud(id: string): Promise<SolicitudAusenciaResponse> {
  const res = await apiPatch<ApiResponse<SolicitudAusenciaResponse>>(`${BASE}/ausencias/${id}/aprobar`, {})
  return res.datos
}

/** Rechaza una solicitud de ausencia */
export async function rechazarSolicitud(id: string, data: RechazarAusenciaRequest): Promise<SolicitudAusenciaResponse> {
  const res = await apiPatch<ApiResponse<SolicitudAusenciaResponse>>(`${BASE}/ausencias/${id}/rechazar`, data)
  return res.datos
}

/** Health check del servicio de ausencias */
export async function statusAusencias(): Promise<ServiceStatusResponse> {
  const res = await apiRequest<ApiResponse<ServiceStatusResponse>>(
    `${BASE}/ausencias/status`
  )
  return res.datos
}
