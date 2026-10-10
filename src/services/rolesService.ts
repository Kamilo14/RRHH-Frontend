/**
 * Roles base del sistema y roles configurados en este navegador.
 * Identity aún no dispone de una API de RBAC personalizada; por ello los roles
 * creados y sus permisos se persisten localmente, sin alterar los roles base.
 */
export interface RolResponse {
  id: string
  tenantId: string
  nombre: string
  descripcion: string
  estado: string
  creadoEn: string
  actualizadoEn: string
  esPersonalizado?: boolean
}
export interface PermisoResponse { id: string; nombre: string; descripcion: string }
export interface CrearRolRequest { nombre: string; descripcion: string }
export interface ActualizarRolRequest { nombre?: string; descripcion?: string; estado?: string }

const CUSTOM_ROLES_KEY = 'rrhh_roles_personalizados'
const CUSTOM_PERMISSIONS_KEY = 'rrhh_permisos_roles_personalizados'
const now = new Date(0).toISOString()
const rolesBase: RolResponse[] = [
  { id: 'operador-saas', tenantId: 'plataforma', nombre: 'OperadorSaaS', descripcion: 'Operador de la plataforma SaaS.', estado: 'ACTIVO', creadoEn: now, actualizadoEn: now },
  { id: 'superadmin', tenantId: 'sistema', nombre: 'SuperAdmin', descripcion: 'Administrador global del tenant.', estado: 'ACTIVO', creadoEn: now, actualizadoEn: now },
  { id: 'admin-rrhh', tenantId: 'sistema', nombre: 'Admin de RRHH', descripcion: 'Gestión completa de recursos humanos.', estado: 'ACTIVO', creadoEn: now, actualizadoEn: now },
  { id: 'jefatura', tenantId: 'sistema', nombre: 'Jefatura', descripcion: 'Supervisor de equipo.', estado: 'ACTIVO', creadoEn: now, actualizadoEn: now },
  { id: 'trabajador', tenantId: 'sistema', nombre: 'Trabajador', descripcion: 'Empleado con acceso a su propia información.', estado: 'ACTIVO', creadoEn: now, actualizadoEn: now },
]
const permisosBase: Record<string, PermisoResponse[]> = {
  'operador-saas': [{ id: 'usuarios.asignar', nombre: 'Asignar usuarios', descripcion: 'Asignar usuarios pendientes a un tenant.' }],
  superadmin: [{ id: 'rrhh.gestionar', nombre: 'Gestionar RRHH', descripcion: 'Administrar usuarios, trabajadores y contratos.' }, { id: 'ausencias.aprobar', nombre: 'Aprobar ausencias', descripcion: 'Aprobar o rechazar solicitudes de ausencia.' }],
  'admin-rrhh': [{ id: 'rrhh.gestionar', nombre: 'Gestionar RRHH', descripcion: 'Administrar usuarios, trabajadores y contratos.' }, { id: 'asistencia.editar', nombre: 'Editar asistencia', descripcion: 'Editar marcas de asistencia manualmente.' }, { id: 'ausencias.aprobar', nombre: 'Aprobar ausencias', descripcion: 'Aprobar o rechazar solicitudes de ausencia.' }],
  jefatura: [{ id: 'equipo.consultar', nombre: 'Consultar equipo', descripcion: 'Ver información del equipo a cargo.' }, { id: 'ausencias.aprobar-equipo', nombre: 'Aprobar ausencias del equipo', descripcion: 'Gestionar solicitudes de su equipo.' }],
  trabajador: [{ id: 'perfil.consultar', nombre: 'Consultar perfil', descripcion: 'Ver su propia ficha y contrato.' }, { id: 'asistencia.registrar', nombre: 'Registrar asistencia', descripcion: 'Registrar sus marcas de asistencia.' }, { id: 'ausencias.solicitar', nombre: 'Solicitar ausencias', descripcion: 'Crear solicitudes de ausencia.' }],
}

