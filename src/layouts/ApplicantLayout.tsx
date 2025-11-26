import { Outlet, Link } from 'react-router-dom'
import { authService } from '../lib/auth'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'

export default function ApplicantLayout() {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  const handleLogout = () => {
    authService.logout()
    navigate('/portal', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navbar simple para postulantes */}
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/applicant" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-md">
              <span className="text-xl font-bold">F</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">
                Fundación Carmen Goudie
              </h1>
              <p className="text-xs text-slate-500">Portal de Postulantes</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">
                {user?.fullName || user?.email}
              </p>
              <p className="text-xs text-slate-500">Postulante</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Salir
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
