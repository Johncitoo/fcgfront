import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import RutInput from '../../components/RutInput'
import FileUpload from '../../components/FileUpload'
import { Save, Send, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { filesService } from '../../services/files.service'
import { formSubmissionsService } from '../../services/formSubmissions.service'

type FieldType =
  | 'text'
  | 'number'
  | 'decimal'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'file'
  | 'image'

interface FormOption {
  value: string
  label: string
}

interface FormField {
  id: string
  name: string                 // clave interna (ej: "rut", "first_name")
  label: string                // etiqueta visible
  type: FieldType
  helpText?: string
  required?: boolean
  active?: boolean             // visible para el postulante
  readOnly?: boolean           // solo lectura para el postulante
  placeholder?: string
  min?: number
  max?: number
  step?: number
  options?: FormOption[]       // para select / radio / checkbox
  multiple?: boolean           // en checkbox o select
  maxLength?: number
}

interface FormSection {
  id: string
  title: string
  description?: string
  commentBox?: boolean         // cuadro de comentarios para encargados (oculto al postulante)
  fields: FormField[]
}

interface FormSchema {
  id: string
  title: string
  year?: number
  sections: FormSection[]
}

interface Institution {
  id: string
  name: string
  type: string
  active: boolean
}

type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'NEEDS_FIX'
  | 'APPROVED'
  | 'REJECTED'

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

export default function FormPage() {
  const { id: urlId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(urlId || null)
  const [currentStep, setCurrentStep] = useState(0) // Estado para navegación por pasos
  const token = localStorage.getItem('fcg.access_token') ?? ''

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token],
  )

  // Si no hay ID en URL, obtener la application activa
  useEffect(() => {
    if (urlId) {
      setApplicationId(urlId)
      return
    }
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE}/applications/my-active`, { headers })
        if (!res.ok) {
          setError('No se encontró una postulación activa')
          setLoading(false)
          return
        }
        const data = await res.json()
        setApplicationId(data.id)
      } catch (err: any) {
        setError('Error al obtener tu postulación activa')
        setLoading(false)
      }
    })()
  }, [urlId, headers])

  useEffect(() => {
    if (!applicationId) return
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        // 0) Cargar instituciones
        const instRes = await fetch(`${API_BASE}/institutions?active=true&limit=200`, { headers })
        if (instRes.ok) {
          const instData = await instRes.json()
          setInstitutions(instData.data || [])
        }

        // 1) Metadatos de la postulación (para validar estado editable y obtener callId)
        const appRes = await fetch(`${API_BASE}/applications/${applicationId}`, { headers })
        if (!appRes.ok) throw new Error(await safeError(appRes))
        const appJson = (await appRes.json()) as { status: ApplicationStatus; callId?: string; call_id?: string }

        if (appJson.status !== 'DRAFT' && appJson.status !== 'NEEDS_FIX') {
          navigate('/applicant', { replace: true })
          return
        }

        // 2) Esquema del formulario usando el callId de la application (soporta ambos formatos)
        const callId = appJson.callId || appJson.call_id
        if (!callId) {
          throw new Error('No se encontró la convocatoria asociada')
        }
        
        const formRes = await fetch(`${API_BASE}/calls/${callId}/form`, {
          headers,
        })
        if (!formRes.ok) throw new Error(await safeError(formRes))
        const formJson = (await formRes.json()) as FormSchema
        
        if (!formJson || !formJson.title || !formJson.sections) {
          throw new Error('El formulario de esta convocatoria no está disponible')
        }
        
        setSchema(formJson)

        // 3) Respuestas existentes
        const answersRes = await fetch(
          `${API_BASE}/applications/${applicationId}/answers`,
          { headers },
        )
        const initial: Record<string, any> = answersRes.ok
          ? await answersRes.json()
          : {}

        // Estado inicial
        const flat: Record<string, any> = { ...(initial ?? {}) }
        for (const sec of formJson.sections) {
          for (const f of sec.fields) {
            if (f.active === false) continue
            const key = f.name
            if (flat[key] === undefined || flat[key] === null) {
              flat[key] = defaultValueFor(f)
            }
          }
        }
        setValues(flat)
      } catch (err: any) {
        setError(err.message ?? 'No se pudo cargar el formulario')
      } finally {
        setLoading(false)
      }
    })()
  }, [applicationId, headers, navigate])

  // Crear FormSubmission automáticamente si no existe
  useEffect(() => {
    if (!applicationId || !schema || submissionId) return
    ;(async () => {
      try {
        const submission = await formSubmissionsService.create(
          { applicationId, formData: {} },
          token,
        )
        setSubmissionId(submission.id)
      } catch (err) {
        console.error('Error creating form submission:', err)
      }
    })()
  }, [applicationId, schema, submissionId, token])

  async function onSaveDraft() {
    if (!applicationId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/applications/${applicationId}/answers`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error(await safeError(res))
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function onSubmit() {
    if (!applicationId) return
    setSubmitting(true)
    setError(null)
    try {
      // Guardar antes de enviar
      const saveRes = await fetch(`${API_BASE}/applications/${applicationId}/answers`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(values),
      })
      if (!saveRes.ok) throw new Error(await safeError(saveRes))

      // Enviar postulación
      const submitRes = await fetch(
        `${API_BASE}/applications/${applicationId}/submit`,
        { method: 'POST', headers },
      )
      if (!submitRes.ok) throw new Error(await safeError(submitRes))

      navigate('/applicant', { replace: true })
    } catch (err: any) {
      setError(err.message ?? 'No se pudo enviar la postulación')
    } finally {
      setSubmitting(false)
    }
  }

  function onChange(name: string, next: any) {
    setValues((s) => ({ ...s, [name]: next }))
  }

  // Calcular progreso del formulario
  const progress = useMemo(() => {
    if (!schema) return 0
    const allFields = schema.sections.flatMap(s => s.fields.filter(f => f.active !== false && f.required))
    // Si no hay campos obligatorios, el progreso es 100% (el formulario es válido)
    if (allFields.length === 0) return 100
    const filled = allFields.filter(f => {
      const val = values[f.name]
      if (Array.isArray(val)) return val.length > 0
      return val !== '' && val !== null && val !== undefined
    })
    return Math.round((filled.length / allFields.length) * 100)
  }, [schema, values])

  // Verificar si una sección está completa
  const isSectionComplete = (section: FormSection): boolean => {
    const requiredFields = section.fields.filter(f => f.active !== false && f.required)
    if (requiredFields.length === 0) return true
    return requiredFields.every(f => {
      const val = values[f.name]
      if (Array.isArray(val)) return val.length > 0
      return val !== '' && val !== null && val !== undefined
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header mejorado */}
        <header className="mb-8 animate-fade-in">
          <Link
            to="/applicant"
            className="btn btn-ghost mb-6 inline-flex"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver
          </Link>
          
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-sky-100">
                  <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Formulario de Postulación</h1>
                  {schema && (
                    <p className="text-gray-600 mt-1">
                      <span className="font-semibold text-sky-600">{schema.title}</span>
                      {schema.year && <span className="text-gray-500"> • {schema.year}</span>}
                    </p>
                  )}
                </div>
              </div>
              
              <p className="text-gray-600">
                Completa todas las secciones obligatorias. Puedes guardar como borrador y continuar más tarde.
              </p>
            </div>

            {/* Progress card flotante */}
            {schema && (
              <div className="card min-w-[280px] hover:shadow-lg transition-shadow duration-300">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">Tu progreso</span>
                    <span className={`text-2xl font-bold ${progress === 100 ? 'text-emerald-600' : 'text-sky-600'}`}>
                      {progress}%
                    </span>
                  </div>
                  <div className="progress">
                    <div
                      className={`progress-bar ${progress === 100 ? 'progress-bar-success' : ''}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {progress === 100 && (
                    <div className="mt-3 flex items-center gap-2 text-emerald-600 animate-scale-in">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-medium">¡Formulario completo!</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {loading && (
          <div className="card animate-slide-up">
            <div className="card-body flex items-center gap-4">
              <div className="spinner text-sky-600"></div>
              <p className="text-gray-600">Cargando formulario...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error animate-slide-down">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">Error al cargar el formulario</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && schema && (
          <>
            {/* Stepper mejorado con animación */}
            <div className="mb-8 card p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between gap-2 overflow-x-auto">
                {schema.sections.map((sec, index) => {
                  const isComplete = isSectionComplete(sec)
                  const isActive = index === currentStep
                  const isAccessible = index <= currentStep || isComplete
                  
                  return (
                    <div
                      key={sec.id}
                      className="flex items-center flex-shrink-0"
                    >
                      {/* Paso */}
                      <button
                        onClick={() => isAccessible && setCurrentStep(index)}
                        disabled={!isAccessible}
                        className={`group flex flex-col items-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 ${
                          isActive
                            ? 'bg-sky-50 ring-2 ring-sky-600 ring-offset-2 scale-105'
                            : isComplete
                            ? 'hover:bg-emerald-50 cursor-pointer'
                            : !isAccessible
                            ? 'cursor-not-allowed opacity-50'
                            : 'hover:bg-gray-100 cursor-pointer'
                        }`}
                      >
                        <div
                          className={`relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                            isActive
                              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 scale-110'
                              : isComplete
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'
                          }`}
                        >
                          {isComplete ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            index + 1
                          )}
                          
                          {isActive && (
                            <div className="absolute -inset-1 rounded-full bg-sky-600/20 animate-pulse"></div>
                          )}
                        </div>
                        <span className={`text-xs font-medium text-center max-w-[100px] transition-colors ${
                          isActive ? 'text-sky-700' : isComplete ? 'text-emerald-700' : 'text-gray-600'
                        }`}>
                          {sec.title}
                        </span>
                      </button>
                      
                      {/* Conector */}
                      {index < schema.sections.length - 1 && (
                        <div className={`h-0.5 w-8 mx-2 transition-all duration-500 ${
                          isComplete ? 'bg-emerald-600' : 'bg-gray-300'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sección actual con transición */}
            {schema.sections[currentStep] && (
              <section className="card animate-fade-in hover:shadow-lg transition-shadow duration-300" style={{ animationDelay: '0.2s' }}>
                <div className="card-header bg-gradient-to-r from-sky-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-sky-100">
                      <span className="text-lg font-bold text-sky-600">
                        {currentStep + 1}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {schema.sections[currentStep].title}
                      </h2>
                      {schema.sections[currentStep].description && (
                        <p className="mt-1 text-gray-600">{schema.sections[currentStep].description}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <div className="grid gap-6 md:grid-cols-2">
                    {schema.sections[currentStep].fields
                      .filter((f) => f.active !== false)
                      .map((f) => (
                        <FieldControl
                          key={f.id}
                          field={f}
                          value={values[f.name]}
                          onChange={onChange}
                          institutions={institutions}
                          applicationId={applicationId || undefined}
                          submissionId={submissionId}
                          token={token}
                        />
                      ))}
                  </div>

                  {schema.sections[currentStep].commentBox && (
                    <div className="alert alert-warning mt-6">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm">
                        Esta sección incluye un cuadro de comentarios para la entrevista (invisible para postulantes).
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Navegación mejorada con card flotante */}
            <div className="mt-8 card sticky bottom-4 shadow-strong animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="card-body">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Botón anterior */}
                  <button
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                    className="btn btn-outline"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Anterior
                  </button>

                  {/* Botones de acción */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={onSaveDraft}
                      disabled={saving || submitting}
                      className="btn btn-ghost"
                    >
                      <Save className="h-5 w-5" />
                      {saving ? (
                        <>
                          <span className="spinner"></span>
                          Guardando...
                        </>
                      ) : (
                        'Guardar borrador'
                      )}
                    </button>

                    {currentStep === schema.sections.length - 1 ? (
                      <button
                        onClick={onSubmit}
                        disabled={submitting || saving || progress < 100}
                        className="btn btn-success relative"
                      >
                        {submitting ? (
                          <>
                            <span className="spinner"></span>
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5" />
                            Enviar postulación
                            {progress === 100 && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentStep(Math.min(schema.sections.length - 1, currentStep + 1))}
                        className="btn btn-primary"
                      >
                        Siguiente
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Advertencia de campos faltantes */}
            {currentStep === schema.sections.length - 1 && progress < 100 && (
              <div className="mt-6 animate-slide-down">
                <div className="alert alert-warning">
                  <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold">Campos obligatorios pendientes</p>
                    <p className="text-sm mt-1">
                      Completa todos los campos marcados como obligatorios para poder enviar la postulación.
                    </p>
                    
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer font-medium hover:underline">
                        Ver lista de campos faltantes ({100 - progress}% restante)
                      </summary>
                      <ul className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                        {schema.sections.flatMap(s => 
                          s.fields.filter(f => f.active !== false && f.required).map(f => {
                            const val = values[f.name]
                            const isEmpty = Array.isArray(val) ? val.length === 0 : (val === '' || val === null || val === undefined)
                            if (isEmpty) {
                              return (
                                <li key={f.name} className="flex items-start gap-3 p-2 bg-amber-100 rounded-md">
                                  <svg className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <div>
                                    <p className="font-medium text-gray-900">{f.label || f.name}</p>
                                    {f.helpText && (
                                      <p className="text-xs text-gray-600 mt-0.5">{f.helpText}</p>
                                    )}
                                  </div>
                                </li>
                              )
                            }
                            return null
                          }).filter(Boolean)
                        )}
                      </ul>
                    </details>
                  </div>
                </div>
              </div>
            )}
            
            {/* Mensaje de éxito */}
            {progress === 100 && (
              <div className="mt-6 animate-scale-in">
                <div className="alert alert-success">
                  <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">¡Formulario completo!</p>
                    <p className="text-sm mt-1">
                      Todos los campos obligatorios están completos. Ya puedes enviar tu postulación.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function FieldControl({
  field,
  value,
  onChange,
  institutions,
  applicationId,
  submissionId,
  token,
}: {
  field: FormField
  value: any
  onChange: (name: string, next: any) => void
  institutions?: Institution[]
  applicationId?: string
  submissionId?: string | null
  token?: string
}) {
  const [fileState, setFileState] = useState<{ file: File | null; uploading: boolean; error?: string; fileId?: string }>({ file: null, uploading: false })
  const {
    name,
    label,
    type,
    helpText,
    required,
    readOnly,
    placeholder,
    min,
    max,
    step,
    options,
    multiple,
    maxLength,
  } = field

  const common = {
    id: name,
    name,
    required: !!required,
    disabled: !!readOnly,
    placeholder,
  }

  // Si el campo es 'rut', usar el componente RutInput
  if (name === 'rut' || name.toLowerCase().includes('rut')) {
    return (
      <RutInput
        value={value || ''}
        onChange={(val) => onChange(name, val)}
        label={label}
        required={required}
        disabled={readOnly}
        placeholder={placeholder}
        name={name}
        helpText={helpText}
      />
    )
  }

  // Si el campo es institution_id, usar selector especial
  if (name === 'institution_id' || name === 'institution') {
    return (
      <div className="space-y-1.5">
        <label htmlFor={name} className="block text-sm font-medium">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
        <select
          {...common}
          value={value ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-500"
        >
          <option value="">Seleccione una institución...</option>
          {(institutions || []).map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.name} ({inst.type})
            </option>
          ))}
        </select>
        {helpText && <p className="text-xs text-slate-500">{helpText}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>

      {type === 'text' && (
        <input
          {...common}
          type="text"
          maxLength={maxLength}
          value={value ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        />
      )}

      {type === 'number' && (
        <input
          {...common}
          type="number"
          min={min}
          max={max}
          step={1}
          value={value ?? ''}
          onChange={(e) =>
            onChange(name, e.target.value === '' ? '' : Number(e.target.value))
          }
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        />
      )}

      {type === 'decimal' && (
        <input
          {...common}
          type="number"
          min={min}
          max={max}
          step={step ?? 0.01}
          value={value ?? ''}
          onChange={(e) =>
            onChange(name, e.target.value === '' ? '' : Number(e.target.value))
          }
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        />
      )}

      {type === 'textarea' && (
        <textarea
          {...common}
          rows={4}
          maxLength={maxLength}
          value={value ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        />
      )}

      {type === 'date' && (
        <input
          {...common}
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        />
      )}

      {type === 'select' && (
        <select
          {...common}
          value={value ?? (multiple ? [] : '')}
          multiple={!!multiple}
          onChange={(e) => {
            if (multiple) {
              const selected = Array.from(e.target.selectedOptions).map((o) => o.value)
              onChange(name, selected)
            } else {
              onChange(name, e.target.value)
            }
          }}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          {!multiple && <option value="">Seleccione…</option>}
          {(options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {type === 'radio' && (
        <div className="space-y-1">
          {(options ?? []).map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(name, opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}

      {type === 'checkbox' && (
        <div className="space-y-1">
          {(options ?? []).map((opt) => {
            const arr: string[] = Array.isArray(value) ? value : []
            const checked = arr.includes(opt.value)
            return (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={name}
                  value={opt.value}
                  checked={checked}
                  onChange={(e) => {
                    const next = new Set(arr)
                    if (e.target.checked) next.add(opt.value)
                    else next.delete(opt.value)
                    onChange(name, Array.from(next))
                  }}
                />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
      )}

      {(type === 'file' || type === 'image') && token && applicationId && (
        <FileUpload
          onFileSelect={async (file) => {
            setFileState({ file, uploading: true })
            try {
              const uploadedFile = await filesService.upload(
                {
                  file,
                  category: 'FORM_FIELD',
                  entityType: 'APPLICATION',
                  entityId: applicationId,
                  description: `${label}${submissionId ? ` - Submission: ${submissionId}` : ''}`
                },
                token
              )
              setFileState({ file, uploading: false, fileId: uploadedFile.file.id })
              onChange(name, uploadedFile.file.id)
            } catch (err: any) {
              setFileState({ file, uploading: false, error: err.message || 'Error al subir archivo' })
            }
          }}
          onFileRemove={() => {
            setFileState({ file: null, uploading: false })
            onChange(name, null)
          }}
          file={fileState.file}
          isUploading={fileState.uploading}
          error={fileState.error}
          accept={type === 'image' ? 'image/*' : undefined}
          maxSize={10 * 1024 * 1024}
          label={label}
        />
      )}

      {helpText && <p className="text-xs text-slate-500">{helpText}</p>}
    </div>
  )
}

function defaultValueFor(field: FormField) {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'date':
      return ''
    case 'number':
    case 'decimal':
      return ''
    case 'select':
      return field.multiple ? [] : ''
    case 'radio':
      return ''
    case 'checkbox':
      return []
    case 'file':
    case 'image':
      return null
    default:
      return ''
  }
}

async function safeError(res: Response) {
  try {
    const data = await res.json()
    return data?.message || data?.error || res.statusText
  } catch {
    return res.statusText
  }
}
