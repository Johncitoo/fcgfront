import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiPost } from '../../lib/api'

/**
 * Flujo de recuperación en dos pasos (seguro y genérico):
 *
 * 1) Solicitar correo → backend envía email con token de reseteo.
 *    POST /auth/reset-password/request { email }
 *
 * 2) Ingresar token + nueva contraseña
 *    POST /auth/reset-password/confirm { email, token, password }
 *
 * Nota: si tu backend implementa un sólo paso con enlace mágico a una página dedicada,
 * puedes adaptar este componente para leer ?email & ?token desde la URL y saltar al paso 2.
 */

export default function ResetPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1)

  // paso 1
  const [email, setEmail] = useState('')
  const [reqLoading, setReqLoading] = useState(false)
  const [reqError, setReqError] = useState<string | null>(null)
  const [reqSuccess, setReqSuccess] = useState<string | null>(null)

  // paso 2
  const [token, setToken] = useState('')
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showPwd2, setShowPwd2] = useState(false)
  const [confLoading, setConfLoading] = useState(false)
  const [confError, setConfError] = useState<string | null>(null)
  const [confSuccess, setConfSuccess] = useState<string | null>(null)

  async function onRequest(e: React.FormEvent) {
    e.preventDefault()
    setReqError(null)
    setReqSuccess(null)
    setReqLoading(true)
    try {
      await apiPost('/auth/reset-password/request', { email: email.trim() })
      setReqSuccess(
        'Si el correo existe en el sistema, enviaremos un enlace/código de recuperación.',
      )
      setStep(2)
    } catch (e: any) {
      setReqError(e?.message ?? 'No fue posible iniciar la recuperación')
    } finally {
      setReqLoading(false)
    }
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault()
    setConfError(null)
    setConfSuccess(null)

    if (pwd.length < 8) {
      setConfError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (pwd !== pwd2) {
      setConfError('Las contraseñas no coinciden')
      return
    }

    setConfLoading(true)
    try {
      await apiPost('/auth/reset-password/confirm', {
        email: email.trim(),
        token: token.trim(),
        password: pwd,
      })
      setConfSuccess('Contraseña actualizada correctamente. Ya puedes iniciar sesión.')
    } catch (e: any) {
      setConfError(e?.message ?? 'No fue posible confirmar el cambio de contraseña')
    } finally {
      setConfLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
        <header className="mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white">
              F
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                Fundación Carmen Goudie — Becas
              </h1>
              <p className="text-xs text-slate-600">Recuperar contraseña</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Columna izquierda: explicación */}
          <section>
            <div className="card">
              <div className="card-body space-y-3">
                <h2 className="text-base font-semibold">¿Cómo funciona?</h2>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
                  <li>Ingresa tu correo para solicitar el código o enlace de recuperación.</li>
                  <li>Revisa tu correo y copia el token (o usa el enlace provisto).</li>
                  <li>Vuelve aquí, pega el token y define tu nueva contraseña.</li>
                </ol>

                <p className="text-xs text-slate-500">
                  Si no ves el correo en unos minutos, revisa la carpeta de spam.
                </p>

                <div className="pt-1">
                  <Link to="/login" className="text-sm text-sky-700 hover:underline">
                    ← Volver al login
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Columna derecha: formularios por paso */}
          <section>
            {step === 1 ? (
              <div className="card">
                <div className="card-body">
                  <h2 className="mb-1 text-base font-semibold">Paso 1: Solicitar recuperación</h2>
                  <p className="mb-4 text-sm text-slate-600">
                    Escribe el correo asociado a tu cuenta.
                  </p>

                  {reqError && (
                    <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {reqError}
                    </div>
                  )}
                  {reqSuccess && (
                    <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {reqSuccess}
                    </div>
                  )}

                  <form onSubmit={onRequest} className="space-y-3">
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

                    <button type="submit" disabled={reqLoading} className="btn-primary w-full">
                      {reqLoading ? 'Enviando…' : 'Enviar instrucciones'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="card-body">
                  <h2 className="mb-1 text-base font-semibold">Paso 2: Confirmar cambio</h2>
                  <p className="mb-4 text-sm text-slate-600">
                    Pega el token recibido y elige tu nueva contraseña.
                  </p>

                  {confError && (
                    <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {confError}
                    </div>
                  )}
                  {confSuccess && (
                    <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {confSuccess}
                    </div>
                  )}

                  <form onSubmit={onConfirm} className="space-y-3">
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

                    <div className="space-y-1">
                      <label className="text-sm font-medium">Token de recuperación *</label>
                      <input
                        type="text"
                        required
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        className="input"
                        placeholder="Pega aquí el token del correo"
                      />
                    </div>

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
                      {pwd2.length > 0 && pwd !== pwd2 && (
                        <p className="text-xs text-rose-700">Las contraseñas no coinciden.</p>
                      )}
                    </div>

                    <button type="submit" disabled={confLoading} className="btn-primary w-full">
                      {confLoading ? 'Guardando…' : 'Cambiar contraseña'}
                    </button>
                  </form>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="btn w-full"
                      title="Volver al paso 1"
                    >
                      Volver al paso 1
                    </button>
                    <Link to="/login" className="btn w-full">
                      Ir al login
                    </Link>
                  </div>

                  <p className="mt-3 text-center text-xs text-slate-500">
                    ¿No te llegó el correo? Verifica spam o espera unos minutos.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
