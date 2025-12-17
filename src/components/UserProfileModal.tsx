import { useEffect, useState } from 'react'
import { apiGet } from '../lib/api'

interface UserProfile {
  id: string
  email: string
  fullName: string | null
  role: 'ADMIN' | 'REVIEWER' | 'APPLICANT'
  createdAt: string
  lastLoginAt: string | null
  isActive: boolean
  applicantId: string | null
}

interface UserProfileModalProps {
  userId: string
  onClose: () => void
}

export default function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        const data = await apiGet<UserProfile>(`/admin/users/${userId}`)
        setProfile(data)
      } catch (e: any) {
        setError(e.message ?? 'No se pudo cargar el perfil')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [userId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-800">Perfil de Usuario</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {loading ? (
            <p className="text-center text-slate-600">Cargando perfil...</p>
          ) : error ? (
            <p className="text-center text-rose-600">{error}</p>
          ) : profile ? (
            <div className="space-y-6">
              {/* Información básica */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Información General
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Nombre completo</label>
                    <p className="text-sm font-medium text-slate-800">
                      {profile.fullName || <span className="italic text-slate-400">Sin nombre</span>}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Email</label>
                    <p className="text-sm font-medium text-slate-800">{profile.email}</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Rol</label>
                    <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
                      {profile.role === 'ADMIN' ? 'Administrador' : profile.role === 'REVIEWER' ? 'Revisor' : 'Postulante'}
                    </span>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Estado</label>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        profile.isActive ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {profile.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">ID de Usuario</label>
                    <p className="text-xs font-mono text-slate-600">{profile.id}</p>
                  </div>
                  {profile.applicantId && (
                    <div>
                      <label className="mb-1 block text-xs text-slate-500">ID de Postulante</label>
                      <p className="text-xs font-mono text-slate-600">{profile.applicantId}</p>
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Fecha de registro</label>
                    <p className="text-sm text-slate-700">
                      {new Date(profile.createdAt).toLocaleString('es-CL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Último inicio de sesión</label>
                    <p className="text-sm text-slate-700">
                      {profile.lastLoginAt ? (
                        new Date(profile.lastLoginAt).toLocaleString('es-CL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      ) : (
                        <span className="italic text-slate-400">Nunca</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>


            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
