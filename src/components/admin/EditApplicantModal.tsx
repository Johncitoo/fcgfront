import { useState } from 'react'
import { X, Save } from 'lucide-react'
import InstitutionSearchSelector from './InstitutionSearchSelector'

interface Applicant {
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
  applicantId?: string
}

interface Props {
  applicant: Applicant
  onClose: () => void
  onSuccess: () => void
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

/**
 * Modal para editar datos de un postulante.
 * Permite actualizar nombre, RUT, teléfono, fecha nacimiento, dirección, comuna, región e institución.
 * Usa InstitutionSearchSelector para selección de institución.
 * 
 * @param applicant - Datos actuales del postulante a editar
 * @param onClose - Callback al cerrar el modal
 * @param onSuccess - Callback al guardar exitosamente
 * 
 * @example
 * <EditApplicantModal
 *   applicant={selectedApplicant}
 *   onClose={() => setShowEdit(false)}
 *   onSuccess={() => { refetch(); setShowEdit(false); }}
 * />
 */
export default function EditApplicantModal({ applicant, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    first_name: applicant.firstName || '',
    last_name: applicant.lastName || '',
    rut: applicant.rutNumber && applicant.rutDv ? `${applicant.rutNumber}-${applicant.rutDv}` : '',
    phone: applicant.phone || '',
    birth_date: applicant.birthDate || '',
    address: applicant.address || '',
    commune: applicant.commune || '',
    region: applicant.region || '',
    institution_id: '', // Se llenará con el selector
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('fcg.access_token') ?? ''}`,
  }

  function onChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  /**
   * Envía actualización de postulante al backend.
   * Endpoint: PATCH /applicants/:id
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/applicants/${applicant.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Error al actualizar')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al actualizar postulante')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Editar Postulante</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="rounded-md bg-slate-50 border p-3 text-sm text-slate-600">
            <strong>Email:</strong> {applicant.email}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nombres *</label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => onChange('first_name', e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Apellidos *</label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => onChange('last_name', e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">RUT</label>
              <input
                type="text"
                value={form.rut}
                onChange={(e) => onChange('rut', e.target.value)}
                placeholder="12345678-9"
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <InstitutionSearchSelector
                value={form.institution_id}
                onChange={(id) => onChange('institution_id', id)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => onChange('phone', e.target.value)}
                placeholder="+56 9 1234 5678"
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Fecha de Nacimiento</label>
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) => onChange('birth_date', e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Dirección</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => onChange('address', e.target.value)}
                placeholder="Calle, número, depto"
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Comuna</label>
              <input
                type="text"
                value={form.commune}
                onChange={(e) => onChange('commune', e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Región</label>
              <input
                type="text"
                value={form.region}
                onChange={(e) => onChange('region', e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
