import { useEffect, useState } from 'react'
import { useCallContext } from '../../contexts/CallContext'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle,
  AlertCircle
} from 'lucide-react'

interface ApplicationStats {
  draft: number
  submitted: number
  in_review: number
  needs_fix: number
  approved: number
  rejected: number
  total: number
}

interface CallInfo {
  id: string
  name: string
  year: number
  totalSeats: number
}

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

export default function AdminHome() {
  const { selectedCall } = useCallContext()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [appStats, setAppStats] = useState<ApplicationStats>({
    draft: 0,
    submitted: 0,
    in_review: 0,
    needs_fix: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  })
  const [applicantCount, setApplicantCount] = useState(0)
  const [activeCall, setActiveCall] = useState<CallInfo | null>(null)

  useEffect(() => {
    if (selectedCall) {
      setActiveCall(selectedCall)
      loadStats(selectedCall.id)
    } else {
      // Cargar convocatoria activa por defecto
      loadActiveCall()
    }
  }, [selectedCall])

  async function loadActiveCall() {
    try {
      const token = localStorage.getItem('fcg.access_token') ?? ''
      const headers = { Authorization: `Bearer ${token}` }
      
      const res = await fetch(`${API_BASE}/calls?status=OPEN&limit=1`, { headers })
      if (!res.ok) throw new Error('No se pudo cargar convocatoria activa')
      
      const data = await res.json()
      const call = Array.isArray(data) ? data[0] : data.data?.[0]
      
      if (call) {
        setActiveCall(call)
        loadStats(call.id)
      } else {
        setLoading(false)
        setError('No hay convocatoria activa')
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function loadStats(callId: string) {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('fcg.access_token') ?? ''
      const headers = { Authorization: `Bearer ${token}` }

      // Cargar estadísticas de postulaciones por estado
      const [
        draftRes,
        submittedRes,
        inReviewRes,
        needsFixRes,
        approvedRes,
        rejectedRes,
        applicantsRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/applications?status=DRAFT&callId=${callId}&count=1`, { headers }),
        fetch(`${API_BASE}/applications?status=SUBMITTED&callId=${callId}&count=1`, { headers }),
        fetch(`${API_BASE}/applications?status=IN_REVIEW&callId=${callId}&count=1`, { headers }),
        fetch(`${API_BASE}/applications?status=NEEDS_FIX&callId=${callId}&count=1`, { headers }),
        fetch(`${API_BASE}/applications?status=APPROVED&callId=${callId}&count=1`, { headers }),
        fetch(`${API_BASE}/applications?status=REJECTED&callId=${callId}&count=1`, { headers }),
        fetch(`${API_BASE}/applicants?callId=${callId}&count=1`, { headers }),
      ])

      const draft = await extractCount(draftRes)
      const submitted = await extractCount(submittedRes)
      const in_review = await extractCount(inReviewRes)
      const needs_fix = await extractCount(needsFixRes)
      const approved = await extractCount(approvedRes)
      const rejected = await extractCount(rejectedRes)
      const applicants = await extractCount(applicantsRes)

      setAppStats({
        draft,
        submitted,
        in_review,
        needs_fix,
        approved,
        rejected,
        total: draft + submitted + in_review + needs_fix + approved + rejected,
      })
      setApplicantCount(applicants)
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }

  async function extractCount(res: Response): Promise<number> {
    if (!res.ok) return 0
    const data = await res.json()
    return data?.count ?? data?.total ?? 0
  }

  const completionRate = activeCall?.totalSeats 
    ? Math.round((appStats.approved / activeCall.totalSeats) * 100)
    : 0

  const totalActive = appStats.draft + appStats.submitted + appStats.in_review + appStats.needs_fix

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header con información de convocatoria */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Panel de Control</h1>
          {activeCall && (
            <div className="mt-2 flex items-center gap-3">
              <span className="text-lg text-slate-600">
                {activeCall.name} {activeCall.year}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                Activa
              </span>
            </div>
          )}
        </header>

        {loading && (
          <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
            <p className="text-slate-600">Cargando estadísticas...</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
              <div>
                <h3 className="font-semibold text-rose-900">Error</h3>
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && activeCall && (
          <div className="space-y-6">
            {/* Métricas principales */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Postulantes"
                value={applicantCount}
                icon={<Users className="h-6 w-6" />}
                color="blue"
              />
              <StatCard
                title="Postulaciones Totales"
                value={appStats.total}
                icon={<FileText className="h-6 w-6" />}
                color="purple"
              />
              <StatCard
                title="En Proceso"
                value={totalActive}
                icon={<Clock className="h-6 w-6" />}
                color="amber"
              />
              <StatCard
                title="Aprobadas"
                value={appStats.approved}
                icon={<CheckCircle2 className="h-6 w-6" />}
                color="green"
                subtitle={`de ${activeCall.totalSeats} cupos`}
              />
            </div>

            {/* Progreso de cupos */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Progreso de Cupos</h3>
                <span className="text-2xl font-bold text-slate-900">{completionRate}%</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                  style={{ width: `${Math.min(completionRate, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {appStats.approved} de {activeCall.totalSeats} cupos asignados
              </p>
            </div>

            {/* Gráfico de estados */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <BarChart3 className="h-5 w-5" />
                Distribución por Estado
              </h3>
              <div className="space-y-4">
                <StatusBar
                  label="Borrador"
                  count={appStats.draft}
                  total={appStats.total}
                  color="bg-slate-400"
                />
                <StatusBar
                  label="Enviadas"
                  count={appStats.submitted}
                  total={appStats.total}
                  color="bg-blue-500"
                />
                <StatusBar
                  label="En Revisión"
                  count={appStats.in_review}
                  total={appStats.total}
                  color="bg-purple-500"
                />
                <StatusBar
                  label="Requiere Correcciones"
                  count={appStats.needs_fix}
                  total={appStats.total}
                  color="bg-amber-500"
                />
                <StatusBar
                  label="Aprobadas"
                  count={appStats.approved}
                  total={appStats.total}
                  color="bg-green-500"
                />
                <StatusBar
                  label="Rechazadas"
                  count={appStats.rejected}
                  total={appStats.total}
                  color="bg-rose-500"
                />
              </div>
            </div>

            {/* Gráfico de torta simplificado */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Estados Activos
                </h3>
                <div className="space-y-3">
                  <PieItem
                    label="En proceso"
                    value={totalActive}
                    total={appStats.total}
                    color="bg-amber-500"
                  />
                  <PieItem
                    label="Aprobadas"
                    value={appStats.approved}
                    total={appStats.total}
                    color="bg-green-500"
                  />
                  <PieItem
                    label="Rechazadas"
                    value={appStats.rejected}
                    total={appStats.total}
                    color="bg-rose-500"
                  />
                </div>
              </div>

              {/* Indicadores clave */}
              <div className="rounded-lg border bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Indicadores Clave
                </h3>
                <div className="space-y-4">
                  <KPI
                    label="Tasa de Envío"
                    value={applicantCount > 0 ? Math.round((appStats.total / applicantCount) * 100) : 0}
                    suffix="%"
                    description="Postulantes que enviaron formulario"
                  />
                  <KPI
                    label="Tasa de Aprobación"
                    value={appStats.total > 0 ? Math.round((appStats.approved / appStats.total) * 100) : 0}
                    suffix="%"
                    description="Postulaciones aprobadas del total"
                  />
                  <KPI
                    label="En Revisión"
                    value={appStats.in_review}
                    description="Requieren atención inmediata"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============ Componentes auxiliares ============ */

function StatCard({
  title,
  value,
  icon,
  color,
  subtitle,
}: {
  title: string
  value: number
  icon: React.ReactNode
  color: 'blue' | 'purple' | 'amber' | 'green'
  subtitle?: string
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
    green: 'bg-green-100 text-green-600',
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value.toLocaleString()}
          </p>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  )
}

function StatusBar({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-600">
          {count} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function PieItem({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`h-4 w-4 rounded ${color}`} />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-slate-900">{value}</div>
        <div className="text-xs text-slate-500">{percentage}%</div>
      </div>
    </div>
  )
}

function KPI({
  label,
  value,
  suffix = '',
  description,
}: {
  label: string
  value: number
  suffix?: string
  description: string
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {suffix && <span className="text-lg text-slate-600">{suffix}</span>}
      </div>
      <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
    </div>
  )
}
