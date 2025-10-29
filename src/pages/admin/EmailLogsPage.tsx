import { useEffect, useMemo, useState } from 'react'

interface EmailLog {
  id: string
  template_code: string
  to_email: string
  subject: string
  body_rendered?: string
  provider_msg_id?: string | null
  status: 'SENT' | 'FAILED' | 'QUEUED' | 'RETRYING' | string
  error?: string | null
  created_at: string
}

interface PageMeta {
  total: number
  limit: number
  offset: number
}
interface ListResponse<T> {
  data: T[]
  meta?: PageMeta
}

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

export default function EmailLogsPage() {
  const [rows, setRows] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filtros
  const [qTo, setQTo] = useState('')
  const [qStatus, setQStatus] = useState<'ALL' | 'SENT' | 'FAILED' | 'QUEUED' | 'RETRYING'>('ALL')
  const [qTemplate, setQTemplate] = useState('')
  const [qFrom, setQFrom] = useState<string>('') // YYYY-MM-DD
  const [qToDate, setQToDate] = useState<string>('') // YYYY-MM-DD

  // paginación
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)
  const [meta, setMeta] = useState<PageMeta | null>(null)

  // modal detalle
  const [detail, setDetail] = useState<EmailLog | null>(null)

  const headers = useMemo(() => {
    const token = localStorage.getItem('fcg.access_token') ?? ''
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }, [])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (qTo.trim()) params.set('to', qTo.trim())
      if (qTemplate.trim()) params.set('template', qTemplate.trim())
      if (qStatus !== 'ALL') params.set('status', qStatus)
      if (qFrom) params.set('from', qFrom)
      if (qToDate) params.set('to', qToDate)

      const res = await fetch(`${API_BASE}/email/logs?${params.toString()}`, { headers })
      if (!res.ok) throw new Error(await safeError(res))
      const json = (await res.json()) as ListResponse<EmailLog> | EmailLog[]

      if (Array.isArray(json)) {
        setRows(json)
        setMeta({ total: json.length, limit, offset })
      } else {
        setRows(json.data ?? [])
        setMeta(json.meta ?? { total: (json.data ?? []).length, limit, offset })
      }
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar el historial de correos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset])

  function applyFilters() {
    setOffset(0)
    load()
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Historial de correos</h1>
          <p className="text-slate-600">
            Registra cada envío con estado, plantilla y destinatario. Útil para auditoría y soporte.
          </p>
        </header>

        {/* Filtros */}
        <div className="mb-4 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs text-slate-600">Para (correo)</label>
            <input
              type="email"
              value={qTo}
              onChange={(e) => setQTo(e.target.value)}
              placeholder="alguien@dominio.cl"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Plantilla</label>
            <input
              type="text"
              value={qTemplate}
              onChange={(e) => setQTemplate(e.target.value)}
              placeholder="INVITE_APPLICANT"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Estado</label>
            <select
              value={qStatus}
              onChange={(e) => setQStatus(e.target.value as any)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <option value="ALL">Todos</option>
              <option value="SENT">SENT</option>
              <option value="FAILED">FAILED</option>
              <option value="QUEUED">QUEUED</option>
              <option value="RETRYING">RETRYING</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Desde (fecha)</label>
            <input
              type="date"
              value={qFrom}
              onChange={(e) => setQFrom(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-600">Hasta (fecha)</label>
            <input
              type="date"
              value={qToDate}
              onChange={(e) => setQToDate(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={applyFilters}
              className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Aplicar filtros
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="card">
          <div className="card-body overflow-x-auto">
            {loading ? (
              <p className="text-slate-600">Cargando…</p>
            ) : error ? (
              <p className="text-sm text-rose-700">{error}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr className="border-b">
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Para</th>
                    <th className="py-2 pr-3">Plantilla</th>
                    <th className="py-2 pr-3">Asunto</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No hay registros.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td className="py-2 pr-3">{r.to_email}</td>
                        <td className="py-2 pr-3">
                          <span className="rounded-md border px-2 py-0.5 text-xs">
                            {r.template_code}
                          </span>
                        </td>
                        <td className="py-2 pr-3">{r.subject}</td>
                        <td className="py-2 pr-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setDetail(r)}
                              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                            >
                              Ver detalle
                            </button>
                            {r.provider_msg_id && (
                              <span className="rounded-md border px-2 py-0.5 text-[11px] text-slate-600">
                                msg: {r.provider_msg_id}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Paginación */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Filas por página:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setOffset(0)
              }}
              className="rounded-md border px-2 py-1"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="rounded-md border px-3 py-1.5 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={!!meta && offset + limit >= meta.total}
              className="rounded-md border px-3 py-1.5 disabled:opacity-50"
            >
              Siguiente
            </button>
            <span className="text-slate-600">
              {meta
                ? `${Math.min(meta.total, offset + 1)}–${Math.min(
                    meta.total,
                    offset + rows.length,
                  )} de ${meta.total}`
                : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Modal detalle */}
      {detail && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-4xl rounded-lg border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="text-base font-semibold">Detalle de correo</div>
              <button
                onClick={() => setDetail(null)}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Info label="Fecha" value={new Date(detail.created_at).toLocaleString()} />
                <Info label="Para" value={detail.to_email} />
                <Info label="Estado" value={<StatusBadge status={detail.status} />} />
                <Info label="Plantilla" value={detail.template_code} />
                <Info label="Asunto" value={detail.subject} className="sm:col-span-2" />
                {detail.provider_msg_id && (
                  <Info label="Provider msg id" value={detail.provider_msg_id} />
                )}
                {detail.error && (
                  <Info
                    label="Error"
                    value={<span className="text-rose-700">{detail.error}</span>}
                    className="sm:col-span-2"
                  />
                )}
              </div>

              {detail.body_rendered && (
                <div className="rounded-lg border">
                  <div className="border-b px-3 py-2 text-sm font-medium">HTML renderizado</div>
                  <iframe
                    title="body-rendered"
                    className="h-[60vh] w-full rounded-b-lg"
                    srcDoc={detail.body_rendered}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================= utilidades ================= */

function StatusBadge({ status }: { status: string }) {
  const norm = status.toUpperCase()
  let cls =
    'rounded-md border px-2 py-0.5 text-xs ' +
    (norm === 'SENT'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : norm === 'FAILED'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : norm === 'QUEUED' || norm === 'RETRYING'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-slate-50 text-slate-700')
  return <span className={cls}>{norm}</span>
}

function Info({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <div className="text-xs text-slate-600">{label}</div>
      <div className="text-sm">{value}</div>
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
