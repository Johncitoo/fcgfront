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
      const token = localStorage.getItem('fcg.access_token')
      if (!token) {
        console.log('[CallContext] No hay token, saltando carga de convocatorias')
        setCalls([])
        setLoading(false)
        return
      }
      
      // Verificar el rol del usuario - APPLICANT no necesita cargar convocatorias
      const userStr = localStorage.getItem('fcg.user_data')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          if (user.role === 'APPLICANT') {
            console.log('[CallContext] Usuario es APPLICANT, no se cargan convocatorias')
            setCalls([])
            setLoading(false)
            return
          }
        } catch (e) {
          console.warn('[CallContext] Error al parsear usuario:', e)
        }
      }
      
      // Limpiar selección previa para forzar selección de la activa
      setSelectedCall(null)
      localStorage.removeItem('selectedCallId')
      console.log('[CallContext] refreshCalls - localStorage limpiado')
      
      // Cargar TODAS las convocatorias, no solo las activas
      const res = await fetch(`${API_BASE}/calls?limit=100&onlyActive=false`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        const callsList = Array.isArray(data) ? data : data.data || []
        setCalls(callsList)
        
        console.log('[CallContext] Convocatorias cargadas:', callsList.length)

        if (callsList.length > 0) {
          // Si no hay convocatoria seleccionada, seleccionar la más reciente
          if (!selectedCall) {
            // Prioridad: 1. OPEN más reciente, 2. Cualquier convocatoria más reciente
            const openCalls = callsList.filter((c: Call) => c.status === 'OPEN')
            
            let toSelect: Call
            if (openCalls.length > 0) {
              // Seleccionar la convocatoria OPEN más reciente
              toSelect = openCalls.reduce((prev: Call, curr: Call) => 
                curr.year > prev.year ? curr : prev
              )
              console.log('[CallContext] Seleccionada convocatoria OPEN:', toSelect.name, toSelect.year)
            } else {
              // Si no hay OPEN, seleccionar la más reciente independientemente del status
              toSelect = callsList.reduce((prev: Call, curr: Call) =>
                curr.year > prev.year ? curr : prev
              )
              console.log('[CallContext] Seleccionada convocatoria más reciente:', toSelect.name, toSelect.year, toSelect.status)
            }
            
            setSelectedCall(toSelect)
            localStorage.setItem('selectedCallId', toSelect.id)
          } else {
            // Si ya hay selectedCall, verificar que sigue existiendo
            const stillExists = callsList.find((c: Call) => c.id === selectedCall.id)
            if (!stillExists) {
              // Si no existe, seleccionar la más reciente
              const latest = callsList.reduce((prev: Call, curr: Call) =>
                curr.year > prev.year ? curr : prev
              )
              setSelectedCall(latest)
              localStorage.setItem('selectedCallId', latest.id)
              console.log('[CallContext] Convocatoria anterior no existe, seleccionada:', latest.name)
            } else {
              console.log('[CallContext] Manteniendo convocatoria:', selectedCall.name)
            }
          }
        } else {
          console.log('[CallContext] No hay convocatorias disponibles')
          setSelectedCall(null)
          localStorage.removeItem('selectedCallId')
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
    const token = localStorage.getItem('fcg.access_token')
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
