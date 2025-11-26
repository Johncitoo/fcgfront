import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProgressTracker from '../../components/ProgressTracker'

type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'NEEDS_FIX'
  | 'APPROVED'
  | 'REJECTED'

interface ApplicantMe {
  id: string
  email: string
  first_name?: string
  last_name?: string
}

interface MyApplication {
  id: string
  status: ApplicationStatus
  call: { id: string; code: string; title: string }
  submitted_at?: string | null
  decided_at?: string | null
  notes?: string | null
}

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

export default function ApplicantHome() {
  const [me, setMe] = useState<ApplicantMe | null>(null)
  const [app, setApp] = useState<MyApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem('fcg.access_token') ?? ''
        const headers = { Authorization: `Bearer ${token}` }

        // 1) Traer perfil applicant actual
        const meRes = await fetch(`${API_BASE}/applicants/me`, { headers })
        if (!meRes.ok) throw new Error(await safeError(meRes))
        const meJson = (await meRes.json()) as ApplicantMe
        setMe(meJson)

        // 2) Traer mi postulación activa (convocatoria vigente)
        const appRes = await fetch(`${API_BASE}/applications/my-active`, {
          headers,
        })
        if (!appRes.ok) throw new Error(await safeError(appRes))
        const appJson = (await appRes.json()) as MyApplication
        setApp(appJson)
      } catch (err: any) {
        setError(err.message ?? 'No se pudo cargar tu información')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const fullName =
    (me?.first_name?.trim() || '') +
    (me?.last_name ? ` ${me.last_name.trim()}` : '')

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header mejorado con gradiente sutil */}
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Mi Postulación
              </h1>
              <p className="text-gray-600 text-lg">
                {fullName ? (
                  <>
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Hola, {fullName}
                    </span>
                  </>
                ) : (
                  'Hola'
                )}
              </p>
            </div>
            <Link
              to="/login"
              className="btn btn-ghost text-gray-700 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesión
            </Link>
          </div>
        </header>

        {loading && (
          <div className="card animate-slide-up">
            <div className="card-body flex items-center gap-4">
              <div className="spinner text-sky-600"></div>
              <p className="text-gray-600">Cargando tu información...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error animate-slide-down">
            <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">Error al cargar la información</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Widget de progreso mejorado */}
            {app?.id && (
              <div className="mb-6 animate-slide-up">
                <ProgressTracker applicationId={app.id} />
              </div>
            )}
            
            <div className="grid gap-6 lg:grid-cols-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              {/* Card principal con estado de la postulación */}
              <section className="card lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
                <div className="card-header">
                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {app?.call.title ?? 'Convocatoria'}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        <span>Código: {app?.call.code ?? '—'}</span>
                      </div>
                    </div>
                    <StatusBadge status={app?.status} />
                  </div>
                </div>

                <div className="card-body">
                  <Timeline status={app?.status} />

                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <ActionButtons app={app} />
                  </div>

                  {app?.notes && (
                    <div className="mt-6 p-4 rounded-lg bg-sky-50 border border-sky-100">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-sky-900 mb-1">Notas de la Fundación</h3>
                          <p className="text-sm text-sky-800 whitespace-pre-wrap leading-relaxed">
                            {app.notes}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Sidebar con resumen */}
              <aside className="space-y-6">
                {/* Card de perfil */}
                <div className="card hover:shadow-lg transition-shadow duration-300">
                  <div className="card-body">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {fullName ? fullName.charAt(0).toUpperCase() : me?.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {fullName || 'Postulante'}
                        </h3>
                        <p className="text-sm text-gray-500">Postulante activo</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Correo</p>
                          <p className="text-sm text-gray-900 font-medium break-all">{me?.email}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Estado</p>
                          <InlineStatus status={app?.status} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card de ayuda */}
                <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100 hover:shadow-lg transition-shadow duration-300">
                  <div className="card-body">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="font-semibold text-purple-900">¿Necesitas ayuda?</h3>
                    </div>
                    <p className="text-sm text-purple-800 mb-4">
                      Si tienes dudas sobre el proceso, no dudes en contactarnos.
                    </p>
                    <a
                      href="mailto:contacto@fundacioncarmes.cl"
                      className="btn btn-sm btn-outline text-purple-700 border-purple-300 hover:bg-purple-100 w-full justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Enviar correo
                    </a>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* =========================================
   Componentes de apoyo
   ========================================= */

function ActionButtons({ app }: { app: MyApplication | null }) {
  if (!app) return null

  return (
    <div className="flex flex-wrap gap-3">
      {app.status === 'DRAFT' && (
        <Link
          to={`/applicant/form/${app.id}`}
          className="btn btn-primary flex-1 sm:flex-none justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Completar formulario
        </Link>
      )}

      {app.status === 'NEEDS_FIX' && (
        <>
          <Link
            to={`/applicant/fixes/${app.id}`}
            className="btn btn-warning flex-1 sm:flex-none justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Ver correcciones
          </Link>
          <Link
            to={`/applicant/form/${app.id}`}
            className="btn btn-outline flex-1 sm:flex-none justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar y reenviar
          </Link>
        </>
      )}

      {app.status === 'SUBMITTED' && (
        <div className="alert alert-info">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">Tu postulación fue enviada. Estamos revisando.</p>
        </div>
      )}

      {app.status === 'IN_REVIEW' && (
        <div className="alert alert-info">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <p className="text-sm">En revisión por la Fundación.</p>
        </div>
      )}

      {app.status === 'APPROVED' && (
        <div className="alert alert-success">
          <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold">¡Felicitaciones!</p>
            <p className="text-sm">Tu postulación fue aprobada.</p>
          </div>
        </div>
      )}

      {app.status === 'REJECTED' && (
        <div className="alert alert-error">
          <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-semibold">Postulación no seleccionada</p>
            <p className="text-sm">Tu postulación no fue seleccionada en esta convocatoria.</p>
          </div>
        </div>
      )}
    </div>
  )
}function StatusBadge({ status }: { status?: ApplicationStatus | null }) {
  const statusConfig: Record<ApplicationStatus, { label: string; className: string; icon: React.ReactNode }> = {
    DRAFT: {
      label: 'Borrador',
      className: 'badge-neutral',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
    },
    SUBMITTED: {
      label: 'Enviada',
      className: 'badge-info',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    IN_REVIEW: {
      label: 'En revisión',
      className: 'badge-purple',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
    },
    NEEDS_FIX: {
      label: 'Requiere ajustes',
      className: 'badge-warn',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    },
    APPROVED: {
      label: 'Aprobada',
      className: 'badge-success',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    REJECTED: {
      label: 'Rechazada',
      className: 'badge-error',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    }
  }

  if (!status) {
    return <span className="badge badge-neutral">—</span>
  }

  const config = statusConfig[status]
  return (
    <span className={`badge ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  )
}

function InlineStatus({ status }: { status?: ApplicationStatus | null }) {
  const map: Record<ApplicationStatus, { label: string; color: string }> = {
    DRAFT: { label: 'Borrador', color: 'text-gray-700' },
    SUBMITTED: { label: 'Enviada', color: 'text-sky-700' },
    IN_REVIEW: { label: 'En revisión', color: 'text-purple-700' },
    NEEDS_FIX: { label: 'Requiere ajustes', color: 'text-amber-700' },
    APPROVED: { label: 'Aprobada', color: 'text-emerald-700' },
    REJECTED: { label: 'Rechazada', color: 'text-rose-700' },
  }
  
  if (!status) return <span className="text-gray-500">—</span>
  
  const config = map[status]
  return <span className={`font-medium ${config.color}`}>{config.label}</span>
}

function Timeline({ status }: { status?: ApplicationStatus | null }) {
  const steps: { key: ApplicationStatus; label: string; description: string }[] = [
    { key: 'DRAFT', label: 'Borrador', description: 'Completa el formulario de postulación' },
    { key: 'SUBMITTED', label: 'Enviada', description: 'Postulación recibida correctamente' },
    { key: 'IN_REVIEW', label: 'En revisión', description: 'Estamos evaluando tu postulación' },
    { key: 'NEEDS_FIX', label: 'Requiere ajustes', description: 'Se necesitan correcciones' },
    { key: 'APPROVED', label: 'Aprobada', description: '¡Felicitaciones! Has sido seleccionado' },
    { key: 'REJECTED', label: 'Rechazada', description: 'No fue seleccionada esta vez' },
  ]

  const currentIndex = status ? steps.findIndex((s) => s.key === status) : 0

  return (
    <div className="relative">
      <div className="flex flex-col gap-4">
        {steps.map((step, i) => {
          const done = currentIndex > i
          const active = currentIndex === i
          const upcoming = currentIndex < i

          return (
            <div
              key={step.key}
              className={`flex items-start gap-4 transition-all duration-300 ${
                active ? 'scale-105' : 'scale-100'
              }`}
            >
              {/* Icon */}
              <div className="relative flex-shrink-0">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold text-sm transition-all duration-300 ${
                    done
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : active
                      ? 'bg-sky-600 border-sky-600 text-white shadow-lg shadow-sky-600/30 animate-pulse'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {done ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : active ? (
                    <div className="h-3 w-3 rounded-full bg-white"></div>
                  ) : (
                    i + 1
                  )}
                </div>
                
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div
                    className={`absolute left-1/2 top-10 h-4 w-0.5 -translate-x-1/2 transition-all duration-300 ${
                      done ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className={`font-semibold ${active ? 'text-gray-900' : upcoming ? 'text-gray-500' : 'text-gray-700'}`}>
                  {step.label}
                </div>
                <p className={`text-sm mt-0.5 ${active ? 'text-gray-600 font-medium' : 'text-gray-500'}`}>
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
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
