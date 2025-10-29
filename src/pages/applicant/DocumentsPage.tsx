import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../../lib/api'

type DocStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

interface DocumentRow {
  id: string
  application_id: string
  type: string
  status: DocStatus
  latest_version?: string | null
  created_at: string
  updated_at: string
}

interface VersionRow {
  id: string
  document_id: string
  storage_key: string
  file_name: string
  mime_type?: string | null
  file_size?: number | null
  uploaded_at: string
}

interface Paginated<T> {
  data: T[]
  meta?: { total: number; limit: number; offset: number }
}

export default function DocumentsPage() {
  // Asumimos que el backend devuelve "mi aplicación activa" del applicant
  const [appId, setAppId] = useState<string | null>(null)

  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // subir versión
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadDocId, setUploadDocId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)

  // crear documento
  const [createOpen, setCreateOpen] = useState(false)
  const [docType, setDocType] = useState('')
  const [creating, setCreating] = useState(false)
  const [createErr, setCreateErr] = useState<string | null>(null)

  const deps = useMemo(() => ({ appId }), [appId])

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        // 1) obtener mi application activa
        const me = await apiGet<{ application_id: string } | { id: string }>('/me/application')
        const id = (me as any).application_id ?? (me as any).id
        setAppId(id)

        // 2) listar documentos
        const res = await apiGet<Paginated<DocumentRow> | DocumentRow[]>(
          `/applications/${id}/documents`,
        )
        const list = Array.isArray(res) ? res : res.data ?? []
        setDocs(list)
      } catch (e: any) {
        setError(e.message ?? 'No se pudieron cargar los documentos')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    // refresco al cambiar appId si fuera necesario
  }, [deps])

  async function reloadDocs() {
    if (!appId) return
    try {
      const res = await apiGet<Paginated<DocumentRow> | DocumentRow[]>(
        `/applications/${appId}/documents`,
      )
      const list = Array.isArray(res) ? res : res.data ?? []
      setDocs(list)
    } catch {
      /* ignore */
    }
  }

  async function createDocument(e: React.FormEvent) {
    e.preventDefault()
    if (!appId) return
    setCreateErr(null)
    setCreating(true)
    try {
      if (!docType.trim()) throw new Error('Selecciona o ingresa un tipo de documento')
      await apiPost(`/applications/${appId}/documents`, { type: docType.trim() })
      setCreateOpen(false)
      setDocType('')
      await reloadDocs()
    } catch (e: any) {
      setCreateErr(e.message ?? 'No se pudo crear el documento')
    } finally {
      setCreating(false)
    }
  }

  async function uploadVersion(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadDocId || !file) return
    setUploadErr(null)
    setUploading(true)
    try {
      // Endpoint sugerido: POST /documents/:id/version  (multipart/form-data)
      const form = new FormData()
      form.append('file', file)
      await apiPost(`/documents/${uploadDocId}/version`, { body: form, asMultipart: true })
      setUploadOpen(false)
      setUploadDocId(null)
      setFile(null)
      await reloadDocs()
    } catch (e: any) {
      setUploadErr(e.message ?? 'No se pudo subir la nueva versión')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">Documentos</h1>
          <p className="text-slate-600">
            Sube y gestiona los documentos solicitados para tu postulación.
          </p>
        </header>

        {loading ? (
          <div className="card">
            <div className="card-body">
              <p className="text-slate-600">Cargando…</p>
            </div>
          </div>
        ) : error ? (
          <div className="card border-rose-200">
            <div className="card-body">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button onClick={() => setCreateOpen(true)} className="btn-primary">
                Añadir documento
              </button>
            </div>

            <div className="card">
              <div className="card-body">
                {docs.length === 0 ? (
                  <p className="text-sm text-slate-600">Aún no has agregado documentos.</p>
                ) : (
                  <div className="space-y-3">
                    {docs.map((d) => (
                      <div key={d.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold">{prettyType(d.type)}</div>
                            <div className="text-xs text-slate-600">
                              Estado: <StatusDoc status={d.status} />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setUploadDocId(d.id)
                                setUploadOpen(true)
                              }}
                              className="btn text-xs"
                            >
                              Subir nueva versión
                            </button>
                          </div>
                        </div>

                        {/* versiones */}
                        <DocVersions documentId={d.id} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal crear documento */}
      {createOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="text-base font-semibold">Añadir documento</div>
              <button onClick={() => setCreateOpen(false)} className="btn" aria-label="Cerrar">
                Cerrar
              </button>
            </div>
            <form onSubmit={createDocument} className="px-5 py-4 space-y-3">
              {createErr && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {createErr}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo *</label>
                <input
                  className="input"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  placeholder="Ej: ID, PROOF_OF_ENROLLMENT, INCOME_CERT…"
                />
                <p className="text-xs text-slate-500">
                  Usa el tipo indicado por tu convocatoria. Puedes añadir varios documentos.
                </p>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="btn">
                  Cancelar
                </button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? 'Creando…' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal subir versión */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="text-base font-semibold">Subir nueva versión</div>
              <button onClick={() => setUploadOpen(false)} className="btn" aria-label="Cerrar">
                Cerrar
              </button>
            </div>
            <form onSubmit={uploadVersion} className="px-5 py-4 space-y-3">
              {uploadErr && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {uploadErr}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-sm font-medium">Archivo *</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
                  className="block w-full text-sm"
                />
                <p className="text-xs text-slate-500">
                  Se recomienda PDF/JPG/PNG. Tamaño y tipos exactos los define la convocatoria.
                </p>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setUploadOpen(false)} className="btn">
                  Cancelar
                </button>
                <button type="submit" disabled={uploading || !file} className="btn-primary">
                  {uploading ? 'Subiendo…' : 'Subir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* -------- subcomponentes -------- */

function StatusDoc({ status }: { status: DocStatus }) {
  const label: Record<DocStatus, string> = {
    PENDING: 'Pendiente',
    ACCEPTED: 'Aceptado',
    REJECTED: 'Rechazado',
  }
  return <span className="badge">{label[status]}</span>
}

function prettyType(t: string) {
  return t.replace(/_/g, ' ')
}

function DocVersions({ documentId }: { documentId: string }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<VersionRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        setLoading(true)
        const res = await apiGet<Paginated<VersionRow> | VersionRow[]>(
          `/documents/${documentId}/versions`,
        )
        const list = Array.isArray(res) ? res : res.data ?? []
        setRows(list)
      } finally {
        setLoading(false)
      }
    })()
  }, [open, documentId])

  return (
    <div className="mt-2">
      <button onClick={() => setOpen((v) => !v)} className="btn text-xs">
        {open ? 'Ocultar versiones' : 'Mostrar versiones'}
      </button>
      {open && (
        <div className="mt-2 rounded-md border bg-slate-50 p-2">
          {loading ? (
            <p className="text-xs text-slate-600">Cargando…</p>
          ) : rows.length === 0 ? (
            <p className="text-xs text-slate-600">Sin versiones aún.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {rows.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate">{v.file_name}</div>
                    <div className="text-xs text-slate-600">
                      {v.mime_type || '—'} · {v.file_size ? `${(v.file_size / 1024 / 1024).toFixed(2)} MB` : '—'} ·{' '}
                      {new Date(v.uploaded_at).toLocaleString()}
                    </div>
                  </div>
                  {/* Link de descarga: dependerá de tu backend (URL firmada o proxy). */}
                  {/* <a href={...} className="btn text-xs">Descargar</a> */}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
