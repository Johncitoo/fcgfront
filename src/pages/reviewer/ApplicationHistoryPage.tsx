import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'NEEDS_FIX'
  | 'APPROVED'
  | 'REJECTED'

interface HistoryRow {
  id: string
  from_status?: ApplicationStatus | null
  to_status: ApplicationStatus
  reason?: string | null
  changed_by?: { id: string; email: string } | null
  changed_at: string
}

interface HistoryPayload {
  application: {
    id: string
    call: { id: string; code: string; title: string }
    applicant: { id: string; email: string; first_name?: string; last_name?: string }
    status: ApplicationStatus
  }
  history: HistoryRow[]
}

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

export default function ApplicationHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<HistoryPayload | null>(null)

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
        const res = await fetch(`${API_BASE}/applications/${id}/history`, {
          headers,
        })
        if (!res.ok) throw new Error(await safeError(res))
        const json = (await res.json()) as HistoryPayload
        setData(json)
      } catch (err: any) {
        setError(err.message ?? 'No se pudo cargar el historial')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, headers])

  const fullName =
    (data?.application.applicant.first_name?.trim() || '') +
    (data?.application.applicant.last_name
      ? ` ${data.application.applicant.last_name.trim()}`
      : '')

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Historial de estados</h1>
            {data && (
              <p className="text-slate-600">
                Convocatoria:{' '}
                <span className="font-medium">{data.application.call.title}</span>{' '}
                <span className="text-slate-500">({data.application.call.code})</span>
                {' · '}Postulante:{' '}
                <span className="font-medium">
                  {fullName || data.application.applicant.email}
                </span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              to={`/reviewer/applications/${id}`}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Volver a revisión
            </Link>
            <Link
              to="/reviewer"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Bandeja
            </Link>
          </div>
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
          <div className="card">
            <div className="card-body overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr className="border-b">
                    <th className="py-2 pr-3">Desde</th>
                    <th className="py-2 pr-3">Hacia</th>
                    <th className="py-2 pr-3">Motivo / Comentario</th>
                    <th className="py-2 pr-3">Cambiado por</th>
                    <th className="py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        Sin movimientos registrados.
                      </td>
                    </tr>
                  ) : (
                    data.history.map((h) => (
                      <tr key={h.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          <StatusPill status={h.from_status ?? null} />
                        </td>
                        <td className="py-2 pr-3">
                          <StatusPill status={h.to_status} />
                        </td>
                        <td className="py-2 pr-3 whitespace-pre-wrap">
                          {h.reason || '—'}
                        </td>
                        <td className="py-2 pr-3">
                          {h.changed_by?.email ?? '—'}
                        </td>
                        <td className="py-2">
                          {new Date(h.changed_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: ApplicationStatus | null }) {
  if (!status) {
    return (
      <span className="rounded-md border px-2.5 py-1 text-xs text-slate-500">
        —
      </span>
    )
  }

  const label =
    status === 'SUBMITTED'
      ? 'Enviada'
      : status === 'IN_REVIEW'
      ? 'En revisión'
      : status === 'NEEDS_FIX'
      ? 'Ajustes'
      : status === 'APPROVED'
      ? 'Aprobada'
      : status === 'REJECTED'
      ? 'Rechazada'
      : 'Borrador'

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
    <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${cls}`}>
      {label}
    </span>
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
