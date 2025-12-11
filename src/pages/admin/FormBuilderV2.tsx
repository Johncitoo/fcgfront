import { useEffect, useState } from 'react'
import { 
  Plus, Trash2, Eye, EyeOff, GripVertical, Copy, 
  ChevronDown, ChevronUp, Settings, Save, FileText,
  Type, Hash, Calendar, ToggleLeft, 
  CheckSquare, Upload, Image as ImageIcon, AlignLeft
} from 'lucide-react'
import { useCallContext } from '../../contexts/CallContext'

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
  readOnly?: boolean
  placeholder?: string
  min?: number | null
  max?: number | null
  step?: number | null
  multiple?: boolean
  maxLength?: number | null
  options?: FormOption[]
}

interface FormSection {
  id: string
  title: string
  description?: string
  commentBox?: boolean
  fields: FormField[]
  collapsed?: boolean
}

interface FormSchemaPayload {
  call: { id: string; name: string; year: number }
  sections: FormSection[]
}

interface Call {
  id: string
  name: string
  year: number
  status?: string
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

const FIELD_TYPES = [
  { type: 'text', label: 'Texto corto', icon: Type, color: 'text-blue-500' },
  { type: 'textarea', label: 'Texto largo', icon: AlignLeft, color: 'text-purple-500' },
  { type: 'number', label: 'Número', icon: Hash, color: 'text-green-500' },
  { type: 'decimal', label: 'Decimal', icon: Hash, color: 'text-emerald-500' },
  { type: 'date', label: 'Fecha', icon: Calendar, color: 'text-orange-500' },
  { type: 'select', label: 'Lista desplegable', icon: ChevronDown, color: 'text-indigo-500' },
  { type: 'radio', label: 'Opción única', icon: ToggleLeft, color: 'text-pink-500' },
  { type: 'checkbox', label: 'Múltiple opción', icon: CheckSquare, color: 'text-teal-500' },
  { type: 'file', label: 'Archivo', icon: Upload, color: 'text-amber-500' },
  { type: 'image', label: 'Imagen', icon: ImageIcon, color: 'text-rose-500' },
] as const

export default function FormBuilderV2() {
  const { selectedCallId } = useCallContext()
  const [schema, setSchema] = useState<FormSchemaPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [editingField, setEditingField] = useState<{ sectionId: string; fieldId: string } | null>(null)

  const token = localStorage.getItem('fcg.access_token') ?? ''
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // Cargar formulario cuando cambia la convocatoria
  useEffect(() => {
    if (!selectedCallId) {
      setSchema(null)
      return
    }
    loadForm()
  }, [selectedCallId])

  async function loadForm() {
    if (!selectedCallId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/forms?callId=${selectedCallId}`, { headers })
      if (!res.ok) throw new Error('No se pudo cargar el formulario')
      const data = await res.json()
      setSchema(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveForm() {
    if (!schema) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/forms?callId=${schema.call.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ sections: schema.sections }),
      })
      if (!res.ok) throw new Error('No se pudo guardar')
      alert('✅ Formulario guardado exitosamente')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function addSection() {
    if (!schema) return
    const newSection: FormSection = {
      id: `tmp_${Date.now()}`,
      title: 'Nueva sección',
      description: '',
      commentBox: false,
      fields: [],
      collapsed: false,
    }
    setSchema({ ...schema, sections: [...schema.sections, newSection] })
  }

  function updateSection(sectionId: string, patch: Partial<FormSection>) {
    if (!schema) return
    setSchema({
      ...schema,
      sections: schema.sections.map(s => s.id === sectionId ? { ...s, ...patch } : s)
    })
  }

  function deleteSection(sectionId: string) {
    if (!schema) return
    if (!confirm('¿Eliminar esta sección y todos sus campos?')) return
    setSchema({
      ...schema,
      sections: schema.sections.filter(s => s.id !== sectionId)
    })
  }

  function duplicateSection(sectionId: string) {
    if (!schema) return
    const section = schema.sections.find(s => s.id === sectionId)
    if (!section) return
    const newSection: FormSection = {
      ...section,
      id: `tmp_${Date.now()}`,
      title: `${section.title} (copia)`,
      fields: section.fields.map(f => ({
        ...f,
        id: `tmp_${Date.now()}_${Math.random()}`
      }))
    }
    const index = schema.sections.findIndex(s => s.id === sectionId)
    const newSections = [...schema.sections]
    newSections.splice(index + 1, 0, newSection)
    setSchema({ ...schema, sections: newSections })
  }

  function addField(sectionId: string, type: FieldType) {
    if (!schema) return
    const fieldTypeInfo = FIELD_TYPES.find(t => t.type === type)
    const newField: FormField = {
      id: `tmp_${Date.now()}`,
      name: `campo_${Date.now()}`,
      label: fieldTypeInfo?.label || 'Nuevo campo',
      type,
      required: false,
      active: true,
      readOnly: false,
      options: ['select', 'radio', 'checkbox'].includes(type) ? [
        { id: `opt_${Date.now()}_1`, value: 'opcion1', label: 'Opción 1' },
        { id: `opt_${Date.now()}_2`, value: 'opcion2', label: 'Opción 2' },
      ] : undefined
    }
    setSchema({
      ...schema,
      sections: schema.sections.map(s => 
        s.id === sectionId 
          ? { ...s, fields: [...s.fields, newField] }
          : s
      )
    })
    setEditingField({ sectionId, fieldId: newField.id })
  }

  function updateField(sectionId: string, fieldId: string, patch: Partial<FormField>) {
    if (!schema) return
    setSchema({
      ...schema,
      sections: schema.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              fields: s.fields.map(f => f.id === fieldId ? { ...f, ...patch } : f)
            }
          : s
      )
    })
  }

  function deleteField(sectionId: string, fieldId: string) {
    if (!schema) return
    if (!confirm('¿Eliminar este campo?')) return
    setSchema({
      ...schema,
      sections: schema.sections.map(s =>
        s.id === sectionId
          ? { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
          : s
      )
    })
    if (editingField?.fieldId === fieldId) {
      setEditingField(null)
    }
  }

  function duplicateField(sectionId: string, fieldId: string) {
    if (!schema) return
    const section = schema.sections.find(s => s.id === sectionId)
    const field = section?.fields.find(f => f.id === fieldId)
    if (!field) return
    const newField: FormField = {
      ...field,
      id: `tmp_${Date.now()}`,
      name: `${field.name}_copia`,
      label: `${field.label} (copia)`
    }
    setSchema({
      ...schema,
      sections: schema.sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              fields: [...s.fields.slice(0, s.fields.findIndex(f => f.id === fieldId) + 1), newField, ...s.fields.slice(s.fields.findIndex(f => f.id === fieldId) + 1)]
            }
          : s
      )
    })
  }

  function addOption(sectionId: string, fieldId: string) {
    if (!schema) return
    const section = schema.sections.find(s => s.id === sectionId)
    const field = section?.fields.find(f => f.id === fieldId)
    if (!field) return
    const newOption: FormOption = {
      id: `opt_${Date.now()}`,
      value: `opcion_${(field.options?.length || 0) + 1}`,
      label: `Opción ${(field.options?.length || 0) + 1}`
    }
    updateField(sectionId, fieldId, {
      options: [...(field.options || []), newOption]
    })
  }

  function updateOption(sectionId: string, fieldId: string, optionId: string, patch: Partial<FormOption>) {
    if (!schema) return
    const section = schema.sections.find(s => s.id === sectionId)
    const field = section?.fields.find(f => f.id === fieldId)
    if (!field) return
    updateField(sectionId, fieldId, {
      options: (field.options || []).map(o => o.id === optionId ? { ...o, ...patch } : o)
    })
  }

  function deleteOption(sectionId: string, fieldId: string, optionId: string) {
    if (!schema) return
    const section = schema.sections.find(s => s.id === sectionId)
    const field = section?.fields.find(f => f.id === fieldId)
    if (!field) return
    updateField(sectionId, fieldId, {
      options: (field.options || []).filter(o => o.id !== optionId)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando formulario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header con acciones */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-sky-600" />
              <div>
                <h1 className="text-xl font-bold text-slate-900">Constructor de Formularios</h1>
                <p className="text-sm text-slate-500">Diseña formularios de manera visual e intuitiva</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {schema && (
                <>
                  <button
                    onClick={() => setPreviewMode(!previewMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      previewMode 
                        ? 'bg-sky-100 text-sky-700' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {previewMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {previewMode ? 'Vista previa' : 'Editar'}
                  </button>

                  <button
                    onClick={saveForm}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {!schema ? (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No hay formulario seleccionado</h2>
            <p className="text-slate-600">Selecciona una convocatoria arriba para comenzar a diseñar</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Panel de edición */}
            <div className="lg:col-span-2 space-y-4">
              {schema.sections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  onUpdate={(patch) => updateSection(section.id, patch)}
                  onDelete={() => deleteSection(section.id)}
                  onDuplicate={() => duplicateSection(section.id)}
                  onAddField={(type) => addField(section.id, type)}
                  onUpdateField={(fieldId, patch) => updateField(section.id, fieldId, patch)}
                  onDeleteField={(fieldId) => deleteField(section.id, fieldId)}
                  onDuplicateField={(fieldId) => duplicateField(section.id, fieldId)}
                  onAddOption={(fieldId) => addOption(section.id, fieldId)}
                  onUpdateOption={(fieldId, optionId, patch) => updateOption(section.id, fieldId, optionId, patch)}
                  onDeleteOption={(fieldId, optionId) => deleteOption(section.id, fieldId, optionId)}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  previewMode={previewMode}
                />
              ))}

              <button
                onClick={addSection}
                className="w-full p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-sky-400 hover:bg-sky-50/50 transition-colors flex items-center justify-center gap-2 text-slate-600 hover:text-sky-600"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Añadir nueva sección</span>
              </button>
            </div>

            {/* Panel lateral de ayuda */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-white rounded-lg border shadow-sm p-6 space-y-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Guía rápida
                </h3>
                <div className="space-y-3 text-sm text-slate-600">
                  <div>
                    <p className="font-medium text-slate-900 mb-1">📋 Secciones</p>
                    <p>Agrupa campos relacionados. Puedes tener múltiples secciones.</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 mb-1">✏️ Campos</p>
                    <p>Haz clic en "Añadir campo" y selecciona el tipo. Luego configúralo.</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 mb-1">👁️ Vista previa</p>
                    <p>Usa el botón "Vista previa" para ver cómo se verá el formulario.</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 mb-1">💾 Guardar</p>
                    <p>No olvides guardar los cambios antes de salir.</p>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <h4 className="font-medium text-slate-900 text-sm">Tipos de campo disponibles:</h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {FIELD_TYPES.map((ft) => (
                      <div key={ft.type} className="flex items-center gap-2 text-xs">
                        <ft.icon className={`w-3.5 h-3.5 ${ft.color}`} />
                        <span className="text-slate-700">{ft.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ==================== Componentes ==================== */

interface SectionCardProps {
  section: FormSection
  onUpdate: (patch: Partial<FormSection>) => void
  onDelete: () => void
  onDuplicate: () => void
  onAddField: (type: FieldType) => void
  onUpdateField: (fieldId: string, patch: Partial<FormField>) => void
  onDeleteField: (fieldId: string) => void
  onDuplicateField: (fieldId: string) => void
  onAddOption: (fieldId: string) => void
  onUpdateOption: (fieldId: string, optionId: string, patch: Partial<FormOption>) => void
  onDeleteOption: (fieldId: string, optionId: string) => void
  editingField: { sectionId: string; fieldId: string } | null
  setEditingField: (val: { sectionId: string; fieldId: string } | null) => void
  previewMode: boolean
}

function SectionCard({
  section,
  onUpdate,
  onDelete,
  onDuplicate,
  onAddField,
  onUpdateField,
  onDeleteField,
  onDuplicateField,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  editingField,
  setEditingField,
  previewMode
}: SectionCardProps) {
  const [showFieldMenu, setShowFieldMenu] = useState(false)

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Header de sección */}
      <div className="bg-slate-50 border-b p-4">
        <div className="flex items-start gap-3">
          <GripVertical className="w-5 h-5 text-slate-400 mt-1 cursor-move" />
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={section.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className="w-full text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-sky-500 rounded px-2 -mx-2"
              placeholder="Título de la sección"
              disabled={previewMode}
            />
            <input
              type="text"
              value={section.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              className="w-full text-sm text-slate-600 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-sky-500 rounded px-2 -mx-2"
              placeholder="Descripción opcional"
              disabled={previewMode}
            />
          </div>
          {!previewMode && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdate({ collapsed: !section.collapsed })}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                title={section.collapsed ? 'Expandir' : 'Colapsar'}
              >
                {section.collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button
                onClick={onDuplicate}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                title="Duplicar sección"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                title="Eliminar sección"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Campos de la sección */}
      {!section.collapsed && (
        <div className="p-4 space-y-3">
          {section.fields.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No hay campos en esta sección</p>
            </div>
          ) : (
            section.fields.map((field) => (
              <FieldCard
                key={field.id}
                field={field}
                sectionId={section.id}
                onUpdate={(patch) => onUpdateField(field.id, patch)}
                onDelete={() => onDeleteField(field.id)}
                onDuplicate={() => onDuplicateField(field.id)}
                onAddOption={() => onAddOption(field.id)}
                onUpdateOption={(optId, patch) => onUpdateOption(field.id, optId, patch)}
                onDeleteOption={(optId) => onDeleteOption(field.id, optId)}
                isEditing={editingField?.sectionId === section.id && editingField?.fieldId === field.id}
                setEditing={(val) => setEditingField(val ? { sectionId: section.id, fieldId: field.id } : null)}
                previewMode={previewMode}
              />
            ))
          )}

          {!previewMode && (
            <div className="relative">
              <button
                onClick={() => setShowFieldMenu(!showFieldMenu)}
                className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-sky-400 hover:bg-sky-50/50 transition-colors flex items-center justify-center gap-2 text-slate-600 hover:text-sky-600"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Añadir campo</span>
              </button>

              {showFieldMenu && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg p-3 z-20 grid grid-cols-2 gap-2">
                  {FIELD_TYPES.map((ft) => (
                    <button
                      key={ft.type}
                      onClick={() => {
                        onAddField(ft.type as FieldType)
                        setShowFieldMenu(false)
                      }}
                      className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg text-left transition-colors"
                    >
                      <ft.icon className={`w-4 h-4 ${ft.color}`} />
                      <span className="text-sm">{ft.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface FieldCardProps {
  field: FormField
  sectionId: string
  onUpdate: (patch: Partial<FormField>) => void
  onDelete: () => void
  onDuplicate: () => void
  onAddOption: () => void
  onUpdateOption: (optionId: string, patch: Partial<FormOption>) => void
  onDeleteOption: (optionId: string) => void
  isEditing: boolean
  setEditing: (val: boolean) => void
  previewMode: boolean
}

function FieldCard({
  field,
  onUpdate,
  onDelete,
  onDuplicate,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  isEditing,
  setEditing,
  previewMode
}: FieldCardProps) {
  const fieldTypeInfo = FIELD_TYPES.find(t => t.type === field.type)
  const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type)

  if (!fieldTypeInfo) return null

  return (
    <div className={`border rounded-lg p-4 transition-all ${isEditing ? 'ring-2 ring-sky-500 bg-sky-50/30' : 'bg-white'}`}>
      <div className="flex items-start gap-3">
        <GripVertical className="w-4 h-4 text-slate-400 mt-2 cursor-move" />
        <fieldTypeInfo.icon className={`w-5 h-5 ${fieldTypeInfo.color} mt-1.5`} />
        
        <div className="flex-1 space-y-3">
          {/* Vista compacta */}
          {!isEditing && !previewMode && (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                  {!field.active && <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">Oculto</span>}
                </div>
                <div className="text-sm text-slate-500">
                  {fieldTypeInfo.label} · {field.name}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditing(true)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Configurar"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={onDuplicate}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Duplicar"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Vista de edición */}
          {isEditing && !previewMode && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Etiqueta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => onUpdate({ label: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="ej: Nombres completos"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nombre interno <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => onUpdate({ name: e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase() })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    placeholder="ej: nombres_completos"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Texto de ayuda</label>
                <input
                  type="text"
                  value={field.helpText || ''}
                  onChange={(e) => onUpdate({ helpText: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="ej: Ingresa tus nombres como aparecen en tu cédula"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Placeholder</label>
                <input
                  type="text"
                  value={field.placeholder || ''}
                  onChange={(e) => onUpdate({ placeholder: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="ej: Juan Pablo García"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.required || false}
                    onChange={(e) => onUpdate({ required: e.target.checked })}
                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">Campo obligatorio</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.active !== false}
                    onChange={(e) => onUpdate({ active: e.target.checked })}
                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">Visible</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.readOnly || false}
                    onChange={(e) => onUpdate({ readOnly: e.target.checked })}
                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-slate-700">Solo lectura</span>
                </label>
              </div>

              {/* Opciones para select/radio/checkbox */}
              {hasOptions && (
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700">Opciones</label>
                    <button
                      onClick={onAddOption}
                      className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Añadir opción
                    </button>
                  </div>
                  {(field.options || []).map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-6">{idx + 1}.</span>
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => onUpdateOption(opt.id, { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        className="flex-1 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        placeholder="Etiqueta de la opción"
                      />
                      <button
                        onClick={() => onDeleteOption(opt.id)}
                        className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700 transition-colors"
                >
                  Listo
                </button>
              </div>
            </div>
          )}

          {/* Vista previa del campo */}
          {previewMode && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.helpText && (
                <p className="text-xs text-slate-500">{field.helpText}</p>
              )}
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
                  {(field.options || []).map(opt => (
                    <option key={opt.id}>{opt.label}</option>
                  ))}
                </select>
              )}
              {field.type === 'radio' && (
                <div className="space-y-2">
                  {(field.options || []).map(opt => (
                    <label key={opt.id} className="flex items-center gap-2">
                      <input type="radio" name={field.name} disabled />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}
              {field.type === 'checkbox' && (
                <div className="space-y-2">
                  {(field.options || []).map(opt => (
                    <label key={opt.id} className="flex items-center gap-2">
                      <input type="checkbox" disabled />
                      <span className="text-sm">{opt.label}</span>
                    </label>
                  ))}
                </div>
              )}
              {(field.type === 'file' || field.type === 'image') && (
                <div className="border-2 border-dashed rounded-lg p-6 text-center text-slate-400">
                  <Upload className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Arrastra archivos aquí o haz clic para seleccionar</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
