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

const roleAliases: Record<string, string> = {
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
  // El operador SaaS utiliza el panel de plataforma; no el dashboard de un tenant.
  OPERADOR_SAAS: [],
  SUPERADMIN: ['resumen', 'trabajadores', 'contratos', 'asistencia', 'ausencias', 'notificaciones', 'configuracion', 'configuracion-cuenta', 'configuracion-roles', 'seguridad', 'facturacion', 'aspecto', 'idioma', 'accesibilidad'],
  ADMIN_RRHH: ['resumen', 'trabajadores', 'contratos', 'asistencia', 'ausencias', 'notificaciones', 'configuracion', 'configuracion-cuenta', 'configuracion-roles', 'seguridad', 'facturacion', 'aspecto', 'idioma', 'accesibilidad'],
  JEFATURA: ['trabajadores', 'asistencia', 'ausencias', 'notificaciones', 'configuracion', 'configuracion-cuenta', 'seguridad', 'aspecto', 'idioma', 'accesibilidad'],
  TRABAJADOR: ['asistencia', 'ausencias', 'notificaciones', 'configuracion', 'configuracion-cuenta', 'seguridad', 'aspecto', 'idioma', 'accesibilidad'],
}

export function normalizeRole(role: string | null | undefined): string {
  if (!role) return ''
  return roleAliases[role] ?? role.trim()
}

export function canAccessSection(role: string | null | undefined, section: SidebarSection): boolean {
  return permissions[normalizeRole(role)]?.includes(section) ?? false
}

export function canAccessAnyDashboard(role: string | null | undefined): boolean {
  return (permissions[normalizeRole(role)]?.length ?? 0) > 0
}
