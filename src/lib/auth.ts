/**
 * Helpers de autenticación (frontend) para FCG Scholarships
 * - Maneja almacenamiento de tokens y usuario
 * - Expone funciones para login/refresh/logout
 * - No usa cookies (solo Authorization: Bearer)
 */

export type UserRole = 'ADMIN' | 'REVIEWER' | 'APPLICANT'

export interface UserSession {
  id: string
  email: string
  role: UserRole
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: UserSession
}

/* ================== storage keys ================== */

const ACCESS_KEY = 'fcg.access_token'
const REFRESH_KEY = 'fcg.refresh_token'
const USER_KEY = 'fcg.user'

/* ================== getters/setters ================== */

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function getUser(): UserSession | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as UserSession) : null
  } catch {
    return null
  }
}

export function setAuth(resp: AuthResponse) {
  localStorage.setItem(ACCESS_KEY, resp.access_token)
  localStorage.setItem(REFRESH_KEY, resp.refresh_token)
  localStorage.setItem(USER_KEY, JSON.stringify(resp.user))
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

/* ================== api helpers ================== */

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

/**
 * Realiza login contra /auth/login y persiste tokens+usuario en storage.
 */
export async function login(email: string, password: string): Promise<UserSession> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await safeJson(res)
  if (!res.ok) throw new Error(json?.message || json?.error || res.statusText)
  setAuth(json as AuthResponse)
  return (json as AuthResponse).user
}

/**
 * Intenta refrescar tokens con /auth/refresh.
 */
export async function refresh(): Promise<boolean> {
  const token = getRefreshToken()
  if (!token) return false

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: token }),
  })
  const json = await safeJson(res)
  if (!res.ok) {
    // refresh inválido → limpiar sesión
    clearAuth()
    return false
  }
  setAuth(json as AuthResponse)
  return true
}

/**
 * Logout local (opcionalmente podrías notificar al backend).
 */
export async function logout() {
  // Si el backend guarda hash de refresh y expone /auth/logout, podrías llamar aquí.
  clearAuth()
}

/* ================== util ================== */

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}
