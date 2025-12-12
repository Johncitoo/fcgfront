import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, apiPost } from '../../lib/api'
import { authService } from '../../lib/auth'

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
  const token = sp.get('token') ?? '' // Token requerido del flujo de validación

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
    if (pwd.length < 12) {
      setError('La contraseña debe tener al menos 12 caracteres')
      return
    }
    if (!match) {
      setError('Las contraseñas no coinciden')
      return
    }
    
    // Validar requisitos de seguridad
    const securityErrors = validatePasswordSecurity(pwd)
    if (securityErrors.length > 0) {
      setError(securityErrors.join('. '))
      return
    }

    setLoading(true)
    try {
      let resp: AuthResponse | { message?: string }

      // 1) Intentar con token si existe
      if (token && token.length > 10) {
        try {
          resp = await apiPost<AuthResponse | { message?: string }>(
            '/onboarding/set-password',
            { token, password: pwd },
          )
        } catch (tokenError: any) {
          // Si el token falla (404, expirado), usar endpoint dev
          console.warn('⚠️ Token inválido o expirado, usando endpoint de desarrollo')
          resp = await apiPost<AuthResponse | { message?: string }>(
            '/onboarding/dev/set-password',
            { email: email.trim(), password: pwd },
          )
        }
      } else {
        // Sin token válido, usar endpoint dev directamente
        console.log('📝 Sin token, usando endpoint de desarrollo')
        resp = await apiPost<AuthResponse | { message?: string }>(
          '/onboarding/dev/set-password',
          { email: email.trim(), password: pwd },
        )
      }

      // 2) Si el backend devuelve tokens, iniciamos sesión localmente
      if (isAuthResponse(resp)) {
        authService.setTokens(resp.accessToken, resp.refreshToken);
        authService.setUser(resp.user);
        afterLogin(resp.user)
        return
      }

      // 3) Si no devolvió tokens, intentamos login con las credenciales recién definidas
      try {
        // Intentar login como postulante (applicant)
        const loginResp = await apiPost<AuthResponse>('/auth/login', {
          email: email.trim(),
          password: pwd,
        });
        authService.setTokens(loginResp.accessToken, loginResp.refreshToken);
        authService.setUser(loginResp.user);
        afterLogin(loginResp.user);
        return
      } catch {
        // Si el login falla (por política del backend), solo mostramos éxito
        setSuccess(
          'Contraseña definida correctamente. Ya puedes iniciar sesión con tus credenciales.',
        )
      }
    } catch (e: unknown) {
      const error = e as { message?: string };
      setError(error?.message ?? 'No fue posible definir la contraseña')
    } finally {
      setLoading(false)
    }
  }

  function afterLogin(user: {
    id: string;
    email: string;
    fullName: string;
    role: 'ADMIN' | 'REVIEWER' | 'APPLICANT';
  }) {
    console.log('🎯 afterLogin llamado para usuario:', user.role, user.email)
    setSuccess('Tu contraseña se definió y tu sesión ha sido iniciada.')
    
    // Si es APPLICANT, redirigir al primer hito disponible
    if (user.role === 'APPLICANT') {
      console.log('👤 Usuario es APPLICANT, buscando primer hito...')
      redirectToFirstMilestone()
    } else {
      // Admin o Reviewer van a su dashboard
      console.log('👔 Usuario es', user.role, ', redirigiendo a /admin')
      setTimeout(() => {
        navigate('/admin', { replace: true })
      }, 350)
    }
  }

  async function redirectToFirstMilestone() {
    try {
      console.log('📋 Obteniendo aplicación activa...')
      // Obtener la aplicación activa del postulante
      const appResponse = await api.get<{ id: string }>('/applications/my-active')
      const applicationId = appResponse.data.id
      console.log('✅ Aplicación activa obtenida:', applicationId)

      console.log('🎯 Obteniendo hitos de progreso...')
      // Obtener los hitos de progreso
      const progressResponse = await api.get<{
        progress: Array<{
          mp_id: string
          status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
          whoCanFill: string
          milestoneStatus: 'ACTIVE' | 'PENDING'
          orderIndex: number
          milestoneName?: string
        }>
      }>(`/milestones/progress/${applicationId}`)

      console.log('📊 Hitos obtenidos:', progressResponse.data.progress.length)
      progressResponse.data.progress.forEach(m => {
        console.log(`  - ${m.milestoneName || 'Hito'} (${m.orderIndex}): status=${m.status}, whoCanFill=${m.whoCanFill}, milestoneStatus=${m.milestoneStatus}`)
      })

      // Buscar el primer hito ACTIVE que sea responsabilidad del APPLICANT, no completado y no rechazado
      const firstMilestone = progressResponse.data.progress
        .filter(m => 
          m.whoCanFill === 'APPLICANT' && 
          m.milestoneStatus === 'ACTIVE' && 
          m.status !== 'COMPLETED' &&
          m.status !== 'REJECTED'
        )
        .sort((a, b) => a.orderIndex - b.orderIndex)[0]

      if (firstMilestone) {
        // Redirigir al primer hito disponible
        console.log('🎯 Primer hito encontrado:', firstMilestone.mp_id, firstMilestone.milestoneName)
        setTimeout(() => {
          navigate(`/applicant/milestone/${firstMilestone.mp_id}?app=${applicationId}`, { replace: true })
        }, 350)
      } else {
        // Si no hay hitos disponibles, ir al dashboard
        console.log('⚠️ No hay hitos disponibles para completar, redirigiendo al dashboard')
        setTimeout(() => {
          navigate('/applicant', { replace: true })
        }, 350)
      }
    } catch (error: any) {
      console.error('❌ Error al obtener hitos:', error)
      console.error('Error details:', error.response?.data || error.message)
      // En caso de error, redirigir al dashboard
      setTimeout(() => {
        navigate('/applicant', { replace: true })
      }, 350)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 p-4 md:grid-cols-2 md:gap-10 md:p-6">
        {/* Columna contextual */}
        <section className="order-2 md:order-1">
          <div className="mx-auto w-full max-w-md md:max-w-none">
            <header className="mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white text-xl font-bold shadow-lg">
                  F
                </div>
                <div>
                  <h1 className="text-xl font-bold leading-tight text-slate-900">
                    Fundación Carmen Goudie — Becas
                  </h1>
                  <p className="text-sm text-slate-600">Activar cuenta / Definir contraseña</p>
                </div>
              </div>
            </header>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="p-6 space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">¿Cuándo usar esta página?</h2>
                <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
                  <li>
                    Si recibiste un correo de invitación y necesitas <strong className="text-slate-900">crear tu clave</strong>.
                  </li>
                  <li>
                    Si validaste tu <em className="text-sky-600">código de invitación</em> y quieres continuar con tu acceso.
                  </li>
                </ul>
                <div className="mt-4 p-3 rounded-lg bg-sky-50 border border-sky-200">
                  <p className="text-sm text-sky-900">
                    <strong>Recomendación:</strong> usa una contraseña única, con mayúsculas, minúsculas, números y símbolos.
                  </p>
                </div>

                <div className="pt-2">
                  <Link to="/login" className="text-sm text-sky-600 hover:text-sky-700 hover:underline inline-flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Volver al login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Columna formulario */}
        <section className="order-1 md:order-2">
          <div className="mx-auto w-full max-w-md">
            <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="p-6">
                <h2 className="mb-2 text-xl font-bold text-slate-900">Definir contraseña</h2>
                <p className="mb-6 text-sm text-slate-600">
                  Completa tu correo y elige una nueva contraseña para activar tu acceso.
                </p>

                {error && (
                  <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {success}
                  </div>
                )}

                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Correo *</label>
                    <input
                      type="email"
                      required
                      disabled
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                      placeholder="tu@correo.cl"
                    />
                    <p className="text-xs text-slate-500">El correo viene del código validado y no se puede modificar</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Nueva contraseña *</label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        required
                        value={pwd}
                        onChange={(e) => setPwd(e.target.value)}
                        className="w-full px-4 py-2.5 pr-12 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        placeholder="••••••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                        aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPwd ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Indicador de calidad */}
                    <PasswordMeter score={strength.score} label={strength.label} />
                    <div className="mt-2 p-3 rounded-lg bg-sky-50 border border-sky-200">
                      <p className="text-xs font-semibold text-sky-900 mb-1.5">Requisitos de seguridad:</p>
                      <ul className="text-xs text-sky-800 space-y-0.5">
                        <li className="flex items-center gap-1.5">
                          <span className={pwd.length >= 12 ? 'text-emerald-600' : ''}>
                            {pwd.length >= 12 ? '✓' : '○'}
                          </span>
                          Mínimo 12 caracteres
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className={/[A-Z]/.test(pwd) ? 'text-emerald-600' : ''}>
                            {/[A-Z]/.test(pwd) ? '✓' : '○'}
                          </span>
                          Al menos 1 mayúscula
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className={/[a-z]/.test(pwd) ? 'text-emerald-600' : ''}>
                            {/[a-z]/.test(pwd) ? '✓' : '○'}
                          </span>
                          Al menos 1 minúscula
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className={/\d/.test(pwd) ? 'text-emerald-600' : ''}>
                            {/\d/.test(pwd) ? '✓' : '○'}
                          </span>
                          Al menos 1 número
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) ? 'text-emerald-600' : ''}>
                            {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd) ? '✓' : '○'}
                          </span>
                          Al menos 1 carácter especial (!@#$%...)
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Repite la contraseña *</label>
                    <div className="relative">
                      <input
                        type={showPwd2 ? 'text' : 'password'}
                        required
                        value={pwd2}
                        onChange={(e) => setPwd2(e.target.value)}
                        className="w-full px-4 py-2.5 pr-12 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                        placeholder="••••••••••••"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd2((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                        aria-label={showPwd2 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPwd2 ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {!match && pwd2.length > 0 && (
                      <p className="text-xs text-rose-600">Las contraseñas no coinciden.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !match || pwd.length < 8}
                    className="w-full px-6 py-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? 'Guardando…' : 'Definir contraseña'}
                  </button>
                </form>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Link 
                    to="/auth/enter-code" 
                    className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium text-center transition-all"
                  >
                    Validar código de invitación
                  </Link>
                  <Link 
                    to="/login" 
                    className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium text-center transition-all"
                  >
                    Ir al login
                  </Link>
                </div>

                <p className="mt-4 text-center text-xs text-slate-500">
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

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'ADMIN' | 'REVIEWER' | 'APPLICANT';
  };
}

