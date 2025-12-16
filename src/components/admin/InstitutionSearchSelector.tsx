import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, X } from 'lucide-react'

interface Institution {
  id: string
  name: string
  code?: string
  commune?: string
  province?: string
  region?: string
  type: 'LICEO' | 'COLEGIO' | 'INSTITUTO' | 'OTRO'
}

interface Props {
  value: string
  onChange: (id: string) => void
  required?: boolean
  onCreateNew?: () => void
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api'

/**
 * Selector de institución con búsqueda autocomplete y debounce.
 * Busca por nombre, RBD o comuna con 300ms de debounce.
 * Muestra institución seleccionada con botón para limpiar.
 * Soporta creación de nueva institución mediante callback opcional.
 * 
 * @param value - ID de la institución seleccionada
 * @param onChange - Callback con ID de institución al seleccionar
 * @param required - Si el campo es obligatorio
 * @param onCreateNew - Callback opcional para crear nueva institución
 * 
 * @example
 * <InstitutionSearchSelector
 *   value={institutionId}
 *   onChange={setInstitutionId}
 *   required
 *   onCreateNew={() => setShowNewInstModal(true)}
 * />
 */
export default function InstitutionSearchSelector({ value, onChange, required, onCreateNew }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Institution[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selected, setSelected] = useState<Institution | null>(null)

  const headers = {
    Authorization: `Bearer ${localStorage.getItem('fcg.access_token') ?? ''}`,
  }

  // Cargar institución seleccionada
  useEffect(() => {
    if (value && !selected) {
      fetch(`${API_BASE}/institutions/${value}`, { headers })
        .then(res => res.json())
        .then(data => setSelected(data))
        .catch(() => {})
    }
  }, [value])

  /**
   * Busca instituciones por query en nombre, RBD o comuna.
   * Límite 50 resultados, solo activas.
   * 
   * @param q - Término de búsqueda
   */
  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/institutions?q=${encodeURIComponent(q)}&limit=50&active=true`, { headers })
      const data = await res.json()
      setResults(data.data || [])
    } catch (err) {
      console.error('Error buscando instituciones:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) search(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, search])

  const handleSelect = (inst: Institution) => {
    setSelected(inst)
    onChange(inst.id)
    setShowDropdown(false)
    setQuery('')
  }

  const handleClear = () => {
    setSelected(null)
    onChange('')
    setQuery('')
  }

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium flex items-center justify-between">
        <span>Escuela/Colegio {required && '*'}</span>
        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Nueva institución
          </button>
        )}
      </label>

      {selected ? (
        <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-2">
          <div className="flex-1">
            <div className="text-sm font-medium text-green-900">{selected.name}</div>
            {(selected.commune || selected.code) && (
              <div className="text-xs text-green-700">
                {selected.code && `RBD: ${selected.code}`}
                {selected.code && selected.commune && ' • '}
                {selected.commune}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-green-600 hover:text-green-700"
            aria-label="Limpiar selección"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Buscar por nombre, RBD o comuna..."
              className="w-full rounded-md border px-3 py-2 pl-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            />
          </div>

          {showDropdown && (query || results.length > 0) && (
            <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg max-h-60 overflow-y-auto">
              {loading ? (
                <div className="px-3 py-2 text-sm text-slate-500">Buscando...</div>
              ) : results.length === 0 ? (
                <div className="px-3 py-2 text-sm text-slate-500">
                  {query ? 'No se encontraron resultados' : 'Escribe para buscar'}
                </div>
              ) : (
                results.map((inst) => (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => handleSelect(inst)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b last:border-0"
                  >
                    <div className="text-sm font-medium">{inst.name}</div>
                    <div className="text-xs text-slate-600">
                      {inst.code && `RBD: ${inst.code}`}
                      {inst.code && inst.commune && ' • '}
                      {inst.commune && `${inst.commune}`}
                      {inst.province && `, ${inst.province}`}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
