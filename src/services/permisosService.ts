/** Catálogo informativo de permisos aplicados por los microservicios. */
export interface PermisoResponse { id: string; nombre: string; descripcion: string; categoria?: string }
export interface CrearPermisoRequest { nombre: string; descripcion: string; categoria?: string }

const permisos: PermisoResponse[] = [
  { id: 'usuarios.gestionar', nombre: 'Gestionar usuarios', descripcion: 'Crear, consultar y administrar usuarios del tenant.', categoria: 'Usuarios' },
  { id: 'usuarios.asignar', nombre: 'Asignar usuarios', descripcion: 'Asignar usuarios pendientes a un tenant.', categoria: 'Usuarios' },
  { id: 'trabajadores.gestionar', nombre: 'Gestionar trabajadores', descripcion: 'Crear, editar y desvincular trabajadores.', categoria: 'Trabajadores' },
  { id: 'contratos.gestionar', nombre: 'Gestionar contratos', descripcion: 'Crear, editar y finalizar contratos.', categoria: 'Contratos' },
  { id: 'asistencia.editar', nombre: 'Editar asistencia', descripcion: 'Editar marcas de asistencia manualmente.', categoria: 'Asistencia' },
  { id: 'ausencias.gestionar', nombre: 'Gestionar ausencias', descripcion: 'Aprobar o rechazar solicitudes de ausencia.', categoria: 'Ausencias' },
  { id: 'perfil.consultar', nombre: 'Consultar información propia', descripcion: 'Ver la ficha y el contrato propios.', categoria: 'Autogestión' },
  { id: 'asistencia.registrar', nombre: 'Registrar asistencia', descripcion: 'Registrar marcas de asistencia propias.', categoria: 'Autogestión' },
  { id: 'ausencias.solicitar', nombre: 'Solicitar ausencias', descripcion: 'Crear solicitudes de ausencia.', categoria: 'Autogestión' },
]

export async function listarPermisos(): Promise<PermisoResponse[]> { return permisos.map((permiso) => ({ ...permiso })) }
export async function obtenerPermiso(id: string): Promise<PermisoResponse> { const permiso = permisos.find((item) => item.id === id); if (!permiso) throw new Error('Permiso no encontrado'); return { ...permiso } }
export async function crearPermiso(_data: CrearPermisoRequest): Promise<PermisoResponse> { throw new Error('Los permisos se definen y validan en los microservicios.') }
