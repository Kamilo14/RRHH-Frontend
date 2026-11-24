import '../styles/AdminSidebar.css'

export type PlataformaSeccion = 'empresas' | 'grupos' | 'usuarios'

type Props = {
  seccion: PlataformaSeccion
  esAdmin: boolean
  rolLegible: string
  onSeccion: (seccion: PlataformaSeccion) => void
  onCerrarSesion: () => void
}

const ITEMS: { id: PlataformaSeccion; label: string; icon: string; soloAdmin: boolean }[] = [
  { id: 'empresas', label: 'Empresas', icon: '▦', soloAdmin: false },
  { id: 'grupos', label: 'Grupos', icon: '◫', soloAdmin: true },
  { id: 'usuarios', label: 'Usuarios de plataforma', icon: '♙', soloAdmin: true },
]

/** Menú lateral de la consola de plataforma, con la misma estructura que el del panel administrativo. */
function PlataformaSidebar({ seccion, esAdmin, rolLegible, onSeccion, onCerrarSesion }: Props) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <div className="admin-sidebar__brand-mark">R</div>
        <div>
          <strong>RRHH SaaS</strong>
          <span>Consola de plataforma</span>
        </div>
      </div>

      <div className="admin-sidebar__tenant">
        <span className="admin-sidebar__tenant-label">Acceso</span>
        <strong>{rolLegible}</strong>
        <span className="admin-sidebar__tenant-status">
          <span aria-hidden="true" /> {esAdmin ? 'Todas las empresas' : 'Empresas de tus grupos'}
        </span>
      </div>

      <nav className="admin-sidebar__nav" aria-label="Navegación de la plataforma">
        <span className="admin-sidebar__section-title">Plataforma</span>
        {ITEMS.filter((item) => esAdmin || !item.soloAdmin).map((item) => (
          <button
            key={item.id}
            type="button"
            className={`admin-sidebar__link${seccion === item.id ? ' admin-sidebar__link--active' : ''}`}
            aria-current={seccion === item.id ? 'page' : undefined}
            onClick={() => onSeccion(item.id)}
          >
            <span className="admin-sidebar__icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <button className="admin-sidebar__footer-link admin-sidebar__footer-link--logout" type="button" onClick={onCerrarSesion}>
          <span aria-hidden="true">↪</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

export default PlataformaSidebar
