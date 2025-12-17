import { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../../lib/api'

interface AuditRow {
  id: string
  actor_id?: string | null
  action: string
  entity: string
  entity_id?: string | null
  meta?: any
  created_at: string
  // decorados opcionales
  actor_email?: string | null
  actor_name?: string | null
}

interface Paginated<T> {
  data: T[]
  meta?: { total: number; limit: number; offset: number }
}

export default function AuditPage() {
  // filtros
  const [qAction, setQAction] = useState('')
  const [qEntity, setQEntity] = useState('')
  const [actor, setActor] = useState('') // email o id
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // paginación
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)

  // dataset
  const [rows, setRows] = useState<AuditRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const deps = useMemo(
    () => ({ qAction, qEntity, actor, dateFrom, dateTo, limit, offset }),
    [qAction, qEntity, actor, dateFrom, dateTo, limit, offset],
  )

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      params.set('limit', String(limit))
      params.set('offset', String(offset))
      if (qAction.trim()) params.set('action', qAction.trim())
      if (qEntity.trim()) params.set('entity', qEntity.trim())
      if (actor.trim()) params.set('actor', actor.trim())
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)

      const res = await apiGet<Paginated<AuditRow> | AuditRow[]>(`/audit?${params.toString()}`)
      if (Array.isArray(res)) {
        setRows(res)
        setTotal(res.length)
      } else {
        setRows(res.data ?? [])
        setTotal(res.meta?.total ?? (res.data ?? []).length)
      }
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cargar la auditoría')
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    setOffset(0)
    load()
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Auditoría del Sistema</h1>
          <p className="text-slate-600">Registro inmutable de todas las acciones realizadas en el sistema.</p>
          <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
            <p className="font-medium text-blue-900 mb-1">¿Qué es "Actor"?</p>
            <p className="text-blue-700">
              El <strong>Actor</strong> es la persona que realizó la acción. Puede ser un administrador, revisor o postulante. 
              Si aparece "—", significa que fue una acción automática del sistema.
            </p>
          </div>
        </header>

        {/* Filtros */}
        <section className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_16rem_16rem_14rem_14rem_auto]">
          <input
            className="input"
            placeholder="Acción (p. ej. APPLICATION_STATUS_CHANGE)"
            value={qAction}
            onChange={(e) => setQAction(e.target.value)}
          />
          <input
            className="input"
            placeholder="Entidad (p. ej. application)"
            value={qEntity}
            onChange={(e) => setQEntity(e.target.value)}
          />
          <input
            className="input"
            placeholder="Actor (email o id)"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          />
          <input
            type="date"
            className="input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <input
            type="date"
            className="input"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <button onClick={applyFilters} className="btn">
            Aplicar
          </button>
        </section>

        {/* Tabla */}
        <div className="card">
          <div className="card-body">
            {loading ? (
              <p className="text-slate-600">Cargando…</p>
            ) : error ? (
              <p className="text-sm text-rose-700">{error}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-slate-600">Sin registros para los filtros.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-600">
                    <tr className="border-b">
                      <th className="py-2 pr-3">Fecha</th>
                      <th className="py-2 pr-3">Acción</th>
                      <th className="py-2 pr-3">Entidad</th>
                      <th className="py-2 pr-3">Actor</th>
                      <th className="py-2">Meta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString('es-CL', { 
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-2 pr-3">
                          <code className="rounded bg-slate-50 px-1 py-0.5 text-xs">{translateAction(r.action)}</code>
                          {r.entity_id ? (
                            <div className="text-xs text-slate-600 mt-1">
                              Registro: <span className="font-mono">{r.entity_id.substring(0, 8)}...</span>
                            </div>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3">
                          <span className="font-medium">{translateEntity(r.entity)}</span>
                        </td>
                        <td className="py-2 pr-3">
                          {r.actor_email ? (
                            <div>
                              <div className="font-medium text-slate-800">{r.actor_name || 'Usuario'}</div>
                              <div className="text-xs text-slate-600">{r.actor_email}</div>
                            </div>
                          ) : r.actor_id ? (
                            <div className="text-xs text-slate-600 font-mono">{r.actor_id.substring(0, 8)}...</div>
                          ) : (
                            <span className="text-slate-400 italic">Sistema automático</span>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="max-w-[38rem] overflow-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs text-slate-700">
                            {formatMeta(r.meta)}
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

        {/* Paginación */}
        <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Filas por página:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setOffset(0)
              }}
              className="rounded-md border px-2 py-1"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="btn disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="btn disabled:opacity-50"
            >
              Siguiente
            </button>
            <span className="text-slate-600">
              {total > 0
                ? `${Math.min(total, offset + 1)}–${Math.min(total, offset + rows.length)} de ${total}`
                : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Traduce el nombre de la acción a español
function translateAction(action: string): string {
  const actionMap: Record<string, string> = {
    'USER_LOGIN': 'Inicio de sesión',
    'LOGIN_SUCCESS': 'Inicio de sesión exitoso',
    'LOGIN_FAILED': 'Intento de inicio de sesión fallido',
    'PASSWORD_SET': 'Contraseña establecida',
    'PASSWORD_CHANGED': 'Contraseña cambiada',
    'FORM_SUBMITTED': 'Formulario enviado',
    'APPLICATION_STATUS_CHANGE': 'Cambio de estado',
    'APPLICATION_STATUS_CHANGED': 'Cambio de estado',
    'INVITE_VALIDATED_NEW': 'Invitación validada (nuevo)',
    'INVITE_VALIDATED_EXISTING': 'Invitación validada (existente)',
    'INVITE_REGENERATED': 'Invitación regenerada',
    'USER_CREATED': 'Usuario creado',
    'USER_UPDATED': 'Usuario actualizado',
    'USER_DELETED': 'Usuario eliminado',
    'EMAIL_SENT': 'Email enviado',
    'EMAIL_FAILED': 'Email fallido'
  }
  return actionMap[action] || action
}

// Traduce el nombre de la entidad a español
function translateEntity(entity: string): string {
  const entityMap: Record<string, string> = {
    'user': 'Usuario',
    'application': 'Postulación',
    'invite': 'Invitación',
    'form': 'Formulario',
    'email': 'Correo electrónico',
    'call': 'Convocatoria'
  }
  return entityMap[entity] || entity
}

// Función para formatear meta de manera legible
function formatMeta(m: any) {
  if (!m) return '—'
  
  try {
    // Si es un objeto, mostrarlo de forma legible
    if (typeof m === 'object') {
      const entries = Object.entries(m)
      if (entries.length === 0) return '—'
      
      return entries.map(([key, value]) => {
        // Formatear claves comunes de manera amigable
        let friendlyKey = key
        if (key === 'from') friendlyKey = 'Estado anterior'
        if (key === 'to') friendlyKey = 'Estado nuevo'
        if (key === 'fromStatus') friendlyKey = 'Estado anterior'
        if (key === 'toStatus') friendlyKey = 'Estado nuevo'
        if (key === 'role') friendlyKey = 'Rol'
        if (key === 'ip') friendlyKey = 'Dirección IP'
        if (key === 'timestamp') friendlyKey = 'Fecha'
        if (key === 'email') friendlyKey = 'Correo'
        if (key === 'applicantId') friendlyKey = 'ID Postulante'
        if (key === 'oldInviteId') friendlyKey = 'Invitación anterior'
        
        // Formatear valores
        let friendlyValue = value
        if (key === 'timestamp' && typeof value === 'string') {
          try {
            friendlyValue = new Date(value).toLocaleString('es-CL')
          } catch {
            friendlyValue = value
          }
        }
        
        // Formatear estados
        if ((key === 'from' || key === 'to' || key === 'fromStatus' || key === 'toStatus') && typeof value === 'string') {
          const statusMap: Record<string, string> = {
            'DRAFT': 'Borrador',
            'SUBMITTED': 'Enviado',
            'IN_REVIEW': 'En revisión',
            'NEEDS_FIX': 'Requiere correcciones',
            'APPROVED': 'Aprobado',
            'REJECTED': 'Rechazado'
          }
          friendlyValue = statusMap[value] || value
        }
        
        // Formatear roles
        if (key === 'role' && typeof value === 'string') {
          const roleMap: Record<string, string> = {
            'ADMIN': 'Administrador',
            'REVIEWER': 'Revisor',
            'APPLICANT': 'Postulante'
          }
          friendlyValue = roleMap[value] || value
        }
        
        return `${friendlyKey}: ${friendlyValue}`
      }).join('\n')
    }
    
    return JSON.stringify(m, null, 2)
  } catch {
    return String(m)
  }
}
