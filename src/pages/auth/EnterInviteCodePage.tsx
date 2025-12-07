import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiPost } from '../../lib/api'
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'

interface ValidateResponse {
  success: boolean
  email: string
  passwordToken: string
  tokenExpiresIn: number
  message: string
  userId: string
  userName: string
}

export default function EnterInviteCodePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Step control
  const [step, setStep] = useState<'enter-code' | 'set-password'>('enter-code')
  
  // Step 1: Validar código
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Step 2: Datos validados
  const [validatedData, setValidatedData] = useState<ValidateResponse | null>(null)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showPwd2, setShowPwd2] = useState(false)
  const [loadingPwd, setLoadingPwd] = useState(false)
  const [errorPwd, setErrorPwd] = useState<string | null>(null)

  // Password strength
  const strength = useMemo(() => scorePassword(password), [password])
  const match = password.length > 0 && password === password2

  async function onSubmitCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await apiPost<ValidateResponse>('/onboarding/validate-invite', {
        email: email.trim(),
        code: code.trim(),
      })
      
      setValidatedData(res)
      setStep('set-password')
    } catch (e: any) {
      setError(e?.message ?? 'No fue posible validar el código')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault()
    setErrorPwd(null)

    if (password.length < 8) {
      setErrorPwd('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (!match) {
      setErrorPwd('Las contraseñas no coinciden')
      return
    }
    if (!validatedData?.passwordToken) {
      setErrorPwd('Token no válido. Vuelve a validar el código.')
      return
    }

    setLoadingPwd(true)
    try {
      await apiPost('/onboarding/set-password', {
        token: validatedData.passwordToken,
        password: password,
      })

      // Redirigir al login para que inicie sesión manualmente
      navigate('/auth/login?fromSetPassword=true&email=' + encodeURIComponent(validatedData.email))
    } catch (e: any) {
      setErrorPwd(e?.message ?? 'No fue posible establecer la contraseña')
    } finally {
      setLoadingPwd(false)
    }
  }

  if (step === 'set-password' && validatedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="card shadow-xl">
            <div className="card-body">
              {/* Success header */}
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">¡Código Validado!</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Bienvenido/a, <strong>{validatedData.userName}</strong>
                </p>
              </div>

              <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
                <p className="text-sm text-sky-900">
                  Tu código ha sido verificado. Ahora crea tu contraseña para acceder al portal de postulación.
                </p>
              </div>

              {/* Email confirmado */}
              <div className="mb-4 flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-2">
                <span className="text-sm text-slate-600">📧 Email:</span>
                <span className="text-sm font-medium text-slate-900">{validatedData.email}</span>
              </div>

              {errorPwd && (
                <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {errorPwd}
                </div>
              )}

              <form onSubmit={onSubmitPassword} className="space-y-4">
                {/* Contraseña */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Contraseña Nueva *</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pr-10"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {password && <PasswordStrength score={strength} />}
                </div>

                {/* Repetir contraseña */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Repetir Contraseña *</label>
                  <div className="relative">
                    <input
                      type={showPwd2 ? 'text' : 'password'}
                      required
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      className="input pr-10"
                      placeholder="Repite la contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd2(!showPwd2)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPwd2 ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {password2 && (
                    <div className="flex items-center gap-1 text-xs">
                      {match ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-600">Las contraseñas coinciden</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-rose-600" />
                          <span className="text-rose-600">Las contraseñas no coinciden</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loadingPwd || !match} className="btn-primary w-full">
                  {loadingPwd ? 'Guardando…' : 'Crear contraseña y continuar →'}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-slate-500">
                Después de crear tu contraseña, deberás iniciar sesión para acceder al portal.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 p-4 md:grid-cols-2 md:gap-10 md:p-6">
        {/* Contexto */}
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
                  <p className="text-xs text-slate-600">Validar código de invitación</p>
                </div>
              </div>
            </header>

            <div className="card">
              <div className="card-body space-y-3">
                <h2 className="text-base font-semibold">¿Dónde encuentro el código?</h2>
                <p className="text-sm text-slate-600">
                  El código fue enviado por tu establecimiento educacional o por la Fundación a tu
                  correo personal. Si no lo tienes, solicita asistencia a tu encargado/a.
                </p>

                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                  <li>El código es único y está asociado a tu convocatoria.</li>
                  <li>
                    Tras validarlo, crearás tu contraseña inmediatamente.
                  </li>
                  <li>Puedes entrar y salir cuando quieras con tu email y contraseña.</li>
                </ul>

                <div className="pt-1">
                  <Link to="/auth/login" className="text-sm text-sky-700 hover:underline">
                    ← Volver a iniciar sesión
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Formulario */}
        <section className="order-1 md:order-2">
          <div className="mx-auto w-full max-w-md">
            <div className="card">
              <div className="card-body">
                <h2 className="mb-1 text-base font-semibold">Ingresar código de invitación</h2>
                <p className="mb-4 text-sm text-slate-600">
                  Escribe tu correo y el código recibido para activar tu postulación.
                </p>

                {error && (
                  <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <form onSubmit={onSubmitCode} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Correo personal *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input"
                      placeholder="tu@correo.cl"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Código de invitación *</label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="input"
                      placeholder="Ej: FCG-AB12-CD34"
                    />
                    <p className="text-xs text-slate-500">
                      Respeta guiones y mayúsculas/minúsculas tal como aparece en el correo.
                    </p>
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Validando…' : 'Validar código →'}
                  </button>
                </form>

                <div className="mt-4">
                  <Link to="/auth/login" className="btn w-full">
                    Volver al login
                  </Link>
                </div>

                <p className="mt-3 text-center text-xs text-slate-500">
                  Si el código no funciona, confirma tu correo y convocatoria con tu establecimiento.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

// ===== Utilities =====

function scorePassword(pwd: string): number {
  if (!pwd) return 0
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return Math.min(score, 5)
}

function PasswordStrength({ score }: { score: number }) {
  const labels = ['Muy débil', 'Débil', 'Media', 'Fuerte', 'Muy fuerte']
  const colors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500']
  
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < score ? colors[score - 1] : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-600">Fortaleza: {labels[score - 1] || 'N/A'}</p>
    </div>
  )
}
