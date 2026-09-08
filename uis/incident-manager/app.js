/**
 * Incident Manager — TrackFlow
 * Handles incident creation, listing, status transitions, and summary.
 */

// ── API base ──────────────────────────────────
function resolveApiBase() {
  const queryBase = new URLSearchParams(window.location.search).get("apiBase");
  if (queryBase) return queryBase.replace(/\/$/, "");

  const { protocol, hostname, port } = window.location;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:8000`;
  }

  if (hostname.endsWith(".app.github.dev")) {
    const codespacesApiHost = hostname.replace(/-\d+\.app\.github\.dev$/, "-8000.app.github.dev");
    return `${protocol}//${codespacesApiHost}`;
  }

  return "";
}

const API_BASE = resolveApiBase();

// ── DOM refs ──────────────────────────────────
const form = document.getElementById("incident-form");
const submitBtn = document.getElementById("submit-btn");
const formFeedback = document.getElementById("form-feedback");
const originSelect = document.getElementById("field-origin");
const branchWrapper = document.getElementById("branch-wrapper");
const branchHint = document.getElementById("branch-hint");

const fieldErrors = {
  title: document.getElementById("error-title"),
  description: document.getElementById("error-description"),
  category: document.getElementById("error-category"),
  origin: document.getElementById("error-origin"),
  branch: document.getElementById("error-branch"),
};

const filterStatus = document.getElementById("filter-status");
const filterOrigin = document.getElementById("filter-origin");
const filterBranch = document.getElementById("filter-branch");
const filterCategory = document.getElementById("filter-category");
const refreshBtn = document.getElementById("refresh-btn");
const incidentsBody = document.getElementById("incidents-body");
const incidentsTable = document.getElementById("incidents-table");
const listFeedback = document.getElementById("list-feedback");
const listLoading = document.getElementById("list-loading");
const listError = document.getElementById("list-error");
const listErrorMsg = document.querySelector("#list-error .list-error-msg");
const retryBtn = document.getElementById("retry-btn");
const listEmpty = document.getElementById("list-empty");
const emptySubtitle = document.getElementById("empty-subtitle");

// Pagination refs
const pagination = document.getElementById("pagination");
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");
const pageInfo = document.getElementById("page-info");

// ── Pagination state ──────────────────────────
let currentPage = 1;
let totalPages = 1;
const PAGE_SIZE = 10;

// Summary refs
const summaryLoading = document.getElementById("summary-loading");
const summaryError = document.getElementById("summary-error");
const summaryEmpty = document.getElementById("summary-empty");
const summaryContent = document.getElementById("summary-content");
const summaryRetryBtn = document.getElementById("summary-retry-btn");
const summaryTotal = document.getElementById("summary-total");
const summaryOpen = document.getElementById("summary-open");
const summaryInProgress = document.getElementById("summary-in_progress");
const summaryResolved = document.getElementById("summary-resolved");
const summaryDiscarded = document.getElementById("summary-discarded");
const summaryByCategory = document.getElementById("summary-by-category");
const summaryByOrigin = document.getElementById("summary-by-origin");
const summaryByBranch = document.getElementById("summary-by-branch");

// ── Helpers ───────────────────────────────────
function showFeedback(element, message, type = "") {
  element.textContent = message;
  element.className = `feedback ${type}`.trim();
}

function clearFieldErrors() {
  Object.values(fieldErrors).forEach((el) => {
    el.textContent = "";
  });
}

function setFieldError(fieldName, message) {
  const el = fieldErrors[fieldName];
  if (el) {
    el.textContent = message;
  }
}

/**
 * Parse a field name from a Pydantic error location path like "body -> title".
 * Returns the form field name or null if it can't be matched.
 */
function parseFieldName(locationStr) {
  // Pydantic error locations: "body -> title", "body -> category", etc.
  const parts = locationStr.split("->").map((s) => s.trim());
  const candidate = parts[parts.length - 1];
  const knownFields = ["title", "description", "category", "origin", "branch"];
  return knownFields.includes(candidate) ? candidate : null;
}

/**
 * Normalize an API error into a user-friendly message string.
 * Returns { message, fieldErrors: { fieldName: msg } }
 */
