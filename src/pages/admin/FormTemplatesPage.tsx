import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiDelete, apiGet } from '@/lib/api'
import { FileText, Plus, Eye, Edit2, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'

interface FormTemplate {
  id: string
  name: string
  description?: string
  isTemplate: boolean
  version: number
  schema?: {
    sections?: Array<{
      id: string
      title: string
      description?: string
      fields: Array<{
        id: string
        label: string
        type: string
        required?: boolean
      }>
    }>
  }
  createdAt: string
  updatedAt: string
}

export default function FormTemplatesPage() {
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Preview modal
  const [previewTemplate, setPreviewTemplate] = useState<FormTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    try {
      setLoading(true)
      setError(null)
      
      // Obtener solo plantillas (isTemplate=true)
      const data = await apiGet<FormTemplate[]>('/forms?isTemplate=true')
      
      // Validar que sea array
      if (!Array.isArray(data)) {
        throw new Error('Formato de respuesta inválido')
      }
      
      // Ordenar por fecha de creación (más reciente primero)
      const sorted = data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      setTemplates(sorted)
    } catch (err: any) {
      console.error('[FormTemplatesPage] Error cargando plantillas:', err)
      setError(err.message || 'Error al cargar las plantillas')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(template: FormTemplate) {
    // Validación: Confirmar acción destructiva
    const confirmMessage = `¿Estás seguro de eliminar la plantilla "${template.name}"?\n\nEsta acción no se puede deshacer.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setError(null)
      setSuccess(null)

      await apiDelete(`/forms/${template.id}`)
      
      setSuccess(`Plantilla "${template.name}" eliminada correctamente`)
      
      // Recargar lista
      await loadTemplates()
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('[FormTemplatesPage] Error eliminando plantilla:', err)
      setError(err.message || 'Error al eliminar la plantilla')
    }
  }

  function handlePreview(template: FormTemplate) {
    setPreviewTemplate(template)
    setShowPreview(true)
  }

  function closePreview() {
    setShowPreview(false)
    setPreviewTemplate(null)
  }

  // Calcular estadísticas de una plantilla
  function getTemplateStats(template: FormTemplate) {
    const sections = template.schema?.sections || []
    const totalFields = sections.reduce((sum, section) => sum + (section.fields?.length || 0), 0)
    const requiredFields = sections.reduce(
      (sum, section) => sum + (section.fields?.filter(f => f.required).length || 0),
      0
    )
    
    return {
      sections: sections.length,
      totalFields,
      requiredFields
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-sky-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Plantillas de Formularios</h1>
                <p className="text-slate-600 text-sm mt-1">
                  Crea y gestiona plantillas reutilizables para tus formularios
                </p>
              </div>
            </div>

            <Link
              to="/admin/formularios?template=true"
              state={{ isTemplate: true }}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nueva plantilla
            </Link>
          </div>
        </header>

        {/* Mensajes de feedback */}
        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-rose-900">Error</p>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-600"
            >
              ✕
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Éxito</p>
              <p className="text-sm text-green-700">{success}</p>
            </div>
            <button 
              onClick={() => setSuccess(null)}
              className="text-green-400 hover:text-green-600"
            >
              ✕
            </button>
          </div>
        )}

        {/* Contenido principal */}
        <div className="bg-white rounded-lg border shadow-sm">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600">Cargando plantillas...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-20 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No hay plantillas guardadas
              </h3>
              <p className="text-slate-600 mb-6">
                Crea tu primera plantilla para reutilizar formularios comunes
              </p>
              <Link
                to="/admin/formularios?template=true"
                state={{ isTemplate: true }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg font-medium hover:bg-sky-700"
              >
                <Plus className="w-5 h-5" />
                Crear primera plantilla
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Plantilla
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Estructura
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Creada
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {templates.map((template) => {
                    const stats = getTemplateStats(template)
                    return (
                      <tr key={template.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium text-gray-900">{template.name}</div>
                              {template.description && (
                                <div className="text-sm text-slate-600 mt-1">
                                  {template.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm space-y-1">
                            <div className="text-slate-700">
                              <span className="font-medium">{stats.sections}</span> {stats.sections === 1 ? 'sección' : 'secciones'}
                            </div>
                            <div className="text-slate-600">
                              {stats.totalFields} {stats.totalFields === 1 ? 'campo' : 'campos'} 
                              {stats.requiredFields > 0 && (
                                <span className="text-amber-600">
                                  {' '}({stats.requiredFields} {stats.requiredFields === 1 ? 'requerido' : 'requeridos'})
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600">
                            {new Date(template.createdAt).toLocaleDateString('es-CL', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            v{template.version}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handlePreview(template)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                              title="Ver contenido"
                            >
                              <Eye className="w-4 h-4" />
                              Ver
                            </button>
                            
                            <Link
                              to={`/admin/formularios?templateId=${template.id}`}
                              state={{ templateId: template.id, isTemplate: true }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                              title="Editar plantilla"
                            >
                              <Edit2 className="w-4 h-4" />
                              Editar
                            </Link>

                            <button
                              onClick={() => handleDelete(template)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-rose-700 bg-white border border-rose-300 rounded-md hover:bg-rose-50 transition-colors"
                              title="Eliminar plantilla"
                            >
                              <Trash2 className="w-4 h-4" />
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        {templates.length > 0 && (
          <div className="mt-4 text-sm text-slate-600">
            Mostrando {templates.length} {templates.length === 1 ? 'plantilla' : 'plantillas'}
          </div>
        )}
      </div>

      {/* Modal Preview */}
      {showPreview && previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{previewTemplate.name}</h2>
                {previewTemplate.description && (
                  <p className="text-sm text-slate-600 mt-1">{previewTemplate.description}</p>
                )}
              </div>
              <button
                onClick={closePreview}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Body - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {previewTemplate.schema?.sections && previewTemplate.schema.sections.length > 0 ? (
                <div className="space-y-6">
                  {previewTemplate.schema.sections.map((section, idx) => (
                    <div key={section.id} className="border rounded-lg p-4 bg-slate-50">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {idx + 1}. {section.title}
                        </h3>
                        {section.description && (
                          <p className="text-sm text-slate-600 mt-1">{section.description}</p>
                        )}
                      </div>

                      {section.fields && section.fields.length > 0 ? (
                        <div className="space-y-3">
                          {section.fields.map((field) => (
                            <div key={field.id} className="bg-white rounded p-3 border">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {field.label}
                                    {field.required && (
                                      <span className="text-rose-600 ml-1">*</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    Tipo: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{field.type}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic">Sin campos</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  Esta plantilla no tiene secciones definidas
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
              <button
                onClick={closePreview}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cerrar
              </button>
              <Link
                to={`/admin/formularios?templateId=${previewTemplate.id}`}
                state={{ templateId: previewTemplate.id, isTemplate: true }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700"
              >
                <Edit2 className="w-4 h-4" />
                Editar plantilla
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
