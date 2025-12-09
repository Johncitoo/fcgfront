import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../lib/auth'
import { LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export default function TopNav() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const handleLogout = () => {
    if (confirm('¿Cerrar sesión?')) {
      authService.logout()
      navigate('/auth/login')
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-sm dark:border-slate-700">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4">
        {/* Branding - Responsive */}
        <Link to="/admin" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-md transition-transform group-hover:scale-105">
            <span className="text-lg font-bold">F</span>
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Fundación Carmen Goudie
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Sistema de Becas</div>
          </div>
          <span className="md:hidden text-sm font-bold text-slate-800 dark:text-slate-100">FCG</span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {/* Botón de tema */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </button>

          {/* Botón cerrar sesión */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
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
