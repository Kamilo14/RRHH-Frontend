import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../../context/AuthContext'
import { getToken } from '../../../../services/httpClient'
import AdminSidebar, { type AdminSection } from '../../../../components/AdminSidebar'
import Trabajadores from './trabajadores'
import Contratos from './contratos'
import Asistencia from './asistencia'
import Inasistencia from './inasistencia'
import Notificaciones from './notificaciones'
import Roles from '../configuracion/roles'
import MiCuenta from '../configuracion/miCuenta'
import Configuracion from '../configuracion/Configuracion'
import '../../../../styles/admin.css'
import '../../../../styles/Dashboard.css'
import { listarTrabajadores, type TrabajadorResponse } from '../../../../services/trabajadoresService'
import { listarContratos, type ContratoResponse } from '../../../../services/contratosService'
import { listarMarcasAsistencia, type MarcaAsistenciaResponse } from '../../../../services/asistenciaService'
import { listarSolicitudesAusencia, type SolicitudAusenciaResponse } from '../../../../services/ausenciasService'

const sectionTitles: Record<AdminSection, string> = {
  resumen: 'Resumen general',
  trabajadores: 'Trabajadores',
  contratos: 'Contratos',
  asistencia: 'Asistencia',
  ausencias: 'Ausencias / Inasistencias',
  notificaciones: 'Notificaciones',
  configuracion: 'Configuración',
  'configuracion-cuenta': 'Configuración / Mi cuenta',
  'configuracion-roles': 'Configuración / Roles',
}

type CognitoClaims = {
  name?: string
  given_name?: string
}

function getCognitoDisplayName(): string | null {
  const token = getToken()
  if (!token) {
    return null
  }

  const payload = token.split('.')[1]
  if (!payload) {
    return null
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(normalizedPayload)) as CognitoClaims
    return claims.name?.trim() || claims.given_name?.trim() || null
  } catch {
    return null
  }
}

function Dashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>('resumen')
  const [notificationRefreshKey, setNotificationRefreshKey] = useState(0)
  const { user } = useAuth()
  const isConfigurationSection = activeSection.startsWith('configuracion')
  const displayName = user?.nombre || getCognitoDisplayName() || user?.email || 'Usuario'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

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
        return <Notificaciones onChange={() => setNotificationRefreshKey((current) => current + 1)} />
      case 'configuracion':
        return <Configuracion onSectionChange={setActiveSection} onBack={() => setActiveSection('resumen')} />
      case 'configuracion-roles':
        return <Roles onBack={() => setActiveSection('configuracion')} />
      case 'configuracion-cuenta':
        return <MiCuenta onBack={() => setActiveSection('configuracion')} />
      default:
        return null
    }
  }

  return (
    <div className="admin-shell">
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} notificationRefreshKey={notificationRefreshKey} />
      <main className="admin-main">
        <header className={`admin-header${isConfigurationSection ? ' admin-header--configuration' : ''}`}>
          <div>
            <span className="admin-header__eyebrow">Administración / {sectionTitles[activeSection]}</span>
            {!isConfigurationSection && <h1>{sectionTitles[activeSection]}</h1>}
          </div>
          <div className="admin-header__user">
            <div className="admin-header__avatar">{initials}</div>
            <div>
              <strong>{displayName}</strong>
              <span>{user?.role || 'Usuario'}</span>
            </div>
            <span className="admin-header__chevron">⌄</span>
          </div>
        </header>

        {renderSection()}
      </main>
    </div>
  )
}

type DashboardOverviewProps = {
  onSectionChange: (section: AdminSection) => void
}

