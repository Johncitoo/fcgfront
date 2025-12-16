import { useEffect, useState } from 'react';
import { milestonesService, type MilestoneProgress, type ProgressSummary } from '@/services/milestones.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

interface ProgressTrackerProps {
  applicationId: string;
}

/**
 * Componente de seguimiento visual de progreso de hitos de una aplicación.
 * Muestra timeline vertical con estado de cada hito, porcentaje completado y hito actual destacado.
 * Incluye animaciones, iconos de estado y barra de progreso general.
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [applicationId]);

  async function loadProgress() {
    if (!applicationId || !token) return;
    try {
      setLoading(true);
      const data = await milestonesService.getProgress(applicationId, token);
      setProgress(data.progress);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Retorna el icono apropiado según el estado del hito.
   * @param status - Estado: COMPLETED, IN_PROGRESS, PENDING, BLOCKED
   */
  function getStatusIcon(status: string) {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="h-6 w-6 text-blue-600" />;
      case 'PENDING':
        return <Circle className="h-6 w-6 text-gray-400" />;
      case 'BLOCKED':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Circle className="h-6 w-6 text-gray-400" />;
    }
  }

  /**
   * Convierte código de estado a texto legible en español.
   * @param status - Código del estado
   */
  function getStatusText(status: string) {
    switch (status) {
      case 'COMPLETED':
        return 'Completado';
      case 'IN_PROGRESS':
        return 'En progreso';
      case 'PENDING':
        return 'Pendiente';
      case 'BLOCKED':
        return 'Bloqueado';
      default:
        return status;
    }
  }

  /**
   * Retorna clases CSS para colorear la card según estado.
   * @param status - Estado del hito
   */
  function getStatusColor(status: string) {
    switch (status) {
      case 'COMPLETED':
        return 'border-green-500 bg-green-50';
      case 'IN_PROGRESS':
        return 'border-blue-500 bg-blue-50';
      case 'PENDING':
        return 'border-gray-300 bg-gray-50';
      case 'BLOCKED':
        return 'border-red-500 bg-red-50';
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
      <CardHeader className="bg-gradient-to-r from-sky-50 to-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Tu Progreso
            </CardTitle>
            <CardDescription>
              {summary.completed} de {summary.total} hitos completados
            </CardDescription>
          </div>
          <div className={`text-3xl font-bold ${summary.percentage === 100 ? 'text-emerald-600' : 'text-sky-600'}`}>
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
          {progress.map((milestone, index) => (
            <div key={milestone.id} className="relative animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
              {/* Connecting line */}
              {index < progress.length - 1 && (
                <div className={`absolute left-6 top-14 w-0.5 h-8 transition-colors duration-500 ${
                  milestone.status === 'COMPLETED' ? 'bg-emerald-600' : 'bg-gray-300'
                }`} />
              )}

              {/* Milestone card mejorada */}
              <div className={`relative flex gap-4 p-4 rounded-lg border-2 transition-all duration-300 ${getStatusColor(milestone.status)} ${
                summary.currentMilestone?.id === milestone.id ? 'ring-2 ring-sky-600 ring-offset-2 scale-102' : ''
              }`}>
                <div className="flex-shrink-0 relative">
                  {getStatusIcon(milestone.status)}
                  {summary.currentMilestone?.id === milestone.id && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-600"></span>
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base text-gray-900">
                        {milestone.orderIndex + 1}. {milestone.milestoneName}
                        {milestone.required && <span className="text-rose-600 ml-1">*</span>}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-current"></span>
                        {getStatusText(milestone.status)}
                      </p>
                    </div>
                    {summary.currentMilestone?.id === milestone.id && (
                      <span className="badge badge-primary animate-scale-in">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Actual
                      </span>
                    )}
                  </div>

                  {/* Dates mejoradas */}
                  {(milestone.startedAt || milestone.completedAt) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5 text-xs">
                      {milestone.startedAt && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Iniciado: {new Date(milestone.startedAt).toLocaleDateString('es-CL')}
                        </div>
                      )}
                      {milestone.completedAt && (
                        <div className="flex items-center gap-2 text-emerald-700 font-medium">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Completado: {new Date(milestone.completedAt).toLocaleDateString('es-CL')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary message mejorado */}
        {summary.percentage === 100 && (
          <div className="alert alert-success animate-scale-in">
            <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">¡Felicitaciones!</p>
              <p className="text-sm mt-1">
                Has completado todos los hitos requeridos de tu postulación.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
