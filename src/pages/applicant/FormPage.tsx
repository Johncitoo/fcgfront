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
  applicationId: string
  call: { id: string; code: string; title: string }
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
        method: 'PUT',
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
        method: 'PUT',
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
    const filled = allFields.filter(f => {
      const val = values[f.name]
      if (Array.isArray(val)) return val.length > 0
      return val !== '' && val !== null && val !== undefined
    })
    return allFields.length > 0 ? Math.round((filled.length / allFields.length) * 100) : 0
  }, [schema, values])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6">
          <Link
            to="/applicant"
            className="mb-4 inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a mis postulaciones
          </Link>
          
          <h1 className="text-3xl font-bold text-slate-900">Formulario de postulación</h1>
          
          {schema && (
            <div className="mt-2">
              <p className="text-sm text-slate-600 mb-2">
                Convocatoria: <span className="font-semibold text-slate-900">{schema.call.title}</span>
              </p>
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700">Progreso del formulario</span>
                  <span className="text-xs font-medium text-sky-600">{progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-sky-600 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          
          <p className="mt-4 text-sm text-slate-600">
            Completa las secciones y guarda como <b>borrador</b> o{' '}
            <b>envía</b> tu postulación cuando termines.
          </p>
        </header>

        {loading && (
          <div className="card">
            <div className="card-body">
              <p className="text-slate-600">Cargando…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="card border-rose-200">
            <div className="card-body">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && schema && (
          <>
            <div className="space-y-6">
              {schema.sections.map((sec) => (
                <section key={sec.id} className="card">
                  <div className="card-body space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold">{sec.title}</h2>
                      {sec.description && (
                        <p className="text-sm text-slate-600">{sec.description}</p>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {sec.fields
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

                    {sec.commentBox && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        Nota: esta sección incluye un cuadro de comentarios para la
                        entrevista (invisible para postulantes).
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={onSaveDraft}
                disabled={saving || submitting}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Guardando…' : 'Guardar borrador'}
              </button>

              <button
                onClick={onSubmit}
                disabled={submitting || saving || progress < 100}
                className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Enviando…' : 'Enviar postulación'}
              </button>
              
              {progress === 100 && (
                <div className="flex items-center gap-2 text-sm text-green-600 ml-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Formulario completo</span>
                </div>
              )}
            </div>
            
            {progress < 100 && (
              <p className="mt-3 text-xs text-slate-500">
                ⚠️ Completa todos los campos obligatorios para poder enviar la postulación
              </p>
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
