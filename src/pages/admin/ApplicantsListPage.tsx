import { useEffect, useMemo, useState } from 'react'

interface ApplicantRow {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  rut?: string | null
  phone?: string | null
  created_at?: string
}

interface PageMeta {
  total: number
  limit: number
  offset: number
}

interface ListResponse {
  data: ApplicantRow[]
  meta?: PageMeta
}

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

export default function ApplicantsListPage() {
  const [rows, setRows] = useState<ApplicantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filtros / paginación simples
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)
  const [meta, setMeta] = useState<PageMeta | null>(null)

  // crear manualmente (modal simple inline)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    rut: '',
    phone: '',
  })
  // Campos extra seleccionables (para UX: permite agregar variables opcionales)
  const [extraFields, setExtraFields] = useState<string[]>([])
  const [createError, setCreateError] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

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

      const res = await fetch(`${API_BASE}/applicants?${params.toString()}`, {
        headers,
      })
      if (!res.ok) throw new Error(await safeError(res))
      const json = (await res.json()) as ListResponse | ApplicantRow[]

      // Soportar payloads {data,meta} o array directo
      if (Array.isArray(json)) {
        setRows(json)
        setMeta({ total: json.length, limit, offset })
      } else {
        setRows(json.data ?? [])
        setMeta(
          json.meta ?? {
            total: (json.data ?? []).length,
            limit,
            offset,
          },
        )
      }
    } catch (err: any) {
      setError(err.message ?? 'No se pudo cargar el listado')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset])

  function onChange<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }))
  }

  async function createApplicant(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreateLoading(true)
    try {
      // Construir fullName ya que el backend espera `fullName`
      const first = form.first_name?.trim() || ''
      const last = form.last_name?.trim() || ''
      let fullName = (first + (last ? ` ${last}` : '')).trim()
      if (!fullName) {
        // Derivar nombre del correo antes de la @ si no hay nombre
        const local = form.email.split('@')[0] || ''
        fullName = local.replace(/[._\-]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
      }

      const payload: any = {
        email: form.email.trim(),
        fullName,
      }
      if (form.first_name?.trim()) payload.first_name = form.first_name.trim()
      if (form.last_name?.trim()) payload.last_name = form.last_name.trim()
      if (form.rut?.trim()) payload.rut = form.rut.trim()
      if (form.phone?.trim()) payload.phone = form.phone.trim()
      const res = await fetch(`${API_BASE}/applicants`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await safeError(res))
      // recargar
      setCreating(false)
      setForm({ email: '', first_name: '', last_name: '', rut: '', phone: '' })
      // volver a primera página para ver el nuevo si el backend ordena por fecha desc
      setOffset(0)
      await load()
    } catch (err: any) {
      setCreateError(err.message ?? 'No se pudo crear el postulante')
    } finally {
      setCreateLoading(false)
    }
  }

  function fullName(r: ApplicantRow) {
    const a = (r.first_name ?? '').trim()
    const b = (r.last_name ?? '').trim()
    return (a + (b ? ` ${b}` : '')).trim()
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Postulantes</h1>
          <p className="text-slate-600">
            Ingreso manual, búsqueda y visualización de postulantes.
          </p>
        </header>

        {/* Barra de acciones */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o correo…"
              className="rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            />
          </div>
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
              onClick={() => setCreating(true)}
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              Ingresar postulante
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
                    <th className="py-2 pr-3">Nombre</th>
                    <th className="py-2 pr-3">Correo</th>
                    <th className="py-2 pr-3">RUT</th>
                    <th className="py-2 pr-3">Teléfono</th>
                    <th className="py-2">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No hay registros.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">{fullName(r) || '—'}</td>
                        <td className="py-2 pr-3">{r.email}</td>
                        <td className="py-2 pr-3">{r.rut || '—'}</td>
                        <td className="py-2 pr-3">{r.phone || '—'}</td>
                        <td className="py-2">
                          {r.created_at
                            ? new Date(r.created_at).toLocaleString()
                            : '—'}
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

      {/* Modal crear */}
      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-white shadow-lg">
            <div className="border-b px-5 py-3">
              <div className="text-base font-semibold">Ingresar postulante</div>
            </div>
            <form onSubmit={createApplicant} className="px-5 py-4 space-y-3">
              {createError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {createError}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Correo *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => onChange('email', e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    placeholder="alumno@colegio.cl"
                  />
                </div>
                {/* RUT, nombres y teléfono se muestran como campos opcionales que se pueden agregar */}
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Agregar campo</label>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const v = e.target.value
                        if (!v) return
                        if (!extraFields.includes(v)) setExtraFields((s) => [...s, v])
                        e.currentTarget.value = ''
                      }}
                      className="rounded-md border px-2 py-1 text-sm"
                    >
                      <option value="">Seleccione…</option>
                      {['first_name', 'last_name', 'rut', 'phone'].map((k) => (
                        <option key={k} value={k} disabled={extraFields.includes(k)}>
                          {k}
                        </option>
                      ))}
                    </select>
                    <div className="ml-auto text-sm text-slate-500">Campos añadidos: {extraFields.join(', ') || 'ninguno'}</div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {extraFields.includes('rut') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">RUT</label>
                        <input
                          type="text"
                          value={form.rut}
                          onChange={(e) => onChange('rut', e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          placeholder="12.345.678-9"
                        />
                      </div>
                    )}
                    {extraFields.includes('first_name') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Nombres</label>
                        <input
                          type="text"
                          value={form.first_name}
                          onChange={(e) => onChange('first_name', e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          placeholder="Ej: María José"
                        />
                      </div>
                    )}
                    {extraFields.includes('last_name') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Apellidos</label>
                        <input
                          type="text"
                          value={form.last_name}
                          onChange={(e) => onChange('last_name', e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          placeholder="Ej: Pérez Soto"
                        />
                      </div>
                    )}
                    {extraFields.includes('phone') && (
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium">Teléfono</label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => onChange('phone', e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          placeholder="+56 9 1234 5678"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {createLoading ? 'Creando…' : 'Crear'}
                </button>
              </div>
            </form>
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
