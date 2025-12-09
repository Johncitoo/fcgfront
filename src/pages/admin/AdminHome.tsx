import { useEffect, useState } from 'react'
import { useCallContext } from '../../contexts/CallContext'
import { 
  BarChart3, 
  Users, 
  FileText, 
  CheckCircle2, 
  Clock,
  AlertCircle,
  TrendingUp,
  Activity,
  Calendar,
  ArrowUpRight,
  MapPin,
  Building2,
  PieChart as PieChartIcon
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts'

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

interface GenderData {
  gender: string
  count: number
}

interface InstitutionData {
  institution_name: string
  count: number
}

interface CommuneData {
  commune: string
  count: number
}

interface ScoreData {
  score_range: string
  count: number
}

interface TimelineData {
  submission_date: string
  count: number
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

const COLORS = {
  blue: '#3b82f6',
  purple: '#a855f7',
  amber: '#f59e0b',
  green: '#10b981',
  rose: '#f43f5e',
  slate: '#64748b',
  sky: '#0ea5e9',
  pink: '#ec4899',
  indigo: '#6366f1',
}

const PIE_COLORS = [COLORS.blue, COLORS.purple, COLORS.amber, COLORS.green, COLORS.rose, COLORS.pink, COLORS.indigo]

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
  const [genderData, setGenderData] = useState<GenderData[]>([])
  const [institutionData, setInstitutionData] = useState<InstitutionData[]>([])
  const [communeData, setCommuneData] = useState<CommuneData[]>([])
  const [scoreData, setScoreData] = useState<ScoreData[]>([])
  const [timelineData, setTimelineData] = useState<TimelineData[]>([])

  useEffect(() => {
    if (selectedCall) {
      setActiveCall({
        id: selectedCall.id,
        name: selectedCall.name,
        year: selectedCall.year,
        totalSeats: (selectedCall as any).total_seats || (selectedCall as any).totalSeats || 0
      })
      loadAllStats(selectedCall.id)
    } else {
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
        setActiveCall({
          id: call.id,
          name: call.name,
          year: call.year,
          totalSeats: call.total_seats || call.totalSeats || 0
        })
        loadAllStats(call.id)
      } else {
        setLoading(false)
        setError('No hay convocatoria activa')
      }
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function loadAllStats(callId: string) {
    try {
      const token = localStorage.getItem('fcg.access_token') ?? ''
      const headers = { Authorization: `Bearer ${token}` }

      // Cargar todas las estadísticas en paralelo
      const [overviewRes, applicantsRes, genderRes, institutionsRes, communesRes, scoresRes, timelineRes] = await Promise.all([
        fetch(`${API_BASE}/admin/stats/${callId}/overview`, { headers }),
        fetch(`${API_BASE}/applicants?limit=99999`, { headers }),
        fetch(`${API_BASE}/admin/stats/${callId}/gender-distribution`, { headers }),
        fetch(`${API_BASE}/admin/stats/${callId}/top-institutions`, { headers }),
        fetch(`${API_BASE}/admin/stats/${callId}/top-communes`, { headers }),
        fetch(`${API_BASE}/admin/stats/${callId}/score-distribution`, { headers }),
        fetch(`${API_BASE}/admin/stats/${callId}/submission-timeline`, { headers }),
      ])

      if (overviewRes.ok) {
        const overview = await overviewRes.json()
        setAppStats({
          draft: parseInt(overview.draft) || 0,
          submitted: parseInt(overview.submitted) || 0,
          in_review: parseInt(overview.in_review) || 0,
          needs_fix: parseInt(overview.needs_fix) || 0,
          approved: parseInt(overview.approved) || 0,
          rejected: parseInt(overview.rejected) || 0,
          total: parseInt(overview.total) || 0,
        })
      }

      if (applicantsRes.ok) {
        const applicantsData = await applicantsRes.json()
        const list = Array.isArray(applicantsData) ? applicantsData : applicantsData.data || []
        setApplicantCount(list.length)
      }

      if (genderRes.ok) {
        const gender = await genderRes.json()
        setGenderData(gender.map((g: any) => ({ gender: g.gender, count: parseInt(g.count) })))
      }

      if (institutionsRes.ok) {
        const institutions = await institutionsRes.json()
        setInstitutionData(institutions.map((i: any) => ({ 
          institution_name: i.institution_name, 
          count: parseInt(i.count) 
        })))
      }

      if (communesRes.ok) {
        const communes = await communesRes.json()
        setCommuneData(communes.map((c: any) => ({ commune: c.commune, count: parseInt(c.count) })))
      }

      if (scoresRes.ok) {
        const scores = await scoresRes.json()
        setScoreData(scores.map((s: any) => ({ score_range: s.score_range, count: parseInt(s.count) })))
      }

      if (timelineRes.ok) {
        const timeline = await timelineRes.json()
        setTimelineData(timeline.map((t: any) => ({ 
          submission_date: new Date(t.submission_date).toLocaleDateString('es-CL'), 
          count: parseInt(t.count) 
        })).reverse())
      }

      setLoading(false)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const completionRate = activeCall?.totalSeats
    ? Math.round((appStats.approved / activeCall.totalSeats) * 100)
    : 0

  if (!activeCall) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
        <Card className="border-amber-200 bg-amber-50 p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-amber-100 p-3">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">Sin convocatoria</h3>
              <p className="text-sm text-amber-700">No hay una convocatoria activa seleccionada</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
        <Card className="p-12">
          <div className="flex flex-col items-center gap-4">
            <Activity className="h-12 w-12 animate-spin text-sky-600" />
            <p className="mt-4 text-lg font-semibold text-slate-700">Cargando estadísticas...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
        <Card className="border-rose-200 bg-rose-50 p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-rose-100 p-3">
              <AlertCircle className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <h3 className="font-semibold text-rose-900">Error al cargar</h3>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-sky-700 bg-clip-text text-transparent">
                Panel de Control
              </h1>
              <p className="mt-1 text-slate-600">Dashboard administrativo - {activeCall.name}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1.5 bg-green-100 text-green-700 border-green-300">
                <Activity className="h-3 w-3 animate-pulse" />
                Convocatoria Activa
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {activeCall.totalSeats} cupos
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* 4 Tarjetas de Métricas Principales */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="pb-3">
                <CardDescription className="uppercase text-xs font-semibold tracking-wide">Total Postulantes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">{applicantCount}</div>
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      Registrados
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="pb-3">
                <CardDescription className="uppercase text-xs font-semibold tracking-wide">Postulaciones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">{appStats.total}</div>
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      Total enviadas
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <CardHeader className="pb-3">
                <CardDescription className="uppercase text-xs font-semibold tracking-wide">Pendientes de Revisión</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">{appStats.in_review}</div>
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      En proceso
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <CardHeader className="pb-3">
                <CardDescription className="uppercase text-xs font-semibold tracking-wide">Becas Aprobadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">{appStats.approved}</div>
                    <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      de {activeCall.totalSeats} cupos
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distribución por Estado y Top Instituciones */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
              <CardHeader className="border-b bg-slate-50/50">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-sky-600" />
                  Distribución por Estado
                </CardTitle>
                <CardDescription>Estado actual de las postulaciones</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-5">
                  <StatusBar label="Borrador" count={appStats.draft} total={appStats.total} color="bg-slate-400" />
                  <StatusBar label="Enviadas" count={appStats.submitted} total={appStats.total} color="bg-blue-500" />
                  <StatusBar label="En Revisión" count={appStats.in_review} total={appStats.total} color="bg-purple-500" />
                  <StatusBar label="Requiere Correcciones" count={appStats.needs_fix} total={appStats.total} color="bg-amber-500" />
                  <StatusBar label="Aprobadas" count={appStats.approved} total={appStats.total} color="bg-green-500" />
                  <StatusBar label="Rechazadas" count={appStats.rejected} total={appStats.total} color="bg-rose-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <CardHeader className="border-b bg-slate-50/50">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-sky-600" />
                  Top 5 Instituciones
                </CardTitle>
                <CardDescription>Colegios con más postulantes</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {institutionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={institutionData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="institution_name" type="category" width={150} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS.blue} radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-slate-500">
                    <p>No hay datos disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Distribución por Género y Top Comunas */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="animate-slide-up" style={{ animationDelay: '0.7s' }}>
              <CardHeader className="border-b bg-gradient-to-r from-pink-50 to-purple-50">
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-purple-600" />
                  Distribución por Género
                </CardTitle>
                <CardDescription>Postulantes por género</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {genderData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={genderData as any}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.gender}: ${(entry.percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {genderData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-slate-500">
                    <p>No hay datos disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="animate-slide-up" style={{ animationDelay: '0.8s' }}>
              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Top 5 Comunas
                </CardTitle>
                <CardDescription>Distribución geográfica de postulantes</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {communeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={communeData as any}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.commune}: ${(entry.percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {communeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-slate-500">
                    <p>No hay datos disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Distribución por Puntaje y Timeline */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="animate-slide-up" style={{ animationDelay: '0.9s' }}>
              <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-orange-50">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                  Distribución por Puntaje
                </CardTitle>
                <CardDescription>Rangos de puntuación</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {scoreData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={scoreData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="score_range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS.amber} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-slate-500">
                    <p>No hay datos de puntajes disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="animate-slide-up" style={{ animationDelay: '1s' }}>
              <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-sky-600" />
                  Timeline de Envíos
                </CardTitle>
                <CardDescription>Últimos 30 días</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {timelineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="submission_date" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke={COLORS.sky} strokeWidth={2} dot={{ fill: COLORS.sky }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-slate-500">
                    <p>No hay datos de envíos disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Métricas de Conversión */}
          <Card className="animate-slide-up" style={{ animationDelay: '1.1s' }}>
            <CardHeader className="border-b bg-gradient-to-r from-sky-50 to-blue-50">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-sky-600" />
                Métricas de Conversión
              </CardTitle>
              <CardDescription>Indicadores clave de rendimiento</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border-l-4 border-l-sky-500 bg-sky-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-sky-900 uppercase tracking-wide">Tasa de Envío</p>
                    <Badge variant="outline" className="bg-white">
                      {applicantCount > 0 ? Math.round((appStats.total / applicantCount) * 100) : 0}%
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-sky-700">{appStats.total} / {applicantCount}</p>
                  <p className="text-xs text-slate-600 mt-1">Postulantes que enviaron</p>
                </div>

                <div className="p-4 rounded-lg border-l-4 border-l-green-500 bg-green-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-green-900 uppercase tracking-wide">Tasa de Aprobación</p>
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      {appStats.total > 0 ? Math.round((appStats.approved / appStats.total) * 100) : 0}%
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{appStats.approved} / {appStats.total}</p>
                  <p className="text-xs text-slate-600 mt-1">Postulaciones aprobadas</p>
                </div>

                <div className="p-4 rounded-lg border-l-4 border-l-amber-500 bg-amber-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-amber-900 uppercase tracking-wide">Completitud</p>
                    <Badge variant="outline" className="bg-white border-amber-300 text-amber-700">
                      {completionRate}%
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">{appStats.approved} / {activeCall.totalSeats}</p>
                  <p className="text-xs text-slate-600 mt-1">Cupos asignados</p>
                </div>

                <div className="p-4 rounded-lg border-l-4 border-l-purple-500 bg-purple-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-purple-900 uppercase tracking-wide">En Revisión</p>
                    <Badge variant="outline" className="bg-white border-purple-300 text-purple-700">
                      Activas
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">{appStats.in_review}</p>
                  <p className="text-xs text-slate-600 mt-1">Requieren atención</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ============ Componentes auxiliares ============ */

interface StatusBarProps {
  label: string
  count: number
  total: number
  color: string
  icon?: string
}

function StatusBar({ label, count, total, color, icon }: StatusBarProps) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
  return (
    <div className="group hover:bg-slate-50 p-3 rounded-lg transition-colors">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-slate-900">{count}</span>
          <span className="text-xs text-slate-500">({pct}%)</span>
        </div>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-slate-200 shadow-inner">
        <div
          className={`h-full ${color} transition-all duration-700 ease-out shadow-sm`}
          style={{ width: `${pct}%` }}
        >
          <div className="h-full w-full bg-gradient-to-r from-white/30 to-transparent"></div>
        </div>
      </div>
    </div>
  )
}
