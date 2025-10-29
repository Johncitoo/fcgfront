import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'NEEDS_FIX'
  | 'APPROVED'
  | 'REJECTED'

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
  name: string
  label: string
  type: FieldType
  helpText?: string
  required?: boolean
  active?: boolean
  multiple?: boolean
  options?: FormOption[]
}

interface FormSection {
  id: string
  title: string
  description?: string
  commentBox?: boolean
  fields: FormField[]
}

interface FormSchema {
  applicationId: string
  call: { id: string; code: string; title: string }
  sections: FormSection[]
}

interface ApplicationHeader {
  id: string
  status: ApplicationStatus
  call: { id: string; code: string; title: string }
  applicant: { id: string; email: string; first_name?: string; last_name?: string }
}

interface AnswersMap {
  [key: string]: any
}

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

export default function ApplicationFullFormPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [header, setHeader] = useState<ApplicationHeader | null>(null)
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [answers, setAnswers] = useState<AnswersMap>({})

  const headers = useMemo(() => {
    const token = localStorage.getItem('fcg.access_token') ?? ''
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }, [])

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        // Encabezado (datos generales)
        const headRes = await fetch(`${API_BASE}/applications/${id}`, { headers })
        if (!headRes.ok) throw new Error(await safeError(headRes))
        const headJson = (await headRes.json()) as ApplicationHeader
        setHeader(headJson)

        // Esquema
        const formRes = await fetch(`${API_BASE}/applications/${id}/form`, {
          headers,
        })
        if (!formRes.ok) throw new Error(await safeError(formRes))
        const formJson = (await formRes.json()) as FormSchema
        setSchema(formJson)

        // Respuestas
        const ansRes = await fetch(`${API_BASE}/applications/${id}/answers`, {
          headers,
        })
        const ansJson = ansRes.ok ? ((await ansRes.json()) as AnswersMap) : {}
        setAnswers(ansJson ?? {})
      } catch (err: any) {
        setError(err.message ?? 'No se pudo cargar el detalle del formulario')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, headers])

  const fullName =
    (header?.applicant.first_name?.trim() || '') +
    (header?.applicant.last_name ? ` ${header.applicant.last_name.trim()}` : '')

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Formulario — detalle completo</h1>
            {header && (
              <p className="text-slate-600">
                Convocatoria:{' '}
                <span className="font-medium">{header.call.title}</span>{' '}
                <span className="text-slate-500">({header.call.code})</span>
                {' · '}Postulante:{' '}
                <span className="font-medium">{fullName || header.applicant.email}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              to={`/reviewer/applications/${id}`}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Volver a revisión
            </Link>
            <Link
              to="/reviewer"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Bandeja
            </Link>
          </div>
        </header>

        {loading && (
          <div className="card">
            <div className="card-body"><p className="text-slate-600">Cargando…</p></div>
          </div>
        )}

        {error && (
          <div className="card border-rose-200">
            <div className="card-body"><p className="text-sm text-rose-700">{error}</p></div>
          </div>
        )}

        {!loading && !error && schema && (
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

                  <dl className="grid gap-4 md:grid-cols-2">
                    {sec.fields
                      .filter((f) => f.active !== false)
                      .map((f) => (
                        <div key={f.id}>
                          <dt className="text-sm text-slate-500">{f.label}</dt>
                          <dd className="font-medium break-words">
                            <FieldValue field={f} value={answers[f.name]} />
                          </dd>
                          {f.helpText && (
                            <p className="mt-1 text-xs text-slate-500">{f.helpText}</p>
                          )}
                        </div>
                      ))}
                  </dl>

                  {sec.commentBox && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      Esta sección posee un cuadro de comentarios para entrevista
                      (invisible al postulante).
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* =============== Helpers =============== */

function FieldValue({ field, value }: { field: FormField; value: any }) {
  if (value == null || value === '') return <span className="text-slate-400">—</span>

  switch (field.type) {
    case 'checkbox':
      return Array.isArray(value) && value.length
        ? <ul className="list-disc pl-5 text-sm">{value.map((v: string) => <li key={v}>{labelFor(field, v)}</li>)}</ul>
        : <span className="text-slate-400">—</span>

    case 'select':
      if (field.multiple) {
        const arr = Array.isArray(value) ? value : []
        return arr.length
          ? <ul className="list-disc pl-5 text-sm">{arr.map((v: string) => <li key={v}>{labelFor(field, v)}</li>)}</ul>
          : <span className="text-slate-400">—</span>
      }
      return <span>{labelFor(field, value)}</span>

    case 'radio':
      return <span>{labelFor(field, value)}</span>

    case 'file':
    case 'image':
      // En esta versión sólo mostramos una pista; el módulo de Documentos gestionará links/preview.
      return (
        <span className="rounded-md border bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
          Archivo adjunto (ver módulo Documentos)
        </span>
      )

    case 'number':
    case 'decimal':
      return <span>{String(value)}</span>

    case 'date':
      try {
        const d = new Date(value)
        return <span>{isNaN(d.getTime()) ? String(value) : d.toLocaleDateString()}</span>
      } catch {
        return <span>{String(value)}</span>
      }

    case 'textarea':
    case 'text':
    default:
      return <span className="whitespace-pre-wrap">{String(value)}</span>
  }
}

function labelFor(field: FormField, v: string): string {
  const match = (field.options ?? []).find((o) => o.value === v)
  return match ? match.label : v
}

async function safeError(res: Response) {
  try {
    const data = await res.json()
    return data?.message || data?.error || res.statusText
  } catch {
    return res.statusText
  }
}
