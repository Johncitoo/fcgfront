import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface Call {
  id: string
  name: string
  year: number
  status: string
}

interface CallContextType {
  selectedCall: Call | null
  selectedCallId: string | null
  setSelectedCall: (call: Call | null) => void
  setSelectedCallId: (id: string | null) => void
  calls: Call[]
  loading: boolean
  refreshCalls: () => Promise<void>
}

const CallContext = createContext<CallContextType | undefined>(undefined)

export function CallProvider({ children }: { children: ReactNode }) {
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)

  const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'https://fcgback-production.up.railway.app/api'

  // Helper para setear por ID
  function setSelectedCallId(id: string | null) {
    if (!id) {
      setSelectedCall(null)
      localStorage.removeItem('selectedCallId')
      return
    }
    const call = calls.find(c => c.id === id)
    if (call) {
      setSelectedCall(call)
      localStorage.setItem('selectedCallId', id)
    }
  }

  async function refreshCalls() {
    try {
      setLoading(true)
      
      // Verificar que hay token antes de hacer la petición
      const token = localStorage.getItem('accessToken')
      if (!token) {
        console.log('[CallContext] No hay token, saltando carga de convocatorias')
        setCalls([])
        setLoading(false)
        return
      }
      
      // Limpiar selección previa para forzar selección de la activa
      setSelectedCall(null)
      localStorage.removeItem('selectedCallId')
      console.log('[CallContext] refreshCalls - localStorage limpiado')
      
      const res = await fetch(`${API_BASE}/calls?limit=100`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        const callsList = Array.isArray(data) ? data : data.data || []
        setCalls(callsList)

        if (callsList.length > 0) {
          // 1. Buscar convocatorias con status 'OPEN' (mayúsculas según BD)
          const openCalls = callsList.filter((c: Call) => 
            c.status === 'OPEN' || c.status === 'open' || c.status === 'active'
          )
          
          console.log('[CallContext] Convocatorias OPEN:', openCalls.map((c: Call) => `${c.name} (${c.year})`))
          
          // Si hay múltiples OPEN, priorizar:
          // a) Las que incluyan "Becas FCG" en el nombre
          // b) Las de año más cercano (no futuro lejano)
          let active: Call | undefined
          if (openCalls.length > 0) {
            const becasFCG = openCalls.filter((c: Call) => c.name.includes('Becas FCG'))
            console.log('[CallContext] Becas FCG encontradas:', becasFCG.map((c: Call) => `${c.name} (${c.year})`))
            if (becasFCG.length > 0) {
              // Tomar la más reciente de Becas FCG (año más alto entre Becas FCG)
              active = becasFCG.reduce((prev: Call, curr: Call) => curr.year > prev.year ? curr : prev)
              console.log('[CallContext] Seleccionada:', active?.name, active?.year)
            } else {
              // Tomar la primera OPEN
              active = openCalls[0]
              console.log('[CallContext] No hay Becas FCG, seleccionada primera OPEN:', active?.name)
            }
          } else {
            console.log('[CallContext] No hay convocatorias OPEN')
          }
          
          // 2. Si no hay selectedCall, seleccionar la activa o la más reciente
          if (!selectedCall) {
            if (active) {
              setSelectedCall(active)
              localStorage.setItem('selectedCallId', active.id)
              console.log('[CallContext] Set selectedCall:', active.name)
            } else {
              // Fallback: la más reciente (por año DESC)
              const latest = callsList.reduce((prev: Call, current: Call) =>
                current.year > prev.year ? current : prev
              )
              setSelectedCall(latest)
              localStorage.setItem('selectedCallId', latest.id)
              console.log('[CallContext] Fallback a latest:', latest.name)
            }
          } else {
            // Si ya hay selectedCall, verificar si sigue existiendo en la lista
            const stillExists = callsList.find((c: Call) => c.id === selectedCall.id)
            if (!stillExists && active) {
              // Si la que estaba seleccionada ya no existe, cambiar a la activa
              setSelectedCall(active)
              localStorage.setItem('selectedCallId', active.id)
              console.log('[CallContext] Cambiada a activa:', active.name)
            } else {
              console.log('[CallContext] Manteniendo selectedCall:', selectedCall.name)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading calls:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Solo intentar cargar convocatorias si hay token
    const token = localStorage.getItem('accessToken')
    if (token) {
      refreshCalls()
    } else {
      setLoading(false)
      console.log('[CallContext] Esperando autenticación para cargar convocatorias')
    }
  }, [])

  // Guardar en localStorage cuando cambia
  useEffect(() => {
    if (selectedCall) {
      localStorage.setItem('selectedCallId', selectedCall.id)
    }
  }, [selectedCall])

  const selectedCallId = selectedCall?.id || null

  return (
    <CallContext.Provider value={{ selectedCall, selectedCallId, setSelectedCall, setSelectedCallId, calls, loading, refreshCalls }}>
      {children}
    </CallContext.Provider>
  )
}

export function useCall() {
  const context = useContext(CallContext)
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider')
  }
  return context
}

// Alias para consistencia
export const useCallContext = useCall
