import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

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
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const token = localStorage.getItem('fcg.access_token') ?? ''

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token],
  )

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        // 1) Metadatos de la postulación (para validar estado editable)
        const appRes = await fetch(`${API_BASE}/applications/${id}`, { headers })
        if (!appRes.ok) throw new Error(await safeError(appRes))
        const appJson = (await appRes.json()) as { status: ApplicationStatus }

        if (appJson.status !== 'DRAFT' && appJson.status !== 'NEEDS_FIX') {
          navigate('/applicant', { replace: true })
          return
        }

        // 2) Esquema del formulario
        const formRes = await fetch(`${API_BASE}/applications/${id}/form`, {
          headers,
        })
        if (!formRes.ok) throw new Error(await safeError(formRes))
        const formJson = (await formRes.json()) as FormSchema
        setSchema(formJson)

        // 3) Respuestas existentes
        const answersRes = await fetch(
          `${API_BASE}/applications/${id}/answers`,
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
  }, [id, headers, navigate])

  async function onSaveDraft() {
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/applications/${id}/answers`, {
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
    if (!id) return
    setSubmitting(true)
    setError(null)
    try {
      // Guardar antes de enviar
      const saveRes = await fetch(`${API_BASE}/applications/${id}/answers`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(values),
      })
      if (!saveRes.ok) throw new Error(await safeError(saveRes))

      // Enviar postulación
      const submitRes = await fetch(
        `${API_BASE}/applications/${id}/submit`,
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

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Formulario de postulación</h1>
          <p className="text-slate-600">
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

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={onSaveDraft}
                disabled={saving || submitting}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                {saving ? 'Guardando…' : 'Guardar borrador'}
              </button>

              <button
                onClick={onSubmit}
                disabled={submitting || saving}
                className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {submitting ? 'Enviando…' : 'Enviar postulación'}
              </button>

              <Link
                to="/applicant"
                className="rounded-md px-4 py-2 text-sm font-medium hover:underline"
              >
                Volver
              </Link>
            </div>
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
}: {
  field: FormField
  value: any
  onChange: (name: string, next: any) => void
}) {
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

      {(type === 'file' || type === 'image') && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          Este campo requiere subir un archivo/imagen. La carga real se hará en el
          módulo de Documentos.
        </div>
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
