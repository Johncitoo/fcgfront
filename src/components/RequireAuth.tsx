import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

type Role = 'ADMIN' | 'REVIEWER' | 'APPLICANT'

interface Props {
  roles?: Role[]
  children: ReactNode
}

export default function RequireAuth({ roles, children }: Props) {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('fcg.access_token') || ''
    if (!token) {
      setOk(false)
      return
    }
    if (roles?.length) {
      const role = (localStorage.getItem('fcg.role') || '').toUpperCase() as Role
      if (!role || !roles.includes(role)) {
        setOk(false)
        return
      }
    }
    setOk(true)
  }, [roles])

  if (ok === null) return null
  if (!ok) return <Navigate to="/auth/login" replace />
  return <>{children}</>
}
