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
import { DualEmailQuotaWidget } from '../../components/DualEmailQuotaWidget'

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

interface RegionData {
  region: string
  count: number
}

interface AgeData {
  age_range: string
  count: number
}

interface ContactCompleteness {
  total_applicants: number
  with_email: number
  with_phone: number
  with_address: number
  with_commune: number
  with_region: number
  with_birth_date: number
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
  const [regionData, setRegionData] = useState<RegionData[]>([])
  const [ageData, setAgeData] = useState<AgeData[]>([])
  const [contactData, setContactData] = useState<ContactCompleteness | null>(null)
  const [timelineData, setTimelineData] = useState<TimelineData[]>([])
  const [recentApplications, setRecentApplications] = useState<any[]>([])

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
      
      const res = await fetch(`${API_BASE}/calls?onlyActive=true&limit=1`, { headers })
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
      const [overviewRes, applicantsCountRes, genderRes, institutionsRes, communesRes, regionsRes, ageRes, contactRes, timelineRes, recentAppsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/stats/${callId}/overview`, { headers }),
        fetch(`${API_BASE}/admin/stats/${callId}/applicants-count`, { headers }),
        fetch(`${API_BASE}/admin/stats/${callId}/gender-distribution`, { headers }),
        fetch(`${API_BASE}/admin/stats/${callId}/top-institutions`, { headers }),
        fetch(`${API_BASE}/admin/applicants-stats/${callId}/communes`, { headers }),
        fetch(`${API_BASE}/admin/applicants-stats/${callId}/regions`, { headers }),
        fetch(`${API_BASE}/admin/applicants-stats/${callId}/age-distribution`, { headers }),
        fetch(`${API_BASE}/admin/applicants-stats/${callId}/contact-completeness`, { headers }),
        fetch(`${API_BASE}/admin/stats/${callId}/submission-timeline`, { headers }),
        fetch(`${API_BASE}/admin/applications?limit=5&sortBy=created_at&order=DESC&callId=${callId}`, { headers }),
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

      if (applicantsCountRes.ok) {
        const countData = await applicantsCountRes.json()
        setApplicantCount(parseInt(countData.count) || 0)
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

      if (regionsRes.ok) {
        const regions = await regionsRes.json()
        setRegionData(regions.map((r: any) => ({ region: r.region, count: parseInt(r.count) })))
      }

      if (ageRes.ok) {
        const ages = await ageRes.json()
        setAgeData(ages.map((a: any) => ({ age_range: a.age_range, count: parseInt(a.count) })))
      }

      if (contactRes.ok) {
        const contact = await contactRes.json()
        setContactData(contact)
      }

      if (timelineRes.ok) {
        const timeline = await timelineRes.json()
        setTimelineData(timeline.map((t: any) => ({ 
          submission_date: new Date(t.submission_date).toLocaleDateString('es-CL'), 
          count: parseInt(t.count) 
        })).reverse())
      }

      if (recentAppsRes.ok) {
        const recentApps = await recentAppsRes.json()
        const list = Array.isArray(recentApps) ? recentApps : recentApps.data || []
        setRecentApplications(list)
      }

      setLoading(false)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const completionRate = appStats.total > 0
    ? Math.round((appStats.approved / appStats.total) * 100)
    : 0

  if (!activeCall) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-0 bg-gradient-to-br from-amber-50 to-orange-50 shadow-xl shadow-amber-500/10">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-900">Sin convocatoria</h3>
                <p className="text-sm text-amber-700 mt-2">No hay una convocatoria activa seleccionada. Selecciona una en el menú superior.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-0 shadow-xl">
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 animate-pulse"></div>
                <Activity className="h-8 w-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-slate-700">Cargando estadísticas...</p>
                <p className="text-sm text-slate-500 mt-1">Esto tomará solo un momento</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full border-0 bg-gradient-to-br from-rose-50 to-red-50 shadow-xl shadow-rose-500/10">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-rose-900">Error al cargar</h3>
                <p className="text-sm text-rose-700 mt-2">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-sky-700 bg-clip-text text-transparent">
                Panel de Control
              </h1>
              <p className="mt-2 text-slate-500 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Dashboard administrativo • {activeCall.name}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                <Activity className="h-3.5 w-3.5 animate-pulse" />
                Convocatoria Activa
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* 4 Tarjetas de Métricas Principales */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 animate-slide-up group" style={{ animationDelay: '0.1s' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <CardHeader className="pb-2">
                <CardDescription className="uppercase text-xs font-semibold tracking-wide text-blue-100">Total Postulantes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold">{applicantCount}</div>
                    <p className="text-sm text-blue-100 mt-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      Registrados
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 animate-slide-up group" style={{ animationDelay: '0.2s' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <CardHeader className="pb-2">
                <CardDescription className="uppercase text-xs font-semibold tracking-wide text-purple-100">Postulaciones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold">{appStats.total}</div>
                    <p className="text-sm text-purple-100 mt-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      Total enviadas
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 animate-slide-up group" style={{ animationDelay: '0.3s' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <CardHeader className="pb-2">
                <CardDescription className="uppercase text-xs font-semibold tracking-wide text-amber-100">Pendientes de Revisión</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold">{appStats.in_review}</div>
                    <p className="text-sm text-amber-100 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      En proceso
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Clock className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300 animate-slide-up group" style={{ animationDelay: '0.4s' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <CardHeader className="pb-2">
                <CardDescription className="uppercase text-xs font-semibold tracking-wide text-emerald-100">Becas Aprobadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold">{appStats.approved}</div>
                    <p className="text-sm text-emerald-100 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Becas otorgadas
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Widget de Cuota de Emails */}
          <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <DualEmailQuotaWidget />
          </div>

          {/* Distribución por Estado y Top Instituciones */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow animate-slide-up" style={{ animationDelay: '0.5s' }}>
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-sky-50/50">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-sky-100">
                    <BarChart3 className="h-5 w-5 text-sky-600" />
                  </div>
                  Distribución por Estado
                </CardTitle>
                <CardDescription>Estado actual de las postulaciones</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <StatusBar label="Borrador" count={appStats.draft} total={appStats.total} color="bg-gradient-to-r from-slate-400 to-slate-500" />
                  <StatusBar label="Enviadas" count={appStats.submitted} total={appStats.total} color="bg-gradient-to-r from-blue-400 to-blue-600" />
                  <StatusBar label="En Revisión" count={appStats.in_review} total={appStats.total} color="bg-gradient-to-r from-purple-400 to-purple-600" />
                  <StatusBar label="Requiere Correcciones" count={appStats.needs_fix} total={appStats.total} color="bg-gradient-to-r from-amber-400 to-amber-600" />
                  <StatusBar label="Aprobadas" count={appStats.approved} total={appStats.total} color="bg-gradient-to-r from-emerald-400 to-emerald-600" />
                  <StatusBar label="Rechazadas" count={appStats.rejected} total={appStats.total} color="bg-gradient-to-r from-rose-400 to-rose-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-blue-50/50">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  Top 5 Instituciones
                </CardTitle>
                <CardDescription>Colegios con más postulantes</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {institutionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={institutionData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" />
                      <YAxis dataKey="institution_name" type="category" width={150} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="count" fill="url(#blueGradient)" radius={[0, 8, 8, 0]} />
                      <defs>
                        <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No hay datos disponibles</p>
                    </div>
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
                  Top 10 Comunas
                </CardTitle>
                <CardDescription>Distribución geográfica REAL de postulantes</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {communeData.length > 0 ? (
                  <div className="space-y-2">
                    {communeData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                        <span className="text-sm font-medium text-slate-700">
                          {index + 1}. {item.commune}
                        </span>
                        <span className="text-sm font-bold text-green-600">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-slate-500">
                    <p>No hay datos disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Distribución por Edad y Regiones */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="animate-slide-up" style={{ animationDelay: '0.85s' }}>
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Distribución por Edad
                </CardTitle>
                <CardDescription>Rangos etarios de postulantes</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {ageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ageData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="age_range" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS.blue} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-slate-500">
                    <p>No hay datos de edad disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="animate-slide-up" style={{ animationDelay: '0.9s' }}>
              <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  Regiones con Más Postulantes
                </CardTitle>
                <CardDescription>Distribución por región</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {regionData.length > 0 ? (
                  <div className="space-y-2">
                    {regionData.slice(0, 8).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                        <span className="text-sm font-medium text-slate-700">
                          {index + 1}. {item.region}
                        </span>
                        <span className="text-sm font-bold text-purple-600">{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-slate-500">
                    <p>No hay datos de regiones disponibles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Completitud de Datos de Contacto */}
          {contactData && (
            <Card className="animate-slide-up" style={{ animationDelay: '0.95s' }}>
              <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-orange-50">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-amber-600" />
                  Completitud de Datos de Contacto
                </CardTitle>
                <CardDescription>Porcentaje de postulantes con datos completos</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  <CompletionCard label="Email" count={contactData.with_email} total={contactData.total_applicants} />
                  <CompletionCard label="Teléfono" count={contactData.with_phone} total={contactData.total_applicants} />
                  <CompletionCard label="Dirección" count={contactData.with_address} total={contactData.total_applicants} />
                  <CompletionCard label="Comuna" count={contactData.with_commune} total={contactData.total_applicants} />
                  <CompletionCard label="Región" count={contactData.with_region} total={contactData.total_applicants} />
                  <CompletionCard label="F. Nacimiento" count={contactData.with_birth_date} total={contactData.total_applicants} />
                  <CompletionCard label="Total" count={contactData.total_applicants} total={contactData.total_applicants} isTotal />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline de Envíos */}
          <div className="grid gap-6 lg:grid-cols-1">
            <Card className="animate-slide-up" style={{ animationDelay: '0.9s' }}>
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
                  <p className="text-2xl font-bold text-amber-700">{appStats.approved}</p>
                  <p className="text-xs text-slate-600 mt-1">Becas otorgadas</p>
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

          {/* Últimas Postulaciones */}
          <Card className="animate-slide-up" style={{ animationDelay: '1.2s' }}>
            <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-violet-50">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Últimas Postulaciones
              </CardTitle>
              <CardDescription>Las 5 postulaciones más recientes</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {recentApplications.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Postulante</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Estado</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Fecha</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentApplications.map((app: any) => {
                        const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
                          draft: { label: 'Borrador', variant: 'outline' },
                          submitted: { label: 'Enviada', variant: 'default' },
                          in_review: { label: 'En Revisión', variant: 'secondary' },
                          needs_fix: { label: 'Requiere Correcciones', variant: 'destructive' },
                          approved: { label: 'Aprobada', variant: 'default' },
                          rejected: { label: 'Rechazada', variant: 'destructive' },
                        }
                        const status = statusMap[app.status] || { label: app.status, variant: 'outline' }
                        const formattedDate = new Date(app.created_at).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                        
                        return (
                          <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-900">
                                {app.applicant?.full_name || 'N/A'}
                              </div>
                              <div className="text-xs text-slate-500">
                                {app.applicant?.email || ''}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={status.variant} className={status.variant === 'default' && app.status === 'approved' ? 'bg-green-100 text-green-700 border-green-300' : ''}>
                                {status.label}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600">{formattedDate}</td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => window.location.href = `/admin/applications/${app.id}`}
                                className="text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline"
                              >
                                Ver detalles
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center text-slate-500">
                  <p>No hay postulaciones recientes</p>
                </div>
              )}
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
    <div className="group hover:bg-slate-50/80 p-3 rounded-xl transition-all duration-200 hover:shadow-sm">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
            {label}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-slate-900">{count}</span>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {pct}%
          </span>
        </div>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${color} transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent"></div>
        </div>
      </div>
    </div>
  )
}

interface CompletionCardProps {
  label: string
  count: number
  total: number
  isTotal?: boolean
}

function CompletionCard({ label, count, total, isTotal = false }: CompletionCardProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  const bgColor = isTotal 
    ? 'bg-gradient-to-br from-slate-50 to-slate-100' 
    : percentage >= 80 
      ? 'bg-gradient-to-br from-emerald-50 to-green-50' 
      : percentage >= 50 
        ? 'bg-gradient-to-br from-amber-50 to-orange-50' 
        : 'bg-gradient-to-br from-rose-50 to-red-50'
  const textColor = isTotal 
    ? 'text-slate-700' 
    : percentage >= 80 
      ? 'text-emerald-600' 
      : percentage >= 50 
        ? 'text-amber-600' 
        : 'text-rose-600'
  
  return (
    <div className={`text-center p-4 rounded-xl border border-white/50 ${bgColor} hover:shadow-lg transition-all duration-200 group`}>
      <p className="text-xs font-semibold text-slate-500 uppercase mb-2 group-hover:text-slate-700 transition-colors">{label}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{count}</p>
      {!isTotal && (
        <div className="mt-2">
          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full ${percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
          </div>
          <p className="text-xs text-slate-400 mt-1">{percentage}%</p>
        </div>
      )}
    </div>
  )
}
