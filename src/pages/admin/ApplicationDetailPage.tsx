import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGet, apiPost, apiPatch } from '../../lib/api'
import ReviewerFormModal from '../../components/ReviewerFormModal'

type AppStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'NEEDS_FIX' | 'APPROVED' | 'REJECTED'
type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'NEEDS_CHANGES'
type ReviewStatus = 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES' | 'PENDING_REVIEW'

interface ApplicationDTO {
  id: string
  applicantId: string
  callId: string
  institutionId?: string | null
  status: AppStatus
  score?: number | null
  submittedAt?: string | null
  decidedAt?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
  applicantEmail?: string
  applicantName?: string
  callCode?: string
  institutionName?: string | null
  summary?: Record<string, any> | null
}

interface HistoryRow {
  id: string
  applicationId: string
  fromStatus?: AppStatus | null
  toStatus: AppStatus
  reason?: string | null
  changedBy?: string | null
  changedAt: string
}

interface MilestoneProgress {
  mp_id: string
  milestoneId: string
  status: MilestoneStatus
  completedAt: string | null
  createdAt: string
  updatedAt: string
  reviewStatus: ReviewStatus | null
  reviewNotes: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  reviewerName: string | null
  milestoneName: string
  orderIndex: number
  whoCanFill: string | string[]  // Puede ser string o array
  milestoneStatus: string
  formId: string | null
  m_required: boolean
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [app, setApp] = useState<ApplicationDTO | null>(null)
  const [hist, setHist] = useState<HistoryRow[]>([])
  const [score, setScore] = useState('')
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [actionErr, setActionErr] = useState<string | null>(null)
  const [milestones, setMilestones] = useState<MilestoneProgress[]>([])
  const [reviewingMilestone, setReviewingMilestone] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [viewingAnswers, setViewingAnswers] = useState<string | null>(null)
  const [answers, setAnswers] = useState<any>(null)
  const [loadingAnswers, setLoadingAnswers] = useState(false)
  const [completingMilestone, setCompletingMilestone] = useState<MilestoneProgress | null>(null)

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
        try {
          const progressData = await apiGet<{ progress: MilestoneProgress[] }>(`/milestones/progress/${id}`)
          setMilestones(progressData.progress || [])
        } catch {
          setMilestones([])
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
      const body = {
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

  async function transition(endpoint: string, payload?: any) {
    if (!id) return
    setSaving(true)
    setActionErr(null)
    setMsg(null)
    try {
      const updated = await apiPost<ApplicationDTO>(`/applications/${id}/${endpoint}`, payload ?? {})
      setApp(updated)
      const h = await apiGet<HistoryRow[]>(`/applications/${id}/history`)
      setHist(h)
      setMsg('Estado actualizado correctamente.')
    } catch (e: any) {
      setActionErr(e.message ?? 'No fue posible cambiar el estado')
    } finally {
      setSaving(false)
    }
  }

  async function reviewMilestone(progressId: string, reviewStatus: ReviewStatus) {
    if (!id) return
    setSaving(true)
    setActionErr(null)
    setMsg(null)
    try {
      const currentUser = localStorage.getItem('userId') || '1b3234d7-f3f1-4407-8fc0-3d91eb344a76'
      
      await apiPatch(`/milestones/progress/${progressId}/review`, {
        reviewStatus,
        reviewNotes: reviewNotes.trim() || null,
        reviewedBy: currentUser,
      })
      
      const progressData = await apiGet<{ progress: MilestoneProgress[] }>(`/milestones/progress/${id}`)
      setMilestones(progressData.progress || [])
      
      setMsg(`Hito ${reviewStatus === 'APPROVED' ? 'aprobado' : reviewStatus === 'REJECTED' ? 'rechazado' : 'marcado para cambios'} correctamente.`)
      setReviewingMilestone(null)
      setReviewNotes('')
    } catch (e: any) {
      setActionErr(e.message ?? 'No se pudo revisar el hito')
    } finally {
      setSaving(false)
    }
  }

  async function loadAnswers(progressId: string) {
    setLoadingAnswers(true)
    setAnswers(null)
    try {
      const data = await apiGet(`/milestones/progress/${progressId}/submission`)
      setAnswers(data)
      setViewingAnswers(progressId)
    } catch (e: any) {
      setActionErr(e.message ?? 'No se pudieron cargar las respuestas')
    } finally {
      setLoadingAnswers(false)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link to="/admin/applications" className="text-sm text-sky-700 hover:underline">
            ← Volver a postulaciones
          </Link>
          {app?.callId && (
            <Link to={`/admin/calls/${app.callId}`} className="text-sm text-sky-700 hover:underline">
              Ver convocatoria
            </Link>
          )}
        </div>

        <header className="mb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Postulación</h1>
              <p className="text-slate-600">
                {app ? (
                  <>
                    <span className="font-medium">{app.applicantName || '—'}</span>{' '}
                    <span className="text-slate-500">({app.applicantEmail || '—'})</span> —{' '}
                    <span className="font-mono">{app.callCode || shortId(app.callId)}</span>
                  </>
                ) : (
                  'Cargando…'
                )}
              </p>
            </div>
            {app && <StatusBadge status={app.status} />}
          </div>
        </header>

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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
            <section className="space-y-4">
              <div className="card">
                <div className="card-body">
                  <div className="flex flex-wrap gap-2">
                    {app.status === 'SUBMITTED' && (
                      <button onClick={() => transition('start-review')} disabled={saving} className="btn">
                        {saving ? 'Procesando…' : 'Mover a revisión'}
                      </button>
                    )}
                    {app.status === 'IN_REVIEW' && (
                      <>
                        <button onClick={() => transition('request-fix', { reason: 'Faltan documentos' })} disabled={saving} className="btn">
                          {saving ? 'Procesando…' : 'Solicitar correcciones'}
                        </button>
                        <button onClick={() => transition('approve')} disabled={saving} className="btn-primary">
                          {saving ? 'Procesando…' : 'Aprobar'}
                        </button>
                        <button onClick={() => transition('reject')} disabled={saving} className="btn border-rose-300 text-rose-700">
                          {saving ? 'Procesando…' : 'Rechazar'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <h3 className="mb-3 text-base font-semibold">Hitos de la Postulación</h3>
                  {milestones.length === 0 ? (
                    <p className="text-sm text-slate-600">No hay hitos configurados para esta convocatoria.</p>
                  ) : (
                    <div className="space-y-3">
                      {milestones.map((m) => {
                        const isBlocked = m.status === 'REJECTED' && m.reviewNotes === 'Bloqueado por rechazo de hito anterior'
                        // whoCanFill puede ser string o array - normalizar a array
                        const canFillArray = Array.isArray(m.whoCanFill) ? m.whoCanFill : [m.whoCanFill]
                        const isApplicantFill = canFillArray.includes('APPLICANT')
                        const isReviewerFill = canFillArray.includes('REVIEWER')
                        
                        return (
                        <div key={m.mp_id} className={`rounded-lg border p-4 ${isBlocked ? 'bg-slate-50 opacity-60' : ''}`}>
                          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{m.milestoneName}</h4>
                                <span className="text-xs text-slate-500">
                                  ({isApplicantFill ? 'Postulante' : isReviewerFill ? 'Revisor' : 'Revisor/Admin'})
                                </span>
                                {m.m_required && <span className="text-xs text-rose-600">*Obligatorio</span>}
                                {isBlocked && <span className="text-xs text-slate-500">🔒 Bloqueado</span>}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                                <MilestoneStatusBadge status={m.status} />
                                {m.reviewStatus && <ReviewStatusBadge status={m.reviewStatus} />}
                              </div>
                            </div>
                          </div>

                          {m.reviewStatus && (
                            <div className="mt-2 rounded bg-slate-50 p-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-slate-700">
                                  Revisado por: {m.reviewerName || 'Sistema'}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {m.reviewedAt ? new Date(m.reviewedAt).toLocaleString() : '—'}
                                </span>
                              </div>
                              {m.reviewNotes && (
                                <div className="mt-1 text-slate-600">
                                  <span className="font-medium">Notas:</span> {m.reviewNotes}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Botón para ver respuestas si el hito tiene respuestas guardadas */}
                          {(m.status === 'COMPLETED' || m.status === 'IN_PROGRESS') && m.whoCanFill === 'APPLICANT' && (
                            <div className="mt-2">
                              <button
                                onClick={() => loadAnswers(m.mp_id)}
                                disabled={loadingAnswers}
                                className="btn text-xs"
                              >
                                👁️ Ver respuestas del formulario
                              </button>
                            </div>
                          )}

                          {!isBlocked && m.reviewStatus !== 'APPROVED' && (
                            <div className="mt-3 space-y-2">
                              {reviewingMilestone === m.mp_id ? (
                                <div className="rounded-md border border-sky-200 bg-sky-50 p-3">
                                  <label className="mb-2 block text-sm font-medium">Notas de revisión:</label>
                                  <textarea
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    className="input mb-2 min-h-[80px]"
                                    placeholder="Escribe comentarios sobre la revisión..."
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={() => reviewMilestone(m.mp_id, 'APPROVED')}
                                      disabled={saving}
                                      className="btn-primary text-xs"
                                    >
                                      ✓ Aprobar
                                    </button>
                                    <button
                                      onClick={() => reviewMilestone(m.mp_id, 'REJECTED')}
                                      disabled={saving}
                                      className="btn border-rose-300 text-xs text-rose-700"
                                    >
                                      ✗ Rechazar
                                    </button>
                                    <button
                                      onClick={() => reviewMilestone(m.mp_id, 'NEEDS_CHANGES')}
                                      disabled={saving}
                                      className="btn border-amber-300 text-xs text-amber-700"
                                    >
                                      ⚠ Solicitar cambios
                                    </button>
                                    <button
                                      onClick={() => {
                                        setReviewingMilestone(null)
                                        setReviewNotes('')
                                      }}
                                      disabled={saving}
                                      className="btn text-xs"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setReviewingMilestone(m.mp_id)}
                                  className="btn text-xs"
                                >
                                  📝 Revisar este hito
                                </button>
                              )}
                            </div>
                          )}

                          {isApplicantFill && (
                            <div className="mt-2 text-xs text-slate-600">
                              {m.status === 'COMPLETED' ? (
                                <span className="text-emerald-700">✓ Completado el {m.completedAt ? new Date(m.completedAt).toLocaleString() : '—'}</span>
                              ) : (
                                <span>Pendiente de completar por el postulante</span>
                              )}
                            </div>
                          )}

                          {isReviewerFill && (
                            <div className="mt-3">
                              {m.status === 'COMPLETED' ? (
                                <div className="text-xs text-emerald-700">
                                  ✓ Entrevista completada el {m.completedAt ? new Date(m.completedAt).toLocaleString() : '—'}
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCompletingMilestone(m)}
                                  className="btn-primary text-xs flex items-center gap-1"
                                  disabled={isBlocked}
                                >
                                  ✍️ Completar entrevista
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )})}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal para ver respuestas */}
              {viewingAnswers && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                  <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Respuestas del Formulario</h3>
                      <button
                        onClick={() => {
                          setViewingAnswers(null)
                          setAnswers(null)
                        }}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        ✕
                      </button>
                    </div>
                    {loadingAnswers ? (
                      <p className="text-slate-600">Cargando respuestas...</p>
                    ) : answers ? (
                      <div className="space-y-4">
                        <div className="rounded border bg-slate-50 p-3">
                          <div className="text-xs text-slate-500">Formulario: {answers.formName || '—'}</div>
                          <div className="text-xs text-slate-500">
                            Enviado: {answers.submittedAt ? new Date(answers.submittedAt).toLocaleString() : 'No enviado'}
                          </div>
                          <div className="text-xs text-slate-500">Estado: {answers.status}</div>
                        </div>
                        {answers.answers && Object.keys(answers.answers).length > 0 ? (
                          <div className="space-y-3">
                            {Object.entries(answers.answers).map(([key, value]: [string, any]) => (
                              <div key={key} className="rounded border bg-white p-3">
                                <div className="mb-1 text-sm font-medium text-slate-700">{key}</div>
                                <div className="text-sm text-slate-800">
                                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-600">No hay respuestas guardadas.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">No se encontraron respuestas para este hito.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-body">
                  <h3 className="mb-2 text-base font-semibold">Resumen de formulario</h3>
                  {app.summary && Object.keys(app.summary).length > 0 ? (
                    <SummaryGrid data={app.summary} />
                  ) : (
                    <p className="text-sm text-slate-600">
                      No hay resumen disponible. Puedes revisar el formulario completo en la vista de Revisor.
                    </p>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <h3 className="mb-2 text-base font-semibold">Historial</h3>
                  {hist.length === 0 ? (
                    <p className="text-sm text-slate-600">Sin movimientos.</p>
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
                              <td className="py-2 pr-3">{labelStatus(h.fromStatus)}</td>
                              <td className="py-2 pr-3"><StatusBadge status={h.toStatus} /></td>
                              <td className="py-2 pr-3">{h.reason || '—'}</td>
                              <td className="py-2 pr-3">{h.changedBy || '—'}</td>
                              <td className="py-2">{new Date(h.changedAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

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
            </section>

            <aside className="space-y-4">
              <div className="card">
                <div className="card-body">
                  <h3 className="mb-2 text-base font-semibold">Datos</h3>
                  <KV label="Postulante" value={app.applicantName || '—'} />
                  <KV label="Correo" value={app.applicantEmail || '—'} />
                  <KV label="Convocatoria" value={app.callCode || shortId(app.callId)} mono />
                  <KV label="Institución" value={app.institutionName || '—'} />
                  <KV label="Actualizada" value={app.updatedAt ? new Date(app.updatedAt).toLocaleString() : '—'} />
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Modal para completar formulario de entrevista (REVIEWER) */}
      {completingMilestone && app && (
        <ReviewerFormModal
          milestoneId={completingMilestone.milestoneId}
          milestoneName={completingMilestone.milestoneName}
          applicationId={app.id}
          applicantName={app.applicantName || 'Postulante'}
          onClose={() => setCompletingMilestone(null)}
          onCompleted={() => {
            setCompletingMilestone(null)
            setMsg('Entrevista completada exitosamente')
            // Recargar milestones
            if (id) {
              apiGet<{ progress: MilestoneProgress[] }>(`/milestones/progress/${id}`)
                .then(data => setMilestones(data.progress || []))
                .catch(console.error)
            }
          }}
        />
      )}
    </div>
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
          <div className="mt-1 text-sm text-slate-800 break-words">{formatValue(v)}</div>
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
  const classes: Record<AppStatus, string> = {
    DRAFT: 'badge',
    SUBMITTED: 'badge',
    IN_REVIEW: 'badge',
    NEEDS_FIX: 'badge',
    APPROVED: 'badge',
    REJECTED: 'badge',
  }
  return <span className={classes[status]}>{labelStatus(status)}</span>
}

function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  const classes: Record<MilestoneStatus, string> = {
    PENDING: 'rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700',
    IN_PROGRESS: 'rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700',
    COMPLETED: 'rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700',
    REJECTED: 'rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700',
    NEEDS_CHANGES: 'rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700',
  }
  const labels: Record<MilestoneStatus, string> = {
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En progreso',
    COMPLETED: 'Completado',
    REJECTED: 'Rechazado',
    NEEDS_CHANGES: 'Requiere cambios',
  }
  return <span className={classes[status]}>{labels[status]}</span>
}

function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const classes: Record<ReviewStatus, string> = {
    APPROVED: 'rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700',
    REJECTED: 'rounded-full bg-rose-100 px-2 py-1 text-xs text-rose-700',
    NEEDS_CHANGES: 'rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700',
    PENDING_REVIEW: 'rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700',
  }
  const labels: Record<ReviewStatus, string> = {
    APPROVED: '✓ Aprobado',
    REJECTED: '✗ Rechazado',
    NEEDS_CHANGES: '⚠ Cambios solicitados',
    PENDING_REVIEW: '⏳ Pendiente revisión',
  }
  return <span className={classes[status]}>{labels[status]}</span>
}
