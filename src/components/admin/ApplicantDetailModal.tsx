import { useEffect, useState } from 'react'
import { X, FileText, Download, ChevronDown, ChevronUp, User, Mail, Calendar } from 'lucide-react'

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

interface ApplicantDetailModalProps {
  applicantId: string
  isOpen: boolean
  onClose: () => void
}

interface ApplicantDetail {
  id: string
  email: string
  fullName: string
  createdAt: string
  lastLoginAt?: string
  isActive: boolean
  applicantId: string
  applications: Application[]
}

interface Application {
  id: string
  callId: string
  status: string
  createdAt: string
  submittedAt?: string
  callName: string
  callYear: number
}

interface FormSubmission {
  id: string
  applicationId: string
  formId?: string
  milestoneId?: string
  answers: Record<string, any>
  submittedAt?: string
  createdAt: string
}

interface FormSchema {
  sections: FormSection[]
}

interface FormSection {
  id: string
  title: string
  fields: FormField[]
}

interface FormField {
  id: string
  name: string
  label: string
  type: string
  required?: boolean
}

interface FileMetadata {
  id: string
  originalFilename: string
  storedFilename: string
  mimetype: string
  size: number
  category: string
  entityType: string
  entityId: string
  path: string
  thumbnailPath?: string
  uploadedBy: string
  description?: string
  uploadedAt: string
  active: boolean
}

