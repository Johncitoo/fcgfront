/**
 * Layout principal para panel de administración.
 * 
 * Componentes:
 * - TopNav: Barra superior global con logo y usuario
 * - Selector de convocatoria: Dropdown para cambiar convocatoria activa
 * - SideNav: Menú lateral con navegación (fijo en desktop, drawer en mobile)
 * - Outlet: Contenido enrutado de las páginas admin
 * 
 * Características:
 * - Responsive: Menú lateral se convierte en drawer móvil
 * - Selector de convocatoria global: Sincronizado con CallContext
 * - Grid layout: 2 columnas en desktop (sidebar + contenido)
 * - Estados visuales para convocatorias: OPEN (verde), CLOSED (gris), DRAFT (amarillo)
 * 
 * @component
 */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import TopNav from '../components/TopNav'
import SideNav from '../components/SideNav'
import { useCall } from '../contexts/CallContext'

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  const { selectedCall, calls, setSelectedCallId, loading } = useCall()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top bar global */}
      <TopNav />

      {/* Selector de convocatoria global - Responsive */}
      <div className="border-b bg-gradient-to-r from-slate-50 to-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          <span className="text-sm font-semibold text-slate-700 flex-shrink-0">
            <span className="hidden sm:inline">Convocatoria:</span>
            <span className="sm:hidden">Conv:</span>
          </span>
          <select
            value={selectedCall?.id || ''}
            onChange={(e) => setSelectedCallId(e.target.value)}
            disabled={loading || calls.length === 0}
            className="flex-1 min-w-[200px] rounded-lg border-2 border-slate-300 px-3 py-2 text-sm font-medium outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed hover:border-slate-400"
          >
            {calls.length === 0 && <option value="">Sin convocatorias disponibles</option>}
            {calls.map((call) => (
              <option key={call.id} value={call.id}>
                {call.name} {call.year} ({call.status === 'OPEN' ? 'Abierta' : call.status === 'CLOSED' ? 'Cerrada' : 'Borrador'})
              </option>
            ))}
          </select>
          {selectedCall && (
            <span className={`hidden md:inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
              selectedCall.status === 'OPEN' 
                ? 'bg-emerald-100 text-emerald-700' 
                : selectedCall.status === 'CLOSED'
                ? 'bg-slate-100 text-slate-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {selectedCall.status === 'OPEN' ? 'Activa' : selectedCall.status === 'CLOSED' ? 'Cerrada' : 'Borrador'}
            </span>
          )}
        </div>
      </div>

      {/* Barra móvil con botón de menú (solo sm) */}
      <div className="border-b bg-white px-4 py-2 md:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Menú
          </button>
          <div className="text-sm text-slate-600">Panel de administración</div>
        </div>
      </div>

      {/* Layout principal */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 md:grid-cols-[16rem_1fr]">
        {/* SideNav fijo en ≥ md */}
        <SideNav />

        {/* Contenido enrutado */}
        <main className="min-h-[calc(100vh-3.5rem)] p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Drawer móvil para SideNav */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* panel */}
          <div className="absolute left-0 top-0 h-full w-[85%] max-w-[20rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <div className="text-sm font-semibold">Navegación</div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-md border px-2 py-1 text-sm hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
            {/* Reutilizamos el contenido del SideNav dentro del panel móvil */}
            <div className="h-[calc(100%-41px)] overflow-y-auto px-2 py-2">
              <div className="[&>aside]:block [&>aside]:w-full [&>aside]:border-0">
                <SideNav />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
