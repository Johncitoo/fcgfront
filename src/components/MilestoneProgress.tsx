import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'

interface Milestone {
  mp_id: string // milestone_progress_id
  milestoneId: string // milestone_id
  milestoneName: string
  orderIndex: number
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'BLOCKED'
  whoCanFill: string | string[]
  milestoneStatus: 'ACTIVE' | 'PENDING'
  required: boolean
  formId: string | null
  completedAt?: string
  createdAt: string
  updatedAt: string
  reviewStatus?: string
  reviewNotes?: string
}

interface ProgressSummary {
  total: number
  completed: number
  pending: number
  percentage: number
  currentMilestone: Milestone | null
}

interface MilestoneProgressData {
  progress: Milestone[]
  summary: ProgressSummary
}

interface Props {
  applicationId: string
}

/**
 * Componente de progreso de hitos con vista detallada por aplicación.
 * Muestra resumen de porcentaje, barra de progreso y cards individuales por hito.
 * Diferencia entre tareas de APPLICANT vs REVIEWER con colores distintivos.
 * 
 * @param applicationId - UUID de la aplicación
 * 
 * @example
 * <MilestoneProgress applicationId="app-uuid-123" />
 */
export default function MilestoneProgress({ applicationId }: Props) {
  const [data, setData] = useState<MilestoneProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProgress()
  }, [applicationId])

  const fetchProgress = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get<MilestoneProgressData>(
        `/milestones/progress/${applicationId}`
      )
      setData(response.data)
    } catch (err: any) {
      console.error('Error al cargar progreso de hitos:', err)
      setError(err.response?.data?.message || 'Error al cargar el progreso')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <div className="spinner text-sky-600"></div>
            <p className="text-gray-600">Cargando progreso...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { progress, summary } = data
  const currentMilestoneId = summary.currentMilestone?.mp_id ?? null

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Progreso de tu Postulación
              </h2>
              <p className="text-sm text-gray-500">
                {summary.completed} de {summary.total} etapas completadas
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-3xl font-bold text-sky-600">
                {summary.percentage}%
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Completado
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-body">
        {/* Barra de progreso general */}
        <div className="mb-6">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-sky-600 transition-all duration-500 ease-out"
              style={{ width: `${summary.percentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{summary.pending} pendientes</span>
            <span>{summary.completed} completadas</span>
          </div>
        </div>

        {/* Lista de hitos */}
        <div className="space-y-4">
          {progress.map((milestone) => (
            <MilestoneCard
              key={milestone.mp_id}
              milestone={milestone}
              applicationId={applicationId}
              currentMilestoneId={currentMilestoneId}
            />
          ))}
        </div>

        {/* Leyenda */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-sky-600"></div>
              <span className="text-gray-600">
                <span className="font-semibold">Tu responsabilidad:</span> Debes completar esta etapa
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-600"></div>
              <span className="text-gray-600">
                <span className="font-semibold">En revisión:</span> La Fundación está evaluando
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Card individual para un hito con estado, icono, botones de acción y formulario embebido.
 * Diferencia visualmente entre tareas de postulante (azul) y revisor (morado).
 * Muestra estados: completado, en progreso, pendiente, rechazado, bloqueado.
 * 
 * @param milestone - Datos del hito
 * @param applicationId - UUID de la aplicación
 */
function MilestoneCard({
  milestone,
  applicationId,
  currentMilestoneId,
}: {
  milestone: Milestone;
  applicationId: string;
  currentMilestoneId: string | null;
}) {
  const isCompleted = milestone.status === 'COMPLETED'
  const isInProgress = milestone.status === 'IN_PROGRESS'
  const isPending = milestone.status === 'PENDING'
  const isRejected = milestone.status === 'REJECTED'
  const isCurrentMilestone = currentMilestoneId === milestone.mp_id
  
  // whoCanFill puede ser string o array
  const whoCanFillArray = Array.isArray(milestone.whoCanFill) ? milestone.whoCanFill : [milestone.whoCanFill]
  const isApplicantTask = whoCanFillArray.includes('APPLICANT')
  const isReviewerTask = whoCanFillArray.includes('REVIEWER')
  
  const isMilestoneActive = milestone.milestoneStatus === 'ACTIVE'
  
  // Detectar si está bloqueado por rechazo de hito anterior vs rechazado directamente
  const isBlockedByPrevious = isRejected && milestone.reviewNotes === 'Bloqueado por rechazo de hito anterior'
  const isDirectlyRejected = isRejected && !isBlockedByPrevious

  // Determinar el estado visual
  let statusBadge: React.ReactNode
  let cardBorderClass = ''
  let iconBgClass = ''

  if (isDirectlyRejected) {
    statusBadge = (
      <span className="badge badge-error">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Rechazado
      </span>
    )
    cardBorderClass = 'border-rose-200 bg-rose-50/30'
    iconBgClass = 'bg-rose-600'
  } else if (isCompleted) {
    statusBadge = (
      <span className="badge badge-success">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
        Completado
      </span>
    )
    cardBorderClass = 'border-emerald-200 bg-emerald-50/30'
    iconBgClass = 'bg-emerald-600'
  } else if (isInProgress && isCurrentMilestone) {
    statusBadge = (
      <span className="badge badge-info animate-pulse">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        En progreso
      </span>
    )
    cardBorderClass = 'border-sky-200 bg-sky-50/30'
    iconBgClass = 'bg-sky-600 animate-pulse'
  } else if (isPending && isMilestoneActive && isApplicantTask && isCurrentMilestone) {
    statusBadge = (
      <span className="badge badge-warn">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Acción requerida
      </span>
    )
    cardBorderClass = 'border-amber-200 bg-amber-50/30'
    iconBgClass = 'bg-amber-600'
  } else if (isPending && isMilestoneActive && isReviewerTask && isCurrentMilestone) {
    statusBadge = (
      <span className="badge badge-purple">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        En espera de revisión
      </span>
    )
    cardBorderClass = 'border-purple-200 bg-purple-50/30'
    iconBgClass = 'bg-purple-600'
  } else {
    statusBadge = (
      <span className="badge badge-neutral">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Bloqueado
      </span>
    )
    cardBorderClass = 'border-gray-200 bg-gray-50/30'
    iconBgClass = 'bg-gray-400'
  }

  return (
    <div className={`border-2 rounded-lg p-4 transition-all duration-300 hover:shadow-md ${cardBorderClass}`}>
      <div className="flex items-start gap-4">
        {/* Número de orden */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${iconBgClass} flex items-center justify-center text-white font-bold shadow-lg transition-all duration-300`}>
          {isCompleted ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            milestone.orderIndex
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-gray-900 text-base">
              {milestone.milestoneName}
            </h3>
            {statusBadge}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            {/* Responsable */}
            <div className="flex items-center gap-1.5">
              {isApplicantTask ? (
                <>
                  <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Tu responsabilidad</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Revisión de la Fundación</span>
                </>
              )}
            </div>

            {/* Fecha de completado */}
            {milestone.completedAt && (
              <div className="flex items-center gap-1.5 text-emerald-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Completado {new Date(milestone.completedAt).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </span>
              </div>
            )}

            {/* Estado del hito */}
            {!isMilestoneActive && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Se activará después</span>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          {isApplicantTask && !isRejected && milestone.formId && (
            <div className="mt-3">
              {isCompleted ? (
                <Link
                  to={`/applicant/milestone/${milestone.mp_id}?app=${applicationId}&readonly=true`}
                  className="btn btn-sm btn-outline w-full sm:w-auto"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver respuestas
                </Link>
              ) : (isPending || isInProgress) && isMilestoneActive && isCurrentMilestone ? (
                <Link
                  to={`/applicant/milestone/${milestone.mp_id}?app=${applicationId}`}
                  className={`btn btn-sm ${isInProgress ? 'btn-info' : 'btn-primary'} w-full sm:w-auto`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {isInProgress ? 'Continuar formulario' : 'Completar formulario'}
                </Link>
              ) : null}
            </div>
          )}

          {/* Mensaje de ayuda */}
          {isDirectlyRejected && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm font-semibold text-rose-900 mb-1">
                <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Esta etapa ha sido rechazada
              </p>
              {milestone.reviewNotes && (
                <p className="text-sm text-rose-800 mt-1">
                  Motivo: {milestone.reviewNotes}
                </p>
              )}
              <p className="text-sm text-rose-700 mt-2">
                Tu proceso de postulación ha finalizado en este punto. No puedes continuar con las siguientes etapas.
              </p>
            </div>
          )}

          {isBlockedByPrevious && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Esta etapa ha sido bloqueada debido al rechazo de una etapa anterior.
              </p>
            </div>
          )}

          {isPending && isMilestoneActive && isApplicantTask && !isRejected && isCurrentMilestone && (
            <div className="mt-3 p-3 bg-sky-50 border border-sky-100 rounded-lg">
              <p className="text-sm text-sky-800">
                <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Debes completar este paso para continuar con tu postulación.
              </p>
            </div>
          )}

          {isPending && isMilestoneActive && isReviewerTask && (
            <div className="mt-3 p-3 bg-purple-50 border border-purple-100 rounded-lg">
              <p className="text-sm text-purple-800">
                <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                La Fundación revisará tu información en esta etapa.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
