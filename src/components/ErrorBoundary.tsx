import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  isChunkError: boolean
  countdown: number
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { 
    hasError: false, 
    error: null, 
    isChunkError: false,
    countdown: 3
  }
  
  countdownInterval: number | null = null

  static getDerivedStateFromError(error: Error) {
    // Detectar errores de importación dinámica/chunks
    const isChunkError = 
      error.message?.includes('dynamically imported module') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('ChunkLoadError') ||
      error.name === 'ChunkLoadError'

    return { 
      hasError: true, 
      error,
      isChunkError 
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, info)
    
    // Si es error de chunk, iniciar cuenta regresiva para recargar
    if (this.state.isChunkError) {
      this.countdownInterval = window.setInterval(() => {
        this.setState((prevState) => {
          const newCountdown = prevState.countdown - 1
          if (newCountdown <= 0) {
            if (this.countdownInterval) clearInterval(this.countdownInterval)
            window.location.reload()
            return null
          }
          return { 
            ...prevState,
            countdown: newCountdown 
          }
        })
      }, 1000)
    }
  }

  componentWillUnmount() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval)
    }
  }

  handleReload = () => {
    if (this.countdownInterval) clearInterval(this.countdownInterval)
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
              <div className="flex justify-center mb-4">
                <RefreshCw className="w-16 h-16 text-sky-600 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-3">
                Nueva versión disponible
              </h1>
              <p className="text-slate-600 mb-4">
                La aplicación se ha actualizado. Recargando en <strong className="text-sky-600 text-xl">{this.state.countdown}</strong> segundo{this.state.countdown !== 1 ? 's' : ''}...
              </p>
              <button
                onClick={this.handleReload}
                className="w-full bg-sky-600 text-white px-6 py-3 rounded-lg hover:bg-sky-700 transition-colors font-medium inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Recargar ahora
              </button>
              <p className="text-xs text-slate-400 mt-4">
                Si el problema persiste, limpia el caché del navegador (Ctrl+Shift+R)
              </p>
            </div>
          </div>
        )
      }

      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-slate-100 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-8">
            <div className="flex items-center gap-4 mb-6">
              <AlertCircle className="w-12 h-12 text-rose-600 flex-shrink-0" />
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  ¡Ups! Algo salió mal
                </h1>
                <p className="text-slate-600 text-sm">
                  Ha ocurrido un error inesperado
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                <h2 className="text-sm font-semibold text-slate-700 mb-2">
                  Detalles del error:
                </h2>
                <code className="text-xs text-rose-700 block overflow-x-auto">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-sky-600 text-white px-6 py-3 rounded-lg hover:bg-sky-700 transition-colors font-medium"
              >
                Recargar página
              </button>
              <button
                onClick={() => window.history.back()}
                className="flex-1 bg-slate-200 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                Volver
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-6 text-center">
              Si el problema persiste, contacta al administrador
            </p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
