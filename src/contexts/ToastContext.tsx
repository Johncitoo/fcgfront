import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showInfo: (message: string) => void
  showWarning: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

/**
 * Hook para usar el sistema de notificaciones toast.
 * 
 * @returns Métodos para mostrar notificaciones: showToast, showSuccess, showError, showInfo, showWarning
 * @throws Error si se usa fuera de ToastProvider
 * 
 * @example
 * const { showSuccess, showError } = useToast();
 * showSuccess('¡Guardado!');
 * showError('Error al guardar');
 */
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider')
  }
  return context
}

/**
 * Provider de sistema de notificaciones toast.
 * Muestra mensajes temporales en la esquina superior derecha con auto-dismiss a los 5 segundos.
 * Soporta 4 tipos: success (verde), error (rojo), warning (amarillo), info (azul).
 * 
 * @example
 * // En App.tsx
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 * 
 * // En cualquier componente
 * const { showSuccess } = useToast();
 * showSuccess('¡Guardado exitosamente!');
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { id, message, type }])
    
    // Auto-remove después de 5 segundos
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast])
  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast])
  const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast])
  const showWarning = useCallback((message: string) => showToast(message, 'warning'), [showToast])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-600" />
      case 'info': return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getStyles = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-900'
      case 'error': return 'bg-red-50 border-red-200 text-red-900'
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-900'
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-900'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarning }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto
              flex items-start gap-3 p-4 rounded-lg border shadow-lg
              min-w-[320px] max-w-[420px]
              animate-in slide-in-from-right duration-300
              ${getStyles(toast.type)}
            `}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(toast.type)}
            </div>
            <p className="flex-1 text-sm font-medium leading-relaxed">
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
