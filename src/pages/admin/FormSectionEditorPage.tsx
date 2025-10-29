import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGet, apiPatch, apiPost, apiDelete } from '../../lib/api'

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
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link to="/admin/forms" className="text-sm text-sky-700 hover:underline">
            ← Volver a formularios
          </Link>
        </div>

        <header className="mb-4">
          <h1 className="text-2xl font-semibold">Editar sección</h1>
          <p className="text-slate-600">
            Define título, comentarios de entrevista y campos visibles/administrativos.
          </p>
        </header>

        {msg && (
          <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {msg}
          </div>
        )}
        {error && (
          <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card">
            <div className="card-body">
              <p className="text-slate-600">Cargando…</p>
            </div>
          </div>
        ) : !section ? (
          <div className="card border-rose-200">
            <div className="card-body">
              <p className="text-sm text-rose-700">No se encontró la sección.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
            {/* principal */}
            <section className="space-y-4">
              {/* Header sección */}
              <div className="card">
                <div className="card-body">
                  <h2 className="mb-2 text-lg font-semibold">Encabezado</h2>
                  <form onSubmit={saveHeader} className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-sm font-medium">Título *</label>
                      <input
                        className="input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Datos personales"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-sm font-medium">Descripción</label>
                      <textarea
                        className="input min-h-[96px]"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Sección para recopilar datos básicos del postulante…"
                      />
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={commentBox}
                        onChange={(e) => setCommentBox(e.target.checked)}
                      />
                      <span className="text-sm">Habilitar cuadro de comentarios (entrevista)</span>
                    </label>
                    <div className="sm:col-span-2 flex justify-end gap-2">
                      <button type="submit" disabled={saving} className="btn-primary">
                        {saving ? 'Guardando…' : 'Guardar'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Campos */}
              <div className="card">
                <div className="card-body">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-base font-semibold">Campos</h3>
                    <button onClick={() => setOpenNew(true)} className="btn-primary">
                      Nuevo campo
                    </button>
                  </div>

                  {section.fields.length === 0 ? (
                    <p className="text-sm text-slate-600">Aún no hay campos.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-slate-600">
                          <tr className="border-b">
                            <th className="py-2 pr-3">Etiqueta</th>
                            <th className="py-2 pr-3">Nombre</th>
                            <th className="py-2 pr-3">Tipo</th>
                            <th className="py-2 pr-3">Req.</th>
                            <th className="py-2 pr-3">Activo</th>
                            <th className="py-2 pr-3">Admin</th>
                            <th className="py-2">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.fields
                            .slice()
                            .sort((a, b) => a.order - b.order)
                            .map((f) => (
                              <tr key={f.id} className="border-b last:border-0">
                                <td className="py-2 pr-3">{f.label}</td>
                                <td className="py-2 pr-3 font-mono">{f.name}</td>
                                <td className="py-2 pr-3">{f.type}</td>
                                <td className="py-2 pr-3">{f.required ? 'Sí' : 'No'}</td>
                                <td className="py-2 pr-3">{f.active ? 'Sí' : 'No'}</td>
                                <td className="py-2 pr-3">{f.admin_only ? 'Sí' : 'No'}</td>
                                <td className="py-2">
                                  <div className="flex flex-wrap gap-2">
                                    <Link
                                      to={`/admin/forms/${section.form_id}/sections/${section.id}/fields/${f.id}`}
                                      className="btn text-xs"
                                    >
                                      Editar
                                    </Link>
                                    <button
                                      className="btn text-xs border-rose-300 text-rose-700"
                                      onClick={() => removeField(f.id)}
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* lateral */}
            <aside className="space-y-4">
              <div className="rounded-lg border bg-white p-3 text-xs text-slate-600">
                <p className="font-semibold">Sugerencias</p>
                <ul className="mt-1 list-disc pl-5">
                  <li>Usa <b>admin_only</b> para campos que rellena solo el equipo en entrevista.</li>
                  <li>Los campos tipo <b>select/checkbox/radio</b> requieren opciones.</li>
                  <li>La sección puede habilitar un <b>cuadro de comentarios</b> general.</li>
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Modal nuevo campo */}
      {openNew && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="text-base font-semibold">Nuevo campo</div>
              <button onClick={() => setOpenNew(false)} className="btn" aria-label="Cerrar">
                Cerrar
              </button>
            </div>
            <form onSubmit={createField} className="px-5 py-4 space-y-3">
              {fieldErr && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {fieldErr}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nombre interno *</label>
                  <input
                    className="input"
                    value={newField.name ?? ''}
                    onChange={(e) => setNewField((s) => ({ ...s, name: e.target.value }))}
                    placeholder="first_name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Etiqueta visible *</label>
                  <input
                    className="input"
                    value={newField.label ?? ''}
                    onChange={(e) => setNewField((s) => ({ ...s, label: e.target.value }))}
                    placeholder="Nombres"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Tipo *</label>
                  <select
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={newField.type}
                    onChange={(e) =>
                      setNewField((s) => ({ ...s, type: e.target.value as FieldType }))
                    }
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Ayuda</label>
                  <input
                    className="input"
                    value={newField.help_text ?? ''}
                    onChange={(e) => setNewField((s) => ({ ...s, help_text: e.target.value }))}
                    placeholder="Formato: 12.345.678-9"
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!newField.required}
                    onChange={(e) => setNewField((s) => ({ ...s, required: e.target.checked }))}
                  />
                  <span className="text-sm">Requerido</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!newField.active}
                    onChange={(e) => setNewField((s) => ({ ...s, active: e.target.checked }))}
                  />
                  <span className="text-sm">Activo (visible para postulante)</span>
                </label>

                <label className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={!!newField.admin_only}
                    onChange={(e) => setNewField((s) => ({ ...s, admin_only: e.target.checked }))}
                  />
                  <span className="text-sm">Solo staff (oculto al postulante)</span>
                </label>
              </div>

              {/* Opciones si corresponde */}
              {needsOptions(newField.type as FieldType) && (
                <div className="rounded-md border bg-slate-50 p-3">
                  <div className="mb-2 text-sm font-medium">Opciones</div>
                  <OptionEditor
                    value={newField.options ?? []}
                    onChange={(opts) => setNewField((s) => ({ ...s, options: opts }))}
                  />
                </div>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setOpenNew(false)} className="btn">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Creando…' : 'Crear campo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const FIELD_TYPES: FieldType[] = [
  'text',
  'textarea',
  'integer',
  'decimal',
  'select',
  'checkbox',
  'radio',
  'file',
  'image',
  'date',
]

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
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-sm text-slate-600">Agrega opciones para este campo.</p>
      )}
      {items.map((opt, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input
            className="input"
            placeholder="Etiqueta (p. ej., Sí)"
            value={opt.label}
            onChange={(e) => update(i, 'label', e.target.value)}
          />
          <input
            className="input"
            placeholder="Valor (p. ej., yes)"
            value={opt.value}
            onChange={(e) => update(i, 'value', e.target.value)}
          />
          <button type="button" onClick={() => remove(i)} className="btn">
            Quitar
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="btn">
        Añadir opción
      </button>
    </div>
  )
}
