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
   * Obtener lista de convocatorias
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
   * Obtener una convocatoria por ID
   */
  async getCallById(id: string) {
    const response = await axios.get(`${API_URL}/calls/${id}`, {
      withCredentials: true,
    });
    
    return response.data;
  },

  /**
   * Crear una nueva convocatoria
   */
  async createCall(data: Omit<UpdateCallDto, "id">) {
    const response = await axios.post(`${API_URL}/calls`, data, {
      withCredentials: true,
    });
    
    return response.data;
  },

  /**
   * Actualizar una convocatoria existente
   */
  async updateCall(id: string, data: UpdateCallDto) {
    const response = await axios.patch(`${API_URL}/calls/${id}`, data, {
      withCredentials: true,
    });
    
    return response.data;
  },

  /**
   * Eliminar una convocatoria
   */
  async deleteCall(id: string) {
    const response = await axios.delete(`${API_URL}/calls/${id}`, {
      withCredentials: true,
    });
    
    return response.data;
  },

  /**
   * Obtener solo convocatorias activas (helper)
   */
  async getActiveCalls() {
    return this.getCalls({ onlyActive: true, limit: 100 });
  },
};
