import { clearSession, getApiBase, getAuthToken } from "./auth";
import type { InventoryOrder, OrderCreate, PickingTask, PickingTaskCreate, Product, ProductCreate, Warehouse } from "../types/inventory";

const cacheDuration = 15_000;
const cachedPaths = new Set(["/inventory/products", "/inventory/orders", "/inventory/picking/tasks"]);
const responseCache = new Map<string, { value: unknown; expiresAt: number }>();
let cacheToken: string | null = null;
let cacheVersion = 0;

function clearInventoryCache(): void {
  responseCache.clear();
  cacheVersion += 1;
}

export class InventoryApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "InventoryApiError";
  }
}

function errorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = payload.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const messages = detail.map((item) => item?.msg).filter((message): message is string => typeof message === "string");
      if (messages.length) return messages.join("; ");
    }
  }
  return `La solicitud no pudo completarse (HTTP ${status}).`;
}

async function inventoryRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  if (token !== cacheToken) {
    clearInventoryCache();
    cacheToken = token;
  }
  if (!token) {
    clearSession();
    throw new InventoryApiError(401, "Inicia sesión para continuar.");
  }

  const isMutation = (init.method || "GET").toUpperCase() !== "GET";
  if (isMutation) clearInventoryCache();
  const version = cacheVersion;
  const cached = cachedPaths.has(path) && !isMutation ? responseCache.get(path) : undefined;
  if (cached && cached.expiresAt > Date.now()) return cached.value as T;

  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${token}` },
    });
  } catch {
    if (isMutation) clearInventoryCache();
    throw new Error("No se pudo conectar con la API de inventario.");
  }
  if (isMutation) clearInventoryCache();

  const payload = response.headers.get("content-type")?.includes("application/json")
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok) {
    const message = errorMessage(payload, response.status);
    if (response.status === 401) {
      clearInventoryCache();
      clearSession();
    }
    throw new InventoryApiError(response.status, message);
  }
  if (!isMutation && cachedPaths.has(path) && version === cacheVersion && token === getAuthToken()) {
    responseCache.set(path, { value: payload, expiresAt: Date.now() + cacheDuration });
  }
  return payload as T;
}

export async function listProducts(): Promise<Product[]> {
  const response = await inventoryRequest<{ items: Product[] }>("/inventory/products");
  return response.items;
}

export function createProduct(product: ProductCreate): Promise<Product> {
  return inventoryRequest<Product>("/inventory/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export function getProduct(id: number, warehouse: Warehouse): Promise<Product> {
  return inventoryRequest<Product>(`/inventory/products/${id}?warehouse=${encodeURIComponent(warehouse)}`);
}

export function createInboundOrder(order: OrderCreate): Promise<InventoryOrder> {
  return inventoryRequest<InventoryOrder>("/inventory/orders/inbound", {
    method: "POST", body: JSON.stringify(order),
  });
}

export function createOutboundOrder(order: OrderCreate): Promise<InventoryOrder> {
  return inventoryRequest<InventoryOrder>("/inventory/orders/outbound", {
    method: "POST", body: JSON.stringify(order),
  });
}

export function listOrders(): Promise<InventoryOrder[]> {
  return inventoryRequest<InventoryOrder[]>("/inventory/orders");
}

export function listPickingTasks(): Promise<PickingTask[]> {
  return inventoryRequest<PickingTask[]>("/inventory/picking/tasks");
}

export function createPickingTask(task: PickingTaskCreate): Promise<PickingTask> {
  return inventoryRequest<PickingTask>("/inventory/picking/tasks", {
    method: "POST",
    body: JSON.stringify(task),
  });
}

export function completePickingTask(taskId: number): Promise<PickingTask> {
  return inventoryRequest<PickingTask>(`/inventory/picking/tasks/${taskId}/complete`, { method: "POST" });
}

export function advanceDemoTracking(taskId: number): Promise<PickingTask> {
  return inventoryRequest<PickingTask>(`/inventory/picking/tasks/${taskId}/tracking-demo/advance`, { method: "POST" });
}