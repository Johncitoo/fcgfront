import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../lib/api'

type Role = 'ADMIN' | 'REVIEWER' | 'APPLICANT'

interface Props {
  roles?: Role[]
  children: ReactNode
}

export default function RequireAuth({ roles, children }: Props) {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    const validateAuth = async () => {
      const token = localStorage.getItem('fcg.access_token') || ''
      if (!token) {
        setOk(false)
        return
      }

      try {
        // Verificar que el token es válido con el backend
        const response = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })

        const userRole = response.data.role?.toUpperCase() as Role
        
        // Actualizar localStorage con el rol del backend (por si cambió)
        localStorage.setItem('fcg.role', userRole)

        // Verificar roles si se especificaron
        if (roles?.length && !roles.includes(userRole)) {
          console.warn(`⛔ Acceso denegado: rol ${userRole} no autorizado para esta sección`)
          setOk(false)
          return
        }

        setOk(true)
      } catch (error) {
        console.error('❌ Token inválido o expirado:', error)
        // Limpiar localStorage si el token es inválido
        localStorage.removeItem('fcg.access_token')
        localStorage.removeItem('fcg.role')
        localStorage.removeItem('fcg.user_id')
        setOk(false)
      }
    }

    validateAuth()
  }, [roles])

  if (ok === null) return null
  if (!ok) return <Navigate to="/auth/login" replace />
  return <>{children}</>
}