function normalizeError(errorPayload) {
  const result = { message: "Error al procesar la solicitud.", fieldErrors: {} };

  if (!errorPayload) return result;

  // Case 1: Array of { field, message } from our custom validation handler
  if (Array.isArray(errorPayload.detail)) {
    const userMessages = [];
    for (const item of errorPayload.detail) {
      const rawMsg = item.message || "";
      const field = parseFieldName(item.field) || null;

      if (field) {
        result.fieldErrors[field] = rawMsg;
      }
      userMessages.push(rawMsg);
    }
    result.message = userMessages.join(" | ");
    return result;
  }

  // Case 2: Plain string detail (HTTPException)
  if (typeof errorPayload.detail === "string") {
    result.message = errorPayload.detail;
    return result;
  }

  return result;
}

// ── HTTP client ───────────────────────────────
async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.");
  }

  const isJson = response.headers.get("content-type")?.includes("application/json") ?? false;
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const normalized = normalizeError(payload);
    // Attach field errors to the error object so the caller can use them
    const err = new Error(normalized.message);
    err.fieldErrors = normalized.fieldErrors;
    throw err;
  }

  return payload;
}

// ── Origin → branch highlight ─────────────────
function updateBranchHighlight() {
  const origin = originSelect.value;
  if (origin === "branch") {
    branchWrapper.classList.add("highlight");
    branchHint.classList.add("visible");
  } else {
    branchWrapper.classList.remove("highlight");
    branchHint.classList.remove("visible");
  }
}

originSelect.addEventListener("change", updateBranchHighlight);

// ── Client-side form validation ───────────────
function validateForm() {
  const values = {
    title: document.getElementById("field-title").value.trim(),
    description: document.getElementById("field-description").value.trim(),
    category: document.getElementById("field-category").value,
    origin: document.getElementById("field-origin").value,
    branch: document.getElementById("field-branch").value,
  };

  const errors = {};

  if (!values.title) {
    errors.title = "El título es obligatorio.";
  }
  if (!values.description) {
    errors.description = "La descripción es obligatoria.";
  }
  if (!values.category) {
    errors.category = "Selecciona una categoría.";
  }
  if (!values.origin) {
    errors.origin = "Selecciona un origen.";
  }
  // La sede solo es obligatoria cuando el origen es "branch"
  if (values.origin === "branch" && !values.branch) {
    errors.branch = "Indica la sede desde la que se reporta.";
  }

  return { values, errors };
}

// ── Form submission ───────────────────────────
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFieldErrors();
  showFeedback(formFeedback, "");

  // 1. Validación en el cliente ANTES de enviar
  const { values, errors } = validateForm();

  if (Object.keys(errors).length > 0) {
    for (const [field, msg] of Object.entries(errors)) {
      setFieldError(field, msg);
    }
    showFeedback(
      formFeedback,
      "❌ Revisa los campos marcados antes de enviar.",
      "error"
    );
    return;
  }

  submitBtn.disabled = true;
  submitBtn.classList.add("loading");

  const payload = { ...values };

  try {
    await request("/api/incidents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showFeedback(formFeedback, "✅ Incidencia registrada correctamente.", "success");
    form.reset();
    updateBranchHighlight();
    currentPage = 1; // volver a la primera página para ver la nueva incidencia
    await loadIncidents();
    await loadSummary();
  } catch (error) {
    // Show field-level errors next to the corresponding field
    if (error.fieldErrors) {
      for (const [field, msg] of Object.entries(error.fieldErrors)) {
        setFieldError(field, msg);
      }
    }
    // Show a user-friendly general message
    const userMsg = error.message || "Ocurrió un error inesperado. Intenta de nuevo.";
    showFeedback(formFeedback, `❌ ${userMsg}`, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
  }
});

// ── Listado: utilidades de estado ─────────────
function setListState(state) {
  // state: "loading" | "error" | "empty" | "table"
  incidentsTable.hidden = state !== "table";
  listLoading.hidden = state !== "loading";
  listError.hidden = state !== "error";
  listEmpty.hidden = state !== "empty";
  pagination.hidden = state !== "table";
  listFeedback.textContent = "";
  listFeedback.className = "feedback";
}

