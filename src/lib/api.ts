import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Evitar duplicación de /api en la URL
const baseURL = API_BASE_URL.endsWith('/api') 
  ? API_BASE_URL 
  : `${API_BASE_URL}/api`;

// Exportar la URL base para uso directo con fetch
export const API_BASE = baseURL;

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor para agregar el token a cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fcg.access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fcg.access_token');
      localStorage.removeItem('fcg.refresh_token');
      localStorage.removeItem('fcg.user_data');
      localStorage.removeItem('fcg.role');

      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Helper functions
export async function apiGet<T = unknown>(url: string): Promise<T> {
  const response = await api.get<T>(url);
  return response.data;
}

export async function apiPost<T = unknown>(
  url: string,
  data?: Record<string, unknown>,
): Promise<T> {
  const response = await api.post<T>(url, data);
  return response.data;
}

export async function apiPatch<T = unknown>(
  url: string,
  data?: Record<string, unknown>,
): Promise<T> {
  const response = await api.patch<T>(url, data);
  return response.data;
}

export async function apiDelete<T = unknown>(url: string): Promise<T> {
  const response = await api.delete<T>(url);
  return response.data;
}


