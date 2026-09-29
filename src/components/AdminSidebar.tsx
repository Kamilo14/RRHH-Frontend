import '../styles/AdminSidebar.css'

export type AdminSection =
  | 'resumen'
  | 'trabajadores'
  | 'contratos'
  | 'asistencia'
  | 'ausencias'
  | 'notificaciones'
  | 'configuracion-cuenta'
  | 'configuracion-roles'
  | 'configuracion-permisos'

type AdminSidebarProps = {
  activeSection: AdminSection
  onSectionChange: (section: AdminSection) => void
}

type NavigationItem = {
  id: AdminSection
  label: string
  icon: string
}

const navigationItems: NavigationItem[] = [
  { id: 'resumen', label: 'Resumen general', icon: '▦' },
  { id: 'trabajadores', label: 'Trabajadores', icon: '♙' },
  { id: 'contratos', label: 'Contratos', icon: '▤' },
  { id: 'asistencia', label: 'Asistencia', icon: '◷' },
  { id: 'ausencias', label: 'Ausencias', icon: '◌' },
  { id: 'notificaciones', label: 'Notificaciones', icon: '♢' },
]

function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <div className="admin-sidebar__brand-mark">R</div>
        <div>
          <strong>RRHH SaaS</strong>
          <span>Panel administrativo</span>
        </div>
      </div>

      <div className="admin-sidebar__tenant">
        <span className="admin-sidebar__tenant-label">Empresa activa</span>
        <strong>Empresa Demo SpA</strong>
        <span className="admin-sidebar__tenant-status">
          <span aria-hidden="true" /> Tenant conectado
        </span>
      </div>

      <nav className="admin-sidebar__nav" aria-label="Navegación administrativa">
        <span className="admin-sidebar__section-title">Gestión de RRHH</span>
        {navigationItems.map((item) => (
          <button
            className={`admin-sidebar__link${activeSection === item.id ? ' admin-sidebar__link--active' : ''}`}
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            aria-current={activeSection === item.id ? 'page' : undefined}
          >
            <span className="admin-sidebar__icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
            {item.id === 'notificaciones' && <span className="admin-sidebar__badge">3</span>}
          </button>
        ))}

      </nav>

      <div className="admin-sidebar__footer">
        <button
          className={`admin-sidebar__footer-link${activeSection.startsWith('configuracion-') ? ' admin-sidebar__footer-link--active' : ''}`}
          type="button"
          onClick={() => onSectionChange('configuracion-cuenta')}
          aria-current={activeSection.startsWith('configuracion-') ? 'page' : undefined}
        >
          <span aria-hidden="true">⚙</span>
          Configuración
        </button>
        <button className="admin-sidebar__footer-link admin-sidebar__footer-link--logout" type="button">
          <span aria-hidden="true">↪</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

export default AdminSidebar
