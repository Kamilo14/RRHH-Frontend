/**
 * identityService.ts
 * MS Identity — puerto 8081
 *
 * Endpoints cubiertos:
 *  GET  /api/v1/auth/me                       → perfil del usuario autenticado
 *  GET  /api/v1/tenants/resolver?rut=xxx      → resolver empresa por RUT (público)
 *  POST /api/v1/tenants                       → registrar empresa (usuario sin empresa)
 *  POST /api/v1/auth/access-requests          → solicitar acceso a una empresa por RUT
 *  GET  /api/v1/plataforma/tenants?estado=x   → empresas de la plataforma
 *  POST /api/v1/plataforma/tenants/:id/activar|rechazar → revisar empresa
 *  POST /api/v1/plataforma/usuarios           → crear OperadorSaaS o SuperAdmin
 *  GET  /api/v1/usuarios                      → listar usuarios del tenant
 *  GET  /api/v1/usuarios/pendientes           → usuarios pendientes de asignación
 *  GET  /api/v1/usuarios/:id                  → obtener usuario por id
 *  POST /api/v1/usuarios                      → crear usuario en el tenant
 *  POST /api/v1/usuarios/invitar              → invitar trabajador
 *  POST /api/v1/usuarios/:id/asignar          → asignar usuario a tenant
 *  PATCH /api/v1/usuarios/:id/estado          → cambiar estado del usuario
 */

import { apiRequest, apiPost, apiPatch, type ApiResponse } from './httpClient'
import { API_BASE } from './apiConfig'

const BASE = API_BASE

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MeResponse {
  userId: string | null
  tenantId: string | null
  email: string | null
  nombre: string | null
  role: string | null
  trabajadorId: string | null
  cognitoSub: string | null
  estado: string
  codigo: string | null
  pendiente: boolean
  tenantSlug: string | null
  tenantEstado: string | null
  tenantNombre: string | null
}

interface MeResponseApi {
  user_id: string
  tenant_id: string | null
  email: string
  nombre: string | null
  role: string | null
  trabajador_id: string | null
  cognito_sub: string | null
  estado: string
  codigo: string | null
  pendiente: boolean
  tenant_slug: string | null
  tenant_estado?: string | null
  tenant_nombre?: string | null
}

export interface UsuarioResponse {
  id: string
  tenantId: string
  email: string
  nombre: string | null
  rol: string
  estado: string
  trabajadorId: string | null
  cognitoSub: string | null
  contrasenaTemporal: string | null
}

export interface TenantResolverResponse {
  existe: boolean
  slug: string
  nombreEmpresa: string
}

interface TenantResolverResponseApi {
  existe: boolean
  slug: string
  nombre_empresa: string
}

export interface RegistrarEmpresaData {
  razonSocial: string
  nombreFantasia: string
  rutEmpresa: string
  giro: string
  codigoActividad?: string
  direccionCalle: string
  direccionNumero: string
  comuna: string
  region: string
  emailContacto: string
  telefonoContacto?: string
  representanteNombre: string
  representanteRut: string
  aceptaTerminos: boolean
}

export interface TenantResumen {
  id: string
  nombreEmpresa: string
  slug: string
  activo: boolean
  estado: string
  rutEmpresa: string | null
  razonSocial: string | null
  registradoPorEmail: string | null
  cognitoError: string | null
}

interface TenantResumenApi {
  id: string
  nombre_empresa: string
  slug: string
  activo: boolean
  estado: string
  rut_empresa?: string | null
  razon_social?: string | null
  registrado_por_email?: string | null
  cognito_error?: string | null
}

export interface CrearUsuarioPlataformaData {
  email: string
  nombre: string
  rol: 'OperadorSaaS' | 'SuperAdmin'
  tenantId?: string
}

export interface CrearUsuarioRequest {
  email: string
  rol: string
  trabajadorId?: string
  cognitoSub?: string
}

export interface InvitarUsuarioRequest {
  email: string
  trabajadorId: string
  nombre: string
  rol: string
  crearEnCognito: boolean
}

export interface AsignarUsuarioRequest {
  tenantId: string
  rol: string
  trabajadorId?: string
}

export interface CambiarEstadoRequest {
  estado: string
}

export interface SolicitarAccesoRequest {
  rutEmpresa: string
}

// ─── Funciones ────────────────────────────────────────────────────────────────

