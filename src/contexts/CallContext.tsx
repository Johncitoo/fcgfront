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
      // Limpiar selección previa para forzar selección de la activa
      setSelectedCall(null)
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${API_BASE}/calls?limit=100`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (res.ok) {
        const data = await res.json()
        const callsList = Array.isArray(data) ? data : data.data || []
        setCalls(callsList)

        if (callsList.length > 0) {
          // 1. Buscar convocatorias con status 'active' o 'OPEN'
          const openCalls = callsList.filter((c: Call) => 
            c.status === 'active' || c.status === 'OPEN' || c.status === 'open'
          )
          
          // Si hay múltiples OPEN, tomar la de año más alto que sea "Becas FCG"
          let active = openCalls.find((c: Call) => c.name.includes('Becas FCG'))
          if (!active && openCalls.length > 0) {
            // Si no hay "Becas FCG", tomar la primera OPEN
            active = openCalls[0]
          }
          
          // 2. Si no hay selectedCall, seleccionar la activa o la más reciente
          if (!selectedCall) {
            if (active) {
              setSelectedCall(active)
              localStorage.setItem('selectedCallId', active.id)
            } else {
              // Fallback: la más reciente (por año DESC)
              const latest = callsList.reduce((prev: Call, current: Call) =>
                current.year > prev.year ? current : prev
              )
              setSelectedCall(latest)
              localStorage.setItem('selectedCallId', latest.id)
            }
          } else {
            // Si ya hay selectedCall, verificar si sigue existiendo en la lista
            const stillExists = callsList.find((c: Call) => c.id === selectedCall.id)
            if (!stillExists && active) {
              // Si la que estaba seleccionada ya no existe, cambiar a la activa
              setSelectedCall(active)
              localStorage.setItem('selectedCallId', active.id)
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
    refreshCalls()
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
