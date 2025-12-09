import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiGet, apiPatch, apiPost } from '../../lib/api'
import { Calendar, Clock, AlertCircle, XCircle } from 'lucide-react'

interface CallRow {
  id: string
  code: string
  title: string
  description?: string | null
  start_date: string
  end_date: string
  status?: string
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

interface StatRes {
  applicants?: number
  applications?: number
  submitted?: number
  in_review?: number
}

export default function CallDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [data, setData] = useState<CallRow | null>(null)
  const [stats, setStats] = useState<StatRes | null>(null)

  // formulario de edición
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState({
    code: '',
    title: '',
    description: '',
    start_date: '',
    end_date: '',
  })

  const canSave = useMemo(() => {
    return !!(form.code.trim() && form.title.trim() && form.start_date && form.end_date)
  }, [form])

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        // detalle de la convocatoria
        const call = await apiGet<CallRow>(`/calls/${id}`)
        setData(call)
        setForm({
          code: call.code ?? '',
          title: call.title ?? '',
          description: call.description ?? '',
          start_date: call.start_date ?? '',
          end_date: call.end_date ?? '',
        })
        // métricas rápidas (si no existe el endpoint en tu backend, puedes omitir esta llamada)
        try {
          const s = await apiGet<StatRes>(`/calls/${id}/stats`)
          setStats(s)
        } catch {
          setStats(null)
        }
      } catch (e: any) {
        setError(e.message ?? 'No fue posible cargar la convocatoria')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !canSave) return
    setSaving(true)
    setMsg(null)
    setError(null)
    try {
      const payload = {
        code: form.code.trim(),
        title: form.title.trim(),
        description: emptyToNull(form.description),
        start_date: form.start_date,
        end_date: form.end_date,
      }
      const updated = await apiPatch<CallRow>(`/calls/${id}`, payload)
      setData(updated)
      setEdit(false)
      setMsg('Convocatoria actualizada correctamente.')
    } catch (e: any) {
      setError(e.message ?? 'No se pudo actualizar la convocatoria')
    } finally {
      setSaving(false)
    }
  }

  async function onClone() {
    if (!data) return
    setSaving(true)
    setMsg(null)
    setError(null)
    try {
      // Endpoint sugerido: POST /calls/:id/clone { code, title, start_date, end_date }
      // Si no lo tienes aún, puedes implementar luego en backend.
      const body = {
        code: suggestCloneCode(data.code),
        title: `${data.title} (Clon)`,
        start_date: data.start_date,
        end_date: data.end_date,
      }
      const created = await apiPost<CallRow>(`/calls/${data.id}/clone`, body)
      setMsg('Convocatoria clonada. Abriendo…')
      navigate(`/admin/calls/${created.id}`, { replace: true })
    } catch (e: any) {
      setError(e.message ?? 'No se pudo clonar la convocatoria')
    } finally {
      setSaving(false)
    }
  }

  async function onCloseManually() {
    if (!data || !id) return
    if (!window.confirm('¿Estás seguro de cerrar esta convocatoria manualmente? Esta acción no se puede deshacer y dejará de aceptar postulaciones.')) {
      return
    }
    setSaving(true)
    setMsg(null)
    setError(null)
    try {
      const updated = await apiPatch<CallRow>(`/calls/${id}`, { status: 'CLOSED' })
      setData(updated)
      setMsg('Convocatoria cerrada manualmente.')
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cerrar la convocatoria')
    } finally {
      setSaving(false)
    }
  }

  const callStatus = data ? getCallStatus(data) : 'draft'

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl">
        {/* Breadcrumb + acciones */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link to="/admin/calls" className="text-sm text-sky-700 hover:underline">
            ← Volver a convocatorias
          </Link>
          <div className="ml-auto flex flex-wrap gap-2">
            {callStatus === 'active' && (
              <button
                onClick={onCloseManually}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-600 rounded-lg transition-colors"
                title="Cerrar convocatoria manualmente"
              >
                <XCircle className="w-4 h-4" />
                Cerrar manualmente
              </button>
            )}
            <button
              onClick={() => setEdit((v) => !v)}
              className="btn"
            >
              {edit ? 'Cancelar edición' : 'Editar'}
            </button>
            <button
              onClick={onClone}
              disabled={saving}
              className="btn"
              title="Clonar convocatoria"
            >
              {saving ? 'Clonando…' : 'Clonar'}
            </button>
          </div>
        </div>

        {/* Encabezado */}
        <header className="mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">
                  {data ? data.title : 'Cargando…'}
                </h1>
                <p className="text-slate-600 mt-1">
                  Año/Código: <span className="font-mono font-medium">{data?.code ?? '—'}</span>
                </p>
                {data?.description && (
                  <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                    {data.description}
                  </p>
                )}
              </div>
              {data && (
                <div className="flex flex-col gap-2 sm:items-end">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                    callStatus === 'draft' ? 'bg-slate-100 text-slate-700' :
                    callStatus === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                    callStatus === 'active' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {callStatus === 'active' && <Clock className="w-4 h-4" />}
                    {callStatus === 'draft' && 'Borrador'}
                    {callStatus === 'upcoming' && 'Próxima'}
                    {callStatus === 'active' && 'Activa'}
                    {callStatus === 'closed' && 'Cerrada'}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{fmtDate(data.start_date)} → {fmtDate(data.end_date)}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Alert para estados especiales */}
            {data && callStatus === 'upcoming' && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Convocatoria programada</p>
                  <p className="text-blue-700 mt-0.5">
                    Se activará automáticamente el {new Date(data.start_date).toLocaleDateString('es-CL', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}.
                  </p>
                </div>
              </div>
            )}
            {data && callStatus === 'active' && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                <Clock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Convocatoria activa</p>
                  <p className="text-green-700 mt-0.5">
                    Aceptando postulaciones hasta el {new Date(data.end_date).toLocaleDateString('es-CL', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}. Puedes cerrarla manualmente si es necesario.
                  </p>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Mensajes */}
        {msg && (
          <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {msg}
          </div>
        )}
        {error && (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Cuerpo */}
        {loading ? (
          <div className="card">
            <div className="card-body">
              <p className="text-slate-600">Cargando…</p>
            </div>
          </div>
        ) : !data ? (
          <div className="card border-rose-200">
            <div className="card-body">
              <p className="text-sm text-rose-700">No se encontró la convocatoria.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_20rem]">
            {/* Columna principal */}
            <section className="space-y-6">
              {/* Edición */}
              <div className="card">
                <div className="card-body">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Datos de la convocatoria</h2>
                  </div>

                  {!edit ? (
                    <DisplayCall call={data} />
                  ) : (
                    <form onSubmit={onSave} className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Código *</label>
                        <input
                          type="text"
                          value={form.code}
                          onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                          className="input"
                          placeholder="Ej: 2026-REGULAR"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Título *</label>
                        <input
                          type="text"
                          value={form.title}
                          onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                          className="input"
                          placeholder="Becas FCG 2026 (Regular)"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-sm font-medium">Descripción</label>
                        <textarea
                          value={form.description}
                          onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                          className="input min-h-[96px]"
                          placeholder="Notas o descripción pública…"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Fecha inicio *</label>
                        <input
                          type="date"
                          value={form.start_date}
                          onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))}
                          className="input"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Fecha término *</label>
                        <input
                          type="date"
                          value={form.end_date}
                          onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))}
                          className="input"
                        />
                      </div>
                      <div className="sm:col-span-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setEdit(false)} className="btn">
                          Cancelar
                        </button>
                        <button type="submit" disabled={!canSave || saving} className="btn-primary">
                          {saving ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Accesos relacionados */}
              <div className="card">
                <div className="card-body">
                  <h3 className="mb-2 text-base font-semibold">Accesos relacionados</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Link className="btn" to={`/admin/invites?callId=${data.id}`}>
                      Invitaciones de esta convocatoria
                    </Link>
                    <Link className="btn" to={`/admin/applications?callId=${data.id}`}>
                      Postulaciones de esta convocatoria
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* Columna lateral (stats) */}
            <aside className="space-y-4">
              <div className="card">
                <div className="card-body">
                  <h3 className="mb-2 text-base font-semibold">Métricas rápidas</h3>
                  {!stats ? (
                    <p className="text-sm text-slate-600">Sin datos.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Stat label="Postulantes" value={stats.applicants ?? 0} />
                      <Stat label="Postulaciones" value={stats.applications ?? 0} />
                      <Stat label="Enviadas" value={stats.submitted ?? 0} />
                      <Stat label="En revisión" value={stats.in_review ?? 0} />
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3 text-xs text-slate-600">
                Recuerda: las convocatorias son independientes por año. Usar “Clonar” te permite
                reutilizar el formulario como base sin modificar el original.
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============== subcomponentes ============== */

function DisplayCall({ call }: { call: CallRow }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Código" value={<code className="font-mono">{call.code}</code>} />
      <Field label="Título" value={call.title} />
      <Field
        label="Vigencia"
        value={
          <span>
            {fmtDate(call.start_date)} — {fmtDate(call.end_date)}
          </span>
        }
      />
      <Field
        label="Estado"
        value={
          <span className={'badge ' + (isActive(call.start_date, call.end_date) ? 'badge-success' : 'badge-neutral')}>
            {isActive(call.start_date, call.end_date) ? 'Activa' : 'Inactiva'}
          </span>
        }
      />
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium">Descripción</label>
        <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">
          {call.description?.trim() ? call.description : <span className="text-slate-500">—</span>}
        </div>
      </div>
      <Field
        label="Creada"
        value={call.created_at ? new Date(call.created_at).toLocaleString() : '—'}
      />
      <Field
        label="Actualizada"
        value={call.updated_at ? new Date(call.updated_at).toLocaleString() : '—'}
      />
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm text-slate-800">{value}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{formatNumber(value)}</div>
    </div>
  )
}

/* ============== utils ============== */

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString()
  } catch {
    return d
  }
}

function isActive(start: string, end: string) {
  const today = new Date().setHours(0, 0, 0, 0)
  const s = new Date(start).setHours(0, 0, 0, 0)
  const e = new Date(end).setHours(23, 59, 59, 999)
  return today >= s && today <= e
}

function formatNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? new Intl.NumberFormat().format(n) : '—'
}

function emptyToNull(v: string) {
  const t = v.trim()
  return t === '' ? null : t
}

function suggestCloneCode(code: string) {
  // ejemplo simple: si es "2025-REGULAR" propone "2026-REGULAR"
  const m = code.match(/^(\d{4})(-.+)?$/)
  if (!m) return `${code}-CLONE`
  const year = Number(m[1])
  if (!Number.isFinite(year)) return `${code}-CLONE`
  return `${year + 1}${m[2] ?? ''}`
}
