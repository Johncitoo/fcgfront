import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { milestonesService, type Milestone } from '@/services/milestones.service';
import { formsService, type Form } from '@/services/forms.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUp, ArrowDown, Save, Trash2, X } from 'lucide-react';

interface MilestoneForm {
  id?: string;
  name: string;
  description: string;
  formId?: string;
  orderIndex: number;
  required: boolean;
  whoCanFill: string[];
  dueDate?: string;
  status: string;
}

export default function MilestoneManagement() {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const emptyMilestone: MilestoneForm = {
    name: '',
    description: '',
    orderIndex: milestones.length,
    required: true,
    whoCanFill: ['APPLICANT'],
    status: 'ACTIVE',
  };

  const [currentMilestone, setCurrentMilestone] = useState<MilestoneForm>(emptyMilestone);

  useEffect(() => {
    loadData();
  }, [callId]);

  async function loadData() {
    if (!callId || !token) return;
    try {
      setLoading(true);
      const [milestonesData, formsData] = await Promise.all([
        milestonesService.getByCall(callId, token),
        formsService.getAll(false, token),
      ]);
      setMilestones(milestonesData);
      setForms(formsData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!callId || !token) return;
    if (!currentMilestone.name.trim()) {
      alert('El nombre del hito es obligatorio');
      return;
    }

    try {
      setSaving(true);
      if (currentMilestone.id) {
        // Update existing
        await milestonesService.update(currentMilestone.id, currentMilestone, token);
      } else {
        // Create new
        await milestonesService.create({ ...currentMilestone, callId }, token);
      }
      await loadData();
      setEditingIndex(null);
      setCurrentMilestone(emptyMilestone);
    } catch (error) {
      console.error('Error saving milestone:', error);
      alert('Error al guardar el hito');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token || !confirm('¿Estás seguro de eliminar este hito?')) return;
    try {
      await milestonesService.delete(id, token);
      await loadData();
    } catch (error) {
      console.error('Error deleting milestone:', error);
      alert('Error al eliminar el hito');
    }
  }

  async function handleReorder(index: number, direction: 'up' | 'down') {
    if (!token) return;
    const newMilestones = [...milestones];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newMilestones.length) return;

    // Swap
    [newMilestones[index], newMilestones[targetIndex]] = [newMilestones[targetIndex], newMilestones[index]];

    // Update orderIndex
    try {
      await Promise.all(
        newMilestones.map((m, i) => milestonesService.update(m.id, { orderIndex: i }, token))
      );
      await loadData();
    } catch (error) {
      console.error('Error reordering milestones:', error);
      alert('Error al reordenar los hitos');
    }
  }

  function handleEdit(milestone: Milestone, index: number) {
    setCurrentMilestone({
      id: milestone.id,
      name: milestone.name,
      description: milestone.description || '',
      formId: milestone.formId,
      orderIndex: milestone.orderIndex,
      required: milestone.required,
      whoCanFill: milestone.whoCanFill,
      dueDate: milestone.dueDate,
      status: milestone.status,
    });
    setEditingIndex(index);
  }

  function handleCancel() {
    setEditingIndex(null);
    setCurrentMilestone(emptyMilestone);
  }

  if (loading) {
    return <div className="container mx-auto p-4">Cargando...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración de Hitos</h1>
          <p className="text-gray-600">Gestiona los hitos y formularios de esta convocatoria</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>

      {/* List of existing milestones */}
      <div className="space-y-4 mb-6">
        {milestones.map((milestone, index) => (
          <Card key={milestone.id} className={editingIndex === index ? 'border-blue-500' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {index + 1}. {milestone.name}
                    {milestone.required && <span className="text-red-500 ml-1">*</span>}
                  </CardTitle>
                  <CardDescription>{milestone.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReorder(index, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReorder(index, 'down')}
                    disabled={index === milestones.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(milestone, index)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(milestone.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 space-y-1">
                {milestone.formId && (
                  <div>
                    <strong>Formulario:</strong> {forms.find((f) => f.id === milestone.formId)?.name || 'N/A'}
                  </div>
                )}
                <div>
                  <strong>Quién puede completar:</strong> {milestone.whoCanFill.join(', ')}
                </div>
                <div>
                  <strong>Estado:</strong> {milestone.status}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form to create/edit milestone */}
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle>
            {editingIndex !== null ? 'Editar Hito' : 'Nuevo Hito'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={currentMilestone.name}
                onChange={(e) => setCurrentMilestone({ ...currentMilestone, name: e.target.value })}
                placeholder="ej: Postulación Inicial"
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={currentMilestone.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentMilestone({ ...currentMilestone, description: e.target.value })}
                placeholder="Descripción del hito"
              />
            </div>

            <div>
              <Label htmlFor="formId">Formulario Asociado</Label>
              <Select
                value={currentMilestone.formId || ''}
                onValueChange={(value: string) => setCurrentMilestone({ ...currentMilestone, formId: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un formulario (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin formulario</SelectItem>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="whoCanFill">Quién puede completar</Label>
              <div className="space-y-2 mt-2">
                {['APPLICANT', 'ADMIN', 'REVIEWER'].map((role) => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={role}
                      checked={currentMilestone.whoCanFill.includes(role)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCurrentMilestone({
                            ...currentMilestone,
                            whoCanFill: [...currentMilestone.whoCanFill, role],
                          });
                        } else {
                          setCurrentMilestone({
                            ...currentMilestone,
                            whoCanFill: currentMilestone.whoCanFill.filter((r) => r !== role),
                          });
                        }
                      }}
                    />
                    <Label htmlFor={role} className="font-normal cursor-pointer">
                      {role}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="required"
                checked={currentMilestone.required}
                onCheckedChange={(checked) =>
                  setCurrentMilestone({ ...currentMilestone, required: checked as boolean })
                }
              />
              <Label htmlFor="required" className="font-normal cursor-pointer">
                Hito obligatorio
              </Label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : editingIndex !== null ? 'Actualizar' : 'Crear Hito'}
              </Button>
              {editingIndex !== null && (
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
              {editingIndex === null && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentMilestone(emptyMilestone)}
                  disabled={!currentMilestone.name}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
          Finalizar y Volver
        </Button>
      </div>
    </div>
  );
}
