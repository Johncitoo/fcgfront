import { useState } from 'react'
import { Send, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Props {
  callId: string
  callName: string
  onClose: () => void
  onSuccess: () => void
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

  /**
   * Modal para envío masivo de invitaciones a postulantes.
   * Envía correos SOLO a postulantes que aún no han recibido invitación previa.
   * Muestra resultado con contador de exitosos/fallidos y detalle de errores.
   * 
   * @param callId - UUID de la convocatoria
   * @param callName - Nombre de la convocatoria (para mostrar)
   * @param onClose - Callback al cerrar el modal
   * @param onSuccess - Callback al enviar exitosamente
   * 
   * @example
   * <BulkInviteModal
   *   callId="call-uuid"
   *   callName="Convocatoria 2025"
   *   onClose={() => setOpen(false)}
   *   onSuccess={() => refetch()}
   * />
   */
export default function BulkInviteModal({ callId, callName, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ 
    sent: number; 
    failed: number; 
    pending: number;
    total: number;
    errors?: string[];
    message?: string;
  } | null>(null)

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('fcg.access_token') ?? ''}`,
  }

  /**
   * Envía invitaciones a TODOS los postulantes que aún no tienen invitación.
   * Llama a /invites/bulk-send con sendToAll: true (sin límite).
   */
  async function handleSend() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`${API_BASE}/invites/bulk-send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          callId,
          sendToAll: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Error al enviar invitaciones')
      }

      const data = await res.json()
      setResult(data)

      if (data.sent > 0) {
        setTimeout(() => {
          onSuccess()
          if (data.pending === 0) {
            onClose()
          }
        }, 3000)
      }
    } catch (err: any) {
      setError(err.message || 'Error al enviar invitaciones')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Envío Masivo de Invitaciones</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-rose-900">Error</p>
                <p className="text-sm text-rose-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">
                    {result.message || 'Envío completado'}
                  </p>
                  <div className="text-sm text-green-700 mt-2 space-y-1">
                    <p>Enviadas exitosamente: <strong>{result.sent}</strong></p>
                    {result.failed > 0 && (
                      <p className="text-rose-700">Fallidas: <strong>{result.failed}</strong></p>
                    )}
                    {result.pending > 0 && (
                      <p className="text-amber-700">Pendientes: <strong>{result.pending}</strong></p>
                    )}
                    <p className="text-slate-600">Total procesadas: <strong>{result.total}</strong></p>
                  </div>
                  {result.pending > 0 && (
                    <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-2">
                      <p className="text-xs text-amber-900">
                        Quedan {result.pending} invitaciones pendientes de envío. 
                        Puedes ejecutar este proceso nuevamente para enviar el resto.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-medium text-slate-700 mb-2">Errores detallados:</p>
                  {result.errors.map((err, idx) => (
                    <p key={idx} className="text-xs text-slate-600 font-mono mb-1">
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {!result && (
            <>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-sm text-amber-900">
                  <strong>Convocatoria:</strong> {callName}
                </p>
                <p className="text-sm text-amber-700 mt-2">
                  Se enviarán invitaciones automáticas por correo a postulantes que <strong>NO</strong> han recibido invitación previa.
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  El sistema detecta automáticamente qué invitaciones ya fueron enviadas y solo procesa las pendientes o nuevos postulantes.
                </p>
              </div>

              <div className="rounded-lg bg-sky-50 border border-sky-200 p-4">
                <p className="text-xs font-medium text-sky-900 mb-2">Cada invitación incluirá:</p>
                <ul className="text-xs text-sky-700 space-y-1 list-disc list-inside">
                  <li>Código de invitación único</li>
                  <li>Saludo personalizado con el nombre del postulante</li>
                  <li>Instrucciones para acceder al sistema</li>
                  <li>Enlace directo al formulario</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t p-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md"
          >
            {result ? 'Cerrar' : 'Cancelar'}
          </button>
          {!result && (
            <button
              onClick={handleSend}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Invitaciones
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
