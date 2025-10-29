import { useEffect, useMemo, useState } from 'react'

/**
 * Builder de formularios por Convocatoria.
 * Permite:
 *  - Elegir una convocatoria.
 *  - Cargar el esquema (secciones + campos).
 *  - Crear/editar/eliminar secciones y campos.
 *  - Guardar el esquema completo.
 *
 * NOTAS:
 *  - El backend debe exponer:
 *      GET    /admin/forms?callId=UUID              -> { call, sections: [...] }
 *      PUT    /admin/forms?callId=UUID              -> { ok: true }
 *      POST   /admin/forms/clone                    -> { ok: true }  body: { fromCallId, toCallId }
 *  - El front no asume IDs reales de DB para secciones/campos al crear;
 *    genera IDs temporales (prefijo 'tmp_'). El backend debe mapearlos.
 */

type FieldType =
  | 'text'
  | 'number'
  | 'decimal'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'file'
  | 'image'

interface CallRow {
  id: string
  name: string
  year: number
  status?: string
}

interface FormOption {
  id: string
  value: string
  label: string
}

interface FormField {
  id: string
  name: string
  label: string
  type: FieldType
  helpText?: string
  required?: boolean
  active?: boolean
  readOnly?: boolean
  placeholder?: string
  min?: number | null
  max?: number | null
  step?: number | null
  multiple?: boolean
  maxLength?: number | null
  options?: FormOption[]
}

interface FormSection {
  id: string
  title: string
  description?: string
  commentBox?: boolean
  fields: FormField[]
}

interface FormSchemaPayload {
  call: { id: string; name: string; year: number }
  sections: FormSection[]
}

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

