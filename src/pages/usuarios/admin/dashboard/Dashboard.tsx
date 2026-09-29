import { useState } from 'react'
import AdminSidebar, { type AdminSection } from '../../../../components/AdminSidebar'
import Trabajadores from './trabajadores'
import Contratos from './contratos'
import Asistencia from './asistencia'
import Inasistencia from './inasistencia'
import Roles from '../configuracion/roles'
import Permisos from '../configuracion/permisos'
import MiCuenta from '../configuracion/miCuenta'
import '../../../../styles/admin.css'
import '../../../../styles/Dashboard.css'

type SummaryCard = {
  label: string
  value: string
  detail: string
  tone: 'blue' | 'green' | 'orange' | 'purple'
}

const summaryCards: SummaryCard[] = [
  { label: 'Trabajadores activos', value: '128', detail: '+8% este mes', tone: 'blue' },
  { label: 'Contratos vigentes', value: '119', detail: '9 por revisar', tone: 'green' },
  { label: 'Asistencia de hoy', value: '94%', detail: '121 trabajadores registrados', tone: 'orange' },
  { label: 'Ausencias pendientes', value: '07', detail: '3 requieren atención', tone: 'purple' },
]

const sectionTitles: Record<AdminSection, string> = {
  resumen: 'Resumen general',
  trabajadores: 'Trabajadores',
  contratos: 'Contratos',
  asistencia: 'Asistencia',
  ausencias: 'Ausencias / Inasistencias',
  notificaciones: 'Notificaciones',
  'configuracion-cuenta': 'Configuración / Mi cuenta',
  'configuracion-roles': 'Configuración / Roles',
  'configuracion-permisos': 'Configuración / Permisos',
}

function Dashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>('resumen')

  const renderSection = () => {
    switch (activeSection) {
      case 'resumen':
        return <DashboardOverview onSectionChange={setActiveSection} />
      case 'trabajadores':
        return <Trabajadores />
      case 'contratos':
        return <Contratos />
      case 'asistencia':
        return <Asistencia />
      case 'ausencias':
        return <Inasistencia />
      case 'notificaciones':
        return (
          <section className="admin-empty-state">
            <div className="admin-empty-state__icon">♢</div>
            <h2>Notificaciones</h2>
            <p>Aquí aparecerán las alertas y notificaciones del sistema. Esta vista se conectará con el microservicio de notificaciones.</p>
            <span>Próximamente disponible</span>
          </section>
        )
      case 'configuracion-roles':
        return <Roles />
      case 'configuracion-cuenta':
        return <MiCuenta />
      case 'configuracion-permisos':
        return <Permisos />
      default:
        return null
    }
  }

  return (
    <div className="admin-shell">
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <span className="admin-header__eyebrow">Administración / {sectionTitles[activeSection]}</span>
            <h1>{sectionTitles[activeSection]}</h1>
          </div>
          <div className="admin-header__user">
            <div className="admin-header__avatar">MR</div>
            <div>
              <strong>María Rodríguez</strong>
              <span>Admin de RRHH</span>
            </div>
            <span className="admin-header__chevron">⌄</span>
          </div>
        </header>

        {activeSection.startsWith('configuracion-') && (
          <nav className="config-navigation" aria-label="Configuración">
            {([
              ['configuracion-cuenta', 'Mi cuenta'],
              ['configuracion-roles', 'Roles'],
              ['configuracion-permisos', 'Permisos'],
            ] as const).map(([section, label]) => (
              <button
                key={section}
                type="button"
                className={activeSection === section ? 'config-navigation__active' : ''}
                aria-current={activeSection === section ? 'page' : undefined}
                onClick={() => setActiveSection(section)}
              >
                {label}
              </button>
            ))}
          </nav>
        )}
        {renderSection()}
      </main>
    </div>
  )
}

type DashboardOverviewProps = {
  onSectionChange: (section: AdminSection) => void
}

function DashboardOverview({ onSectionChange }: DashboardOverviewProps) {
  return (
    <div className="dashboard-overview">
      <section className="admin-welcome">
        <div>
          <span className="admin-welcome__label">Miércoles, 25 de septiembre de 2026</span>
          <h2>¡Buenos días, María!</h2>
          <p>Aquí tienes una vista rápida de la gestión de tu empresa.</p>
        </div>
        <div className="admin-welcome__illustration" aria-hidden="true">✦</div>
      </section>

      <section className="admin-summary-grid" aria-label="Indicadores principales">
        {summaryCards.map((card) => (
          <article className={`admin-summary-card admin-summary-card--${card.tone}`} key={card.label}>
            <div className="admin-summary-card__top">
              <span>{card.label}</span>
              <span className="admin-summary-card__icon" aria-hidden="true">●</span>
            </div>
            <strong>{card.value}</strong>
            <small>{card.detail}</small>
          </article>
        ))}
      </section>

      <section className="admin-content-grid">
        <article className="admin-panel">
          <div className="admin-panel__heading">
            <div>
              <span className="admin-panel__eyebrow">Actividad reciente</span>
              <h2>Últimos movimientos</h2>
            </div>
            <button type="button" onClick={() => onSectionChange('notificaciones')}>Ver todo</button>
          </div>
          <ul className="admin-activity-list">
            <li>
              <span className="admin-activity-list__dot admin-activity-list__dot--blue" />
              <div><strong>Nuevo trabajador registrado</strong><span>Javiera Soto · Hace 12 min</span></div>
            </li>
            <li>
              <span className="admin-activity-list__dot admin-activity-list__dot--green" />
              <div><strong>Contrato actualizado</strong><span>Diego Morales · Hace 45 min</span></div>
            </li>
            <li>
              <span className="admin-activity-list__dot admin-activity-list__dot--orange" />
              <div><strong>Solicitud de ausencia recibida</strong><span>Camila Pérez · Hace 1 h</span></div>
            </li>
          </ul>
        </article>

        <article className="admin-panel admin-panel--quick-actions">
          <div className="admin-panel__heading">
            <div>
              <span className="admin-panel__eyebrow">Accesos rápidos</span>
              <h2>Gestión frecuente</h2>
            </div>
          </div>
          <div className="admin-quick-actions">
            <button type="button" onClick={() => onSectionChange('trabajadores')}><span>♙</span>Ver trabajadores</button>
            <button type="button" onClick={() => onSectionChange('contratos')}><span>▤</span>Revisar contratos</button>
            <button type="button" onClick={() => onSectionChange('ausencias')}><span>◌</span>Gestionar ausencias</button>
            <button type="button" onClick={() => onSectionChange('asistencia')}><span>◷</span>Consultar asistencia</button>
          </div>
        </article>
      </section>
    </div>
  )
}

export default Dashboard
