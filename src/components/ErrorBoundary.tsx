import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  // Nota: prefijo "_" para evitar TS6133 (noUnusedLocals)
  componentDidCatch(_error: unknown, _info: ErrorInfo) {
    // Puedes loguear a un servicio externo si quieres
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen grid place-items-center p-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h1 className="text-lg font-semibold">Ha ocurrido un error</h1>
              <p className="mt-2 text-sm text-slate-600">
                Recarga la página o vuelve más tarde.
              </p>
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}
