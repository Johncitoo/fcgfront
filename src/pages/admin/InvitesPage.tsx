import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../../lib/api'
import BulkInviteModal from '../../components/admin/BulkInviteModal'

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
    // cargar opciones de convocatorias para filtros/select
    ;(async () => {
      try {
        const res = await apiGet<ListResponse<CallOption> | CallOption[]>('/calls?limit=200')
        const list = Array.isArray(res) ? res : res.data ?? []
        // ordenar por fecha inicio desc si hay
        list.sort((a: CallOption, b: CallOption) => (a.start_date < b.start_date ? 1 : -1))
        setCalls(list)
      } catch {
        setCalls([])
      }
    })()
  }, [])

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
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (q.trim()) params.set('q', q.trim())
      if (callId.trim()) params.set('callId', callId.trim())

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
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header + acciones */}
        <header className="mb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Invitaciones</h1>
              <p className="text-slate-600">
                Genera códigos y gestiona invitaciones por convocatoria.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setCreateOpen(true)}
                className="btn-secondary"
              >
                + Nueva invitación
              </button>
              <button
                onClick={() => setBulkOpen(true)}
                className="btn-secondary"
              >
                📥 Importar correos
              </button>
              <button
                onClick={() => setBulkSendOpen(true)}
                disabled={!callId}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
                title={
                  callId
                    ? `Enviar invitaciones masivas${stats ? ` (pendientes: ${stats.pending})` : ''}`
                    : 'Selecciona una convocatoria para enviar invitaciones masivas'
                }
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Invitación masiva{stats ? ` (${stats.pending})` : ''}
              </button>
            </div>
          </div>

          {/* Panel de estadísticas (solo si hay convocatoria seleccionada) */}
          {stats && callId && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-600 font-medium">Total creadas</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-xs text-emerald-700 font-medium">Emails enviados</div>
                <div className="text-2xl font-bold text-emerald-900 mt-1">{stats.sent}</div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="text-xs text-amber-700 font-medium">Pendientes envío</div>
                <div className="text-2xl font-bold text-amber-900 mt-1">{stats.pending}</div>
              </div>
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                <div className="text-xs text-sky-700 font-medium">Códigos usados</div>
                <div className="text-2xl font-bold text-sky-900 mt-1">{stats.used}</div>
              </div>
            </div>
          )}
        </header>

        {/* Filtros responsive */}
        <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_18rem_auto]">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por correo…"
            className="input"
          />
          <select
            value={callId}
            onChange={(e) => setCallId(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Todas las convocatorias</option>
            {calls.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.year})
              </option>
            ))}
          </select>
          <button onClick={applyFilters} className="btn">
            Aplicar
          </button>
        </section>

        {/* Tabla / tarjetas */}
        <div className="card">
          <div className="card-body">
            {loading ? (
              <p className="text-slate-600">Cargando…</p>
            ) : error ? (
              <p className="text-sm text-rose-700">{error}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-slate-600">No hay invitaciones para los filtros actuales.</p>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-sm">
                    <thead className="text-left text-slate-600">
                      <tr className="border-b">
                        <th className="py-2 pr-3">Postulante</th>
                        <th className="py-2 pr-3">Email</th>
                        <th className="py-2 pr-3">Convocatoria</th>
                        <th className="py-2 pr-3">Email enviado</th>
                        <th className="py-2 pr-3">Código usado</th>
                        <th className="py-2">Creada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 !text-slate-900">
                            {r.firstName || r.lastName 
                              ? `${r.firstName || ''} ${r.lastName || ''}`.trim()
                              : '—'}
                          </td>
                          <td className="py-2 pr-3 !text-slate-700">{r.email}</td>
                          <td className="py-2 pr-3 !text-slate-700">
                            {calls.find((c) => c.id === r.call_id)?.name ?? '—'}
                          </td>
                          <td className="py-2 pr-3 !text-slate-700">
                            <span
                              className={'badge ' + (r.emailSent ? 'badge-success' : 'badge-warning')}
                            >
                              {r.emailSent ? 'Enviado' : 'Pendiente'}
                            </span>
                            {r.sentAt && (
                              <div className="text-xs text-slate-500 mt-1">
                                {new Date(r.sentAt).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </td>
                          <td className="py-2 pr-3 !text-slate-700">
                            <span
                              className={'badge ' + (r.used ? 'badge-info' : 'badge-neutral')}
                            >
                              {r.used ? 'Usado' : 'No usado'}
                            </span>
                            {r.used_at && (
                              <div className="text-xs text-slate-500 mt-1">
                                {new Date(r.used_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </td>
                          <td className="py-2 !text-slate-700">
                            {new Date(r.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="space-y-3 lg:hidden">
                  {rows.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="text-sm font-semibold !text-slate-900">{r.email}</div>
                        <span className={'badge ' + (r.used ? 'badge-success' : 'badge-neutral')}>
                          {r.used ? 'Usada' : 'No usada'}
                        </span>
                      </div>
                      <div className="text-xs !text-slate-700">
                        Convocatoria:{' '}
                        <span className="font-mono">
                          {calls.find((c) => c.id === r.call_id)?.name ?? '—'}
                        </span>
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-xs !text-slate-700">
                        <div>
                          <div className="!text-slate-600">Usada en</div>
                          <div>{r.used_at ? new Date(r.used_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
                        </div>
                        <div>
                          <div className="!text-slate-600">Creada</div>
                          <div>{new Date(r.created_at).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
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

      {/* Modal — crear una invitación */}
      {createOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="text-base font-semibold">Nueva invitación</div>
              <button
                onClick={() => setCreateOpen(false)}
                className="btn"
                aria-label="Cerrar"
              >
                Cerrar
              </button>
            </div>
            <form onSubmit={onCreate} className="px-5 py-4 space-y-3">
              {createErr && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {createErr}
                </div>
              )}
              {createSuccess && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {createSuccess}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-medium">Correo del postulante *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                  className="input"
                  placeholder="alumno@colegio.cl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Convocatoria *</label>
                <select
                  value={createForm.call_id}
                  onChange={(e) => setCreateForm((s) => ({ ...s, call_id: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Selecciona</option>
                  {calls.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.year})
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="btn">
                  Cancelar
                </button>
                <button type="submit" disabled={createSaving} className="btn-primary">
                  {createSaving ? 'Creando…' : 'Crear'}
                </button>
              </div>
              <p className="pt-2 text-xs text-slate-500">
                Se generará un código único (solo se almacena su hash en el backend).
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Modal — importación de correos */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="text-base font-semibold">Importar correos para invitaciones</div>
              <button onClick={() => setBulkOpen(false)} className="btn" aria-label="Cerrar">
                Cerrar
              </button>
            </div>
            <form onSubmit={onBulk} className="px-5 py-4 space-y-3">
              {bulkErr && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {bulkErr}
                </div>
              )}
              {bulkOk && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {bulkOk}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium">Convocatoria *</label>
                <select
                  value={bulkCallId}
                  onChange={(e) => setBulkCallId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Selecciona</option>
                  {calls.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.year})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Correos (uno por línea o separados por coma/espacio) *</label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="input min-h-[160px]"
                  placeholder={`ejemplo1@colegio.cl
ejemplo2@dominio.cl, ejemplo3@dominio.cl`}
                />
                <p className="text-xs text-slate-500">
                  Limpiaremos entradas repetidas y correos inválidos antes de enviar al backend.
                </p>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setBulkOpen(false)} className="btn">
                  Cancelar
                </button>
                <button type="submit" disabled={bulkSaving} className="btn-primary">
                  {bulkSaving ? 'Procesando…' : 'Crear invitaciones'}
                </button>
              </div>

              <div className="rounded-md border bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-semibold">Nota:</p>
                <ul className="list-disc pl-5">
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
