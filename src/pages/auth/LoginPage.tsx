import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Loader2, AlertCircle, HelpCircle } from 'lucide-react'
import { PasswordInput } from './PasswordInput'
import { authService } from '@/lib/auth'

export default function LoginPage() {
  const navigate = useNavigate()

  // Estado pestaña "Postular"
  const [invitationCode, setInvitationCode] = useState('')
  const [codeError, setCodeError] = useState('')

  // Estado pestaña "Acceso"
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [isLoading, setIsLoading] = useState(false)

  // =========================
  // Login con código de invitación
  // =========================
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCodeError('')
    setIsLoading(true)

    try {
      const response = await authService.loginWithInviteCode(invitationCode)

      toast.success('Postulación iniciada exitosamente')

      // Redirigir a la página del postulante
      const homeRoute = authService.getHomeRouteByRole(response.user.role)
      navigate(homeRoute, { replace: true })
    } catch (err: any) {
      console.error('Error en login con código:', err)

      if (err.response?.status === 404) {
        setCodeError('El código de invitación no existe o ha expirado.')
      } else if (err.response?.status === 400) {
        setCodeError(err.response?.data?.message || 'El código de invitación no es válido.')
      } else if (err.response?.status === 410) {
        setCodeError('El código de invitación ya fue utilizado.')
      } else {
        setCodeError('Error al procesar el código. Por favor, intenta nuevamente.')
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

    console.log('🔐 Iniciando login con:', { email })

    try {
      const response = await authService.loginStaff(email, password)
      
      console.log('✅ Login exitoso:', response)

      toast.success(`Bienvenido/a, ${response.user.fullName}`)

      // Redirigir según rol
      const homeRoute = authService.getHomeRouteByRole(response.user.role)
      console.log('🚀 Redirigiendo a:', homeRoute)
      navigate(homeRoute, { replace: true })
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
  // Render
  // =========================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-slate-50">
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight">
              Fundación Carmen Goudie
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Portal de Becas — Ingreso y Postulación
            </p>
          </div>

          <Card className="bg-white/95 backdrop-blur-sm text-slate-900 shadow-2xl border border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-center">Acceso al Portal</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="postular" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="postular">Postular</TabsTrigger>
                  <TabsTrigger value="acceso">Acceso</TabsTrigger>
                </TabsList>

                {/* Pestaña POSTULAR */}
                <TabsContent value="postular" className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600">
                      Ingresa tu código de invitación para iniciar tu postulación.
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Ejemplo:</span>
                      <Badge variant="secondary" className="text-xs">
                        TEST-XXXXXXXX
                      </Badge>
                    </div>
                  </div>

                  <form onSubmit={handleCodeSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invitation-code">Código de invitación</Label>
                      <Input
                        id="invitation-code"
                        type="text"
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value)}
                        placeholder="TEST-XXXXXXXX"
                        disabled={isLoading}
                        className={codeError ? 'border-rose-300' : ''}
                      />
                      {codeError && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{codeError}</AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || !invitationCode.trim()}
                    >
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Iniciar postulación
                    </Button>
                  </form>

                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
                    <HelpCircle className="h-3 w-3" />
                    <span>
                      ¿No tienes código?{' '}
                      <button
                        type="button"
                        className="text-sky-700 hover:underline"
                        onClick={() =>
                          toast.info('Contacta a tu institución educacional o a soporte@fcg.org')
                        }
                      >
                        Solicitar invitación
                      </button>
                    </span>
                  </div>
                </TabsContent>

                {/* Pestaña ACCESO */}
                <TabsContent value="acceso" className="space-y-4">
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        disabled={isLoading}
                        className={loginError ? 'border-rose-300' : ''}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña</Label>
                      <PasswordInput
                        value={password}
                        onChange={(e) => setPassword(typeof e === 'string' ? e : e.target.value)}
                        disabled={isLoading}
                        error={!!loginError}
                      />
                    </div>

                    {loginError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{loginError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex items-center justify-between">
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
                          className="text-sm cursor-pointer"
                        >
                          Recordarme
                        </Label>
                      </div>
                      <button
                        type="button"
                        className="text-sm text-sky-700 hover:underline"
                        onClick={() =>
                          toast.info('Funcionalidad próximamente disponible')
                        }
                      >
                        Olvidé mi contraseña
                      </button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || !email.trim() || !password.trim()}
                    >
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Ingresar
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
    </div>
  )
}
