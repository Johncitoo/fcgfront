import { Outlet, Link } from 'react-router-dom'
import { authService } from '../lib/auth'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'

export default function ApplicantLayout() {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  const handleLogout = () => {
    authService.logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navbar responsive para postulantes */}
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          {/* Logo y título - Responsive */}
          <Link to="/applicant" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-md transition-transform group-hover:scale-105">
              <span className="text-xl font-bold">F</span>
            </div>
            <div className="hidden md:block">
              <h1 className="text-base font-bold text-slate-800 leading-tight">
                Fundación Carmen Goudie
              </h1>
              <p className="text-xs text-slate-500">Portal de Postulantes</p>
            </div>
            <div className="md:hidden">
              <h1 className="text-sm font-bold text-slate-800">FCG Becas</h1>
            </div>
          </Link>

          {/* User info y logout - Responsive */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-700 truncate max-w-[150px] lg:max-w-none">
                {user?.fullName || user?.email}
              </p>
              <p className="text-xs text-slate-500">Postulante</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 active:scale-95"
              title={user?.fullName || user?.email || 'Cerrar sesión'}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 md:py-8">
        <Outlet />
      </main>
    </div>
  )
}