/** Obtiene el perfil del usuario autenticado */
export async function getMe(): Promise<MeResponse> {
  const res = await apiRequest<ApiResponse<MeResponseApi>>(`${BASE}/auth/me`)
  return {
    userId: res.datos.user_id,
    tenantId: res.datos.tenant_id,
    email: res.datos.email,
    nombre: res.datos.nombre,
    role: res.datos.role,
    trabajadorId: res.datos.trabajador_id,
    cognitoSub: res.datos.cognito_sub,
    estado: res.datos.estado,
    codigo: res.datos.codigo,
    pendiente: res.datos.pendiente,
    tenantSlug: res.datos.tenant_slug,
    tenantEstado: res.datos.tenant_estado ?? null,
    tenantNombre: res.datos.tenant_nombre ?? null,
  }
}

/** Solicita acceso a la empresa identificada por su RUT (S3). */
export async function solicitarAcceso(data: SolicitarAccesoRequest): Promise<UsuarioResponse> {
  const res = await apiPost<ApiResponse<UsuarioResponseApi>>(`${BASE}/auth/access-requests`, {
    rut_empresa: data.rutEmpresa,
  })
  return normalizarUsuario(res.datos)
}

/**
 * Resuelve la empresa a partir de su RUT. Es público (no requiere token).
 * Rechaza con el mensaje del servidor si el RUT es inválido (400) o la empresa no existe (404).
 */
export async function resolverEmpresaPorRut(rut: string): Promise<TenantResolverResponse> {
  const url = `${BASE}/tenants/resolver?rut=${encodeURIComponent(rut)}`
  const res = await apiRequest<ApiResponse<TenantResolverResponseApi>>(url, { public: true })
  return {
    existe: res.datos.existe,
    slug: res.datos.slug,
    nombreEmpresa: res.datos.nombre_empresa,
  }
}

/** Registra la empresa del usuario autenticado; queda PENDIENTE_ACTIVACION (S1). */
export async function registrarEmpresa(data: RegistrarEmpresaData): Promise<TenantResumen> {
  const res = await apiPost<ApiResponse<TenantResumenApi>>(`${BASE}/tenants`, {
    razon_social: data.razonSocial,
    nombre_fantasia: data.nombreFantasia,
    rut_empresa: data.rutEmpresa,
    giro: data.giro,
    codigo_actividad: data.codigoActividad?.trim() || null,
    direccion_calle: data.direccionCalle,
    direccion_numero: data.direccionNumero,
    comuna: data.comuna,
    region: data.region,
    email_contacto: data.emailContacto,
    telefono_contacto: data.telefonoContacto?.trim() || null,
    representante_nombre: data.representanteNombre,
    representante_rut: data.representanteRut,
    acepta_terminos: data.aceptaTerminos,
  })
  return normalizarTenant(res.datos)
}

/** Lista las empresas de la plataforma, opcionalmente filtradas por estado (S2). */
export async function listarEmpresasPlataforma(estado?: string): Promise<TenantResumen[]> {
  const query = estado ? `?estado=${encodeURIComponent(estado)}` : ''
  const res = await apiRequest<ApiResponse<TenantResumenApi[]>>(`${BASE}/plataforma/tenants${query}`)
  return res.datos.map(normalizarTenant)
}

/** Activa una empresa PENDIENTE_ACTIVACION (solo AdminPlataforma). */
export async function activarEmpresa(id: string): Promise<TenantResumen> {
  const res = await apiPost<ApiResponse<TenantResumenApi>>(`${BASE}/plataforma/tenants/${encodeURIComponent(id)}/activar`, {})
  return normalizarTenant(res.datos)
}

/** Rechaza una empresa PENDIENTE_ACTIVACION con un motivo (solo AdminPlataforma). */
export async function rechazarEmpresa(id: string, motivo: string): Promise<TenantResumen> {
  const res = await apiPost<ApiResponse<TenantResumenApi>>(`${BASE}/plataforma/tenants/${encodeURIComponent(id)}/rechazar`, { motivo })
  return normalizarTenant(res.datos)
}

/** Crea un OperadorSaaS (sin empresa) o el SuperAdmin de una empresa ACTIVA (solo AdminPlataforma). */
export async function crearUsuarioPlataforma(data: CrearUsuarioPlataformaData): Promise<UsuarioResponse> {
  const res = await apiPost<ApiResponse<UsuarioResponseApi>>(`${BASE}/plataforma/usuarios`, {
    email: data.email,
    nombre: data.nombre,
    rol: data.rol,
    tenant_id: data.rol === 'SuperAdmin' ? data.tenantId ?? null : null,
  })
  return normalizarUsuario(res.datos)
}

