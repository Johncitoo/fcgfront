import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://fcgback-production.up.railway.app/api';

export interface Form {
  id: string;
  name: string;
  description?: string;
  version: number;
  isTemplate: boolean;
  parentFormId?: string;
  createdAt: string;
  updatedAt: string;
}

export const formsService = {
  async create(data: { name: string; description?: string; isTemplate?: boolean }, token: string): Promise<Form> {
    const response = await axios.post(`${API_URL}/forms`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async getAll(isTemplate?: boolean, token?: string): Promise<Form[]> {
    const params = isTemplate !== undefined ? { isTemplate: isTemplate.toString() } : {};
    const response = await axios.get(`${API_URL}/forms`, {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  async getById(id: string, token: string): Promise<Form> {
    const response = await axios.get(`${API_URL}/forms/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async update(id: string, data: Partial<Form>, token: string): Promise<Form> {
    const response = await axios.patch(`${API_URL}/forms/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  async delete(id: string, token: string): Promise<void> {
    await axios.delete(`${API_URL}/forms/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async createVersion(id: string, changes: Partial<Form>, token: string): Promise<Form> {
    const response = await axios.post(`${API_URL}/forms/${id}/version`, changes, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
