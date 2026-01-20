import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface ApplicantForSelection {
  applicationId: string;
  applicationStatus: string;
  submittedAt: string;
  totalScore: number | null;
  applicantId: string;
  applicantName: string;
  email: string;
  rutNumber: number;
  rutDv: string;
  totalMilestones: number;
  completedMilestones: number;
  approvedMilestones: number;
  rejectedMilestones: number;
  selectionStatus: 'SELECTED' | 'NOT_SELECTED' | 'HAS_REJECTED' | 'ALL_COMPLETED' | 'IN_PROGRESS';
}

export interface ApplicationDetails {
  application: any;
  milestones: Array<{
    milestoneId: string;
    milestoneName: string;
    orderIndex: number;
    status: string;
    reviewStatus: string | null;
    reviewNotes: string | null;
    completedAt: string | null;
    reviewerName: string | null;
  }>;
}

/**
 * Servicio de selección final de postulantes.
 * Gestiona la obtención de candidatos y decisiones finales de selección.
 * Usado por administradores para el proceso de selección.
 */
export const selectionService = {
  /**
   * Obtiene todos los postulantes de una convocatoria para selección final.
   * Incluye resumen de hitos completados, rechazados y estado de selección.
   * 
   * @param callId - UUID de la convocatoria
   * @param token - Token JWT de autenticación
   * @returns Array de postulantes con información de selección
   * 
   * @example
   * const applicants = await selectionService.getApplicantsForSelection('call-uuid', token);
   */
  async getApplicantsForSelection(callId: string, token: string): Promise<ApplicantForSelection[]> {
    const response = await axios.get(`${API_URL}/selection/call/${callId}/applicants`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Establece la decisión final de un postulante (SELECTED o NOT_SELECTED).
   * Requiere permisos de administrador.
   * 
   * @param applicationId - UUID de la postulación
   * @param status - Estado final: 'SELECTED' o 'NOT_SELECTED'
   * @param reason - Razón de la decisión (opcional)
   * @param notes - Notas adicionales internas (opcional)
   * @param token - Token JWT de autenticación
   * @returns Confirmación con el nuevo estado
   * 
   * @example
   * await selectionService.setFinalDecision('app-uuid', 'SELECTED', 'Excelente candidato', '', token);
   */
  async setFinalDecision(
    applicationId: string,
    status: 'SELECTED' | 'NOT_SELECTED',
    reason?: string,
    notes?: string,
    token?: string
  ): Promise<{ success: boolean; status: string }> {
    const response = await axios.patch(
      `${API_URL}/selection/application/${applicationId}/final-decision`,
      { status, reason, notes },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Obtiene detalles completos de un postulante incluyendo historial de hitos.
   * Muestra estado de revisión, notas y revisor de cada hito.
   * 
   * @param applicationId - UUID de la postulación
   * @param token - Token JWT de autenticación
   * @returns Datos de la aplicación y array de hitos con detalles
   * 
   * @example
   * const details = await selectionService.getApplicationDetails('app-uuid', token);
   * console.log(details.milestones);
   */
  async getApplicationDetails(applicationId: string, token: string): Promise<ApplicationDetails> {
    const response = await axios.get(`${API_URL}/selection/application/${applicationId}/details`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
