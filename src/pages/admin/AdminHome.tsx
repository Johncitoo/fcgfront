import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

interface Stat {
  label: string
  value: number | string
  hint?: string
}

type CountPayload = { count: number } | { total: number } | Record<string, any>

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

export default function AdminHome() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<Stat[]>([
    { label: 'Postulantes', value: '—' },
    { label: 'Convocatorias activas', value: '—' },
    { label: 'Enviadas (SUBMITTED)', value: '—' },
    { label: 'En revisión (IN_REVIEW)', value: '—' },
  ])

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const token = localStorage.getItem('fcg.access_token') ?? ''
        const headers = { Authorization: `Bearer ${token}` }

        // Ajusta estas rutas a las reales del backend si difieren.
        const [applicantsRes, callsRes, submittedRes, reviewingRes] =
          await Promise.all([
            fetch(`${API_BASE}/applicants?limit=1&count=1`, { headers }),
            fetch(`${API_BASE}/calls?onlyActive=true&count=1`, { headers }),
            fetch(`${API_BASE}/applications?status=SUBMITTED&count=1`, {
              headers,
            }),
            fetch(`${API_BASE}/applications?status=IN_REVIEW&count=1`, {
              headers,
            }),
          ])

        if (!applicantsRes.ok) throw new Error(await safeError(applicantsRes))
        if (!callsRes.ok) throw new Error(await safeError(callsRes))
        if (!submittedRes.ok) throw new Error(await safeError(submittedRes))
        if (!reviewingRes.ok) throw new Error(await safeError(reviewingRes))

        const applicantsJson = (await applicantsRes.json()) as CountPayload
        const callsJson = (await callsRes.json()) as CountPayload
        const submittedJson = (await submittedRes.json()) as CountPayload
        const reviewingJson = (await reviewingRes.json()) as CountPayload

        setStats([
          { label: 'Postulantes', value: formatCount(applicantsJson) },
          { label: 'Convocatorias activas', value: formatCount(callsJson) },
          { label: 'Enviadas (SUBMITTED)', value: formatCount(submittedJson) },
          { label: 'En revisión (IN_REVIEW)', value: formatCount(reviewingJson) },
        ])
      } catch (err: any) {
        setError(err.message ?? 'No se pudieron cargar las métricas')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">Panel de administración</h1>
          <p className="text-slate-600">
            Accede a la gestión de postulantes, convocatorias, invitaciones, formularios, correos y auditorías.
          </p>
        </header>

        {/* Estado de carga / error */}
        {loading && (
          <div className="card mb-6">
            <div className="card-body">
              <p className="text-slate-600">Cargando…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="card mb-6 border-rose-200">
            <div className="card-body">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {/* Métricas rápidas */}
        {!loading && !error && (
          <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="card">
                <div className="card-body">
                  <div className="text-sm text-slate-500">{s.label}</div>
                  <div className="mt-1 text-2xl font-semibold">{s.value}</div>
                  {s.hint && (
                    <div className="mt-1 text-xs text-slate-500">{s.hint}</div>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Accesos rápidos */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <QuickCard
            title="Convocatorias"
            desc="Crea, edita y clona convocatorias anuales. Cada convocatoria mantiene sus propios datos."
            to="/admin/calls"
            cta="Abrir convocatorias"
          />
          <QuickCard
            title="Postulantes"
            desc="Ingreso manual y listado de estudiantes. Búsqueda por nombre o correo."
            to="/admin/applicants"
            cta="Gestionar postulantes"
          />
          <QuickCard
            title="Invitaciones"
            desc="Genera códigos por convocatoria y envíalos por correo. Registra si fueron usados."
            to="/admin/invites"
            cta="Gestionar invitaciones"
          />
          <QuickCard
            title="Diseñador de formularios"
            desc="Define secciones y campos por convocatoria. Clona desde años anteriores."
            to="/admin/forms"
            cta="Abrir builder"
          />
          <QuickCard
            title="Correo (próximo)"
            desc="Plantillas de email, envíos masivos y registro de entregas."
            to="/admin/email"
            cta="Ver módulo"
            disabled
          />
          <QuickCard
            title="Auditoría (próximo)"
            desc="Registro inmutable de acciones: quién hizo qué y cuándo."
            to="/admin/audit"
            cta="Ver auditoría"
            disabled
          />
        </section>
      </div>
    </div>
  )
}

/* ============ utilidades ============ */

function formatCount(v: unknown) {
  const n =
    typeof v === 'number'
      ? v
      : typeof (v as any)?.count === 'number'
      ? (v as any).count
      : typeof (v as any)?.total === 'number'
      ? (v as any).total
      : null
  return n === null ? '—' : new Intl.NumberFormat().format(n)
}

async function safeError(res: Response) {
  try {
    const data = await res.json()
    return data?.message || data?.error || res.statusText
  } catch {
    return res.statusText
  }
}

/* ============ componente ============ */

function QuickCard({
  title,
  desc,
  to,
  cta,
  disabled,
}: {
  title: string
  desc: string
  to: string
  cta: string
  disabled?: boolean
}) {
  return (
    <div className="card">
      <div className="card-body">
        <h2 className="mb-1 text-lg font-semibold">{title}</h2>
        <p className="mb-4 text-sm text-slate-600">{desc}</p>

        {disabled ? (
          <button
            disabled
            className="rounded-md border px-3 py-2 text-sm font-medium opacity-50"
            title="Disponible próximamente"
          >
            {cta}
          </button>
        ) : (
          <Link
            to={to}
            className="inline-block rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            {cta}
          </Link>
        )}
      </div>
    </div>
  )
}