/**
 * Render the pagination controls (prev/next buttons + page info).
 * Hides the pagination bar entirely when there's only one page.
 */
function renderPagination() {
  if (totalPages <= 1) {
    pagination.hidden = true;
    return;
  }
  pagination.hidden = false;
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

function currentFilterSummary() {
  const labels = [];
  if (filterStatus.value) labels.push(`estado "${filterStatus.value}"`);
  if (filterOrigin.value) labels.push(`origen "${filterOrigin.value}"`);
  if (filterBranch.value) labels.push(`sede "${filterBranch.value}"`);
  if (filterCategory.value) labels.push(`categoría "${filterCategory.value}"`);
  return labels.join(", ");
}

function hasActiveFilters() {
  return Boolean(
    filterStatus.value ||
      filterOrigin.value ||
      filterBranch.value ||
      filterCategory.value
  );
}

// ── Load incidents list ───────────────────────
async function loadIncidents() {
  setListState("loading");

  const params = new URLSearchParams();
  const status = filterStatus.value;
  const origin = filterOrigin.value;
  const branch = filterBranch.value;
  const category = filterCategory.value;

  if (status) params.set("status", status);
  if (origin) params.set("origin", origin);
  if (branch) params.set("branch", branch);
  if (category) params.set("category", category);

  // Pagination
  const skip = (currentPage - 1) * PAGE_SIZE;
  params.set("skip", String(skip));
  params.set("limit", String(PAGE_SIZE));

  const query = params.toString().length ? `?${params.toString()}` : "";

  try {
    const data = await request(`/api/incidents${query}`);
    totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
    renderIncidents(data.items, data.total);
  } catch (error) {
    // La tabla nunca queda en blanco: mostramos error + botón de reintento
    listErrorMsg.textContent = error.message || "No se pudieron cargar las incidencias.";
    setListState("error");
  }
}

// ── Render incidents table ────────────────────
function renderIncidents(incidents, total) {
  if (incidents.length === 0) {
    // Mensaje informativo contextual (nunca una tabla vacía sin contexto)
    if (hasActiveFilters()) {
      emptySubtitle.textContent = `No hay incidencias para los filtros aplicados (${currentFilterSummary()}). Prueba a ajustarlos.`;
    } else {
      emptySubtitle.textContent =
        "Todavía no hay incidencias registradas. Usa el formulario para registrar la primera.";
    }
    setListState("empty");
    return;
  }

  incidentsBody.innerHTML = "";

  incidents.forEach((inc) => {
    const row = document.createElement("tr");
    const createdAt = inc.created_at
      ? new Date(inc.created_at).toLocaleString("es-ES")
      : "-";
    const updatedAt = inc.updated_at
      ? new Date(inc.updated_at).toLocaleString("es-ES")
      : "-";

    const statusLabels = {
      open: "Abierta",
      in_progress: "En progreso",
      resolved: "Resuelta",
      discarded: "Descartada",
    };

    row.innerHTML = `
      <td>${escHtml(inc.title)}</td>
      <td><span class="badge ${inc.status}" data-status-badge>${statusLabels[inc.status] || inc.status}</span></td>
      <td>${categoryLabel(inc.category)}</td>
      <td>${originLabel(inc.origin)}</td>
      <td>${branchLabel(inc.branch)}</td>
      <td>${createdAt}</td>
      <td>${updatedAt}</td>
      <td class="cell-status-action">
        <div class="action-group" data-incident-id="${inc.id}"></div>
      </td>
    `;

    const actionGroup = row.querySelector(".action-group");
    renderStatusActions(actionGroup, inc);

    incidentsBody.appendChild(row);
  });

  setListState("table");
  renderPagination();

  // Rango mostrado en esta página (ej: "Mostrando 1-10 de 82 incidencias.")
  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, total);
  showFeedback(
    listFeedback,
    `Mostrando ${start}-${end} de ${total} incidencia(s).`,
    "success"
  );
}

function escHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function categoryLabel(cat) {
  const labels = { queja: "Queja", solicitud: "Solicitud", fallo_operativo: "Fallo operativo" };
  return labels[cat] || cat;
}

function originLabel(origin) {
  const labels = { customer: "Cliente", branch: "Sede", internal: "Interno" };
  return labels[origin] || origin;
}

function branchLabel(branch) {
  const labels = {
    "Los Angeles": "Los Ángeles",
    Zaragoza: "Zaragoza",
    central: "Central / Oficina Principal",
    "US Central": "US Central",
    "Spain Central": "Spain Central",
  };
  return labels[branch] || branch;
}

// ── Status transition actions ─────────────────
const TRANSITIONS = {
  open: [
    { to: "in_progress", label: "Iniciar", cssClass: "approve" },
    { to: "discarded", label: "Descartar", cssClass: "discard" },
  ],
  in_progress: [
    { to: "resolved", label: "Resolver", cssClass: "approve" },
    { to: "discarded", label: "Descartar", cssClass: "discard" },
  ],
};

const STATUS_LABELS = {
  open: "Abierta",
  in_progress: "En progreso",
  resolved: "Resuelta",
  discarded: "Descartada",
};

/**
 * Apply a visual status update to a single row (optimistic).
 * Mutates the DOM badge and action-group directly.
 */
function applyStatusToRow(actionGroupEl, newStatus) {
  const row = actionGroupEl.closest("tr");
  if (!row) return;

  // Update badge
  const badge = row.querySelector("[data-status-badge]");
  if (badge) {
    badge.textContent = STATUS_LABELS[newStatus] || newStatus;
    badge.className = `badge ${newStatus}`;
  }

  // Re-render actions
  const actionGroup = row.querySelector(".action-group");
  if (actionGroup) {
    actionGroup.innerHTML = "";
    renderStatusActions(actionGroup, { id: actionGroup.dataset.incidentId, status: newStatus });
  }
}

/**
 * Rollback a row to its previous status after a failed update.
 */
function rollbackStatusInRow(actionGroupEl, previousStatus) {
  const row = actionGroupEl.closest("tr");
  if (!row) return;

  const badge = row.querySelector("[data-status-badge]");
  if (badge) {
    badge.textContent = STATUS_LABELS[previousStatus] || previousStatus;
    badge.className = `badge ${previousStatus}`;
  }

  const actionGroup = row.querySelector(".action-group");
  if (actionGroup) {
    actionGroup.innerHTML = "";
    renderStatusActions(actionGroup, { id: actionGroup.dataset.incidentId, status: previousStatus });
  }
}

