import { useEffect, useState } from 'react'
import { useCall } from '../../contexts/CallContext'

/**
 * Diseñador de formularios moderno con vista previa
 * - Interfaz limpia e intuitiva
 * - Vista previa en tiempo real
 * - Drag & drop de campos
 * - Secciones colapsables
 */

type FieldType = 'text' | 'number' | 'decimal' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file' | 'image'

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
  commentBox?: boolean
  fields: FormField[]
  collapsed?: boolean
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'https://fcgback-production.up.railway.app/api'

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto',
  number: 'Número entero',
  decimal: 'Número decimal',
  textarea: 'Área de texto',
  select: 'Lista desplegable (select)',
  checkbox: 'Casillas múltiples',
  radio: 'Opción única (radio)',
  date: 'Fecha',
  file: 'Archivo',
  image: 'Imagen',
}

export default function FormDesignerPage() {
  const { selectedCall } = useCall()
  const callId = selectedCall?.id || ''

  const [sections, setSections] = useState<FormSection[]>([])
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const headers = {
    Authorization: `Bearer ${localStorage.getItem('fcg.access_token') ?? ''}`,
    'Content-Type': 'application/json',
  }

  // Mapear tipos de DB a tipos del frontend
  function mapFieldTypeFromDb(dbType: string): FieldType {
    const typeMap: Record<string, FieldType> = {
      INPUT: 'text',
      NUMBER: 'number',
      TEXTAREA: 'textarea',
      SELECT: 'select',
      CHECKBOX: 'checkbox',
      RADIO: 'radio',
      DATE: 'date',
      FILE: 'file',
      IMAGE: 'image',
    }
    return typeMap[dbType] || 'text'
  }

  // Cargar formulario existente
  useEffect(() => {
    if (!callId) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE}/admin/forms?callId=${callId}`, { headers })
        if (res.ok) {
          const data = await res.json()
          const sectionsFromDb = (data.sections || []).map((section: any) => ({
            ...section,
            fields: (section.fields || []).map((field: any) => ({
              ...field,
              type: mapFieldTypeFromDb(field.type),
            })),
          }))
          setSections(sectionsFromDb)
        }
      } catch (err) {
        console.error('Error loading form:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [callId])

  // Agregar nueva sección
  function addSection() {
    const newSection: FormSection = {
      id: `sec_${Date.now()}`,
      title: 'Nueva sección',
      description: '',
      fields: [],
      collapsed: false,
    }
    setSections([...sections, newSection])
    setSelectedSection(newSection.id)
  }

  // Agregar nuevo campo a una sección
  function addField(sectionId: string, type: FieldType) {
    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        const newField: FormField = {
          id: `fld_${Date.now()}`,
          name: `campo_${sec.fields.length + 1}`,
          label: FIELD_TYPE_LABELS[type],
          type,
          required: false,
          active: true,
          options: ['select', 'checkbox', 'radio'].includes(type) 
            ? [{ id: `opt_${Date.now()}`, value: '', label: '' }] 
            : undefined,
        }
        return { ...sec, fields: [...sec.fields, newField] }
      }
      return sec
    }))
  }

  // Actualizar sección
  function updateSection(id: string, updates: Partial<FormSection>) {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  // Actualizar campo
  function updateField(sectionId: string, fieldId: string, updates: Partial<FormField>) {
    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          fields: sec.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
        }
      }
      return sec
    }))
  }

  // Eliminar sección
  function deleteSection(id: string) {
    setSections(sections.filter(s => s.id !== id))
    if (selectedSection === id) setSelectedSection(null)
  }

  // Eliminar campo
  function deleteField(sectionId: string, fieldId: string) {
    setSections(sections.map(sec => {
      if (sec.id === sectionId) {
        return { ...sec, fields: sec.fields.filter(f => f.id !== fieldId) }
      }
      return sec
    }))
    if (selectedField === fieldId) setSelectedField(null)
  }

  // Mapear tipos de campos a enum de la base de datos
  function mapFieldTypeToDb(type: FieldType): string {
    const typeMap: Record<FieldType, string> = {
      text: 'INPUT',
      number: 'NUMBER',
      decimal: 'NUMBER',
      textarea: 'TEXTAREA',
      select: 'SELECT',
      checkbox: 'CHECKBOX',
      radio: 'RADIO',
      date: 'DATE',
      file: 'FILE',
      image: 'IMAGE',
    }
    return typeMap[type] || 'INPUT'
  }

  // Guardar formulario
  async function saveForm() {
    if (!callId) return
    try {
      setSaving(true)
      
      // Convertir tipos a formato de DB
      const sectionsForDb = sections.map(section => ({
        ...section,
        fields: section.fields.map(field => ({
          ...field,
          type: mapFieldTypeToDb(field.type),
        })),
      }))
      
      const res = await fetch(`${API_BASE}/admin/forms?callId=${callId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ sections: sectionsForDb }),
      })
      if (res.ok) {
        alert('Formulario guardado correctamente')
      } else {
        const errorText = await res.text()
        console.error('Error saving form:', errorText)
        alert('Error al guardar el formulario')
      }
    } catch (err) {
      console.error('Error saving form:', err)
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const selectedSec = sections.find(s => s.id === selectedSection)
  const selectedFld = selectedSec?.fields.find(f => f.id === selectedField)

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="text-slate-600">Cargando formulario...</p>
      </div>
    )
  }

  if (!callId) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <p className="text-slate-600 text-lg mb-2">Por favor selecciona una convocatoria</p>
          <p className="text-slate-400 text-sm">Usa el selector de convocatorias en la parte superior</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-semibold">Diseñador de Formularios</h1>
            <p className="text-sm text-slate-600">
              Drag & drop de secciones/campos en desarrollo
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-slate-50"
            >
              {showPreview ? 'Ocultar' : 'Vista Previa'}
            </button>
            <button
              onClick={saveForm}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Formulario'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel izquierdo: Secciones y campos */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Secciones</h2>
                <button
                  onClick={addSection}
                  className="px-3 py-1.5 text-sm font-medium bg-sky-600 text-white rounded-md hover:bg-sky-700"
                >
                  + Agregar Sección
                </button>
              </div>

              {sections.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p>No hay secciones. Haz clic en "Agregar Sección" para comenzar.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sections.map((section) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      selected={selectedSection === section.id}
                      onSelect={() => setSelectedSection(section.id)}
                      onUpdate={(updates) => updateSection(section.id, updates)}
                      onDelete={() => deleteSection(section.id)}
                      onAddField={(type) => addField(section.id, type)}
                      onSelectField={(fieldId) => setSelectedField(fieldId)}
                      onDeleteField={(fieldId) => deleteField(section.id, fieldId)}
                      selectedFieldId={selectedField}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel derecho: Propiedades o vista previa */}
          <div className="lg:col-span-1">
            {showPreview ? (
              <PreviewPanel sections={sections} />
            ) : (
              <PropertiesPanel
                section={selectedSec}
                field={selectedFld}
                onUpdateSection={selectedSec ? (updates) => updateSection(selectedSec.id, updates) : undefined}
                onUpdateField={selectedSec && selectedFld ? (updates) => updateField(selectedSec.id, selectedFld.id, updates) : undefined}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente de tarjeta de sección
function SectionCard({
  section,
  selected,
  onSelect,
  onUpdate,
  onDelete,
  onAddField,
  onSelectField,
  onDeleteField,
  selectedFieldId,
}: {
  section: FormSection
  selected: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<FormSection>) => void
  onDelete: () => void
  onAddField: (type: FieldType) => void
  onSelectField: (fieldId: string) => void
  onDeleteField: (fieldId: string) => void
  selectedFieldId: string | null
}) {
  const [addingField, setAddingField] = useState(false)

  return (
    <div className={`border rounded-lg overflow-hidden ${selected ? 'ring-2 ring-sky-500' : ''}`}>
      {/* Header de sección */}
      <div
        className="bg-slate-50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-100"
        onClick={onSelect}
      >
        <div className="flex-1">
          <input
            type="text"
            value={section.title}
            onChange={(e) => {
              e.stopPropagation()
              onUpdate({ title: e.target.value })
            }}
            className="font-medium bg-transparent border-none outline-none w-full"
            placeholder="Título de la sección"
          />
          <p className="text-xs text-slate-500 mt-1">{section.fields.length} campos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onUpdate({ collapsed: !section.collapsed })
            }}
            className="p-1 hover:bg-slate-200 rounded"
          >
            {section.collapsed ? '▶' : '▼'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 text-rose-600 hover:bg-rose-50 rounded text-lg"
          >
            ×
          </button>
        </div>
      </div>

      {/* Campos */}
      {!section.collapsed && (
        <div className="p-4 space-y-2">
          {section.fields.map((field) => (
            <div
              key={field.id}
              className={`p-3 border rounded-md cursor-pointer ${
                selectedFieldId === field.id ? 'border-sky-500 bg-sky-50' : 'hover:bg-slate-50'
              }`}
              onClick={() => onSelectField(field.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{field.label}</span>
                    {field.required && <span className="text-xs text-rose-500">*</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {FIELD_TYPE_LABELS[field.type]} · {field.name}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteField(field.id)
                  }}
                  className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {/* Botón agregar campo */}
          <div className="pt-2">
            {addingField ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(FIELD_TYPE_LABELS).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => {
                      onAddField(type as FieldType)
                      setAddingField(false)
                    }}
                    className="px-3 py-1.5 text-xs border rounded-md hover:bg-slate-50"
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => setAddingField(false)}
                  className="px-3 py-1.5 text-xs text-slate-500"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingField(true)}
                className="w-full py-2 text-sm text-sky-600 border border-dashed border-sky-300 rounded-md hover:bg-sky-50"
              >
                + Agregar Campo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Panel de propiedades
function PropertiesPanel({
  section,
  field,
  onUpdateSection,
  onUpdateField,
}: {
  section?: FormSection
  field?: FormField
  onUpdateSection?: (updates: Partial<FormSection>) => void
  onUpdateField?: (updates: Partial<FormField>) => void
}) {
  if (!section && !field) {
    return (
      <div className="bg-white rounded-lg border p-6 sticky top-6">
        <p className="text-sm text-slate-500 text-center">
          Selecciona una sección o campo para editar sus propiedades
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border p-4 sticky top-6">
      <h3 className="font-semibold mb-4">⚙️ Propiedades</h3>
      
      {field && onUpdateField ? (
        <FieldProperties field={field} onUpdate={onUpdateField} />
      ) : section && onUpdateSection ? (
        <SectionProperties section={section} onUpdate={onUpdateSection} />
      ) : null}
    </div>
  )
}

// Propiedades de sección
function SectionProperties({ section, onUpdate }: { section: FormSection; onUpdate: (updates: Partial<FormSection>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium block mb-1">Título</label>
        <input
          type="text"
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full px-3 py-2 border rounded-md text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Descripción</label>
        <textarea
          value={section.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border rounded-md text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={section.commentBox || false}
          onChange={(e) => onUpdate({ commentBox: e.target.checked })}
          id="commentBox"
        />
        <label htmlFor="commentBox" className="text-sm">Cuadro de comentarios (revisores)</label>
      </div>
    </div>
  )
}

// Propiedades de campo
function FieldProperties({ field, onUpdate }: { field: FormField; onUpdate: (updates: Partial<FormField>) => void }) {
  const [newOptionLabel, setNewOptionLabel] = useState('')
  
  const addOption = () => {
    if (!newOptionLabel.trim()) return
    const newOption: FormOption = {
      id: `opt_${Date.now()}`,
      value: newOptionLabel.toLowerCase().replace(/\s+/g, '_'),
      label: newOptionLabel.trim(),
    }
    onUpdate({ options: [...(field.options || []), newOption] })
    setNewOptionLabel('')
  }

  const updateOption = (optionId: string, updates: Partial<FormOption>) => {
    onUpdate({
      options: (field.options || []).map(opt =>
        opt.id === optionId ? { ...opt, ...updates } : opt
      ),
    })
  }

  const deleteOption = (optionId: string) => {
    onUpdate({
      options: (field.options || []).filter(opt => opt.id !== optionId),
    })
  }

  const needsOptions = ['select', 'checkbox', 'radio'].includes(field.type)

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium block mb-1">Etiqueta</label>
        <input
          type="text"
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="Ej: Nombre completo"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium block mb-1">Nombre interno</label>
        <input
          type="text"
          value={field.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full px-3 py-2 border rounded-md text-sm font-mono"
          placeholder="Ej: nombre_completo"
        />
      </div>

      {(field.type === 'text' || field.type === 'textarea' || field.type === 'number' || field.type === 'decimal') && (
        <div>
          <label className="text-sm font-medium block mb-1">Placeholder</label>
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
            placeholder="Ej: Ingresa tu respuesta aquí"
          />
        </div>
      )}
      
      <div>
        <label className="text-sm font-medium block mb-1">Texto de ayuda</label>
        <textarea
          value={field.helpText || ''}
          onChange={(e) => onUpdate({ helpText: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border rounded-md text-sm"
          placeholder="Información adicional para el usuario"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={field.required || false}
          onChange={(e) => onUpdate({ required: e.target.checked })}
          id="required"
        />
        <label htmlFor="required" className="text-sm font-medium">Campo requerido</label>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={field.active !== false}
          onChange={(e) => onUpdate({ active: e.target.checked })}
          id="active"
        />
        <label htmlFor="active" className="text-sm font-medium">Campo activo</label>
      </div>

      {/* Editor de opciones para select, checkbox, radio */}
      {needsOptions && (
        <div className="pt-4 border-t">
          <label className="text-sm font-medium block mb-2">
            Opciones {field.type === 'select' ? '(lista desplegable)' : field.type === 'checkbox' ? '(selección múltiple)' : '(opción única)'}
          </label>
          
          <div className="space-y-2 mb-3">
            {(field.options || []).map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-6">{index + 1}.</span>
                <input
                  type="text"
                  value={option.label}
                  onChange={(e) => updateOption(option.id, { label: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                  placeholder="Texto de la opción"
                />
                <button
                  onClick={() => deleteOption(option.id)}
                  className="px-2 py-2 text-rose-600 hover:bg-rose-50 rounded text-lg"
                  title="Eliminar opción"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newOptionLabel}
              onChange={(e) => setNewOptionLabel(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addOption()}
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              placeholder="Nueva opción..."
            />
            <button
              onClick={addOption}
              className="px-4 py-2 bg-sky-600 text-white rounded-md text-sm hover:bg-sky-700"
            >
              + Agregar
            </button>
          </div>
          
          {(field.options || []).length === 0 && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠ Este campo necesita al menos una opción
            </p>
          )}
        </div>
      )}

      {/* Información adicional para campos de archivo */}
      {(field.type === 'file' || field.type === 'image') && (
        <div className="pt-4 border-t">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-xs text-blue-800">
              <strong>Nota:</strong> Los archivos se cargarán en el módulo de documentos del postulante.
              {field.type === 'image' ? ' Solo se aceptarán imágenes (JPG, PNG, etc.).' : ' Se aceptarán archivos PDF y documentos.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Panel de vista previa
function PreviewPanel({ sections }: { sections: FormSection[] }) {
  return (
    <div className="bg-white rounded-lg border p-6 sticky top-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <span>👁</span> Vista Previa
      </h3>
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.id} className="space-y-3">
            <div className="border-b pb-2">
              <h4 className="font-medium text-lg">{section.title}</h4>
              {section.description && (
                <p className="text-sm text-slate-600 mt-1">{section.description}</p>
              )}
            </div>
            <div className="space-y-4">
              {section.fields.filter(f => f.active !== false).map((field) => (
                <div key={field.id}>
                  <label className="text-sm font-medium block mb-1.5">
                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  
                  {field.type === 'textarea' ? (
                    <textarea
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50"
                      rows={3}
                      disabled
                    />
                  ) : field.type === 'select' ? (
                    <select className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50" disabled>
                      <option>-- Seleccione una opción --</option>
                      {(field.options || []).map(opt => (
                        <option key={opt.id} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'checkbox' ? (
                    <div className="space-y-2">
                      {(field.options || []).map(opt => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input type="checkbox" disabled className="rounded" />
                          <span className="text-sm">{opt.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : field.type === 'radio' ? (
                    <div className="space-y-2">
                      {(field.options || []).map(opt => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input type="radio" name={field.id} disabled />
                          <span className="text-sm">{opt.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : field.type === 'file' || field.type === 'image' ? (
                    <div className="border-2 border-dashed rounded-md p-4 text-center bg-slate-50">
                      <p className="text-sm text-slate-600">
                        {field.type === 'image' ? '📷 Clic para subir imagen' : '📎 Clic para subir archivo'}
                      </p>
                    </div>
                  ) : field.type === 'date' ? (
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50"
                      disabled
                    />
                  ) : (
                    <input
                      type={field.type === 'number' || field.type === 'decimal' ? 'number' : 'text'}
                      step={field.type === 'decimal' ? '0.01' : undefined}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border rounded-md text-sm bg-slate-50"
                      disabled
                    />
                  )}
                  
                  {field.helpText && (
                    <p className="text-xs text-slate-500 mt-1.5">{field.helpText}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {sections.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">
            No hay secciones para previsualizar
          </p>
        )}
      </div>
    </div>
  )
}
