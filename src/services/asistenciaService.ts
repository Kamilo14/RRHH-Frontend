/**
 * asistenciaService.ts
 * MS Asistencia — puerto 8084
 *
 * Endpoints cubiertos:
 *  GET /api/v1/marcas-asistencia                    → listar todas las marcas del tenant
 *  GET /api/v1/asistencia/trabajador/:id            → marcas de un trabajador
 *  GET /api/v1/asistencia/trabajador/:id/hoy        → marca de hoy del trabajador
 *  GET /api/v1/asistencia/trabajador/:id/periodo    → marcas por periodo
 *  POST /api/v1/asistencia/registro                 → registrar check-in/check-out
 *  PUT /api/v1/asistencia/:marca_id/editar          → edición manual (RRHH)
 *  GET /api/v1/asistencia/resumen                   → resumen de asistencia
 *  GET /api/v1/asistencia/status                    → estado del servicio
 */

import { apiRequest, apiPost, apiPut, apiPatch, type ApiResponse } from './httpClient'
import { API_BASE } from './apiConfig'

const BASE = API_BASE

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TipoMarca = 'ENTRADA' | 'SALIDA'

export interface MarcaAsistenciaResponse {
  id: string
  tenantId: string
  trabajadorId: string
  tipo: TipoMarca
  fechaHora: string   // Instant → ISO-8601
  origen: string
  activo: boolean
  creadoEn: string
}

export interface ServiceStatus {
  servicio: string
  estado: string
}

export interface RegistrarMarcaRequest {
  trabajadorId: string
  tipo: TipoMarca
  origen: string
}

export interface EditarMarcaRequest {
  fechaHora: string
  motivo?: string
}

export interface AsistenciaResumenResponse {
  fecha: string
  totalMarcas: number
  totalEntradas: number
  totalSalidas: number
  porcentajeAsistencia: number
}

export type TipoHoraExtra = 'NORMAL' | 'FIN_DE_SEMANA' | 'FESTIVO' | 'TURNO_ESPECIAL'
export type EstadoHoraExtra = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'INCORPORADA_EN_LIQUIDACION'

export interface HoraExtraResponse {
  id: string
  trabajadorId: string
  fecha: string
  periodo: string
  tipo: TipoHoraExtra
  cantidadHoras: number
  valorHora: number
  recargoPorcentaje: number
  montoTotal: number
  motivo: string
  estado: EstadoHoraExtra
}

export interface CrearHoraExtraRequest {
  trabajadorId: string
  fecha: string
  tipo: TipoHoraExtra
  cantidadHoras: number
  valorHora: number
  recargoPorcentaje?: number
  motivo: string
}

// ─── Funciones ────────────────────────────────────────────────────────────────

/**
 * Lista todas las marcas de asistencia del tenant.
 * Agrupa entrada/salida por trabajadorId para construir el registro diario.
 */
export async function listarMarcasAsistencia(): Promise<MarcaAsistenciaResponse[]> {
  const res = await apiRequest<ApiResponse<MarcaAsistenciaApiResponse[]>>(
    `${BASE}/marcas-asistencia`
  )
  return res.datos.map(normalizarMarca)
}

/**
 * Lista las marcas de un trabajador específico.
 */
export async function listarMarcasPorTrabajador(trabajadorId: string): Promise<MarcaAsistenciaResponse[]> {
  const res = await apiRequest<ApiResponse<MarcaAsistenciaApiResponse[]>>(
    `${BASE}/asistencia/trabajador/${trabajadorId}`
  )
  return res.datos.map(normalizarMarca)
}

/**
 * Obtiene la marca de hoy de un trabajador.
 */
export async function obtenerMarcaHoy(trabajadorId: string): Promise<MarcaAsistenciaResponse | null> {
  const res = await apiRequest<ApiResponse<MarcaAsistenciaApiResponse>>(
    `${BASE}/asistencia/trabajador/${trabajadorId}/hoy`
  )
  return normalizarMarca(res.datos)
}

/**
 * Lista las marcas de un trabajador en un periodo específico.
 */
