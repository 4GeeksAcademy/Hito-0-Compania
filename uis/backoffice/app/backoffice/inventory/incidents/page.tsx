"use client";

import { useEffect, useMemo, useState } from "react";

import {
  listIncidents,
  listTriageReviews,
  saveTriageReview,
  triageIncident,
  type Incident,
  type IncidentTriageReview,
  type IncidentTriageSuggestion,
} from "../../../../lib/incidents";
import styles from "../inventory.module.css";

const priorityLabels: Record<IncidentTriageSuggestion["priority"], string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const categoryOptions = [
  { value: "queja", label: "Queja" },
  { value: "solicitud", label: "Solicitud" },
  { value: "fallo_operativo", label: "Fallo operativo" },
];

const statusOptions = [
  { value: "open", label: "Abierta" },
  { value: "in_progress", label: "En progreso" },
  { value: "resolved", label: "Resuelta" },
  { value: "discarded", label: "Descartada" },
];

export default function IncidentTriagePage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<IncidentTriageSuggestion | null>(null);
  const [review, setReview] = useState<IncidentTriageReview | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    let active = true;
    listIncidents()
      .then((items) => {
        if (!active) return;
        setIncidents(items);
        setSelectedId(items[0]?.id ?? "");
      })
      .catch((failure: unknown) => {
        if (active) setError(failure instanceof Error ? failure.message : "No se pudieron cargar las incidencias.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const filteredIncidents = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return incidents.filter((incident) => {
      const matchesSearch = !term
        || incident.title.toLocaleLowerCase("es").includes(term)
        || incident.description.toLocaleLowerCase("es").includes(term);
      return matchesSearch
        && (!categoryFilter || incident.category === categoryFilter)
        && (!statusFilter || incident.status === statusFilter)
        && (!branchFilter || incident.branch === branchFilter);
    });
  }, [incidents, search, categoryFilter, statusFilter, branchFilter]);

  const branches = useMemo(
    () => [...new Set(incidents.map((incident) => incident.branch).filter(Boolean))].sort(),
    [incidents],
  );
  const activeSelectedId = filteredIncidents.some((incident) => incident.id === selectedId)
    ? selectedId
    : filteredIncidents[0]?.id ?? "";
  const selectedIncident = filteredIncidents.find((incident) => incident.id === activeSelectedId) ?? null;

  useEffect(() => {
    if (!activeSelectedId) {
      setReview(null);
      return;
    }
    let active = true;
    listTriageReviews(activeSelectedId)
      .then((reviews) => {
        if (active) setReview(reviews[0] ?? null);
      })
      .catch(() => {
        if (active) setReview(null);
      });
    return () => { active = false; };
  }, [activeSelectedId]);

  async function handleAnalyze() {
    if (!selectedIncident) return;
    setAnalyzing(true);
    setError("");
    setCopyStatus("");
    setResult(null);
    setReview(null);
    try {
      setResult(await triageIncident(selectedIncident.id));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo analizar la incidencia.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleReview(decision: IncidentTriageReview["decision"]) {
    if (!selectedIncident || !result) return;
    setSavingReview(true);
    setError("");
    try {
      setReview(await saveTriageReview(selectedIncident.id, decision, result));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo guardar la revisión.");
    } finally {
      setSavingReview(false);
    }
  }

  async function handleCopyReply() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.draft_reply);
      setCopyStatus("Respuesta copiada.");
    } catch {
      setCopyStatus("No se pudo copiar. Selecciona el texto para copiarlo manualmente.");
    }
  }

  return (
    <>
      <div className={styles.heading}>
        <div>
          <h1>Gestión de incidencias</h1>
          <p>Revisa una sugerencia de análisis antes de responder o actualizar el caso.</p>
        </div>
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

      <div className={styles.triageGrid}>
        <section className={styles.triagePanel} aria-labelledby="triage-incident-heading">
          <h2 id="triage-incident-heading">Incidencia</h2>
          {loading ? <p className={styles.loading} role="status">Cargando incidencias...</p> : null}
          {!loading && incidents.length === 0 && !error ? <p className={styles.emptyState}>No hay incidencias para analizar.</p> : null}
          {!loading && incidents.length > 0 ? (
            <div className={styles.form}>
              <div className={styles.triageFilters}>
                <label htmlFor="incident-search">Buscar incidencia
                  <input id="incident-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título o descripción" />
                </label>
                <label htmlFor="incident-category-filter">Tipo
                  <select id="incident-category-filter" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                    <option value="">Todos los tipos</option>
                    {categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label htmlFor="incident-status-filter">Estado
                  <select id="incident-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="">Todos los estados</option>
                    {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label htmlFor="incident-branch-filter">Sede
                  <select id="incident-branch-filter" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
                    <option value="">Todas las sedes</option>
                    {branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                  </select>
                </label>
              </div>
              <p className={styles.triageFilterCount} aria-live="polite">{filteredIncidents.length} de {incidents.length} incidencias</p>
              {filteredIncidents.length === 0 ? <p className={styles.emptyState}>No hay incidencias que coincidan con estos filtros.</p> : null}
              <label htmlFor="incident-select">Incidencia para analizar
                <select id="incident-select" value={activeSelectedId} onChange={(event) => { setSelectedId(event.target.value); setResult(null); setReview(null); setCopyStatus(""); }}>
                  {filteredIncidents.map((incident) => (
                    <option key={incident.id} value={incident.id}>
                      {incident.title} · {incident.category} · {incident.status}
                    </option>
                  ))}
                </select>
              </label>
              {selectedIncident ? (
                <div className={styles.triageDetails}>
                  <p><strong>Categoría:</strong> {selectedIncident.category}</p>
                  <p><strong>Origen:</strong> {selectedIncident.origin} · {selectedIncident.branch}</p>
                  <p>{selectedIncident.description}</p>
                </div>
              ) : null}
              <button className={styles.button} type="button" disabled={!selectedIncident || analyzing} onClick={handleAnalyze}>
                {analyzing ? "Analizando..." : "Analizar incidencia"}
              </button>
            </div>
          ) : null}
          <p className={styles.triageNotice}>La IA solo propone. No cambia el estado ni guarda la sugerencia.</p>
        </section>

        <section className={styles.triagePanel} aria-labelledby="triage-result-heading" aria-live="polite">
          <div className={styles.triageResultHeader}>
            <h2 id="triage-result-heading">Sugerencia</h2>
            {result ? <span className={`${styles.triagePriority} ${styles[`priority_${result.priority}`]}`}>{priorityLabels[result.priority]}</span> : null}
          </div>
          {!result && !analyzing ? <p className={styles.emptyState}>El análisis aparecerá aquí para que puedas revisarlo.</p> : null}
          {analyzing ? <p className={styles.loading} role="status">Analizando la incidencia...</p> : null}
          {result ? (
            <div className={styles.triageResult}>
              <div><h3>Resumen</h3><p>{result.summary}</p></div>
              <div><h3>Categoría sugerida</h3><p>{result.suggested_category}</p></div>
              <div><h3>Siguiente paso</h3><p>{result.next_step}</p></div>
              <div><h3>Motivo</h3><p>{result.rationale}</p></div>
              <div className={styles.triageReply}>
                <div className={styles.triageResultHeader}>
                  <h3>Borrador de respuesta</h3>
                  <button className={styles.triageCopyButton} type="button" onClick={handleCopyReply}>Copiar</button>
                </div>
                <p>{result.draft_reply}</p>
                {copyStatus ? <p className={styles.muted} role="status">{copyStatus}</p> : null}
              </div>
              {review ? (
                <p className={review.decision === "approved" ? styles.success : styles.warning} role="status">
                  Sugerencia {review.decision === "approved" ? "aprobada" : "descartada"} el {new Date(review.created_at).toLocaleString("es-ES")}.
                </p>
              ) : (
                <div className={styles.triageReviewActions}>
                  <p className={styles.muted}>Registra tu decisión para dejar trazabilidad.</p>
                  <div className={styles.actions}>
                    <button className={styles.button} type="button" disabled={savingReview} onClick={() => handleReview("approved")}>
                      {savingReview ? "Guardando..." : "Aprobar sugerencia"}
                    </button>
                    <button className={styles.triageCopyButton} type="button" disabled={savingReview} onClick={() => handleReview("rejected")}>
                      Descartar sugerencia
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}