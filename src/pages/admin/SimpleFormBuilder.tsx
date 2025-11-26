import { useEffect, useState } from 'react'
import { 
  Plus, Trash2, Eye, GripVertical, Save, FileText,
  AlertCircle, CheckCircle2, ArrowLeft
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCallContext } from '../../contexts/CallContext'
import { CallStatusBadge } from '../../components/CallStatusBadge'

type FieldType =
  | 'text' | 'textarea' | 'number' | 'decimal' | 'date'
  | 'select' | 'radio' | 'checkbox' | 'file' | 'image'

interface FormOption {
  id: string
  value: string
  label: string
}

interface FormField {
  id: string
  name: string
  label: string
  type: FieldType
  helpText?: string
  required?: boolean
  active?: boolean
  placeholder?: string
  options?: FormOption[]
}

interface FormSection {
  id: string
  title: string
  description?: string
  fields: FormField[]
}

interface FormData {
  id?: string
  title: string
  description?: string
  sections: FormSection[]
}

interface Milestone {
  id: string
  name: string
  description?: string
  orderIndex: number
  required: boolean
  formId?: string
  callId: string
  status: string
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

const FIELD_TEMPLATES = [
  { 
    id: 'text',
    name: 'Texto corto',
    description: 'Para nombres, RUT, email, teléfono',
    icon: 'T',
    example: 'Ejemplo: Juan Pérez'
  },
  { 
    id: 'textarea',
    name: 'Texto largo',
    description: 'Para descripciones, comentarios',
    icon: 'TT',
    example: 'Varias líneas de texto...'
  },
  { 
    id: 'number',
    name: 'Número',
    description: 'Para edad, cantidad, puntaje',
    icon: '#',
    example: '25'
  },
  { 
    id: 'date',
    name: 'Fecha',
    description: 'Para fecha de nacimiento, etc',
    icon: 'Cal',
    example: '01/01/2000'
  },
  { 
    id: 'select',
    name: 'Lista de opciones',
    description: 'Elegir una opción de una lista',
    icon: '▼',
    example: 'Opción 1, Opción 2...'
  },
  { 
    id: 'radio',
    name: 'Sí/No o múltiples opciones',
    description: 'Elegir solo una opción',
    icon: '○',
    example: 'Sí / No'
  },
  { 
    id: 'checkbox',
    name: 'Varias opciones',
    description: 'Elegir varias opciones',
    icon: '☐',
    example: 'Opción 1, Opción 2'
  },
  { 
    id: 'file',
    name: 'Subir archivo',
    description: 'Para PDF, Word, etc',
    icon: '□',
    example: 'Seleccionar archivo...'
  },
  { 
    id: 'image',
    name: 'Subir imagen',
    description: 'Para fotos, comprobantes',
    icon: '▢',
    example: 'Seleccionar imagen...'
  },
]

export default function SimpleFormBuilder() {
  const { selectedCall } = useCallContext()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('')
  const [formData, setFormData] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showFieldPicker, setShowFieldPicker] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<{ sectionId: string; fieldId: string } | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  const token = localStorage.getItem('fcg.access_token') ?? ''
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // Cargar hitos cuando cambia convocatoria
  useEffect(() => {
    if (!selectedCall?.id) {
      setMilestones([])
      setSelectedMilestoneId('')
      setFormData(null)
      return
    }
    loadMilestones()
  }, [selectedCall?.id])

  // Cargar formulario cuando cambia hito
  useEffect(() => {
    if (!selectedMilestoneId) {
      setFormData(null)
      return
    }
    loadForm()
  }, [selectedMilestoneId])

