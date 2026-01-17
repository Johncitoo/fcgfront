/**
 * Layout principal para panel de administración.
 * Diseño moderno con gradientes sutiles y mejor espaciado.
 */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import TopNav from '../components/TopNav'
import SideNav from '../components/SideNav'
import { useCall } from '../contexts/CallContext'
import { Calendar, Menu, X, ChevronDown } from 'lucide-react'

export default function AdminLayout() {
  const [open, setOpen] = useState(false)
  const { selectedCall, calls, setSelectedCallId, loading } = useCall()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      {/* Top bar global */}
      <TopNav />

      {/* Selector de convocatoria global - Diseño moderno */}
      <div className="border-b border-slate-200/60 bg-white/50 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <Calendar className="w-4 h-4 text-sky-500" />
            <span className="hidden sm:inline">Convocatoria activa</span>
            <span className="sm:hidden">Conv.</span>
          </div>
          
          <div className="relative flex-1 min-w-[200px]">
            <select
              value={selectedCall?.id || ''}
              onChange={(e) => setSelectedCallId(e.target.value)}
              disabled={loading || calls.length === 0}
              className="w-full appearance-none rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed hover:border-slate-300 cursor-pointer"
            >
              {calls.length === 0 && <option value="">Sin convocatorias disponibles</option>}
              {calls.map((call) => (
                <option key={call.id} value={call.id}>
                  {call.name} {call.year} • {call.status === 'OPEN' ? 'Abierta' : call.status === 'CLOSED' ? 'Cerrada' : 'Borrador'}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {selectedCall && (
            <span className={`hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
              selectedCall.status === 'OPEN' 
                ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200' 
                : selectedCall.status === 'CLOSED'
                ? 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 border border-slate-200'
                : 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                selectedCall.status === 'OPEN' 
                  ? 'bg-emerald-500 animate-pulse' 
                  : selectedCall.status === 'CLOSED'
                  ? 'bg-slate-400'
                  : 'bg-amber-500'
              }`}></span>
              {selectedCall.status === 'OPEN' ? 'Activa' : selectedCall.status === 'CLOSED' ? 'Cerrada' : 'Borrador'}
            </span>
          )}
        </div>
      </div>

      {/* Barra móvil con botón de menú (solo sm) */}
      <div className="border-b border-slate-200/60 bg-white/50 backdrop-blur-sm px-4 py-3 md:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Menu className="w-4 h-4" />
            Menú
          </button>
          <div className="text-sm font-medium text-slate-500">Panel Admin</div>
        </div>
      </div>

      {/* Layout principal */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 md:grid-cols-[16rem_1fr]">
        {/* SideNav fijo en ≥ md */}
        <SideNav />

        {/* Contenido enrutado */}
        <main className="min-h-[calc(100vh-8rem)] p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Drawer móvil para SideNav */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* backdrop con blur */}
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* panel deslizante */}
          <div className="absolute left-0 top-0 h-full w-[85%] max-w-[20rem] bg-white shadow-2xl shadow-slate-900/20 animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="text-sm font-semibold text-slate-700">Navegación</div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Contenido del SideNav dentro del panel móvil */}
            <div className="h-[calc(100%-57px)] overflow-y-auto">
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
