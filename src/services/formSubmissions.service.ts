import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  /**
   * Crea un nuevo envío de formulario para una aplicación.
   * 
   * @param data - Datos del envío
   * @param data.applicationId - UUID de la aplicación
   * @param data.formId - UUID del formulario (opcional)
   * @param data.milestoneId - UUID del hito asociado (opcional)
   * @param data.formData - Datos JSON del formulario
   * @param token - Token JWT de autenticación
   * @returns Envío de formulario creado
   * 
   * @example
   * const submission = await formSubmissionsService.create({
   *   applicationId: 'app-uuid',
   *   formData: { field1: 'value' }
   * }, token);
   */
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

  /**
   * Obtiene todos los envíos de formularios de una aplicación.
   * 
   * @param applicationId - UUID de la aplicación
   * @param token - Token JWT de autenticación
   * @returns Array de envíos de formularios
   * 
   * @example
   * const submissions = await formSubmissionsService.getByApplication('app-uuid', token);
   */
  async getByApplication(applicationId: string, token: string): Promise<FormSubmission[]> {
    const response = await axios.get(`${API_URL}/form-submissions/application/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Obtiene todos los envíos asociados a un hito específico.
   * 
   * @param milestoneId - UUID del hito
   * @param token - Token JWT de autenticación
   * @returns Array de envíos del hito
   * 
   * @example
   * const submissions = await formSubmissionsService.getByMilestone('milestone-uuid', token);
   */
  async getByMilestone(milestoneId: string, token: string): Promise<FormSubmission[]> {
    const response = await axios.get(`${API_URL}/form-submissions/milestone/${milestoneId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Obtiene un envío de formulario específico por ID.
   * 
   * @param id - UUID del envío
   * @param token - Token JWT de autenticación
   * @returns Datos completos del envío
   * 
   * @example
   * const submission = await formSubmissionsService.getById('sub-uuid', token);
   */
  async getById(id: string, token: string): Promise<FormSubmission> {
    const response = await axios.get(`${API_URL}/form-submissions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Actualiza los datos de un envío de formulario.
   * 
   * @param id - UUID del envío
   * @param data - Datos a actualizar
   * @param data.formData - Nuevos datos JSON del formulario
   * @param token - Token JWT de autenticación
   * @returns Envío actualizado
   * 
   * @example
   * await formSubmissionsService.update('sub-uuid', { formData: { field: 'value' } }, token);
   */
  async update(id: string, data: { formData: Record<string, any> }, token: string): Promise<FormSubmission> {
    const response = await axios.patch(`${API_URL}/form-submissions/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Marca un envío de formulario como enviado oficialmente.
   * Cambia el estado y registra quién y cuándo lo envió.
   * 
   * @param id - UUID del envío
   * @param userId - UUID del usuario que envía
   * @param token - Token JWT de autenticación
   * @returns Envío actualizado con estado SUBMITTED
   * 
   * @example
   * await formSubmissionsService.submit('sub-uuid', 'user-uuid', token);
   */
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

  /**
   * Elimina un envío de formulario del sistema.
   * 
   * @param id - UUID del envío
   * @param token - Token JWT de autenticación
   * 
   * @example
   * await formSubmissionsService.delete('sub-uuid', token);
   */
  async delete(id: string, token: string): Promise<void> {
    await axios.delete(`${API_URL}/form-submissions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
