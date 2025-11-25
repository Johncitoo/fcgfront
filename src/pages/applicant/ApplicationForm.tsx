import { useEffect, useMemo, useState } from "react";
import {
  getActiveForm,
  saveForm,
  type FrontResponses,
  type ResponseScalar,
  getApplicant,
} from "../../services/formService";

// ⚠️ Solo para pruebas locales. Cámbialo por el id real del postulante cuando tengas login.
const APPLICANT_ID = "a16d51f3-bc63-405e-aeb1-8801b8779ac4";

type SectionDTO = {
  id: string;
  title: string;
  order: number;
  visible: boolean;
};

type FieldDTO = {
  id: string;
  section_id: string | null;
  name: string;
  label: string;
  type:
    | "INPUT"
    | "NUMBER"
    | "TEXTAREA"
    | "SELECT"
    | "CHECKBOX"
    | "RADIO"
    | "FILE"
    | "IMAGE"
    | "DATE"
    | "REPEATABLE_GROUP";
  required: boolean;
  options: unknown | null;
  validation: unknown | null;
  help_text: string | null;
  show_if: unknown | null;
  order: number;
  visibility: "PUBLIC" | "INTERNAL";
};

type BackendPayload = {
  call: { id: string; name: string; year: number; status: string };
  application: { id: string; status: string; submitted_at: string | null };
  sections: SectionDTO[];
  fields: FieldDTO[];
  responses: Record<string, { value: ResponseScalar }>;
  documentsByField: Record<string, unknown[]>;
};

type ApplicantDTO = {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
};