export default function FormsBuilderPage() {
  // Convocatorias
  const [calls, setCalls] = useState<CallRow[]>([])
  const [callsLoading, setCallsLoading] = useState(true)
  const [callId, setCallId] = useState<string>('')

  // Esquema
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schema, setSchema] = useState<FormSchemaPayload | null>(null)

  // UI estados
  const [saving, setSaving] = useState(false)
  const [cloneOpen, setCloneOpen] = useState(false)
  const [cloneFrom, setCloneFrom] = useState<string>('')

  const headers = useMemo(() => {
    const token = localStorage.getItem('fcg.access_token') ?? ''
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  }, [])

  /* ==================== cargar convocatorias ==================== */
  useEffect(() => {
    ;(async () => {
      try {
        setCallsLoading(true)
        const res = await fetch(`${API_BASE}/calls?limit=200`, { headers })
        if (!res.ok) throw new Error(await safeError(res))
        const data = await res.json()
        const list: CallRow[] = Array.isArray(data) ? data : data.data ?? []
        setCalls(list)
        if (!callId && list.length) setCallId(list[0].id)
      } catch {
        // handled silently
      } finally {
        setCallsLoading(false)
      }
    })()
  }, [headers])

  /* ==================== cargar esquema ==================== */
  async function loadForm(forCallId: string) {
    if (!forCallId) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${API_BASE}/admin/forms?callId=${forCallId}`, {
        headers,
      })
      if (!res.ok) throw new Error(await safeError(res))
      const payload = (await res.json()) as FormSchemaPayload
      // saneo mínimo
      payload.sections = (payload.sections ?? []).map(normalizeSection)
      setSchema(payload)
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar el formulario de la convocatoria')
      setSchema(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (callId) loadForm(callId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId])

  /* ==================== acciones de edición ==================== */

  function addSection() {
    setSchema((s) =>
      s
        ? {
            ...s,
            sections: [
              ...s.sections,
              {
                id: tmpId('sec'),
                title: 'Nueva sección',
                description: '',
                commentBox: false,
                fields: [],
              },
            ],
          }
        : s,
    )
  }

  function updateSection(secId: string, patch: Partial<FormSection>) {
    setSchema((s) =>
      s
        ? {
            ...s,
            sections: s.sections.map((sec) =>
              sec.id === secId ? { ...sec, ...patch } : sec,
            ),
          }
        : s,
    )
  }

  function deleteSection(secId: string) {
    setSchema((s) =>
      s
        ? { ...s, sections: s.sections.filter((sec) => sec.id !== secId) }
        : s,
    )
  }

  function addField(secId: string, type: FieldType) {
    const baseName = suggestName(type)
    setSchema((s) =>
      s
        ? {
            ...s,
            sections: s.sections.map((sec) =>
              sec.id === secId
                ? {
                    ...sec,
                    fields: [
                      ...sec.fields,
                      {
                        id: tmpId('fld'),
                        name: uniqueNameAcross(s, baseName),
                        label: suggestLabel(type),
                        type,
                        helpText: '',
                        required: false,
                        active: true,
                        readOnly: false,
                        placeholder: '',
                        min: null,
                        max: null,
                        step: null,
                        multiple: false,
                        maxLength: null,
                        options: typeHasOptions(type) ? [newOption()] : [],
                      },
                    ],
                  }
                : sec,
            ),
          }
        : s,
    )
  }

  function updateField(secId: string, fldId: string, patch: Partial<FormField>) {
    setSchema((s) =>
      s
        ? {
            ...s,
            sections: s.sections.map((sec) =>
              sec.id === secId
                ? {
                    ...sec,
                    fields: sec.fields.map((f) =>
                      f.id === fldId ? { ...f, ...patch } : f,
                    ),
                  }
                : sec,
            ),
          }
        : s,
    )
  }

  function deleteField(secId: string, fldId: string) {
    setSchema((s) =>
      s
        ? {
            ...s,
            sections: s.sections.map((sec) =>
              sec.id === secId
                ? { ...sec, fields: sec.fields.filter((f) => f.id !== fldId) }
                : sec,
            ),
          }
        : s,
    )
  }

  function addOption(secId: string, fldId: string) {
    const opt = newOption()
    setSchema((s) =>
      s
        ? {
            ...s,
            sections: s.sections.map((sec) =>
              sec.id === secId
                ? {
                    ...sec,
                    fields: sec.fields.map((f) =>
                      f.id === fldId
                        ? { ...f, options: [...(f.options ?? []), opt] }
                        : f,
                    ),
                  }
                : sec,
            ),
          }
        : s,
    )
  }

  function updateOption(
    secId: string,
    fldId: string,
    optId: string,
    patch: Partial<FormOption>,
  ) {
    setSchema((s) =>
      s
        ? {
            ...s,
            sections: s.sections.map((sec) =>
              sec.id === secId
                ? {
                    ...sec,
                    fields: sec.fields.map((f) =>
                      f.id === fldId
                        ? {
                            ...f,
                            options: (f.options ?? []).map((o) =>
                              o.id === optId ? { ...o, ...patch } : o,
                            ),
                          }
                        : f,
                    ),
                  }
                : sec,
            ),
          }
        : s,
    )
  }

  function deleteOption(secId: string, fldId: string, optId: string) {
    setSchema((s) =>
      s
        ? {
            ...s,
            sections: s.sections.map((sec) =>
              sec.id === secId
                ? {
                    ...sec,
                    fields: sec.fields.map((f) =>
                      f.id === fldId
                        ? {
                            ...f,
                            options: (f.options ?? []).filter((o) => o.id !== optId),
                          }
                        : f,
                    ),
                  }
                : sec,
            ),
          }
        : s,
    )
  }

  /* ==================== guardar esquema ==================== */
  async function save() {
    if (!schema || !schema.call?.id) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/forms?callId=${schema.call.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ sections: schema.sections }),
      })
      if (!res.ok) throw new Error(await safeError(res))
    } catch (e: any) {
      setError(e.message ?? 'No se pudo guardar el formulario')
    } finally {
      setSaving(false)
    }
  }

  /* ==================== clonar desde otra convocatoria ==================== */
  async function cloneFromCall() {
    if (!cloneFrom || !callId) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/forms/clone`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fromCallId: cloneFrom, toCallId: callId }),
      })
      if (!res.ok) throw new Error(await safeError(res))
      setCloneOpen(false)
      await loadForm(callId)
    } catch (e: any) {
      setError(e.message ?? 'No se pudo clonar el formulario')
    } finally {
      setSaving(false)
    }
  }

  /* ==================== UI ==================== */
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Diseñador de formularios</h1>
          <p className="text-slate-600">
            Administra secciones y campos por convocatoria. Puedes clonar desde años anteriores y luego ajustar.
          </p>
        </header>

        {/* Selección de convocatoria + acciones */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <label className="text-sm text-slate-600">Convocatoria</label>
            <select
              value={callId}
              onChange={(e) => setCallId(e.target.value)}
              disabled={callsLoading}
              className="rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              {calls.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.year})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => save()}
            disabled={!schema || saving}
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar esquema'}
          </button>

          <button
            onClick={() => {
              setCloneFrom('')
              setCloneOpen(true)
            }}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Clonar desde otra convocatoria
          </button>
        </div>

        {/* Estado */}
        {loading && (
          <div className="card mb-4">
            <div className="card-body">
              <p className="text-slate-600">Cargando esquema…</p>
            </div>
          </div>
        )}
        {error && (
          <div className="card mb-4 border-rose-200">
            <div className="card-body">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {/* Contenido del builder */}
        {schema && !loading && (
          <>
            <div className="space-y-4">
              {schema.sections.map((sec) => (
                <section key={sec.id} className="card">
                  <div className="card-body space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        value={sec.title}
                        onChange={(e) => updateSection(sec.id, { title: e.target.value })}
                        className="min-w-[16rem] flex-1 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                        placeholder="Título de la sección"
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!sec.commentBox}
                          onChange={(e) => updateSection(sec.id, { commentBox: e.target.checked })}
                        />
                        Cuadro de comentarios (solo encargados)
                      </label>
                      <button
                        onClick={() => deleteSection(sec.id)}
                        className="ml-auto rounded-md border px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        Eliminar sección
                      </button>
                    </div>

                    <textarea
                      value={sec.description ?? ''}
                      onChange={(e) => updateSection(sec.id, { description: e.target.value })}
                      rows={2}
                      className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      placeholder="Descripción (opcional)"
                    />

                    {/* Campos */}
                    <div className="rounded-lg border">
                      <div className="flex items-center justify-between border-b px-3 py-2">
                        <div className="text-sm font-medium">Campos</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <AddFieldMenu onAdd={(t) => addField(sec.id, t)} />
                        </div>
                      </div>

                      {sec.fields.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-slate-600">
                          Aún no hay campos. Usa “Agregar campo”.
                        </div>
                      ) : (
                        <div className="divide-y">
                          {sec.fields.map((f) => (
                            <FieldEditor
                              key={f.id}
                              field={f}
                              onChange={(patch) => updateField(sec.id, f.id, patch)}
                              onDelete={() => deleteField(sec.id, f.id)}
                              onAddOption={() => addOption(sec.id, f.id)}
                              onUpdateOption={(optId, patch) =>
                                updateOption(sec.id, f.id, optId, patch)
                              }
                              onDeleteOption={(optId) => deleteOption(sec.id, f.id, optId)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-4">
              <button
                onClick={addSection}
                className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                + Añadir sección
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal de clonar */}
      {cloneOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-white shadow-lg">
            <div className="border-b px-5 py-3">
              <div className="text-base font-semibold">Clonar formulario</div>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-slate-600">
                Selecciona la <b>convocatoria origen</b> desde la cual quieres copiar el formulario
                hacia la convocatoria actual. Esto no afecta el formulario original.
              </p>

              <div className="space-y-1">
                <label className="text-sm font-medium">Convocatoria origen</label>
                <select
                  value={cloneFrom}
                  onChange={(e) => setCloneFrom(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                >
                  <option value="">Seleccione…</option>
                  {calls
                    .filter((c) => c.id !== callId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.year})
                      </option>
                    ))}
                </select>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setCloneOpen(false)}
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={cloneFromCall}
                  disabled={!cloneFrom || saving}
                  className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {saving ? 'Clonando…' : 'Clonar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ==================== Subcomponentes ==================== */

function AddFieldMenu({ onAdd }: { onAdd: (t: FieldType) => void }) {
  const types: { t: FieldType; label: string }[] = [
    { t: 'text', label: 'Texto' },
    { t: 'textarea', label: 'Área de texto' },
    { t: 'number', label: 'Número entero' },
    { t: 'decimal', label: 'Número decimal' },
    { t: 'date', label: 'Fecha' },
    { t: 'select', label: 'Lista (select)' },
    { t: 'radio', label: 'Opción única (radio)' },
    { t: 'checkbox', label: 'Múltiples opciones (checkbox)' },
    { t: 'file', label: 'Archivo' },
    { t: 'image', label: 'Imagen' },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {types.map((x) => (
        <button
          key={x.t}
          onClick={() => onAdd(x.t)}
          type="button"
          className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-slate-50"
        >
          + {x.label}
        </button>
      ))}
    </div>
  )
}

function FieldEditor({
  field,
  onChange,
  onDelete,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
}: {
  field: FormField
  onChange: (patch: Partial<FormField>) => void
  onDelete: () => void
  onAddOption: () => void
  onUpdateOption: (optId: string, patch: Partial<FormOption>) => void
  onDeleteOption: (optId: string) => void
}) {
  const hasOptions = typeHasOptions(field.type)
  return (
    <div className="grid gap-3 p-3 md:grid-cols-4">
      <div className="md:col-span-2 space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre interno *</label>
            <input
              type="text"
              value={field.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              placeholder="ej: rut, first_name, promedio"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Etiqueta *</label>
            <input
              type="text"
              value={field.label}
              onChange={(e) => onChange({ label: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              placeholder="ej: RUT, Nombres, Promedio"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo</label>
            <select
              value={field.type}
              onChange={(e) => onChange({ type: e.target.value as FieldType, options: typeHasOptions(e.target.value as FieldType) ? field.options ?? [newOption()] : [] })}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <option value="text">Texto</option>
              <option value="textarea">Área de texto</option>
              <option value="number">Número entero</option>
              <option value="decimal">Número decimal</option>
              <option value="date">Fecha</option>
              <option value="select">Lista (select)</option>
              <option value="radio">Opción única (radio)</option>
              <option value="checkbox">Múltiples opciones (checkbox)</option>
              <option value="file">Archivo</option>
              <option value="image">Imagen</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Placeholder</label>
            <input
              type="text"
              value={field.placeholder ?? ''}
              onChange={(e) => onChange({ placeholder: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Ayuda (opcional)</label>
            <input
              type="text"
              value={field.helpText ?? ''}
              onChange={(e) => onChange({ helpText: e.target.value })}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              placeholder="Ej: Usa puntos para miles y guion para DV"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Largo máx.</label>
            <input
              type="number"
              value={field.maxLength ?? ''}
              onChange={(e) =>
                onChange({
                  maxLength:
                    e.target.value === '' ? null : Number(e.target.value),
                })
              }
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              placeholder="Ej: 120"
            />
          </div>
        </div>

        {/* Numéricos */}
        {(field.type === 'number' || field.type === 'decimal') && (
          <div className="grid gap-2 sm:grid-cols-3">
            <NumInput
              label="Mínimo"
              value={field.min}
              onChange={(v) => onChange({ min: v })}
            />
            <NumInput
              label="Máximo"
              value={field.max}
              onChange={(v) => onChange({ max: v })}
            />
            <NumInput
              label="Step"
              value={field.step}
              onChange={(v) => onChange({ step: v })}
            />
          </div>
        )}

        {/* Select/checkbox/radio */}
        {hasOptions && (
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-medium">Opciones</div>
              <button
                type="button"
                onClick={() => onAddOption()}
                className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-slate-50"
              >
                + Agregar opción
              </button>
            </div>

            {(field.options ?? []).length === 0 ? (
              <p className="text-sm text-slate-600">Sin opciones.</p>
            ) : (
              <div className="space-y-2">
                {(field.options ?? []).map((opt) => (
                  <div key={opt.id} className="grid gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-600">Valor</label>
                      <input
                        type="text"
                        value={opt.value}
                        onChange={(e) =>
                          onUpdateOption(opt.id, { value: e.target.value })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs text-slate-600">Etiqueta</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) =>
                            onUpdateOption(opt.id, { label: e.target.value })
                          }
                          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => onDeleteOption(opt.id)}
                          className="rounded-md border px-2.5 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {field.type === 'select' && (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!field.multiple}
                  onChange={(e) => onChange({ multiple: e.target.checked })}
                />
                Permitir selección múltiple
              </label>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={(e) => onChange({ required: e.target.checked })}
            />
            Requerido
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={field.active !== false}
              onChange={(e) => onChange({ active: e.target.checked })}
            />
            Visible para el postulante
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!field.readOnly}
              onChange={(e) => onChange({ readOnly: e.target.checked })}
            />
            Solo lectura
          </label>
        </div>

        <button
          onClick={onDelete}
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
        >
          Eliminar campo
        </button>
      </div>
    </div>
  )
}

function NumInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null | undefined
  onChange: (v: number | null) => void
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className="w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      />
    </div>
  )
}

/* ==================== helpers ==================== */

function tmpId(prefix: string) {
  return `tmp_${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function newOption(): FormOption {
  const id = tmpId('opt')
  return { id, value: `opt_${id.slice(-4)}`, label: 'Nueva opción' }
}

function typeHasOptions(t: FieldType) {
  return t === 'select' || t === 'checkbox' || t === 'radio'
}

function suggestLabel(t: FieldType) {
  switch (t) {
    case 'text':
      return 'Texto'
    case 'textarea':
      return 'Descripción'
    case 'number':
      return 'Número'
    case 'decimal':
      return 'Decimal'
    case 'date':
      return 'Fecha'
    case 'select':
      return 'Selección'
    case 'radio':
      return 'Opción'
    case 'checkbox':
      return 'Opciones'
    case 'file':
      return 'Archivo'
    case 'image':
      return 'Imagen'
    default:
      return 'Campo'
  }
}

function suggestName(t: FieldType) {
  const base =
    t === 'text'
      ? 'text'
      : t === 'textarea'
      ? 'description'
      : t === 'number'
      ? 'number'
      : t === 'decimal'
      ? 'decimal'
      : t === 'date'
      ? 'date'
      : t === 'select'
      ? 'select'
      : t === 'radio'
      ? 'radio'
      : t === 'checkbox'
      ? 'checkbox'
      : t === 'file'
      ? 'file'
      : t === 'image'
      ? 'image'
      : 'field'
  return `${base}_${Math.random().toString(36).slice(2, 6)}`
}

function uniqueNameAcross(schema: FormSchemaPayload, base: string) {
  const taken = new Set<string>()
  for (const sec of schema.sections) {
    for (const f of sec.fields) taken.add(f.name)
  }
  let name = base
  let i = 1
  while (taken.has(name)) {
    name = `${base}_${i++}`
  }
  return name
}

function normalizeSection(sec: FormSection): FormSection {
  return {
    id: sec.id || tmpId('sec'),
    title: sec.title || 'Sección',
    description: sec.description ?? '',
    commentBox: !!sec.commentBox,
    fields: (sec.fields ?? []).map((f) => ({
      id: f.id || tmpId('fld'),
      name: f.name || suggestName(f.type ?? 'text'),
      label: f.label || suggestLabel(f.type ?? 'text'),
      type: f.type ?? 'text',
      helpText: f.helpText ?? '',
      required: !!f.required,
      active: f.active !== false,
      readOnly: !!f.readOnly,
      placeholder: f.placeholder ?? '',
      min: f.min ?? null,
      max: f.max ?? null,
      step: f.step ?? null,
      multiple: !!f.multiple,
      maxLength: f.maxLength ?? null,
      options: (f.options ?? []).map((o) => ({
        id: o.id || tmpId('opt'),
        value: o.value ?? '',
        label: o.label ?? '',
      })),
    })),
  }
}

async function safeError(res: Response) {
  try {
    const data = await res.json()
    return data?.message || data?.error || res.statusText
  } catch {
    return res.statusText
  }
}
