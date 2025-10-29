import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login, type UserSession } from '../../lib/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation() as any
  const redirectTo = location?.state?.from?.pathname as string | undefined

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = (await login(email.trim(), password)) as UserSession
      // Redirección por rol o a la ruta previa protegida
      if (redirectTo) {
        navigate(redirectTo, { replace: true })
      } else if (user.role === 'ADMIN' || user.role === 'REVIEWER') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/me', { replace: true }) // luego montaremos ApplicantHome en /me
      }
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 p-4 md:grid-cols-2 md:gap-10 md:p-6">
        {/* Columna izquierda: branding / contexto */}
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
                  <p className="text-xs text-slate-600">
                    Portal de postulación y seguimiento
                  </p>
                </div>
              </div>
            </header>

            <div className="card">
              <div className="card-body space-y-3">
                <h2 className="text-base font-semibold">Acceso</h2>
                <p className="text-sm text-slate-600">
                  Ingresa con tu correo y contraseña. Si eres estudiante y aún no tienes
                  credenciales, usa tu <strong>código de invitación</strong>.
                </p>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/invite"
                    className="btn"
                  >
                    Usar código de invitación
                  </Link>
                  <Link
                    to="/set-password"
                    className="btn"
                  >
                    Activar cuenta / Definir contraseña
                  </Link>
                </div>

                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                  <li>Funcionarios: acceso a panel de administración.</li>
                  <li>Postulantes: seguimiento del estado e interacción con requerimientos.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Columna derecha: formulario */}
        <section className="order-1 md:order-2">
          <div className="mx-auto w-full max-w-md">
            <div className="card">
              <div className="card-body">
                <h2 className="mb-1 text-base font-semibold">Iniciar sesión</h2>
                <p className="mb-4 text-sm text-slate-600">
                  Usa el correo registrado en el sistema.
                </p>

                {error && (
                  <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <form onSubmit={onSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Correo</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input"
                      placeholder="tu@correo.cl"
                      autoComplete="username"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Contraseña</label>
                    <div className="flex">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input flex-1 rounded-r-none"
                        placeholder="••••••••"
                        autoComplete="current-password"
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
                    <div className="flex justify-end">
                      <Link to="/reset-password" className="text-xs text-sky-700 hover:underline">
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? 'Ingresando…' : 'Ingresar'}
                  </button>
                </form>

                {/* Separador responsivo */}
                <div className="my-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <span className="h-px bg-slate-200" />
                  <span className="text-xs text-slate-500">o</span>
                  <span className="h-px bg-slate-200" />
                </div>

                {/* Atajos */}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link to="/invite" className="btn w-full">
                    Ingresar con código
                  </Link>
                  <Link to="/" className="btn w-full">
                    Volver al inicio
                  </Link>
                </div>

                <p className="mt-3 text-center text-xs text-slate-500">
                  Al iniciar sesión aceptas los términos y la política de privacidad.
                </p>
              </div>
            </div>

            {/* Bloque informativo para pantallas pequeñas */}
            <div className="mt-4 rounded-lg border bg-white p-3 text-xs text-slate-600 md:hidden">
              Consejo: si eres estudiante y acabas de recibir el correo de invitación,
              primero usa “Activar cuenta / Definir contraseña”.
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
