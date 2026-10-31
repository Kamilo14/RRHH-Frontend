export type SidebarSection =
  | 'resumen'
  | 'trabajadores'
  | 'contratos'
  | 'asistencia'
  | 'ausencias'
  | 'notificaciones'
  | 'configuracion'
  | 'configuracion-cuenta'
  | 'configuracion-roles'
  | 'seguridad'
  | 'facturacion'
  | 'aspecto'
  | 'idioma'
  | 'accesibilidad'
  | 'plataforma'

const roleAliases: Record<string, string> = {
  'ROLE_ADMIN_PLATAFORMA': 'ADMIN_PLATAFORMA',
  AdminPlataforma: 'ADMIN_PLATAFORMA',
  'ROLE_OPERADOR_SAAS': 'OPERADOR_SAAS',
  OperadorSaaS: 'OPERADOR_SAAS',
  'ROLE_SUPERADMIN': 'SUPERADMIN',
  SuperAdmin: 'SUPERADMIN',
  'ROLE_ADMIN_RRHH': 'ADMIN_RRHH',
  'Admin de RRHH': 'ADMIN_RRHH',
  'ROLE_JEFATURA': 'JEFATURA',
  Jefatura: 'JEFATURA',
  'ROLE_TRABAJADOR': 'TRABAJADOR',
  Trabajador: 'TRABAJADOR',
}

const permissions: Record<string, SidebarSection[]> = {
  // Los roles de plataforma usan la consola /plataforma; no el dashboard de un tenant.
  ADMIN_PLATAFORMA: ['plataforma'],
  OPERADOR_SAAS: ['plataforma'],
  SUPERADMIN: ['resumen', 'trabajadores', 'contratos', 'asistencia', 'ausencias', 'notificaciones', 'configuracion', 'configuracion-cuenta', 'configuracion-roles', 'seguridad', 'facturacion', 'aspecto', 'idioma', 'accesibilidad'],
  ADMIN_RRHH: ['resumen', 'trabajadores', 'contratos', 'asistencia', 'ausencias', 'notificaciones', 'configuracion', 'configuracion-cuenta', 'configuracion-roles', 'seguridad', 'facturacion', 'aspecto', 'idioma', 'accesibilidad'],
  JEFATURA: ['trabajadores', 'asistencia', 'ausencias', 'notificaciones', 'configuracion', 'configuracion-cuenta', 'seguridad', 'aspecto', 'idioma', 'accesibilidad'],
  TRABAJADOR: ['asistencia', 'ausencias', 'notificaciones', 'configuracion', 'configuracion-cuenta', 'seguridad', 'aspecto', 'idioma', 'accesibilidad'],
}

export function normalizeRole(role: string | null | undefined): string {
  if (!role) return ''
  const rawRole = role.trim()
  const canonicalRole = rawRole.toUpperCase()
  return roleAliases[rawRole]
    ?? roleAliases[canonicalRole]
    ?? (canonicalRole === 'ADMIN DE RRHH' ? 'ADMIN_RRHH' : canonicalRole)
}

export function canAccessSection(role: string | null | undefined, section: SidebarSection): boolean {
  return permissions[normalizeRole(role)]?.includes(section) ?? false
}

const ROLES_PLATAFORMA = ['ADMIN_PLATAFORMA', 'OPERADOR_SAAS']
const ROLES_ADMIN_TENANT = ['SUPERADMIN', 'ADMIN_RRHH']

export function canAccessAnyDashboard(role: string | null | undefined): boolean {
  return (permissions[normalizeRole(role)]?.length ?? 0) > 0
}

/** Ruta de inicio de cada rol después de autenticarse. */
export function dashboardForRole(role?: string | null): string {
  const normalized = normalizeRole(role)
  if (ROLES_PLATAFORMA.includes(normalized)) return '/plataforma'
  if (ROLES_ADMIN_TENANT.includes(normalized)) return '/admin/dashboard'
  return '/dashboard'
}
