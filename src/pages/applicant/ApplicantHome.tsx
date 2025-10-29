import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'NEEDS_FIX'
  | 'APPROVED'
  | 'REJECTED'

interface ApplicantMe {
  id: string
  email: string
  first_name?: string
  last_name?: string
}

interface MyApplication {
  id: string
  status: ApplicationStatus
  call: { id: string; code: string; title: string }
  submitted_at?: string | null
  decided_at?: string | null
  notes?: string | null
}

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

export default function ApplicantHome() {
  const [me, setMe] = useState<ApplicantMe | null>(null)
  const [app, setApp] = useState<MyApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem('fcg.access_token') ?? ''
        const headers = { Authorization: `Bearer ${token}` }

        // 1) Traer perfil applicant actual
        const meRes = await fetch(`${API_BASE}/applicants/me`, { headers })
        if (!meRes.ok) throw new Error(await safeError(meRes))
        const meJson = (await meRes.json()) as ApplicantMe
        setMe(meJson)

        // 2) Traer mi postulación activa (convocatoria vigente)
        const appRes = await fetch(`${API_BASE}/applications/my-active`, {
          headers,
        })
        if (!appRes.ok) throw new Error(await safeError(appRes))
        const appJson = (await appRes.json()) as MyApplication
        setApp(appJson)
      } catch (err: any) {
        setError(err.message ?? 'No se pudo cargar tu información')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const fullName =
    (me?.first_name?.trim() || '') +
    (me?.last_name ? ` ${me.last_name.trim()}` : '')

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">Mi postulación</h1>
          <p className="text-slate-600">
            {fullName ? `Hola, ${fullName}.` : 'Hola.'}{' '}
            Aquí puedes ver el estado y las acciones disponibles.
          </p>
        </header>

        {loading && (
          <div className="card">
            <div className="card-body">
              <p className="text-slate-600">Cargando…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="card border-red-200">
            <div className="card-body">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Estado actual */}
            <section className="card md:col-span-2">
              <div className="card-body">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium">
                      Convocatoria:{' '}
                      <span className="font-semibold">
                        {app?.call.title ?? '—'}
                      </span>
                    </h2>
                    <p className="text-sm text-slate-600">
                      Código: {app?.call.code ?? '—'}
                    </p>
                  </div>
                  <StatusBadge status={app?.status} />
                </div>

                <Timeline status={app?.status} />

                <div className="mt-6 grid gap-3 sm:flex">
                  {app?.status === 'DRAFT' && (
                    <Link
                      to={`/applicant/form/${app.id}`}
                      className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
                    >
                      Completar formulario
                    </Link>
                  )}

                  {app?.status === 'NEEDS_FIX' && (
                    <>
                      <Link
                        to={`/applicant/fixes/${app.id}`}
                        className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                      >
                        Ver correcciones solicitadas
                      </Link>
                      <Link
                        to={`/applicant/form/${app.id}`}
                        className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                      >
                        Editar y reenviar
                      </Link>
                    </>
                  )}

                  {app?.status === 'SUBMITTED' && (
                    <span className="rounded-md border px-4 py-2 text-sm">
                      Tu postulación fue enviada. Estamos revisando.
                    </span>
                  )}

                  {app?.status === 'IN_REVIEW' && (
                    <span className="rounded-md border px-4 py-2 text-sm">
                      En revisión por la Fundación.
                    </span>
                  )}

                  {app?.status === 'APPROVED' && (
                    <span className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                      ¡Felicitaciones! Tu postulación fue aprobada.
                    </span>
                  )}

                  {app?.status === 'REJECTED' && (
                    <span className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-800">
                      Tu postulación no fue seleccionada.
                    </span>
                  )}
                </div>

                {app?.notes && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold">Notas</h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {app.notes}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Resumen lateral */}
            <aside className="card h-fit">
              <div className="card-body space-y-3">
                <h3 className="text-base font-semibold">Resumen</h3>
                <ul className="text-sm text-slate-700 space-y-1.5">
                  <li>
                    <span className="text-slate-500">Postulante:</span>{' '}
                    {fullName || me?.email}
                  </li>
                  <li>
                    <span className="text-slate-500">Correo:</span> {me?.email}
                  </li>
                  <li>
                    <span className="text-slate-500">Estado:</span>{' '}
                    <InlineStatus status={app?.status} />
                  </li>
                </ul>

                <div className="pt-2">
                  <Link
                    to="/login"
                    className="text-sm text-sky-700 hover:underline"
                  >
                    Cerrar sesión
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

/* =========================================
   Componentes de apoyo simples (inline)
   ========================================= */

function StatusBadge({ status }: { status?: ApplicationStatus | null }) {
  const map: Record<ApplicationStatus, string> = {
    DRAFT: 'Borrador',
    SUBMITTED: 'Enviada',
    IN_REVIEW: 'En revisión',
    NEEDS_FIX: 'Requiere ajustes',
    APPROVED: 'Aprobada',
    REJECTED: 'Rechazada',
  }
  const label = status ? map[status] : '—'
  const cls =
    status === 'APPROVED'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'REJECTED'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : status === 'NEEDS_FIX'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : status === 'IN_REVIEW'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
      : status === 'SUBMITTED'
      ? 'bg-sky-50 text-sky-700 border-sky-200'
      : 'bg-slate-50 text-slate-700 border-slate-200'

  return (
    <span className={`rounded-md border px-2.5 py-1 text-sm font-medium ${cls}`}>
      {label}
    </span>
  )
}

function InlineStatus({ status }: { status?: ApplicationStatus | null }) {
  const map: Record<ApplicationStatus, string> = {
    DRAFT: 'Borrador',
    SUBMITTED: 'Enviada',
    IN_REVIEW: 'En revisión',
    NEEDS_FIX: 'Requiere ajustes',
    APPROVED: 'Aprobada',
    REJECTED: 'Rechazada',
  }
  return <span>{status ? map[status] : '—'}</span>
}

function Timeline({ status }: { status?: ApplicationStatus | null }) {
  const steps: { key: ApplicationStatus; label: string }[] = [
    { key: 'DRAFT', label: 'Borrador' },
    { key: 'SUBMITTED', label: 'Enviada' },
    { key: 'IN_REVIEW', label: 'En revisión' },
    { key: 'NEEDS_FIX', label: 'Ajustes' },
    { key: 'APPROVED', label: 'Aprobada' },
    { key: 'REJECTED', label: 'Rechazada' },
  ]

  const currentIndex = status ? steps.findIndex((s) => s.key === status) : 0

  return (
    <ol className="relative ml-3 border-l pl-6">
      {steps.map((s, i) => {
        const done = currentIndex > i
        const active = currentIndex === i
        return (
          <li key={s.key} className="mb-6 last:mb-0">
            <span
              className={[
                'absolute -left-3 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]',
                done
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : active
                  ? 'bg-sky-600 border-sky-600 text-white'
                  : 'bg-white border-slate-300 text-slate-400',
              ].join(' ')}
            >
              {done ? '✓' : active ? '●' : ''}
            </span>
            <div className="font-medium">{s.label}</div>
            {active && (
              <p className="text-sm text-slate-600">
                Estado actual de tu postulación.
              </p>
            )}
          </li>
        )
      })}
    </ol>
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