export default function ApplicationForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payload, setPayload] = useState<BackendPayload | null>(null);
  const [responses, setResponses] = useState<FrontResponses>({});
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [applicantName, setApplicantName] = useState<string>("");

  // Cargar formulario activo + nombre del postulante
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErrMsg(null);

        const [data, applicant] = await Promise.all([
          getActiveForm(APPLICANT_ID),
          getApplicant(APPLICANT_ID),
        ]);

        if (!alive) return;

        // Mapear responses backend -> FrontResponses (fieldId -> value)
        const initial: FrontResponses = {};
        for (const [fieldId, obj] of Object.entries(data.responses ?? {})) {
          initial[fieldId] = (obj as { value: ResponseScalar }).value ?? "";
        }

        const a = applicant as ApplicantDTO;
        const name =
          a.full_name?.trim() ||
          `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim();
        setApplicantName(name);

        setPayload(data as BackendPayload);
        setResponses(initial);
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Error al cargar el formulario";
        setErrMsg(message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const fieldsBySection = useMemo(() => {
    const map: Record<string, FieldDTO[]> = {};
    (payload?.fields ?? []).forEach((f) => {
      const key = f.section_id ?? "_NO_SECTION_";
      (map[key] ??= []).push(f);
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.order - b.order));
    return map;
  }, [payload]);

  function setFieldValue(
    fieldId: string,
    raw: unknown,
    kind: FieldDTO["type"]
  ) {
    let v: ResponseScalar = raw as ResponseScalar;

    if (kind === "NUMBER") {
      const n = Number(raw);
      v = Number.isFinite(n) ? n : "";
    }
    if (kind === "CHECKBOX") {
      v = Boolean(raw);
    }
    setResponses((prev: FrontResponses): FrontResponses => ({
      ...prev,
      [fieldId]: v,
    }));
  }

  async function onSaveDraft() {
    if (!payload) return;
    try {
      setSaving(true);
      setOkMsg(null);
      setErrMsg(null);
      await saveForm(payload.application.id, responses);
      setOkMsg("Borrador guardado correctamente.");
    } catch (e: unknown) {
      const message =
        (typeof e === "object" &&
        e !== null &&
        "response" in e &&
        typeof e.response === "object" &&
        e.response !== null &&
        "data" in e.response &&
        typeof e.response.data === "object" &&
        e.response.data !== null &&
        "message" in e.response.data
          ? String(e.response.data.message)
          : null) ||
        (e instanceof Error ? e.message : null) ||
        "No se pudo guardar el borrador";
      setErrMsg(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;
  if (errMsg) return <div style={{ padding: 24, color: "crimson" }}>Error: {errMsg}</div>;
  if (!payload) return <div style={{ padding: 24 }}>Sin datos</div>;

  return (
    <div style={{ maxWidth: 860, margin: "24px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
        Application Form
      </h1>

      <div style={{ marginBottom: 16, color: "#444" }}>
        {applicantName && (
          <div>
            <b>Postulante:</b> {applicantName}
          </div>
        )}
        <div>
          <b>Convocatoria:</b> {payload.call.name} ({payload.call.year})
        </div>
        <div>
          <b>Estado postulación:</b> {payload.application.status}
        </div>
      </div>

      {okMsg && (
        <div style={{ background: "#e6ffed", padding: 10, borderRadius: 8, marginBottom: 12 }}>
          {okMsg}
        </div>
      )}
      {errMsg && (
        <div style={{ background: "#ffe6e6", padding: 10, borderRadius: 8, marginBottom: 12 }}>
          {errMsg}
        </div>
      )}

      {/* Secciones visibles */}
      {(payload.sections ?? [])
        .filter((s) => s.visible)
        .sort((a, b) => a.order - b.order)
        .map((s) => {
          const fs = fieldsBySection[s.id] || [];
          if (!fs.length) return null;

          return (
            <section key={s.id} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: "16px 0" }}>
                {s.title}
              </h2>
              <div style={{ display: "grid", gap: 12 }}>
                {fs.map((f) => {
                  const current = responses[f.id] ?? "";
                  const required = f.required;

                  if (f.type === "TEXTAREA") {
                    return (
                      <label key={f.id} style={{ display: "grid", gap: 6 }}>
                        <span>
                          {f.label} {required && <em style={{ color: "crimson" }}>*</em>}
                        </span>
                        <textarea
                          value={String(current)}
                          onChange={(e) => setFieldValue(f.id, e.target.value, f.type)}
                          rows={4}
                          style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
                        />
                        {f.help_text && <small style={{ color: "#666" }}>{f.help_text}</small>}
                      </label>
                    );
                  }

                  if (f.type === "NUMBER") {
                    return (
                      <label key={f.id} style={{ display: "grid", gap: 6 }}>
                        <span>
                          {f.label} {required && <em style={{ color: "crimson" }}>*</em>}
                        </span>
                        <input
                          type="number"
                          value={current as number | string}
                          onChange={(e) => setFieldValue(f.id, e.target.value, f.type)}
                          style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
                        />
                        {f.help_text && <small style={{ color: "#666" }}>{f.help_text}</small>}
                      </label>
                    );
                  }

                  if (f.type === "DATE") {
                    return (
                      <label key={f.id} style={{ display: "grid", gap: 6 }}>
                        <span>
                          {f.label} {required && <em style={{ color: "crimson" }}>*</em>}
                        </span>
                        <input
                          type="date"
                          value={String(current)}
                          onChange={(e) => setFieldValue(f.id, e.target.value, f.type)}
                          style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
                        />
                        {f.help_text && <small style={{ color: "#666" }}>{f.help_text}</small>}
                      </label>
                    );
                  }

                  // INPUT por defecto
                  return (
                    <label key={f.id} style={{ display: "grid", gap: 6 }}>
                      <span>
                        {f.label} {required && <em style={{ color: "crimson" }}>*</em>}
                      </span>
                      <input
                        type="text"
                        value={String(current)}
                        onChange={(e) => setFieldValue(f.id, e.target.value, f.type)}
                        style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
                      />
                      {f.help_text && <small style={{ color: "#666" }}>{f.help_text}</small>}
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}

      <div style={{ marginTop: 16 }}>
        <button
          onClick={onSaveDraft}
          disabled={saving}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            background: "#2563eb",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {saving ? "Guardando..." : "Save Draft"}
        </button>
      </div>
    </div>
  );
}