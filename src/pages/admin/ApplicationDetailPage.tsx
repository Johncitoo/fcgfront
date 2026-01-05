import { useEffect, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { apiGet, apiPost, apiPatch } from '../../lib/api'
import { authService } from '../../lib/auth'
import ReviewerFormModal from '../../components/ReviewerFormModal'
import FilePreviewModal from '../../components/FilePreviewModal'
import { selectionService } from '../../lib/selection.service'

type AppStatus = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'NEEDS_FIX' | 'APPROVED' | 'REJECTED' | 'SELECTED' | 'NOT_SELECTED'
type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'NEEDS_CHANGES' | 'BLOCKED' | 'SKIPPED'
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
  dueDate: string | null  // Fecha límite del hito
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Detectar si estamos en modo reviewer o admin
  const isReviewerMode = location.pathname.startsWith('/reviewer')
  const baseRoute = isReviewerMode ? '/reviewer' : '/admin'
  const currentUserRole = authService.getUserRole() || 'ADMIN'
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
  const [viewingFiles, setViewingFiles] = useState(false)
  const [files, setFiles] = useState<any[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [completingMilestone, setCompletingMilestone] = useState<MilestoneProgress | null>(null)
  const [previewingFile, setPreviewingFile] = useState<any | null>(null)

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
        // Endpoint /history no existe en backend, comentado para evitar 404
        // try {
        //   const h = await apiGet<HistoryRow[]>(`/applications/${id}/history`)
        //   setHist(h)
        // } catch {
        //   setHist([])
        // }
        setHist([])
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
      // const h = await apiGet<HistoryRow[]>(`/applications/${id}/history`)
      // setHist(h)
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

  async function handleFinalDecision(decision: 'SELECTED' | 'NOT_SELECTED') {
    if (!id || !app?.callId) return
    
    setSaving(true)
    setActionErr(null)
    setMsg(null)
    
    try {
      await selectionService.setFinalDecision(id, decision)
      
      // Recargar la aplicación para ver el estado actualizado
      const updated = await apiGet<ApplicationDTO>(`/applications/${id}`)
      setApp(updated)
      
      setMsg(decision === 'SELECTED' 
        ? '✅ Postulante seleccionado para la beca exitosamente.' 
        : '❌ Postulante marcado como no seleccionado.')
    } catch (e: any) {
      setActionErr(e.message ?? 'No se pudo actualizar la decisión final')
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

  async function loadFiles() {
    if (!id) return
    setLoadingFiles(true)
    setFiles([])
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'
      const token = localStorage.getItem('fcg.access_token') ?? ''
      const url = `${API_BASE}/files/list?entityType=APPLICATION&entityId=${id}`
      
      const filesRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!filesRes.ok) {
        throw new Error('Error al cargar archivos')
      }
      
      const filesData = await filesRes.json()
      const files = filesData.files || filesData
      setFiles(files)
      setViewingFiles(true)
    } catch (e: any) {
      setActionErr(e.message ?? 'No se pudieron cargar los archivos')
    } finally {
      setLoadingFiles(false)
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function downloadFile(fileId: string, filename: string) {
    const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'
    const token = localStorage.getItem('fcg.access_token') ?? ''
    const url = `${API_BASE}/files/${fileId}/download`
    
    // Descargar con autenticación
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = filename
        link.click()
        window.URL.revokeObjectURL(blobUrl)
      })
      .catch(err => {
        console.error('Error downloading file:', err)
        alert('Error al descargar el archivo')
      })
  }

  async function previewFileById(fileId: string) {
    const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'
    const token = localStorage.getItem('fcg.access_token') ?? ''
    
    try {
      // Obtener metadatos del archivo
      const response = await fetch(`${API_BASE}/files/${fileId}/metadata`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (!response.ok) throw new Error('No se pudo cargar el archivo')
      
      const fileData = await response.json()
      setPreviewingFile({
        id: fileId,
        originalFilename: fileData.originalFilename || 'Archivo',
        mimetype: fileData.mimetype || 'application/octet-stream',
        size: fileData.size || 0,
        description: fileData.description,
      })
    } catch (err: any) {
      alert('Error al cargar el archivo: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link to={`${baseRoute}/applications`} className="text-sm text-sky-700 hover:underline">
            ← Volver a postulaciones
          </Link>
          {app?.callId && (
            <Link to={`${baseRoute}/calls/${app.callId}`} className="text-sm text-sky-700 hover:underline">
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
                        // Detectar si fue rechazado o bloqueado
                        const isRejected = m.reviewStatus === 'REJECTED'
                        const isBlocked = m.status === 'BLOCKED'
                        const isRejectedOrBlocked = isRejected || isBlocked
                        
                        // whoCanFill puede ser string o array - normalizar a array
                        const canFillArray = Array.isArray(m.whoCanFill) ? m.whoCanFill : [m.whoCanFill]
                        const isApplicantFill = canFillArray.includes('APPLICANT')
                        const isReviewerFill = canFillArray.includes('REVIEWER')
                        const isAdminFill = canFillArray.includes('ADMIN')
                        
                        // Verificar si el usuario actual puede completar este hito
                        // REVIEWER e ADMIN solo pueden ser completados por ADMIN
                        const canUserComplete = (isAdminFill || isReviewerFill) ? currentUserRole === 'ADMIN' : true
                        
                        // Calcular si la fecha límite expiró
                        const dueDate = m.dueDate ? new Date(m.dueDate) : null
                        const now = new Date()
                        const isExpired = dueDate && now > dueDate
                        const isCompleted = m.status === 'COMPLETED'
                        
                        return (
                        <div key={m.mp_id} className={`rounded-lg border p-4 transition-all ${
                          isRejected ? 'bg-gradient-to-r from-red-100 to-red-50 border-red-400 opacity-80' : 
                          isBlocked ? 'bg-slate-100 opacity-50 border-slate-400' : 
                          isCompleted ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' : 
                          isExpired ? 'bg-rose-50 border-rose-300' :
                          'bg-white border-slate-200 hover:border-sky-300'
                        }`}>
                          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isRejected ? (
                                  <svg className="h-5 w-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ) : isBlocked ? (
                                  <svg className="h-5 w-5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                ) : isCompleted ? (
                                  <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ) : null}
                                <h4 className={`font-medium ${
                                  isRejected ? 'text-red-900' : 
                                  isBlocked ? 'text-slate-600' : 
                                  isCompleted ? 'text-green-900' : ''
                                }`}>
                                  {m.milestoneName}
                                </h4>
                                {isRejected && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded">
                                    ❌ RECHAZADO
                                  </span>
                                )}
                                {isBlocked && !isRejected && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-slate-200 text-slate-700 rounded">
                                    🚫 Bloqueado
                                  </span>
                                )}
                                <span className="text-xs text-slate-500">
                                  ({isApplicantFill ? 'Postulante' : isReviewerFill ? 'Revisor' : isAdminFill ? 'Admin' : 'Desconocido'})
                                </span>
                                {m.m_required && <span className="text-xs text-rose-600">*Obligatorio</span>}
                                {isAdminFill && !canUserComplete && <span className="text-xs text-amber-600">[Solo lectura]</span>}
                              </div>
                              
                              {/* Fecha límite */}
                              {dueDate && (
                                <div className={`mt-1 flex items-center gap-1 text-xs ${
                                  isExpired ? 'text-rose-700 font-medium' : 
                                  isCompleted ? 'text-green-700' : 
                                  'text-slate-600'
                                }`}>
                                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>
                                    {isExpired ? 'Venció: ' : 'Límite: '}
                                    {dueDate.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              )}
                              
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
                                  {m.reviewedAt ? new Date(m.reviewedAt).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </span>
                              </div>
                              {m.reviewNotes && (
                                <div className="mt-1 text-slate-600">
                                  <span className="font-medium">Notas:</span> {m.reviewNotes}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Botones de acción para el hito */}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {/* Botón para completar hitos de admin/reviewer */}
                            {(isAdminFill || isReviewerFill) && canUserComplete && m.status === 'IN_PROGRESS' && !isExpired && (
                              <button
                                onClick={() => setCompletingMilestone(m)}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-purple-700 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Completar formulario</span>
                              </button>
                            )}
                            
                            {/* Botón para ver respuestas si el hito tiene respuestas guardadas */}
                            {(m.status === 'COMPLETED' || m.status === 'IN_PROGRESS') && (
                              <>
                                <button
                                  onClick={() => loadAnswers(m.mp_id)}
                                  disabled={loadingAnswers || isRejectedOrBlocked}
                                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    isRejectedOrBlocked 
                                      ? 'text-slate-500 bg-slate-100 border border-slate-300 cursor-not-allowed opacity-60' 
                                      : 'text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 hover:border-sky-300 disabled:opacity-50'
                                  }`}
                                  title={isRejectedOrBlocked ? 'No disponible - Hito rechazado/bloqueado' : ''}
                                >
                                  <span>{loadingAnswers && viewingAnswers === m.mp_id ? 'Cargando...' : 'Ver respuestas'}</span>
                                </button>
                                <button
                                  onClick={loadFiles}
                                  disabled={loadingFiles || isRejectedOrBlocked}
                                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    isRejectedOrBlocked 
                                      ? 'text-slate-500 bg-slate-100 border border-slate-300 cursor-not-allowed opacity-60' 
                                      : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 disabled:opacity-50'
                                  }`}
                                  title={isRejectedOrBlocked ? 'No disponible - Hito rechazado/bloqueado' : ''}
                                >
                                  <span>{loadingFiles ? 'Cargando...' : 'Ver archivos'}</span>
                                </button>
                              </>
                            )}
                          </div>

                          {!isRejected && !isBlocked && m.reviewStatus !== 'APPROVED' && (
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
                                      Aprobar
                                    </button>
                                    <button
                                      onClick={() => reviewMilestone(m.mp_id, 'REJECTED')}
                                      disabled={saving}
                                      className="btn border-rose-300 text-xs text-rose-700"
                                    >
                                      Rechazar
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
                                  Revisar este hito
                                </button>
                              )}
                            </div>
                          )}
                          
                          {/* Mostrar mensaje cuando está rechazado o bloqueado */}
                          {(isRejected || isBlocked) && (
                            <div className={`mt-3 p-3 rounded-lg border ${
                              isRejected 
                                ? 'bg-red-50 border-red-300 text-red-900' 
                                : 'bg-slate-50 border-slate-300 text-slate-700'
                            }`}>
                              <div className="flex items-start gap-2 text-sm">
                                <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                  <p className="font-semibold">
                                    {isRejected ? 'Hito Rechazado - No se puede revisar ni modificar' : 'Hito Bloqueado'}
                                  </p>
                                  <p className="text-xs mt-1">
                                    {isRejected 
                                      ? 'Este hito fue rechazado. La postulación ha finalizado y no se pueden realizar más acciones.' 
                                      : 'Este hito fue bloqueado debido a un rechazo en una fase anterior.'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {isApplicantFill && (
                            <div className="mt-2 text-xs text-slate-600">
                              {m.status === 'COMPLETED' ? (
                                <span className="text-emerald-700">✓ Completado el {m.completedAt ? new Date(m.completedAt).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                              ) : (
                                <span>Pendiente de completar por el postulante</span>
                              )}
                            </div>
                          )}

                          {isReviewerFill && (
                            <div className="mt-3">
                              {m.status === 'COMPLETED' ? (
                                <div className="text-xs text-emerald-700">
                                  ✓ Entrevista completada el {m.completedAt ? new Date(m.completedAt).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </div>
                              ) : canUserComplete ? (
                                <button
                                  onClick={() => setCompletingMilestone(m)}
                                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                  disabled={isRejectedOrBlocked}
                                  title={isRejectedOrBlocked ? 'No disponible - Hito rechazado/bloqueado' : ''}
                                >
                                  <span>Completar entrevista</span>
                                </button>
                              ) : (
                                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                                  [Aviso] Este hito solo puede ser completado por un administrador
                                </div>
                              )}
                            </div>
                          )}

                          {isAdminFill && (
                            <div className="mt-3">
                              {m.status === 'COMPLETED' ? (
                                <div className="text-xs text-emerald-700">
                                  ✓ Completado el {m.completedAt ? new Date(m.completedAt).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </div>
                              ) : canUserComplete ? (
                                <button
                                  onClick={() => setCompletingMilestone(m)}
                                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                  disabled={isRejectedOrBlocked}
                                  title={isRejectedOrBlocked ? 'No disponible - Hito rechazado/bloqueado' : ''}
                                >
                                  <span>Completar (Admin)</span>
                                </button>
                              ) : (
                                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                                  [Restringido] Este hito solo puede ser completado por un administrador. Puedes ver las respuestas cuando estén disponibles.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )})}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal para ver respuestas del hito */}
              {viewingAnswers && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                  <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
                    <div className="mb-4 flex items-center justify-between border-b pb-3">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-800">Respuestas del Formulario</h3>
                        {answers && (
                          <p className="text-sm text-slate-600 mt-1">
                            {(() => {
                              const milestone = milestones.find(m => m.mp_id === viewingAnswers)
                              return milestone ? `Formulario de ${milestone.milestoneName}` : (answers.formName || 'Formulario')
                            })()} • Enviado: {answers.submittedAt ? new Date(answers.submittedAt).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No enviado'}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setViewingAnswers(null)
                          setAnswers(null)
                        }}
                        className="text-2xl text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    {loadingAnswers ? (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-slate-600">Cargando respuestas...</p>
                      </div>
                    ) : answers ? (
                      <div className="space-y-6">
                        {/* Estado del formulario */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-slate-700">Estado:</span>
                              <span className="ml-2 text-slate-900">{answers.status || 'DRAFT'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-slate-700">Última actualización:</span>
                              <span className="ml-2 text-slate-900">
                                {answers.updatedAt ? new Date(answers.updatedAt).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Respuestas estructuradas por secciones */}
                        {answers.formSchema?.sections && answers.answers ? (
                          <div className="space-y-5">
                            {answers.formSchema.sections.map((section: any, sectionIdx: number) => (
                              <div key={sectionIdx} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                                <div className="bg-sky-50 border-b border-sky-100 px-5 py-3">
                                  <h4 className="text-base font-semibold text-sky-900">{section.title || `Sección ${sectionIdx + 1}`}</h4>
                                  {section.description && (
                                    <p className="text-sm text-sky-700 mt-1">{section.description}</p>
                                  )}
                                </div>
                                <div className="p-5 space-y-4">
                                  {section.fields && section.fields.length > 0 ? (
                                    section.fields.map((field: any, fieldIdx: number) => {
                                      const fieldValue = answers.answers[field.name || field.label];
                                      
                                      return (
                                        <div key={fieldIdx} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                                          <div className="text-sm font-medium text-slate-700 mb-2">
                                            {field.label}
                                            {field.required && <span className="text-rose-500 ml-1">*</span>}
                                          </div>
                                          <div className="text-sm text-slate-900">
                                            {field.type === 'file' && fieldValue ? (
                                              <div className="flex flex-col gap-3">
                                                {Array.isArray(fieldValue) ? (
                                                  fieldValue.map((fileId: any, i: number) => {
                                                    const id = typeof fileId === 'string' ? fileId : fileId?.id || fileId
                                                    const name = typeof fileId === 'object' ? fileId?.name : null
                                                    return (
                                                      <div key={i} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                        <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="flex-1 text-slate-700">{name || `Archivo ${i + 1}`}</span>
                                                        <button
                                                          onClick={() => previewFileById(id)}
                                                          className="px-3 py-1.5 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600 transition-colors"
                                                        >
                                                          Ver
                                                        </button>
                                                        <button
                                                          onClick={() => downloadFile(id, name || `archivo-${i + 1}`)}
                                                          className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                                                        >
                                                          Descargar
                                                        </button>
                                                      </div>
                                                    )
                                                  })
                                                ) : (
                                                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                    <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="flex-1 text-slate-700">{typeof fieldValue === 'object' ? fieldValue?.name : 'Archivo'}</span>
                                                    <button
                                                      onClick={() => previewFileById(typeof fieldValue === 'string' ? fieldValue : fieldValue?.id)}
                                                      className="px-3 py-1.5 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600 transition-colors"
                                                    >
                                                      Ver
                                                    </button>
                                                    <button
                                                      onClick={() => downloadFile(
                                                        typeof fieldValue === 'string' ? fieldValue : fieldValue?.id,
                                                        typeof fieldValue === 'object' ? fieldValue?.name || 'archivo' : 'archivo'
                                                      )}
                                                      className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                                                    >
                                                      Descargar
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            ) : fieldValue !== undefined && fieldValue !== null && fieldValue !== '' ? (
                                              <div className="whitespace-pre-wrap bg-slate-50 rounded-md p-3">
                                                {typeof fieldValue === 'object' ? JSON.stringify(fieldValue, null, 2) : String(fieldValue)}
                                              </div>
                                            ) : (
                                              <span className="text-slate-400 italic">Sin respuesta</span>
                                            )}
                                          </div>
                                          {field.helpText && (
                                            <p className="text-xs text-slate-500 mt-1">{field.helpText}</p>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p className="text-sm text-slate-500 italic">Esta sección no tiene campos</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : answers.answers && Object.keys(answers.answers).length > 0 ? (
                          // Fallback: mostrar respuestas sin estructura
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium text-slate-700">Respuestas:</h4>
                            {Object.entries(answers.answers).map(([key, value]: [string, any]) => (
                              <div key={key} className="rounded-lg border border-slate-200 bg-white p-4">
                                <div className="mb-2 text-sm font-medium text-slate-700">{key}</div>
                                <div className="text-sm text-slate-900 bg-slate-50 rounded p-3">
                                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-12">
                            <p className="text-sm text-slate-600">No hay respuestas guardadas para este hito.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-12">
                        <p className="text-sm text-slate-600">No se encontraron respuestas para este hito.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal para ver archivos de la aplicación */}
              {viewingFiles && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                  <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6">
                    <div className="mb-4 flex items-center justify-between border-b pb-3">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-800">Archivos ({files.length})</h3>
                      </div>
                      <button
                        onClick={() => {
                          setViewingFiles(false)
                          setFiles([])
                        }}
                        className="text-2xl text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    {loadingFiles ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {files.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            No hay archivos adjuntos
                          </div>
                        ) : (
                          files.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 hover:shadow-md"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium truncate text-gray-900">{file.originalFilename}</div>
                                  <div className="text-sm text-gray-500">
                                    {formatFileSize(file.size)} • {file.mimetype}
                                  </div>
                                  {file.description && (
                                    <div className="text-sm text-gray-600 mt-1">{file.description}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                                <button
                                  onClick={() => setPreviewingFile(file)}
                                  className="flex items-center gap-2 px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 hover:shadow-lg transition-all duration-200 active:scale-95"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Ver
                                </button>
                                <button
                                  onClick={() => downloadFile(file.id, file.originalFilename)}
                                  className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 hover:shadow-lg transition-all duration-200 active:scale-95"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Descargar
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
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
                              <td className="py-2">{new Date(h.changedAt).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
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
                  <KV label="Actualizada" value={app.updatedAt ? new Date(app.updatedAt).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} />
                </div>
              </div>

              {/* Sección de Decisión Final */}
              {!isReviewerMode && (
                <div className="card border-2 border-blue-200 bg-blue-50">
                  <div className="card-body">
                    <h3 className="mb-3 text-base font-semibold text-blue-900">Decisión Final</h3>
                    
                    {app.status === 'SELECTED' && (
                      <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-800 font-semibold mb-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Seleccionado para la beca
                        </div>
                        <p className="text-sm text-green-700">Este postulante ha sido seleccionado.</p>
                        <button
                          onClick={() => handleFinalDecision('NOT_SELECTED')}
                          disabled={saving}
                          className="mt-3 px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors disabled:opacity-50"
                        >
                          Revertir decisión
                        </button>
                      </div>
                    )}
                    
                    {app.status === 'NOT_SELECTED' && (
                      <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-red-800 font-semibold mb-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          No seleccionado
                        </div>
                        <p className="text-sm text-red-700">Este postulante no fue seleccionado para la beca.</p>
                        <button
                          onClick={() => handleFinalDecision('SELECTED')}
                          disabled={saving}
                          className="mt-3 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Revertir decisión
                        </button>
                      </div>
                    )}
                    
                    {app.status !== 'SELECTED' && app.status !== 'NOT_SELECTED' && (
                      <div className="space-y-3">
                        <p className="text-sm text-blue-800 mb-4">
                          Una vez revisada toda la información, puedes tomar la decisión final sobre este postulante.
                        </p>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleFinalDecision('SELECTED')}
                            disabled={saving}
                            className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Seleccionar para la beca
                          </button>
                          <button
                            onClick={() => handleFinalDecision('NOT_SELECTED')}
                            disabled={saving}
                            className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            No seleccionar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
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

      {/* Modal de previsualización de archivos */}
      {previewingFile && (
        <FilePreviewModal
          file={previewingFile}
          onClose={() => setPreviewingFile(null)}
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
    SELECTED: 'Seleccionado',
    NOT_SELECTED: 'No Seleccionado',
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
    SELECTED: 'badge',
    NOT_SELECTED: 'badge',
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
    BLOCKED: 'rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600',
    SKIPPED: 'rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500',
  }
  const labels: Record<MilestoneStatus, string> = {
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En progreso',
    COMPLETED: 'Completado',
    REJECTED: 'Rechazado',
    NEEDS_CHANGES: 'Requiere cambios',
    BLOCKED: 'Bloqueado',
    SKIPPED: 'Omitido',
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
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
    NEEDS_CHANGES: 'Cambios solicitados',
    PENDING_REVIEW: 'Pendiente revisión',
  }
  return <span className={classes[status]}>{labels[status]}</span>
}
