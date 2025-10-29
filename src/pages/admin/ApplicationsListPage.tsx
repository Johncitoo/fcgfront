import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../lib/api'

type AppStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'NEEDS_FIX' | 'APPROVED' | 'REJECTED'

interface CallOption {
  id: string
  code: string
  title: string
}

interface Row {
  id: string
  applicant_id: string
  call_id: string
  institution_id?: string | null
  status: AppStatus
  score?: number | null
  submitted_at?: string | null
  updated_at?: string | null
  // campos “decorados” que tu backend puede retornar opcionalmente
  applicant_email?: string
  applicant_name?: string
  call_code?: string
}

interface Paginated<T> {
  data: T[]
  meta?: { total: number; limit: number; offset: number }
}

const STATUS_OPTIONS: { value: '' | AppStatus; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'SUBMITTED', label: 'Enviadas' },
  { value: 'IN_REVIEW', label: 'En revisión' },
  { value: 'NEEDS_FIX', label: 'Con correcciones' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
]

export default function ApplicationsListPage() {
  const [sp, setSp] = useSearchParams()

  // filtros
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [status, setStatus] = useState<'' | AppStatus>((sp.get('status') as any) ?? '')
  const [callId, setCallId] = useState(sp.get('callId') ?? '')

  // paginación
  const [limit, setLimit] = useState(Number(sp.get('limit')) || 20)
  const [offset, setOffset] = useState(Number(sp.get('offset')) || 0)

  // dataset
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [calls, setCalls] = useState<CallOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const deps = useMemo(() => ({ q, status, callId, limit, offset }), [q, status, callId, limit, offset])

  // carga de combos
  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiGet<Paginated<CallOption> | CallOption[]>('/calls?limit=200')
        const list = Array.isArray(res) ? res : res.data ?? []
        setCalls(list)
      } catch {
        setCalls([])
      }
    })()
  }, [])

  // carga principal
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (q.trim()) params.set('q', q.trim())
      if (status) params.set('status', status)
      if (callId) params.set('callId', callId)

      const res = await apiGet<Paginated<Row> | Row[]>(`/applications?${params.toString()}`)
      if (Array.isArray(res)) {
        setRows(res)
        setTotal(res.length)
      } else {
        setRows(res.data ?? [])
        setTotal(res.meta?.total ?? (res.data ?? []).length)
      }
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar el listado')
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    setOffset(0)
    const next = new URLSearchParams()
    if (q.trim()) next.set('q', q.trim())
    if (status) next.set('status', status)
    if (callId) next.set('callId', callId)
    next.set('limit', String(limit))
    next.set('offset', '0')
    setSp(next, { replace: true })
    load()
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Postulaciones</h1>
          <p className="text-slate-600">
            Revisa y filtra las postulaciones por convocatoria y estado.
          </p>
        </header>

        {/* Filtros responsivos */}
        <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_16rem_18rem_auto]">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por correo/nombre…"
            className="input"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value || 'all'} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={callId}
            onChange={(e) => setCallId(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Todas las convocatorias</option>
            {calls.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.title}
              </option>
            ))}
          </select>
          <button onClick={applyFilters} className="btn">
            Aplicar
          </button>
        </section>

        <div className="card">
          <div className="card-body">
            {loading ? (
              <p className="text-slate-600">Cargando…</p>
            ) : error ? (
              <p className="text-sm text-rose-700">{error}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-slate-600">No hay registros con los filtros actuales.</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-600">
                      <tr className="border-b">
                        <th className="py-2 pr-3">Postulante</th>
                        <th className="py-2 pr-3">Correo</th>
                        <th className="py-2 pr-3">Convocatoria</th>
                        <th className="py-2 pr-3">Estado</th>
                        <th className="py-2 pr-3">Puntaje</th>
                        <th className="py-2 pr-3">Enviada</th>
                        <th className="py-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 pr-3">{r.applicant_name || '—'}</td>
                          <td className="py-2 pr-3">{r.applicant_email || '—'}</td>
                          <td className="py-2 pr-3">
                            <span className="font-mono">{r.call_code || shortId(r.call_id)}</span>
                          </td>
                          <td className="py-2 pr-3">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="py-2 pr-3">{r.score ?? '—'}</td>
                          <td className="py-2 pr-3">
                            {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}
                          </td>
                          <td className="py-2">
                            <Link to={`/admin/applications/${r.id}`} className="btn text-xs">
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 md:hidden">
                  {rows.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="text-sm font-semibold">{r.applicant_name || '—'}</div>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="text-xs text-slate-600">{r.applicant_email || '—'}</div>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>
                          <div className="text-slate-500">Convocatoria</div>
                          <div className="font-mono">{r.call_code || shortId(r.call_id)}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">Puntaje</div>
                          <div>{r.score ?? '—'}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">Enviada</div>
                          <div>
                            {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Link to={`/admin/applications/${r.id}`} className="btn text-xs">
                          Abrir
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Paginación */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
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
              className="btn disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="btn disabled:opacity-50"
            >
              Siguiente
            </button>
            <span className="text-slate-600">
              {total > 0
                ? `${Math.min(total, offset + 1)}–${Math.min(total, offset + rows.length)} de ${total}`
                : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =================== subcomponentes =================== */

function StatusBadge({ status }: { status: AppStatus }) {
  const map: Record<AppStatus, string> = {
    DRAFT: 'badge-neutral',
    SUBMITTED: 'badge-sky',
    IN_REVIEW: 'badge-warning',
    NEEDS_FIX: 'badge-amber',
    APPROVED: 'badge-success',
    REJECTED: 'badge-danger',
  }
  const label: Record<AppStatus, string> = {
    DRAFT: 'Borrador',
    SUBMITTED: 'Enviada',
    IN_REVIEW: 'En revisión',
    NEEDS_FIX: 'Correcciones',
    APPROVED: 'Aprobada',
    REJECTED: 'Rechazada',
  }
  return <span className={`badge ${map[status]}`}>{label[status]}</span>
}

function shortId(id: string) {
  return id?.slice(0, 8) || '—'
}
