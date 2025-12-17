import { useState } from 'react'
import { UserPlus, Shield, AlertCircle, CheckCircle2 } from 'lucide-react'
import { apiPost } from '../../lib/api'

/**
 * Página de administración de usuarios admin.
 * 
 * Permite a administradores crear nuevos usuarios con rol ADMIN
 * mediante un proceso de verificación 2FA por email.
 * 
 * Flujo:
 * 1. Admin completa formulario con datos del nuevo admin
 * 2. Sistema envía código de 6 dígitos al email del admin logueado
 * 3. Admin ingresa código de verificación
 * 4. Sistema crea nuevo usuario admin
 * 
 * Seguridad:
 * - Solo usuarios ADMIN pueden acceder
 * - Verificación 2FA obligatoria
 * - Códigos expiran en 10 minutos
 * 
 * @route /admin/user-management
 */
export default function UserManagementPage() {
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
  })
  
  const [verificationCode, setVerificationCode] = useState('')

  /**
   * Envía solicitud de creación de admin.
   * Genera código 2FA y lo envía por email.
   */
  async function handleRequestCreation(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      // Validaciones básicas
      if (!formData.email || !formData.fullName) {
        throw new Error('Todos los campos son obligatorios')
      }

      // Generar contraseña automática
      const generatedPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).toUpperCase().slice(-4) + '!@#';

      await apiPost('/admin/users/request', {
        email: formData.email,
        fullName: formData.fullName,
        password: generatedPassword,
      })

      setStep('verify')
      setSuccess('Código de verificación enviado a tu email. Revisa tu bandeja de entrada.')
    } catch (err: any) {
      setError(err.message || 'Error al solicitar creación de admin')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Confirma creación con código de verificación.
   */
  async function handleConfirmCreation(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (verificationCode.length !== 6) {
        throw new Error('El código debe tener 6 dígitos')
      }

      const res = await apiPost('/admin/users/confirm', {
        code: verificationCode,
      }) as { user: { email: string } }

      setSuccess(`Usuario admin creado exitosamente: ${res.user.email}`)
      
      // Limpiar formulario después de 2 segundos
      setTimeout(() => {
        setFormData({
          email: '',
          fullName: '',
        })
        setVerificationCode('')
        setStep('form')
        setSuccess(null)
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Error al confirmar creación de admin')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Cancela el proceso y vuelve al formulario.
   */
  function handleCancel() {
    setStep('form')
    setVerificationCode('')
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-slate-50">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-sky-600" />
            <h1 className="text-2xl font-semibold text-slate-900">Gestión de Administradores</h1>
          </div>
          <p className="text-slate-600">
            Crea nuevos usuarios con rol de administrador mediante verificación 2FA.
          </p>
        </header>

        {/* Alertas */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-900">Error</p>
              <p className="text-sm text-rose-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-900">Éxito</p>
              <p className="text-sm text-emerald-700 mt-1">{success}</p>
            </div>
          </div>
        )}

        {/* Card principal */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          {step === 'form' ? (
            /* Formulario de creación */
            <form onSubmit={handleRequestCreation} className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-sky-700 font-medium mb-4">
                <UserPlus className="w-5 h-5" />
                <span>Nuevo Administrador</span>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(s => ({ ...s, email: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="admin@fundacion.cl"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Nombre Completo *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData(s => ({ ...s, fullName: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="María González"
                  required
                  disabled={loading}
                />
              </div>

              <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs font-medium text-blue-900 mb-1">ℹ️ Contraseña automática</p>
                <p className="text-xs text-blue-700">
                  Se generará automáticamente una contraseña segura. Las credenciales se enviarán por email al nuevo administrador.
                </p>
              </div>

              <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs font-medium text-amber-900 mb-1">Proceso de verificación</p>
                <p className="text-xs text-amber-700">
                  Al continuar, recibirás un código de 6 dígitos en tu email para confirmar la creación.
                  El código expira en 10 minutos.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Solicitar Creación
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Formulario de verificación */
            <form onSubmit={handleConfirmCreation} className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 font-medium mb-4">
                <Shield className="w-5 h-5" />
                <span>Verificación de Seguridad</span>
              </div>

              <div className="rounded-md bg-sky-50 border border-sky-200 p-4">
                <p className="text-sm font-medium text-sky-900 mb-2">
                  Código enviado a tu email
                </p>
                <p className="text-sm text-sky-700">
                  Revisa tu bandeja de entrada y copia el código de 6 dígitos.
                  Si no lo encuentras, verifica la carpeta de spam.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Código de Verificación *</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="123456"
                  required
                  maxLength={6}
                  disabled={loading}
                />
                <p className="text-xs text-slate-500">
                  Ingresa el código de 6 dígitos recibido por email
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar y Crear
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Info adicional */}
        <div className="mt-4 rounded-md bg-slate-100 border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-700 mb-2">Seguridad:</p>
          <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
            <li>Solo administradores pueden crear nuevos administradores</li>
            <li>Verificación 2FA obligatoria por email</li>
            <li>Códigos de un solo uso con expiración de 10 minutos</li>
            <li>Contraseñas hasheadas con argon2</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
