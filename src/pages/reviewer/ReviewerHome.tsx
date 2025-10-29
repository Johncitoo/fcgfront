import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'NEEDS_FIX'
  | 'APPROVED'
  | 'REJECTED'

interface ReviewRow {
  id: string
  applicant: { id: string; name: string; email: string }
  call: { id: string; code: string; title: string }
  status: ApplicationStatus
  updated_at?: string
}

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

export default function ReviewerHome() {
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem('fcg.access_token') ?? ''
        const headers = { Authorization: `Bearer ${token}` }

        // Bandeja: por defecto mostrar SUBMITTED e IN_REVIEW
        const res = await fetch(
          `${API_BASE}/applications?status=SUBMITTED,IN_REVIEW`,
          { headers },
        )
        if (!res.ok) throw new Error(await safeError(res))
        const data = (await res.json()) as ReviewRow[]
        setRows(data)
      } catch (err: any) {
        setError(err.message ?? 'No se pudo cargar la bandeja de revisión')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">Bandeja de revisión</h1>
          <p className="text-slate-600">
            Postulaciones enviadas o en revisión. Selecciona una para revisar y
            solicitar ajustes o aprobar/rechazar.
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
          <div className="card">
            <div className="card-body overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr className="border-b">
                    <th className="py-2 pr-3">Postulante</th>
                    <th className="py-2 pr-3">Correo</th>
                    <th className="py-2 pr-3">Convocatoria</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3">Actualizado</th>
                    <th className="py-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No hay postulaciones pendientes.
                      </td>
                    </tr>
                  )}
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{r.applicant.name || '—'}</td>
                      <td className="py-2 pr-3">{r.applicant.email}</td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{r.call.title}</div>
                        <div className="text-xs text-slate-500">{r.call.code}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="py-2 pr-3">
                        {r.updated_at
                          ? new Date(r.updated_at).toLocaleString()
                          : '—'}
                      </td>
                      <td className="py-2">
                        <Link
                          to={`/reviewer/applications/${r.id}`}
                          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                        >
                          Revisar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: ApplicationStatus }) {
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
