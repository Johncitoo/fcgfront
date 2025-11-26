import { useState, useEffect } from 'react'
import { Mail, Copy, Send, CheckCircle2, AlertCircle, ArrowLeft, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCallContext } from '../../contexts/CallContext'
import { CallStatusBadge } from '../../components/CallStatusBadge'

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'https://fcgback-production.up.railway.app/api'

export default function InviteApplicant() {
  const { selectedCall } = useCallContext()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [sendMethod, setSendMethod] = useState<'auto' | 'manual'>('manual')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const token = localStorage.getItem('fcg.access_token') ?? ''
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  useEffect(() => {
    // Reset al cambiar convocatoria
    setFirstName('')
    setLastName('')
    setEmail('')
    setSuccess(false)
    setError(null)
    setGeneratedCode(null)
  }, [selectedCall?.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!selectedCall) {
      setError('Selecciona una convocatoria primero')
      return
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Completa todos los campos')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)
    setGeneratedCode(null)

    try {
      // Crear invitación
      const res = await fetch(`${API_BASE}/invites`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          callId: selectedCall.id,
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          sendEmail: sendMethod === 'auto'
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Error al crear invitación')
      }

      const data = await res.json()

      if (sendMethod === 'auto') {
        setSuccess(true)
        setGeneratedCode(null)
      } else {
        setGeneratedCode(data.code || data.invitationCode)
        setSuccess(true)
      }

      // Limpiar formulario después de 3 segundos si fue exitoso
      setTimeout(() => {
        if (sendMethod === 'auto') {
          setFirstName('')
          setLastName('')
          setEmail('')
          setSuccess(false)
        }
      }, 3000)

    } catch (err: any) {
      setError(err.message || 'Error al enviar invitación')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard() {
    if (!generatedCode) return
    
    const inviteUrl = `${window.location.origin}/#/login`
    const message = `¡Hola ${firstName}!\n\nHas sido invitado/a a postular a ${selectedCall?.name}.\n\nDatos de acceso:\nEmail: ${email}\nCódigo: ${generatedCode}\n\nEntra aquí: ${inviteUrl}`
    
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <User className="w-6 h-6 text-sky-600" />
                  Invitar Postulante
                </h1>
                <p className="text-sm text-slate-500">Crea y envía invitaciones</p>
              </div>
            </div>

            <CallStatusBadge />
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {!selectedCall ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">
                  Selecciona una Convocatoria
                </h3>
                <p className="text-amber-700 text-sm">
                  Usa el selector de convocatorias en el menú lateral para comenzar.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">
                Nueva Invitación para {selectedCall.name}
              </h2>
              <p className="text-sm text-slate-600">
                Ingresa los datos del postulante y elige cómo enviar la invitación
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Datos del postulante */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  placeholder="Ej: Juan"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Apellido <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  placeholder="Ej: Pérez"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  placeholder="ejemplo@email.com"
                  disabled={loading}
                />
              </div>

              {/* Método de envío */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  ¿Cómo deseas enviar la invitación?
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name="sendMethod"
                      value="manual"
                      checked={sendMethod === 'manual'}
                      onChange={() => setSendMethod('manual')}
                      className="mt-1"
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        <Copy className="w-4 h-4 text-slate-600" />
                        Copiar código (envío manual)
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        Se generará el código y podrás copiarlo para enviarlo por WhatsApp, SMS, etc.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name="sendMethod"
                      value="auto"
                      checked={sendMethod === 'auto'}
                      onChange={() => setSendMethod('auto')}
                      className="mt-1"
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        <Mail className="w-4 h-4 text-sky-600" />
                        Enviar automáticamente por email
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        El sistema enviará un correo electrónico con el código de invitación
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Botón submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>Generando invitación...</>
                ) : sendMethod === 'auto' ? (
                  <>
                    <Send className="w-5 h-5" />
                    Crear y Enviar Invitación
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Generar Código de Invitación
                  </>
                )}
              </button>
            </form>

            {/* Mensaje de error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Mensaje de éxito (auto) */}
            {success && sendMethod === 'auto' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">¡Invitación enviada!</p>
                  <p className="text-sm text-green-700">
                    El correo con el código de invitación ha sido enviado a <strong>{email}</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Código generado (manual) */}
            {success && sendMethod === 'manual' && generatedCode && (
              <div className="bg-sky-50 border-2 border-sky-200 rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-sky-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-sky-900 mb-1">¡Código generado!</p>
                    <p className="text-sm text-sky-700">
                      Copia este código y envíalo manualmente al postulante
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border-2 border-sky-300">
                  <div className="mb-3">
                    <p className="text-xs text-slate-600 mb-1">Código de Invitación</p>
                    <p className="text-2xl font-mono font-bold text-slate-900 tracking-wider">
                      {generatedCode}
                    </p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Nombre:</strong> {firstName} {lastName}</p>
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Convocatoria:</strong> {selectedCall.name}</p>
                  </div>
                </div>

                <button
                  onClick={copyToClipboard}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar mensaje completo
                    </>
                  )}
                </button>

                <p className="text-xs text-slate-600 text-center">
                  El mensaje incluye el nombre, código y enlace de acceso
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
