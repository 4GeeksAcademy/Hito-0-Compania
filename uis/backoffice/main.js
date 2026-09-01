const API_BASE = resolveApiBase();

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const selectedFileText = document.getElementById("selected-file");
const analyzeBtn = document.getElementById("analyze-btn");
const downloadBtn = document.getElementById("download-btn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const totalsEl = document.getElementById("totals");
const byCategoryEl = document.getElementById("by-category");
const byStatusEl = document.getElementById("by-status");
const satisfactionEl = document.getElementById("satisfaction");
const invalidByRuleEl = document.getElementById("invalid-by-rule");

let currentFile = null;

setInfo(`API detectada: ${API_BASE}`);

fileInput.addEventListener("change", () => {
  currentFile = fileInput.files[0] ?? null;
  updateSelectedFile();
});

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", (event) => {
  const droppedFile = event.dataTransfer?.files?.[0] ?? null;
  if (!droppedFile) {
    return;
  }
  currentFile = droppedFile;
  const transfer = new DataTransfer();
  transfer.items.add(droppedFile);
  fileInput.files = transfer.files;
  updateSelectedFile();
});

analyzeBtn.addEventListener("click", async () => {
  if (!currentFile) {
    setError("Selecciona un fichero CSV antes de analizar.");
    return;
  }

  setInfo("Analizando incidencias...");
  const formData = new FormData();
  formData.append("file", currentFile);

  try {
    const response = await fetch(`${API_BASE}/api/incidents/analyze`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || "No fue posible analizar el CSV.");
    }

    renderSummary(payload.summary);
    setOk(`Análisis completado (${payload.analyzed_at}).`);
    downloadBtn.disabled = false;
  } catch (error) {
    setError(error.message);
  }
});

downloadBtn.addEventListener("click", async () => {
  try {
    const response = await fetch(`${API_BASE}/api/incidents/results/export`, {
      credentials: "include",
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.detail || "No fue posible descargar el CSV.");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "incidents-results.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setOk("Descarga completada.");
  } catch (error) {
    setError(error.message);
  }
});

function updateSelectedFile() {
  selectedFileText.textContent = currentFile
    ? `Fichero seleccionado: ${currentFile.name}`
    : "Ningún fichero seleccionado.";
}

function renderSummary(summary) {
  resultsEl.classList.remove("hidden");
  totalsEl.innerHTML = "";

  Object.entries(summary.totals).forEach(([key, value]) => {
    const card = document.createElement("article");
    card.className = "kpi";
    card.innerHTML = `<p>${escapeHtml(key)}</p><p class="value">${escapeHtml(String(value))}</p>`;
    totalsEl.appendChild(card);
  });

  byCategoryEl.innerHTML = toKeyValue(summary.breakdowns.by_category);
  byStatusEl.innerHTML = toKeyValue(summary.breakdowns.by_status);
  invalidByRuleEl.innerHTML = toKeyValue(summary.breakdowns.invalid_by_rule);

  const satisfaction = summary.kpis.avg_satisfaction_closed;
  satisfactionEl.textContent =
    satisfaction === null ? "Sin puntuaciones disponibles en cerrados." : String(satisfaction);
}

function toKeyValue(values) {
  const cells = Object.entries(values)
    .map(
      ([key, value]) =>
        `<div>${escapeHtml(String(key))}</div><div><strong>${escapeHtml(String(value))}</strong></div>`
    )
    .join("");
  return `<div class="kv">${cells}</div>`;
}

function setInfo(message) {
  statusEl.classList.remove("error");
  statusEl.textContent = message;
}

function setOk(message) {
  statusEl.classList.remove("error");
  statusEl.textContent = message;
}

function setError(message) {
  statusEl.classList.add("error");
  statusEl.textContent = message;
}

function resolveApiBase() {
  const params = new URLSearchParams(window.location.search);
  const explicitBase = params.get("apiBase");
  if (explicitBase) {
    return explicitBase.replace(/\/$/, "");
  }

  const { protocol, hostname, port, origin } = window.location;

  if (hostname === "127.0.0.1" || hostname === "localhost") {
    return `${protocol}//${hostname}:8000`;
  }

  if (port === "8080") {
    return `${protocol}//${hostname}:8000`;
  }

  if (origin.includes("-8080.")) {
    return origin.replace("-8080.", "-8000.");
  }

  return `${protocol}//${hostname}:8000`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
