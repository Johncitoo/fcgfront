import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://fcgback-production.up.railway.app/api';

export interface FormSubmission {
  id: string;
  applicationId: string;
  formId?: string;
  milestoneId?: string;
  formData: Record<string, any>;
  submittedAt?: string;
  submittedBy?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const formSubmissionsService = {
  async create(data: {
    applicationId: string;
    formId?: string;
    milestoneId?: string;
    formData: Record<string, any>;
  }, token: string): Promise<FormSubmission> {
    const response = await axios.post(`${API_URL}/form-submissions`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getByApplication(applicationId: string, token: string): Promise<FormSubmission[]> {
    const response = await axios.get(`${API_URL}/form-submissions/application/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getByMilestone(milestoneId: string, token: string): Promise<FormSubmission[]> {
    const response = await axios.get(`${API_URL}/form-submissions/milestone/${milestoneId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getById(id: string, token: string): Promise<FormSubmission> {
    const response = await axios.get(`${API_URL}/form-submissions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async update(id: string, data: { formData: Record<string, any> }, token: string): Promise<FormSubmission> {
    const response = await axios.patch(`${API_URL}/form-submissions/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async submit(id: string, userId: string, token: string): Promise<FormSubmission> {
    const response = await axios.post(
      `${API_URL}/form-submissions/${id}/submit`,
      { userId },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  async delete(id: string, token: string): Promise<void> {
    await axios.delete(`${API_URL}/form-submissions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
