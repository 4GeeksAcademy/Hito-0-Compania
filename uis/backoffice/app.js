function resolveApiBase() {
  const queryBase = new URLSearchParams(window.location.search).get("apiBase");
  if (queryBase) {
    return queryBase.replace(/\/$/, "");
  }

  const { protocol, hostname, port } = window.location;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:8000`;
  }

  if (hostname.endsWith(".app.github.dev")) {
    const codespacesApiHost = hostname.replace(/-\d+\.app\.github\.dev$/, "-8000.app.github.dev");
    return `${protocol}//${codespacesApiHost}`;
  }

  if (port && port !== "8000") {
    return `${protocol}//${hostname}:8000`;
  }

  return "";
}

const API_BASE = resolveApiBase();

const VALID_CATEGORIES = [
  "carrier_last_mile",
  "carrier_international",
  "warehouse_supplies",
  "packaging_materials",
  "reverse_logistics",
  "fleet_maintenance",
  "it_and_wms_software",
  "cleaning_and_facilities",
];

const countryFilter = document.getElementById("country-filter");
const categoryFilter = document.getElementById("category-filter");
const refreshBtn = document.getElementById("refresh-btn");
const suppliersBody = document.getElementById("suppliers-body");
const listFeedback = document.getElementById("list-feedback");
const supplierForm = document.getElementById("supplier-form");
const formFeedback = document.getElementById("form-feedback");
const countryInput = document.getElementById("country-input");
const currencyInput = document.getElementById("currency-input");

function showFeedback(element, message, type = "") {
  element.textContent = message;
  element.className = `feedback ${type}`.trim();
}

function mapCountryToCurrency(country) {
  return country === "Spain" ? "EUR" : "USD";
}

function buildFilters() {
  categoryFilter.innerHTML = [
    '<option value="">Todas</option>',
    ...VALID_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`),
  ].join("");
}

function readQueryParams() {
  const params = new URLSearchParams();
  const country = countryFilter.value.trim();
  const category = categoryFilter.value.trim();

  if (country.length > 0) {
    params.set("country", country);
  }

  if (category.length > 0) {
    params.set("category", category);
  }

  return params;
}

function normalizeError(errorPayload, fallback) {
  if (errorPayload?.detail) {
    if (Array.isArray(errorPayload.detail)) {
      return errorPayload.detail.map((item) => item.msg).join(" | ");
    }
    return String(errorPayload.detail);
  }
  return fallback;
}

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
    throw new Error("No se pudo conectar con la API. Intenta de nuevo en unos segundos.");
  }

  const isJson = response.headers.get("content-type")?.includes("application/json") ?? false;
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(normalizeError(payload, "La API devolvio un error."));
  }

  return payload;
}

function createRow(supplier) {
  const row = document.createElement("tr");
  const categoriesText = supplier.categories.join(", ");
  const updatedAtText = supplier.updated_at ? new Date(supplier.updated_at).toLocaleString("es-ES") : "-";
  const serviceZoneText = supplier.service_zone || "-";
  const contactEmailText = supplier.contact_email || "-";
  const notesText = supplier.notes || "-";

  row.innerHTML = `
    <td>${supplier.name}</td>
    <td>${supplier.country}</td>
    <td>${categoriesText}</td>
    <td>${supplier.rate_per_shipment}</td>
    <td>${supplier.currency}</td>
    <td><span class="badge ${supplier.status}">${supplier.status}</span></td>
    <td>${serviceZoneText}</td>
    <td>${contactEmailText}</td>
    <td>${notesText}</td>
    <td>${updatedAtText}</td>
    <td class="cell-rate-action">
      <form class="inline-action" data-rate-form="${supplier.id}">
        <input type="number" min="0.01" step="0.01" value="${supplier.rate_per_shipment}" />
        <button type="submit">Guardar</button>
      </form>
    </td>
    <td class="cell-status-action">
      <button type="button" class="action-status-btn" data-toggle-status="${supplier.id}">
        ${supplier.status === "active" ? "Suspender" : "Activar"}
      </button>
    </td>
  `;

  const rateForm = row.querySelector(`[data-rate-form="${supplier.id}"]`);
  const statusBtn = row.querySelector(`[data-toggle-status="${supplier.id}"]`);

  rateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = rateForm.querySelector("input");
    const nextRate = Number(input.value);

    try {
      await request(`/suppliers/${supplier.id}/rate`, {
        method: "PATCH",
        body: JSON.stringify({ rate_per_shipment: nextRate }),
      });
      showFeedback(listFeedback, "Tarifa actualizada correctamente.", "success");
      await loadSuppliers();
    } catch (error) {
      showFeedback(listFeedback, error.message, "error");
    }
  });

  statusBtn.addEventListener("click", async () => {
    const nextStatus = supplier.status === "active" ? "suspended" : "active";

    try {
      await request(`/suppliers/${supplier.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      showFeedback(listFeedback, "Estado actualizado correctamente.", "success");
      await loadSuppliers();
    } catch (error) {
      showFeedback(listFeedback, error.message, "error");
    }
  });

  return row;
}