/** Lista todos los usuarios del tenant */
export async function listarUsuarios(): Promise<UsuarioResponse[]> {
  const res = await apiRequest<ApiResponse<UsuarioResponseApi[]>>(`${BASE}/usuarios`)
  return res.datos.map(normalizarUsuario)
}

/** Lista usuarios pendientes de asignación */
export async function listarUsuariosPendientes(): Promise<UsuarioResponse[]> {
  const res = await apiRequest<ApiResponse<UsuarioResponseApi[]>>(`${BASE}/usuarios/pendientes`)
  return res.datos.map(normalizarUsuario)
}

/** Obtiene un usuario por ID */
export async function obtenerUsuario(id: string): Promise<UsuarioResponse> {
  const res = await apiRequest<ApiResponse<UsuarioResponseApi>>(`${BASE}/usuarios/${id}`)
  return normalizarUsuario(res.datos)
}

/** Crea un usuario en el tenant */
export async function crearUsuario(data: CrearUsuarioRequest): Promise<UsuarioResponse> {
  const res = await apiPost<ApiResponse<UsuarioResponse>>(`${BASE}/usuarios`, data)
  return res.datos
}

/** Invita un trabajador al tenant */
export async function invitarUsuario(data: InvitarUsuarioRequest): Promise<UsuarioResponse> {
  const res = await apiPost<ApiResponse<UsuarioResponseApi>>(`${BASE}/usuarios/invitar`, {
    email: data.email,
    trabajador_id: data.trabajadorId,
    nombre: data.nombre,
    rol: data.rol,
    crear_en_cognito: data.crearEnCognito,
  })
  return normalizarUsuario(res.datos)
}

/** Asigna un usuario a un tenant */
export async function asignarUsuario(id: string, data: AsignarUsuarioRequest): Promise<UsuarioResponse> {
  const res = await apiPost<ApiResponse<UsuarioResponse>>(`${BASE}/usuarios/${id}/asignar`, data)
  return res.datos
}

/** Cambia el rol de acceso del usuario vinculado a un trabajador (ADMIN_RRHH | JEFATURA | TRABAJADOR). */
export async function cambiarRolPorTrabajador(trabajadorId: string, rol: string): Promise<UsuarioResponse> {
  const res = await apiPatch<ApiResponse<UsuarioResponseApi>>(`${BASE}/usuarios/trabajador/${trabajadorId}/rol`, { rol })
  return normalizarUsuario(res.datos)
}

/** Rechaza una solicitud iniciada desde el login. */
export async function rechazarSolicitudUsuario(id: string): Promise<UsuarioResponse> {
  const res = await apiPatch<ApiResponse<UsuarioResponseApi>>(`${BASE}/usuarios/${id}/rechazar-solicitud`, {})
  return normalizarUsuario(res.datos)
}

/** Cambia el estado de un usuario (ACTIVO / INACTIVO) */
export async function cambiarEstadoUsuario(id: string, data: CambiarEstadoRequest): Promise<UsuarioResponse> {
  const res = await apiPatch<ApiResponse<UsuarioResponse>>(`${BASE}/usuarios/${id}/estado`, data)
  return res.datos
}

interface UsuarioResponseApi {
  id: string
  tenant_id?: string
  tenantId?: string
  email: string
  nombre: string | null
  rol: string
  estado: string
  trabajador_id?: string | null
  trabajadorId?: string | null
  cognito_sub?: string | null
  cognitoSub?: string | null
  contrasena_temporal?: string | null
  contrasenaTemporal?: string | null
}

function normalizarTenant(tenant: TenantResumenApi): TenantResumen {
  return {
    id: tenant.id,
    nombreEmpresa: tenant.nombre_empresa,
    slug: tenant.slug,
    activo: tenant.activo,
    estado: tenant.estado,
    rutEmpresa: tenant.rut_empresa ?? null,
    razonSocial: tenant.razon_social ?? null,
    registradoPorEmail: tenant.registrado_por_email ?? null,
    cognitoError: tenant.cognito_error ?? null,
  }
}

function normalizarUsuario(usuario: UsuarioResponseApi): UsuarioResponse {
  return {
    id: usuario.id,
    tenantId: usuario.tenantId ?? usuario.tenant_id ?? '',
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    estado: usuario.estado,
    trabajadorId: usuario.trabajadorId ?? usuario.trabajador_id ?? null,
    cognitoSub: usuario.cognitoSub ?? usuario.cognito_sub ?? null,
    contrasenaTemporal: usuario.contrasenaTemporal ?? usuario.contrasena_temporal ?? null,
  }
}
