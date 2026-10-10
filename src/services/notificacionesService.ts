/**
 * notificacionesService.ts
 * MS Notifications — puerto 8086
 *
 * Endpoints cubiertos:
 *  GET /api/v1/notificaciones                    → listar notificaciones del usuario
 *  GET /api/v1/notificaciones/no-leidas          → listar notificaciones no leídas
 *  GET /api/v1/notificaciones/no-leidas/count    → contar no leídas
 *  PATCH /api/v1/notificaciones/:id/marcar-leida → marcar como leída/no leída
 *  GET /api/v1/notificaciones/status            → estado del servicio
 */

import { apiRequest, apiPatch, type ApiResponse } from './httpClient'
import { API_BASE } from './apiConfig'

const BASE = API_BASE

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface NotificacionResponse {
  id: string
  tenantId: string
  destinatarioId: string
  canal: string
  asunto: string
  cuerpo: string
  estado: string
  creadoEn: string
}

export interface ServiceStatusResponse {
  servicio: string
  version: string
  estado: string
  rabbitmqHost: string
  redisHost: string
  notificacionesPendientes: number
}

export interface MarcarLeidaRequest {
  leido: boolean
}

// ─── Funciones ────────────────────────────────────────────────────────────────

/** Lista todas las notificaciones del usuario autenticado */
export async function listarNotificaciones(): Promise<NotificacionResponse[]> {
  const res = await apiRequest<ApiResponse<NotificacionApiResponse[]>>(`${BASE}/notificaciones`)
  return res.datos.map(normalizarNotificacion)
}

/** Lista las notificaciones no leídas del usuario */
export async function listarNoLeidas(): Promise<NotificacionResponse[]> {
  const res = await apiRequest<ApiResponse<NotificacionApiResponse[]>>(
    `${BASE}/notificaciones/no-leidas`
  )
  return res.datos.map(normalizarNotificacion)
}

/** Cuenta las notificaciones no leídas del usuario */
export async function contarNoLeidas(): Promise<{ count: number }> {
  const res = await apiRequest<{ count: number }>(`${BASE}/notificaciones/no-leidas/count`)
  return res
}

/** Marca una notificación como leída o no leída */
export async function marcarLeida(id: string, data: MarcarLeidaRequest): Promise<NotificacionResponse> {
  const res = await apiPatch<ApiResponse<NotificacionApiResponse>>(
    `${BASE}/notificaciones/${id}/marcar-leida`,
    data
  )
  return normalizarNotificacion(res.datos)
}

/** Estado del microservicio de notificaciones */
export async function statusNotificaciones(): Promise<ServiceStatusResponse> {
  const res = await apiRequest<ApiResponse<ServiceStatusResponse>>(`${BASE}/notificaciones/status`)
  return res.datos
}

interface NotificacionApiResponse {
  id: string
  tenant_id?: string
  tenantId?: string
  destinatario_id?: string
  destinatarioId?: string
  canal: string
  asunto: string
  cuerpo: string
  estado: string
  creado_en?: string
  creadoEn?: string
}

function normalizarNotificacion(notificacion: NotificacionApiResponse): NotificacionResponse {
  return {
    id: notificacion.id,
    tenantId: notificacion.tenantId ?? notificacion.tenant_id ?? '',
    destinatarioId: notificacion.destinatarioId ?? notificacion.destinatario_id ?? '',
    canal: notificacion.canal,
    asunto: notificacion.asunto,
    cuerpo: notificacion.cuerpo,
    estado: notificacion.estado,
    creadoEn: notificacion.creadoEn ?? notificacion.creado_en ?? '',
  }
}
