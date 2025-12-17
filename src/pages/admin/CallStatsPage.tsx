import { useEffect, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { apiGet } from '../../lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Users, TrendingUp, Calendar, Award, ArrowLeft } from 'lucide-react'

interface CallRow {
  id: string
  code: string
  title: string
  start_date: string
  end_date: string
  status?: string
}

interface OverviewStats {
  total_applications?: number
  submitted?: number
  in_review?: number
  approved?: number
  rejected?: number
  draft?: number
  avg_score?: number
}

interface MilestoneDistribution {
  milestone_id: string
  milestone_name: string
  milestone_order: number
  total_count: number
  approved: number
  rejected: number
  pending: number
}

interface GenderDistribution {
  gender: string
  count: number
}

interface InstitutionData {
  institution_name: string
  count: number
}

interface ScoreDistribution {
  range: string
  count: number
}

interface TimelineData {
  date: string
  count: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c']

export default function CallStatsPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const baseRoute = location.pathname.startsWith('/reviewer') ? '/reviewer' : '/admin'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [call, setCall] = useState<CallRow | null>(null)
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [milestones, setMilestones] = useState<MilestoneDistribution[]>([])
  const [gender, setGender] = useState<GenderDistribution[]>([])
  const [institutions, setInstitutions] = useState<InstitutionData[]>([])
  const [scores, setScores] = useState<ScoreDistribution[]>([])
  const [timeline, setTimeline] = useState<TimelineData[]>([])

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        // Cargar datos en paralelo
        const [
          callData,
          overviewData,
          milestonesData,
          genderData,
          institutionsData,
          scoresData,
          timelineData,
        ] = await Promise.all([
          apiGet<CallRow>(`/calls/${id}`),
          apiGet<OverviewStats>(`/admin/stats/${id}/overview`).catch(() => null),
          apiGet<MilestoneDistribution[]>(`/admin/stats/${id}/milestone-distribution`).catch(() => []),
          apiGet<GenderDistribution[]>(`/admin/stats/${id}/gender-distribution`).catch(() => []),
          apiGet<InstitutionData[]>(`/admin/stats/${id}/top-institutions`).catch(() => []),
          apiGet<ScoreDistribution[]>(`/admin/stats/${id}/score-distribution`).catch(() => []),
          apiGet<TimelineData[]>(`/admin/stats/${id}/submission-timeline`).catch(() => []),
        ])

        setCall(callData)
        setOverview(overviewData)
        setMilestones(milestonesData)
        setGender(genderData)
        setInstitutions(institutionsData.slice(0, 10)) // Top 10
        setScores(scoresData)
        setTimeline(timelineData)
      } catch (e: any) {
        setError(e.message ?? 'No fue posible cargar las estadísticas')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="card">
            <div className="card-body">
              <p className="text-slate-600">Cargando estadísticas...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !call) {
    return (
      <div className="min-h-screen p-4 md:p-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="card border-rose-200">
            <div className="card-body">
              <p className="text-sm text-rose-700">{error || 'No se encontró la convocatoria'}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Calcular tasa de aprobación
  const approvalRate = overview?.submitted && overview.approved
    ? ((overview.approved / overview.submitted) * 100).toFixed(1)
    : '0'

  const rejectionRate = overview?.submitted && overview.rejected
    ? ((overview.rejected / overview.submitted) * 100).toFixed(1)
    : '0'

  return (
    <div className="min-h-screen p-4 md:p-6 bg-slate-50">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to={`${baseRoute}/calls/${id}`} 
            className="inline-flex items-center gap-2 text-sm text-sky-700 hover:underline mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al detalle de la convocatoria
          </Link>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{call.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(call.start_date).toLocaleDateString()} - {new Date(call.end_date).toLocaleDateString()}
                </span>
              </div>
              <div className="font-mono text-slate-500">
                Código: {call.code}
              </div>
            </div>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Total Postulaciones"
            value={overview?.total_applications || 0}
            color="bg-blue-500"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Enviadas"
            value={overview?.submitted || 0}
            color="bg-green-500"
          />
          <StatCard
            icon={<Award className="w-6 h-6" />}
            label="Aprobadas"
            value={overview?.approved || 0}
            color="bg-emerald-500"
            subtitle={`${approvalRate}% de enviadas`}
          />
          <StatCard
            icon={<Award className="w-6 h-6" />}
            label="Rechazadas"
            value={overview?.rejected || 0}
            color="bg-rose-500"
            subtitle={`${rejectionRate}% de enviadas`}
          />
        </div>

        {/* Gráficos principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Distribución por Milestone */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Distribución por Hito</h2>
            {milestones.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={milestones}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="milestone_name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="approved" name="Aprobados" fill="#10b981" />
                  <Bar dataKey="pending" name="Pendientes" fill="#f59e0b" />
                  <Bar dataKey="rejected" name="Rechazados" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">No hay datos de hitos disponibles</p>
            )}
          </div>

          {/* Distribución por Género */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Distribución por Género</h2>
            {gender.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gender as any}
                    dataKey="count"
                    nameKey="gender"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry: any) => `${entry.gender}: ${entry.count}`}
                  >
                    {gender.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">No hay datos de género disponibles</p>
            )}
          </div>
        </div>

        {/* Timeline y más estadísticas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Timeline de envíos */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Timeline de Envíos</h2>
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={12}
                    tickFormatter={(date) => {
                      try {
                        return new Date(date).toLocaleDateString('es-CL', { month: 'short', day: 'numeric' })
                      } catch {
                        return date
                      }
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => {
                      try {
                        return new Date(date).toLocaleDateString('es-CL')
                      } catch {
                        return date
                      }
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    name="Postulaciones" 
                    stroke="#0088FE" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">No hay datos de timeline disponibles</p>
            )}
          </div>

          {/* Distribución de puntajes */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Distribución de Puntajes</h2>
            {scores.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scores}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" fontSize={12} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Postulantes" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">No hay datos de puntajes disponibles</p>
            )}
          </div>
        </div>

        {/* Top Instituciones */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Top 10 Instituciones Educativas</h2>
          {institutions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">#</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Institución</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Postulantes</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">% del Total</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((inst, idx) => {
                    const percentage = overview?.total_applications 
                      ? ((inst.count / overview.total_applications) * 100).toFixed(1)
                      : '0'
                    return (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">{idx + 1}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{inst.institution_name || 'Sin institución'}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">{inst.count}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{percentage}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No hay datos de instituciones disponibles</p>
          )}
        </div>

        {/* Información adicional */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">📊 Acerca de estas estadísticas</p>
          <p>
            Los datos se actualizan en tiempo real basándose en todas las postulaciones de esta convocatoria.
            Las tasas de aprobación se calculan sobre las postulaciones enviadas (no incluye borradores).
          </p>
        </div>
      </div>
    </div>
  )
}

// Componente de tarjeta de estadística
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  color: string
  subtitle?: string
}

function StatCard({ icon, label, value, color, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`${color} text-white rounded-lg p-3`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-600 mb-1">{label}</p>
        <p className="text-3xl font-bold text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
