import { useEffect, useState } from 'react';
import { milestonesService, type MilestoneProgress, type ProgressSummary } from '@/services/milestones.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

interface ProgressTrackerProps {
  applicationId: string;
}

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
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Cargando progreso...</p>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tu Progreso</CardTitle>
        <CardDescription>
          {summary.completed} de {summary.total} hitos completados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{Math.round(summary.percentage)}% Completado</span>
            <span className="text-gray-500">
              {summary.pending} pendiente{summary.pending !== 1 ? 's' : ''}
            </span>
          </div>
          <Progress value={summary.percentage} className="h-3" />
        </div>

        {/* Timeline */}
        <div className="space-y-3 pt-4">
          {progress.map((milestone, index) => (
            <div key={milestone.id} className="relative">
              {/* Connecting line */}
              {index < progress.length - 1 && (
                <div className="absolute left-3 top-10 bottom-0 w-0.5 bg-gray-300" />
              )}

              {/* Milestone card */}
              <div className={`relative flex gap-4 p-4 rounded-lg border-2 ${getStatusColor(milestone.status)}`}>
                <div className="flex-shrink-0">{getStatusIcon(milestone.status)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm">
                        {milestone.orderIndex + 1}. {milestone.milestoneName}
                        {milestone.required && <span className="text-red-500 ml-1">*</span>}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">{getStatusText(milestone.status)}</p>
                    </div>
                    {summary.currentMilestone?.id === milestone.id && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        Actual
                      </span>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="mt-2 space-y-1 text-xs text-gray-500">
                    {milestone.startedAt && (
                      <div>Iniciado: {new Date(milestone.startedAt).toLocaleDateString()}</div>
                    )}
                    {milestone.completedAt && (
                      <div className="text-green-600 font-medium">
                        Completado: {new Date(milestone.completedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary message */}
        {summary.percentage === 100 && (
          <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg text-center">
            <p className="text-green-800 font-medium">
              ¡Felicitaciones! Has completado todos los hitos requeridos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
