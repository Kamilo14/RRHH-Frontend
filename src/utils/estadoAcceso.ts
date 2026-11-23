import type { MeResponse } from '../services/identityService'

export type TipoAcceso = 'activo' | 'no-registrado' | 'empresa-en-revision' | 'solicitud-enviada' | 'rechazado'

export interface EstadoAcceso {
  tipo: TipoAcceso
  texto: string
}

/** Pantalla que corresponde mostrar según la respuesta de `/auth/me` (S8). */
export function estadoDeAcceso(me: MeResponse): EstadoAcceso {
  const empresa = me.tenantNombre?.trim() || 'tu empresa'

  if (me.estado === 'NO_REGISTRADO') {
    return { tipo: 'no-registrado', texto: 'Tu cuenta no está asociada a una empresa' }
  }
  if (me.estado === 'PENDIENTE' && me.tenantEstado === 'PENDIENTE_ACTIVACION') {
    return { tipo: 'empresa-en-revision', texto: `Tu empresa ${empresa} está en revisión` }
  }
  if (me.estado === 'PENDIENTE') {
    return { tipo: 'solicitud-enviada', texto: `Tu solicitud fue enviada a ${empresa}. RRHH fue notificado` }
  }
  if (me.estado === 'RECHAZADO') {
    return { tipo: 'rechazado', texto: 'Tu solicitud fue rechazada' }
  }
  return { tipo: 'activo', texto: '' }
}
