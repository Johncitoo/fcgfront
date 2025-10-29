import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiPost } from '../../lib/api'

/**
 * Flujo: el/la postulante ingresa su correo + código de invitación.
 * Backend: POST /invites/consume { email, code }
 * - Marca el código como usado
 * - Vincula/crea applicant
 * - Crea application en DRAFT para la call correspondiente
 * - (Opcional backend) Envía correo con pasos siguientes
 *
 * En éxito mostramos confirmación y ofrecemos ir a "Definir contraseña".
 */
export default function EnterInviteCodePage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setLoading(true)
    try {
      // Llama al backend según el diseño API
      const res = await apiPost<{ message?: string }>('/invites/consume', {
        email: email.trim(),
        code: code.trim(),
      })
      const msg =
        res?.message ||
        'Código validado. Hemos creado tu postulación en borrador para la convocatoria correspondiente.'
      setSuccessMsg(msg)
    } catch (e: any) {
      setError(e?.message ?? 'No fue posible validar el código')
    } finally {
      setLoading(false)
    }
  }

  function goSetPassword() {
    const q = new URLSearchParams()
    if (email.trim()) q.set('email', email.trim())
    navigate(`/set-password?${q.toString()}`)
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
                  correo personal. Si no lo tienes, solicita asistencia a tu encargado/a o escribe a
                  soporte.
                </p>

                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
                  <li>El código es único y está asociado a tu convocatoria.</li>
                  <li>
                    Tras validarlo, podrás <strong>definir tu contraseña</strong> y completar el
                    formulario.
                  </li>
                </ul>

                <div className="pt-1">
                  <Link to="/login" className="text-sm text-sky-700 hover:underline">
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
                {successMsg && (
                  <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {successMsg}
                  </div>
                )}

                <form onSubmit={onSubmit} className="space-y-3">
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
                    {loading ? 'Validando…' : 'Validar código'}
                  </button>
                </form>

                {/* Acciones posteriores */}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={goSetPassword}
                    className="btn w-full"
                    title="Definir tu contraseña y activar acceso"
                  >
                    Definir contraseña
                  </button>
                  <Link to="/login" className="btn w-full">
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
