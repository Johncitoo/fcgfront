import { api } from './api';

interface LoginStaffResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'ADMIN' | 'REVIEWER' | 'APPLICANT';
  };
  accessToken: string;
  refreshToken: string;
}

interface EnterInviteResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: 'APPLICANT';
  };
  accessToken: string;
  refreshToken: string;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'REVIEWER' | 'APPLICANT';
}

const TOKEN_KEY = 'fcg.access_token';
const REFRESH_KEY = 'fcg.refresh_token';
const USER_KEY = 'fcg.user_data';
const ROLE_KEY = 'fcg.role';

/**
 * Servicio de autenticación con múltiples métodos de login.
 * Gestiona tokens JWT en localStorage y rutas por rol.
 * Soporta 3 flujos: login con invite code (APPLICANT), login staff (ADMIN/REVIEWER), login applicant.
 * 
 * @example
 * // Login con código de invitación
 * await authService.loginWithInviteCode('ABC123');
 * 
 * // Login staff
 * await authService.loginStaff('admin@example.com', 'password');
 * 
 * // Verificar autenticación
 * if (authService.isAuthenticated()) {
 *   const user = authService.getCurrentUser();
 * }
 */
export const authService = {
  /**
   * Login con código de invitación para postulantes (APPLICANT).
   * Solo requiere el código - el email se obtiene del invite en el backend.
   * Endpoint: POST /auth/enter-invite
   * 
   * @param code - Código de invitación recibido por email
   * @returns Datos del usuario y tokens
   * @throws Error si el código es inválido o ya fue usado
   * 
   * @example
   * const response = await authService.loginWithInviteCode('ABC123XYZ');
   * console.log('Bienvenido', response.user.fullName);
   */
  async loginWithInviteCode(code: string): Promise<EnterInviteResponse> {
    const response = await api.post<EnterInviteResponse>('/auth/enter-invite', {
      code: code.trim(),
      // Email es opcional - el backend lo obtiene del meta del invite
    });
    
    // Guardar tokens y datos del usuario
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    this.setUser(response.data.user);
    
    return response.data;
  },

  /**
   * Login tradicional con email y contraseña para staff (ADMIN/REVIEWER).
   * Endpoint: POST /auth/login-staff
   * 
   * @param email - Email del usuario staff
   * @param password - Contraseña
   * @returns Datos del usuario y tokens
   * @throws Error si las credenciales son inválidas
   * 
   * @example
   * await authService.loginStaff('admin@fcg.cl', 'password123');
   */
  async loginStaff(email: string, password: string): Promise<LoginStaffResponse> {
    const response = await api.post<LoginStaffResponse>('/auth/login-staff', {
      email: email.trim(),
      password,
    });
    
    // Guardar tokens y datos del usuario
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    this.setUser(response.data.user);
    
    return response.data;
  },

  /**
   * Login para postulantes con email y contraseña (APPLICANT).
   * Para postulantes que ya establecieron contraseña.
   * Endpoint: POST /auth/login
   * 
   * @param email - Email del postulante
   * @param password - Contraseña
   * @returns Datos del usuario y tokens
   * @throws Error si las credenciales son inválidas
   * 
   * @example
   * await authService.loginApplicant('postulante@example.com', 'password123');
   */
  async loginApplicant(email: string, password: string): Promise<LoginStaffResponse> {
    const response = await api.post<LoginStaffResponse>('/auth/login', {
      email: email.trim(),
      password,
    });
    
    // Guardar tokens y datos del usuario
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    this.setUser(response.data.user);
    
    return response.data;
  },

  /**
   * Cierra sesión del usuario.
   * Invalida el refresh token en el backend y limpia localStorage.
   * Endpoint: POST /auth/logout
   * 
   * @example
   * await authService.logout();
   * window.location.href = '/auth/login';
   */
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      this.clearAuth();
    }
  },

  /**
   * Guarda los tokens JWT en localStorage.
   * 
   * @param accessToken - Token de acceso JWT
   * @param refreshToken - Token de refresco JWT
   */
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },

  /**
   * Guarda los datos del usuario en localStorage como JSON.
   * 
   * @param user - Datos del usuario autenticado
   */
  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(ROLE_KEY, user.role);
  },

  /**
   * Obtiene el access token de localStorage.
   * 
   * @returns Access token JWT o null si no existe
   */
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Obtiene el refresh token de localStorage.
   * 
   * @returns Refresh token JWT o null si no existe
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },

  /**
   * Obtiene los datos del usuario actual desde localStorage.
   * 
   * @returns Objeto User o null si no hay usuario o JSON es inválido
   */
  getCurrentUser(): User | null {
    const userData = localStorage.getItem(USER_KEY);
    if (!userData) return null;
    
    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  },

  /**
   * Obtiene el rol del usuario actual.
   * 
   * @returns Rol del usuario o null si no está autenticado
   */
  getUserRole(): 'ADMIN' | 'REVIEWER' | 'APPLICANT' | null {
    return localStorage.getItem(ROLE_KEY) as 'ADMIN' | 'REVIEWER' | 'APPLICANT' | null;
  },

  /**
   * Verifica si el usuario está autenticado.
   * Comprueba existencia de access token y datos de usuario.
   * 
   * @returns true si hay token y usuario, false en caso contrario
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getCurrentUser();
  },

  /**
   * Limpia todos los datos de autenticación de localStorage.
   * Remueve tokens, datos de usuario y rol.
   */
  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
  },

  /**
   * Obtiene la ruta de inicio apropiada según el rol del usuario.
   * 
   * @param role - Rol del usuario
   * @returns Ruta de inicio (/admin, /reviewer, /applicant, o /)
   * 
   * @example
   * const route = authService.getHomeRouteByRole('ADMIN');
   * navigate(route);
   */
  getHomeRouteByRole(role: 'ADMIN' | 'REVIEWER' | 'APPLICANT'): string {
    switch (role) {
      case 'ADMIN':
        return '/admin';
      case 'REVIEWER':
        return '/reviewer';
      case 'APPLICANT':
        return '/applicant';
      default:
        return '/';
    }
  },

  /**
   * Decodifica un token JWT y extrae su payload.
   * No valida la firma - solo decodifica.
   * 
   * @param token - Token JWT
   * @returns Payload del token o null si es inválido
   */
  decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  },

  /**
   * Obtiene el tiempo restante hasta que expire el token en milisegundos.
   * 
   * @returns Milisegundos hasta expiración, o 0 si ya expiró o es inválido
   */
  getTokenTimeToExpiry(): number {
    const token = this.getAccessToken();
    if (!token) return 0;

    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) return 0;

    const expiryTime = payload.exp * 1000; // exp está en segundos
    const now = Date.now();
    const timeLeft = expiryTime - now;

    return timeLeft > 0 ? timeLeft : 0;
  },

  /**
   * Verifica si el token está próximo a expirar.
   * 
   * @param minutesBeforeExpiry - Minutos antes de expiración para considerar "próximo"
   * @returns true si el token expira en menos de los minutos especificados
   */
  isTokenExpiringSoon(minutesBeforeExpiry: number = 5): boolean {
    const timeLeft = this.getTokenTimeToExpiry();
    const thresholdMs = minutesBeforeExpiry * 60 * 1000;
    return timeLeft > 0 && timeLeft < thresholdMs;
  },

  /**
   * Refresca el access token usando el refresh token.
   * Endpoint: POST /auth/refresh
   * 
   * @returns Nuevo access token
   * @throws Error si el refresh token es inválido o expiró
   */
  async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await api.post<{ accessToken: string }>('/auth/refresh', {
        refreshToken,
      });
      
      const newAccessToken = response.data.accessToken;
      localStorage.setItem(TOKEN_KEY, newAccessToken);
      
      return newAccessToken;
    } catch (error) {
      // Si el refresh falla, cerrar sesión
      this.clearAuth();
      throw error;
    }
  },

  /**
   * Configura un temporizador para renovar el token antes de que expire.
   * Llama al callback cuando el token está próximo a expirar.
   * 
   * @param onWarning - Callback a ejecutar cuando el token esté por expirar
   * @param minutesBeforeExpiry - Minutos antes de expiración para mostrar advertencia
   * @returns ID del timeout para cancelarlo si es necesario
   */
  setupTokenRenewalTimer(onWarning: () => void, minutesBeforeExpiry: number = 5): number | null {
    const timeLeft = this.getTokenTimeToExpiry();
    if (timeLeft === 0) return null;

    const warningThreshold = minutesBeforeExpiry * 60 * 1000;
    const timeUntilWarning = timeLeft - warningThreshold;

    if (timeUntilWarning <= 0) {
      // Ya está en el umbral de advertencia
      onWarning();
      return null;
    }

    // Configurar timeout para mostrar advertencia
    const timerId = window.setTimeout(() => {
      onWarning();
    }, timeUntilWarning);

    return timerId;
  },

  /**
   * Intenta renovar el token silenciosamente si es necesario.
   * Útil para verificar la sesión al montar la aplicación.
   * 
   * @returns true si la sesión es válida, false si necesita re-login
   */
  async validateAndRefreshSession(): Promise<boolean> {
    const token = this.getAccessToken();
    if (!token) return false;

    const timeLeft = this.getTokenTimeToExpiry();
    
    // Si el token ya expiró o expira en menos de 1 minuto
    if (timeLeft < 60 * 1000) {
      try {
        await this.refreshAccessToken();
        return true;
      } catch {
        return false;
      }
    }

    return true;
  },
};
