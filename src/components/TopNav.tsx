import { Link, NavLink } from 'react-router-dom'

export default function TopNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4">
        {/* Branding */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white">
            F
          </div>
          <span className="text-sm font-semibold">
            Fundación Carmen Goudie — Becas
          </span>
        </Link>

        {/* Navegación principal (atajos) */}
        <nav className="ml-auto flex items-center gap-1">
          <NavLinkItem to="/admin" label="Admin" />
          <NavLinkItem to="/admin/applicants" label="Postulantes" />
          <NavLinkItem to="/admin/email/templates" label="Plantillas" />
          <NavLinkItem to="/admin/email/logs" label="Email logs" />
        </nav>
      </div>
    </header>
  )
}

function NavLinkItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'rounded-md px-3 py-2 text-sm font-medium',
          isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50',
        ].join(' ')
      }
    >
      {label}
    </NavLink>
  )
}
