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
  startedAt?: string;
  completedAt?: string;
}

export interface ProgressSummary {
  total: number;
  completed: number;
  pending: number;
  percentage: number;
  currentMilestone: MilestoneProgress | null;
}

export const milestonesService = {
  async create(data: Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>, token: string): Promise<Milestone> {
    const response = await axios.post(`${API_URL}/milestones`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getByCall(callId: string, token: string): Promise<Milestone[]> {
    const response = await axios.get(`${API_URL}/milestones/call/${callId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getById(id: string, token: string): Promise<Milestone> {
    const response = await axios.get(`${API_URL}/milestones/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async update(id: string, data: Partial<Milestone>, token: string): Promise<Milestone> {
    const response = await axios.patch(`${API_URL}/milestones/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async delete(id: string, token: string): Promise<void> {
    await axios.delete(`${API_URL}/milestones/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async getProgress(applicationId: string, token: string): Promise<{ progress: MilestoneProgress[]; summary: ProgressSummary }> {
    const response = await axios.get(`${API_URL}/milestones/progress/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

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
