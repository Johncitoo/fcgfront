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

      if (editing) {
        await apiPatch(`/institutions/${editing.id}`, createForm)
      } else {
        await apiPost('/institutions', createForm)
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
                setCreateForm({ name: '', code: '', commune: '', province: '', region: '', type: 'LICEO' as 'LICEO' | 'COLEGIO' | 'INSTITUTO' | 'OTRO', email: '', phone: '', address: '', directorName: '', website: '', notes: '' })
                setCreating(true)
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
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
                        <td className="py-2">
                          <button 
                            onClick={() => setViewingDetail(r)} 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-600 hover:text-white hover:bg-sky-600 border border-sky-600 rounded-lg transition-colors"
                            title="Ver detalles completos"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver detalles
                          </button>
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
                <label className="text-sm font-medium flex items-center gap-1.5">
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
                  className="input"
                  placeholder="Ej: 1234-5 (opcional)"
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

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                    className="input"
                    placeholder="contacto@liceo.cl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Teléfono</label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((s) => ({ ...s, phone: e.target.value }))}
                    className="input"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Dirección</label>
                <input
                  type="text"
                  value={createForm.address}
                  onChange={(e) => setCreateForm((s) => ({ ...s, address: e.target.value }))}
                  className="input"
                  placeholder="Calle Principal #123"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nombre del Director</label>
                  <input
                    type="text"
                    value={createForm.directorName}
                    onChange={(e) => setCreateForm((s) => ({ ...s, directorName: e.target.value }))}
                    className="input"
                    placeholder="Juan Pérez González"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Sitio Web</label>
                  <input
                    type="url"
                    value={createForm.website}
                    onChange={(e) => setCreateForm((s) => ({ ...s, website: e.target.value }))}
                    className="input"
                    placeholder="https://www.liceo.cl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Notas</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((s) => ({ ...s, notes: e.target.value }))}
                  className="input min-h-[80px] resize-y"
                  placeholder="Información adicional sobre la institución..."
                />
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

      {/* Modal de Detalles */}
      {viewingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">Detalles de la Institución</h2>
              <button
                onClick={() => setViewingDetail(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Información Principal */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <div className="w-1 h-5 bg-sky-600 rounded"></div>
                  Información Principal
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Nombre</label>
                    <p className="text-sm font-medium">{viewingDetail.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Código RBD</label>
                    <p className="text-sm font-medium">{viewingDetail.code || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Tipo</label>
                    <p className="text-sm font-medium">{viewingDetail.type}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Estado</label>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${viewingDetail.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {viewingDetail.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <div className="w-1 h-5 bg-sky-600 rounded"></div>
                  Ubicación
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Comuna</label>
                    <p className="text-sm font-medium">{viewingDetail.commune || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Provincia</label>
                    <p className="text-sm font-medium">{viewingDetail.province || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500">Región</label>
                    <p className="text-sm font-medium">{viewingDetail.region || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500">Dirección</label>
                    <p className="text-sm font-medium">{viewingDetail.address || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <div className="w-1 h-5 bg-sky-600 rounded"></div>
                  Información de Contacto
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Email</label>
                    <p className="text-sm font-medium">{viewingDetail.email || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Teléfono</label>
                    <p className="text-sm font-medium">{viewingDetail.phone || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Nombre del Director</label>
                    <p className="text-sm font-medium">{viewingDetail.directorName || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Sitio Web</label>
                    {viewingDetail.website ? (
                      <a 
                        href={viewingDetail.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-sky-600 hover:underline"
                      >
                        {viewingDetail.website}
                      </a>
                    ) : (
                      <p className="text-sm font-medium">—</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Notas */}
              {viewingDetail.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <div className="w-1 h-5 bg-sky-600 rounded"></div>
                    Notas
                  </h3>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">
                    {viewingDetail.notes}
                  </p>
                </div>
              )}

              {/* Fechas */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <div className="w-1 h-5 bg-sky-600 rounded"></div>
                  Registro
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Fecha de Creación</label>
                    <p className="text-sm font-medium">
                      {new Date(viewingDetail.createdAt).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Última Actualización</label>
                    <p className="text-sm font-medium">
                      {new Date(viewingDetail.updatedAt).toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex justify-between sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setConfirmDelete(viewingDetail)
                  setDeleteConfirmText('')
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setViewingDetail(null)
                    openEdit(viewingDetail)
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm font-medium"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => setViewingDetail(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cerrar
                </button>
              </div>
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
