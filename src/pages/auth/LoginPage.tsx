import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'
import { PasswordInput } from './PasswordInput'
import { authService } from '@/lib/auth'
import { api } from '@/lib/api'
import { useCallContext } from '@/contexts/CallContext'
import ContactHelpModal from '@/components/ContactHelpModal'

export default function LoginPage() {
  const navigate = useNavigate()
  const { refreshCalls } = useCallContext()
  const [searchParams] = useState(() => new URLSearchParams(window.location.search))

  // Estado pestaña "Postular" - solo código, luego redirige
  const [invitationCode, setInvitationCode] = useState('')
  const [codeEmail, setCodeEmail] = useState('')
  const [codeError, setCodeError] = useState('')

  // Estado pestaña "Acceso"
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const fromSetPassword = searchParams.get('fromSetPassword') === 'true'

  // Estado modal recuperar contraseña
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)

  // Estado modal de ayuda/contacto
  const [showContactModal, setShowContactModal] = useState(false)

  // =========================
  // Login con código de invitación - validación directa
  // =========================
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!invitationCode.trim()) {
      setCodeError('Por favor ingresa tu código de invitación')
      return
    }

    if (!codeEmail.trim()) {
      setCodeError('Por favor ingresa tu email')
      return
    }

    setIsLoading(true)
    setCodeError('')

    try {
      // Validar código directamente
      const response = await api.post('/onboarding/validate-invite', {
        code: invitationCode.trim().toUpperCase(),
        email: codeEmail.trim()
      })

      const { passwordToken, email: validatedEmail, userName } = response.data

      toast.success(`¡Bienvenido/a ${userName}! Ahora crea tu contraseña.`)

      // Redirigir a crear contraseña
      navigate(`/auth/set-password?token=${passwordToken}&email=${encodeURIComponent(validatedEmail)}`)
    } catch (err: any) {
      console.error('❌ Error validando código:', err)
      
      if (err.response?.status === 400) {
        setCodeError('Código inválido o ya utilizado')
      } else if (err.response?.status === 404) {
        setCodeError('Código no encontrado. Verifica que esté correcto.')
      } else {
        setCodeError('Error al validar el código. Por favor intenta nuevamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // =========================
  // Login con correo y clave
  // =========================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setIsLoading(true)

    // DEV: console.log('🔐 Iniciando login con:', { email })

    try {
      let response;
      
      // Intentar primero como APPLICANT
      try {
        response = await authService.loginApplicant(email, password, rememberMe)
        // DEV: console.log('✅ Login exitoso como APPLICANT:', response)
      } catch (applicantErr: any) {
        // Si falla con 401 o 403, intentar como STAFF
        if (applicantErr.response?.status === 401 || applicantErr.response?.status === 403) {
          // DEV: console.log('⚠️ No es APPLICANT, intentando como STAFF...')
          response = await authService.loginStaff(email, password, rememberMe)
          // DEV: console.log('✅ Login exitoso como STAFF:', response)
        } else {
          throw applicantErr
        }
      }

      toast.success(`Bienvenido/a, ${response.user.fullName}`)

      // Si es ADMIN o REVIEWER, cargar convocatorias
      if (response.user.role === 'ADMIN' || response.user.role === 'REVIEWER') {
        // DEV: console.log('🔄 Cargando convocatorias para usuario ADMIN/REVIEWER...')
        await refreshCalls()
      }

      // Redirigir según rol
      if (response.user.role === 'APPLICANT') {
        // DEV: console.log('🚀 Usuario APPLICANT, redirigiendo al primer hito...')
        await redirectToFirstMilestone()
      } else {
        const homeRoute = authService.getHomeRouteByRole(response.user.role)
        // DEV: console.log('🚀 Redirigiendo a:', homeRoute)
        navigate(homeRoute, { replace: true })
      }
    } catch (err: any) {
      console.error('❌ Error en login:', err)
      console.error('Response:', err.response)
      console.error('Message:', err.message)

      if (err.response?.status === 401) {
        setLoginError('Correo o contraseña incorrectos.')
      } else if (err.response?.status === 403) {
        setLoginError('Tu cuenta está inactiva. Contacta al administrador.')
      } else {
        setLoginError('Error al iniciar sesión. Por favor, intenta nuevamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // =========================
  // Redirigir al primer hito disponible
  // =========================
  const redirectToFirstMilestone = async () => {
    try {
      // Obtener la aplicación activa del postulante
      const appResponse = await api.get<{ id: string }>('/applications/my-active')
      const applicationId = appResponse.data.id

      // Obtener los hitos de progreso
      const progressResponse = await api.get<{
        progress: Array<{
          mp_id: string
          status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
          whoCanFill: string
          milestoneStatus: 'ACTIVE' | 'PENDING'
          orderIndex: number
        }>
      }>(`/milestones/progress/${applicationId}`)

      // Buscar el primer hito ACTIVE que sea responsabilidad del APPLICANT, no completado y no rechazado
      const firstMilestone = progressResponse.data.progress
        .filter(m => 
          m.whoCanFill === 'APPLICANT' && 
          m.milestoneStatus === 'ACTIVE' && 
          m.status !== 'COMPLETED' &&
          m.status !== 'REJECTED'
        )
        .sort((a, b) => a.orderIndex - b.orderIndex)[0]

      if (firstMilestone) {
        // Redirigir al primer hito disponible
        // DEV: console.log('✅ Primer hito encontrado:', firstMilestone.mp_id)
        navigate(`/applicant/milestone/${firstMilestone.mp_id}?app=${applicationId}`, { replace: true })
      } else {
        // Si no hay hitos disponibles o todos están completados, ir al dashboard
        // DEV: console.log('⚠️ No hay hitos disponibles, redirigiendo al dashboard')
        navigate('/applicant', { replace: true })
      }
    } catch (error) {
      console.error('❌ Error al obtener hitos:', error)
      // En caso de error, redirigir al dashboard
      navigate('/applicant', { replace: true })
    }
  }

  // =========================
  // Recuperar contraseña
  // =========================
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!forgotEmail.trim()) {
      toast.error('Por favor ingresa tu email')
      return
    }

    setForgotLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail.trim() })
      setForgotSuccess(true)
      toast.success('Email enviado. Revisa tu bandeja de entrada.')
    } catch (error: any) {
      toast.error(error?.message || 'Error al enviar el email')
    } finally {
      setForgotLoading(false)
    }
  }

  // =========================
  // Render
  // =========================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-slate-50 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-40"></div>
      
      <div className="flex min-h-screen items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-[480px] animate-fade-in">
          {/* Header mejorado */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-6 animate-scale-in">
              <img 
                src="/imagen_2025-12-17_102813763.png" 
                alt="Fundación Carmen Goudie" 
                className="w-28 h-28 object-contain drop-shadow-2xl"
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight animate-slide-down" style={{ animationDelay: '0.1s' }}>
              Fundación Carmen Goudie
            </h1>
            <p className="text-base text-slate-300 mt-2 animate-slide-down" style={{ animationDelay: '0.2s' }}>
              Portal de Becas — Ingreso y Postulación
            </p>
          </div>

          <Card className="bg-white/95 backdrop-blur-sm text-slate-900 shadow-2xl border border-slate-200/50 overflow-hidden animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="pb-4 bg-gradient-to-r from-sky-50 to-white border-b">
              <CardTitle className="text-center text-2xl">Acceso al Portal</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="postular" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-gray-100">
                  <TabsTrigger value="postular" className="data-[state=active]:bg-sky-600 data-[state=active]:text-white transition-all">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Postular
                  </TabsTrigger>
                  <TabsTrigger value="acceso" className="data-[state=active]:bg-sky-600 data-[state=active]:text-white transition-all">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Acceso
                  </TabsTrigger>
                </TabsList>

                {/* Pestaña POSTULAR */}
                <TabsContent value="postular" className="space-y-5 animate-fade-in">
                  <div className="p-4 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-lg space-y-2">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          Ingresa tu código de invitación para iniciar tu postulación.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-600">Ejemplo:</span>
                          <Badge variant="secondary" className="text-xs font-mono">
                            TEST-XXXXXXXX
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {codeError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-900">Error</p>
                        <p className="text-sm text-red-700">{codeError}</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleCodeSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="code-email" className="flex items-center gap-2 font-semibold">
                        <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                        Tu correo electrónico
                      </Label>
                      <Input
                        id="code-email"
                        type="email"
                        required
                        value={codeEmail}
                        onChange={(e) => setCodeEmail(e.target.value)}
                        placeholder="tu@email.com"
                        disabled={isLoading}
                        className="input"
                      />
                      <p className="text-xs text-slate-500">El mismo email al que te llegó la invitación</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="invitation-code" className="flex items-center gap-2 font-semibold">
                        <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Código de invitación
                      </Label>
                      <Input
                        id="invitation-code"
                        type="text"
                        required
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                        placeholder="TEST-XXXXXXXX"
                        disabled={isLoading}
                        className="input font-mono"
                      />
                    </div>

                    <Button
                      type="submit"
                      className={`btn btn-primary w-full h-12 text-base font-semibold ${isLoading ? '' : 'hover:scale-102'} transition-transform`}
                      disabled={isLoading || !invitationCode.trim() || !codeEmail.trim()}
                    >
                      {isLoading ? 'Verificando...' : 'Iniciar postulación'}
                    </Button>
                  </form>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>¿No tienes un código? Contacta al administrador para recibir una invitación.</span>
                  </div>
                </TabsContent>

                {/* Pestaña ACCESO */}
                <TabsContent value="acceso" className="space-y-5 animate-fade-in">
                  {fromSetPassword && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-emerald-900">¡Contraseña creada exitosamente!</p>
                        <p className="text-xs text-emerald-700 mt-1">Ahora puedes iniciar sesión con tu email y contraseña.</p>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleLoginSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2 font-semibold">
                        <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Correo electrónico
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        disabled={isLoading}
                        className={`input ${loginError ? 'border-rose-300 focus:ring-rose-500' : ''}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="flex items-center gap-2 font-semibold">
                        <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Contraseña
                      </Label>
                      <PasswordInput
                        value={password}
                        onChange={setPassword}
                        disabled={isLoading}
                        error={!!loginError}
                      />
                    </div>

                    {loginError && (
                      <div className="alert alert-error animate-shake">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Error de autenticación</p>
                          <p className="text-sm mt-1">{loginError}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={(checked) =>
                            setRememberMe(checked as boolean)
                          }
                          disabled={isLoading}
                        />
                        <Label
                          htmlFor="remember"
                          className="text-sm cursor-pointer font-medium"
                        >
                          Recordarme
                        </Label>
                      </div>
                      <button
                        type="button"
                        className="text-sm text-sky-700 hover:text-sky-800 hover:underline font-medium transition-colors"
                        onClick={() => {
                          setForgotEmail(email)
                          setShowForgotModal(true)
                        }}
                      >
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Olvidé mi contraseña
                        </span>
                      </button>
                    </div>

                    <Button
                      type="submit"
                      className={`btn btn-primary w-full h-12 text-base font-semibold ${isLoading ? '' : 'hover:scale-102'} transition-transform`}
                      disabled={isLoading || !email.trim() || !password.trim()}
                    >
                      {isLoading ? (
                        <>
                          <div className="spinner mr-2" />
                          Iniciando sesión...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                          Iniciar sesión
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-6 text-xs text-slate-400">
            © 2025 Fundación Carmen Goudie
          </div>
        </div>
      </div>

      {/* Modal Recuperar Contraseña */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => !forgotLoading && setShowForgotModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            {forgotSuccess ? (
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="bg-green-100 rounded-full p-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Email enviado</h3>
                <p className="text-gray-600 mb-6">
                  Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
                </p>
                <Button
                  onClick={() => {
                    setShowForgotModal(false)
                    setForgotSuccess(false)
                    setForgotEmail('')
                  }}
                  className="w-full"
                >
                  Cerrar
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Recuperar contraseña</h3>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-800 mb-4 font-medium">
                  Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                </p>
                <div className="mb-4">
                  <Label htmlFor="forgotEmail" className="text-gray-900 font-semibold text-sm">Email</Label>
                  <Input
                    id="forgotEmail"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    disabled={forgotLoading}
                    className="mt-1 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForgotModal(false)}
                    disabled={forgotLoading}
                    className="flex-1 text-gray-900 font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail.trim()}
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold"
                  >
                    {forgotLoading ? 'Enviando...' : 'Enviar enlace'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Botón flotante de ayuda */}
      <button
        onClick={() => setShowContactModal(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 flex items-center gap-2 z-50 group"
      >
        <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <span className="font-medium hidden sm:inline">¿Necesitas ayuda?</span>
      </button>

      {/* Modal de contacto/ayuda */}
      <ContactHelpModal isOpen={showContactModal} onClose={() => setShowContactModal(false)} />
    </div>
  )
}
