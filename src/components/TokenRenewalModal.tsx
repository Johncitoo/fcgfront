import { useEffect, useState } from 'react'
import { Button } from './ui/button'

interface TokenRenewalModalProps {
  isOpen: boolean
  minutesLeft: number
  onRenew: () => void
  onLogout: () => void
}

export function TokenRenewalModal({ isOpen, minutesLeft, onRenew, onLogout }: TokenRenewalModalProps) {
  const [timeLeft, setTimeLeft] = useState(minutesLeft)

  useEffect(() => {
    if (!isOpen) return

    setTimeLeft(minutesLeft)

    // Actualizar el contador cada segundo
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 0.017)) // Aproximadamente 1 segundo en minutos
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, minutesLeft])

  if (!isOpen) return null

  const minutes = Math.floor(timeLeft)
  const seconds = Math.floor((timeLeft - minutes) * 60)

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-amber-200 bg-white shadow-2xl">
        {/* Header con icono de advertencia */}
        <div className="flex items-center gap-3 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-7 w-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Tu sesión está por expirar
            </h2>
            <p className="text-sm text-slate-600">
              Tiempo restante: <span className="font-mono font-bold text-amber-600">{minutes}:{seconds.toString().padStart(2, '0')}</span>
            </p>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          <p className="text-slate-700">
            Por tu seguridad, tu sesión expirará pronto. ¿Deseas mantener la sesión iniciada?
          </p>

          <div className="rounded-lg bg-sky-50 border border-sky-200 p-3">
            <p className="text-sm text-sky-800">
              <strong>Tip:</strong> Si mantienes la sesión activa, tu trabajo no se perderá y podrás continuar donde lo dejaste.
            </p>
          </div>

          {/* Botones */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              onClick={onRenew}
              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-sm h-11"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mantener sesión activa
            </Button>
            
            <Button
              onClick={onLogout}
              variant="outline"
              className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50 font-medium h-11"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesión
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-slate-50 px-6 py-3">
          <p className="text-xs text-slate-500 text-center">
            Esta medida de seguridad protege tu información y la de los postulantes
          </p>
        </div>
      </div>
    </div>
  )
}
