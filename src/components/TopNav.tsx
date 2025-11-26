import { Link, NavLink } from 'react-router-dom'
import { useCall } from '../contexts/CallContext'
import { useState } from 'react'

export default function TopNav() {
  const { selectedCall, calls, setSelectedCall } = useCall()
  const [showCallMenu, setShowCallMenu] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4">
        {/* Branding - Responsive */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-md transition-transform group-hover:scale-105">
            <span className="text-lg font-bold">F</span>
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-bold text-slate-800">
              Fundación Carmen Goudie
            </div>
            <div className="text-xs text-slate-500">Sistema de Becas</div>
          </div>
          <span className="md:hidden text-sm font-bold text-slate-800">FCG</span>
        </Link>

        {/* Selector de Convocatoria - Responsive */}
        <div className="relative flex-1 max-w-md">
          <button
            onClick={() => setShowCallMenu(!showCallMenu)}
            className="w-full flex items-center justify-between gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-sky-300 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="hidden sm:inline text-xs text-slate-500 flex-shrink-0">Convocatoria:</span>
              <span className="font-semibold text-sky-600 truncate">
                {selectedCall ? (
                  <>
                    <span className="hidden sm:inline">{selectedCall.name} ({selectedCall.year})</span>
                    <span className="sm:hidden">{selectedCall.name} '{String(selectedCall.year).slice(-2)}</span>
                  </>
                ) : 'Seleccionar...'}
              </span>
            </div>
            <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showCallMenu && (
            <div className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="max-h-64 overflow-y-auto p-1">
                {calls.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">
                    No hay convocatorias
                  </div>
                ) : (
                  calls.map((call) => (
                    <button
                      key={call.id}
                      onClick={() => {
                        setSelectedCall(call)
                        setShowCallMenu(false)
                      }}
                      className={`w-full rounded px-3 py-2 text-left text-sm ${
                        selectedCall?.id === call.id
                          ? 'bg-sky-50 font-semibold text-sky-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-medium">{call.name}</div>
                      <div className="text-xs text-slate-500">
                        Año {call.year} · {call.status}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-slate-200 p-1">
                <Link
                  to="/admin/calls"
                  className="block w-full rounded px-3 py-2 text-center text-sm font-medium text-sky-600 hover:bg-sky-50"
                  onClick={() => setShowCallMenu(false)}
                >
                  + Nueva Convocatoria
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Navegación principal (atajos) */}
        <nav className="ml-auto flex items-center gap-1">
          <NavLinkItem to="/admin" label="Inicio" />
          <NavLinkItem to="/admin/applicants" label="Postulantes" />
          <NavLinkItem to="/admin/calls" label="Convocatorias" />
          <NavLinkItem to="/admin/forms-builder" label="Formularios" />
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