export async function listarMarcasPorPeriodo(
  trabajadorId: string,
  fechaInicio: string,
  fechaFin: string
): Promise<MarcaAsistenciaResponse[]> {
  const res = await apiRequest<ApiResponse<MarcaAsistenciaApiResponse[]>>(
    `${BASE}/asistencia/trabajador/${trabajadorId}/periodo?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`
  )
  return res.datos.map(normalizarMarca)
}

/**
 * Registra una nueva marca de asistencia (check-in/check-out).
 */
export async function registrarMarca(data: RegistrarMarcaRequest): Promise<MarcaAsistenciaResponse> {
  const res = await apiPost<ApiResponse<MarcaAsistenciaApiResponse>>(`${BASE}/asistencia/registro`, {
    trabajador_id: data.trabajadorId,
    tipo: data.tipo,
    origen: data.origen,
  })
  return normalizarMarca(res.datos)
}

/**
 * Edita manualmente una marca de asistencia (solo RRHH).
 */
export async function editarMarca(marcaId: string, data: EditarMarcaRequest): Promise<MarcaAsistenciaResponse> {
  const res = await apiPut<ApiResponse<MarcaAsistenciaApiResponse>>(`${BASE}/asistencia/${marcaId}/editar`, {
    fecha_hora: data.fechaHora,
    motivo: data.motivo,
  })
  return normalizarMarca(res.datos)
}

/**
 * Obtiene el resumen de asistencia del tenant.
 */
export async function obtenerResumenAsistencia(
  fechaInicio: string,
  fechaFin: string
): Promise<AsistenciaResumenResponse> {
  const res = await apiRequest<ApiResponse<AsistenciaResumenResponse>>(
    `${BASE}/asistencia/resumen?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`
  )
  return res.datos
}

/**
 * Estado del microservicio de asistencia (health check).
 * Endpoint público sin autenticación.
 */
export async function statusAsistencia(): Promise<ServiceStatus> {
  return apiRequest<ServiceStatus>(`${BASE}/asistencia/status`, { public: true })
}

export async function listarHorasExtra(periodo: string, trabajadorId?: string): Promise<HoraExtraResponse[]> {
  const params = new URLSearchParams({ periodo })
  if (trabajadorId) params.set('trabajador_id', trabajadorId)
  const res = await apiRequest<ApiResponse<HoraExtraResponse[]>>(`${BASE}/horas-extra?${params.toString()}`)
  return res.datos
}

export async function crearHoraExtra(data: CrearHoraExtraRequest): Promise<HoraExtraResponse> {
  const res = await apiPost<ApiResponse<HoraExtraResponse>>(`${BASE}/horas-extra`, {
    trabajador_id: data.trabajadorId,
    fecha: data.fecha,
    tipo: data.tipo,
    cantidad_horas: data.cantidadHoras,
    valor_hora: data.valorHora,
    recargo_porcentaje: data.recargoPorcentaje ?? 0,
    motivo: data.motivo,
  })
  return res.datos
}

export async function aprobarHoraExtra(id: string): Promise<HoraExtraResponse> {
  const res = await apiPatch<ApiResponse<HoraExtraResponse>>(`${BASE}/horas-extra/${id}/aprobar`, {})
  return res.datos
}

export async function rechazarHoraExtra(id: string): Promise<HoraExtraResponse> {
  const res = await apiPatch<ApiResponse<HoraExtraResponse>>(`${BASE}/horas-extra/${id}/rechazar`, {})
  return res.datos
}

interface MarcaAsistenciaApiResponse {
  id: string
  tenant_id?: string
  tenantId?: string
  trabajador_id?: string
  trabajadorId?: string
  tipo: TipoMarca
  fecha_hora?: string
  fechaHora?: string
  origen: string
  activo: boolean
  creado_en?: string
  creadoEn?: string
}

function normalizarMarca(marca: MarcaAsistenciaApiResponse): MarcaAsistenciaResponse {
  return {
    id: marca.id,
    tenantId: marca.tenantId ?? marca.tenant_id ?? '',
    trabajadorId: marca.trabajadorId ?? marca.trabajador_id ?? '',
    tipo: marca.tipo,
    fechaHora: marca.fechaHora ?? marca.fecha_hora ?? '',
    origen: marca.origen,
    activo: marca.activo,
    creadoEn: marca.creadoEn ?? marca.creado_en ?? '',
  }
}
