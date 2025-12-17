import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { selectionService, type ApplicantForSelection } from '@/services/selection.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

function FinalSelection() {
  const { callId } = useParams<{ callId: string }>();
  const token = localStorage.getItem('accessToken');

  const [applicants, setApplicants] = useState<ApplicantForSelection[]>([]);
  const [filteredApplicants, setFilteredApplicants] = useState<ApplicantForSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  
  // Modal de decisión
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [currentApplicant, setCurrentApplicant] = useState<ApplicantForSelection | null>(null);
  const [decisionType, setDecisionType] = useState<'SELECTED' | 'NOT_SELECTED'>('SELECTED');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadApplicants();
  }, [callId]);

  useEffect(() => {
    applyFilter();
  }, [filter, applicants]);

  async function loadApplicants() {
    if (!callId || !token) return;
    try {
      setLoading(true);
      const data = await selectionService.getApplicantsForSelection(callId, token);
      setApplicants(data);
    } catch (error) {
      console.error('Error loading applicants:', error);
      alert('Error al cargar postulantes');
    } finally {
      setLoading(false);
    }
  }

  function applyFilter() {
    if (filter === 'all') {
      setFilteredApplicants(applicants);
    } else if (filter === 'pending') {
      setFilteredApplicants(applicants.filter(a => 
        a.applicationStatus !== 'SELECTED' && a.applicationStatus !== 'NOT_SELECTED'
      ));
    } else if (filter === 'selected') {
      setFilteredApplicants(applicants.filter(a => a.applicationStatus === 'SELECTED'));
    } else if (filter === 'rejected') {
      setFilteredApplicants(applicants.filter(a => a.applicationStatus === 'NOT_SELECTED'));
    } else if (filter === 'completed') {
      setFilteredApplicants(applicants.filter(a => a.selectionStatus === 'ALL_COMPLETED'));
    } else if (filter === 'has_rejected') {
      setFilteredApplicants(applicants.filter(a => a.selectionStatus === 'HAS_REJECTED'));
    }
  }

  function openDecisionModal(applicant: ApplicantForSelection, decision: 'SELECTED' | 'NOT_SELECTED') {
    setCurrentApplicant(applicant);
    setDecisionType(decision);
    setDecisionReason('');
    setDecisionNotes('');
    setSendEmail(true);
    setShowDecisionModal(true);
  }

  async function confirmDecision() {
    if (!currentApplicant || !token) return;
    
    try {
      setProcessing(true);
      await selectionService.setFinalDecision(
        currentApplicant.applicationId,
        decisionType,
        decisionReason,
        decisionNotes,
        token
      );
      
      // TODO: Enviar email si sendEmail === true
      
      alert(`Postulante ${decisionType === 'SELECTED' ? 'seleccionado' : 'rechazado'} exitosamente`);
      setShowDecisionModal(false);
      await loadApplicants();
    } catch (error) {
      console.error('Error setting decision:', error);
      alert('Error al guardar decisión');
    } finally {
      setProcessing(false);
    }
  }

  function getStatusBadge(applicant: ApplicantForSelection) {
    if (applicant.applicationStatus === 'SELECTED') {
      return <Badge className="bg-green-600">✅ Seleccionado</Badge>;
    }
    if (applicant.applicationStatus === 'NOT_SELECTED') {
      return <Badge className="bg-red-600">❌ No Seleccionado</Badge>;
    }
    if (applicant.selectionStatus === 'HAS_REJECTED') {
      return <Badge className="bg-orange-600">⚠️ Tiene hitos rechazados</Badge>;
    }
    if (applicant.selectionStatus === 'ALL_COMPLETED') {
      return <Badge className="bg-blue-600">✔️ Todos completados</Badge>;
    }
    return <Badge className="bg-gray-600">⏳ En proceso</Badge>;
  }

  const stats = {
    total: applicants.length,
    selected: applicants.filter(a => a.applicationStatus === 'SELECTED').length,
    rejected: applicants.filter(a => a.applicationStatus === 'NOT_SELECTED').length,
    pending: applicants.filter(a => 
      a.applicationStatus !== 'SELECTED' && a.applicationStatus !== 'NOT_SELECTED'
    ).length,
  };

  if (loading) {
    return <div className="container mx-auto p-6">Cargando postulantes...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">📋 Selección Final</h1>
        <p className="text-gray-600">Revisa y decide qué postulantes son seleccionados para la convocatoria</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.selected}</div>
            <div className="text-sm text-gray-600">Seleccionados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600">Rechazados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pendientes</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <Filter className="h-5 w-5 text-gray-600" />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({applicants.length})</SelectItem>
            <SelectItem value="pending">Pendientes ({stats.pending})</SelectItem>
            <SelectItem value="selected">Seleccionados ({stats.selected})</SelectItem>
            <SelectItem value="rejected">Rechazados ({stats.rejected})</SelectItem>
            <SelectItem value="completed">Todos completados</SelectItem>
            <SelectItem value="has_rejected">Con hitos rechazados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de postulantes */}
      <div className="space-y-4">
        {filteredApplicants.map((applicant) => (
          <Card key={applicant.applicationId}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{applicant.applicantName}</CardTitle>
                  <div className="text-sm text-gray-600 mt-1">
                    📧 {applicant.email} | RUT: {applicant.rutNumber}-{applicant.rutDv}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {getStatusBadge(applicant)}
                    {applicant.totalScore !== null && (
                      <span className="text-sm text-gray-600">Puntaje: {applicant.totalScore}/100</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {applicant.applicationStatus !== 'SELECTED' && applicant.applicationStatus !== 'NOT_SELECTED' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => openDecisionModal(applicant, 'SELECTED')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Aceptar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDecisionModal(applicant, 'NOT_SELECTED')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rechazar
                      </Button>
                    </>
                  )}
                  {(applicant.applicationStatus === 'SELECTED' || applicant.applicationStatus === 'NOT_SELECTED') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDecisionModal(
                        applicant,
                        applicant.applicationStatus === 'SELECTED' ? 'NOT_SELECTED' : 'SELECTED'
                      )}
                    >
                      🔄 Cambiar decisión
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="font-semibold">Hitos completados:</span> {applicant.completedMilestones}/{applicant.totalMilestones}
                </div>
                <div>
                  <span className="font-semibold">Aprobados:</span> <span className="text-green-600">{applicant.approvedMilestones}</span>
                </div>
                <div>
                  <span className="font-semibold">Rechazados:</span> <span className="text-red-600">{applicant.rejectedMilestones}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de decisión */}
      <Dialog open={showDecisionModal} onOpenChange={setShowDecisionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionType === 'SELECTED' ? '✅ Confirmar Selección' : '❌ Confirmar Rechazo'}
            </DialogTitle>
            <DialogDescription>
              {currentApplicant && `${currentApplicant.applicantName} - ${currentApplicant.email}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {decisionType === 'NOT_SELECTED' && (
              <div>
                <Label htmlFor="reason">Motivo (requerido)</Label>
                <Select value={decisionReason} onValueChange={setDecisionReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incomplete_milestones">No cumplió todos los hitos</SelectItem>
                    <SelectItem value="low_score">Puntaje insuficiente</SelectItem>
                    <SelectItem value="quota_full">Cupos completos</SelectItem>
                    <SelectItem value="other">Otro motivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Notas internas (opcional)</Label>
              <Textarea
                id="notes"
                value={decisionNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDecisionNotes(e.target.value)}
                placeholder="Agrega notas para referencia interna..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendEmail"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked as boolean)}
              />
              <Label htmlFor="sendEmail" className="cursor-pointer">
                Enviar email de notificación ahora
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDecisionModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmDecision}
              disabled={processing || (decisionType === 'NOT_SELECTED' && !decisionReason)}
              className={decisionType === 'SELECTED' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {processing ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FinalSelection;
