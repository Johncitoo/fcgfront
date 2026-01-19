import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  /**
   * Crea un nuevo formulario en el sistema.
   * 
   * @param data - Datos del formulario
   * @param data.name - Nombre del formulario
   * @param data.description - Descripción opcional
   * @param data.isTemplate - Si es plantilla reutilizable
   * @param token - Token JWT de autenticación
   * @returns Formulario creado con ID asignado
   * 
   * @example
   * const form = await formsService.create({ name: 'Formulario 2025' }, token);
   */
  async create(data: { name: string; description?: string; isTemplate?: boolean }, token: string): Promise<Form> {
    const response = await axios.post(`${API_URL}/forms`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Obtiene lista de formularios con filtro opcional.
   * 
   * @param isTemplate - Filtrar por plantillas (true) o formularios normales (false)
   * @param token - Token JWT de autenticación (opcional)
   * @returns Array de formularios
   * 
   * @example
   * const templates = await formsService.getAll(true, token);
   */
  async getAll(isTemplate?: boolean, token?: string): Promise<Form[]> {
    const params = isTemplate !== undefined ? { isTemplate: isTemplate.toString() } : {};
    const response = await axios.get(`${API_URL}/forms`, {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  },

  /**
   * Obtiene un formulario específico por ID.
   * 
   * @param id - UUID del formulario
   * @param token - Token JWT de autenticación
   * @returns Datos completos del formulario
   * 
   * @example
   * const form = await formsService.getById('form-uuid', token);
   */
  async getById(id: string, token: string): Promise<Form> {
    const response = await axios.get(`${API_URL}/forms/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Actualiza un formulario con datos parciales.
   * 
   * @param id - UUID del formulario
   * @param data - Datos a actualizar (parciales)
   * @param token - Token JWT de autenticación
   * @returns Formulario actualizado
   * 
   * @example
   * await formsService.update('form-uuid', { name: 'Nuevo nombre' }, token);
   */
  async update(id: string, data: Partial<Form>, token: string): Promise<Form> {
    const response = await axios.patch(`${API_URL}/forms/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  /**
   * Elimina un formulario del sistema.
   * 
   * @param id - UUID del formulario
   * @param token - Token JWT de autenticación
   * 
   * @example
   * await formsService.delete('form-uuid', token);
   */
  async delete(id: string, token: string): Promise<void> {
    await axios.delete(`${API_URL}/forms/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  /**
   * Crea una nueva versión de un formulario existente.
   * Incrementa el número de versión automáticamente.
   * 
   * @param id - UUID del formulario original
   * @param changes - Cambios a aplicar en la nueva versión
   * @param token - Token JWT de autenticación
   * @returns Nueva versión del formulario
   * 
   * @example
   * const v2 = await formsService.createVersion('form-uuid', { name: 'Form v2' }, token);
   */
  async createVersion(id: string, changes: Partial<Form>, token: string): Promise<Form> {
    const response = await axios.post(`${API_URL}/forms/${id}/version`, changes, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
