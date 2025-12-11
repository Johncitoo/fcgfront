import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

export default function EnterCodePage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOkMsg(null)
    setLoading(true)

    try {
      // Usar el nuevo endpoint de validación de invitación
      const res = await fetch(`${API_BASE}/onboarding/validate-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        const msg = errorData.message || 'Código inválido o expirado'
        throw new Error(msg)
      }

      const data = await res.json()

      // El backend devuelve: { success, email, passwordToken, message, applicationId, userId, userName }
      if (data.success && data.passwordToken) {
        // Redirigir a definir contraseña con el token
        navigate(`/auth/set-password?token=${encodeURIComponent(data.passwordToken)}&email=${encodeURIComponent(data.email)}`, { replace: true })
        return
      }

      // Si por alguna razón no hay token pero fue exitoso
      setOkMsg(data.message || 'Código validado correctamente.')
    } catch (err: any) {
      setError(err.message ?? 'Error al validar el código')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 grid place-items-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 text-white text-2xl font-bold shadow-lg">
              F
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Ingresar con código</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Ingresa el <span className="font-semibold text-slate-900 dark:text-slate-100">correo</span> con el que fuiste invitado y tu{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">código único</span>.
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={onSubmit}
          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg p-6"
          aria-describedby={error ? 'code-error' : undefined}
        >
          <div className="space-y-5">
            {error && (
              <div
                id="code-error"
                role="alert"
                className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300"
              >
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {okMsg && (
              <div
                role="status"
                className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
              >
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{okMsg}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Correo invitado
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent transition-all"
                placeholder="alumno@colegio.cl"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Código de invitación
              </label>
              <input
                id="code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 uppercase tracking-wide font-mono focus:ring-2 focus:ring-sky-500 dark:focus:ring-sky-400 focus:border-transparent transition-all"
                placeholder="FCG-ABC123"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                El código viene en el correo que te envió la Fundación.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-lg bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Validando…
                </span>
              ) : (
                'Continuar'
              )}
            </button>

            <div className="text-center text-sm text-slate-600 dark:text-slate-400">
              <span>¿Ya tienes usuario y contraseña? </span>
              <Link to="/login" className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline font-medium">
                Inicia sesión
              </Link>
            </div>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-600">
          © {new Date().getFullYear()} Fundación Carmen Goudie
        </p>
      </div>
    </div>
  )
}