  async function loadMilestones() {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/milestones/call/${selectedCall?.id}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setMilestones(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadForm() {
    try {
      setLoading(true)
      const milestone = milestones.find(m => m.id === selectedMilestoneId)
      if (!milestone?.formId) {
        // Crear formulario vacío
        setFormData({
          title: `Formulario: ${milestone?.name || 'Nuevo'}`,
          description: '',
          sections: []
        })
        return
      }
      const res = await fetch(`${API_BASE}/forms/${milestone.formId}`, { headers })
      if (res.ok) {
        const data = await res.json()
        console.log('[SimpleFormBuilder] Form cargado:', data)
        
        // Extraer sections del schema si existe
        const sections = data.schema?.sections || data.sections || []
        
        setFormData({
          id: data.id,
          title: data.title || data.name || `Formulario: ${milestone?.name || 'Nuevo'}`,
          description: data.description || '',
          sections: Array.isArray(sections) ? sections : []
        })
        
        console.log('[SimpleFormBuilder] Secciones cargadas:', sections.length)
      }
    } catch (err) {
      console.error(err)
      // En caso de error, crear formulario vacío
      const milestone = milestones.find(m => m.id === selectedMilestoneId)
      setFormData({
        title: `Formulario: ${milestone?.name || 'Nuevo'}`,
        description: '',
        sections: []
      })
    } finally {
      setLoading(false)
    }
  }

  async function saveForm() {
    if (!formData || !selectedMilestoneId) return
    setSaving(true)
    try {
      const milestone = milestones.find(m => m.id === selectedMilestoneId)
      
      console.log('[SimpleFormBuilder] Guardando formulario...', {
        formDataSections: formData.sections.length,
        milestoneFormId: milestone?.formId
      })
      
      if (milestone?.formId) {
        // Actualizar
        console.log('[SimpleFormBuilder] PATCH a /forms/' + milestone.formId)
        const res = await fetch(`${API_BASE}/forms/${milestone.formId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(formData)
        })
        console.log('[SimpleFormBuilder] PATCH response:', res.status, res.ok)
        
        if (!res.ok) {
          const error = await res.text()
          console.error('[SimpleFormBuilder] Error PATCH:', error)
          throw new Error('Error al actualizar: ' + error)
        }
      } else {
        // Crear
        console.log('[SimpleFormBuilder] POST a /forms')
        const res = await fetch(`${API_BASE}/forms`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...formData, milestoneId: selectedMilestoneId })
        })
        console.log('[SimpleFormBuilder] POST response:', res.status, res.ok)
        
        if (res.ok) {
          const newForm = await res.json()
          console.log('[SimpleFormBuilder] Form creado:', newForm.id)
          
          // Asociar form al milestone
          await fetch(`${API_BASE}/milestones/${selectedMilestoneId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ formId: newForm.id })
          })
        } else {
          const error = await res.text()
          console.error('[SimpleFormBuilder] Error POST:', error)
          throw new Error('Error al crear: ' + error)
        }
      }
      alert('✅ Formulario guardado correctamente')
      await loadForm() // Recargar el formulario para ver los cambios
    } catch (err: any) {
      console.error('[SimpleFormBuilder] Error al guardar:', err)
      alert('❌ Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function addSection() {
    if (!formData) return
    const newSection: FormSection = {
      id: `tmp_${Date.now()}`,
      title: 'Nueva sección',
      description: '',
      fields: []
    }
    setFormData({ ...formData, sections: [...formData.sections, newSection] })
  }

  function updateSection(sectionId: string, updates: Partial<FormSection>) {
    if (!formData) return
    setFormData({
      ...formData,
      sections: formData.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s)
    })
  }

  function deleteSection(sectionId: string) {
    if (!formData) return
    if (!confirm('¿Eliminar esta sección?')) return
    setFormData({
      ...formData,
      sections: formData.sections.filter(s => s.id !== sectionId)
    })
  }

  function addField(sectionId: string, fieldType: FieldType) {
    if (!formData) return
    const template = FIELD_TEMPLATES.find(t => t.id === fieldType)
    const newField: FormField = {
      id: `tmp_${Date.now()}`,
      name: `campo_${Date.now()}`,
      label: template?.name || 'Nueva pregunta',
      type: fieldType,
      required: false,
      active: true,
      options: ['select', 'radio', 'checkbox'].includes(fieldType) ? [
        { id: `opt_1`, value: 'opcion_1', label: 'Opción 1' },
        { id: `opt_2`, value: 'opcion_2', label: 'Opción 2' }
      ] : undefined
    }
    setFormData({
      ...formData,
      sections: formData.sections.map(s => 
        s.id === sectionId ? { ...s, fields: [...s.fields, newField] } : s
      )
    })
    setShowFieldPicker(null)
    setEditingField({ sectionId, fieldId: newField.id })
  }

