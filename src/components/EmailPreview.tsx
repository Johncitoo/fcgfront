import { Eye } from 'lucide-react'
import { useState } from 'react'

interface EmailPreviewProps {
  subject: string
  bodyHtml: string
  onPreview: (subject: string, body: string) => Promise<{ subject: string; body: string }>
}

export function EmailPreview({ subject, bodyHtml, onPreview }: EmailPreviewProps) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState<{ subject: string; body: string } | null>(null)

  const handlePreview = async () => {
    setLoading(true)
    try {
      const result = await onPreview(subject, bodyHtml)
      setPreviewData(result)
      setShowModal(true)
    } catch (error) {
      console.error('Error generando preview:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handlePreview}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Eye className="h-4 w-4" />
        {loading ? 'Generando...' : 'Ver Preview'}
      </button>

      {/* Modal de preview */}
      {showModal && previewData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Vista Previa del Email</h3>
                <p className="text-sm text-gray-500 mt-1">Datos de ejemplo - así lo verá el postulante</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              {/* Simulación de cliente de email */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden max-w-2xl mx-auto">
                {/* Email header */}
                <div className="bg-gray-100 p-4 border-b border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      FCG
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Fundación Carmes Goudie</div>
                      <div className="text-xs text-gray-500">noreply@fcg.cl</div>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Para:</span>
                    <span className="ml-2 text-gray-700">maria.gonzalez@ejemplo.com</span>
                  </div>
                  <div className="text-sm mt-1">
                    <span className="text-gray-500">Asunto:</span>
                    <span className="ml-2 font-semibold text-gray-900">{previewData.subject}</span>
                  </div>
                </div>

                {/* Email body */}
                <div 
                  className="p-6"
                  dangerouslySetInnerHTML={{ __html: previewData.body }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