export default function ApplicantDetailModal({ applicantId, isOpen, onClose }: ApplicantDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applicant, setApplicant] = useState<ApplicantDetail | null>(null)
  const [formSubmissions, setFormSubmissions] = useState<FormSubmission[]>([])
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [activeTab, setActiveTab] = useState<'info' | 'forms' | 'files'>('info')
  const [expandedForm, setExpandedForm] = useState<string | null>(null)
  const [formSchemas, setFormSchemas] = useState<Record<string, FormSchema>>({})

  const headers = {
    Authorization: `Bearer ${localStorage.getItem('fcg.access_token') ?? ''}`,
    'Content-Type': 'application/json',
  }

  useEffect(() => {
    if (isOpen && applicantId) {
      loadApplicantData()
    }
  }, [isOpen, applicantId])

  async function loadApplicantData() {
    setLoading(true)
    setError(null)

    try {
      // Cargar datos del postulante
      const applicantRes = await fetch(`${API_BASE}/applicants/${applicantId}`, { headers })
      if (!applicantRes.ok) throw new Error('Error al cargar datos del postulante')
      const applicantData = await applicantRes.json()
      setApplicant(applicantData)

      // Cargar formularios completados para cada aplicación
      if (applicantData.applications && applicantData.applications.length > 0) {
        const allSubmissions: FormSubmission[] = []
        
        for (const app of applicantData.applications) {
          try {
            console.log(`[ApplicantModal] Buscando submissions para app:`, app.id)
            const submissionsRes = await fetch(
              `${API_BASE}/form-submissions/application/${app.id}`,
              { headers }
            )
            console.log(`[ApplicantModal] Status:`, submissionsRes.status)
            if (submissionsRes.ok) {
              const submissions = await submissionsRes.json()
              console.log(`[ApplicantModal] Submissions encontradas:`, submissions.length)
              console.log(`[ApplicantModal] Submissions:`, submissions)
              allSubmissions.push(...submissions)
            }
          } catch (err) {
            console.error(`Error loading submissions for application ${app.id}:`, err)
          }
        }
        
        setFormSubmissions(allSubmissions)

        // Cargar schemas de los formularios
        const uniqueFormIds = [...new Set(allSubmissions.map(s => s.formId).filter(Boolean))] as string[]
        const schemas: Record<string, FormSchema> = {}
        
        for (const formId of uniqueFormIds) {
          try {
            const formRes = await fetch(`${API_BASE}/forms/${formId}`, { headers })
            if (formRes.ok) {
              const formData = await formRes.json()
              const schema = typeof formData.schema === 'string' ? JSON.parse(formData.schema) : formData.schema
              schemas[formId] = schema
            }
          } catch (err) {
            console.error(`Error loading schema for form ${formId}:`, err)
          }
        }
        
        setFormSchemas(schemas)

        // Cargar archivos para cada aplicación
        const allFiles: FileMetadata[] = []
        
        for (const app of applicantData.applications) {
          try {
            const url = `${API_BASE}/files/list?entityType=APPLICATION&entityId=${app.id}`
            console.log('[ApplicantModal] Cargando archivos:', url)
            
            const filesRes = await fetch(url, { headers })
            console.log('[ApplicantModal] Status:', filesRes.status)
            
            if (filesRes.ok) {
              const filesData = await filesRes.json()
              console.log('[ApplicantModal] Files data:', filesData)
              
              const files = filesData.files || filesData
              console.log('[ApplicantModal] Total archivos:', files.length)
              allFiles.push(...files)
            } else {
              console.error('[ApplicantModal] Error response:', await filesRes.text())
            }
          } catch (err) {
            console.error(`[ApplicantModal] Error loading files for application ${app.id}:`, err)
          }
        }
        
        console.log('[ApplicantModal] Total archivos cargados:', allFiles.length)
        
        setFiles(allFiles)
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar información del postulante')
    } finally {
      setLoading(false)
    }
  }

  function toggleFormExpanded(formId: string) {
    setExpandedForm(expandedForm === formId ? null : formId)
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function renderFieldValue(value: any, type: string | undefined, _fieldName: string) {
    // Si es un archivo (FILE o IMAGE)
    if (type === 'FILE' || type === 'IMAGE' || type === 'file' || type === 'image') {
      // Si el valor es un UUID (ID del archivo)
      const isUUID = typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
      
      if (isUUID) {
        const fileId = value as string
        
        // Buscar metadata en el array de files
        const fileMetadata = files.find(f => f.id === fileId)
        
        return (
          <div className="flex items-center gap-3 mt-1">
            {type?.toLowerCase() === 'image' && (
              <img 
                src={`${API_BASE}/files/${fileId}/view`} 
                alt={fileMetadata?.originalFilename || 'Imagen'}
                className="w-20 h-20 object-cover rounded border border-gray-300 dark:border-gray-600"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {fileMetadata?.originalFilename || `Archivo (${fileId.substring(0, 8)}...)`}
              </div>
              {fileMetadata && (
                <div className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(fileMetadata.size)}</div>
              )}
            </div>
            <button
              onClick={() => downloadFile(fileId, fileMetadata?.originalFilename || 'archivo')}
              className="px-2 py-1 text-xs bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Descargar
            </button>
          </div>
        )
      }
      
      // Si hay valor pero no es UUID
      if (value) {
        return (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
            Valor no válido: {typeof value === 'string' ? value : JSON.stringify(value)}
          </div>
        )
      }
      
      return <div className="text-sm text-gray-400 dark:text-gray-500 italic">Sin archivo</div>
    }

    // Para otros tipos de campo
    if (!value) return <div className="text-sm text-gray-400 dark:text-gray-500 italic">Sin respuesta</div>
    
    if (typeof value === 'object') {
      return <pre className="text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded border border-gray-200 dark:border-gray-700">{JSON.stringify(value, null, 2)}</pre>
    }
    
    return <div className="text-gray-600 dark:text-gray-300">{String(value)}</div>
  }

  function downloadFile(fileId: string, filename: string) {
    const token = localStorage.getItem('fcg.access_token') ?? ''
    const url = `${API_BASE}/files/${fileId}/download`
    
    // Descargar con autenticación
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = filename
        link.click()
        window.URL.revokeObjectURL(blobUrl)
      })
      .catch(err => {
        console.error('Error downloading file:', err)
        alert('Error al descargar el archivo')
      })
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Detalles del Postulante</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-full p-1 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-all duration-200 ${
                activeTab === 'info'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className={`w-4 h-4 transition-transform duration-200 ${activeTab === 'info' ? 'scale-110' : ''}`} />
                Información Personal
              </div>
            </button>
            <button
              onClick={() => setActiveTab('forms')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-all duration-200 ${
                activeTab === 'forms'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className={`w-4 h-4 transition-transform duration-200 ${activeTab === 'forms' ? 'scale-110' : ''}`} />
                Formularios ({formSubmissions.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-all duration-200 ${
                activeTab === 'files'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Download className={`w-4 h-4 transition-transform duration-200 ${activeTab === 'files' ? 'scale-110' : ''}`} />
                Archivos ({files.length})
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : applicant ? (
            <>
              {/* Tab: Información Personal */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Nombre Completo</div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{applicant.fullName || 'No especificado'}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{applicant.email}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Fecha de Registro</div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {new Date(applicant.createdAt).toLocaleDateString('es-CL')}
                        </div>
                      </div>
                    </div>

                    {applicant.lastLoginAt && (
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Último Acceso</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {new Date(applicant.lastLoginAt).toLocaleDateString('es-CL')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Aplicaciones */}
                  {applicant.applications && applicant.applications.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Postulaciones</h3>
                      <div className="space-y-3">
                        {applicant.applications.map((app) => (
                          <div
                            key={app.id}
                            className="bg-gradient-to-r from-gray-50 to-blue-50/30 dark:from-gray-700 dark:to-blue-900/20 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">{app.callName}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Año {app.callYear}</div>
                              </div>
                              <div>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    app.status === 'SUBMITTED'
                                      ? 'bg-green-100 text-green-800'
                                      : app.status === 'APPROVED'
                                      ? 'bg-blue-100 text-blue-800'
                                      : app.status === 'REJECTED'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {app.status}
                                </span>
                              </div>
                            </div>
                            {app.submittedAt && (
                              <div className="mt-2 text-sm text-gray-500">
                                Enviado el {new Date(app.submittedAt).toLocaleDateString('es-CL')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Formularios */}
              {activeTab === 'forms' && (
                <div className="space-y-3">
                  {formSubmissions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No hay formularios completados
                    </div>
                  ) : (
                    formSubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md"
                      >
                        <button
                          onClick={() => toggleFormExpanded(submission.id)}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 transition-all duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            <div className="text-left">
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                Formulario {submission.formId || 'Sin ID'}
                              </div>
                              {submission.submittedAt && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  Enviado el{' '}
                                  {new Date(submission.submittedAt).toLocaleDateString('es-CL')}
                                </div>
                              )}
                            </div>
                          </div>
                          {expandedForm === submission.id ? (
                            <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>

                        {expandedForm === submission.id && (
                          <div className="p-4 space-y-4 bg-white dark:bg-gray-800 animate-slideDown">
                            {submission.answers && Object.keys(submission.answers).length > 0 ? (
                              formSchemas[submission.formId || '']?.sections?.map((section) => (
                                <div key={section.id} className="space-y-3">
                                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 pb-1">{section.title}</h4>
                                  {section.fields
                                    .filter(field => submission.answers[field.name] !== undefined)
                                    .map((field) => (
                                      <div key={field.id} className="border-l-2 border-blue-200 dark:border-blue-700 pl-3 hover:border-blue-400 dark:hover:border-blue-500 transition-colors duration-200">
                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</div>
                                        <div className="mt-1">
                                          {renderFieldValue(submission.answers[field.name], field.type, field.name)}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              ))
                            ) : (
                              <div className="text-gray-500 dark:text-gray-400 text-sm">No hay respuestas registradas</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab: Archivos */}
              {activeTab === 'files' && (
                <div className="space-y-3">
                  {files.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      No hay archivos adjuntos
                    </div>
                  ) : (
                    files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 hover:shadow-md"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate text-gray-900 dark:text-gray-100">{file.originalFilename}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {formatFileSize(file.size)} • {file.mimetype}
                            </div>
                            {file.description && (
                              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{file.description}</div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => downloadFile(file.id, file.originalFilename)}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 hover:shadow-lg transition-all duration-200 flex-shrink-0 ml-4 active:scale-95"
                        >
                          <Download className="w-4 h-4" />
                          Descargar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
