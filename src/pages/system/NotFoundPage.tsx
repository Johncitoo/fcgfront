import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-xl">
        <div className="card border-slate-200">
          <div className="card-body space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                404
              </span>
              <h1 className="text-xl font-semibold">Página no encontrada</h1>
            </div>

            <p className="text-sm text-slate-600">
              La página que intentas abrir no existe o fue movida. Revisa la URL o vuelve al inicio.
            </p>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/"
                className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Ir al inicio
              </Link>
              <button
                onClick={() => window.history.length > 1 && window.history.back()}
                className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Volver
              </button>
            </div>

            <div className="pt-2">
              <small className="text-xs text-slate-500">
                Código de error: <span className="font-mono">404 NOT_FOUND</span>
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
