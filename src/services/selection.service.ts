import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://fcgback-production.up.railway.app/api';

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

export const selectionService = {
  /**
   * Obtiene todos los postulantes de una convocatoria para selección final
   */
  async getApplicantsForSelection(callId: string, token: string): Promise<ApplicantForSelection[]> {
    const response = await axios.get(`${API_URL}/selection/call/${callId}/applicants`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Establece la decisión final de un postulante
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
   * Obtiene detalles de un postulante
   */
  async getApplicationDetails(applicationId: string, token: string): Promise<ApplicationDetails> {
    const response = await axios.get(`${API_URL}/selection/application/${applicationId}/details`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
