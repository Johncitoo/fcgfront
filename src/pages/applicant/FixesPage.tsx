import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'

type FixStatus = 'PENDING' | 'RESOLVED'
type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'NEEDS_FIX' | 'APPROVED' | 'REJECTED'

interface FixItem {
  id: string
  field?: string | null          // clave interna del campo (opcional)
  label?: string | null          // etiqueta visible del campo (opcional)
  message: string                // qué debe corregir
  status: FixStatus
  created_at: string
  resolved_at?: string | null
}

interface FixesPayload {
  application: {
    id: string
    status: ApplicationStatus
    call: { id: string; code: string; title: string }
  }
  fixes: FixItem[]
}

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

export default function FixesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<FixesPayload | null>(null)

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

        const res = await fetch(`${API_BASE}/applications/${id}/fixes`, {
          headers,
        })
        if (!res.ok) throw new Error(await safeError(res))
        const json = (await res.json()) as FixesPayload
        setData(json)

        // Si la app no está en NEEDS_FIX, redirigir a su home
        if (json.application.status !== 'NEEDS_FIX') {
          navigate('/applicant', { replace: true })
        }
      } catch (err: any) {
        setError(err.message ?? 'No se pudieron cargar las correcciones')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, headers, navigate])

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Correcciones solicitadas</h1>
          <p className="text-slate-600">
            Revisa los puntos indicados por la Fundación y corrígelos en tu formulario.
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
          <div className="card border-rose-200">
            <div className="card-body">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="card mb-6">
              <div className="card-body">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">Convocatoria</div>
                    <div className="text-base font-semibold">
                      {data.application.call.title}{' '}
                      <span className="text-slate-500 font-normal">({data.application.call.code})</span>
                    </div>
                  </div>
                  <div className="text-sm">
                    Estado:{' '}
                    <span className="rounded-md border bg-amber-50 border-amber-200 text-amber-700 px-2 py-1">
                      Requiere ajustes
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <section className="card">
              <div className="card-body">
                <h2 className="mb-4 text-lg font-semibold">Lista de correcciones</h2>

                {data.fixes.length === 0 ? (
                  <p className="text-sm text-slate-600">No hay correcciones registradas.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.fixes.map((fx) => (
                      <li
                        key={fx.id}
                        className="rounded-md border p-3 text-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">
                              {fx.label || fx.field || 'Campo/Documento'}
                            </div>
                            <p className="mt-0.5 text-slate-700 whitespace-pre-wrap">
                              {fx.message}
                            </p>
                            <div className="mt-1 text-xs text-slate-500">
                              Solicitado: {new Date(fx.created_at).toLocaleString()}
                              {fx.resolved_at && (
                                <> · Resuelto: {new Date(fx.resolved_at).toLocaleString()}</>
                              )}
                            </div>
                          </div>

                          <span
                            className={[
                              'rounded-md border px-2 py-0.5 text-xs font-medium',
                              fx.status === 'RESOLVED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200',
                            ].join(' ')}
                          >
                            {fx.status === 'RESOLVED' ? 'Resuelto' : 'Pendiente'}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to={`/applicant/form/${data.application.id}`}
                    className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
                  >
                    Abrir formulario para corregir
                  </Link>
                  <Link
                    to="/applicant"
                    className="rounded-md px-4 py-2 text-sm font-medium hover:underline"
                  >
                    Volver al estado de postulación
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
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
