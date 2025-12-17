import { NavLink, useLocation } from 'react-router-dom'
import { authService } from '../lib/auth'
import { useCall } from '../contexts/CallContext'

/**
 * Barra lateral de navegación para admin y reviewer.
 * Menús organizados en secciones: Panel, Gestión, Formularios, Comunicaciones, Monitoreo, Sistema.
 * Adapta rutas base según si está en /admin o /reviewer.
 * Opciones de Comunicaciones y Sistema solo visibles para ADMIN.
 * Oculta en mobile (responsive con md:block).
 * 
 * @example
 * <SideNav /> // En layout de admin/reviewer
 */
export default function SideNav() {
  const location = useLocation()
  const userRole = authService.getUserRole()
  const { selectedCall } = useCall()
  
  // Detectar si estamos en rutas de reviewer
  const isReviewerSection = location.pathname.startsWith('/reviewer')
  const baseRoute = isReviewerSection ? '/reviewer' : '/admin'
  
  // Solo mostrar gestión de usuarios si es ADMIN
  const isAdmin = userRole === 'ADMIN'

  return (
    <aside className="hidden border-r bg-white md:block">
      <div className="sticky top-14 h-[calc(100vh-3.5rem)] w-64 overflow-y-auto px-3 py-3">
        <Section title="Panel">
          <Item to={baseRoute} label="Inicio" />
        </Section>

        <Section title="Gestión">
          <Item to={`${baseRoute}/applicants`} label="Postulantes" />
          <Item to={`${baseRoute}/institutions`} label="Escuelas/Colegios" />
          <Item to={`${baseRoute}/calls`} label="Convocatorias" />
          <Item to={`${baseRoute}/invites`} label="Invitaciones" />
          <Item to={`${baseRoute}/applications`} label="Postulaciones" />
          {isAdmin && selectedCall && (
            <Item to={`${baseRoute}/calls/${selectedCall.id}/selection`} label="📋 Selección Final" />
          )}
        </Section>

        <Section title="Formularios">
          <Item to={`${baseRoute}/milestones`} label="Configurar Hitos" />
          <Item to={`${baseRoute}/forms-builder`} label="Diseñar Formularios" />
          <Item to={`${baseRoute}/form-templates`} label="Plantillas" />
        </Section>

        {isAdmin && (
          <Section title="Comunicaciones">
            <Item to="/admin/email/announcements" label="Enviar Avisos" />
            <Item to="/admin/email/templates" label="Plantillas" />
            <Item to={`${baseRoute}/email/logs`} label="Historial" />
          </Section>
        )}

        {!isAdmin && (
          <Section title="Monitoreo">
            <Item to={`${baseRoute}/email/logs`} label="Logs Email" />
            <Item to={`${baseRoute}/audit`} label="Auditoría" />
          </Section>
        )}

        {isAdmin && (
          <>
            <Section title="Monitoreo">
              <Item to="/admin/audit" label="Auditoría" />
            </Section>
            
            <Section title="Sistema">
              <Item to="/admin/user-management" label="Administradores" />
              <Item to="/admin/reviewer-management" label="Revisores" />
            </Section>
          </>
        )}
      </div>
    </aside>
  )
}

/**
 * Sección con título para agrupar items del menú.
 * Título en mayúsculas pequeñas, gris.
 * 
 * @param title - Título de la sección
 * @param children - Items del menú
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-sky-600 border-b border-sky-200 pb-1">
        {title}
      </div>
      <ul className="space-y-1">{children}</ul>
    </div>
  )
}

/**
 * Item individual del menú con NavLink o span deshabilitado.
 * Resalta con fondo gris cuando activo.
 * 
 * @param to - Ruta del link
 * @param label - Texto del item
 * @param disabled - Si está deshabilitado (muestra cursor-not-allowed)
 */
function Item({
  to,
  label,
  disabled,
}: {
  to: string
  label: string
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <li>
        <span
          className="block cursor-not-allowed rounded-md px-3 py-2 text-sm text-slate-400"
          title="Disponible próximamente"
        >
          {label}
        </span>
      </li>
    )
  }
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          [
            'block rounded-md px-3 py-2 text-sm',
            isActive
              ? 'bg-slate-100 font-medium text-slate-900'
              : 'text-slate-700 hover:bg-slate-50',
          ].join(' ')
        }
      >
        {label}
      </NavLink>
    </li>
  )
}
