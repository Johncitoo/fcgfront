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

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

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
  // Login con invitación
  // =========================
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCodeError('')
    setIsLoading(true)

    try {
      const res = await fetch(`${API_BASE}/auth/enter-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: invitationCode.trim() }),
      })

      if (!res.ok) throw new Error('El código no existe o expiró.')

      const data = await res.json()
      localStorage.setItem('fcg.access_token', data.access_token)
      localStorage.setItem('fcg.refresh_token', data.refresh_token)
      localStorage.setItem('fcg.role', 'APPLICANT')

      toast.success('Postulación iniciada exitosamente')
      navigate('/applicant', { replace: true })
    } catch (err: any) {
      setCodeError(err.message ?? 'Error al ingresar el código.')
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

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (!res.ok) throw new Error('Correo o contraseña incorrectos.')

      const data = await res.json()

      localStorage.setItem('fcg.access_token', data.access_token)
      localStorage.setItem('fcg.refresh_token', data.refresh_token)
      localStorage.setItem('fcg.role', data.user.role)

      toast.success('Sesión iniciada correctamente')

      // Redirigir según rol
      const role = data.user.role?.toUpperCase()
      if (role === 'ADMIN') navigate('/admin', { replace: true })
      else if (role === 'REVIEWER') navigate('/reviewer', { replace: true })
      else if (role === 'APPLICANT') navigate('/applicant', { replace: true })
      else navigate('/', { replace: true })
    } catch (err: any) {
      setLoginError(err.message ?? 'Error de autenticación.')
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
                      Ingresa el código de invitación para iniciar tu
                      postulación.
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Ejemplo:</span>
                      <Badge variant="secondary" className="text-xs">
                        CG2025-001
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
                        placeholder="CG2025-XXX"
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
                      ¿Problemas con tu código?{' '}
                      <button
                        type="button"
                        className="text-sky-700 hover:underline"
                        onClick={() =>
                          toast.info('Contacta a soporte: soporte@fcg.org')
                        }
                      >
                        Contacta soporte
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
