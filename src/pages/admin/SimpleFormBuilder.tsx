import { useEffect, useState } from 'react'
import { 
  Plus, Trash2, Eye, GripVertical, Save, FileText,
  AlertCircle, CheckCircle2, ArrowLeft, BookTemplate
} from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
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

interface NumberValidation {
  min?: number
  max?: number
  step?: number
  decimalSeparator?: '.' | ','
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
  validation?: NumberValidation
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
    id: 'decimal',
    name: 'Número decimal',
    description: 'Para notas, promedios (ej: 5,5)',
    icon: '#,#',
    example: '5,5'
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
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // MODO PLANTILLA: Detectar desde URL o state
  const isTemplateMode = searchParams.get('template') === 'true' || location.state?.isTemplate === true
  const templateIdFromUrl = searchParams.get('templateId') || location.state?.templateId
  
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('')
  const [formData, setFormData] = useState<FormData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isSaving, setIsSaving] = useState(false) // Flag para prevenir race condition
  const [showFieldPicker, setShowFieldPicker] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<{ sectionId: string; fieldId: string } | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [currentStep, setCurrentStep] = useState(0) // Navegación por pasos

  const token = localStorage.getItem('fcg.access_token') ?? ''
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  // MODO PLANTILLA: Cargar plantilla existente si viene templateId
  useEffect(() => {
    if (isTemplateMode && templateIdFromUrl) {
      loadTemplate(templateIdFromUrl)
    } else if (isTemplateMode && !templateIdFromUrl) {
      // Nueva plantilla vacía
      setFormData({
        title: 'Nueva plantilla',
        description: '',
        sections: []
      })
    }
  }, [isTemplateMode, templateIdFromUrl])

  // Cargar hitos cuando cambia convocatoria (SOLO en modo normal)
  useEffect(() => {
    if (isTemplateMode) return // Skip en modo plantilla
    
    if (!selectedCall?.id) {
      setMilestones([])
      setSelectedMilestoneId('')
      setFormData(null)
      return
    }
    loadMilestones()
  }, [selectedCall?.id, isTemplateMode])

  // Cargar formulario cuando cambia hito (SOLO en modo normal)
  useEffect(() => {
    if (isTemplateMode) return // Skip en modo plantilla
    
    if (!selectedMilestoneId) {
      setFormData(null)
      return
    }
    // CRÍTICO: No cargar durante guardado para evitar race condition
    if (isSaving) {
      console.log('[SimpleFormBuilder] useEffect bloqueado - guardado en progreso')
      return
    }
    loadForm()
  }, [selectedMilestoneId, isSaving, isTemplateMode])

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

  async function loadTemplate(templateId: string) {
    try {
      setLoading(true)
      console.log('[SimpleFormBuilder] Cargando plantilla:', templateId)
      
      const timestamp = Date.now()
      const res = await fetch(`${API_BASE}/forms/${templateId}?_t=${timestamp}`, { 
        headers: {
          ...headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      if (!res.ok) {
        throw new Error(`Error al cargar plantilla: ${res.status}`)
      }
      
      const data = await res.json()
      console.log('[SimpleFormBuilder] Plantilla cargada:', data)
      
      // Validar que sea una plantilla
      if (!data.isTemplate) {
        console.warn('[SimpleFormBuilder] ADVERTENCIA: El formulario cargado no es una plantilla')
      }
      
      const sections = data.schema?.sections || data.sections || []
      
      setFormData({
        id: data.id,
        title: data.name || data.title || 'Plantilla sin título',
        description: data.description || '',
        sections: Array.isArray(sections) ? sections : []
      })
    } catch (err: any) {
      console.error('[SimpleFormBuilder] Error cargando plantilla:', err)
      alert('❌ Error al cargar la plantilla: ' + err.message)
      
      // Crear plantilla vacía en caso de error
      setFormData({
        title: 'Nueva plantilla',
        description: '',
        sections: []
      })
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
      // Cache-busting: agregar timestamp para evitar cache del navegador
      const timestamp = Date.now()
      const res = await fetch(`${API_BASE}/forms/${milestone.formId}?_t=${timestamp}`, { 
        headers: {
          ...headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      if (res.ok) {
        const data = await res.json()
        console.log('[SimpleFormBuilder] RESPUESTA COMPLETA del GET:', JSON.stringify(data, null, 2))
        
        // Extraer sections del schema si existe
        const sections = data.schema?.sections || data.sections || []
        console.log('[SimpleFormBuilder] Sections extraídas:', sections.length, 'secciones')
        
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
    if (!formData) {
      alert('❌ No hay datos para guardar')
      return
    }
    
    // MODO PLANTILLA: Validar que tenga título
    if (isTemplateMode && !formData.title.trim()) {
      alert('❌ La plantilla debe tener un título')
      return
    }
    
    // MODO NORMAL: Validar que haya milestone seleccionado
    if (!isTemplateMode && !selectedMilestoneId) {
      alert('❌ Debes seleccionar un hito')
      return
    }
    
    setSaving(true)
    setIsSaving(true) // Activar flag para bloquear useEffect
    
    try {
      if (isTemplateMode) {
        // ============ MODO PLANTILLA ============
        await saveAsTemplate()
      } else {
        // ============ MODO NORMAL (vinculado a milestone) ============
        await saveToMilestone()
      }
    } catch (err: any) {
      console.error('[SimpleFormBuilder] Error al guardar:', err)
      alert('❌ Error al guardar: ' + err.message)
      setIsSaving(false)
    } finally {
      setSaving(false)
    }
  }

  async function saveAsTemplate() {
    if (!formData) return
    
    const payload = {
      name: formData.title.trim(),
      title: formData.title.trim(),
      description: formData.description?.trim() || '',
      sections: formData.sections,
      isTemplate: true // ← CLAVE: Marcar como plantilla
    }
    
    console.log('[SimpleFormBuilder] Guardando como plantilla:', payload)
    
    if (formData.id && templateIdFromUrl) {
      // ACTUALIZAR plantilla existente
      console.log('[SimpleFormBuilder] PATCH plantilla existente:', formData.id)
      
      const res = await fetch(`${API_BASE}/forms/${formData.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      })
      
      if (!res.ok) {
        const error = await res.text()
        throw new Error('Error al actualizar plantilla: ' + error)
      }
      
      const updated = await res.json()
      console.log('[SimpleFormBuilder] Plantilla actualizada:', updated)
      
      alert('Plantilla actualizada correctamente')
      
      // Actualizar estado local
      const updatedSections = updated.schema?.sections || updated.sections || []
      setFormData({
        id: updated.id,
        title: updated.name || updated.title || formData.title,
        description: updated.description || '',
        sections: updatedSections
      })
    } else {
      // CREAR nueva plantilla
      console.log('[SimpleFormBuilder] POST nueva plantilla')
      
      const res = await fetch(`${API_BASE}/forms`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      
      if (!res.ok) {
        const error = await res.text()
        throw new Error('Error al crear plantilla: ' + error)
      }
      
      const newTemplate = await res.json()
      console.log('[SimpleFormBuilder] Plantilla creada:', newTemplate)
      
      alert('Plantilla guardada correctamente')
      
      // Redirigir a la página de plantillas
      setTimeout(() => {
        navigate('/admin/form-templates')
      }, 500)
    }
    
    setIsSaving(false)
  }

  async function saveToMilestone() {
    if (!formData || !selectedMilestoneId) return
    
    const milestone = milestones.find(m => m.id === selectedMilestoneId)
      
      console.log('[SimpleFormBuilder] Guardando formulario...', {
        formDataSections: formData.sections.length,
        milestoneFormId: milestone?.formId
      })
      
      if (milestone?.formId) {
        // Actualizar - eliminar id del payload
        console.log('[SimpleFormBuilder] PATCH a /forms/' + milestone.formId)
        const { id, ...formDataWithoutId } = formData
        console.log('[SimpleFormBuilder] Payload COMPLETO que se enviará:', JSON.stringify(formDataWithoutId, null, 2))
        const res = await fetch(`${API_BASE}/forms/${milestone.formId}`, {
          method: 'PATCH',
          headers: {
            ...headers,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify(formDataWithoutId)
        })
        console.log('[SimpleFormBuilder] PATCH response:', res.status, res.ok)
        
        if (!res.ok) {
          const error = await res.text()
          console.error('[SimpleFormBuilder] Error PATCH:', error)
          throw new Error('Error al actualizar: ' + error)
        }
        
        const updated = await res.json()
        console.log('[SimpleFormBuilder] RESPUESTA BACKEND después de PATCH:', JSON.stringify(updated, null, 2))
        
        // ⚡ ACTUALIZACIÓN INMEDIATA: Usar respuesta del PATCH (UX rápida)
        const updatedSections = updated.schema?.sections || updated.sections || []
        console.log('[SimpleFormBuilder] ✅ Actualización inmediata con', updatedSections.length, 'secciones del PATCH')
        setFormData({
          id: updated.id,
          title: updated.name || updated.title || formData.title,
          description: updated.description || formData.description || '',
          sections: updatedSections
        })
      } else {
        // Crear - NO incluir milestoneId en el payload (el DTO no lo acepta)
        console.log('[SimpleFormBuilder] POST a /forms')
        console.log('[SimpleFormBuilder] Payload POST:', {
          title: formData.title,
          description: formData.description,
          sectionsCount: formData.sections.length
        })
        
        const { id, ...formDataWithoutId } = formData
        
        const res = await fetch(`${API_BASE}/forms`, {
          method: 'POST',
          headers: {
            ...headers,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify(formDataWithoutId)
        })
        console.log('[SimpleFormBuilder] POST response:', res.status, res.ok)
        
        if (res.ok) {
          const newForm = await res.json()
          console.log('[SimpleFormBuilder] Form creado:', {
            id: newForm.id,
            sectionsInSchema: newForm.schema?.sections?.length || 0
          })
          
          // Asociar form al milestone
          console.log('[SimpleFormBuilder] Asociando form', newForm.id, 'al milestone', selectedMilestoneId)
          const patchRes = await fetch(`${API_BASE}/milestones/${selectedMilestoneId}`, {
            method: 'PATCH',
            headers: {
              ...headers,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache'
            },
            body: JSON.stringify({ formId: newForm.id })
          })
          
          if (!patchRes.ok) {
            const error = await patchRes.text()
            console.error('[SimpleFormBuilder] Error al asociar form al milestone:', error)
            throw new Error('Form creado pero no se pudo asociar al milestone')
          }
          
          console.log('[SimpleFormBuilder] Form asociado correctamente al milestone')
          
          // Recargar lista de milestones para actualizar el formId
          await loadMilestones()
        } else {
          const error = await res.text()
          console.error('[SimpleFormBuilder] Error POST:', error)
          throw new Error('Error al crear: ' + error)
        }
      }
      
      console.log('[SimpleFormBuilder] ✅ Guardado exitoso')
      alert('✅ Formulario guardado correctamente')
      
      // TEMPORAL: Desactivar verificación hasta resolver problema de persistencia backend
      setTimeout(() => {
        setIsSaving(false) // Desactivar flag después de guardar
        console.log('[SimpleFormBuilder] Flag isSaving desactivado')
      }, 1000)
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
              <Link 
                to={isTemplateMode ? "/admin/form-templates" : "/admin"} 
                className="p-2 hover:bg-slate-100 rounded-lg"
                title="Volver"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  {isTemplateMode ? (
                    <>
                      <BookTemplate className="w-6 h-6 text-purple-600" />
                      {templateIdFromUrl ? 'Editar Plantilla' : 'Nueva Plantilla'}
                    </>
                  ) : (
                    <>
                      <FileText className="w-6 h-6 text-sky-600" />
                      Diseñador de Formularios
                    </>
                  )}
                </h1>
                <p className="text-sm text-slate-500">
                  {isTemplateMode 
                    ? 'Crea plantillas reutilizables para tus formularios'
                    : 'Crea formularios fácil y rápido'
                  }
                </p>
              </div>
            </div>

            {!isTemplateMode && <CallStatusBadge />}

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
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium disabled:opacity-50 ${
                    isTemplateMode 
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-sky-600 text-white hover:bg-sky-700'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Guardando...' : (isTemplateMode ? 'Guardar plantilla' : 'Guardar formulario')}
                </button>
              </div>
            )}
          </div>

          {/* MODO PLANTILLA: Sin selector de hito */}
          {isTemplateMode ? (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <BookTemplate className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-purple-900 mb-1">
                    Modo Plantilla
                  </h3>
                  <p className="text-purple-700 text-sm">
                    Esta plantilla podrá ser reutilizada en múltiples hitos y convocatorias.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Selector de hito (MODO NORMAL) */
            !selectedCall ? (
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
          )
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

            {/* Modo Preview: Navegación por pasos */}
            {previewMode && formData.sections.length > 0 && (
              <>
                {/* Indicadores de pasos */}
                <div className="flex items-center justify-center gap-2 mb-6 overflow-x-auto pb-4">
                  {formData.sections.map((sec, index) => (
                    <div
                      key={sec.id}
                      className={`flex items-center ${index < formData.sections.length - 1 ? 'flex-1 max-w-xs' : ''}`}
                    >
                      <button
                        onClick={() => setCurrentStep(index)}
                        className={`flex flex-col items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          index === currentStep
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                            index === currentStep
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-300 text-slate-600'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <span className="text-xs font-medium text-center whitespace-nowrap">
                          {sec.title}
                        </span>
                      </button>
                      
                      {index < formData.sections.length - 1 && (
                        <div className="flex-1 h-0.5 bg-slate-200 mx-2" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Sección actual en preview */}
                {formData.sections[currentStep] && (
                  <div className="bg-white rounded-lg border">
                    <div className="bg-slate-50 border-b p-6">
                      <h2 className="text-2xl font-bold text-slate-900">
                        Paso {currentStep + 1}: {formData.sections[currentStep].title}
                      </h2>
                      {formData.sections[currentStep].description && (
                        <p className="mt-2 text-slate-600">{formData.sections[currentStep].description}</p>
                      )}
                    </div>

                    <div className="p-6 space-y-6">
                      {formData.sections[currentStep].fields.map((field) => (
                        <FieldEditor
                          key={field.id}
                          field={field}
                          sectionId={formData.sections[currentStep].id}
                          isEditing={false}
                          previewMode={true}
                          onStartEdit={() => {}}
                          onUpdate={() => {}}
                          onDelete={() => {}}
                          onAddOption={() => {}}
                          onUpdateOption={() => {}}
                          onDeleteOption={() => {}}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Navegación en preview */}
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentStep(Math.min(formData.sections.length - 1, currentStep + 1))}
                    disabled={currentStep === formData.sections.length - 1}
                    className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Siguiente
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              </>
            )}

            {/* Modo Edición: Todas las secciones */}
            {!previewMode && formData.sections.map((section) => (
              <div key={section.id} className="bg-white rounded-lg border">
                {/* Header sección */}
                <div className="bg-slate-50 border-b p-4">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-5 h-5 text-slate-400 mt-2" />
                    <div className="flex-1">
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
                    </div>
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="p-2 hover:bg-red-100 text-red-600 rounded-lg"
                      title="Eliminar sección"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Campos */}
                <div className="p-4 space-y-4">
                  {section.fields.length === 0 && (
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
                      previewMode={false}
                      onStartEdit={() => setEditingField({ sectionId: section.id, fieldId: field.id })}
                      onUpdate={(updates) => updateField(section.id, field.id, updates)}
                      onDelete={() => deleteField(section.id, field.id)}
                      onAddOption={() => addOption(section.id, field.id)}
                      onUpdateOption={(optId, label) => updateOption(section.id, field.id, optId, label)}
                      onDeleteOption={(optId) => deleteOption(section.id, field.id, optId)}
                    />
                  ))}

                  {/* Añadir campo */}
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
        {(field.type === 'number' || field.type === 'decimal') && (
          <>
            <input 
              type="number" 
              placeholder={field.placeholder}
              min={field.validation?.min}
              max={field.validation?.max}
              step={field.validation?.step ?? (field.type === 'decimal' ? '0.1' : '1')}
              className="w-full px-3 py-2 border rounded-lg" 
              disabled 
            />
            {field.validation && (field.validation.min !== undefined || field.validation.max !== undefined) && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                <strong>Restricción:</strong>{' '}
                {field.validation.min !== undefined && field.validation.max !== undefined
                  ? `Valor entre ${field.validation.min} y ${field.validation.max}`
                  : field.validation.min !== undefined
                  ? `Mínimo ${field.validation.min}`
                  : `Máximo ${field.validation.max}`
                }
                {field.type === 'decimal' && field.validation.decimalSeparator && (
                  <span className="ml-2">
                    · Formato: {field.validation.decimalSeparator === ',' ? 'coma (5,5)' : 'punto (5.5)'}
                  </span>
                )}
              </p>
            )}
          </>
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

      {/* Validaciones para campos numéricos */}
      {(field.type === 'number' || field.type === 'decimal') && (
        <div className="space-y-3 bg-white rounded-lg p-4 border">
          <h4 className="text-sm font-semibold text-slate-700">Restricciones numéricas</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor mínimo</label>
              <input
                type="number"
                step={field.type === 'decimal' ? '0.1' : '1'}
                value={field.validation?.min ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value)
                  onUpdate({ 
                    validation: { 
                      ...field.validation, 
                      min: val 
                    } 
                  })
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 text-sm"
                placeholder="Sin mínimo"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor máximo</label>
              <input
                type="number"
                step={field.type === 'decimal' ? '0.1' : '1'}
                value={field.validation?.max ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value)
                  onUpdate({ 
                    validation: { 
                      ...field.validation, 
                      max: val 
                    } 
                  })
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 text-sm"
                placeholder="Sin máximo"
              />
            </div>
          </div>

          {field.type === 'decimal' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Incremento (step)</label>
                <input
                  type="number"
                  step="0.1"
                  value={field.validation?.step ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : parseFloat(e.target.value)
                    onUpdate({ 
                      validation: { 
                        ...field.validation, 
                        step: val 
                      } 
                    })
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 text-sm"
                  placeholder="0.1"
                />
                <p className="text-xs text-slate-500 mt-1">Ejemplo: 0.1 para notas (4.5, 4.6, 4.7...)</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Formato de entrada</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={field.validation?.decimalSeparator === ',' || !field.validation?.decimalSeparator}
                      onChange={() => onUpdate({ 
                        validation: { 
                          ...field.validation, 
                          decimalSeparator: ',' 
                        } 
                      })}
                      className="w-4 h-4 text-sky-600"
                    />
                    <span className="text-sm">Coma (5,5)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={field.validation?.decimalSeparator === '.'}
                      onChange={() => onUpdate({ 
                        validation: { 
                          ...field.validation, 
                          decimalSeparator: '.' 
                        } 
                      })}
                      className="w-4 h-4 text-sky-600"
                    />
                    <span className="text-sm">Punto (5.5)</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {field.validation && (field.validation.min !== undefined || field.validation.max !== undefined) && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs text-blue-800">
                <strong>✓ Restricción activa:</strong>{' '}
                {field.validation.min !== undefined && field.validation.max !== undefined
                  ? `Entre ${field.validation.min} y ${field.validation.max}`
                  : field.validation.min !== undefined
                  ? `Mínimo ${field.validation.min}`
                  : `Máximo ${field.validation.max}`
                }
                {field.type === 'decimal' && field.validation.decimalSeparator && (
                  <span className="block mt-1">
                    Formato: {field.validation.decimalSeparator === ',' ? 'Coma (5,5)' : 'Punto (5.5)'}
                  </span>
                )}
              </p>
            </div>
          )}
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