function renderStatusActions(container, incident) {
  const allowed = TRANSITIONS[incident.status] || [];

  if (allowed.length === 0) {
    const span = document.createElement("span");
    span.className = "badge";
    span.textContent = incident.status === "resolved" ? "Finalizada" : "Descartada";
    container.appendChild(span);
    return;
  }

  allowed.forEach((action) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `action-btn ${action.cssClass}`;
    btn.textContent = action.label;

    btn.addEventListener("click", async () => {
      // Deshabilitamos todos los botones de la fila mientras se procesa
      const row = container.closest("tr");
      const allBtns = row ? row.querySelectorAll(".action-btn") : [btn];
      allBtns.forEach((b) => { b.disabled = true; });

      const previousStatus = incident.status;

      // 1. Optimistic update: cambiar visual inmediatamente
      applyStatusToRow(container, action.to);

      try {
        // 2. Confirmar en servidor
        await request(`/api/incidents/${incident.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: action.to }),
        });
        // 3. Recargar summary (los datos del servidor son la fuente de verdad)
        await loadSummary();
        showFeedback(listFeedback, `✅ Incidencia marcada como "${STATUS_LABELS[action.to]}"`, "success");
      } catch (error) {
        // 4. Rollback: restaurar estado visual anterior
        rollbackStatusInRow(container, previousStatus);
        showFeedback(listFeedback, `❌ ${error.message}`, "error");
      }
    });

    container.appendChild(btn);
  });
}

// ── Load summary ──────────────────────────────
function setSummaryState(state) {
  // state: "loading" | "error" | "empty" | "content"
  summaryContent.hidden = state !== "content";
  summaryLoading.hidden = state !== "loading";
  summaryError.hidden = state !== "error";
  summaryEmpty.hidden = state !== "empty";
}

const SUMMARY_CATEGORY_LABELS = {
  queja: "Queja",
  solicitud: "Solicitud",
  fallo_operativo: "Fallo operativo",
};

const SUMMARY_ORIGIN_LABELS = {
  customer: "Cliente",
  branch: "Sede",
  internal: "Interno",
};

const SUMMARY_BRANCH_LABELS = {
  "Los Angeles": "Los Ángeles",
  Zaragoza: "Zaragoza",
  central: "Central / Oficina Principal",
  "US Central": "US Central",
  "Spain Central": "Spain Central",
};

function renderSummaryBlock(container, data, labelMap, fallback) {
  container.innerHTML = "";

  if (!data || Object.keys(data).length === 0) {
    const emptyCard = document.createElement("div");
    emptyCard.className = "summary-card";
    emptyCard.innerHTML = `
      <span class="summary-label">Sin datos</span>
      <span class="summary-value summary-value-muted">0</span>
    `;
    container.appendChild(emptyCard);
    return;
  }

  // Mapa de color por clave (reutiliza las clases de estado como acentos suaves)
  const accentClassMap = {
    open: "status-open",
    in_progress: "status-in_progress",
    resolved: "status-resolved",
    discarded: "status-discarded",
    customer: "status-open",
    branch: "status-in_progress",
    internal: "status-discarded",
  };

  Object.entries(data).forEach(([key, value]) => {
    const card = document.createElement("div");
    card.className = `summary-card ${accentClassMap[key] || ""}`.trim();
    const label = (labelMap && labelMap[key]) || key;
    card.innerHTML = `
      <span class="summary-label">${escHtml(label)}</span>
      <span class="summary-value">${Number(value) ?? 0}</span>
    `;
    container.appendChild(card);
  });
}

async function loadSummary() {
  setSummaryState("loading");

  try {
    const data = await request("/api/incidents/summary");

    // No hay datos → estado vacío
    if (!data || data.total === 0) {
      setSummaryState("empty");
      return;
    }

    // Por estado (tarjetas fijas)
    summaryTotal.textContent = data.total ?? 0;
    summaryOpen.textContent = data.by_status?.open ?? 0;
    summaryInProgress.textContent = data.by_status?.in_progress ?? 0;
    summaryResolved.textContent = data.by_status?.resolved ?? 0;
    summaryDiscarded.textContent = data.by_status?.discarded ?? 0;

    // Por categoría / origen / sede (dinámicas)
    renderSummaryBlock(summaryByCategory, data.by_category, SUMMARY_CATEGORY_LABELS);
    renderSummaryBlock(summaryByOrigin, data.by_origin, SUMMARY_ORIGIN_LABELS);
    renderSummaryBlock(summaryByBranch, data.by_branch, SUMMARY_BRANCH_LABELS);

    setSummaryState("content");
  } catch {
    // Si falla, mostramos error con opción de reintentar, sin romper la página
    setSummaryState("error");
  }
}

// ── Filter events ─────────────────────────────
function resetPageAndReload() {
  currentPage = 1;
  loadIncidents();
}

filterStatus.addEventListener("change", resetPageAndReload);
filterOrigin.addEventListener("change", resetPageAndReload);
filterBranch.addEventListener("change", resetPageAndReload);
filterCategory.addEventListener("change", resetPageAndReload);
retryBtn.addEventListener("click", resetPageAndReload);
summaryRetryBtn.addEventListener("click", loadSummary);
refreshBtn.addEventListener("click", () => {
  filterStatus.value = "";
  filterOrigin.value = "";
  filterBranch.value = "";
  filterCategory.value = "";
  resetPageAndReload();
});

// Pagination events
prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    loadIncidents();
  }
});

nextPageBtn.addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage += 1;
    loadIncidents();
  }
});

// ── Init ──────────────────────────────────────
function init() {
  updateBranchHighlight();
  loadIncidents();
  loadSummary();
}

init();