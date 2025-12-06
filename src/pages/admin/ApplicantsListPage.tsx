import { useEffect, useMemo, useState } from 'react'
import { useCall } from '../../contexts/CallContext'
import { useCallContext } from '../../contexts/CallContext'
import { Mail, Copy, X, CheckCircle2, Send, Eye, Users } from 'lucide-react'
import ApplicantDetailModal from '../../components/admin/ApplicantDetailModal'
import BulkInviteModal from '../../components/admin/BulkInviteModal'

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

interface InviteStatus {
  [applicantId: string]: {
    invited: boolean
    method: 'auto' | 'manual'
    timestamp: string
  }
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
  const { selectedCall } = useCallContext()
  const [rows, setRows] = useState<ApplicantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filtros / paginación simples
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)
  const [meta, setMeta] = useState<PageMeta | null>(null)

  // Modal de invitación
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantRow | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [inviteStatuses, setInviteStatuses] = useState<InviteStatus>({})

  // Modal de detalles del postulante
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null)

  // Modal de envío masivo
  const [bulkInviteOpen, setBulkInviteOpen] = useState(false)

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

  // Función para abrir modal de invitación
  function openInviteModal(applicant: ApplicantRow) {
    if (!selectedCall) {
      alert('Selecciona una convocatoria primero')
      return
    }
    setSelectedApplicant(applicant)
    setInviteModalOpen(true)
    setInviteError(null)
    setInviteSuccess(false)
    setGeneratedCode(null)
    setEmailSubject('')
    setEmailBody('')
  }

  // Función para enviar invitación automática
  async function sendAutoInvite() {
    if (!selectedApplicant || !selectedCall) return

    setInviteLoading(true)
    setInviteError(null)

    try {
      const res = await fetch(`${API_BASE}/invites`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          callId: selectedCall.id,
          firstName: selectedApplicant.firstName,
          lastName: selectedApplicant.lastName,
          email: selectedApplicant.email,
          sendEmail: true,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Error al enviar invitación')
      }

      setInviteSuccess(true)
      setInviteStatuses({
        ...inviteStatuses,
        [selectedApplicant.id]: {
          invited: true,
          method: 'auto',
          timestamp: new Date().toISOString(),
        },
      })

      setTimeout(() => {
        setInviteModalOpen(false)
        setSelectedApplicant(null)
      }, 2000)
    } catch (err: any) {
      setInviteError(err.message || 'Error al enviar invitación')
    } finally {
      setInviteLoading(false)
    }
  }

  // Función para generar código manual
  async function generateManualInvite() {
    if (!selectedApplicant || !selectedCall) return

    setInviteLoading(true)
    setInviteError(null)

    try {
      const res = await fetch(`${API_BASE}/invites`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          callId: selectedCall.id,
          firstName: selectedApplicant.firstName,
          lastName: selectedApplicant.lastName,
          email: selectedApplicant.email,
          sendEmail: false,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Error al generar código')
      }

      const data = await res.json()
      const code = data.code || data.invitationCode

      setGeneratedCode(code)
      
      // Generar asunto y cuerpo del email
      const name = selectedApplicant.firstName && selectedApplicant.lastName
        ? `${selectedApplicant.firstName} ${selectedApplicant.lastName}`
        : selectedApplicant.fullName || 'Postulante'

      const subject = `Invitación para postular - ${selectedCall.name}`
      const inviteUrl = `${window.location.origin}/#/login`
      
      const body = `¡Hola ${name}!

Has sido invitado/a a postular a ${selectedCall.name} de la Fundación Carmen Goudie.

Datos de acceso:
Email: ${selectedApplicant.email}
Código: ${code}

Para postular, entra a: ${inviteUrl}

Instrucciones:
1. Ingresa al portal de postulaciones
2. Introduce tu código de invitación
3. Crea tu contraseña
4. Completa el formulario

¡Te esperamos!

Fundación Carmen Goudie`

      setEmailSubject(subject)
      setEmailBody(body)

      setInviteStatuses({
        ...inviteStatuses,
        [selectedApplicant.id]: {
          invited: true,
          method: 'manual',
          timestamp: new Date().toISOString(),
        },
      })
    } catch (err: any) {
      setInviteError(err.message || 'Error al generar código')
    } finally {
      setInviteLoading(false)
    }
  }

  // Función para copiar al portapapeles
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

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
      // Validar RUT (obligatorio)
      if (!createForm.rut?.trim()) {
        throw new Error('El RUT es obligatorio')
      }

      // Validar formato del RUT (debe tener guión)
      const rutTrimmed = createForm.rut.trim()
      if (!rutTrimmed.includes('-')) {
        throw new Error('El RUT debe tener el formato: 12345678-9')
      }

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
        rut: rutTrimmed, // RUT es obligatorio
      }
      if (createForm.first_name?.trim()) payload.first_name = createForm.first_name.trim()
      if (createForm.last_name?.trim()) payload.last_name = createForm.last_name.trim()
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

          <div className="ml-auto flex gap-2">
            {selectedCall && (
              <button
                onClick={() => setBulkInviteOpen(true)}
                className="rounded-md border border-sky-600 px-3 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50 flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Envío Masivo
              </button>
            )}
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
                    <th className="py-2 pr-3">Creado</th>
                    <th className="py-2 pr-3">Invitación</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500">
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
                      const inviteStatus = inviteStatuses[r.id]
                      
                      return (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="py-2 pr-3 font-medium">{name}</td>
                          <td className="py-2 pr-3 font-mono text-xs">{rut}</td>
                          <td className="py-2 pr-3 text-slate-600">{r.email}</td>
                          <td className="py-2 pr-3">{r.phone || '—'}</td>
                          <td className="py-2 pr-3 text-slate-600">{school}</td>
                          <td className="py-2 pr-3">
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleDateString('es-CL')
                              : '—'}
                          </td>
                          <td className="py-2 pr-3">
                            {inviteStatus ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="text-xs text-green-700">
                                  Invitado ({inviteStatus.method === 'auto' ? 'Email' : 'Manual'})
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => openInviteModal(r)}
                                className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700"
                              >
                                <Send className="w-3 h-3" />
                                Invitar
                              </button>
                            )}
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => {
                                setSelectedApplicantId(r.id)
                                setDetailModalOpen(true)
                              }}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-600 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700"
                            >
                              <Eye className="w-3 h-3" />
                              Ver Detalles
                            </button>
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

      {/* Modal de detalles del postulante */}
      {detailModalOpen && selectedApplicantId && (
        <ApplicantDetailModal
          applicantId={selectedApplicantId}
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false)
            setSelectedApplicantId(null)
          }}
        />
      )}

      {/* Modal de invitación */}
      {inviteModalOpen && selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">
                Invitar a {selectedApplicant.firstName || selectedApplicant.fullName || 'Postulante'}
              </h2>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {!selectedCall ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-900">
                    Selecciona una convocatoria en el menú lateral para continuar.
                  </p>
                </div>
              ) : !inviteSuccess && !generatedCode ? (
                <>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm"><strong>Email:</strong> {selectedApplicant.email}</p>
                    <p className="text-sm"><strong>Convocatoria:</strong> {selectedCall.name}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-3">¿Cómo deseas enviar la invitación?</p>
                    
                    <div className="space-y-3">
                      <button
                        onClick={sendAutoInvite}
                        disabled={inviteLoading}
                        className="w-full flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        <Mail className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Enviar automáticamente por email</div>
                          <p className="text-sm text-slate-600 mt-1">
                            El sistema enviará un correo electrónico con el código de invitación
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={generateManualInvite}
                        disabled={inviteLoading}
                        className="w-full flex items-start gap-3 p-4 border-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        <Copy className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Obtener cuerpo del mensaje (envío manual)</div>
                          <p className="text-sm text-slate-600 mt-1">
                            Se generará el código y verás el asunto y cuerpo del email para copiar
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {inviteError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-900">Error</p>
                      <p className="text-sm text-red-700">{inviteError}</p>
                    </div>
                  )}

                  {inviteLoading && (
                    <div className="text-center py-4">
                      <p className="text-sm text-slate-600">Procesando...</p>
                    </div>
                  )}
                </>
              ) : inviteSuccess && !generatedCode ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">¡Mensaje enviado!</p>
                      <p className="text-sm text-green-700 mt-1">
                        El correo con el código de invitación ha sido enviado a{' '}
                        <strong>{selectedApplicant.email}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              ) : generatedCode ? (
                <div className="space-y-4">
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-sky-600" />
                      <p className="font-medium text-sky-900">Código generado</p>
                    </div>
                    <p className="text-sm text-sky-700">
                      Copia el siguiente contenido y envíalo manualmente por WhatsApp, SMS o el medio que prefieras.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Asunto */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Asunto del correo</label>
                        <button
                          onClick={() => copyToClipboard(emailSubject)}
                          className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar
                        </button>
                      </div>
                      <div className="bg-slate-50 border rounded-lg p-3">
                        <p className="text-sm">{emailSubject}</p>
                      </div>
                    </div>

                    {/* Destinatario */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Correo del destinatario</label>
                        <button
                          onClick={() => copyToClipboard(selectedApplicant.email)}
                          className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar
                        </button>
                      </div>
                      <div className="bg-slate-50 border rounded-lg p-3">
                        <p className="text-sm font-mono">{selectedApplicant.email}</p>
                      </div>
                    </div>

                    {/* Cuerpo del mensaje */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Cuerpo del mensaje</label>
                        <button
                          onClick={() => copyToClipboard(emailBody)}
                          className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar
                        </button>
                      </div>
                      <div className="bg-slate-50 border rounded-lg p-3 max-h-64 overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap font-sans">{emailBody}</pre>
                      </div>
                    </div>

                    {/* Botón para copiar todo */}
                    <button
                      onClick={() => copyToClipboard(`${emailSubject}\n\n${emailBody}`)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                    >
                      <Copy className="w-4 h-4" />
                      Copiar todo (asunto + cuerpo)
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end">
              <button
                onClick={() => setInviteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de envío masivo */}
      {bulkInviteOpen && selectedCall && (
        <BulkInviteModal
          callId={selectedCall.id}
          callName={selectedCall.name}
          onClose={() => setBulkInviteOpen(false)}
          onSuccess={() => {
            load()
          }}
        />
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
