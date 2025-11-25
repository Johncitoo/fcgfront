import { useState, useEffect } from 'react'
import { useCallContext } from '../../contexts/CallContext'
import { Plus, Trash2, Save, GripVertical, AlertCircle } from 'lucide-react'
import { milestonesService } from '../../services/milestones.service'
import { formsService } from '../../services/forms.service'

interface Milestone {
  id?: string
  name: string
  description: string
  order_index: number
  required: boolean
  form_id?: string | null
}

interface Form {
  id: string
  name: string
  description?: string
}

export default function MilestoneCreator() {
  const { selectedCall } = useCallContext()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (selectedCall?.id) {
      loadMilestones()
      loadForms()
    }
  }, [selectedCall?.id])

  async function loadMilestones() {
    if (!selectedCall?.id) return
    try {
      setLoading(true)
      const token = localStorage.getItem('accessToken') || ''
      const data = await milestonesService.getByCall(selectedCall.id, token)
      // Mapear camelCase a snake_case
      const mapped = data.map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description || '',
        order_index: m.orderIndex,
        required: m.required,
        form_id: m.formId
      }))
      setMilestones(mapped.sort((a, b) => a.order_index - b.order_index))
    } catch (err: any) {
      setError(err.message || 'Error al cargar hitos')
    } finally {
      setLoading(false)
    }
  }

  async function loadForms() {
    try {
      const data = await formsService.getAll()
      setForms(data)
    } catch (err) {
      console.error('Error loading forms:', err)
    }
  }

  function addMilestone() {
    const newMilestone: Milestone = {
      name: '',
      description: '',
      order_index: milestones.length + 1,
      required: true,
      form_id: null
    }
    setMilestones([...milestones, newMilestone])
  }

  function updateMilestone(index: number, field: keyof Milestone, value: any) {
    const updated = [...milestones]
    updated[index] = { ...updated[index], [field]: value }
    setMilestones(updated)
  }

  function removeMilestone(index: number) {
    const updated = milestones.filter((_, i) => i !== index)
    // Reordenar
    updated.forEach((m, i) => m.order_index = i + 1)
    setMilestones(updated)
  }

  function moveUp(index: number) {
    if (index === 0) return
    const updated = [...milestones]
    ;[updated[index], updated[index - 1]] = [updated[index - 1], updated[index]]
    updated.forEach((m, i) => m.order_index = i + 1)
    setMilestones(updated)
  }

  function moveDown(index: number) {
    if (index === milestones.length - 1) return
    const updated = [...milestones]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    updated.forEach((m, i) => m.order_index = i + 1)
    setMilestones(updated)
  }

  async function saveAllMilestones() {
    if (!selectedCall?.id) return
    
    setSaving(true)
    setError('')
    setSuccess('')
    
    try {
      // Validar
      for (const m of milestones) {
        if (!m.name.trim()) {
          throw new Error('Todos los hitos deben tener un nombre')
        }
      }

      // Guardar uno por uno
      const token = localStorage.getItem('accessToken') || ''
      for (const milestone of milestones) {
        const payload = {
          callId: selectedCall.id,
          name: milestone.name,
          description: milestone.description,
          orderIndex: milestone.order_index,
          required: milestone.required,
          formId: milestone.form_id || undefined,
          status: 'ACTIVE',
          whoCanFill: ['APPLICANT']
        }

        if (milestone.id) {
          await milestonesService.update(milestone.id, payload, token)
        } else {
          const created = await milestonesService.create(payload as any, token)
          milestone.id = created.id
        }
      }

      setSuccess('✅ Hitos guardados exitosamente')
      setTimeout(() => setSuccess(''), 3000)
      await loadMilestones()
    } catch (err: any) {
      setError(err.message || 'Error al guardar hitos')
    } finally {
      setSaving(false)
    }
  }

  if (!selectedCall) {
    return (
      <div className="p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-1">
              Selecciona una Convocatoria
            </h3>
            <p className="text-amber-700 text-sm">
              Usa el selector de convocatorias en el menú lateral para comenzar a configurar hitos.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📍 Configurar Hitos
        </h1>
        <p className="text-gray-600">
          Convocatoria: <span className="font-semibold">{selectedCall.name} {selectedCall.year}</span>
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando hitos...</div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  {/* Controles de orden */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <GripVertical className="w-5 h-5 text-gray-300" />
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === milestones.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-500 w-8">
                        #{milestone.order_index}
                      </span>
                      <input
                        type="text"
                        placeholder="Nombre del hito (ej: 📝 Postulación Inicial)"
                        value={milestone.name}
                        onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                      />
                    </div>

                    <textarea
                      placeholder="Descripción (opcional)"
                      value={milestone.description}
                      onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />

                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={milestone.required}
                          onChange={(e) => updateMilestone(index, 'required', e.target.checked)}
                          className="w-4 h-4 text-sky-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Obligatorio</span>
                      </label>

                      <select
                        value={milestone.form_id || ''}
                        onChange={(e) => updateMilestone(index, 'form_id', e.target.value || null)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="">Sin formulario asignado</option>
                        {forms.map(form => (
                          <option key={form.id} value={form.id}>
                            {form.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Eliminar */}
                  <button
                    onClick={() => removeMilestone(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={addMilestone}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Plus className="w-4 h-4" />
              Agregar Hito
            </button>

            <button
              onClick={saveAllMilestones}
              disabled={saving || milestones.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Todos'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
