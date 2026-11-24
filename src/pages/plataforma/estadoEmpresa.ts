export function mensajeDe(error: unknown, porDefecto: string): string {
  return error instanceof Error && error.message ? error.message : porDefecto
}

/** Etiqueta y estilo del estado de una empresa, para las insignias de la lista y del detalle. */
export function insigniaEstado(estado: string): { texto: string; clase: string } {
  switch (estado) {
    case 'ACTIVO': return { texto: 'Activa', clase: 'trab-badge trab-badge--activo' }
    case 'SUSPENDIDO': return { texto: 'Suspendida', clase: 'trab-badge trab-badge--inactivo' }
    case 'RECHAZADO': return { texto: 'Rechazada', clase: 'trab-badge trab-badge--inactivo' }
    case 'PENDIENTE_ACTIVACION': return { texto: 'Pendiente', clase: 'trab-badge trab-badge--pendiente' }
    default: return { texto: estado, clase: 'trab-badge trab-badge--neutro' }
  }
}
