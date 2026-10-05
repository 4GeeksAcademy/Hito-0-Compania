import { clearSession, getApiBase, getAuthToken } from "./auth";
import type { InventoryOrder, OrderCreate, Product, Warehouse } from "../types/inventory";

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
  if (!token) {
    clearSession();
    throw new InventoryApiError(401, "Inicia sesión para continuar.");
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("No se pudo conectar con la API de inventario.");
  }

  const payload = response.headers.get("content-type")?.includes("application/json")
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok) {
    const message = errorMessage(payload, response.status);
    if (response.status === 401) clearSession();
    throw new InventoryApiError(response.status, message);
  }
  return payload as T;
}

export async function listProducts(): Promise<Product[]> {
  const response = await inventoryRequest<{ items: Product[] }>("/inventory/products");
  return response.items;
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