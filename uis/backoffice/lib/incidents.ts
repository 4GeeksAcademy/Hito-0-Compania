import { clearSession, getApiBase, getAuthToken } from "./auth";

export type Incident = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  origin: string;
  branch: string;
  created_at: string;
  updated_at: string;
};

export type IncidentTriageSuggestion = {
  summary: string;
  priority: "low" | "medium" | "high" | "urgent";
  suggested_category: "queja" | "solicitud" | "fallo_operativo";
  next_step: string;
  draft_reply: string;
  rationale: string;
};

export type IncidentTriageReview = {
  id: string;
  incident_id: string;
  reviewer_id: string;
  decision: "approved" | "rejected";
  created_at: string;
  suggestion: IncidentTriageSuggestion;
};

function getErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object" && "detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }
  return `La solicitud no pudo completarse (HTTP ${status}).`;
}

async function incidentRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  if (!token) {
    clearSession();
    throw new Error("Inicia sesión para continuar.");
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new Error("No se pudo conectar con la API de incidencias.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new Error(getErrorMessage(payload, response.status));
  }
  return payload as T;
}

export async function listIncidents(): Promise<Incident[]> {
  const response = await incidentRequest<{ items: Incident[] }>("/api/incidents?limit=100");
  return response.items;
}

export function triageIncident(incidentId: string): Promise<IncidentTriageSuggestion> {
  return incidentRequest<IncidentTriageSuggestion>(
    `/api/incidents/${encodeURIComponent(incidentId)}/triage`,
    { method: "POST" },
  );
}

export function listTriageReviews(incidentId: string): Promise<IncidentTriageReview[]> {
  return incidentRequest<IncidentTriageReview[]>(
    `/api/incidents/${encodeURIComponent(incidentId)}/triage/reviews`,
  );
}

export function saveTriageReview(
  incidentId: string,
  decision: IncidentTriageReview["decision"],
  suggestion: IncidentTriageSuggestion,
): Promise<IncidentTriageReview> {
  return incidentRequest<IncidentTriageReview>(
    `/api/incidents/${encodeURIComponent(incidentId)}/triage/reviews`,
    { method: "POST", body: JSON.stringify({ decision, suggestion }) },
  );
}
