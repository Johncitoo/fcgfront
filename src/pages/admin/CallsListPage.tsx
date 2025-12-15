import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/api'
import { Calendar, Clock } from 'lucide-react'
import { useCallContext } from '../../contexts/CallContext'

interface CallRow {
  id: string
  name: string
  year: number
  status: string
  description?: string
  start_date?: string
  end_date?: string
  total_seats?: number
  min_per_institution?: number
  dates?: any
  rules?: any
  created_at?: string
  updated_at?: string
}

// Función para determinar el estado de la convocatoria
function getCallStatus(call: CallRow): 'draft' | 'upcoming' | 'active' | 'closed' {
  if (call.status === 'CLOSED') return 'closed'
  if (!call.start_date || !call.end_date) return 'draft'
  
  const now = new Date()
  const start = new Date(call.start_date)
  const end = new Date(call.end_date)
  
  if (now < start) return 'upcoming'
  if (now >= start && now <= end) return 'active'
  return 'closed'
}

function getStatusBadge(status: 'draft' | 'upcoming' | 'active' | 'closed') {
  const styles = {
    draft: 'bg-slate-100 text-slate-700',
    upcoming: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-700'
  }
  const labels = {
    draft: 'Borrador',
    upcoming: 'Próxima',
    active: 'Activa',
    closed: 'Cerrada'
  }
  return { style: styles[status], label: labels[status] }
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

export default function CallsListPage() {
  const { refreshCalls } = useCallContext()
  const location = useLocation()
  const baseRoute = location.pathname.startsWith('/reviewer') ? '/reviewer' : '/admin'
  
  // listado
  const [rows, setRows] = useState<CallRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filtros/paginación
  const [q, setQ] = useState('')
  const [onlyActive, setOnlyActive] = useState(true)
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)
  const [meta, setMeta] = useState<PageMeta | null>(null)

  // crear convocatoria
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    year: new Date().getFullYear(),
    description: '',
    start_date: '',
    end_date: '',
  })

  const deps = useMemo(() => ({ q, onlyActive, limit, offset }), [q, onlyActive, limit, offset])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (q.trim()) params.set('q', q.trim())
      if (onlyActive) params.set('onlyActive', 'true')

      const res = await apiGet<ListResponse<CallRow> | CallRow[]>(
        `/calls?${params.toString()}`,
      )
      if (Array.isArray(res)) {
        setRows(res)
        setMeta({ total: res.length, limit, offset })
      } else {
        setRows(res.data ?? [])
        setMeta(
          res.meta ?? {
            total: (res.data ?? []).length,
            limit,
            offset,
          },
        )
      }
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar el listado de convocatorias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps])

  function applyFilters() {
    setOffset(0)
    load()
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormErr(null)
    setSaving(true)
    try {
      if (!form.name.trim()) throw new Error('El título es requerido')
      if (!form.year || form.year < 2000) throw new Error('El año debe ser válido')
      if (!form.start_date) throw new Error('La fecha de inicio es requerida')
      if (!form.end_date) throw new Error('La fecha de fin es requerida')
      if (new Date(form.end_date) < new Date(form.start_date)) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio')
      }

      await apiPost('/calls', {
        name: form.name.trim(),
        year: Number(form.year),
        description: form.description.trim() || undefined,
        startDate: form.start_date,
        endDate: form.end_date,
        status: 'DRAFT',
      })

      setCreating(false)
      setForm({ 
        name: '', 
        year: new Date().getFullYear(),
        description: '',
        start_date: '',
        end_date: '',
      })
      setOffset(0)
      await load()
      
      // Actualizar el selector de convocatorias
      await refreshCalls()
    } catch (e: any) {
      setFormErr(e.message ?? 'No se pudo crear la convocatoria')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Convocatorias</h1>
              <p className="text-slate-600">
                Gestiona las convocatorias anuales. Cada una es independiente del año anterior.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCreating(true)}
                className="btn-primary"
              >
                Crear convocatoria
              </button>
            </div>
          </div>
        </header>

        {/* Filtros responsivos */}
        <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por código o título…"
              className="input"
            />
          </div>
          <label className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm sm:justify-center">
            <span className="text-slate-700">Solo activas</span>
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => {
                setOnlyActive(e.target.checked)
                setOffset(0)
              }}
              className="h-4 w-4"
            />
          </label>
          <button
            onClick={applyFilters}
            className="btn"
            title="Aplicar filtros"
          >
            Buscar
          </button>
        </section>

        {/* Tabla/Card responsiva */}
        <div className="card">
          <div className="card-body">
            {loading ? (
              <p className="text-slate-600">Cargando…</p>
            ) : error ? (
              <p className="text-sm text-rose-700">{error}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-slate-600">No hay convocatorias.</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-600">
                      <tr className="border-b bg-slate-50">
                        <th className="py-2 pr-3 font-semibold">Año</th>
                        <th className="py-2 pr-3 font-semibold">Nombre</th>
                        <th className="py-2 pr-3 font-semibold">Periodo</th>
                        <th className="py-2 pr-3 font-semibold">Estado</th>
                        <th className="py-2 font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((c) => {
                        const status = getCallStatus(c)
                        const badge = getStatusBadge(status)
                        return (
                          <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                            <td className="py-3 pr-3 font-mono font-medium !text-slate-900">{c.year}</td>
                            <td className="py-3 pr-3">
                              <div className="font-medium !text-slate-900">{c.name}</div>
                              {c.description && (
                                <div className="text-xs !text-slate-600 mt-0.5 line-clamp-1">
                                  {c.description}
                                </div>
                              )}
                            </td>
                            <td className="py-3 pr-3 !text-slate-700">
                              {c.start_date && c.end_date ? (
                                <div className="flex items-center gap-1.5 text-xs !text-slate-700">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>
                                    {new Date(c.start_date).toLocaleDateString('es-CL', { 
                                      day: '2-digit', 
                                      month: '2-digit',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <span>→</span>
                                  <span>
                                    {new Date(c.end_date).toLocaleDateString('es-CL', { 
                                      day: '2-digit', 
                                      month: '2-digit',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs !text-slate-500">Sin fechas</span>
                              )}
                            </td>
                            <td className="py-3 pr-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badge.style}`}>
                                {status === 'active' && <Clock className="w-3 h-3" />}
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-3">
                              <Link
                                to={`${baseRoute}/calls/${c.id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-600 hover:text-white hover:bg-sky-600 border border-sky-600 rounded-lg transition-colors"
                              >
                                Abrir
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 lg:hidden">
                  {rows.map((c) => {
                    const status = getCallStatus(c)
                    const badge = getStatusBadge(status)
                    return (
                      <div key={c.id} className="rounded-lg border p-3 bg-white hover:shadow-md transition-shadow">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <div className="font-mono text-sm !text-slate-700">{c.year}</div>
                            <div className="text-sm font-semibold mt-0.5 !text-slate-900">{c.name}</div>
                            {c.description && (
                              <div className="text-xs !text-slate-600 mt-1 line-clamp-2">
                                {c.description}
                              </div>
                            )}
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${badge.style}`}>
                            {status === 'active' && <Clock className="w-3 h-3" />}
                            {badge.label}
                          </span>
                        </div>
                        {c.start_date && c.end_date && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {new Date(c.start_date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })} 
                              {' → '}
                              {new Date(c.end_date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                        <Link 
                          to={`${baseRoute}/calls/${c.id}`} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-600 hover:text-white hover:bg-sky-600 border border-sky-600 rounded-lg transition-colors w-full justify-center"
                        >
                          Abrir
                        </Link>
                      </div>
                    )
                  })}
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
              disabled={meta ? offset + limit >= meta.total : undefined}
              className="btn disabled:opacity-50"
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

      {/* Modal crear */}
      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="text-base font-semibold">Crear convocatoria</div>
              <button
                onClick={() => setCreating(false)}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
                aria-label="Cerrar"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={onCreate} className="px-5 py-4">
              {formErr && (
                <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {formErr}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Año/Código *</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm((s) => ({ ...s, year: parseInt(e.target.value) || 2026 }))}
                    className="input"
                    placeholder="2026"
                    min="2000"
                    max="2100"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Título *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    className="input"
                    placeholder="Becas FCG 2026"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  className="input min-h-[80px] resize-y"
                  placeholder="Describe brevemente esta convocatoria..."
                  rows={3}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Fecha de inicio *</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))}
                    className="input"
                    required
                  />
                  <p className="text-xs text-slate-500">La convocatoria se activará automáticamente en esta fecha</p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Fecha de fin *</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))}
                    className="input"
                    required
                  />
                  <p className="text-xs text-slate-500">La convocatoria se cerrará automáticamente en esta fecha</p>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Guardando…' : 'Crear'}
                </button>
              </div>

              <p className="pt-2 text-xs text-slate-500">
                Recuerda: cada convocatoria es independiente. Puedes clonar una futura versión para
                reutilizar secciones del formulario sin modificar la original.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
