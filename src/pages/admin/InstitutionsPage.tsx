import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api'
import { Eye, Plus, Edit, X, Info, Trash2, AlertTriangle } from 'lucide-react'

interface Institution {
  id: string
  name: string
  code?: string
  commune?: string
  province?: string
  region?: string
  type: 'LICEO' | 'COLEGIO' | 'INSTITUTO' | 'OTRO'
  active: boolean
  email?: string
  phone?: string
  address?: string
  directorName?: string
  website?: string
  notes?: string
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
  const [viewingDetail, setViewingDetail] = useState<Institution | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Institution | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [createForm, setCreateForm] = useState<{
    name: string
    code: string
    commune: string
    province: string
    region: string
    type: 'LICEO' | 'COLEGIO' | 'INSTITUTO' | 'OTRO'
    email: string
    phone: string
    address: string
    directorName: string
    website: string
    notes: string
  }>({
    name: '',
    code: '',
    commune: '',
    province: '',
    region: '',
    type: 'LICEO',
    email: '',
    phone: '',
    address: '',
    directorName: '',
    website: '',
    notes: '',
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

      // Convertir camelCase a snake_case para el backend
      const payload = {
        name: createForm.name,
        code: createForm.code || undefined,
        commune: createForm.commune || undefined,
        province: createForm.province || undefined,
        region: createForm.region || undefined,
        type: createForm.type,
        email: createForm.email || undefined,
        phone: createForm.phone || undefined,
        address: createForm.address || undefined,
        director_name: createForm.directorName || undefined,
        website: createForm.website || undefined,
        notes: createForm.notes || undefined,
      }

      if (editing) {
        await apiPatch(`/institutions/${editing.id}`, payload)
      } else {
        await apiPost('/institutions', payload)
      }

      setCreating(false)
      setEditing(null)
      setCreateForm({ name: '', code: '', commune: '', province: '', region: '', type: 'LICEO' as 'LICEO' | 'COLEGIO' | 'INSTITUTO' | 'OTRO', email: '', phone: '', address: '', directorName: '', website: '', notes: '' })
      setOffset(0)
      await load()
    } catch (err: any) {
      setCreateError(err.message ?? 'No se pudo guardar la institución')
    } finally {
      setCreateLoading(false)
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
      email: inst.email || '',
      phone: inst.phone || '',
      address: inst.address || '',
      directorName: inst.directorName || '',
      website: inst.website || '',
      notes: inst.notes || '',
    })
    setCreating(true)
  }

  async function toggleInstitutionStatus(inst: Institution) {
    const action = inst.active ? 'desactivar' : 'activar'
    const confirm = window.confirm(
      `¿Estás seguro de que deseas ${action} la institución "${inst.name}"?\n\n` +
      (inst.active 
        ? 'Los postulantes NO podrán seleccionarla en nuevas postulaciones.' 
        : 'Los postulantes PODRÁN seleccionarla en nuevas postulaciones.')
    )
    
    if (!confirm) return

    try {
      await apiPatch(`/institutions/${inst.id}`, { active: !inst.active })
      await load()
    } catch (err: any) {
      alert(`Error al ${action}: ${err.message || 'Error desconocido'}`)
    }
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

        <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <button
              onClick={() => { setOffset(0); load() }}
              className="btn"
            >
              Buscar
            </button>
          </div>

          <button
            onClick={() => {
              setEditing(null)
              setCreateForm({ name: '', code: '', commune: '', province: '', region: '', type: 'LICEO' as 'LICEO' | 'COLEGIO' | 'INSTITUTO' | 'OTRO', email: '', phone: '', address: '', directorName: '', website: '', notes: '' })
              setCreating(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors justify-center"
          >
            <Plus className="w-4 h-4" />
            Nueva institución
          </button>
        </div>

        {loading ? (
          <div className="card p-6">
            <p className="text-slate-600">Cargando…</p>
          </div>
        ) : error ? (
          <div className="card p-6">
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="card p-6">
            <p className="text-center text-slate-500">No hay registros.</p>
          </div>
        ) : (
          <>
            {/* Vista Desktop - Tabla */}
            <div className="hidden lg:block card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <thead className="text-left text-slate-600 bg-slate-100">
                  <tr className="border-b">
                    <th className="py-3 pr-3 font-semibold">Nombre</th>
                    <th className="py-3 pr-3 font-semibold">Código RBD</th>
                    <th className="py-3 pr-3 font-semibold">Comuna</th>
                    <th className="py-3 pr-3 font-semibold">Región</th>
                    <th className="py-3 pr-3 font-semibold">Tipo</th>
                    <th className="py-3 pr-3 font-semibold">Estado</th>
                    <th className="py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 pr-3 font-medium !text-slate-900">{r.name}</td>
                        <td className="py-2 pr-3 !text-slate-700">{r.code || '—'}</td>
                        <td className="py-2 pr-3 !text-slate-700">{r.commune || '—'}</td>
                        <td className="py-2 pr-3 !text-slate-700">{r.region || '—'}</td>
                        <td className="py-2 pr-3 !text-slate-700">{r.type}</td>
                        <td className="py-2 pr-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {r.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setViewingDetail(r)} 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-600 hover:text-white hover:bg-sky-600 border border-sky-600 rounded-lg transition-colors"
                              title="Ver detalles completos"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver detalles
                            </button>
                            <button 
                              onClick={() => toggleInstitutionStatus(r)} 
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${r.active ? 'text-amber-600 hover:text-white hover:bg-amber-600 border border-amber-600' : 'text-green-600 hover:text-white hover:bg-green-600 border border-green-600'}`}
                              title={r.active ? 'Desactivar institución' : 'Activar institución'}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {r.active ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                )}
                              </svg>
                              {r.active ? 'Desactivar' : 'Activar'}
                            </button>
                            <button 
                              onClick={() => { setConfirmDelete(r); setDeleteConfirmText('') }} 
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-600 rounded-lg transition-colors"
                              title="Eliminar institución"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              </div>
            </div>

            {/* Vista Mobile - Cards */}
            <div className="lg:hidden space-y-3">
              {rows.map((r) => (
                <div key={r.id} className="card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold !text-slate-900">{r.name}</h3>
                      {r.code && (
                        <p className="text-xs font-mono !text-slate-600 mt-1">RBD: {r.code}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium flex-shrink-0 ${r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {r.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="!text-slate-600 w-16 flex-shrink-0">Comuna:</span>
                      <span className="!text-slate-900">{r.commune || '—'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="!text-slate-600 w-16 flex-shrink-0">Región:</span>
                      <span className="!text-slate-900">{r.region || '—'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="!text-slate-600 w-16 flex-shrink-0">Tipo:</span>
                      <span className="!text-slate-900">{r.type}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <button 
                      onClick={() => setViewingDetail(r)} 
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-sky-600 hover:text-white hover:bg-sky-600 border border-sky-600 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Ver detalles
                    </button>
                    <button 
                      onClick={() => toggleInstitutionStatus(r)} 
                      className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${r.active ? 'text-amber-600 hover:text-white hover:bg-amber-600 border border-amber-600' : 'text-green-600 hover:text-white hover:bg-green-600 border border-green-600'}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {r.active ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                      {r.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button 
                      onClick={() => { setConfirmDelete(r); setDeleteConfirmText('') }} 
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Paginación */}
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 shadow-lg shadow-sky-500/25">
                  {editing ? <Edit className="w-5 h-5 text-white" /> : <Plus className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editing ? 'Editar institución' : 'Nueva institución'}
                  </h2>
                  <p className="text-sm text-slate-500">Completa la información principal de la institución.</p>
                </div>
              </div>
              <button
                onClick={() => { setCreating(false); setEditing(null) }}
                className="rounded-xl border-2 border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={onCreate} className="px-6 py-5 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {createError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 font-medium">
                  {createError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Nombre *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                  placeholder="Ej: Liceo A-1"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  Código RBD
                  <div className="group relative">
                    <Info className="w-4 h-4 text-slate-400 cursor-help" />
                    <div className="absolute left-0 top-6 z-10 hidden group-hover:block w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg">
                      El RBD (Rol Base de Datos) es el código único asignado por el Ministerio de Educación a cada establecimiento educacional en Chile.
                    </div>
                  </div>
                </label>
                <input
                  type="text"
                  value={createForm.code}
                  onChange={(e) => setCreateForm((s) => ({ ...s, code: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                  placeholder="Ej: 1234-5 (opcional)"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Comuna</label>
                  <input
                    type="text"
                    value={createForm.commune}
                    onChange={(e) => setCreateForm((s) => ({ ...s, commune: e.target.value }))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                    placeholder="Ej: Ovalle"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Provincia</label>
                  <input
                    type="text"
                    value={createForm.province}
                    onChange={(e) => setCreateForm((s) => ({ ...s, province: e.target.value }))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                    placeholder="Ej: Limarí"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Región</label>
                  <input
                    type="text"
                    value={createForm.region}
                    onChange={(e) => setCreateForm((s) => ({ ...s, region: e.target.value }))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                    placeholder="Ej: Coquimbo"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Tipo</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm((s) => ({ ...s, type: e.target.value as any }))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-medium hover:border-slate-300 transition-colors focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                  >
                    <option value="LICEO">Liceo</option>
                    <option value="COLEGIO">Colegio</option>
                    <option value="INSTITUTO">Instituto</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                    placeholder="contacto@liceo.cl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Teléfono</label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((s) => ({ ...s, phone: e.target.value }))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Dirección</label>
                <input
                  type="text"
                  value={createForm.address}
                  onChange={(e) => setCreateForm((s) => ({ ...s, address: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                  placeholder="Calle Principal #123"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Nombre del Director</label>
                  <input
                    type="text"
                    value={createForm.directorName}
                    onChange={(e) => setCreateForm((s) => ({ ...s, directorName: e.target.value }))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                    placeholder="Juan Pérez González"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Sitio Web</label>
                  <input
                    type="url"
                    value={createForm.website}
                    onChange={(e) => setCreateForm((s) => ({ ...s, website: e.target.value }))}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300"
                    placeholder="https://www.liceo.cl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Notas</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((s) => ({ ...s, notes: e.target.value }))}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 hover:border-slate-300 min-h-[100px] resize-y"
                  placeholder="Información adicional sobre la institución..."
                />
              </div>

              <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setCreating(false); setEditing(null) }}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-sky-600 rounded-xl hover:from-sky-600 hover:to-sky-700 transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalles - Diseño Mejorado */}
      {viewingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header con Gradiente */}
            <div className="bg-gradient-to-r from-sky-600 to-blue-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{viewingDetail.name}</h2>
                      <p className="text-sky-100 text-sm mt-0.5">
                        {viewingDetail.type} • {viewingDetail.code ? `RBD: ${viewingDetail.code}` : 'Sin código'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                      viewingDetail.active 
                        ? 'bg-green-500 text-white' 
                        : 'bg-slate-700 text-slate-200'
                    }`}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="3" />
                      </svg>
                      {viewingDetail.active ? 'Institución Activa' : 'Institución Inactiva'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setViewingDetail(null)}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body con Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Ubicación */}
              <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Ubicación Geográfica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Comuna</label>
                    <p className="text-base font-semibold text-slate-900 mt-1">{viewingDetail.commune || '—'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Provincia</label>
                    <p className="text-base font-semibold text-slate-900 mt-1">{viewingDetail.province || '—'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200 md:col-span-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Región</label>
                    <p className="text-base font-semibold text-slate-900 mt-1">{viewingDetail.region || '—'}</p>
                  </div>
                  {viewingDetail.address && (
                    <div className="bg-white rounded-lg p-3 border border-slate-200 md:col-span-2">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Dirección</label>
                      <p className="text-base font-semibold text-slate-900 mt-1">{viewingDetail.address}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contacto */}
              <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Información de Contacto
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {viewingDetail.email && (
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                        Email
                      </label>
                      <a href={`mailto:${viewingDetail.email}`} className="text-base font-semibold text-blue-600 hover:text-blue-700 mt-1 block break-all">
                        {viewingDetail.email}
                      </a>
                    </div>
                  )}
                  {viewingDetail.phone && (
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Teléfono
                      </label>
                      <a href={`tel:${viewingDetail.phone}`} className="text-base font-semibold text-blue-600 hover:text-blue-700 mt-1 block">
                        {viewingDetail.phone}
                      </a>
                    </div>
                  )}
                  {viewingDetail.directorName && (
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Director(a)
                      </label>
                      <p className="text-base font-semibold text-slate-900 mt-1">{viewingDetail.directorName}</p>
                    </div>
                  )}
                  {viewingDetail.website && (
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        Sitio Web
                      </label>
                      <a 
                        href={viewingDetail.website.startsWith('http') ? viewingDetail.website : `https://${viewingDetail.website}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-base font-semibold text-blue-600 hover:text-blue-700 mt-1 block break-all flex items-center gap-1.5"
                      >
                        {viewingDetail.website}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                  {!viewingDetail.email && !viewingDetail.phone && !viewingDetail.directorName && !viewingDetail.website && (
                    <div className="md:col-span-2 text-center py-6">
                      <p className="text-sm text-slate-500">No hay información de contacto registrada</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notas */}
              {viewingDetail.notes && (
                <div className="bg-amber-50 rounded-lg p-5 border border-amber-200">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Notas Adicionales
                  </h3>
                  <div className="bg-white rounded-lg p-4 border border-amber-200">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewingDetail.notes}</p>
                  </div>
                </div>
              )}

              {/* Fechas del Sistema */}
              <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Información del Registro
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fecha de Creación</label>
                    <p className="text-base font-semibold text-slate-900 mt-1">
                      {new Date(viewingDetail.createdAt).toLocaleDateString('es-CL', { 
                        day: '2-digit', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Última Modificación</label>
                    <p className="text-base font-semibold text-slate-900 mt-1">
                      {new Date(viewingDetail.updatedAt).toLocaleDateString('es-CL', { 
                        day: '2-digit', 
                        month: 'long', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer con Botones de Acción */}
            <div className="border-t bg-slate-50 p-4 flex justify-between items-center">
              <button
                onClick={() => setViewingDetail(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  openEdit(viewingDetail)
                  setViewingDetail(null)
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-lg hover:from-sky-700 hover:to-blue-700 transition-all shadow-lg shadow-sky-500/25 text-sm font-medium"
              >
                <Edit className="w-4 h-4" />
                Editar Institución
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Confirmar Eliminación
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Estás por eliminar la institución <strong>"{confirmDelete.name}"</strong>.
                    <br /><br />
                    Esta acción <strong className="text-rose-600">no se puede deshacer</strong> y podría afectar a postulantes asociados.
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Para confirmar, escribe el nombre de la institución:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={confirmDelete.name}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t bg-slate-50 p-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setConfirmDelete(null)
                  setDeleteConfirmText('')
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
            {/* Header */}
            <div className="flex items-center gap-3 border-b p-4 bg-rose-50">
              <AlertTriangle className="w-8 h-8 text-rose-600" />
              <div>
                <h2 className="text-lg font-semibold text-rose-900">¿Eliminar institución?</h2>
                <p className="text-sm text-rose-700">Esta acción no se puede deshacer</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>⚠️ Advertencia:</strong> Estás a punto de eliminar permanentemente la institución:
                </p>
                <p className="text-sm font-bold text-amber-900 mt-2">
                  "{confirmDelete.name}"
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-slate-700">
                  Para confirmar, escribe <strong className="text-rose-600">ELIMINAR</strong> en el campo de abajo:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Escribe ELIMINAR aquí"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
                <p><strong>Consecuencias de eliminar:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Los postulantes asociados perderán la referencia a esta institución</li>
                  <li>No se podrá recuperar la información</li>
                  <li>Se eliminará permanentemente de la base de datos</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setConfirmDelete(null)
                  setDeleteConfirmText('')
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirmText === 'ELIMINAR') {
                    try {
                      await apiDelete(`/institutions/${confirmDelete.id}`)
                      setConfirmDelete(null)
                      setDeleteConfirmText('')
                      setViewingDetail(null)
                      await load()
                    } catch (err: any) {
                      alert(err.message ?? 'Error al eliminar')
                    }
                  }
                }}
                disabled={deleteConfirmText !== 'ELIMINAR'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
