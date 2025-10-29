import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGet, apiPost, apiPatch } from '../../lib/api'

type AppStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'NEEDS_FIX' | 'APPROVED' | 'REJECTED'

interface ApplicationDTO {
  id: string
  applicant_id: string
  call_id: string
  institution_id?: string | null
  status: AppStatus
  score?: number | null
  submitted_at?: string | null
  decided_at?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string

  // decorados opcionales desde backend
  applicant_email?: string
  applicant_name?: string
  call_code?: string
  institution_name?: string | null

  // Resumen rápido del formulario (opcional)
  summary?: Record<string, any> | null
}

interface HistoryRow {
  id: string
  application_id: string
  from_status?: AppStatus | null
  to_status: AppStatus
  reason?: string | null
  changed_by?: string | null // user id o nombre (si backend lo decora)
  changed_at: string
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [app, setApp] = useState<ApplicationDTO | null>(null)
  const [hist, setHist] = useState<HistoryRow[]>([])
  const [tab, setTab] = useState<'overview' | 'history' | 'notes'>('overview')

  // edición básica de score/notes
  const [score, setScore] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // acciones de estado
  const [fixOpen, setFixOpen] = useState(false)
  const [fixReason, setFixReason] = useState('')
  const [actionErr, setActionErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const status = app?.status
  const canMove = useMemo(() => buildTransitions(status), [status])

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiGet<ApplicationDTO>(`/applications/${id}`)
        setApp(data)
        setScore(data.score != null ? String(data.score) : '')
        setNotes(data.notes ?? '')

        try {
          const h = await apiGet<HistoryRow[]>(`/applications/${id}/history`)
          setHist(h)
        } catch {
          setHist([])
        }
      } catch (e: any) {
        setError(e.message ?? 'No se pudo cargar la postulación')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  async function saveMeta(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    setMsg(null)
    setError(null)
    try {
      const body: any = {
        score: score.trim() === '' ? null : Number(score),
        notes: notes.trim() === '' ? null : notes.trim(),
      }
      const updated = await apiPatch<ApplicationDTO>(`/applications/${id}`, body)
      setApp(updated)
      setMsg('Cambios guardados.')
    } catch (e: any) {
      setError(e.message ?? 'No se pudieron guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  async function doTransition(kind: 'submit' | 'in_review' | 'approve' | 'reject') {
    if (!id) return
    setSaving(true)
    setActionErr(null)
    setMsg(null)
    try {
      let endpoint = ''
      let payload: any = {}
      switch (kind) {
        case 'submit':
          endpoint = `/applications/${id}/submit`
          break
        case 'in_review':
          endpoint = `/applications/${id}/start-review`
          break
        case 'approve':
          endpoint = `/applications/${id}/approve`
          break
        case 'reject':
          endpoint = `/applications/${id}/reject`
          break
      }
      const updated = await apiPost<ApplicationDTO>(endpoint, payload)
      setApp(updated)
      await reloadHistory(id)
      setMsg('Estado actualizado correctamente.')
    } catch (e: any) {
      setActionErr(e.message ?? 'No fue posible cambiar el estado')
    } finally {
      setSaving(false)
    }
  }

  async function requestFix() {
    if (!id) return
    if (!fixReason.trim()) {
      setActionErr('Indica un motivo para solicitar correcciones.')
      return
    }
    setSaving(true)
    setActionErr(null)
    setMsg(null)
    try {
      const updated = await apiPost<ApplicationDTO>(`/applications/${id}/request-fix`, {
        reason: fixReason.trim(),
      })
      setApp(updated)
      await reloadHistory(id)
      setFixOpen(false)
      setFixReason('')
      setMsg('Se solicitó corrección al postulante.')
    } catch (e: any) {
      setActionErr(e.message ?? 'No fue posible solicitar correcciones')
    } finally {
      setSaving(false)
    }
  }

  async function reloadHistory(appId: string) {
    try {
      const h = await apiGet<HistoryRow[]>(`/applications/${appId}/history`)
      setHist(h)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link to="/admin/applications" className="text-sm text-sky-700 hover:underline">
            ← Volver a postulaciones
          </Link>
          {app?.call_id && (
            <Link
              to={`/admin/calls/${app.call_id}`}
              className="text-sm text-sky-700 hover:underline"
            >
              Ver convocatoria
            </Link>
          )}
        </div>

        {/* Header */}
        <header className="mb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Postulación</h1>
              <p className="text-slate-600">
                {app ? (
                  <>
                    <span className="font-medium">{app.applicant_name || '—'}</span>{' '}
                    <span className="text-slate-500">({app.applicant_email || '—'})</span> —{' '}
                    <span className="font-mono">{app.call_code || shortId(app.call_id)}</span>
                  </>
                ) : (
                  'Cargando…'
                )}
              </p>
            </div>
            {app && (
              <div className="flex items-center gap-2">
                <StatusBadge status={app.status} />
                {app.submitted_at && (
                  <span className="rounded-md border bg-white px-2 py-1 text-xs text-slate-600">
                    Enviada: {new Date(app.submitted_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* alerts */}
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
        {actionErr && (
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {actionErr}
          </div>
        )}

        {/* body */}
        {loading ? (
          <div className="card">
            <div className="card-body">
              <p className="text-slate-600">Cargando…</p>
            </div>
          </div>
        ) : !app ? (
          <div className="card border-rose-200">
            <div className="card-body">
              <p className="text-sm text-rose-700">No se encontró la postulación.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Acciones de estado */}
            <section className="mb-4">
              <div className="flex flex-wrap gap-2">
                {canMove.to_in_review && (
                  <button
                    onClick={() => doTransition('in_review')}
                    disabled={saving}
                    className="btn"
                  >
                    {saving ? 'Procesando…' : 'Mover a revisión'}
                  </button>
                )}
                {canMove.request_fix && (
                  <button onClick={() => setFixOpen(true)} className="btn">
                    Solicitar correcciones
                  </button>
                )}
                {canMove.approve && (
                  <button
                    onClick={() => doTransition('approve')}
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? 'Procesando…' : 'Aprobar'}
                  </button>
                )}
                {canMove.reject && (
                  <button
                    onClick={() => doTransition('reject')}
                    disabled={saving}
                    className="btn border-rose-300 text-rose-700"
                  >
                    {saving ? 'Procesando…' : 'Rechazar'}
                  </button>
                )}
                {canMove.submit && (
                  <button
                    onClick={() => doTransition('submit')}
                    disabled={saving}
                    className="btn"
                    title="Forzar envío (útil solo para pruebas)"
                  >
                    {saving ? 'Procesando…' : 'Forzar SUBMIT'}
                  </button>
                )}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
              {/* principal */}
              <section className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')}>
                    Resumen
                  </TabBtn>
                  <TabBtn active={tab === 'history'} onClick={() => setTab('history')}>
                    Historial
                  </TabBtn>
                  <TabBtn active={tab === 'notes'} onClick={() => setTab('notes')}>
                    Puntaje / Notas
                  </TabBtn>
                </div>

                {tab === 'overview' && (
                  <div className="card">
                    <div className="card-body">
                      <h3 className="mb-2 text-base font-semibold">Resumen de formulario</h3>
                      {app.summary && Object.keys(app.summary).length > 0 ? (
                        <SummaryGrid data={app.summary} />
                      ) : (
                        <p className="text-sm text-slate-600">
                          No hay resumen disponible. Abre la vista completa en{' '}
                          <Link
                            to={`/reviewer/application/${app.id}`}
                            className="text-sky-700 hover:underline"
                          >
                            Revisor
                          </Link>
                          .
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {tab === 'history' && (
                  <div className="card">
                    <div className="card-body">
                      <h3 className="mb-2 text-base font-semibold">Historial de estados</h3>
                      {hist.length === 0 ? (
                        <p className="text-sm text-slate-600">Sin cambios registrados.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-left text-slate-600">
                              <tr className="border-b">
                                <th className="py-2 pr-3">Desde</th>
                                <th className="py-2 pr-3">Hacia</th>
                                <th className="py-2 pr-3">Motivo</th>
                                <th className="py-2 pr-3">Usuario</th>
                                <th className="py-2">Fecha</th>
                              </tr>
                            </thead>
                            <tbody>
                              {hist.map((h) => (
                                <tr key={h.id} className="border-b last:border-0">
                                  <td className="py-2 pr-3">{labelStatus(h.from_status)}</td>
                                  <td className="py-2 pr-3">
                                    <StatusBadge status={h.to_status} />
                                  </td>
                                  <td className="py-2 pr-3">{h.reason || '—'}</td>
                                  <td className="py-2 pr-3">{h.changed_by || '—'}</td>
                                  <td className="py-2">
                                    {new Date(h.changed_at).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {tab === 'notes' && (
                  <div className="card">
                    <div className="card-body">
                      <h3 className="mb-2 text-base font-semibold">Puntaje y notas</h3>
                      <form onSubmit={saveMeta} className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Puntaje</label>
                          <input
                            type="number"
                            step="0.01"
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            className="input"
                            placeholder="Ej: 87.5"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-sm font-medium">Notas internas</label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="input min-h-[120px]"
                            placeholder="Observaciones de la revisión…"
                          />
                        </div>
                        <div className="sm:col-span-2 flex justify-end gap-2">
                          <button type="submit" disabled={saving} className="btn-primary">
                            {saving ? 'Guardando…' : 'Guardar'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </section>

              {/* lateral */}
              <aside className="space-y-4">
                <div className="card">
                  <div className="card-body">
                    <h3 className="mb-2 text-base font-semibold">Datos</h3>
                    <KV label="Postulante" value={app.applicant_name || '—'} />
                    <KV label="Correo" value={app.applicant_email || '—'} />
                    <KV label="Convocatoria" value={app.call_code || shortId(app.call_id)} mono />
                    <KV label="Institución" value={app.institution_name || '—'} />
                    <KV
                      label="Actualizada"
                      value={app.updated_at ? new Date(app.updated_at).toLocaleString() : '—'}
                    />
                  </div>
                </div>

                <div className="rounded-lg border bg-white p-3 text-xs text-slate-600">
                  Cambios de estado quedan registrados en el historial y en la auditoría del sistema.
                </div>
              </aside>
            </div>
          </>
        )}
      </div>

      {/* Modal request-fix */}
      {fixOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="text-base font-semibold">Solicitar correcciones</div>
              <button onClick={() => setFixOpen(false)} className="btn" aria-label="Cerrar">
                Cerrar
              </button>
            </div>
            <div className="px-5 py-4">
              <label className="mb-1 block text-sm font-medium">Motivo *</label>
              <textarea
                value={fixReason}
                onChange={(e) => setFixReason(e.target.value)}
                className="input min-h-[120px]"
                placeholder="Describe qué debe corregir/reenviar el postulante…"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setFixOpen(false)} className="btn">
                  Cancelar
                </button>
                <button onClick={requestFix} disabled={saving} className="btn-primary">
                  {saving ? 'Enviando…' : 'Solicitar'}
                </button>
              </div>
              <p className="pt-2 text-xs text-slate-500">
                Se notificará al postulante y la postulación pasará a <strong>NEEDS_FIX</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* =================== subcomponentes / utils =================== */

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={
        'rounded-md border px-3 py-1.5 text-sm ' +
        (active ? 'bg-slate-100 border-slate-300' : 'hover:bg-slate-50')
      }
    >
      {children}
    </button>
  )
}

function KV({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="mb-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={'text-sm text-slate-800 ' + (mono ? 'font-mono' : '')}>{value}</div>
    </div>
  )
}

function SummaryGrid({ data }: { data: Record<string, any> }) {
  const entries = Object.entries(data)
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k} className="rounded-md border bg-white p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</div>
          <div className="mt-1 text-sm text-slate-800 break-words">
            {formatValue(v)}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatValue(v: any): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function shortId(id: string) {
  return id?.slice(0, 8) || '—'
}

function labelStatus(s?: AppStatus | null) {
  if (!s) return '—'
  const map: Record<AppStatus, string> = {
    DRAFT: 'Borrador',
    SUBMITTED: 'Enviada',
    IN_REVIEW: 'En revisión',
    NEEDS_FIX: 'Correcciones',
    APPROVED: 'Aprobada',
    REJECTED: 'Rechazada',
  }
  return map[s]
}

function StatusBadge({ status }: { status: AppStatus }) {
  const map: Record<AppStatus, string> = {
    DRAFT: 'badge-neutral',
    SUBMITTED: 'badge-sky',
    IN_REVIEW: 'badge-warning',
    NEEDS_FIX: 'badge-amber',
    APPROVED: 'badge-success',
    REJECTED: 'badge-danger',
  }
  return <span className={`badge ${map[status]}`}>{labelStatus(status)}</span>
}

function buildTransitions(current?: AppStatus | null) {
  const t = {
    to_in_review: false,
    request_fix: false,
    approve: false,
    reject: false,
    submit: false, // para pruebas
  }
  switch (current) {
    case 'DRAFT':
      t.submit = true
      break
    case 'SUBMITTED':
      t.to_in_review = true
      break
    case 'IN_REVIEW':
      t.request_fix = true
      t.approve = true
      t.reject = true
      break
    case 'NEEDS_FIX':
      // el postulante reenviará → SUBMITTED (acción del applicant, no desde admin)
      break
    default:
      break
  }
  return t
}