function readCustomRoles(): RolResponse[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_ROLES_KEY) ?? '[]') as RolResponse[] } catch { return [] }
}
function saveCustomRoles(roles: RolResponse[]) { localStorage.setItem(CUSTOM_ROLES_KEY, JSON.stringify(roles)) }
function readCustomPermissions(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(CUSTOM_PERMISSIONS_KEY) ?? '{}') as Record<string, string[]> } catch { return {} }
}
function saveCustomPermissions(permisos: Record<string, string[]>) { localStorage.setItem(CUSTOM_PERMISSIONS_KEY, JSON.stringify(permisos)) }

export async function listarRoles(): Promise<RolResponse[]> { return [...rolesBase, ...readCustomRoles()].map((rol) => ({ ...rol })) }
export async function obtenerRol(id: string): Promise<RolResponse> { const rol = (await listarRoles()).find((item) => item.id === id); if (!rol) throw new Error('Rol no encontrado'); return rol }
export async function crearRol(data: CrearRolRequest): Promise<RolResponse> {
  const nombre = data.nombre.trim()
  const descripcion = data.descripcion.trim()
  if (!nombre || !descripcion) throw new Error('El nombre y la descripción son obligatorios.')
  const existentes = await listarRoles()
  if (existentes.some((rol) => rol.nombre.toLocaleLowerCase() === nombre.toLocaleLowerCase())) throw new Error('Ya existe un rol con ese nombre.')
  const creadoEn = new Date().toISOString()
  const rol: RolResponse = { id: `custom-${crypto.randomUUID()}`, tenantId: 'local', nombre, descripcion, estado: 'ACTIVO', creadoEn, actualizadoEn: creadoEn, esPersonalizado: true }
  saveCustomRoles([...readCustomRoles(), rol])
  return { ...rol }
}
export async function actualizarRol(id: string, data: ActualizarRolRequest): Promise<RolResponse> {
  const roles = readCustomRoles()
  const index = roles.findIndex((rol) => rol.id === id)
  if (index < 0) throw new Error('Solo los roles creados desde esta pantalla se pueden modificar.')
  const actualizado = { ...roles[index], ...data, actualizadoEn: new Date().toISOString() }
  roles[index] = actualizado
  saveCustomRoles(roles)
  return actualizado
}
export async function eliminarRol(id: string): Promise<void> {
  const roles = readCustomRoles()
  if (!roles.some((rol) => rol.id === id)) throw new Error('Los roles base del sistema no se pueden eliminar.')
  saveCustomRoles(roles.filter((rol) => rol.id !== id))
  const permisos = readCustomPermissions()
  delete permisos[id]
  saveCustomPermissions(permisos)
}
export async function listarPermisosRol(rolId: string): Promise<PermisoResponse[]> {
  const role = await obtenerRol(rolId)
  if (!role.esPersonalizado) return (permisosBase[rolId] ?? []).map((permiso) => ({ ...permiso }))
  const permissionIds = new Set(readCustomPermissions()[rolId] ?? [])
  // El modal cruza estos ids con el catálogo completo antes de mostrarlo.
  return Array.from(permissionIds).map((id) => ({ id, nombre: id, descripcion: '' }))
}
export async function asignarPermiso(rolId: string, permisoId: string): Promise<void> {
  const role = await obtenerRol(rolId)
  if (!role.esPersonalizado) throw new Error('Los permisos de los roles base son de solo lectura.')
  const permisos = readCustomPermissions()
  permisos[rolId] = Array.from(new Set([...(permisos[rolId] ?? []), permisoId]))
  saveCustomPermissions(permisos)
}
export async function removerPermiso(rolId: string, permisoId: string): Promise<void> {
  const role = await obtenerRol(rolId)
  if (!role.esPersonalizado) throw new Error('Los permisos de los roles base son de solo lectura.')
  const permisos = readCustomPermissions()
  permisos[rolId] = (permisos[rolId] ?? []).filter((id) => id !== permisoId)
  saveCustomPermissions(permisos)
}
