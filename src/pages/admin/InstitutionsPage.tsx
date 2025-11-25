import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api'

interface Institution {
  id: string
  name: string
  code?: string
  commune?: string
  province?: string
  region?: string
  type: 'LICEO' | 'COLEGIO' | 'INSTITUTO' | 'OTRO'
  active: boolean
  createdAt: string
  updatedAt: string
}

interface ListResponse {
  data: Institution[]
  total: number
  limit: number
  offset: number
}

export default function InstitutionsPage() {
  const [rows, setRows] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Institution | null>(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    commune: '',
    province: '',
    region: '',
    type: 'LICEO' as const,
  })
  const [createError, setCreateError] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  const deps = useMemo(() => ({ q, limit, offset }), [q, limit, offset])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (q.trim()) params.set('q', q.trim())

      const res = await apiGet<ListResponse>(`/institutions?${params.toString()}`)
      setRows(res.data ?? [])
      setTotal(res.total ?? 0)
    } catch (err: any) {
      setError(err.message ?? 'No se pudo cargar el listado')
    } finally {
      setLoading(false)
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreateLoading(true)
    try {
      if (!createForm.name.trim()) throw new Error('El nombre es obligatorio')

      if (editing) {
        await apiPatch(`/institutions/${editing.id}`, createForm)
      } else {
        await apiPost('/institutions', createForm)
      }

      setCreating(false)
      setEditing(null)
      setCreateForm({ name: '', code: '', commune: '', province: '', region: '', type: 'LICEO' })
      setOffset(0)
      await load()
    } catch (err: any) {
      setCreateError(err.message ?? 'No se pudo guardar la institución')
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Desactivar esta institución?')) return
    try {
      await apiDelete(`/institutions/${id}`)
      await load()
    } catch (err: any) {
      alert(err.message ?? 'Error al desactivar')
    }
  }

  function openEdit(inst: Institution) {
    setEditing(inst)
    setCreateForm({
      name: inst.name,
      code: inst.code || '',
      commune: inst.commune || '',
      province: inst.province || '',
      region: inst.region || '',
      type: inst.type,
    })
    setCreating(true)
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Escuelas/Colegios</h1>
          <p className="text-slate-600">
            Gestiona las instituciones educacionales para asignar a los postulantes.
          </p>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="rounded-md border px-3 py-2 text-sm"
          />
          <button
            onClick={() => { setOffset(0); load() }}
            className="btn"
          >
            Buscar
          </button>

          <div className="ml-auto">
            <button
              onClick={() => {
                setEditing(null)
                setCreateForm({ name: '', code: '', commune: '', province: '', region: '', type: 'LICEO' })
                setCreating(true)
              }}
              className="btn-primary"
            >
              Nueva institución
            </button>
          </div>
        </div>

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
                    <th className="py-2 pr-3">Código</th>
                    <th className="py-2 pr-3">Comuna</th>
                    <th className="py-2 pr-3">Región</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        No hay registros.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 pr-3 font-medium">{r.name}</td>
                        <td className="py-2 pr-3">{r.code || '—'}</td>
                        <td className="py-2 pr-3">{r.commune || '—'}</td>
                        <td className="py-2 pr-3">{r.region || '—'}</td>
                        <td className="py-2 pr-3">{r.type}</td>
                        <td className="py-2 pr-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {r.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-2 flex gap-2">
                          <button onClick={() => openEdit(r)} className="text-sky-600 hover:underline text-xs">
                            Editar
                          </button>
                          {r.active && (
                            <button onClick={() => handleDelete(r.id)} className="text-rose-600 hover:underline text-xs">
                              Desactivar
                            </button>
                          )}
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
              onChange={(e) => { setLimit(Number(e.target.value)); setOffset(0) }}
              className="rounded-md border px-2 py-1"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="btn disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="btn disabled:opacity-50"
            >
              Siguiente
            </button>
            <span className="text-slate-600">
              {total > 0 ? `${Math.min(total, offset + 1)}–${Math.min(total, offset + rows.length)} de ${total}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-white shadow-lg">
            <div className="border-b px-5 py-3">
              <div className="text-base font-semibold">
                {editing ? 'Editar institución' : 'Nueva institución'}
              </div>
            </div>
            <form onSubmit={onCreate} className="px-5 py-4 space-y-3">
              {createError && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {createError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                  className="input"
                  placeholder="Ej: Liceo A-1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Código RBD</label>
                <input
                  type="text"
                  value={createForm.code}
                  onChange={(e) => setCreateForm((s) => ({ ...s, code: e.target.value }))}
                  className="input"
                  placeholder="Ej: 1234-5"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Comuna</label>
                  <input
                    type="text"
                    value={createForm.commune}
                    onChange={(e) => setCreateForm((s) => ({ ...s, commune: e.target.value }))}
                    className="input"
                    placeholder="Ej: Ovalle"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Provincia</label>
                  <input
                    type="text"
                    value={createForm.province}
                    onChange={(e) => setCreateForm((s) => ({ ...s, province: e.target.value }))}
                    className="input"
                    placeholder="Ej: Limarí"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Región</label>
                  <input
                    type="text"
                    value={createForm.region}
                    onChange={(e) => setCreateForm((s) => ({ ...s, region: e.target.value }))}
                    className="input"
                    placeholder="Ej: Coquimbo"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Tipo</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm((s) => ({ ...s, type: e.target.value as any }))}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="LICEO">Liceo</option>
                    <option value="COLEGIO">Colegio</option>
                    <option value="INSTITUTO">Instituto</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setCreating(false); setEditing(null) }}
                  className="btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="btn-primary"
                >
                  {createLoading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
