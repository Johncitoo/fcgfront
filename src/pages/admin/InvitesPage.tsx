import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/api'
import BulkInviteModal from '../../components/admin/BulkInviteModal'
import { Mail, Send, Upload, UserPlus } from 'lucide-react'
import { useCall } from '../../contexts/CallContext'

interface CallOption {
  id: string
  name: string
  year: number
  status: string
  start_date: string
  end_date: string
}

interface InviteRow {
  id: string
  email: string
  call_id: string
  code_hash: string
  used: boolean
  used_at?: string | null
  created_at: string
  emailSent?: boolean
  sentAt?: string | null
  firstName?: string
  lastName?: string
}

interface InviteStats {
  total: number
  sent: number
  pending: number
  used: number
  lastSentAt?: string | null
}

interface ListResponse<T> {
  data: T[]
  meta?: { total: number; limit: number; offset: number }
}

// Genera código único de 8 caracteres alfanuméricos
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Sin O, 0, I, 1 para evitar confusión
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function InvitesPage() {
  const { selectedCallId, selectedCall, calls: ctxCalls } = useCall()
  const [sp, setSp] = useSearchParams()
  const callIdFromQuery = sp.get('callId') ?? ''

  // filtros/paginación
  const [q, setQ] = useState('')
  const [callId, setCallId] = useState(callIdFromQuery)
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)

  // dataset
  const [calls, setCalls] = useState<CallOption[]>([])
  const [rows, setRows] = useState<InviteRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<InviteStats | null>(null)

  // crear (uno) y carga masiva
  const [createOpen, setCreateOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkSendOpen, setBulkSendOpen] = useState(false)

  const [createSaving, setCreateSaving] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    email: '',
    call_id: callIdFromQuery || '',
  })

  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkErr, setBulkErr] = useState<string | null>(null)
  const [bulkOk, setBulkOk] = useState<string | null>(null)
  const [bulkText, setBulkText] = useState('') // emails separados por coma, espacio o newline
  const [bulkCallId, setBulkCallId] = useState(callIdFromQuery || '')

  const deps = useMemo(() => ({ q, callId, limit, offset }), [q, callId, limit, offset])

  useEffect(() => {
    // usar convocatorias del contexto y filtrar solo activas
    const active = ctxCalls.filter((c) => c.status === 'OPEN') as CallOption[]
    const list = active.length > 0 ? active : (ctxCalls as CallOption[])
    list.sort((a: CallOption, b: CallOption) => (a.start_date < b.start_date ? 1 : -1))
    setCalls(list)
  }, [ctxCalls])

  useEffect(() => {
    if (selectedCallId && callId !== selectedCallId) {
      setCallId(selectedCallId)
    }
    if (selectedCallId && createForm.call_id !== selectedCallId) {
      setCreateForm((s) => ({ ...s, call_id: selectedCallId }))
    }
    if (selectedCallId && bulkCallId !== selectedCallId) {
      setBulkCallId(selectedCallId)
    }
  }, [selectedCallId])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps])

  useEffect(() => {
    // Cargar estadísticas cuando cambia la convocatoria seleccionada
    if (callId) {
      loadStats()
    } else {
      setStats(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      if (!callId) {
        setRows([])
        setTotal(0)
        return
      }
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (q.trim()) params.set('q', q.trim())
      params.set('callId', callId.trim())

      const res = await apiGet<ListResponse<InviteRow> | InviteRow[]>(
        `/invites?${params.toString()}`,
      )

      if (Array.isArray(res)) {
        setRows(res)
        setTotal(res.length)
      } else {
        setRows(res.data ?? [])
        setTotal(res.meta?.total ?? (res.data ?? []).length)
      }
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar el listado de invitaciones')
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    if (!callId) return
    
    try {
      const res = await apiGet<InviteStats>(`/invites/stats/${callId}`)
      setStats(res)
    } catch (e: any) {
      console.error('Error cargando estadísticas:', e)
      setStats(null)
    }
  }

  function applyFilters() {
    setOffset(0)
    if (!callId) return
    // reflejar callId en la URL para deep-link
    const n = new URLSearchParams(sp)
    if (callId) n.set('callId', callId)
    else n.delete('callId')
    setSp(n, { replace: true })
    load()
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateErr(null)
    setCreateSuccess(null)
    setCreateSaving(true)
    try {
      if (!createForm.email.trim()) throw new Error('El correo es obligatorio')
      if (!createForm.call_id.trim()) throw new Error('Selecciona una convocatoria')
      
      // Generar código único de 8 caracteres alfanuméricos
      const code = generateInviteCode()
      
      await apiPost('/invites', {
        email: createForm.email.trim(),
        callId: createForm.call_id.trim(),
        code,
        sendEmail: true, // Enviar email automáticamente
      })
      
      setCreateSuccess(`✅ Invitación creada y enviada a ${createForm.email}`)
      setCreateForm({ email: '', call_id: callId || '' })
      setOffset(0)
      await load()
      
      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        setCreateOpen(false)
        setCreateSuccess(null)
      }, 2000)
    } catch (e: any) {
      setCreateErr(e.message ?? 'No fue posible crear la invitación')
    } finally {
      setCreateSaving(false)
    }
  }

  async function onBulk(e: React.FormEvent) {
    e.preventDefault()
    setBulkErr(null)
    setBulkOk(null)
    setBulkSaving(true)
    try {
      const emails = parseEmails(bulkText)
      if (emails.length === 0) throw new Error('Ingresa al menos un correo válido')
      if (!bulkCallId.trim()) throw new Error('Selecciona una convocatoria')

      // endpoint sugerido: /invites/bulk  { callId, emails: string[] }
      const res = await apiPost<{ created: number; duplicates?: number; invalid?: number }>(
        '/invites/bulk',
        { callId: bulkCallId.trim(), emails },
      )
      setBulkOk(
        `Invitaciones creadas: ${res.created}. Duplicados: ${res.duplicates ?? 0}. Inválidos: ${res.invalid ?? 0}.`,
      )
      setOffset(0)
      await load()
    } catch (e: any) {
      setBulkErr(e.message ?? 'No fue posible crear invitaciones masivas')
    } finally {
      setBulkSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header moderno + acciones */}
        <header className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Invitaciones</h1>
                <p className="text-sm text-slate-500">
                  Genera códigos y gestiona invitaciones por convocatoria
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                Nueva invitación
              </button>
              <button
                onClick={() => setBulkOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <Upload className="w-4 h-4" />
                Importar correos
              </button>
              <button
                onClick={() => setBulkSendOpen(true)}
                disabled={!callId}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-sky-600 rounded-xl hover:from-sky-600 hover:to-sky-700 transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  callId
                    ? `Enviar invitaciones masivas${stats ? ` (pendientes: ${stats.pending})` : ''}`
                    : 'Selecciona una convocatoria para enviar invitaciones masivas'
                }
              >
                <Send className="w-4 h-4" />
                Invitación masiva{stats ? ` (${stats.pending})` : ''}
              </button>
            </div>
          </div>

          {/* Panel de estadísticas modernizado (solo si hay convocatoria seleccionada) */}
          {stats && callId && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-4 shadow-sm">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Total creadas</div>
                <div className="text-3xl font-bold text-slate-900 mt-2">{stats.total}</div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 shadow-sm">
                <div className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Emails enviados</div>
                <div className="text-3xl font-bold text-emerald-700 mt-2">{stats.sent}</div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 shadow-sm">
                <div className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Pendientes envío</div>
                <div className="text-3xl font-bold text-amber-700 mt-2">{stats.pending}</div>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100/50 p-4 shadow-sm">
                <div className="text-xs text-sky-600 font-semibold uppercase tracking-wide">Códigos usados</div>
                <div className="text-3xl font-bold text-sky-700 mt-2">{stats.used}</div>
              </div>
            </div>
          )}
        </header>

        {/* Filtros modernizados */}
        <section className="mb-6 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_18rem_auto]">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por correo…"
              className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
            />
            <select
              value={callId}
              onChange={(e) => setCallId(e.target.value)}
              className="rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:border-slate-300 transition-colors focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
            >
              {calls.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.year})
                </option>
              ))}
            </select>
            <button onClick={applyFilters} className="rounded-xl border-2 border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all">
              Aplicar
            </button>
          </div>
        </section>

        {/* Tabla / tarjetas modernizada */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 animate-pulse"></div>
                <p className="text-slate-500 font-medium">Cargando invitaciones...</p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">No hay invitaciones para los filtros actuales</p>
                <p className="text-sm text-slate-400 mt-1">Crea una nueva invitación para comenzar</p>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-600">
                      <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50">
                        <th className="py-4 px-4 font-semibold">Postulante</th>
                        <th className="py-4 px-4 font-semibold">Email</th>
                        <th className="py-4 px-4 font-semibold">Convocatoria</th>
                        <th className="py-4 px-4 font-semibold">Email enviado</th>
                        <th className="py-4 px-4 font-semibold">Código usado</th>
                        <th className="py-4 px-4 font-semibold">Creada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-sky-50/30 transition-colors">
                          <td className="py-4 px-4 text-slate-900 font-medium">
                            {r.firstName || r.lastName 
                              ? `${r.firstName || ''} ${r.lastName || ''}`.trim()
                              : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="py-4 px-4 text-slate-700">{r.email}</td>
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                              {calls.find((c) => c.id === r.call_id)?.name ?? '—'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${
                              r.emailSent 
                                ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200' 
                                : 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border border-amber-200'
                            }`}>
                              {r.emailSent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                              {r.emailSent ? 'Enviado' : 'Pendiente'}
                            </span>
                            {r.sentAt && (
                              <div className="text-xs text-slate-500 mt-1">
                                {new Date(r.sentAt).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${
                              r.used 
                                ? 'bg-gradient-to-r from-sky-50 to-sky-100 text-sky-700 border border-sky-200' 
                                : 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {r.used ? 'Usado' : 'No usado'}
                            </span>
                            {r.used_at && (
                              <div className="text-xs text-slate-500 mt-1">
                                {new Date(r.used_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-slate-600 text-xs">
                            {new Date(r.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile modernizado */}
                <div className="space-y-3 lg:hidden">
                  {rows.map((r) => (
                    <div key={r.id} className="rounded-2xl border border-slate-200 p-4 bg-gradient-to-br from-white to-slate-50/50 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-bold text-slate-900">{r.email}</div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${
                          r.used 
                            ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200' 
                            : 'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {r.used ? 'Usada' : 'No usada'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        Convocatoria:{' '}
                        <span className="font-medium text-slate-700">
                          {calls.find((c) => c.id === r.call_id)?.name ?? '—'}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs bg-slate-50 rounded-xl p-3">
                        <div>
                          <div className="text-slate-500 mb-1">Usada en</div>
                          <div className="text-slate-700 font-medium">{r.used_at ? new Date(r.used_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-1">Creada</div>
                          <div className="text-slate-700 font-medium">{new Date(r.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    </div>
                  ))}
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
              disabled={offset + limit >= total}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="px-4 py-2 text-slate-600 font-medium bg-slate-100 rounded-xl">
              {total > 0
                ? `${Math.min(total, offset + 1)}–${Math.min(total, offset + rows.length)} de ${total}`
                : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Modal — crear una invitación modernizado */}
      {createOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/25">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Nueva invitación</h2>
              </div>
              <button
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border-2 border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={onCreate} className="px-6 py-5 space-y-4">
              {createErr && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
                  {createErr}
                </div>
              )}
              {createSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-medium">
                  {createSuccess}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Correo del postulante *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                  placeholder="alumno@colegio.cl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Convocatoria *</label>
                <select
                  value={createForm.call_id}
                  onChange={(e) => setCreateForm((s) => ({ ...s, call_id: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:border-slate-300 transition-colors focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                >
                  {calls.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.year})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setCreateOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={createSaving} className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-sky-600 rounded-xl hover:from-sky-600 hover:to-sky-700 transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
                  {createSaving ? 'Creando…' : 'Crear invitación'}
                </button>
              </div>
              <p className="pt-2 text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
                💡 Se generará un código único y se enviará automáticamente al postulante.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Modal — importación de correos modernizado */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/25">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Importar correos para invitaciones</h2>
              </div>
              <button onClick={() => setBulkOpen(false)} className="rounded-xl border-2 border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all" aria-label="Cerrar">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={onBulk} className="px-6 py-5 space-y-4">
              {bulkErr && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
                  {bulkErr}
                </div>
              )}
              {bulkOk && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-medium">
                  {bulkOk}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Convocatoria *</label>
                <select
                  value={bulkCallId}
                  onChange={(e) => setBulkCallId(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:border-slate-300 transition-colors focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                >
                  {calls.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.year})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Correos (uno por línea o separados por coma/espacio) *</label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300 min-h-[160px] resize-y"
                  placeholder={`ejemplo1@colegio.cl
ejemplo2@dominio.cl, ejemplo3@dominio.cl`}
                />
                <p className="text-xs text-slate-500">
                  Limpiaremos entradas repetidas y correos inválidos antes de enviar al backend.
                </p>
              </div>

              <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setBulkOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={bulkSaving} className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
                  {bulkSaving ? 'Procesando…' : 'Crear invitaciones'}
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                <p className="font-bold text-slate-700 mb-2">💡 Nota importante:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>No se almacena el código en claro; solo su hash.</li>
                  <li>
                    Este módulo <strong>solo crea</strong> invitaciones. Para enviar correos masivos usa el botón
                    <strong> “Invitación masiva”</strong> (arriba) que envía automáticamente a quienes no han recibido invitación.
                  </li>
                </ul>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — envío masivo de emails */}
      {bulkSendOpen && callId && (
        <BulkInviteModal
          callId={callId}
          callName={calls.find((c) => c.id === callId)?.name || 'Convocatoria seleccionada'}
          onClose={() => setBulkSendOpen(false)}
          onSuccess={() => {
            load()
            loadStats()
          }}
        />
      )}
    </div>
  )
}

/* =================== utils =================== */

function parseEmails(input: string): string[] {
  const raw = input
    .split(/[\s,;]+/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const unique = Array.from(new Set(raw))
  return unique.filter(isEmail)
}

function isEmail(s: string) {
  // Regex simple y suficiente para front; backend validará formalmente.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}
