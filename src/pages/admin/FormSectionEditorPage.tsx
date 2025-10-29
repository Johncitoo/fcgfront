import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGet, apiPatch, apiPost, apiDelete } from '../../lib/api'
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Edit, 
  Info,
  Type,
  Hash,
  AlignLeft,
  List,
  CheckSquare,
  Circle,
  Upload,
  Image as ImageIcon,
  Calendar,
  HelpCircle,
  Eye,
  EyeOff,
  Lock,
  Settings
} from 'lucide-react'

type FieldType =
  | 'text'
  | 'textarea'
  | 'integer'
  | 'decimal'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'file'
  | 'image'
  | 'date'

interface FieldOption {
  id?: string
  label: string
  value: string
}

interface Field {
  id: string
  name: string              // clave interna
  label: string             // lo que verá el postulante
  help_text?: string | null
  type: FieldType
  required: boolean
  active: boolean           // visible para postulante
  admin_only?: boolean      // visible solo para staff
  order: number
  options?: FieldOption[]   // para select/checkbox/radio
  meta?: any
}

interface Section {
  id: string
  form_id: string
  title: string
  description?: string | null
  order: number
  comment_box?: boolean     // caja de comentarios para entrevista
  fields: Field[]
}

// Iconos para cada tipo de campo
const FIELD_TYPE_INFO: Record<FieldType, { icon: any; label: string; description: string }> = {
  text: { icon: Type, label: 'Texto corto', description: 'Campo de una línea (ej: nombre, email)' },
  textarea: { icon: AlignLeft, label: 'Texto largo', description: 'Área de texto multilínea (ej: comentarios)' },
  integer: { icon: Hash, label: 'Número entero', description: 'Solo números sin decimales (ej: edad)' },
  decimal: { icon: Hash, label: 'Número decimal', description: 'Números con decimales (ej: promedio)' },
  select: { icon: List, label: 'Lista desplegable', description: 'Seleccionar una opción de varias' },
  checkbox: { icon: CheckSquare, label: 'Casillas de verificación', description: 'Seleccionar múltiples opciones' },
  radio: { icon: Circle, label: 'Botones de opción', description: 'Seleccionar solo una opción' },
  file: { icon: Upload, label: 'Archivo', description: 'Subir cualquier tipo de archivo' },
  image: { icon: ImageIcon, label: 'Imagen', description: 'Subir una imagen (jpg, png, etc.)' },
  date: { icon: Calendar, label: 'Fecha', description: 'Selector de fecha' },
}

