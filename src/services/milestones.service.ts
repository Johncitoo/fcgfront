import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://fcgback-production.up.railway.app/api';

export interface Milestone {
  id: string;
  callId: string;
  formId?: string;
  name: string;
  description?: string;
  orderIndex: number;
  required: boolean;
  whoCanFill: string[];
  dueDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneProgress {
  id: string;
  milestoneId: string;
  milestoneName: string;
  orderIndex: number;
  required: boolean;
  status: string;
  reviewStatus?: 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES';
  reviewNotes?: string;
  reviewerName?: string;
  reviewedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ProgressSummary {
  total: number;
  completed: number;
  blocked: number;
  pending: number;
  percentage: number;
  currentMilestone: MilestoneProgress | null;
}

export interface ProgressResponse {
  progress: MilestoneProgress[];
  summary: ProgressSummary;
  applicationStatus: string;
  isRejected: boolean;
  rejectedMilestone: MilestoneProgress | null;
}

export const milestonesService = {
  /**
   * Crea un nuevo hito para una convocatoria.
   * 
   * @param data - Datos del hito (sin id, createdAt, updatedAt)
   * @param token - Token JWT de autenticación
   * @returns Hito creado con ID asignado
   * 
   * @example
   * const milestone = await milestonesService.create({
   *   callId: 'call-uuid',
   *   name: 'Documentación inicial',
   *   orderIndex: 1,
   *   required: true,
   *   whoCanFill: ['APPLICANT']
   * }, token);
   */
  async create(data: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>, token: string): Promise<Milestone> {
    const response = await axios.post(`${API_URL}/milestones`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Obtiene todos los hitos de una convocatoria, ordenados por orderIndex.
   * 
   * @param callId - UUID de la convocatoria
   * @param token - Token JWT de autenticación
   * @returns Array de hitos ordenados
   * 
   * @example
   * const milestones = await milestonesService.getByCall('call-uuid', token);
   */
  async getByCall(callId: string, token: string): Promise<Milestone[]> {
    const response = await axios.get(`${API_URL}/milestones/call/${callId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Obtiene un hito específico por su ID.
   * 
   * @param id - UUID del hito
   * @param token - Token JWT de autenticación
   * @returns Datos completos del hito
   * 
   * @example
   * const milestone = await milestonesService.getById('milestone-uuid', token);
   */
  async getById(id: string, token: string): Promise<Milestone> {
    const response = await axios.get(`${API_URL}/milestones/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Actualiza un hito con datos parciales.
   * 
   * @param id - UUID del hito
   * @param data - Datos a actualizar (parciales)
   * @param token - Token JWT de autenticación
   * @returns Hito actualizado
   * 
   * @example
   * await milestonesService.update('milestone-uuid', { status: 'COMPLETED' }, token);
   */
  async update(id: string, data: Partial<Milestone>, token: string): Promise<Milestone> {
    const response = await axios.patch(`${API_URL}/milestones/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Elimina un hito del sistema.
   * 
   * @param id - UUID del hito
   * @param token - Token JWT de autenticación
   * 
   * @example
   * await milestonesService.delete('milestone-uuid', token);
   */
  async delete(id: string, token: string): Promise<void> {
    await axios.delete(`${API_URL}/milestones/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Obtiene el progreso de hitos de una aplicación específica.
   * Incluye resumen con porcentaje completado y hito actual.
   * 
   * @param applicationId - UUID de la aplicación
   * @param token - Token JWT de autenticación
   * @returns Progreso detallado y resumen
   * 
   * @example
   * const { progress, summary } = await milestonesService.getProgress('app-uuid', token);
   * console.log(`Progreso: ${summary.percentage}%`);
   */
  async getProgress(applicationId: string, token: string): Promise<ProgressResponse> {
    const response = await axios.get(`${API_URL}/milestones/progress/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Inicializa el progreso de hitos para una nueva aplicación.
   * Crea registros de progreso para todos los hitos de la convocatoria.
   * 
   * @param applicationId - UUID de la aplicación
   * @param callId - UUID de la convocatoria
   * @param token - Token JWT de autenticación
   * 
   * @example
   * await milestonesService.initializeProgress('app-uuid', 'call-uuid', token);
   */
  async initializeProgress(applicationId: string, callId: string, token: string): Promise<void> {
    await axios.post(
      `${API_URL}/milestones/progress/initialize`,
      { applicationId, callId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },
};
