import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface CallsQueryParams {
  limit?: number;
  offset?: number;
  onlyActive?: boolean;
}

interface UpdateCallDto {
  name?: string;
  year?: number;
  status?: "DRAFT" | "OPEN" | "CLOSED";
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  autoClose?: boolean;
  totalSeats?: number;
  minPerInstitution?: number;
  dates?: Record<string, any>;
  rules?: Record<string, any>;
}

export const callsService = {
  /**
   * Obtiene lista paginada de convocatorias con filtros opcionales.
   * 
   * @param params - Parámetros de consulta
   * @param params.limit - Número máximo de resultados (default: 50)
   * @param params.offset - Número de registros a saltar (default: 0)
   * @param params.onlyActive - Filtrar solo convocatorias activas (default: false)
   * @returns Array de convocatorias
   * 
   * @example
   * const calls = await callsService.getCalls({ limit: 10, onlyActive: true });
   */
  async getCalls(params: CallsQueryParams = {}) {
    const { limit = 50, offset = 0, onlyActive = false } = params;
    
    const response = await axios.get(`${API_URL}/calls`, {
      params: { limit, offset, onlyActive },
      withCredentials: true,
    });
    
    return response.data;
  },

  /**
   * Obtiene una convocatoria específica por su ID.
   * 
   * @param id - UUID de la convocatoria
   * @returns Datos completos de la convocatoria
   * @throws Error si la convocatoria no existe
   * 
   * @example
   * const call = await callsService.getCallById('uuid-123');
   */
  async getCallById(id: string) {
    const response = await axios.get(`${API_URL}/calls/${id}`, {
      withCredentials: true,
    });
    
    return response.data;
  },

  /**
   * Crea una nueva convocatoria.
   * Requiere permisos de administrador.
   * 
   * @param data - Datos de la convocatoria a crear
   * @returns Convocatoria creada con su ID asignado
   * 
   * @example
   * const newCall = await callsService.createCall({
   *   name: 'Convocatoria 2025',
   *   year: 2025,
   *   status: 'DRAFT'
   * });
   */
  async createCall(data: Omit<UpdateCallDto, "id">) {
    const response = await axios.post(`${API_URL}/calls`, data, {
      withCredentials: true,
    });
    
    return response.data;
  },

  /**
   * Actualiza una convocatoria existente con datos parciales.
   * Requiere permisos de administrador.
   * 
   * @param id - UUID de la convocatoria
   * @param data - Datos a actualizar (parciales)
   * @returns Convocatoria actualizada
   * 
   * @example
   * await callsService.updateCall('uuid-123', { status: 'OPEN' });
   */
  async updateCall(id: string, data: UpdateCallDto) {
    const response = await axios.patch(`${API_URL}/calls/${id}`, data, {
      withCredentials: true,
    });
    
    return response.data;
  },

  /**
   * Elimina una convocatoria del sistema.
   * Requiere permisos de administrador.
   * 
   * @param id - UUID de la convocatoria
   * @returns Confirmación de eliminación
   * 
   * @example
   * await callsService.deleteCall('uuid-123');
   */
  async deleteCall(id: string) {
    const response = await axios.delete(`${API_URL}/calls/${id}`, {
      withCredentials: true,
    });
    
    return response.data;
  },

  /**
   * Obtiene solo convocatorias activas (helper de conveniencia).
   * Establece limit en 100 y onlyActive en true automáticamente.
   * 
   * @returns Array de convocatorias activas
   * 
   * @example
   * const activeCalls = await callsService.getActiveCalls();
   */
  async getActiveCalls() {
    return this.getCalls({ onlyActive: true, limit: 100 });
  },
};