export default function FormSectionEditorPage() {
  const { formId, sectionId } = useParams<{ formId: string; sectionId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [section, setSection] = useState<Section | null>(null)

  // edición de cabecera
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [commentBox, setCommentBox] = useState(false)

  // modal nuevo campo
  const [openNew, setOpenNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fieldErr, setFieldErr] = useState<string | null>(null)
  const [newField, setNewField] = useState<Partial<Field> & { options?: FieldOption[] }>({
    name: '',
    label: '',
    type: 'text',
    required: false,
    active: true,
    admin_only: false,
    help_text: '',
    options: [],
  })

  const deps = useMemo(() => ({ formId, sectionId }), [formId, sectionId])

  useEffect(() => {
    if (!formId || !sectionId) return
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const s = await apiGet<Section>(`/forms/${formId}/sections/${sectionId}`)
        setSection(s)
        setTitle(s.title ?? '')
        setDescription(s.description ?? '')
        setCommentBox(!!s.comment_box)
      } catch (e: any) {
        setError(e.message ?? 'No se pudo cargar la sección')
      } finally {
        setLoading(false)
      }
    })()
  }, [deps])

  async function saveHeader(e: React.FormEvent) {
    e.preventDefault()
    if (!formId || !sectionId) return
    setSaving(true)
    setMsg(null)
    setError(null)
    try {
      const updated = await apiPatch<Section>(`/forms/${formId}/sections/${sectionId}`, {
        title: title.trim(),
        description: emptyToNull(description),
        comment_box: commentBox,
      })
      setSection(updated)
      setMsg('Sección actualizada.')
    } catch (e: any) {
      setError(e.message ?? 'No se pudo actualizar la sección')
    } finally {
      setSaving(false)
    }
  }

  async function createField(e: React.FormEvent) {
    e.preventDefault()
    if (!formId || !sectionId) return
    setSaving(true)
    setFieldErr(null)
    try {
      if (!newField.name?.trim()) throw new Error('Falta la clave interna (name)')
      if (!newField.label?.trim()) throw new Error('Falta la etiqueta visible (label)')
      if (!newField.type) throw new Error('Selecciona un tipo de campo')

      // limpiar options
      let options = newField.options ?? []
      if (!needsOptions(newField.type)) options = []

      const payload = {
        name: newField.name.trim(),
        label: newField.label.trim(),
        help_text: emptyToNull(newField.help_text ?? ''),
        type: newField.type,
        required: !!newField.required,
        active: !!newField.active,
        admin_only: !!newField.admin_only,
        options,
      }

      const res = await apiPost<Field>(
        `/forms/${formId}/sections/${sectionId}/fields`,
        payload,
      )

      // refrescar listado local
      setSection((s) =>
        s ? { ...s, fields: [...s.fields, res].sort((a, b) => a.order - b.order) } : s,
      )
      setOpenNew(false)
      setNewField({
        name: '',
        label: '',
        type: 'text',
        required: false,
        active: true,
        admin_only: false,
        help_text: '',
        options: [],
      })
    } catch (e: any) {
      setFieldErr(e.message ?? 'No se pudo crear el campo')
    } finally {
      setSaving(false)
    }
  }

  async function removeField(fieldId: string) {
    if (!formId || !sectionId) return
    if (!confirm('¿Eliminar este campo? Esta acción no se puede deshacer.')) return
    try {
      await apiDelete(`/forms/${formId}/sections/${sectionId}/fields/${fieldId}`)
      setSection((s) => (s ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) } : s))
    } catch (e: any) {
      alert(e.message ?? 'No se pudo eliminar el campo')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* Encabezado mejorado */}
        <div className="mb-6">
          <Link 
            to="/admin/forms" 
            className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a formularios
          </Link>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Editor de Sección</h1>
                <p className="text-slate-600 text-base">
                  Personaliza los campos y configuración de esta sección del formulario
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-sm font-medium">
                <Info className="w-4 h-4" />
                Modo Edición
              </div>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        {msg && (
          <div className="mb-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 shadow-sm flex items-center gap-3">
            <div className="w-1.5 h-full bg-emerald-500 rounded-full"></div>
            <span className="font-medium">{msg}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 shadow-sm flex items-center gap-3">
            <div className="w-1.5 h-full bg-rose-500 rounded-full"></div>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
              <span className="ml-3 text-slate-600">Cargando sección...</span>
            </div>
          </div>
        ) : !section ? (
          <div className="bg-white rounded-xl shadow-sm border-2 border-rose-200 p-8">
            <p className="text-rose-700 text-center font-medium">No se encontró la sección solicitada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_20rem]">
            {/* Panel Principal */}
            <div className="space-y-6">
              {/* Configuración de la Sección */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-4">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                    Información de la Sección
                  </h2>
                </div>
                <form onSubmit={saveHeader} className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Título de la Sección *
                    </label>
                    <input
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none text-slate-900"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej: Datos Personales, Información Académica"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                      Este título aparecerá como encabezado de la sección
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Descripción (opcional)
                    </label>
                    <textarea
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all outline-none text-slate-900 min-h-[100px]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe brevemente qué información se solicita en esta sección..."
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                      Ayuda a los usuarios a entender qué deben completar
                    </p>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="commentBox"
                      checked={commentBox}
                      onChange={(e) => setCommentBox(e.target.checked)}
                      className="w-5 h-5 text-sky-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-sky-500"
                    />
                    <label htmlFor="commentBox" className="flex-1 text-sm text-slate-700">
                      <span className="font-semibold block mb-1">Habilitar cuadro de comentarios</span>
                      <span className="text-xs text-slate-600">
                        Permite al equipo agregar observaciones durante las entrevistas
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      type="submit" 
                      disabled={saving} 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 text-white font-semibold rounded-lg shadow-sm transition-all hover:shadow-md"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Lista de Campos */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <List className="w-5 h-5" />
                    Campos del Formulario ({section.fields.length})
                  </h3>
                  <button 
                    onClick={() => setOpenNew(true)} 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Campo
                  </button>
                </div>

                <div className="p-6">
                  {section.fields.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <List className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-600 font-medium mb-2">No hay campos en esta sección</p>
                      <p className="text-sm text-slate-500 mb-4">Comienza agregando tu primer campo</p>
                      <button 
                        onClick={() => setOpenNew(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Crear Primer Campo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {section.fields
                        .slice()
                        .sort((a, b) => a.order - b.order)
                        .map((f) => {
                          const typeInfo = FIELD_TYPE_INFO[f.type]
                          const TypeIcon = typeInfo.icon
                          
                          return (
                            <div 
                              key={f.id} 
                              className="border-2 border-slate-200 rounded-lg p-4 hover:border-sky-300 hover:shadow-md transition-all bg-gradient-to-r from-white to-slate-50"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <TypeIcon className="w-5 h-5 text-sky-600" />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-slate-900 text-base">{f.label}</h4>
                                      <p className="text-xs text-slate-500 font-mono">{f.name}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                                      <TypeIcon className="w-3 h-3" />
                                      {typeInfo.label}
                                    </span>
                                    {f.required && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-700 rounded-md text-xs font-semibold">
                                        * Obligatorio
                                      </span>
                                    )}
                                    {f.active ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium">
                                        <Eye className="w-3 h-3" />
                                        Visible
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-200 text-slate-600 rounded-md text-xs font-medium">
                                        <EyeOff className="w-3 h-3" />
                                        Oculto
                                      </span>
                                    )}
                                    {f.admin_only && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-medium">
                                        <Lock className="w-3 h-3" />
                                        Solo Staff
                                      </span>
                                    )}
                                  </div>
                                  
                                  {f.help_text && (
                                    <div className="mt-3 flex items-start gap-2 text-xs text-slate-600 bg-blue-50 p-2 rounded border border-blue-100">
                                      <HelpCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                      <span>{f.help_text}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                  <Link
                                    to={`/admin/forms/${section.form_id}/sections/${section.id}/fields/${f.id}`}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                    Editar
                                  </Link>
                                  <button
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                    onClick={() => removeField(f.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Panel Lateral - Ayuda */}
            <aside className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl shadow-sm border-2 border-blue-200 p-5 sticky top-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-900">Guía Rápida</h3>
                </div>
                
                <div className="space-y-4 text-sm text-slate-700">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <h4 className="font-semibold mb-2 text-blue-900">💡 Tipos de Campos</h4>
                    <ul className="space-y-1.5 text-xs">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500">•</span>
                        <span><b>Texto corto:</b> Nombres, emails, etc.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500">•</span>
                        <span><b>Texto largo:</b> Comentarios extensos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500">•</span>
                        <span><b>Números:</b> Edad, promedio, etc.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500">•</span>
                        <span><b>Lista:</b> Selección única o múltiple</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <h4 className="font-semibold mb-2 text-blue-900">🔒 Permisos</h4>
                    <ul className="space-y-1.5 text-xs">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-500">•</span>
                        <span><b>Solo Staff:</b> Campo visible únicamente para el equipo administrativo</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-500">•</span>
                        <span><b>Visible:</b> El postulante puede ver y completar este campo</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <h4 className="font-semibold mb-2 text-blue-900">✨ Consejos</h4>
                    <ul className="space-y-1.5 text-xs">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        <span>Usa nombres descriptivos para los campos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        <span>Agrega texto de ayuda para campos complejos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        <span>Marca como obligatorios solo los campos esenciales</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Modal nuevo campo - Mejorado */}
      {openNew && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl border-2 border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 flex items-center justify-between border-b-2 border-purple-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Crear Nuevo Campo</h2>
                  <p className="text-purple-100 text-sm">Completa la información del campo</p>
                </div>
              </div>
              <button 
                onClick={() => setOpenNew(false)} 
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
                aria-label="Cerrar"
              >
                <span className="text-white text-xl">×</span>
              </button>
            </div>

            <form onSubmit={createField} className="p-6 space-y-6">
              {fieldErr && (
                <div className="rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 flex items-start gap-3">
                  <div className="w-1.5 h-full bg-rose-500 rounded-full"></div>
                  <div>
                    <p className="font-semibold">Error</p>
                    <p className="text-sm">{fieldErr}</p>
                  </div>
                </div>
              )}

              {/* Información Básica */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-lg">
                  <Info className="w-5 h-5 text-sky-600" />
                  Información Básica
                </h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nombre Interno *
                    </label>
                    <input
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none font-mono text-sm"
                      value={newField.name ?? ''}
                      onChange={(e) => setNewField((s) => ({ ...s, name: e.target.value }))}
                      placeholder="primer_nombre"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                      Sin espacios, en minúsculas (para uso interno)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Etiqueta Visible *
                    </label>
                    <input
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                      value={newField.label ?? ''}
                      onChange={(e) => setNewField((s) => ({ ...s, label: e.target.value }))}
                      placeholder="Primer Nombre"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                      Lo que verán los usuarios en el formulario
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tipo de Campo *
                  </label>
                  <select
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none bg-white"
                    value={newField.type}
                    onChange={(e) =>
                      setNewField((s) => ({ ...s, type: e.target.value as FieldType }))
                    }
                  >
                    {Object.entries(FIELD_TYPE_INFO).map(([type, info]) => (
                      <option key={type} value={type}>
                        {info.label} - {info.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Texto de Ayuda (opcional)
                  </label>
                  <input
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                    value={newField.help_text ?? ''}
                    onChange={(e) => setNewField((s) => ({ ...s, help_text: e.target.value }))}
                    placeholder="Ej: Ingresa tu RUT con guión (12345678-9)"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Ayuda adicional para quien complete el formulario
                  </p>
                </div>
              </div>

              {/* Configuración */}
              <div className="space-y-4 bg-slate-50 rounded-xl p-5 border-2 border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-600" />
                  Configuración
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-lg cursor-pointer hover:border-rose-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!newField.required}
                      onChange={(e) => setNewField((s) => ({ ...s, required: e.target.checked }))}
                      className="mt-0.5 w-5 h-5 text-rose-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-rose-500"
                    />
                    <div>
                      <span className="text-sm font-semibold text-slate-900 block">Campo Obligatorio</span>
                      <span className="text-xs text-slate-600">El usuario debe completarlo</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-lg cursor-pointer hover:border-emerald-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!newField.active}
                      onChange={(e) => setNewField((s) => ({ ...s, active: e.target.checked }))}
                      className="mt-0.5 w-5 h-5 text-emerald-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm font-semibold text-slate-900 block">Campo Activo</span>
                      <span className="text-xs text-slate-600">Visible en el formulario</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 bg-white border-2 border-slate-200 rounded-lg cursor-pointer hover:border-purple-300 transition-colors sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={!!newField.admin_only}
                      onChange={(e) => setNewField((s) => ({ ...s, admin_only: e.target.checked }))}
                      className="mt-0.5 w-5 h-5 text-purple-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm font-semibold text-slate-900 block">Solo Staff (Uso Administrativo)</span>
                      <span className="text-xs text-slate-600">El postulante no verá este campo, solo el equipo</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Opciones (si aplica) */}
              {needsOptions(newField.type as FieldType) && (
                <div className="space-y-4 bg-amber-50 rounded-xl p-5 border-2 border-amber-200">
                  <div className="flex items-center gap-2">
                    <List className="w-5 h-5 text-amber-700" />
                    <h3 className="font-semibold text-slate-900">
                      Opciones del Campo
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    Define las opciones que estarán disponibles para seleccionar
                  </p>
                  <OptionEditor
                    value={newField.options ?? []}
                    onChange={(opts) => setNewField((s) => ({ ...s, options: opts }))}
                  />
                </div>
              )}

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-200">
                <button 
                  type="button" 
                  onClick={() => setOpenNew(false)} 
                  className="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white font-semibold rounded-lg shadow-sm transition-all hover:shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  {saving ? 'Creando...' : 'Crear Campo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function needsOptions(t: FieldType | undefined) {
  return t === 'select' || t === 'checkbox' || t === 'radio'
}

function emptyToNull(v: string) {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}

function OptionEditor({
  value,
  onChange,
}: {
  value: FieldOption[]
  onChange: (opts: FieldOption[]) => void
}) {
  const [items, setItems] = useState<FieldOption[]>(value)

  useEffect(() => setItems(value), [value])

  function add() {
    setItems((s) => [...s, { label: '', value: '' }])
  }
  function remove(i: number) {
    setItems((s) => s.filter((_, idx) => idx !== i))
  }
  function update(i: number, k: keyof FieldOption, v: string) {
    setItems((s) => s.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)))
  }
  useEffect(() => onChange(items), [items, onChange])

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="text-center py-6 bg-white rounded-lg border-2 border-dashed border-slate-300">
          <List className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600 font-medium">No hay opciones</p>
          <p className="text-xs text-slate-500">Agrega al menos una opción</p>
        </div>
      )}
      {items.map((opt, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1 grid grid-cols-2 gap-2">
            <div>
              <input
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all outline-none text-sm"
                placeholder="Etiqueta visible (ej: Sí)"
                value={opt.label}
                onChange={(e) => update(i, 'label', e.target.value)}
              />
            </div>
            <div>
              <input
                className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all outline-none text-sm font-mono"
                placeholder="Valor interno (ej: yes)"
                value={opt.value}
                onChange={(e) => update(i, 'value', e.target.value)}
              />
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => remove(i)} 
            className="px-3 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button 
        type="button" 
        onClick={add} 
        className="w-full px-4 py-3 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-semibold border-2 border-amber-300"
      >
        <Plus className="w-4 h-4" />
        Añadir Opción
      </button>
    </div>
  )
}
