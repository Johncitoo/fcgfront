import { NavLink, useLocation } from 'react-router-dom'
import { authService } from '../lib/auth'
import {
  Home,
  Users,
  Building2,
  Calendar,
  Mail,
  FileText,
  Settings,
  Milestone,
  ClipboardList,
  Send,
  LayoutTemplate,
  History,
  Activity,
  UserCog,
  UserCheck,
  ChevronRight
} from 'lucide-react'

/**
 * Barra lateral de navegación para admin y reviewer.
 * Diseño moderno con íconos y efectos de hover elegantes.
 */
export default function SideNav() {
  const location = useLocation()
  const userRole = authService.getUserRole()
  
  const isReviewerSection = location.pathname.startsWith('/reviewer')
  const baseRoute = isReviewerSection ? '/reviewer' : '/admin'
  const isAdmin = userRole === 'ADMIN'

  return (
    <aside className="hidden md:block border-r border-slate-200/80 bg-gradient-to-b from-white via-slate-50/30 to-white">
      <div className="sticky top-14 h-[calc(100vh-3.5rem)] w-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <nav className="p-4 space-y-6">
          {/* Panel */}
          <Section title="Panel" icon={<Home className="w-4 h-4" />}>
            <Item to={baseRoute} icon={<Home />} label="Inicio" end />
          </Section>

          {/* Gestión */}
          <Section title="Gestión" icon={<Settings className="w-4 h-4" />}>
            <Item to={`${baseRoute}/applicants`} icon={<Users />} label="Postulantes" />
            <Item to={`${baseRoute}/institutions`} icon={<Building2 />} label="Escuelas/Colegios" />
            <Item to={`${baseRoute}/calls`} icon={<Calendar />} label="Convocatorias" />
            <Item to={`${baseRoute}/invites`} icon={<Mail />} label="Invitaciones" />
            <Item to={`${baseRoute}/applications`} icon={<ClipboardList />} label="Postulaciones" />
          </Section>

          {/* Formularios */}
          <Section title="Formularios" icon={<FileText className="w-4 h-4" />}>
            <Item to={`${baseRoute}/milestones`} icon={<Milestone />} label="Configurar Hitos" />
            <Item to={`${baseRoute}/forms-builder`} icon={<FileText />} label="Diseñar Formularios" />
            <Item to={`${baseRoute}/form-templates`} icon={<LayoutTemplate />} label="Plantillas" />
          </Section>

          {/* Comunicaciones (solo Admin) */}
          {isAdmin && (
            <Section title="Comunicaciones" icon={<Send className="w-4 h-4" />}>
              <Item to="/admin/email/announcements" icon={<Send />} label="Enviar Avisos" />
              <Item to="/admin/email/templates" icon={<LayoutTemplate />} label="Plantillas" />
              <Item to={`${baseRoute}/email/logs`} icon={<History />} label="Historial" />
            </Section>
          )}

          {/* Monitoreo (Reviewer) */}
          {!isAdmin && (
            <Section title="Monitoreo" icon={<Activity className="w-4 h-4" />}>
              <Item to={`${baseRoute}/email/logs`} icon={<History />} label="Logs Email" />
              <Item to={`${baseRoute}/audit`} icon={<Activity />} label="Auditoría" />
            </Section>
          )}

          {/* Monitoreo y Sistema (Admin) */}
          {isAdmin && (
            <>
              <Section title="Monitoreo" icon={<Activity className="w-4 h-4" />}>
                <Item to="/admin/audit" icon={<Activity />} label="Auditoría" />
              </Section>
              
              <Section title="Sistema" icon={<UserCog className="w-4 h-4" />}>
                <Item to="/admin/user-management" icon={<UserCog />} label="Administradores" />
                <Item to="/admin/reviewer-management" icon={<UserCheck />} label="Revisores" />
              </Section>
            </>
          )}
        </nav>

        {/* Footer del sidebar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
          <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100">
            <p className="text-xs font-medium text-sky-700">Fundación Carmen Goudie</p>
            <p className="text-[10px] text-sky-500/80">Sistema de Gestión de Becas</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

/**
 * Sección con título para agrupar items del menú.
 */
function Section({ 
  title, 
  icon, 
  children 
}: { 
  title: string
  icon?: React.ReactNode
  children: React.ReactNode 
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-3 py-1.5">
        {icon && <span className="text-sky-500/70">{icon}</span>}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
      </div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  )
}

/**
 * Item individual del menú con NavLink.
 */
function Item({
  to,
  label,
  icon,
  disabled,
  end,
}: {
  to: string
  label: string
  icon: React.ReactNode
  disabled?: boolean
  end?: boolean
}) {
  if (disabled) {
    return (
      <li>
        <span
          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 cursor-not-allowed"
          title="Disponible próximamente"
        >
          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-slate-300">
            {icon}
          </span>
          <span className="flex-1">{label}</span>
        </span>
      </li>
    )
  }

  return (
    <li>
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            isActive
              ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/25'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`flex-shrink-0 w-5 h-5 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
              isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-500'
            }`}>
              {icon}
            </span>
            <span className="flex-1 truncate">{label}</span>
            <ChevronRight className={`w-4 h-4 transition-all duration-200 ${
              isActive 
                ? 'text-white/70 translate-x-0 opacity-100' 
                : 'text-slate-300 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
            }`} />
          </>
        )}
      </NavLink>
    </li>
  )
}
