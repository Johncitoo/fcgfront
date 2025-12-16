import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { PasswordInput } from './PasswordInput'
import { authService } from '@/lib/auth'

export default function PortalLoginPage() {
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await authService.loginApplicant(email, password)
      
      toast.success(`Bienvenido/a, ${response.user.fullName}`)
      
      // Redirigir al portal del estudiante
      navigate('/applicant', { replace: true })
    } catch (err: any) {
      console.error('Error en login portal:', err)

      if (err.response?.status === 401) {
        setError('Correo o contraseña incorrectos.')
      } else if (err.response?.status === 403) {
        setError('Tu cuenta está inactiva. Contacta al administrador.')
      } else {
        setError('Error al iniciar sesión. Por favor, intenta nuevamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              Portal Estudiante
            </h1>
            <p className="text-sm text-blue-100 mt-2">
              Fundación Carmen Goudie — Sistema de Becas
            </p>
          </div>

          <Card className="bg-white text-slate-900 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-center">Acceso al Portal</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu.correo@ejemplo.com"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={setPassword}
                    required
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ingresando...
                    </>
                  ) : (
                    'Ingresar'
                  )}
                </Button>

                <div className="text-center text-sm text-slate-600 space-y-2">
                  <p>
                    ¿Olvidaste tu contraseña?{' '}
                    <Link
                      to="/auth/reset-password"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Recuperar
                    </Link>
                  </p>
                  <div className="pt-4 border-t">
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Volver a inicio
                    </Link>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
