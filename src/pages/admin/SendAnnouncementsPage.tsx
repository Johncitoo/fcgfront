import { useState, useEffect } from 'react';
import { useCallContext } from '../../contexts/CallContext';
import { apiGet, apiPost } from '../../lib/api';
import { Send, Users, User, Milestone, AlertCircle, CheckCircle2, Loader2, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Applicant {
  id: string;
  email: string;
  name: string;
}

interface MilestoneOption {
  id: string;
  title: string;
  description: string;
  whoCanFill: string[];
}

interface Institution {
  id: string;
  name: string;
}

interface SendResult {
  total: number;
  sent: number;
  failed: number;
  errors: string[];
}

export default function SendAnnouncementsPage() {
  const { selectedCall } = useCallContext();
  
  const [recipientType, setRecipientType] = useState<'all' | 'milestone' | 'applicant-list' | 'applicant-email' | 'institutions-all' | 'institution-single'>('all');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  // Para búsqueda de postulantes
  const [searchQuery, setSearchQuery] = useState('');
  const [allApplicants, setAllApplicants] = useState<Applicant[]>([]);
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([]);
  
  // Para hitos
  const [milestones, setMilestones] = useState<MilestoneOption[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState('');
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  
  // Para instituciones
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  
  // Para envío por email directo
  const [directEmail, setDirectEmail] = useState('');
  
  // Preview y envío
  const [previewRecipients, setPreviewRecipients] = useState<Applicant[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  useEffect(() => {
    if (selectedCall) {
      loadApplicants();
      loadMilestones();
      loadInstitutions();
    }
  }, [selectedCall]);

  const loadApplicants = async () => {
    if (!selectedCall) return;
    try {
      console.log('Cargando postulantes para call:', selectedCall.id);
      const response = await apiGet<any>(`/announcements/applicants/${selectedCall.id}`);
      console.log('Postulantes recibidos:', response);
      const list = Array.isArray(response) ? response : response.data || [];
      setAllApplicants(list.map((a: any) => ({
        id: a.id,
        email: a.email,
        name: a.first_name && a.last_name ? `${a.first_name} ${a.last_name}` : a.email,
      })));
    } catch (error) {
      console.error('Error loading applicants:', error);
    }
  };

  const loadMilestones = async () => {
    if (!selectedCall) return;
    setLoadingMilestones(true);
    try {
      const data = await apiGet<MilestoneOption[]>(`/announcements/milestones/${selectedCall.id}`);
      console.log('Milestones loaded:', data);
      setMilestones(data);
    } catch (error) {
      console.error('Error loading milestones:', error);
    } finally {
      setLoadingMilestones(false);
    }
  };

  const loadInstitutions = async () => {
    setLoadingInstitutions(true);
    try {
      console.log('Cargando instituciones...');
      const data = await apiGet<Institution[]>(`/institutions`);
      console.log('Instituciones recibidas:', data);
      const list = Array.isArray(data) ? data : (data as any).data || [];
      console.log('Instituciones procesadas:', list);
      setInstitutions(list);
    } catch (error) {
      console.error('Error loading institutions:', error);
      setInstitutions([]);
    } finally {
      setLoadingInstitutions(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedCall) return;
    
    try {
      // Para email directo de postulante
      if (recipientType === 'applicant-email') {
        if (!directEmail) {
          alert('Ingresa un email');
          return;
        }
        setPreviewRecipients([{ id: '', email: directEmail, name: directEmail }]);
        setShowPreview(true);
        return;
      }
      
      let dto: any = { recipientType, callId: selectedCall.id };
      
      if (recipientType === 'milestone') {
        if (!selectedMilestone) {
          alert('Selecciona un hito');
          return;
        }
        dto.milestoneId = selectedMilestone;
      } else if (recipientType === 'applicant-list') {
        if (selectedApplicants.length === 0) {
          alert('Selecciona al menos un postulante');
          return;
        }
        dto.recipientType = 'specific';
        dto.applicantIds = selectedApplicants;
      } else if (recipientType === 'institution-single') {
        // Si hay email directo para institución
        if (directEmail) {
          setPreviewRecipients([{ id: '', email: directEmail, name: directEmail }]);
          setShowPreview(true);
          return;
        }
        if (!selectedInstitution) {
          alert('Selecciona una institución o ingresa un email');
          return;
        }
        dto.institutionId = selectedInstitution;
      }
      
      const result = await apiPost<{ count: number; recipients: Applicant[] }>(
        '/announcements/preview',
        dto
      );
      
      setPreviewRecipients(result.recipients);
      setShowPreview(true);
    } catch (error: any) {
      alert('Error al obtener preview: ' + (error.message || error));
    }
  };

  const handleSend = async () => {
    if (!selectedCall) return;
    if (!subject.trim() || !message.trim()) {
      alert('Completa asunto y mensaje');
      return;
    }
    
    if (!confirm(`¿Enviar aviso a ${previewRecipients.length} destinatario(s)?`)) {
      return;
    }
    
    setSending(true);
    setSendResult(null);
    
    try {
      let dto: any = {
        subject: subject.trim(),
        message: message.trim(),
        callId: selectedCall.id,
      };
      
      if (recipientType === 'applicant-email') {
        dto.recipientType = 'single';
        dto.singleEmail = directEmail;
      } else if (recipientType === 'applicant-list') {
        dto.recipientType = 'specific';
        dto.applicantIds = selectedApplicants;
      } else if (recipientType === 'milestone') {
        dto.recipientType = 'milestone';
        dto.milestoneId = selectedMilestone;
      } else if (recipientType === 'institutions-all' || recipientType === 'institution-single') {
        dto.recipientType = recipientType;
        if (recipientType === 'institution-single') {
          if (directEmail) {
            // Si hay email directo, se usa como single
            dto.recipientType = 'single';
            dto.singleEmail = directEmail;
          } else {
            dto.institutionId = selectedInstitution;
          }
        }
      } else {
        dto.recipientType = recipientType; // 'all'
      }
      
      const result = await apiPost<SendResult>('/announcements/send', dto);
      setSendResult(result);
      
      if (result.sent > 0) {
        // Limpiar formulario si todo salió bien
        if (result.failed === 0) {
          setSubject('');
          setMessage('');
          setSelectedApplicants([]);
          setDirectEmail('');
          setShowPreview(false);
        }
      }
    } catch (error: any) {
      alert('Error al enviar: ' + (error.message || error));
    } finally {
      setSending(false);
    }
  };

  const filteredApplicants = allApplicants.filter(
    a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleApplicant = (id: string) => {
    setSelectedApplicants(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (!selectedCall) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
        <Card className="border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-amber-100 p-3">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">Sin convocatoria</h3>
              <p className="text-sm text-amber-700">Selecciona una convocatoria activa</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-sky-700 bg-clip-text text-transparent">
              Enviar Avisos
            </h1>
            <p className="mt-1 text-slate-600">
              Comunicaciones masivas - {selectedCall.name}
            </p>
          </div>
          <Badge className="gap-1.5 bg-sky-100 text-sky-700 border-sky-300">
            <Send className="h-3 w-3" />
            Avisos Masivos
          </Badge>
        </div>

        {/* Resultado del envío */}
        {sendResult && (
          <Card className={`border-l-4 ${sendResult.failed === 0 ? 'border-l-green-500 bg-green-50' : 'border-l-amber-500 bg-amber-50'}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                {sendResult.failed === 0 ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">
                    Envío completado: {sendResult.sent}/{sendResult.total} exitosos
                  </h3>
                  {sendResult.failed > 0 && (
                    <div className="mt-2 text-sm text-slate-700">
                      <p className="font-medium">Errores ({sendResult.failed}):</p>
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        {sendResult.errors.slice(0, 5).map((err, i) => (
                          <li key={i} className="text-xs">{err}</li>
                        ))}
                        {sendResult.errors.length > 5 && (
                          <li className="text-xs">... y {sendResult.errors.length - 5} más</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Configuración */}
          <Card>
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-sky-600" />
                Configuración del Aviso
              </CardTitle>
              <CardDescription>Define destinatarios y mensaje</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Tipo de destinatarios */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Destinatarios
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="radio"
                      name="recipientType"
                      value="all"
                      checked={recipientType === 'all'}
                      onChange={(e) => setRecipientType(e.target.value as any)}
                      className="w-4 h-4 text-sky-600"
                    />
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="font-medium">Todos los postulantes</span>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="radio"
                      name="recipientType"
                      value="milestone"
                      checked={recipientType === 'milestone'}
                      onChange={(e) => setRecipientType(e.target.value as any)}
                      className="w-4 h-4 text-sky-600"
                    />
                    <Milestone className="h-4 w-4 text-slate-500" />
                    <span className="font-medium">Por hito específico</span>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="radio"
                      name="recipientType"
                      value="applicant-list"
                      checked={recipientType === 'applicant-list'}
                      onChange={(e) => setRecipientType(e.target.value as any)}
                      className="w-4 h-4 text-sky-600"
                    />
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="font-medium">Postulante de la lista</span>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="radio"
                      name="recipientType"
                      value="applicant-email"
                      checked={recipientType === 'applicant-email'}
                      onChange={(e) => setRecipientType(e.target.value as any)}
                      className="w-4 h-4 text-sky-600"
                    />
                    <User className="h-4 w-4 text-slate-500" />
                    <span className="font-medium">Postulante por email</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="radio"
                      name="recipientType"
                      value="institutions-all"
                      checked={recipientType === 'institutions-all'}
                      onChange={(e) => setRecipientType(e.target.value as any)}
                      className="w-4 h-4 text-sky-600"
                    />
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <span className="font-medium">Todas las instituciones</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="radio"
                      name="recipientType"
                      value="institution-single"
                      checked={recipientType === 'institution-single'}
                      onChange={(e) => setRecipientType(e.target.value as any)}
                      className="w-4 h-4 text-sky-600"
                    />
                    <Building2 className="h-4 w-4 text-slate-500" />
                    <span className="font-medium">Institución específica</span>
                  </label>
                </div>
              </div>

              {/* Selector de hito */}
              {recipientType === 'milestone' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Seleccionar Hito
                  </label>
                  {loadingMilestones ? (
                    <div className="text-sm text-slate-500">Cargando hitos...</div>
                  ) : (
                    <select
                      value={selectedMilestone}
                      onChange={(e) => setSelectedMilestone(e.target.value)}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    >
                      <option value="">-- Selecciona un hito --</option>
                      {milestones.map(m => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Email directo (postulante o institución) */}
              {(recipientType === 'applicant-email' || recipientType === 'institution-single') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email del destinatario
                  </label>
                  <input
                    type="email"
                    value={directEmail}
                    onChange={(e) => setDirectEmail(e.target.value)}
                    placeholder={recipientType === 'applicant-email' ? 'postulante@example.com' : 'institucion@example.com'}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              )}

              {/* Selector de institución */}
              {recipientType === 'institution-single' && !directEmail && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    O seleccionar de la lista
                  </label>
                  {loadingInstitutions ? (
                    <div className="text-sm text-slate-500">Cargando instituciones...</div>
                  ) : (
                    <select
                      value={selectedInstitution}
                      onChange={(e) => setSelectedInstitution(e.target.value)}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    >
                      <option value="">-- Selecciona una institución --</option>
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Asunto */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Asunto
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Asunto del aviso"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>

              {/* Mensaje */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mensaje
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe el mensaje del aviso..."
                  rows={8}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
                />
              </div>

              <button
                onClick={handlePreview}
                className="w-full py-2 px-4 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition font-medium"
              >
                Vista Previa de Destinatarios
              </button>
            </CardContent>
          </Card>

          {/* Panel derecho - Selección específica o Preview */}
          <div className="space-y-6">
            {recipientType === 'applicant-list' && !showPreview && (
              <Card>
                <CardHeader className="border-b bg-slate-50/50">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-sky-600" />
                    Seleccionar Postulantes
                  </CardTitle>
                  <CardDescription>
                    {selectedApplicants.length} seleccionado(s)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre o email..."
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                  
                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    {filteredApplicants.map(applicant => (
                      <label
                        key={applicant.id}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedApplicants.includes(applicant.id)}
                          onChange={() => toggleApplicant(applicant.id)}
                          className="w-4 h-4 text-sky-600 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 truncate">
                            {applicant.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {applicant.email}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {showPreview && (
              <Card>
                <CardHeader className="border-b bg-slate-50/50">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-sky-600" />
                    Destinatarios ({previewRecipients.length})
                  </CardTitle>
                  <CardDescription>Revisa antes de enviar</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="border rounded-lg max-h-80 overflow-y-auto mb-4">
                    {previewRecipients.map((recipient, idx) => (
                      <div key={idx} className="p-3 border-b last:border-b-0 hover:bg-slate-50">
                        <p className="font-medium text-sm text-slate-900">{recipient.name}</p>
                        <p className="text-xs text-slate-500">{recipient.email}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={handleSend}
                      disabled={sending || !subject.trim() || !message.trim()}
                      className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Enviar Aviso
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => setShowPreview(false)}
                      disabled={sending}
                      className="w-full py-2 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                    >
                      Volver
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
