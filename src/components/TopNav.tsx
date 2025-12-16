import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../lib/auth'
import { LogOut } from 'lucide-react'

/**
 * Barra superior de navegación con branding y botón de logout.
 * Sticky en top con backdrop blur.
 * Branding: logo F en círculo azul + nombre completo (desktop) o FCG (mobile).
 * Botón logout con confirmación antes de cerrar sesión.
 * 
 * @example
 * <TopNav /> // En layout principal
 */
export default function TopNav() {
  const navigate = useNavigate()

  /**
   * Maneja logout con confirmación.
   * Limpia authService y redirige a /auth/login.
   */
  const handleLogout = () => {
    if (confirm('¿Cerrar sesión?')) {
      authService.logout()
      navigate('/auth/login')
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4">
        {/* Branding - Responsive */}
        <Link to="/admin" className="flex items-center gap-2 group">
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

        <div className="ml-auto flex items-center gap-2">
          {/* Botón cerrar sesión */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden lg:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}
