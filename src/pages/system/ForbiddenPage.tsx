import { useNavigate } from 'react-router-dom'
import { authService } from '../../lib/auth'

export default function ForbiddenPage() {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  const handleGoHome = () => {
    if (user) {
      const homeRoute = authService.getHomeRouteByRole(user.role)
      navigate(homeRoute, { replace: true })
    } else {
      navigate('/auth/login', { replace: true })
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-rose-50 to-red-100 p-6">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 shadow-lg">
          {/* Ilustración */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-red-200">
                <svg className="h-16 w-16 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="absolute -right-2 -top-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 shadow-md">
                <span className="text-lg font-bold">403</span>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold text-slate-800">
              Acceso denegado
            </h1>
            
            <p className="text-slate-600">
              No tienes los permisos necesarios para acceder a esta página o realizar esta acción. 
              {user && ' Si crees que esto es un error, contacta con el administrador del sistema.'}
            </p>

            {/* Botones de acción */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
              <button
                onClick={handleGoHome}
                className="flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {user ? 'Volver al inicio' : 'Iniciar sesión'}
              </button>
              
              <button
                onClick={() => window.history.length > 1 ? window.history.back() : handleGoHome()}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver atrás
              </button>
            </div>

            {/* Información de ayuda */}
            {user && (
              <div className="mt-6 rounded-lg bg-rose-50 p-4 text-left">
                <p className="mb-2 text-sm font-medium text-rose-700">
                  ¿Por qué veo este mensaje?
                </p>
                <ul className="space-y-1 text-sm text-rose-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    Tu rol de usuario ({user.role}) no tiene acceso a este recurso
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    Puede que la página sea exclusiva para administradores
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    Si necesitas acceso, solicítalo a un administrador
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Footer con código de error */}
          <div className="mt-6 border-t pt-4 text-center">
            <p className="text-xs text-slate-400">
              Código de error: <span className="font-mono font-medium text-slate-500">403 FORBIDDEN</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
