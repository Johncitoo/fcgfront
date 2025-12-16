/**
 * Servicio para gestión de formularios de postulantes.
 * 
 * Proporciona operaciones para:
 * - Obtener formulario activo del postulante
 * - Guardar respuestas de formularios
 * - Obtener datos de postulante
 * 
 * @module formService
 */

// frontend/src/services/formService.ts
import axios from "axios";

/** URL base del API desde variables de entorno o localhost por defecto */
const API_BASE = "http://localhost:3000/api";

/** Instancia configurada de axios con baseURL y timeout de 15 segundos */
const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

/** Tipo escalar permitido para valores de respuestas */
export type ResponseScalar = string | number | boolean | null;

/** Mapa de respuestas en el front (fieldId -> value) */
export type FrontResponses = Record<string, ResponseScalar>;

/**
 * Obtiene el formulario activo para un postulante.
 * 
 * Retorna la convocatoria activa, aplicación del postulante,
 * secciones del formulario, campos y respuestas guardadas.
 * 
 * @param applicantId - UUID del postulante
 * @returns Objeto con call, application, sections, fields, responses, documentsByField
 * @throws Error si no hay convocatoria activa o el postulante no existe
 * 
 * @example
 * const formData = await getActiveForm('applicant-uuid');
 * // { call: {...}, application: {...}, sections: [...], fields: [...], responses: {...} }
 */
export async function getActiveForm(applicantId: string) {
  console.info("API_BASE:", API_BASE); // <-- log para ver en consola del navegador
  const { data } = await api.get(`/calls/applicant/${applicantId}/form/active`);
  return data; // { call, application, sections, fields, responses, documentsByField }
}

/**
 * Guarda las respuestas del formulario como borrador.
 * 
 * Transforma el mapa de respuestas a formato de array para el backend.
 * No cambia el estado de la aplicación (sigue en DRAFT).
 * 
 * @param applicationId - UUID de la aplicación
 * @param responses - Mapa de fieldId -> valor (string, number, boolean o null)
 * @returns Objeto con cantidad de respuestas actualizadas
 * @throws Error si la aplicación no existe o no tiene permisos
 * 
 * @example
 * const result = await saveForm('app-uuid', {
 *   'field-1': 'Juan',
 *   'field-2': 25,
 *   'field-3': true
 * });
 * // { updated: 3 }
 */
export async function saveForm(applicationId: string, responses: FrontResponses) {
  // Transformamos el mapa a arreglo [{fieldId, value}]
  const payload = {
    responses: Object.entries(responses).map(([fieldId, value]) => ({
      fieldId,
      value,
    })),
  };

  const { data } = await api.patch(
    `/calls/applicant/application/${applicationId}/save`,
    payload
  );

  return data; // p.ej. { updated: number }
}

/**
 * Obtiene los datos completos de un postulante.
 * 
 * @param applicantId - UUID del postulante
 * @returns Datos del applicant: first_name, last_name, full_name, email, phone, RUT, etc.
 * @throws Error si el postulante no existe
 * 
 * @example
 * const applicant = await getApplicant('applicant-uuid');
 * // { id: '...', first_name: 'Juan', last_name: 'Pérez', email: '...', ... }
 */
export async function getApplicant(applicantId: string) {
  const { data } = await api.get(`/applicants/${applicantId}`);
  return data; // debería traer first_name, last_name, full_name, etc.
}

