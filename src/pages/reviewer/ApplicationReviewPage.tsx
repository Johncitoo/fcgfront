import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'NEEDS_FIX'
  | 'APPROVED'
  | 'REJECTED'

interface ApplicantLite {
  id: string
  email: string
  first_name?: string
  last_name?: string
}

interface ApplicationDetail {
  id: string
  status: ApplicationStatus
  call: { id: string; code: string; title: string }
  applicant: ApplicantLite
  submitted_at?: string | null
  decided_at?: string | null
  notes?: string | null
  snapshot?: Record<string, any>
}

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

export default function ApplicationReviewPage() {
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ApplicationDetail | null>(null)
  const [reason, setReason] = useState('')
  const [acting, setActing] = useState<null | 'take' | 'fix' | 'approve' | 'reject'>(null)

  const headers = useMemo(() => {
    const token = localStorage.getItem('fcg.access_token') ?? ''
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }, [])

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${API_BASE}/applications/${id}`, { headers })
        if (!res.ok) throw new Error(await safeError(res))
        const json = (await res.json()) as ApplicationDetail
        setData(json)
      } catch (err: any) {
        setError(err.message ?? 'No se pudo cargar la postulación')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, headers])

  const fullName =
    (data?.applicant.first_name?.trim() || '') +
    (data?.applicant.last_name ? ` ${data.applicant.last_name.trim()}` : '')

  async function act(url: string, method: 'POST' | 'PATCH' = 'POST', body?: any) {
    if (!id) return
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) throw new Error(await safeError(res))
    const d = await fetch(`${API_BASE}/applications/${id}`, { headers })
    if (!d.ok) throw new Error(await safeError(d))
    const json = (await d.json()) as ApplicationDetail
    setData(json)
  }

  async function takeInReview() {
    try {
      setActing('take')
      await act(`${API_BASE}/applications/${id}/in-review`)
    } catch (e: any) {
      setError(e.message ?? 'No se pudo mover a En revisión')
    } finally {
      setActing(null)
    }
  }

  async function sendFixRequest() {
    try {
      if (!reason.trim()) return setError('Indica el motivo de las correcciones solicitadas.')
      setActing('fix')
      await act(`${API_BASE}/applications/${id}/request-fix`, 'POST', { reason })
      setReason('')
    } catch (e: any) {
      setError(e.message ?? 'No se pudo solicitar ajustes')
    } finally {
      setActing(null)
    }
  }

  async function approve() {
    try {
      setActing('approve')
      await act(`${API_BASE}/applications/${id}/approve`)
    } catch (e: any) {
      setError(e.message ?? 'No se pudo aprobar')
    } finally {
      setActing(null)
    }
  }

  async function reject() {
    try {
      if (!reason.trim()) return setError('Indica el motivo del rechazo.')
      setActing('reject')
      await act(`${API_BASE}/applications/${id}/reject`, 'POST', { reason })
      setReason('')
    } catch (e: any) {
      setError(e.message ?? 'No se pudo rechazar')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Revisión de postulación</h1>
            <p className="text-slate-600">
              Convocatoria:{' '}
              <span className="font-medium">{data?.call.title}</span>{' '}
              <span className="text-slate-500">({data?.call.code})</span>
            </p>
          </div>
          <Link
            to="/reviewer"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Volver a la bandeja
          </Link>
        </header>

        {loading && (
          <div className="card">
            <div className="card-body"><p className="text-slate-600">Cargando…</p></div>
          </div>
        )}

        {error && (
          <div className="card border-rose-200">
            <div className="card-body"><p className="text-sm text-rose-700">{error}</p></div>
          </div>
        )}

        {!loading && !error && data && (
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="card lg:col-span-2">
              <div className="card-body space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">Postulante</div>
                    <div className="text-base font-semibold">
                      {fullName || data.applicant.email}
                    </div>
                    {fullName && (
                      <div className="text-xs text-slate-500">{data.applicant.email}</div>
                    )}
                  </div>
                  <StatusBadge status={data.status} />
                </div>

                {data.snapshot && (
                  <div className="rounded-lg border bg-white p-3">
                    <div className="mb-2 text-sm font-semibold">Resumen de respuestas</div>
                    <dl className="grid gap-2 md:grid-cols-2">
                      {Object.entries(data.snapshot).map(([k, v]) => (
                        <div key={k} className="text-sm">
                          <dt className="text-slate-500">{k}</dt>
                          <dd className="font-medium break-words">
                            {renderValue(v)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-3">
                      <Link
                        to={`/reviewer/applications/${data.id}/full`}
                        className="text-sm text-sky-700 hover:underline"
                      >
                        Ver detalle completo del formulario →
                      </Link>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="reason" className="text-sm font-medium">
                    Motivo / comentarios para el postulante
                  </label>
                  <textarea
                    id="reason"
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    placeholder="Indica qué debe corregir o la razón de la decisión"
                  />
                  <p className="text-xs text-slate-500">
                    Se enviará en el correo y quedará en el historial.
                  </p>
                </div>
              </div>
            </section>

            <aside className="card h-fit">
              <div className="card-body space-y-3">
                <h2 className="text-base font-semibold">Acciones</h2>

                <button
                  onClick={takeInReview}
                  disabled={acting !== null || data.status === 'IN_REVIEW'}
                  className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
                >
                  {acting === 'take' ? 'Cambiando…' : 'Mover a En revisión'}
                </button>

                <button
                  onClick={sendFixRequest}
                  disabled={acting !== null}
                  className="w-full rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {acting === 'fix' ? 'Enviando…' : 'Solicitar ajustes (NEEDS_FIX)'}
                </button>

                <button
                  onClick={approve}
                  disabled={acting !== null}
                  className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {acting === 'approve' ? 'Aprobando…' : 'Aprobar'}
                </button>

                <button
                  onClick={reject}
                  disabled={acting !== null}
                  className="w-full rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {acting === 'reject' ? 'Rechazando…' : 'Rechazar'}
                </button>

                <div className="pt-2">
                  <Link
                    to={`/reviewer/applications/${data.id}/history`}
                    className="text-sm text-sky-700 hover:underline"
                  >
                    Ver historial de estados
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

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const map: Record<ApplicationStatus, string> = {
    DRAFT: 'Borrador',
    SUBMITTED: 'Enviada',
    IN_REVIEW: 'En revisión',
    NEEDS_FIX: 'Requiere ajustes',
    APPROVED: 'Aprobada',
    REJECTED: 'Rechazada',
  }
  const label = map[status]
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

function renderValue(v: any) {
  if (v == null) return '—'
  if (Array.isArray(v)) return v.join(', ')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

async function safeError(res: Response) {
  try {
    const data = await res.json()
    return data?.message || data?.error || res.statusText
  } catch {
    return res.statusText
  }
}
