import { useNavigate } from 'react-router-dom'
import { authService } from '../../lib/auth'

export default function NotFoundPage() {
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
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          {/* Ilustración */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-sky-200">
                <svg className="h-16 w-16 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="absolute -right-2 -top-2 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-md">
                <span className="text-lg font-bold">404</span>
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold text-slate-800">
              ¡Ups! No hay nada que ver aquí
            </h1>
            
            <p className="text-slate-600">
              La página que estás buscando no existe o fue movida a otro lugar.
              {!user && ' Es posible que necesites iniciar sesión para acceder a este contenido.'}
            </p>

            {/* Botones de acción */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
              <button
                onClick={handleGoHome}
                className="flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {user ? 'Ir al inicio' : 'Iniciar sesión'}
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

            {/* Sugerencias */}
            {user && (
              <div className="mt-6 rounded-lg bg-slate-50 p-4 text-left">
                <p className="mb-2 text-sm font-medium text-slate-700">
                  ¿Necesitas ayuda?
                </p>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-sky-600">•</span>
                    Verifica que la URL esté escrita correctamente
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-sky-600">•</span>
                    Es posible que no tengas permisos para acceder a esta página
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 text-sky-600">•</span>
                    Intenta navegar desde el menú principal
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Footer con código de error */}
          <div className="mt-6 border-t pt-4 text-center">
            <p className="text-xs text-slate-400">
              Código de error: <span className="font-mono font-medium text-slate-500">404 NOT_FOUND</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
