import { useEffect, useMemo, useState } from 'react'
import { useCall } from '../../contexts/CallContext'

interface ApplicantRow {
  id: string
  email: string
  fullName?: string
  firstName?: string
  lastName?: string
  rutNumber?: number
  rutDv?: string
  phone?: string | null
  birthDate?: string | null
  address?: string | null
  commune?: string | null
  region?: string | null
  institutionName?: string | null
  institutionCommune?: string | null
  createdAt?: string
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
  const { selectedCallId } = useCall()
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
  const [createForm, setCreateForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    rut: '',
    phone: '',
    birth_date: '',
    address: '',
    commune: '',
    region: '',
    institution_id: '',
  })
  // Campos extra opcionales que el usuario puede agregar dinámicamente
  const [extraFields, setExtraFields] = useState<string[]>([])
  const [createError, setCreateError] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  // Instituciones para selector
  const [institutions, setInstitutions] = useState<Array<{id: string, name: string, commune?: string}>>([])

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
      if (selectedCallId) params.set('callId', selectedCallId)

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
    loadInstitutions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, offset, selectedCallId])

  async function loadInstitutions() {
    try {
      const res = await fetch(`${API_BASE}/institutions?active=true&limit=500`, { headers })
      if (!res.ok) return
      const json = await res.json()
      setInstitutions(json.data ?? [])
    } catch {
      // silencioso
    }
  }

  function onChange<K extends keyof typeof createForm>(k: K, v: (typeof createForm)[K]) {
    setCreateForm((s) => ({ ...s, [k]: v }))
  }

  async function createApplicant(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreateLoading(true)
    try {
      // Construir fullName ya que el backend espera `fullName`
      const first = createForm.first_name?.trim() || ''
      const last = createForm.last_name?.trim() || ''
      let fullName = (first + (last ? ` ${last}` : '')).trim()
      if (!fullName) {
        // Derivar nombre del correo antes de la @ si no hay nombre
        const local = createForm.email.split('@')[0] || ''
        fullName = local.replace(/[._\-]/g, ' ').replace(/\b\w/g, (m: string) => m.toUpperCase())
      }

      const payload: any = {
        email: createForm.email.trim(),
        fullName,
      }
      if (createForm.first_name?.trim()) payload.first_name = createForm.first_name.trim()
      if (createForm.last_name?.trim()) payload.last_name = createForm.last_name.trim()
      if (createForm.rut?.trim()) payload.rut = createForm.rut.trim()
      if (createForm.phone?.trim()) payload.phone = createForm.phone.trim()
      if (createForm.birth_date?.trim()) payload.birth_date = createForm.birth_date.trim()
      if (createForm.address?.trim()) payload.address = createForm.address.trim()
      if (createForm.commune?.trim()) payload.commune = createForm.commune.trim()
      if (createForm.region?.trim()) payload.region = createForm.region.trim()
      if (createForm.institution_id?.trim()) payload.institution_id = createForm.institution_id.trim()
      if (selectedCallId) payload.call_id = selectedCallId

      const res = await fetch(`${API_BASE}/applicants`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await safeError(res))
      // recargar
      setCreating(false)
      setCreateForm({ email: '', first_name: '', last_name: '', rut: '', phone: '', birth_date: '', address: '', commune: '', region: '', institution_id: '' })
      setExtraFields([])
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
    const a = (r.firstName ?? '').trim()
    const b = (r.lastName ?? '').trim()
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
                    <th className="py-2 pr-3">RUT</th>
                    <th className="py-2 pr-3">Correo</th>
                    <th className="py-2 pr-3">Teléfono</th>
                    <th className="py-2 pr-3">Escuela/Colegio</th>
                    <th className="py-2">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500">
                        No hay registros.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const name = r.fullName || fullName(r) || '—'
                      const rut = r.rutNumber && r.rutDv 
                        ? `${r.rutNumber.toLocaleString('es-CL')}-${r.rutDv}` 
                        : '—'
                      const school = r.institutionName 
                        ? `${r.institutionName}${r.institutionCommune ? ` (${r.institutionCommune})` : ''}`
                        : '—'
                      
                      return (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="py-2 pr-3 font-medium">{name}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{rut}</td>
                          <td className="py-2 pr-3 text-slate-600">{r.email}</td>
                          <td className="py-2 pr-3">{r.phone || '—'}</td>
                          <td className="py-2 pr-3 text-slate-600">{school}</td>
                          <td className="py-2">
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleDateString('es-CL')
                              : '—'}
                          </td>
                        </tr>
                      )
                    })
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
            <form onSubmit={createApplicant} className="px-5 py-4 space-y-4">
              {createError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {createError}
                </div>
              )}

              {/* Campos siempre visibles (básicos) */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium">Correo electrónico *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => onChange('email', e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    placeholder="alumno@colegio.cl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={createForm.first_name}
                    onChange={(e) => onChange('first_name', e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    placeholder="Ej: María José"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={createForm.last_name}
                    onChange={(e) => onChange('last_name', e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    placeholder="Ej: Pérez Soto"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium">RUT *</label>
                  <input
                    type="text"
                    required
                    value={createForm.rut}
                    onChange={(e) => onChange('rut', e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    placeholder="12.345.678-9"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium">Escuela/Colegio *</label>
                  <select
                    required
                    value={createForm.institution_id}
                    onChange={(e) => onChange('institution_id', e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <option value="">Seleccione una institución...</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}{inst.commune ? ` - ${inst.commune}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selector de campos opcionales */}
              <div className="border-t pt-3">
                <div className="mb-2 flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700">Agregar campo opcional:</label>
                  <select
                    value=""
                    onChange={(e) => {
                      const v = e.target.value
                      if (!v) return
                      if (!extraFields.includes(v)) setExtraFields((s) => [...s, v])
                      e.currentTarget.value = ''
                    }}
                    className="rounded-md border px-2 py-1 text-sm"
                  >
                    <option value="">Seleccione…</option>
                    <option value="phone" disabled={extraFields.includes('phone')}>Teléfono</option>
                    <option value="birth_date" disabled={extraFields.includes('birth_date')}>Fecha de nacimiento</option>
                    <option value="address" disabled={extraFields.includes('address')}>Dirección</option>
                    <option value="commune" disabled={extraFields.includes('commune')}>Comuna</option>
                    <option value="region" disabled={extraFields.includes('region')}>Región</option>
                  </select>
                </div>

                {/* Campos opcionales agregados */}
                {extraFields.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {extraFields.includes('phone') && (
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium">Teléfono</label>
                        <input
                          type="tel"
                          value={createForm.phone}
                          onChange={(e) => onChange('phone', e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          placeholder="+56 9 1234 5678"
                        />
                      </div>
                    )}
                    {extraFields.includes('birth_date') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Fecha de nacimiento</label>
                        <input
                          type="date"
                          value={createForm.birth_date}
                          onChange={(e) => onChange('birth_date', e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                        />
                      </div>
                    )}
                    {extraFields.includes('address') && (
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium">Dirección</label>
                        <input
                          type="text"
                          value={createForm.address}
                          onChange={(e) => onChange('address', e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          placeholder="Calle, número, depto"
                        />
                      </div>
                    )}
                    {extraFields.includes('commune') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Comuna</label>
                        <input
                          type="text"
                          value={createForm.commune}
                          onChange={(e) => onChange('commune', e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          placeholder="Ej: Santiago"
                        />
                      </div>
                    )}
                    {extraFields.includes('region') && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Región</label>
                        <input
                          type="text"
                          value={createForm.region}
                          onChange={(e) => onChange('region', e.target.value)}
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                          placeholder="Ej: Metropolitana"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false)
                    setExtraFields([])
                  }}
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