function renderSuppliers(suppliers) {
  suppliersBody.innerHTML = "";

  if (suppliers.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = '<td colspan="12">No hay proveedores para el filtro seleccionado.</td>';
    suppliersBody.appendChild(emptyRow);
    return;
  }

  suppliers.forEach((supplier) => {
    suppliersBody.appendChild(createRow(supplier));
  });
}

async function loadSuppliers() {
  showFeedback(listFeedback, "Cargando proveedores...");
  try {
    const params = readQueryParams();
    const query = params.toString().length ? `?${params.toString()}` : "";
    const suppliers = await request(`/suppliers${query}`);
    renderSuppliers(suppliers);
    showFeedback(listFeedback, `Mostrando ${suppliers.length} proveedor(es).`, "success");
  } catch (error) {
    showFeedback(listFeedback, error.message, "error");
  }
}

function validateSupplierPayload(payload) {
  if (!payload.name) {
    return "El nombre es obligatorio.";
  }

  if (!payload.country || !["USA", "Spain"].includes(payload.country)) {
    return "El pais es obligatorio y debe ser USA o Spain.";
  }

  if (!Array.isArray(payload.categories) || payload.categories.length === 0) {
    return "Debes seleccionar al menos una categoria.";
  }

  if (!Number.isFinite(payload.rate_per_shipment) || payload.rate_per_shipment <= 0) {
    return "La tarifa debe ser mayor que cero.";
  }

  if (!payload.status || !["active", "suspended"].includes(payload.status)) {
    return "El estado debe ser active o suspended.";
  }

  const expectedCurrency = mapCountryToCurrency(payload.country);
  if (payload.currency !== expectedCurrency) {
    return `La moneda para ${payload.country} debe ser ${expectedCurrency}.`;
  }

  return null;
}

function bindForm() {
  countryInput.addEventListener("change", () => {
    currencyInput.value = mapCountryToCurrency(countryInput.value);
  });

  supplierForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showFeedback(formFeedback, "Registrando proveedor...");

    const selectedCategory = categoryFilter.value.trim();
    if (!selectedCategory) {
      showFeedback(formFeedback, "Selecciona una categoria arriba antes de crear el proveedor.", "error");
      return;
    }

    const formData = new FormData(supplierForm);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      country: String(formData.get("country") || ""),
      categories: [selectedCategory],
      rate_per_shipment: Number(formData.get("rate_per_shipment")),
      currency: String(formData.get("currency") || ""),
      status: String(formData.get("status") || ""),
      service_zone: String(formData.get("service_zone") || "").trim() || null,
      contact_email: String(formData.get("contact_email") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
    };

    const validationError = validateSupplierPayload(payload);
    if (validationError) {
      showFeedback(formFeedback, validationError, "error");
      return;
    }

    try {
      await request("/suppliers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showFeedback(formFeedback, "Proveedor creado correctamente.", "success");
      supplierForm.reset();
      currencyInput.value = "USD";
      await loadSuppliers();
    } catch (error) {
      showFeedback(formFeedback, error.message, "error");
    }
  });
}

function bindFilters() {
  countryFilter.addEventListener("change", loadSuppliers);
  categoryFilter.addEventListener("change", loadSuppliers);
  refreshBtn.addEventListener("click", loadSuppliers);
}

function init() {
  buildFilters();
  bindFilters();
  bindForm();
  loadSuppliers();
}

init();
