import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Evitar duplicación de /api en la URL
const baseURL = API_BASE_URL.endsWith('/api') 
  ? API_BASE_URL 
  : `${API_BASE_URL}/api`;

/**
 * URL base del API para uso directo con fetch.
 * Se construye a partir de VITE_API_URL con /api añadido si no lo tiene.
 */
export const API_BASE = baseURL;

/**
 * Instancia configurada de axios para llamadas al API.
 * Incluye interceptors para autenticación automática y manejo de errores 401.
 * Timeout: 10 segundos.
 * 
 * @example
 * const response = await api.get('/applications');
 */
export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const refreshClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

function getStoredToken(key: string): string | null {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
}

function setStoredToken(key: string, value: string): void {
  localStorage.setItem(key, value);
}

// Interceptor para agregar el token a cada petición
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken('fcg.access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor para manejar errores de autenticación y extraer mensajes del backend
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const originalRequest = error.config;
      const refreshToken = getStoredToken('fcg.refresh_token');

      if (refreshToken && !originalRequest?._retry) {
        originalRequest._retry = true;
        try {
          const refreshResponse = await refreshClient.post<{ accessToken: string; refreshToken?: string }>(
            '/auth/refresh',
            { refreshToken },
          );

          const newAccessToken = refreshResponse.data.accessToken;
          const newRefreshToken = refreshResponse.data.refreshToken;

          setStoredToken('fcg.access_token', newAccessToken);
          if (newRefreshToken) {
            setStoredToken('fcg.refresh_token', newRefreshToken);
          }

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (_) {
          localStorage.removeItem('fcg.access_token');
          localStorage.removeItem('fcg.refresh_token');
          localStorage.removeItem('fcg.user_data');
          localStorage.removeItem('fcg.role');

          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      } else {
        localStorage.removeItem('fcg.access_token');
        localStorage.removeItem('fcg.refresh_token');
        localStorage.removeItem('fcg.user_data');
        localStorage.removeItem('fcg.role');

        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    
    // Extraer mensaje del backend para todos los errores
    if (error.response?.data?.message) {
      error.message = error.response.data.message;
    }
    
    return Promise.reject(error);
  },
);

/**
 * Realiza una petición GET al API.
 * Incluye autenticación automática vía interceptor.
 * 
 * @template T - Tipo de respuesta esperada
 * @param url - URL relativa al baseURL
 * @returns Datos de la respuesta
 * 
 * @example
 * const apps = await apiGet<Application[]>('/applications');
 */
export async function apiGet<T = unknown>(url: string): Promise<T> {
  const response = await api.get<T>(url);
  return response.data;
}

/**
 * Realiza una petición POST al API.
 * 
 * @template T - Tipo de respuesta esperada
 * @param url - URL relativa al baseURL
 * @param data - Datos a enviar en el body
 * @returns Datos de la respuesta
 * 
 * @example
 * const result = await apiPost('/applications', { callId: 'uuid' });
 */
export async function apiPost<T = unknown>(
  url: string,
  data?: Record<string, unknown>,
): Promise<T> {
  const response = await api.post<T>(url, data);
  return response.data;
}

/**
 * Realiza una petición PATCH al API.
 * 
 * @template T - Tipo de respuesta esperada
 * @param url - URL relativa al baseURL
 * @param data - Datos a actualizar
 * @returns Datos de la respuesta
 * 
 * @example
 * await apiPatch('/applications/uuid-123', { status: 'SUBMITTED' });
 */
export async function apiPatch<T = unknown>(
  url: string,
  data?: Record<string, unknown>,
): Promise<T> {
  const response = await api.patch<T>(url, data);
  return response.data;
}

/**
 * Realiza una petición DELETE al API.
 * 
 * @template T - Tipo de respuesta esperada
 * @param url - URL relativa al baseURL
 * @returns Datos de la respuesta
 * 
 * @example
 * await apiDelete('/applications/uuid-123');
 */
export async function apiDelete<T = unknown>(url: string): Promise<T> {
  const response = await api.delete<T>(url);
  return response.data;
}

/**
 * Helper para fetch nativo con autenticación y manejo de errores 401.
 * Incluye token automáticamente y redirige a login si es inválido.
 * 
 * @param url - URL completa de la petición
 * @param options - Opciones de fetch
 * @returns Response de fetch
 * 
 * @example
 * const response = await authFetch('https://api.example.com/data', { method: 'GET' });
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken('fcg.access_token');
  
  const headers = {
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : '',
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Si es 401, limpiar sesión y redirigir al login
  if (response.status === 401) {
    localStorage.removeItem('fcg.access_token');
    localStorage.removeItem('fcg.refresh_token');
    localStorage.removeItem('fcg.user_data');
    localStorage.removeItem('fcg.role');
    
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  return response;
}


