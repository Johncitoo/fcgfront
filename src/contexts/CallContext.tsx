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
  setSelectedCall: (call: Call | null) => void
  calls: Call[]
  loading: boolean
  refreshCalls: () => Promise<void>
}

const CallContext = createContext<CallContextType | undefined>(undefined)

export function CallProvider({ children }: { children: ReactNode }) {
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

  async function refreshCalls() {
    try {
      setLoading(true)
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

        // Si no hay convocatoria seleccionada, seleccionar la primera
        if (!selectedCall && callsList.length > 0) {
          // Buscar la más reciente (por año DESC)
          const latest = callsList.reduce((prev: Call, current: Call) =>
            current.year > prev.year ? current : prev
          )
          setSelectedCall(latest)
          localStorage.setItem('selectedCallId', latest.id)
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
    
    // Restaurar convocatoria seleccionada desde localStorage
    const savedCallId = localStorage.getItem('selectedCallId')
    if (savedCallId && calls.length > 0) {
      const saved = calls.find(c => c.id === savedCallId)
      if (saved) {
        setSelectedCall(saved)
      }
    }
  }, [])

  // Guardar en localStorage cuando cambia
  useEffect(() => {
    if (selectedCall) {
      localStorage.setItem('selectedCallId', selectedCall.id)
    }
  }, [selectedCall])

  return (
    <CallContext.Provider value={{ selectedCall, setSelectedCall, calls, loading, refreshCalls }}>
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
