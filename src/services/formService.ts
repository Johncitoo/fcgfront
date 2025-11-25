// frontend/src/services/formService.ts
import axios from "axios";

/** Usa el .env de Vite (Docker pasa VITE_API_BASE_URL="http://localhost:3000/api") */
const API_BASE = "http://localhost:3000/api";

/** Opcional: instancia de axios con baseURL y timeout */
const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

/** Tipo escalar permitido para valores de respuestas */
export type ResponseScalar = string | number | boolean | null;

/** Mapa de respuestas en el front (fieldId -> value) */
export type FrontResponses = Record<string, ResponseScalar>;

/** GET /api/calls/applicant/:applicantId/form/active */
export async function getActiveForm(applicantId: string) {
  console.info("API_BASE:", API_BASE); // <-- log para ver en consola del navegador
  const { data } = await api.get(`/calls/applicant/${applicantId}/form/active`);
  return data; // { call, application, sections, fields, responses, documentsByField }
}

/** PATCH /api/calls/applicant/application/:applicationId/save */
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

// frontend/src/services/formService.ts
export async function getApplicant(applicantId: string) {
  const { data } = await api.get(`/applicants/${applicantId}`);
  return data; // debería traer first_name, last_name, full_name, etc.
}

