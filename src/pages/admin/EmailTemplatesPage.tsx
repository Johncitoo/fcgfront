import { useEffect, useMemo, useState } from 'react'

interface EmailTemplate {
  id: string
  code: string        // p.ej. INVITE_APPLICANT, APPLICATION_SUBMITTED, REQUEST_FIX, APPROVED, REJECTED
  subject: string
  body_html: string
  created_at?: string
  updated_at?: string
}

interface PageMeta {
  total: number
  limit: number
  offset: number
}
interface ListResponse<T> {
  data: T[]
  meta?: PageMeta
}

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

export default function EmailTemplatesPage() {
  const [rows, setRows] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filtros / paginación
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)
  const [meta, setMeta] = useState<PageMeta | null>(null)

  // modal crear/editar
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; base?: EmailTemplate }>(null)
  const [form, setForm] = useState({ code: '', subject: '', body_html: '' })
  const [formErr, setFormErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // modal preview
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')

  const headers = useMemo(() => {
    const token = localStorage.getItem('fcg.access_token') ?? ''
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }, [])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (q.trim()) params.set('q', q.trim())

      const res = await fetch(`${API_BASE}/email/templates?${params.toString()}`, {
        headers,
      })
      if (!res.ok) throw new Error(await safeError(res))
      const json = (await res.json()) as ListResponse<EmailTemplate> | EmailTemplate[]

      if (Array.isArray(json)) {
        setRows(json)
        setMeta({ total: json.length, limit, offset })
      } else {
        setRows(json.data ?? [])
        setMeta(json.meta ?? { total: (json.data ?? []).length, limit, offset })
      }
    } catch (e: any) {
      setError(e.message ?? 'No se pudieron cargar las plantillas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset])

  function openCreate() {
    setForm({ code: '', subject: '', body_html: '' })
    setFormErr(null)
    setModal({ mode: 'create' })
  }

  function openEdit(t: EmailTemplate) {
    setForm({ code: t.code, subject: t.subject, body_html: t.body_html })
    setFormErr(null)
    setModal({ mode: 'edit', base: t })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!modal) return

    setSaving(true)
    setFormErr(null)
    try {
      const payload = {
        code: form.code.trim(),
        subject: form.subject.trim(),
        body_html: form.body_html,
      }

      let res: Response
      if (modal.mode === 'create') {
        res = await fetch(`${API_BASE}/email/templates`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`${API_BASE}/email/templates/${modal.base!.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        })
      }
      if (!res.ok) throw new Error(await safeError(res))

      setModal(null)
      setOffset(0)
      await load()
    } catch (e: any) {
      setFormErr(e.message ?? 'No se pudo guardar la plantilla')
    } finally {
      setSaving(false)
    }
  }

  function openPreview(html: string) {
    setPreviewHtml(html)
    setPreviewOpen(true)
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Plantillas de correo</h1>
          <p className="text-slate-600">
            Define asunto y contenido HTML. Puedes usar variables como <code>{'{{name}}'}</code>,{' '}
            <code>{'{{code}}'}</code>, <code>{'{{call_title}}'}</code>, etc., que el backend
            reemplazará al enviar.
          </p>
        </header>

        {/* Filtros + acciones */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código o asunto…"
            className="rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          />
          <button
            onClick={() => {
              setOffset(0)
              load()
            }}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Buscar
          </button>

          <div className="ml-auto">
            <button
              onClick={openCreate}
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              Nueva plantilla
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="card">
          <div className="card-body overflow-x-auto">
            {loading ? (
              <p className="text-slate-600">Cargando…</p>
            ) : error ? (
              <p className="text-sm text-rose-700">{error}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-slate-600">
                  <tr className="border-b">
                    <th className="py-2 pr-3">Código</th>
                    <th className="py-2 pr-3">Asunto</th>
                    <th className="py-2 pr-3">Actualizada</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        No hay plantillas.
                      </td>
                    </tr>
                  ) : (
                    rows.map((t) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{t.code}</td>
                        <td className="py-2 pr-3">{t.subject}</td>
                        <td className="py-2 pr-3">
                          {t.updated_at ? new Date(t.updated_at).toLocaleString() : '—'}
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openEdit(t)}
                              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => openPreview(t.body_html)}
                              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                            >
                              Previsualizar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Paginación */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Filas por página:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setOffset(0)
              }}
              className="rounded-md border px-2 py-1"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="rounded-md border px-3 py-1.5 disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={meta ? offset + limit >= meta.total : undefined}
              className="rounded-md border px-3 py-1.5 disabled:opacity-50"
            >
              Siguiente
            </button>
            <span className="text-slate-600">
              {meta
                ? `${Math.min(meta.total, offset + 1)}–${Math.min(
                    meta.total,
                    offset + rows.length,
                  )} de ${meta.total}`
                : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-3xl rounded-lg border bg-white shadow-lg">
            <div className="border-b px-5 py-3">
              <div className="text-base font-semibold">
                {modal.mode === 'create' ? 'Nueva plantilla' : `Editar: ${modal.base?.code}`}
              </div>
            </div>

            <form onSubmit={submit} className="px-5 py-4 space-y-3">
              {formErr && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {formErr}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Código *</label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    placeholder="INVITE_APPLICANT"
                  />
                  <p className="text-xs text-slate-500">
                    Usa MAYÚSCULAS y guiones bajos. Ej: <code>REQUEST_FIX</code>
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Asunto *</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    placeholder="Tu código de invitación — Fundación Carmen Goudie"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">HTML *</label>
                <textarea
                  required
                  rows={14}
                  value={form.body_html}
                  onChange={(e) => setForm((s) => ({ ...s, body_html: e.target.value }))}
                  className="w-full font-mono text-xs rounded-md border px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  placeholder={`<p>Hola {{name}},</p>\n<p>Tu código es <b>{{code}}</b> para la convocatoria {{call_title}}.</p>`}
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openPreview(form.body_html)}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    Previsualizar
                  </button>
                </div>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal preview */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-4xl rounded-lg border bg-white shadow-lg">
            <div className="border-b px-5 py-3 flex items-center justify-between">
              <div className="text-base font-semibold">Previsualización</div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
            <div className="px-5 py-4">
              <iframe
                title="email-preview"
                className="h-[60vh] w-full rounded-md border"
                srcDoc={previewHtml}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

async function safeError(res: Response) {
  try {
    const data = await res.json()
    return data?.message || data?.error || res.statusText
  } catch {
    return res.statusText
  }
}
