import { useEffect, useState } from 'react';
import { milestonesService, type MilestoneProgress, type ProgressSummary, type ProgressResponse } from '@/services/milestones.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Clock, AlertCircle, XCircle, Ban } from 'lucide-react';

interface ProgressTrackerProps {
  applicationId: string;
}

/**
 * Componente de seguimiento visual de progreso de hitos de una aplicación.
 * Muestra timeline vertical con estado de cada hito, porcentaje completado y hito actual destacado.
 * Incluye animaciones, iconos de estado y barra de progreso general.
 * NUEVO: Muestra banner de rechazo y deshabilita hitos bloqueados.
 * 
 * @param applicationId - UUID de la aplicación a trackear
 * 
 * @example
 * <ProgressTracker applicationId="app-uuid-123" />
 */
export default function ProgressTracker({ applicationId }: ProgressTrackerProps) {
  const token = localStorage.getItem('accessToken');
  const [progress, setProgress] = useState<MilestoneProgress[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [progressData, setProgressData] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [applicationId]);

  async function loadProgress() {
    if (!applicationId || !token) return;
    try {
      setLoading(true);
      const data = await milestonesService.getProgress(applicationId, token);
      setProgressData(data);
      setProgress(data.progress);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Retorna el icono apropiado según el estado del hito y su review status.
   * @param status - Estado: COMPLETED, IN_PROGRESS, PENDING, BLOCKED
   * @param reviewStatus - Estado de revisión: APPROVED, REJECTED, NEEDS_CHANGES
   */
  function getStatusIcon(status: string, reviewStatus?: string) {
    // Si fue rechazado, mostrar X roja prominente
    if (reviewStatus === 'REJECTED') {
      return <XCircle className="h-6 w-6 text-red-600 fill-red-100" />;
    }
    
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="h-6 w-6 text-blue-600" />;
      case 'PENDING':
        return <Circle className="h-6 w-6 text-gray-400" />;
      case 'BLOCKED':
        return <Ban className="h-6 w-6 text-gray-400 opacity-50" />;
      default:
        return <Circle className="h-6 w-6 text-gray-400" />;
    }
  }

  /**
   * Convierte código de estado a texto legible en español.
   * @param status - Código del estado
   * @param reviewStatus - Estado de revisión
   */
  function getStatusText(status: string, reviewStatus?: string) {
    if (reviewStatus === 'REJECTED') {
      return 'RECHAZADO';
    }
    if (reviewStatus === 'NEEDS_CHANGES') {
      return 'Requiere cambios';
    }
    
    switch (status) {
      case 'COMPLETED':
        return reviewStatus === 'APPROVED' ? 'Aprobado' : 'Completado';
      case 'IN_PROGRESS':
        return 'En progreso';
      case 'PENDING':
        return 'Pendiente';
      case 'BLOCKED':
        return 'Bloqueado - No disponible';
      default:
        return status;
    }
  }

  /**
   * Retorna clases CSS para colorear la card según estado.
   * @param status - Estado del hito
   * @param reviewStatus - Estado de revisión
   */
  function getStatusColor(status: string, reviewStatus?: string) {
    // Rechazado: rojo intenso
    if (reviewStatus === 'REJECTED') {
      return 'border-red-600 bg-red-100 opacity-90';
    }
    
    // Bloqueado: gris desaturado
    if (status === 'BLOCKED') {
      return 'border-gray-300 bg-gray-100 opacity-60';
    }
    
    switch (status) {
      case 'COMPLETED':
        return reviewStatus === 'APPROVED' ? 'border-green-500 bg-green-50' : 'border-green-400 bg-green-50';
      case 'IN_PROGRESS':
        return 'border-blue-500 bg-blue-50';
      case 'PENDING':
        return 'border-gray-300 bg-gray-50';
      default:
        return 'border-gray-300 bg-white';
    }
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="spinner text-sky-600"></div>
          <p className="text-gray-600">Cargando tu progreso...</p>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      {/* BANNER DE RECHAZO */}
      {progressData?.isRejected && progressData.rejectedMilestone && (
        <div className="bg-red-600 text-white p-4 border-b-4 border-red-700">
          <div className="flex items-start gap-3">
            <XCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Postulación Rechazada</h3>
              <p className="text-red-50 mb-2">
                Tu postulación fue rechazada en la fase: <strong>"{progressData.rejectedMilestone.milestoneName}"</strong>
              </p>
              {progressData.rejectedMilestone.reviewNotes && (
                <div className="mt-2 p-3 bg-red-700 rounded-md">
                  <p className="text-sm font-medium mb-1">Motivo del rechazo:</p>
                  <p className="text-sm text-red-100">{progressData.rejectedMilestone.reviewNotes}</p>
                </div>
              )}
              {progressData.rejectedMilestone.reviewerName && progressData.rejectedMilestone.reviewedAt && (
                <p className="text-xs text-red-200 mt-2">
                  Revisado por {progressData.rejectedMilestone.reviewerName} el {new Date(progressData.rejectedMilestone.reviewedAt).toLocaleDateString('es-CL')}
                </p>
              )}
              <p className="text-sm text-red-100 mt-3 font-medium">
                ⚠️ El proceso de postulación ha terminado. Los hitos siguientes han sido bloqueados.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <CardHeader className={`bg-gradient-to-r ${progressData?.isRejected ? 'from-red-50 to-white' : 'from-sky-50 to-white'} border-b`}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {progressData?.isRejected ? (
                <XCircle className="w-5 h-5 text-red-600" />
              ) : (
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              )}
              {progressData?.isRejected ? 'Postulación Rechazada' : 'Tu Progreso'}
            </CardTitle>
            <CardDescription>
              {summary.completed} de {summary.total} hitos completados
              {summary.blocked > 0 && ` • ${summary.blocked} bloqueados`}
            </CardDescription>
          </div>
          <div className={`text-3xl font-bold ${
            progressData?.isRejected ? 'text-red-600' : 
            summary.percentage === 100 ? 'text-emerald-600' : 'text-sky-600'
          }`}>
            {Math.round(summary.percentage)}%
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        {/* Progress bar mejorada */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Progreso general</span>
            <span className="text-gray-500">
              {summary.pending} pendiente{summary.pending !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="progress">
            <div 
              className={`progress-bar ${summary.percentage === 100 ? 'progress-bar-success' : ''}`}
              style={{ width: `${summary.percentage}%` }}
            />
          </div>
        </div>

        {/* Timeline mejorada */}
        <div className="space-y-3 pt-4">
          {progress.map((milestone, index) => {
            const isBlocked = milestone.status === 'BLOCKED';
            const isRejected = milestone.reviewStatus === 'REJECTED';
            
            return (
              <div key={milestone.id} className="relative animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                {/* Connecting line */}
                {index < progress.length - 1 && (
                  <div className={`absolute left-6 top-14 w-0.5 h-8 transition-colors duration-500 ${
                    milestone.status === 'COMPLETED' ? 'bg-emerald-600' : 
                    isBlocked ? 'bg-gray-300 opacity-50' : 'bg-gray-300'
                  }`} />
                )}

                {/* Milestone card mejorada */}
                <div className={`relative flex gap-4 p-4 rounded-lg border-2 transition-all duration-300 ${
                  getStatusColor(milestone.status, milestone.reviewStatus)
                } ${
                  summary.currentMilestone?.id === milestone.id ? 'ring-2 ring-sky-600 ring-offset-2 scale-102' : ''
                } ${
                  isBlocked ? 'cursor-not-allowed' : ''
                }`}>
                  {/* Badge de bloqueado */}
                  {isBlocked && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-600">
                        <Ban className="h-3 w-3" />
                        Bloqueado
                      </span>
                    </div>
                  )}
                  
                  {/* Badge de rechazado */}
                  {isRejected && (
                    <div className="absolute top-2 right-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-red-600 text-white">
                        <XCircle className="h-3 w-3" />
                        RECHAZADO
                      </span>
                    </div>
                  )}
                  
                  <div className="flex-shrink-0 relative">
                    {getStatusIcon(milestone.status, milestone.reviewStatus)}
                    {summary.currentMilestone?.id === milestone.id && !isBlocked && !isRejected && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-600"></span>
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1">
                        <h4 className={`font-semibold text-base ${isBlocked || isRejected ? 'text-gray-500' : 'text-gray-900'}`}>
                          {milestone.orderIndex + 1}. {milestone.milestoneName}
                          {milestone.required && <span className="text-rose-600 ml-1">*</span>}
                        </h4>
                        <p className={`text-sm mt-1 flex items-center gap-2 ${
                          isRejected ? 'text-red-700 font-semibold' : 
                          isBlocked ? 'text-gray-500' : 'text-gray-600'
                        }`}>
                          <span className="inline-block w-2 h-2 rounded-full bg-current"></span>
                          {getStatusText(milestone.status, milestone.reviewStatus)}
                        </p>
                      </div>
                      {summary.currentMilestone?.id === milestone.id && !isBlocked && !isRejected && (
                        <span className="badge badge-primary animate-scale-in">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Actual
                        </span>
                      )}
                    </div>

                    {/* Mensaje de hito expirado */}
                    {milestone.isExpired && !isBlocked && (
                      <div className="mt-3 pt-3 border-t border-orange-300">
                        <div className="bg-orange-50 p-3 rounded-md border border-orange-200">
                          <p className="text-xs font-semibold text-orange-900 mb-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Fecha límite expirada
                          </p>
                          <p className="text-sm text-orange-800">
                            Este hito cerró el {milestone.dueDate ? new Date(milestone.dueDate).toLocaleString('es-CL') : 'fecha desconocida'}. 
                            Ya no puedes enviar respuestas.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Mensaje de hito no iniciado */}
                    {milestone.notStarted && !isBlocked && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                          <p className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Aún no disponible
                          </p>
                          <p className="text-sm text-gray-700">
                            Este hito estará disponible desde el {milestone.startDate ? new Date(milestone.startDate).toLocaleString('es-CL') : 'fecha por definir'}.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Notas de rechazo */}
                    {milestone.reviewStatus === 'REJECTED' && milestone.reviewNotes && (
                      <div className="mt-3 pt-3 border-t border-red-300">
                        <div className="bg-red-50 p-3 rounded-md border border-red-200">
                          <p className="text-xs font-semibold text-red-900 mb-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Motivo del rechazo:
                          </p>
                          <p className="text-sm text-red-800">{milestone.reviewNotes}</p>
                        </div>
                      </div>
                    )}

                    {/* Dates mejoradas */}
                    {(milestone.startedAt || milestone.completedAt || milestone.reviewedAt) && (
                      <div className={`mt-3 pt-3 border-t space-y-1.5 text-xs ${
                        isBlocked ? 'border-gray-300 opacity-60' : 'border-gray-200'
                      }`}>
                        {milestone.startedAt && (
                          <div className={`flex items-center gap-2 ${isBlocked ? 'text-gray-500' : 'text-gray-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Iniciado: {new Date(milestone.startedAt).toLocaleDateString('es-CL')}
                          </div>
                        )}
                        {milestone.completedAt && (
                          <div className={`flex items-center gap-2 font-medium ${
                            isRejected ? 'text-red-700' : isBlocked ? 'text-gray-500' : 'text-emerald-700'
                          }`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Completado: {new Date(milestone.completedAt).toLocaleDateString('es-CL')}
                          </div>
                        )}
                        {milestone.reviewedAt && milestone.reviewerName && (
                          <div className={`flex items-center gap-2 font-medium ${
                            isRejected ? 'text-red-800' : 'text-blue-700'
                          }`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Revisado por {milestone.reviewerName} el {new Date(milestone.reviewedAt).toLocaleDateString('es-CL')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary message mejorado */}
        {progressData?.isRejected ? (
          <div className="alert bg-red-100 border-red-300 text-red-900 animate-scale-in">
            <XCircle className="h-6 w-6 flex-shrink-0 text-red-600" />
            <div>
              <p className="font-semibold">Postulación No Seleccionada</p>
              <p className="text-sm mt-1">
                Tu postulación no cumplió con los requisitos en la fase de revisión. 
                El proceso ha finalizado y los hitos siguientes no están disponibles.
              </p>
            </div>
          </div>
        ) : summary.percentage === 100 ? (
          <div className="alert alert-success animate-scale-in">
            <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">¡Felicitaciones!</p>
              <p className="text-sm mt-1">
                Has completado todos los hitos requeridos de tu postulación.
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
