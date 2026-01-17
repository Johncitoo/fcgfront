import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../lib/auth'
import { LogOut, Key, User, Sparkles } from 'lucide-react'
import { apiPost } from '../lib/api'
import { useState } from 'react'
import UserProfileModal from './UserProfileModal'

/**
 * Barra superior de navegación con branding y botón de logout.
 * Diseño moderno con gradientes y efectos de hover elegantes.
 */
export default function TopNav() {
  const navigate = useNavigate()
  const [showPasswordChangeSuccess, setShowPasswordChangeSuccess] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const user = authService.getCurrentUser()

  const handleLogout = () => {
    if (confirm('¿Cerrar sesión?')) {
      authService.logout()
      navigate('/auth/login')
    }
  }

  const handleRequestPasswordChange = async () => {
    try {
      await apiPost('/auth/password-change/request', {})
      setShowPasswordChangeSuccess(true)
      setTimeout(() => setShowPasswordChangeSuccess(false), 5000)
    } catch (err) {
      console.error('Error al solicitar cambio de contraseña:', err)
      alert('Error al solicitar cambio de contraseña')
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 lg:px-6">
        {/* Branding - Logo moderno */}
        <Link to="/admin" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity"></div>
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/30 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-sky-500/40">
              <Sparkles className="h-5 w-5 absolute -top-1 -right-1 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-xl font-bold tracking-tight">F</span>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="text-base font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Fundación Carmen Goudie
            </div>
            <div className="text-xs font-medium text-slate-400">Sistema de Gestión de Becas</div>
          </div>
          <span className="md:hidden text-base font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">FCG</span>
        </Link>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          {/* Información del usuario logeado */}
          {user && (
            <button
              onClick={() => setShowProfileModal(true)}
              className="hidden md:flex items-center gap-3 border-r border-slate-200/80 pr-4 hover:pr-5 transition-all group"
            >
              <div className="flex flex-col items-end text-right">
                <span className="text-sm font-semibold text-slate-700 truncate max-w-[150px] lg:max-w-none group-hover:text-sky-600 transition-colors">
                  {user.fullName || user.email}
                </span>
                <span className="text-[11px] font-medium text-slate-400 capitalize">
                  {user.role === 'ADMIN' ? 'Administrador' : user.role === 'REVIEWER' ? 'Revisor' : 'Usuario'}
                </span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 group-hover:from-sky-100 group-hover:to-sky-200 group-hover:text-sky-600 transition-all shadow-sm">
                <User className="h-4 w-4" />
              </div>
            </button>
          )}

          {/* Toast de éxito */}
          {showPasswordChangeSuccess && (
            <div className="fixed top-20 right-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-xl shadow-emerald-500/25 z-50 animate-fade-in max-w-xs border border-emerald-400/30">
              <p className="text-sm font-semibold">✓ Email enviado</p>
              <p className="text-xs mt-0.5 text-emerald-100">Revisa tu bandeja de entrada</p>
            </div>
          )}

          {/* Botón cambiar contraseña */}
          <button
            onClick={handleRequestPasswordChange}
            className="flex items-center gap-2 rounded-xl px-3 md:px-4 py-2.5 text-sm font-medium text-purple-600 bg-purple-50/50 hover:bg-purple-100 border border-purple-100 hover:border-purple-200 transition-all duration-200 hover:shadow-md hover:shadow-purple-100"
            title="Cambiar contraseña"
          >
            <Key className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Cambiar contraseña</span>
          </button>

          {/* Botón cerrar sesión */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl px-3 md:px-4 py-2.5 text-sm font-medium text-rose-600 bg-rose-50/50 hover:bg-rose-100 border border-rose-100 hover:border-rose-200 transition-all duration-200 hover:shadow-md hover:shadow-rose-100"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>

      {/* Modal de perfil */}
      {showProfileModal && user?.id && (
        <UserProfileModal userId={user.id} onClose={() => setShowProfileModal(false)} />
      )}
    </header>
  )
}
