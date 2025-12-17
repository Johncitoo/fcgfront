import { useEffect, useState } from 'react'

interface FilePreviewModalProps {
  file: {
    id: string
    originalFilename: string
    mimetype: string
    size: number
    description?: string
  }
  onClose: () => void
}

export default function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isImage = file.mimetype.startsWith('image/')
  const isPDF = file.mimetype === 'application/pdf'
  const isPreviewable = isImage

  useEffect(() => {
    // Solo cargar preview para imágenes
    if (!isImage) {
      setLoading(false)
      return
    }

    const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'
    const token = localStorage.getItem('fcg.access_token') ?? ''
    const url = `${API_BASE}/files/${file.id}/download`

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar archivo')
        return res.blob()
      })
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message || 'Error al cargar la vista previa')
        setLoading(false)
      })

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [file.id, isImage])

  const openPDFInNewTab = () => {
    const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'
    const token = localStorage.getItem('fcg.access_token') ?? ''
    const url = `${API_BASE}/files/${file.id}/download`

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob)
        window.open(blobUrl, '_blank')
        // Limpiar después de un tiempo
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      })
      .catch(err => {
        alert('Error al abrir PDF: ' + err.message)
      })
  }

  const downloadFile = () => {
    const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'
    const token = localStorage.getItem('fcg.access_token') ?? ''
    const url = `${API_BASE}/files/${file.id}/download`

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.blob())
      .then(blob => {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = file.originalFilename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)
      })
      .catch(err => {
        alert('Error al descargar: ' + err.message)
      })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="max-h-[95vh] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-slate-50 px-6 py-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-800 truncate">{file.originalFilename}</h3>
            <p className="text-sm text-slate-600 mt-1">
              {formatFileSize(file.size)} • {file.mimetype}
            </p>
            {file.description && (
              <p className="text-sm text-slate-600 mt-1">{file.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button
              onClick={downloadFile}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar
            </button>
            <button
              onClick={onClose}
              className="text-2xl text-slate-400 hover:text-slate-700 transition-colors px-2"
            >
              ✕
            </isPDF ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <svg className="w-20 h-20 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-800 font-semibold mb-2 text-lg">Archivo PDF</p>
                <p className="text-slate-600 mb-6">El PDF se abrirá en una nueva pestaña para una mejor visualización.</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={openPDFInNewTab}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Abrir PDF
                  </button>
                  <button
                    onClick={downloadFile}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descargar
                  </button>
                </div>
              </div>
            </div>
          ) : !isPreviewable ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <svg className="w-20 h-20 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-slate-600 mb-4">Este tipo de archivo no se puede previsualizar en el navegador.</p>
                <button
                  onClick={downloadFile}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar archivo
                </button>
              </div>
            </div>
          ) : isImage && previewUrl ? (
            <div className="flex items-center justify-center h-full">
              <img
                src={previewUrl}
                alt={file.originalFilename}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div     className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar archivo
                </button>
              </div>
            </div>
          ) : isImage && previewUrl ? (
            <div className="flex items-center justify-center h-full">
              <img
                src={previewUrl}
                alt={file.originalFilename}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : isPDF && previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full rounded-lg shadow-lg bg-white"
              title={file.originalFilename}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