function DashboardOverview({ onSectionChange }: DashboardOverviewProps) {
  const { user } = useAuth()
  const [trabajadores, setTrabajadores] = useState<TrabajadorResponse[]>([])
  const [contratos, setContratos] = useState<ContratoResponse[]>([])
  const [marcas, setMarcas] = useState<MarcaAsistenciaResponse[]>([])
  const [ausencias, setAusencias] = useState<SolicitudAusenciaResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const displayName = user?.nombre || getCognitoDisplayName() || user?.email || 'usuario'
  const today = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  useEffect(() => {
    let vigente = true
    async function cargarResumen() {
      setLoading(true)
      setError(false)
      const resultados = await Promise.allSettled([
        listarTrabajadores(),
        listarContratos(),
        listarMarcasAsistencia(),
        listarSolicitudesAusencia(),
      ])

      if (!vigente) return
      const [resultadoTrabajadores, resultadoContratos, resultadoMarcas, resultadoAusencias] = resultados
      if (resultadoTrabajadores.status === 'fulfilled') setTrabajadores(resultadoTrabajadores.value)
      if (resultadoContratos.status === 'fulfilled') setContratos(resultadoContratos.value)
      if (resultadoMarcas.status === 'fulfilled') setMarcas(resultadoMarcas.value)
      if (resultadoAusencias.status === 'fulfilled') setAusencias(resultadoAusencias.value)
      setError(resultados.some((resultado) => resultado.status === 'rejected'))
      setLoading(false)
    }
    cargarResumen()
    return () => { vigente = false }
  }, [])

  const datos = useMemo(() => {
    const hoyIso = new Date().toISOString().slice(0, 10)
    const limiteVencimiento = new Date()
    limiteVencimiento.setDate(limiteVencimiento.getDate() + 30)
    const activos = trabajadores.filter((trabajador) => trabajador.activo)
    const vigentes = contratos.filter((contrato) => contrato.activo)
    const porVencer = vigentes.filter((contrato) => contrato.fechaTermino && new Date(`${contrato.fechaTermino}T12:00:00`) <= limiteVencimiento)
    const entradasHoy = new Set(
      marcas
        .filter((marca) => marca.fechaHora.slice(0, 10) === hoyIso && marca.tipo === 'ENTRADA')
        .map((marca) => marca.trabajadorId)
    )
    const asistencia = activos.length ? Math.round((entradasHoy.size / activos.length) * 100) : 0
    const pendientes = ausencias.filter((ausencia) => ausencia.estado === 'PENDIENTE')
    return { activos, vigentes, porVencer, entradasHoy, asistencia, pendientes }
  }, [trabajadores, contratos, marcas, ausencias])

  const nombreTrabajador = (trabajadorId: string) => {
    const trabajador = trabajadores.find((item) => item.id === trabajadorId)
    return trabajador ? `${trabajador.nombre} ${trabajador.apellido}` : 'Trabajador'
  }

  return (
    <div className="dashboard-overview">
      <section className="admin-welcome">
        <div>
          <span className="admin-welcome__label">{today}</span>
          <h2>¡Buenos días, {displayName}!</h2>
          <p>Aquí tienes una vista rápida de la gestión de tu empresa.</p>
        </div>
        <div className="admin-welcome__illustration" aria-hidden="true">✦</div>
      </section>

      {error && <p className="admin-dashboard-notice">Algunos indicadores no pudieron cargarse. Puedes revisar cada módulo para ver el detalle.</p>}

      <section className="admin-summary-grid" aria-label="Indicadores principales">
        <article className="admin-summary-card admin-summary-card--blue">
          <div className="admin-summary-card__top"><span>Trabajadores activos</span><span className="admin-summary-card__icon">●</span></div>
          <strong>{loading ? '—' : datos.activos.length}</strong>
          <small>Dotación vigente</small>
        </article>
        <article className="admin-summary-card admin-summary-card--green">
          <div className="admin-summary-card__top"><span>Contratos vigentes</span><span className="admin-summary-card__icon">●</span></div>
          <strong>{loading ? '—' : datos.vigentes.length}</strong>
          <small>{loading ? 'Cargando datos' : `${datos.porVencer.length} por vencer`}</small>
        </article>
        <article className="admin-summary-card admin-summary-card--orange">
          <div className="admin-summary-card__top"><span>Asistencia de hoy</span><span className="admin-summary-card__icon">●</span></div>
          <strong>{loading ? '—' : `${datos.asistencia}%`}</strong>
          <small>{loading ? 'Cargando datos' : `${datos.entradasHoy.size} con entrada registrada`}</small>
        </article>
        <article className="admin-summary-card admin-summary-card--purple">
          <div className="admin-summary-card__top"><span>Ausencias pendientes</span><span className="admin-summary-card__icon">●</span></div>
          <strong>{loading ? '—' : datos.pendientes.length}</strong>
          <small>Solicitudes por revisar</small>
        </article>
      </section>

      <section className="admin-content-grid">
        <article className="admin-panel">
          <div className="admin-panel__heading">
            <div>
              <span className="admin-panel__eyebrow">Requiere atención</span>
              <h2>Alertas de gestión</h2>
            </div>
            <button type="button" onClick={() => onSectionChange(datos.pendientes.length ? 'ausencias' : 'contratos')}>Ver detalle</button>
          </div>
          {!loading && datos.porVencer.length === 0 && datos.pendientes.length === 0 && (
            <p className="admin-panel__empty">No hay alertas pendientes para esta empresa.</p>
          )}
          {!loading && (datos.porVencer.length > 0 || datos.pendientes.length > 0) && (
            <ul className="admin-activity-list">
              {datos.porVencer.slice(0, 3).map((contrato) => (
                <li key={contrato.id}>
                  <span className="admin-activity-list__dot admin-activity-list__dot--orange" />
                  <div><strong>Contrato próximo a vencer</strong><span>{nombreTrabajador(contrato.trabajadorId)} · vence el {contrato.fechaTermino}</span></div>
                </li>
              ))}
              {datos.pendientes.slice(0, 3).map((ausencia) => (
                <li key={ausencia.id}>
                  <span className="admin-activity-list__dot admin-activity-list__dot--blue" />
                  <div><strong>Solicitud de ausencia pendiente</strong><span>{nombreTrabajador(ausencia.trabajadorId)} · desde {ausencia.fechaInicio}</span></div>
                </li>
              ))}
            </ul>
          )}
          {loading && <p className="admin-panel__empty">Cargando indicadores de la empresa…</p>}
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
