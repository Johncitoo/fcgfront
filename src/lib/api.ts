/**
 * Wrapper de fetch para API FCG:
 * - Inyecta Authorization: Bearer si hay token
 * - Maneja baseURL y parse seguro de errores
 * - Intenta refresh automático (una vez) si 401
 */

import { getAccessToken, getRefreshToken, refresh, clearAuth } from './auth'

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

interface ApiOptions {
  method?: Method
  headers?: Record<string, string>
  body?: any
  retryAuth?: boolean // control para no refrescar en ciclo infinito
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const access = getAccessToken()
  if (access) headers.Authorization = `Bearer ${access}`

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  // Intentar refresh si 401 y existe refresh_token (solo una vez)
  if (res.status === 401 && getRefreshToken() && options.retryAuth !== false) {
    const ok = await refresh()
    if (ok) {
      return api<T>(path, { ...options, retryAuth: false })
    } else {
      clearAuth()
      throw new Error('Sesión expirada. Vuelve a iniciar sesión.')
    }
  }

  const data = await safeJson(res)
  if (!res.ok) {
    const message = data?.message || data?.error || res.statusText
    throw new Error(message)
  }
  return data as T
}

/* Helpers verbosos por conveniencia */
export const apiGet = <T = unknown>(path: string) => api<T>(path)
export const apiPost = <T = unknown>(path: string, body?: any) => api<T>(path, { method: 'POST', body })
export const apiPatch = <T = unknown>(path: string, body?: any) => api<T>(path, { method: 'PATCH', body })
export const apiPut = <T = unknown>(path: string, body?: any) => api<T>(path, { method: 'PUT', body })
export const apiDelete = <T = unknown>(path: string) => api<T>(path, { method: 'DELETE' })

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}
