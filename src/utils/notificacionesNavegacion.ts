import { canAccessSection, type SidebarSection } from '../security/accessControl'

export type SeccionNotificacion = Extract<SidebarSection, 'ausencias' | 'contratos' | 'asistencia'>

const SECCION_POR_EVENTO: Record<string, SeccionNotificacion> = {
  ausencia: 'ausencias',
  contrato: 'contratos',
  asistencia: 'asistencia',
}

export const NOMBRE_SECCION: Record<SeccionNotificacion, string> = {
  ausencias: 'Ausencias',
  contratos: 'Contratos',
  asistencia: 'Asistencia',
}

/**
 * Sección del dashboard a la que lleva una notificación según su evento (`ausencia.solicitada` → `ausencias`).
 * Devuelve null si el evento no tiene destino conocido o el rol no puede acceder a esa sección.
 */
export function seccionDestino(
  tipoEvento: string | null | undefined,
  rol: string | null | undefined,
): SeccionNotificacion | null {
  const seccion = SECCION_POR_EVENTO[tipoEvento?.split('.')[0] ?? '']
  return seccion && canAccessSection(rol, seccion) ? seccion : null
}
