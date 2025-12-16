import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { PasswordInput } from './PasswordInput'
import { api } from '@/lib/api'

export default function ResetPasswordWithTokenPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        toast.error('Token inválido o faltante')
        navigate('/auth/login')
        return
      }

      // Validar el token con el backend
      try {
        setIsValidating(true)
        const response = await api.post('/auth/validate-reset-token', { token })
        
        if (!response.data.valid) {
          toast.error('Este enlace ya fue utilizado o ha expirado')
          setTimeout(() => navigate('/auth/login'), 2000)
        }
      } catch (err: any) {
        toast.error('Este enlace no es válido. Solicita uno nuevo.')
        setTimeout(() => navigate('/auth/login'), 2000)
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (!password || !confirmPassword) {
      setError('Por favor completa todos los campos')
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setIsLoading(true)

    try {
      await api.post('/auth/reset-password', {
        token: token,
        newPassword: password,
      })

      setSuccess(true)
      toast.success('¡Contraseña actualizada correctamente!')

      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate('/auth/login')
      }, 3000)
    } catch (err: any) {
      const errorMessage = err?.message || 'Error al restablecer la contraseña'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Mostrar pantalla de carga mientras valida el token
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6 pb-6">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
              </div>
              <p className="text-gray-600">Validando enlace...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="bg-green-100 rounded-full p-4">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Contraseña actualizada!
              </h2>
              <p className="text-gray-600 mb-6">
                Tu contraseña ha sido restablecida correctamente. Serás redirigido al inicio de sesión en unos segundos.
              </p>
              <Button
                onClick={() => navigate('/auth/login')}
                className="w-full bg-sky-600 hover:bg-sky-700"
              >
                Ir al inicio de sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600 text-white font-bold text-lg">
              F
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Fundación Carmen Goudie
              </CardTitle>
              <p className="text-sm text-gray-600">Restablecer contraseña</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-900 font-semibold">
                Nueva contraseña
              </Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={setPassword}
                placeholder="Mínimo 8 caracteres"
                disabled={isLoading}
                required
              />
              <p className="text-xs text-gray-600">
                Debe tener al menos 8 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-900 font-semibold">
                Confirmar contraseña
              </Label>
              <PasswordInput
                id="confirmPassword"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repite tu contraseña"
                disabled={isLoading}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-sky-600 hover:bg-sky-700 text-white font-semibold"
              disabled={isLoading || !password || !confirmPassword}
            >
              {isLoading ? (
                <>
                  <div className="spinner mr-2" />
                  Restableciendo...
                </>
              ) : (
                'Restablecer contraseña'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-sky-700 hover:text-sky-800 hover:underline font-medium"
              >
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