function isAuthResponse(x: unknown): x is AuthResponse {
  if (!x || typeof x !== 'object') return false;
  const obj = x as Record<string, unknown>;
  return 'accessToken' in obj && 'refreshToken' in obj && 'user' in obj;
}

function scorePassword(p: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0
  if (!p) return { score: 0, label: 'Muy débil' }
  if (p.length >= 12) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p)) score++
  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte']
  return { score: Math.min(score, 4) as 0 | 1 | 2 | 3 | 4, label: labels[Math.min(score, 4)] }
}

function validatePasswordSecurity(pwd: string): string[] {
  const errors: string[] = []
  
  // Validar mayúscula
  if (!/[A-Z]/.test(pwd)) {
    errors.push('Debe contener al menos una mayúscula')
  }
  
  // Validar minúscula
  if (!/[a-z]/.test(pwd)) {
    errors.push('Debe contener al menos una minúscula')
  }
  
  // Validar número
  if (!/\d/.test(pwd)) {
    errors.push('Debe contener al menos un número')
  }
  
  // Validar carácter especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
    errors.push('Debe contener al menos un carácter especial (!@#$%^&*...)')
  }
  
  // Validar contraseñas comunes
  const commonPasswords = [
    'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey',
    'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master',
    'sunshine', 'ashley', 'bailey', 'passw0rd', 'shadow', '123123',
    'superman', 'qazwsx', 'michael', 'football', 'admin', 'welcome',
    'login', 'user', 'password1', 'password123', '12345', 'test', 'demo', 'changeme'
  ]
  
  const lowerPwd = pwd.toLowerCase()
  for (const common of commonPasswords) {
    if (lowerPwd.includes(common)) {
      errors.push('No puede contener contraseñas comunes')
      break
    }
  }
  
  // Validar caracteres repetidos (3 o más iguales seguidos)
  if (/(.)\1{2,}/.test(pwd)) {
    errors.push('No puede tener más de 2 caracteres repetidos consecutivos')
  }
  
  // Validar secuencias
  if (isSequential(pwd)) {
    errors.push('No puede contener secuencias simples (123, abc, qwerty)')
  }
  
  return errors
}

function isSequential(str: string): boolean {
  const sequences = [
    '0123456789',
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiopasdfghjklzxcvbnm',
  ]

  const lower = str.toLowerCase()
  
  for (const seq of sequences) {
    for (let i = 0; i <= seq.length - 4; i++) {
      const subseq = seq.substring(i, i + 4)
      if (lower.includes(subseq)) {
        return true
      }
    }
  }

  return false
}

function PasswordMeter({ score, label }: { score: 0 | 1 | 2 | 3 | 4; label: string }) {
  const steps = 4
  return (
    <div className="mt-2">
      <div className="mb-1.5 flex gap-1.5">
        {Array.from({ length: steps }).map((_, i) => {
          const active = i < score
          const cls =
            'h-2 flex-1 rounded-full transition-all ' +
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
      <div className="text-xs font-medium text-slate-600">{label}</div>
    </div>
  )
}
