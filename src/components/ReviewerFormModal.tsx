import { useEffect, useState } from 'react'
import { X, Save, CheckCircle2 } from 'lucide-react'
import { apiGet, apiPost, apiPatch } from '../lib/api'

/**
 * Modal para que REVIEWER complete formularios de entrevista
 * 
 * Seguridad:
 * - Solo permite editar si whoCanFill === 'REVIEWER'
 * - Guarda automáticamente cada 30 segundos
 * - Requiere confirmación para finalizar
 */

type FieldType = 'text' | 'number' | 'decimal' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file' | 'image'

interface FormOption {
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
  min?: number
  max?: number
  step?: number
  options?: FormOption[]
}

interface FormSection {
  id: string
  title: string
  description?: string
  fields: FormField[]
}

interface FormSchema {
  id: string
  title: string
  sections: FormSection[]
}

interface ReviewerFormModalProps {
  milestoneId: string
  milestoneName: string
  applicationId: string
  applicantName: string
  onClose: () => void
  onCompleted: () => void
}

export default function ReviewerFormModal({
  milestoneId,
  milestoneName,
  applicationId,
  applicantName,
  onClose,
  onCompleted,
}: ReviewerFormModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Cargar formulario y submission existente
  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        // 1. Obtener el milestone para saber qué formulario cargar
        const milestone = await apiGet<{ formId: string }>(`/milestones/${milestoneId}`)
        
        if (!milestone.formId) {
          throw new Error('Este hito no tiene formulario asociado')
        }

        // 2. Cargar el esquema del formulario
        const form = await apiGet<FormSchema>(`/forms/${milestone.formId}`)
        setSchema(form)

        // 3. Buscar submission existente
        const submissions = await apiGet<any[]>(`/form-submissions/application/${applicationId}`)
        const existingSubmission = submissions.find(s => s.milestoneId === milestoneId)

        if (existingSubmission) {
          // Cargar submission existente
          setSubmissionId(existingSubmission.id)
          setValues(existingSubmission.answers || {})
          console.log('✅ Submission existente cargada:', existingSubmission.id)
        } else {
          // Crear nueva submission
          const newSubmission = await apiPost<{ id: string; answers?: any }>('/form-submissions', {
            applicationId,
            milestoneId,
            formId: milestone.formId,
            answers: {},
          })
          setSubmissionId(newSubmission.id)
          console.log('✅ Nueva submission creada:', newSubmission.id)
        }

        // Inicializar valores vacíos para campos no guardados
        const initialValues: Record<string, any> = {}
        for (const section of form.sections) {
          for (const field of section.fields) {
            if (field.active !== false) {
              const key = field.name
              if (!existingSubmission?.answers?.[key]) {
                initialValues[key] = getDefaultValue(field)
              }
            }
          }
        }
        
        setValues(prev => ({ ...initialValues, ...prev }))
      } catch (err: any) {
        console.error('Error cargando formulario:', err)
        setError(err.message || 'No se pudo cargar el formulario')
      } finally {
        setLoading(false)
      }
    })()
  }, [milestoneId, applicationId])

  // Auto-guardar cada 30 segundos
  useEffect(() => {
    if (!submissionId || loading) return

    const interval = setInterval(() => {
      saveDraft()
    }, 30000) // 30 segundos

    return () => clearInterval(interval)
  }, [submissionId, values, loading])

  function getDefaultValue(field: FormField): any {
    switch (field.type) {
      case 'checkbox':
        return []
      case 'number':
      case 'decimal':
        return ''
      default:
        return ''
    }
  }

  function handleChange(fieldName: string, value: any) {
    setValues(prev => ({ ...prev, [fieldName]: value }))
  }

  async function saveDraft() {
    if (!submissionId || saving) return
    
    try {
      setSaving(true)
      await apiPatch(`/form-submissions/${submissionId}`, {
        answers: values,
      })
      setLastSaved(new Date())
      console.log('✅ Guardado automático completado')
    } catch (err) {
      console.error('Error en guardado automático:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (!submissionId) return

    // Validar campos requeridos
    if (schema) {
      const missingFields: string[] = []
      for (const section of schema.sections) {
        for (const field of section.fields) {
          if (field.required && field.active !== false) {
            const value = values[field.name]
            if (value === undefined || value === null || value === '' || 
                (Array.isArray(value) && value.length === 0)) {
              missingFields.push(field.label)
            }
          }
        }
      }

      if (missingFields.length > 0) {
        setError(`Faltan campos requeridos: ${missingFields.join(', ')}`)
        return
      }
    }

    if (!confirm(`¿Finalizar entrevista para ${applicantName}?\n\nNo podrás editar las respuestas después de finalizar.`)) {
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Guardar respuestas finales
      await apiPatch(`/form-submissions/${submissionId}`, {
        answers: values,
      })

      // Marcar como completado (esto actualizará el milestone_progress)
      const userId = JSON.parse(localStorage.getItem('fcg.user_data') || '{}').id
      await apiPost(`/form-submissions/${submissionId}/submit`, { userId })

      onCompleted()
    } catch (err: any) {
      setError(err.message || 'Error al finalizar la entrevista')
    } finally {
      setSubmitting(false)
    }
  }

  function renderField(field: FormField) {
    const value = values[field.name] ?? getDefaultValue(field)
    const commonClasses = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={`${commonClasses} min-h-[100px]`}
            disabled={submitting}
          />
        )

      case 'number':
      case 'decimal':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step || (field.type === 'decimal' ? '0.01' : '1')}
            className={commonClasses}
            disabled={submitting}
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={commonClasses}
            disabled={submitting}
          />
        )

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={commonClasses}
            disabled={submitting}
          >
            <option value="">Seleccionar...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={field.name}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="text-sky-600 focus:ring-sky-500"
                  disabled={submitting}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        )

      case 'checkbox':
        const checkedValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {field.options?.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  value={opt.value}
                  checked={checkedValues.includes(opt.value)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...checkedValues, opt.value]
                      : checkedValues.filter((v) => v !== opt.value)
                    handleChange(field.name, newValues)
                  }}
                  className="text-sky-600 focus:ring-sky-500"
                  disabled={submitting}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        )

      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={commonClasses}
            disabled={submitting}
          />
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900">{milestoneName}</h2>
            <p className="text-sm text-slate-600">
              Entrevista con: <span className="font-medium">{applicantName}</span>
            </p>
            {lastSaved && (
              <p className="text-xs text-slate-500 mt-1">
                Último guardado: {lastSaved.toLocaleTimeString()}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            disabled={submitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-600">Cargando formulario...</p>
            </div>
          ) : error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : schema ? (
            <div className="space-y-6">
              {schema.sections.map((section) => (
                <div key={section.id} className="rounded-lg border bg-slate-50 p-4">
                  <h3 className="mb-3 text-lg font-semibold text-slate-900">{section.title}</h3>
                  {section.description && (
                    <p className="mb-4 text-sm text-slate-600">{section.description}</p>
                  )}
                  <div className="space-y-4">
                    {section.fields
                      .filter((f) => f.active !== false)
                      .map((field) => (
                        <div key={field.id}>
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            {field.label}
                            {field.required && <span className="ml-1 text-rose-600">*</span>}
                          </label>
                          {field.helpText && (
                            <p className="mb-2 text-xs text-slate-500">{field.helpText}</p>
                          )}
                          {renderField(field)}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between border-t bg-white px-6 py-4">
          <button
            onClick={saveDraft}
            disabled={saving || submitting || !submissionId}
            className="btn flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar borrador'}
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting || !submissionId}
            className="btn-primary flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? 'Finalizando...' : 'Finalizar entrevista'}
          </button>
        </div>
      </div>
    </div>
  )
}
