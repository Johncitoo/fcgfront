import { NavLink, useLocation } from 'react-router-dom'
import { authService } from '../lib/auth'

export default function SideNav() {
  const location = useLocation()
  const userRole = authService.getUserRole()
  
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
        </Section>

        <Section title="Formularios">
          <Item to={`${baseRoute}/milestones`} label="Configurar Hitos" />
          <Item to={`${baseRoute}/forms-builder`} label="Diseñar Formularios" />
          <Item to={`${baseRoute}/form-templates`} label="Plantillas" />
        </Section>

        {isAdmin && (
          <Section title="Comunicaciones">
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
              <Item to="/admin/users" label="Usuarios" disabled />
            </Section>
          </>
        )}
      </div>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <ul className="space-y-1">{children}</ul>
    </div>
  )
}

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