  function updateField(sectionId: string, fieldId: string, updates: Partial<FormField>) {
    if (!formData) return
    setFormData({
      ...formData,
      sections: formData.sections.map(s =>
        s.id === sectionId
          ? { ...s, fields: s.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f) }
          : s
      )
    })
  }

  function deleteField(sectionId: string, fieldId: string) {
    if (!formData) return
    if (!confirm('¿Eliminar esta pregunta?')) return
    setFormData({
      ...formData,
      sections: formData.sections.map(s =>
        s.id === sectionId ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) } : s
      )
    })
  }

  function addOption(sectionId: string, fieldId: string) {
    if (!formData) return
    const section = formData.sections.find(s => s.id === sectionId)
    const field = section?.fields.find(f => f.id === fieldId)
    if (!field) return
    const newOpt: FormOption = {
      id: `opt_${Date.now()}`,
      value: `opcion_${(field.options?.length || 0) + 1}`,
      label: `Opción ${(field.options?.length || 0) + 1}`
    }
    updateField(sectionId, fieldId, { options: [...(field.options || []), newOpt] })
  }

  function updateOption(sectionId: string, fieldId: string, optId: string, label: string) {
    if (!formData) return
    const section = formData.sections.find(s => s.id === sectionId)
    const field = section?.fields.find(f => f.id === fieldId)
    if (!field) return
    updateField(sectionId, fieldId, {
      options: (field.options || []).map(o => o.id === optId ? { ...o, label, value: label.toLowerCase().replace(/\s+/g, '_') } : o)
    })
  }

  function deleteOption(sectionId: string, fieldId: string, optId: string) {
    if (!formData) return
    const section = formData.sections.find(s => s.id === sectionId)
    const field = section?.fields.find(f => f.id === fieldId)
    if (!field) return
    updateField(sectionId, fieldId, {
      options: (field.options || []).filter(o => o.id !== optId)
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Link to="/admin" className="p-2 hover:bg-slate-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-6 h-6 text-sky-600" />
                  Diseñador de Formularios
                </h1>
                <p className="text-sm text-slate-500">Crea formularios fácil y rápido</p>
              </div>
            </div>

            <CallStatusBadge />

            {formData && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                    previewMode ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  {previewMode ? 'Previsualizando' : 'Ver vista previa'}
                </button>
                <button
                  onClick={saveForm}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar formulario'}
                </button>
              </div>
            )}
          </div>

          {/* Selector de hito */}
          {!selectedCall ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">
                    Selecciona una Convocatoria
                  </h3>
                  <p className="text-amber-700 text-sm">
                    Usa el selector de convocatorias en el menú lateral para comenzar.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-md">
              <label className="block text-sm font-medium mb-2">Selecciona el hito</label>
              <select
                value={selectedMilestoneId}
                onChange={(e) => setSelectedMilestoneId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                disabled={loading}
              >
                <option value="">Selecciona un hito...</option>
                {milestones.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.orderIndex}. {m.name} {m.formId ? '✅' : ''}
                  </option>
                ))}
              </select>
              {milestones.length === 0 && !loading && (
                <p className="text-sm text-amber-600 mt-1">
                  Esta convocatoria no tiene hitos. <Link to="/admin/hitos" className="underline">Configúralos aquí</Link>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {!formData ? (
          <div className="text-center py-20 bg-white rounded-lg border">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Selecciona un hito para comenzar</h2>
            <p className="text-slate-600">Elige una convocatoria y un hito arriba</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Título del formulario */}
            {!previewMode && (
              <div className="bg-white rounded-lg border p-6">
                <label className="block text-sm font-medium mb-2">Título del formulario</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg text-lg font-semibold focus:ring-2 focus:ring-sky-500"
                  placeholder="Ej: Formulario de Postulación"
                />
                <label className="block text-sm font-medium mb-2 mt-4">Descripción (opcional)</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                  rows={2}
                  placeholder="Ej: Completa este formulario con tus datos personales y académicos"
                />
              </div>
            )}

            {/* Secciones */}
            {formData.sections.map((section) => (
              <div key={section.id} className="bg-white rounded-lg border">
                {/* Header sección */}
                <div className="bg-slate-50 border-b p-4">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-5 h-5 text-slate-400 mt-2" />
                    <div className="flex-1">
                      {!previewMode ? (
                        <>
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => updateSection(section.id, { title: e.target.value })}
                            className="w-full text-lg font-semibold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none px-2 -mx-2 py-1"
                            placeholder="Título de la sección"
                          />
                          <input
                            type="text"
                            value={section.description || ''}
                            onChange={(e) => updateSection(section.id, { description: e.target.value })}
                            className="w-full text-sm text-slate-600 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none px-2 -mx-2 py-1 mt-1"
                            placeholder="Descripción opcional"
                          />
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold">{section.title}</h3>
                          {section.description && (
                            <p className="text-sm text-slate-600 mt-1">{section.description}</p>
                          )}
                        </>
                      )}
                    </div>
                    {!previewMode && (
                      <button
                        onClick={() => deleteSection(section.id)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg"
                        title="Eliminar sección"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Campos */}
                <div className="p-4 space-y-4">
                  {section.fields.length === 0 && !previewMode && (
                    <p className="text-center text-slate-400 py-4">
                      No hay preguntas en esta sección. Añade una pregunta abajo.
                    </p>
                  )}

                  {section.fields.map((field) => (
                    <FieldEditor
                      key={field.id}
                      field={field}
                      sectionId={section.id}
                      isEditing={editingField?.sectionId === section.id && editingField?.fieldId === field.id}
                      previewMode={previewMode}
                      onStartEdit={() => setEditingField({ sectionId: section.id, fieldId: field.id })}
                      onUpdate={(updates) => updateField(section.id, field.id, updates)}
                      onDelete={() => deleteField(section.id, field.id)}
                      onAddOption={() => addOption(section.id, field.id)}
                      onUpdateOption={(optId, label) => updateOption(section.id, field.id, optId, label)}
                      onDeleteOption={(optId) => deleteOption(section.id, field.id, optId)}
                    />
                  ))}

                  {/* Añadir campo */}
                  {!previewMode && (
                    <div className="relative">
                      <button
                        onClick={() => setShowFieldPicker(showFieldPicker === section.id ? null : section.id)}
                        className="w-full py-3 border-2 border-dashed rounded-lg hover:border-sky-400 hover:bg-sky-50 text-slate-600 hover:text-sky-600 font-medium flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Añadir pregunta
                      </button>

                      {showFieldPicker === section.id && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-300 rounded-lg shadow-2xl p-4 z-50 grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                          {FIELD_TEMPLATES.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => addField(section.id, template.id as FieldType)}
                              className="text-left p-4 border-2 rounded-lg hover:border-sky-500 hover:bg-sky-50 transition-all bg-white shadow-sm"
                            >
                              <div className="text-3xl mb-2">{template.icon}</div>
                              <div className="font-semibold text-sm text-gray-900">{template.name}</div>
                              <div className="text-xs text-gray-600 mt-1">{template.description}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Añadir sección */}
            {!previewMode && (
              <button
                onClick={addSection}
                className="w-full py-6 border-2 border-dashed rounded-lg hover:border-sky-400 hover:bg-sky-50 text-slate-600 hover:text-sky-600 font-medium flex items-center justify-center gap-2"
              >
                <Plus className="w-6 h-6" />
                Añadir nueva sección
              </button>
            )}

            {/* Ayuda */}
            {!previewMode && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">Consejo:</p>
                    <ul className="space-y-1 text-blue-800">
                      <li>• Organiza las preguntas en secciones (ej: "Datos Personales", "Antecedentes")</li>
                      <li>• Haz clic en cualquier pregunta para editarla</li>
                      <li>• Usa "Vista previa" para ver cómo se verá el formulario</li>
                      <li>• No olvides guardar los cambios antes de salir</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Componente para editar campo
interface FieldEditorProps {
  field: FormField
  sectionId: string
  isEditing: boolean
  previewMode: boolean
  onStartEdit: () => void
  onUpdate: (updates: Partial<FormField>) => void
  onDelete: () => void
  onAddOption: () => void
  onUpdateOption: (optId: string, label: string) => void
  onDeleteOption: (optId: string) => void
}

function FieldEditor({
  field,
  isEditing,
  previewMode,
  onStartEdit,
  onUpdate,
  onDelete,
  onAddOption,
  onUpdateOption,
  onDeleteOption
}: FieldEditorProps) {
  const template = FIELD_TEMPLATES.find(t => t.id === field.type)
  const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type)

  if (previewMode) {
    return (
      <div className="space-y-2">
        <label className="block font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {field.helpText && <p className="text-sm text-slate-500">{field.helpText}</p>}
        
        {field.type === 'text' && (
          <input type="text" placeholder={field.placeholder} className="w-full px-3 py-2 border rounded-lg" disabled />
        )}
        {field.type === 'textarea' && (
          <textarea placeholder={field.placeholder} className="w-full px-3 py-2 border rounded-lg" rows={3} disabled />
        )}
        {field.type === 'number' && (
          <input type="number" placeholder={field.placeholder} className="w-full px-3 py-2 border rounded-lg" disabled />
        )}
        {field.type === 'date' && (
          <input type="date" className="w-full px-3 py-2 border rounded-lg" disabled />
        )}
        {field.type === 'select' && (
          <select className="w-full px-3 py-2 border rounded-lg" disabled>
            <option>Seleccionar...</option>
            {(field.options || []).map(opt => <option key={opt.id}>{opt.label}</option>)}
          </select>
        )}
        {field.type === 'radio' && (
          <div className="space-y-2">
            {(field.options || []).map(opt => (
              <label key={opt.id} className="flex items-center gap-2">
                <input type="radio" name={field.id} disabled />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        )}
        {field.type === 'checkbox' && (
          <div className="space-y-2">
            {(field.options || []).map(opt => (
              <label key={opt.id} className="flex items-center gap-2">
                <input type="checkbox" disabled />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        )}
        {(field.type === 'file' || field.type === 'image') && (
          <div className="border-2 border-dashed rounded-lg p-6 text-center text-slate-400">
            <div className="text-3xl mb-2">{template?.icon}</div>
            <p className="text-sm">Subir {field.type === 'image' ? 'imagen' : 'archivo'}</p>
          </div>
        )}
      </div>
    )
  }

  if (!isEditing) {
    return (
      <div
        onClick={onStartEdit}
        className="flex items-start gap-3 p-3 border rounded-lg hover:border-sky-400 hover:bg-sky-50 cursor-pointer transition-all"
      >
        <div className="text-2xl">{template?.icon}</div>
        <div className="flex-1">
          <div className="font-medium">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </div>
          <div className="text-sm text-slate-500">{template?.name}</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="p-2 hover:bg-red-100 text-red-600 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="border-2 border-sky-400 rounded-lg p-4 bg-sky-50/50 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-2xl">{template?.icon}</div>
        <span className="text-sm font-medium text-sky-700">{template?.name}</span>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Pregunta *</label>
        <input
          type="text"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
          placeholder="Ej: ¿Cuál es tu nombre completo?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Texto de ayuda (opcional)</label>
        <input
          type="text"
          value={field.helpText || ''}
          onChange={(e) => onUpdate({ helpText: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
          placeholder="Ej: Ingresa tu nombre como aparece en tu cédula"
        />
      </div>

      {(field.type === 'text' || field.type === 'textarea') && (
        <div>
          <label className="block text-sm font-medium mb-1">Ejemplo (opcional)</label>
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
            placeholder="Ej: Juan Pérez García"
          />
        </div>
      )}

      {hasOptions && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Opciones de respuesta</label>
            <button
              onClick={onAddOption}
              className="text-sm text-sky-600 hover:text-sky-700 font-medium"
            >
              + Añadir opción
            </button>
          </div>
          <div className="space-y-2">
            {(field.options || []).map((opt, idx) => (
              <div key={opt.id} className="flex items-center gap-2">
                <span className="text-sm text-slate-500 w-6">{idx + 1}.</span>
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => onUpdateOption(opt.id, e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500"
                  placeholder={`Opción ${idx + 1}`}
                />
                <button
                  onClick={() => onDeleteOption(opt.id)}
                  className="p-2 hover:bg-red-100 text-red-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={field.required || false}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="w-4 h-4 text-sky-600 rounded"
          />
          <span className="text-sm">Respuesta obligatoria</span>
        </label>

        <button
          onClick={onStartEdit}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          Listo
        </button>
      </div>
    </div>
  )
}
