import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { apiGet, apiPost, apiPatch } from '../../lib/api'
import { Calendar } from 'lucide-react'
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

  // modales de confirmación para acciones
  const [actionModal, setActionModal] = useState<{
    show: boolean
    action: 'activate' | 'close' | null
    call: CallRow | null
  }>({ show: false, action: null, call: null })
  const [actionLoading, setActionLoading] = useState(false)

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

  async function handleCallAction() {
    if (!actionModal.call || !actionModal.action) return
    
    try {
      setActionLoading(true)
      const updates: any = {}
      
      if (actionModal.action === 'activate') {
        updates.status = 'OPEN'
        updates.isActive = true
      } else if (actionModal.action === 'close') {
        updates.status = 'CLOSED'
        updates.isActive = false
      }
      
      await apiPatch(`/calls/${actionModal.call.id}`, updates)
      
      setActionModal({ show: false, action: null, call: null })
      await load()
      await refreshCalls()
    } catch (err: any) {
      alert(err?.message || 'Error al ejecutar la acción')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header moderno */}
        <header className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Convocatorias</h1>
                <p className="text-sm text-slate-500">
                  Gestiona las convocatorias anuales de becas
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-sky-600 rounded-xl hover:from-sky-600 hover:to-sky-700 transition-all shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva convocatoria
              </button>
            </div>
          </div>
        </header>

        {/* Filtros modernizados */}
        <section className="mb-6 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por código o título…"
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
              />
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm sm:justify-center cursor-pointer hover:border-slate-300 transition-all">
              <span className="text-slate-700 font-medium">Solo activas</span>
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => {
                  setOnlyActive(e.target.checked)
                  setOffset(0)
                }}
                className="h-5 w-5 rounded-md border-slate-300 text-sky-600 focus:ring-sky-500"
              />
            </label>
            <button
              onClick={applyFilters}
              className="rounded-xl border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
              title="Aplicar filtros"
            >
              Buscar
            </button>
          </div>
        </section>

        {/* Tabla/Card responsiva modernizada */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 animate-pulse"></div>
                <p className="text-slate-500 font-medium">Cargando convocatorias...</p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">No hay convocatorias</p>
                <p className="text-sm text-slate-400 mt-1">Crea tu primera convocatoria para comenzar</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-600">
                      <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50">
                        <th className="py-4 px-4 font-semibold">Año</th>
                        <th className="py-4 px-4 font-semibold">Nombre</th>
                        <th className="py-4 px-4 font-semibold">Periodo</th>
                        <th className="py-4 px-4 font-semibold">Estado</th>
                        <th className="py-4 px-4 font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((c) => {
                        const status = getCallStatus(c)
                        const badge = getStatusBadge(status)
                        return (
                          <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-sky-50/30 transition-colors">
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center justify-center w-14 h-9 rounded-lg bg-gradient-to-r from-purple-100 to-purple-50 font-mono font-bold text-purple-700">
                                {c.year}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-semibold text-slate-900">{c.name}</div>
                              {c.description && (
                                <div className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-xs">
                                  {c.description}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {c.start_date && c.end_date ? (
                                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 w-fit">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="font-medium">
                                    {new Date(c.start_date).toLocaleDateString('es-CL', { 
                                      day: '2-digit', 
                                      month: '2-digit',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <span className="text-slate-300">→</span>
                                  <span className="font-medium">
                                    {new Date(c.end_date).toLocaleDateString('es-CL', { 
                                      day: '2-digit', 
                                      month: '2-digit',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Sin fechas</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${
                                status === 'active' 
                                  ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200' 
                                  : status === 'upcoming'
                                  ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200'
                                  : status === 'draft'
                                  ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border border-amber-200'
                                  : 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {status === 'active' && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                )}
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`${baseRoute}/calls/${c.id}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Ver
                                </Link>
                                
                                {/* Botón Iniciar (solo para draft/upcoming) */}
                                {(status === 'draft' || status === 'upcoming') && (
                                  <button
                                    onClick={() => setActionModal({ show: true, action: 'activate', call: c })}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                                    title="Iniciar convocatoria ahora"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Iniciar
                                  </button>
                                )}
                                
                                {/* Botón Cerrar (solo para active) */}
                                {status === 'active' && (
                                  <button
                                    onClick={() => setActionModal({ show: true, action: 'close', call: c })}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                                    title="Cerrar convocatoria ahora"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Cerrar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards modernizadas */}
                <div className="space-y-3 lg:hidden">
                  {rows.map((c) => {
                    const status = getCallStatus(c)
                    const badge = getStatusBadge(status)
                    return (
                      <div key={c.id} className="rounded-2xl border border-slate-200 p-4 bg-gradient-to-br from-white to-slate-50/50 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-purple-100 to-purple-50 font-mono font-bold text-purple-700 text-sm flex-shrink-0">
                              {c.year}
                            </span>
                            <div>
                              <div className="text-sm font-bold text-slate-900">{c.name}</div>
                              {c.description && (
                                <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                                  {c.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap shadow-sm ${
                            status === 'active' 
                              ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200' 
                              : status === 'upcoming'
                              ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200'
                              : status === 'draft'
                              ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                            {badge.label}
                          </span>
                        </div>
                        {c.start_date && c.end_date && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 mb-3">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium">
                              {new Date(c.start_date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })} 
                              <span className="text-slate-300 mx-1">→</span>
                              {new Date(c.end_date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Link 
                            to={`${baseRoute}/calls/${c.id}`} 
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-colors flex-1 justify-center"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Ver
                          </Link>
                          
                          {(status === 'draft' || status === 'upcoming') && (
                            <button
                              onClick={() => setActionModal({ show: true, action: 'activate', call: c })}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex-1 justify-center"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Iniciar
                            </button>
                          )}
                          
                          {status === 'active' && (
                            <button
                              onClick={() => setActionModal({ show: true, action: 'close', call: c })}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex-1 justify-center"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Cerrar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Paginación modernizada */}
        <div className="mt-6 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-sm flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-medium">Filas por página:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setOffset(0)
              }}
              className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:border-slate-300 transition-colors focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Anterior
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={meta ? offset + limit >= meta.total : undefined}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="px-4 py-2 text-slate-600 font-medium bg-slate-100 rounded-xl">
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

      {/* Modal crear modernizado */}
      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Crear convocatoria</h2>
              </div>
              <button
                onClick={() => setCreating(false)}
                className="rounded-xl border-2 border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={onCreate} className="px-6 py-5 space-y-4">
              {formErr && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
                  {formErr}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Año/Código *</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm((s) => ({ ...s, year: parseInt(e.target.value) || 2026 }))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                    placeholder="2026"
                    min="2000"
                    max="2100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Título *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                    placeholder="Becas FCG 2026"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300 min-h-[100px] resize-y"
                  placeholder="Describe brevemente esta convocatoria..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Fecha de inicio *</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                    required
                  />
                  <p className="text-xs text-slate-500">La convocatoria se activará automáticamente en esta fecha</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Fecha de fin *</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                    required
                  />
                  <p className="text-xs text-slate-500">La convocatoria se cerrará automáticamente en esta fecha</p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-sky-600 rounded-xl hover:from-sky-600 hover:to-sky-700 transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando…' : 'Crear convocatoria'}
                </button>
              </div>

              <p className="pt-4 text-xs text-slate-500 bg-slate-50 rounded-xl p-3 mt-4">
                💡 <strong>Tip:</strong> Recuerda que cada convocatoria es independiente. Puedes clonar una futura versión para
                reutilizar secciones del formulario sin modificar la original.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de acciones */}
      {actionModal.show && actionModal.call && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5">
              <div className="flex items-start gap-4">
                <div className={`rounded-xl p-3 shadow-lg ${
                  actionModal.action === 'activate' 
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25' 
                    : 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/25'
                }`}>
                  <svg 
                    className="h-6 w-6 text-white"
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    {actionModal.action === 'activate' ? (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </>
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </>
                    )}
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    {actionModal.action === 'activate' 
                      ? '¿Iniciar convocatoria?' 
                      : '¿Cerrar convocatoria?'}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {actionModal.action === 'activate' ? (
                      <>
                        Estás por <strong className="text-emerald-600">iniciar</strong> la convocatoria <strong>"{actionModal.call.name} {actionModal.call.year}"</strong>.
                        <br /><br />
                        <span className="inline-flex items-center gap-2 text-emerald-600 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Los postulantes podrán comenzar a enviar sus formularios inmediatamente.
                        </span>
                      </>
                    ) : (
                      <>
                        Estás por <strong className="text-rose-600">cerrar</strong> la convocatoria <strong>"{actionModal.call.name} {actionModal.call.year}"</strong>.
                        <br /><br />
                        <span className="inline-flex items-center gap-2 text-rose-600 font-medium">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Esta acción no permitirá que se reciban más postulaciones.
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button
                onClick={() => setActionModal({ show: false, action: null, call: null })}
                disabled={actionLoading}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCallAction}
                disabled={actionLoading}
                className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  actionModal.action === 'activate'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/25'
                }`}
              >
                {actionLoading ? 'Procesando...' : (
                  actionModal.action === 'activate' ? 'Sí, iniciar ahora' : 'Sí, cerrar ahora'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
