import { NavLink } from 'react-router-dom'

export default function SideNav() {
  return (
    <aside className="hidden border-r bg-white md:block">
      <div className="sticky top-14 h-[calc(100vh-3.5rem)] w-64 overflow-y-auto px-3 py-3">
        <Section title="Panel">
          <Item to="/admin" label="Inicio" />
        </Section>

        <Section title="Gestión">
          <Item to="/admin/applicants" label="Postulantes" />
          <Item to="/admin/calls" label="Convocatorias" disabled />
          <Item to="/admin/invites" label="Invitaciones" disabled />
          <Item to="/admin/applications" label="Postulaciones" disabled />
          <Item to="/admin/forms" label="Formularios" disabled />
        </Section>

        <Section title="Comunicaciones">
          <Item to="/admin/email/templates" label="Plantillas" />
          <Item to="/admin/email/logs" label="Historial" />
        </Section>

        <Section title="Monitoreo">
          <Item to="/admin/audit" label="Auditoría" disabled />
        </Section>
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
