import { useEffect, useState } from 'react'

type FieldType = 'text' | 'number' | 'decimal' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file' | 'image'

interface FormOption {
  value: string
  label: string
}

interface FormField {
  id: string
  name: string
  label: string
  type: string // Viene como INPUT, NUMBER, etc. desde backend
  helpText?: string
  required?: boolean
  active?: boolean
  placeholder?: string
  options?: FormOption[]
}

interface FormSection {
  id: string
  title: string
  description?: string
  fields: FormField[]
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'https://fcgback-production.up.railway.app/api'

// Mapear tipos de DB a tipos de input HTML
function mapFieldType(dbType: string): FieldType {
  const typeMap: Record<string, FieldType> = {
    INPUT: 'text',
    NUMBER: 'number',
    TEXTAREA: 'textarea',
    SELECT: 'select',
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    DATE: 'date',
    FILE: 'file',
    IMAGE: 'image',
  }
  return typeMap[dbType] || 'text'
}

export default function PublicFormPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sections, setSections] = useState<FormSection[]>([])
  const [callInfo, setCallInfo] = useState<{ name: string; year: string } | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE}/public/form`)
        if (!res.ok) throw new Error('No se pudo cargar el formulario')
        const data = await res.json()
        
        const sectionsFromDb = (data.sections || []).map((section: any) => ({
          ...section,
          fields: (section.fields || []).filter((f: any) => f.active !== false).map((field: any) => ({
            ...field,
            type: mapFieldType(field.type),
          })),
        }))
        
        setSections(sectionsFromDb)
        setCallInfo(data.call || null)
      } catch (err: any) {
        setError(err.message ?? 'Error al cargar el formulario')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleChange = (fieldName: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Cargando formulario...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-rose-200 rounded-lg p-6 max-w-md">
          <p className="text-rose-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Formulario de Postulación
          </h1>
          {callInfo && (
            <p className="text-slate-600">
              {callInfo.name} {callInfo.year}
            </p>
          )}
          <p className="text-sm text-slate-500 mt-4">
            Esta es una vista previa del formulario. Para postular oficialmente, debes usar el enlace que recibiste por correo.
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-lg border p-6 space-y-8">
          {sections.map((section) => (
            <section key={section.id} className="space-y-4">
              <div className="border-b pb-3">
                <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
                {section.description && (
                  <p className="text-sm text-slate-600 mt-1">{section.description}</p>
                )}
              </div>

              <div className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {field.label}
                      {field.required && <span className="text-rose-500 ml-1">*</span>}
                    </label>

                    {field.type === 'textarea' ? (
                      <textarea
                        value={values[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        rows={4}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={values[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      >
                        <option value="">-- Seleccione una opción --</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <div className="space-y-2">
                        {(field.options || []).map((opt) => (
                          <div key={opt.value} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`${field.name}_${opt.value}`}
                              className="rounded"
                              checked={(values[field.name] || []).includes(opt.value)}
                              onChange={(e) => {
                                const current = values[field.name] || []
                                const newValue = e.target.checked
                                  ? [...current, opt.value]
                                  : current.filter((v: string) => v !== opt.value)
                                handleChange(field.name, newValue)
                              }}
                            />
                            <label htmlFor={`${field.name}_${opt.value}`} className="text-sm">
                              {opt.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : field.type === 'radio' ? (
                      <div className="space-y-2">
                        {(field.options || []).map((opt) => (
                          <div key={opt.value} className="flex items-center gap-2">
                            <input
                              type="radio"
                              id={`${field.name}_${opt.value}`}
                              name={field.name}
                              checked={values[field.name] === opt.value}
                              onChange={() => handleChange(field.name, opt.value)}
                            />
                            <label htmlFor={`${field.name}_${opt.value}`} className="text-sm">
                              {opt.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : field.type === 'file' || field.type === 'image' ? (
                      <div className="border-2 border-dashed border-slate-300 rounded-md p-6 text-center">
                        <input type="file" className="hidden" id={field.name} />
                        <label htmlFor={field.name} className="cursor-pointer">
                          <span className="text-sm text-slate-600">
                            {field.type === 'image' ? 'Clic para subir imagen' : 'Clic para subir archivo'}
                          </span>
                        </label>
                      </div>
                    ) : field.type === 'date' ? (
                      <input
                        type="date"
                        value={values[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      />
                    ) : (
                      <input
                        type={field.type === 'number' || field.type === 'decimal' ? 'number' : 'text'}
                        step={field.type === 'decimal' ? '0.01' : undefined}
                        value={values[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      />
                    )}

                    {field.helpText && (
                      <p className="text-xs text-slate-500 mt-1.5">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}

          {sections.length === 0 && (
            <p className="text-center text-slate-500 py-8">
              No hay secciones configuradas en este formulario
            </p>
          )}

          {sections.length > 0 && (
            <div className="pt-6 border-t">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Esta es solo una vista previa. Para enviar tu postulación oficial, 
                  debes acceder con el código único que recibiste por correo electrónico.
                </p>
              </div>
              <button
                disabled
                className="w-full px-6 py-3 bg-slate-300 text-slate-600 rounded-md font-medium cursor-not-allowed"
              >
                Enviar Postulación (Deshabilitado en vista previa)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
