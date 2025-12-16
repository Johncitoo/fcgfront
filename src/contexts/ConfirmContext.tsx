import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface ConfirmOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

/**
 * Hook para usar el sistema de diálogos de confirmación.
 * 
 * @returns Método confirm que retorna Promise<boolean>
 * @throws Error si se usa fuera de ConfirmProvider
 * 
 * @example
 * const { confirm } = useConfirm();
 * const isConfirmed = await confirm({
 *   title: 'Eliminar usuario',
 *   message: '¿Está seguro? Esta acción no se puede deshacer.',
 *   type: 'danger'
 * });
 * if (isConfirmed) {
 *   // Proceder con eliminación
 * }
 */
export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm debe usarse dentro de ConfirmProvider')
  }
  return context
}

/**
 * Provider de diálogos de confirmación modales.
 * Muestra modal con overlay que requiere confirmación del usuario.
 * Soporta 3 estilos: danger (rojo), warning (amarillo), info (azul).
 * Retorna Promise<boolean> que resuelve true si confirma, false si cancela.
 * 
 * @example
 * <ConfirmProvider>
 *   <App />
 * </ConfirmProvider>
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setIsOpen(true)
    
    return new Promise((resolve) => {
      setResolver(() => resolve)
    })
  }, [])

  const handleConfirm = () => {
    setIsOpen(false)
    resolver?.(true)
    setResolver(null)
  }

  const handleCancel = () => {
    setIsOpen(false)
    resolver?.(false)
    setResolver(null)
  }

  const getTypeStyles = () => {
    switch (options?.type) {
      case 'danger':
        return {
          icon: 'text-red-600',
          bg: 'bg-red-50',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        }
      case 'warning':
        return {
          icon: 'text-amber-600',
          bg: 'bg-amber-50',
          button: 'bg-amber-600 hover:bg-amber-700 text-white'
        }
      default:
        return {
          icon: 'text-blue-600',
          bg: 'bg-blue-50',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      
      {/* Modal de Confirmación */}
      {isOpen && options && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancel}
          />
          
          {/* Dialog */}
          <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              {/* Icon + Title */}
              <div className="flex items-start gap-4 mb-4">
                <div className={`flex-shrink-0 p-3 rounded-full ${styles.bg}`}>
                  <AlertCircle className={`w-6 h-6 ${styles.icon}`} />
                </div>
                <div className="flex-1">
                  {options.title && (
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {options.title}
                    </h3>
                  )}
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {options.message}
                  </p>
                </div>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {options.cancelText || 'Cancelar'}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${styles.button}`}
                >
                  {options.confirmText || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

/**
 * Hook para mostrar diálogos de confirmación.
 * Debe usarse dentro de ConfirmProvider.

