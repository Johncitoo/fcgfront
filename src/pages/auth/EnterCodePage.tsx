import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type UserRole = 'ADMIN' | 'REVIEWER' | 'APPLICANT'

interface ConsumeInviteResponseWithSession {
  access_token: string
  refresh_token: string
  user: {
    id: string
    email: string
    role: UserRole
  }
}

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
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold">Ingresar con código</h1>
          <p className="text-slate-600 mt-1">
            Ingresa el <span className="font-medium">correo</span> con el que fuiste invitado y tu{' '}
            <span className="font-medium">código único</span>.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="card"
          aria-describedby={error ? 'code-error' : undefined}
        >
          <div className="card-body space-y-4">
            {error && (
              <div
                id="code-error"
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            {okMsg && (
              <div
                role="status"
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              >
                {okMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium">
                Correo invitado
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                placeholder="ej: alumno@colegio.cl"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="code" className="block text-sm font-medium">
                Código de invitación
              </label>
              <input
                id="code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
                className="w-full rounded-md border px-3 py-2 text-sm uppercase tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                placeholder="Ej: FCG-ABC123"
              />
              <p className="text-xs text-slate-500">
                El código viene en el correo que te envió la Fundación.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {loading ? 'Validando…' : 'Continuar'}
            </button>

            <div className="text-center text-sm text-slate-600">
              <span>¿Ya tienes usuario y contraseña? </span>
              <Link to="/login" className="text-sky-700 hover:underline">
                Inicia sesión
              </Link>
            </div>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Fundación Carmen Goudie
        </p>
      </div>
    </div>
  )
}

function isSessionPayload(data: unknown): data is ConsumeInviteResponseWithSession {
  if (!data || typeof data !== 'object') return false
  const d = data as any
  return (
    typeof d.access_token === 'string' &&
    typeof d.refresh_token === 'string' &&
    d.user &&
    typeof d.user.id === 'string' &&
    typeof d.user.email === 'string' &&
    typeof d.user.role === 'string'
  )
}

async function safeError(res: Response) {
  try {
    const data = await res.json()
    return data?.message || data?.error || res.statusText
  } catch {
    return res.statusText
  }
}
