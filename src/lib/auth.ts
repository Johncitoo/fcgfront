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

export const authService = {
  /**
   * Login con código de invitación (APPLICANT)
   * Solo requiere el código - el email se obtiene del invite en el backend
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
   * Login tradicional con email y contraseña (ADMIN/REVIEWER)
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
   * Cierra sesión del usuario
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
   * Guarda los tokens en localStorage
   */
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },

  /**
   * Guarda los datos del usuario en localStorage
   */
  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(ROLE_KEY, user.role);
  },

  /**
   * Obtiene el access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Obtiene el refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },

  /**
   * Obtiene los datos del usuario actual
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
   * Obtiene el rol del usuario
   */
  getUserRole(): 'ADMIN' | 'REVIEWER' | 'APPLICANT' | null {
    return localStorage.getItem(ROLE_KEY) as 'ADMIN' | 'REVIEWER' | 'APPLICANT' | null;
  },

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getCurrentUser();
  },

  /**
   * Limpia todos los datos de autenticación
   */
  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
  },

  /**
   * Obtiene la ruta de inicio según el rol del usuario
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
};
