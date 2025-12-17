import { useEffect, useMemo, useState } from 'react'
import { EmailPreview } from '../../components/EmailPreview'
import { Save, RotateCcw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface EmailTemplate {
  id: string
  key: string
  name: string
  subjectTemplate: string
  bodyTemplate: string
  isEditable: boolean
  availableVariables?: Array<{name: string; description: string; required: boolean}>
  createdAt?: string
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [editedSubject, setEditedSubject] = useState('')
  const [editedBody, setEditedBody] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  const headers = useMemo(() => {
    const token = localStorage.getItem('fcg.access_token') ?? ''
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }, [])

  useEffect(() => {
    loadTemplates()
    // eslint-disable-next-line
  }, [])

  async function loadTemplates() {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/email/templates?limit=100`, { headers })
      if (!res.ok) throw new Error('Error cargando plantillas')
      const json = await res.json()
      setTemplates(json.data ?? [])
      
      // Seleccionar primera plantilla por defecto
      if (json.data?.length > 0) {
        loadTemplate(json.data[0].id)
      }
    } catch (e: any) {
      toast.error('Error cargando plantillas')
    } finally {
      setLoading(false)
    }
  }

  async function loadTemplate(id: string) {
    try {
      const res = await fetch(`${API_BASE}/email/templates/${id}`, { headers })
      if (!res.ok) throw new Error('Error cargando plantilla')
      const template = await res.json()

      setSelectedTemplate(template)
      setEditedSubject(template.subjectTemplate)
      setEditedBody(template.bodyTemplate)
      setHasChanges(false)
    } catch (e: any) {
      toast.error('Error cargando plantilla')
    }
  }

  async function saveTemplate() {
    if (!selectedTemplate) return

    try {
      setSaving(true)
      const res = await fetch(`${API_BASE}/email/templates/${selectedTemplate.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          subjectTemplate: editedSubject,
          bodyTemplate: editedBody,
        }),
      })

      if (!res.ok) throw new Error('Error guardando plantilla')

      toast.success('Plantilla guardada correctamente')
      setHasChanges(false)
      
      // Recargar para actualizar la lista
      await loadTemplates()
      await loadTemplate(selectedTemplate.id)
    } catch (e: any) {
      toast.error('Error guardando plantilla')
    } finally {
      setSaving(false)
    }
  }

  function restoreOriginal() {
    if (!selectedTemplate) return
    setEditedSubject(selectedTemplate.subjectTemplate)
    setEditedBody(selectedTemplate.bodyTemplate)
    setHasChanges(false)
    toast.success('Cambios descartados')
  }

  async function handlePreview(subject: string, body: string) {
    if (!selectedTemplate) return { subject: '', body: '' }

    try {
      const res = await fetch(`${API_BASE}/email/templates/${selectedTemplate.id}/preview`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subjectTemplate: subject,
          bodyTemplate: body,
        }),
      })

      if (!res.ok) throw new Error('Error generando preview')
      return await res.json()
    } catch (e) {
      toast.error('Error generando preview')
      return { subject: '', body: '' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando plantillas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Plantillas de Email</h1>
          <p className="text-gray-600 mt-2">
            Personaliza los mensajes que se envían automáticamente a los postulantes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar - Lista de plantillas */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Tipos de Email</h3>
              <div className="space-y-1 flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-2 lg:gap-0">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      if (hasChanges && !confirm('¿Descartar cambios no guardados?')) return
                      loadTemplate(template.id)
                    }}
                    className={`text-left px-3 py-2 rounded-lg transition-colors whitespace-nowrap lg:whitespace-normal flex-shrink-0 lg:flex-shrink lg:w-full ${
                      selectedTemplate?.id === template.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Editor principal */}
          <div className="lg:col-span-9">
            {selectedTemplate ? (
              <div className="space-y-6">
                {/* Información del template */}
                <div className={`border rounded-lg p-4 ${selectedTemplate.isEditable ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-gray-300'}`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`h-5 w-5 mt-0.5 ${selectedTemplate.isEditable ? 'text-blue-600' : 'text-gray-600'}`} />
                    <div>
                      <p className={`font-medium ${selectedTemplate.isEditable ? 'text-blue-900' : 'text-gray-900'}`}>
                        Plantilla: {selectedTemplate.name}
                      </p>
                      <p className={`text-sm mt-1 ${selectedTemplate.isEditable ? 'text-blue-700' : 'text-gray-700'}`}>
                        Código: <code className={`px-2 py-0.5 rounded ${selectedTemplate.isEditable ? 'bg-blue-100' : 'bg-gray-200'}`}>{selectedTemplate.key}</code>
                      </p>
                      <p className={`text-sm mt-2 ${selectedTemplate.isEditable ? 'text-blue-600' : 'text-gray-600'}`}>
                        {selectedTemplate.isEditable 
                          ? 'Esta plantilla NO puede ser eliminada. Los tipos de email están predefinidos por seguridad. Solo puedes editar el contenido y asunto.'
                          : '🔒 Esta plantilla NO es editable. Es una plantilla de sistema que no puede ser modificada.'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Editor de asunto */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asunto del correo
                  </label>
                  <input
                    type="text"
                    value={editedSubject}
                    onChange={(e) => {
                      if (selectedTemplate.isEditable) {
                        setEditedSubject(e.target.value)
                        setHasChanges(true)
                      }
                    }}
                    disabled={!selectedTemplate.isEditable}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Asunto del email..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Puedes usar variables como <code className="bg-gray-100 px-1 rounded">{'{{call_name}}'}</code>
                  </p>
                </div>

                {/* Editor de cuerpo */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Contenido del email
                  </label>
                  {selectedTemplate.isEditable ? (
                    <div>
                      <textarea
                        value={editedBody}
                        onChange={(e) => {
                          setEditedBody(e.target.value)
                          setHasChanges(true)
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        placeholder="Escribe el contenido del email aquí..."
                        rows={15}
                        style={{ resize: 'vertical', minHeight: '300px' }}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        El diseño visual (colores, logos, estilos) se aplicará automáticamente al enviar el email.
                        Puedes usar variables como <code className="bg-gray-100 px-1 rounded">{'{{applicant_name}}'}</code>
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                      <pre className="whitespace-pre-wrap text-sm text-gray-600 opacity-60 font-sans">
                        {editedBody}
                      </pre>
                      <p className="text-sm text-gray-500 mt-4 text-center">
                        🔒 Este contenido no puede ser modificado
                      </p>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <EmailPreview
                      subject={editedSubject}
                      bodyHtml={editedBody}
                      onPreview={handlePreview}
                    />
                    
                    {hasChanges && (
                      <span className="text-sm text-orange-600 font-medium">
                        Tienes cambios sin guardar
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {hasChanges && selectedTemplate.isEditable && (
                      <button
                        onClick={restoreOriginal}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Descartar cambios
                      </button>
                    )}

                    {selectedTemplate.isEditable && (
                      <button
                        onClick={saveTemplate}
                        disabled={!hasChanges || saving}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500">Selecciona una plantilla para editar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
