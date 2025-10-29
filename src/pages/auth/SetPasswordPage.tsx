import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiPost } from '../../lib/api'
import { login, setAuth } from '../../lib/auth'
import type { UserSession, AuthResponse } from '../../lib/auth'

/**
 * Escenarios soportados:
 * 1) Activación inicial: llega aquí desde "Usar código" o desde un enlace del correo.
 *    - Puede venir con ?email=... y opcionalmente ?token=... (si tu backend lo usa).
 *    - POST /auth/set-password { email, password, token? }  → 200 OK
 *    - Opcional: backend puede devolver AuthResponse para iniciar sesión directo.
 *
 * 2) Cambio de contraseña con sesión activa (no implementado aquí).
 *
 * Notas:
 * - Si el backend NO devuelve tokens al setear, intentamos iniciar sesión automáticamente
 *   con las credenciales recién definidas.
 */

export default function SetPasswordPage() {
  const navigate = useNavigate()
  const [sp] = useSearchParams()

  const initialEmail = sp.get('email') ?? ''
  const token = sp.get('token') ?? '' // opcional, según implementación backend

  const [email, setEmail] = useState(initialEmail)
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPwd, setShowPwd] = useState(false)
  const [showPwd2, setShowPwd2] = useState(false)

  const strength = useMemo(() => scorePassword(pwd), [pwd])
  const match = pwd.length > 0 && pwd === pwd2

  useEffect(() => {
    if (!initialEmail && email) return
    if (initialEmail && !email) setEmail(initialEmail)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEmail])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email.trim()) {
      setError('El correo es obligatorio')
      return
    }
    if (pwd.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (!match) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      // 1) Intento de seteo/activación con el backend
      const resp = await apiPost<AuthResponse | { message?: string }>(
        '/auth/set-password',
        { email: email.trim(), password: pwd, token: token || undefined },
      )

      // 2) Si el backend devuelve tokens, iniciamos sesión localmente
      if (isAuthResponse(resp)) {
        setAuth(resp)
        afterLogin(resp.user)
        return
      }

      // 3) Si no devolvió tokens, intentamos login con las credenciales recién definidas
      try {
        const user = (await login(email.trim(), pwd)) as UserSession
        afterLogin(user)
        return
      } catch {
        // Si el login falla (por política del backend), solo mostramos éxito
        setSuccess(
          'Contraseña definida correctamente. Ya puedes iniciar sesión con tus credenciales.',
        )
      }
    } catch (e: any) {
      setError(e?.message ?? 'No fue posible definir la contraseña')
    } finally {
      setLoading(false)
    }
  }

  function afterLogin(user: UserSession) {
    setSuccess('Tu contraseña se definió y tu sesión ha sido iniciada.')
    setTimeout(() => {
      if (user.role === 'ADMIN' || user.role === 'REVIEWER') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/me', { replace: true }) // ApplicantHome (lo crearemos luego)
      }
    }, 350)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 p-4 md:grid-cols-2 md:gap-10 md:p-6">
        {/* Columna contextual */}
        <section className="order-2 md:order-1">
          <div className="mx-auto w-full max-w-md md:max-w-none">
            <header className="mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white">
                  F
                </div>
                <div>
                  <h1 className="text-lg font-semibold leading-tight">
                    Fundación Carmen Goudie — Becas
                  </h1>
                  <p className="text-xs text-slate-600">Activar cuenta / Definir contraseña</p>
                </div>
              </div>
            </header>

            <div className="card">
              <div className="card-body space-y-3">
                <h2 className="text-base font-semibold">¿Cuándo usar esta página?</h2>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                  <li>
                    Si recibiste un correo de invitación y necesitas <strong>crear tu clave</strong>.
                  </li>
                  <li>
                    Si validaste tu <em>código de invitación</em> y quieres continuar con tu acceso.
                  </li>
                </ul>
                <p className="text-xs text-slate-600">
                  Recomendación: usa una contraseña única, con mayúsculas, minúsculas, números y
                  símbolos.
                </p>

                <div className="pt-1">
                  <Link to="/login" className="text-sm text-sky-700 hover:underline">
                    ← Volver al login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Columna formulario */}
        <section className="order-1 md:order-2">
          <div className="mx-auto w-full max-w-md">
            <div className="card">
              <div className="card-body">
                <h2 className="mb-1 text-base font-semibold">Definir contraseña</h2>
                <p className="mb-4 text-sm text-slate-600">
                  Completa tu correo y elige una nueva contraseña para activar tu acceso.
                </p>

                {error && (
                  <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {success}
                  </div>
                )}

                <form onSubmit={onSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Correo *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input"
                      placeholder="tu@correo.cl"
                    />
                  </div>

                  {/* Token opcional si lo traes por query o lo pegan manualmente */}
                  {token ? (
                    <input type="hidden" value={token} readOnly />
                  ) : (
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Token (si aplica)</label>
                      <input
                        type="text"
                        placeholder="Pega el token del correo (si tu enlace no funciona)"
                        className="input"
                        onChange={() => {/* solo informativo; usamos el de query si existe */}}
                      />
                      <p className="text-xs text-slate-500">
                        Si entraste desde un enlace con token, no necesitas llenar este campo.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Nueva contraseña *</label>
                    <div className="flex">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        required
                        value={pwd}
                        onChange={(e) => setPwd(e.target.value)}
                        className="input flex-1 rounded-r-none"
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => !s)}
                        className="rounded-r-md border border-l-0 px-3 text-sm hover:bg-slate-50"
                        aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        title={showPwd ? 'Ocultar' : 'Mostrar'}
                      >
                        {showPwd ? 'Ocultar' : 'Ver'}
                      </button>
                    </div>

                    {/* Indicador de calidad */}
                    <PasswordMeter score={strength.score} label={strength.label} />
                    <p className="text-xs text-slate-500">
                      Mínimo 8 caracteres. Ideal: mezcla letras, números y símbolos.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Repite la contraseña *</label>
                    <div className="flex">
                      <input
                        type={showPwd2 ? 'text' : 'password'}
                        required
                        value={pwd2}
                        onChange={(e) => setPwd2(e.target.value)}
                        className="input flex-1 rounded-r-none"
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd2((s) => !s)}
                        className="rounded-r-md border border-l-0 px-3 text-sm hover:bg-slate-50"
                        aria-label={showPwd2 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        title={showPwd2 ? 'Ocultar' : 'Mostrar'}
                      >
                        {showPwd2 ? 'Ocultar' : 'Ver'}
                      </button>
                    </div>
                    {!match && pwd2.length > 0 && (
                      <p className="text-xs text-rose-700">Las contraseñas no coinciden.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? 'Guardando…' : 'Definir contraseña'}
                  </button>
                </form>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Link to="/invite" className="btn w-full">
                    Validar código de invitación
                  </Link>
                  <Link to="/login" className="btn w-full">
                    Ir al login
                  </Link>
                </div>

                <p className="mt-3 text-center text-xs text-slate-500">
                  Si no recibiste correo, revisa la carpeta de spam o consulta a tu encargado/a.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/* ==================== utilidades ==================== */

function isAuthResponse(x: any): x is AuthResponse {
  return x && typeof x === 'object' && 'access_token' in x && 'refresh_token' in x && 'user' in x
}

function scorePassword(p: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0
  if (!p) return { score: 0, label: 'Muy débil' }
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte']
  return { score: Math.min(score, 4) as 0 | 1 | 2 | 3 | 4, label: labels[Math.min(score, 4)] }
}

function PasswordMeter({ score, label }: { score: 0 | 1 | 2 | 3 | 4; label: string }) {
  const steps = 4
  return (
    <div>
      <div className="mb-1 flex gap-1">
        {Array.from({ length: steps }).map((_, i) => {
          const active = i < score
          const cls =
            'h-1.5 flex-1 rounded ' +
            (active
              ? i >= 3
                ? 'bg-emerald-500'
                : i >= 2
                ? 'bg-amber-500'
                : 'bg-sky-500'
              : 'bg-slate-200')
          return <span key={i} className={cls} />
        })}
      </div>
      <div className="text-xs text-slate-600">{label}</div>
    </div>
  )
}
