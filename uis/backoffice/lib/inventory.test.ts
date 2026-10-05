import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { createInboundOrder, createOutboundOrder, getProduct, InventoryApiError, listOrders, listProducts } from "./inventory";
import { login } from "./auth";

const tokens = new Map<string, string>();
const redirects: string[] = [];

beforeEach(() => {
  tokens.clear();
  redirects.length = 0;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { protocol: "http:", hostname: "localhost", assign: (path: string) => redirects.push(path) },
      localStorage: {
        getItem: (key: string) => tokens.get(key) ?? null,
        setItem: (key: string, value: string) => tokens.set(key, value),
        removeItem: (key: string) => tokens.delete(key),
      },
    },
  });
});

test("el login usa el proxy del mismo origen y guarda el token", async () => {
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: async (url: string, options: RequestInit) => {
    assert.equal(url, "/api/auth/login");
    assert.equal(new URLSearchParams(String(options.body)).get("username"), "admin@test.com");
    return Response.json({ access_token: "jwt" });
  } });
  await login("admin@test.com", "admin123");
  assert.equal(tokens.get("auth_token"), "jwt");
});

test("la respuesta {items} llega al catálogo con Bearer", async () => {
  tokens.set("auth_token", "jwt");
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: async (url: string, options: RequestInit) => {
    assert.equal(url, "/api/inventory/products");
    assert.equal((options.headers as Record<string, string>).Authorization, "Bearer jwt");
    return Response.json({ items: [{ id: 3, name: "EcoBottle Pro", current_stock: 12 }] });
  } });
  assert.equal((await listProducts())[0].current_stock, 12);
});

test("el stock se consulta para el producto y almacén seleccionados", async () => {
  tokens.set("auth_token", "jwt");
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: async (url: string) => {
    assert.equal(url, "/api/inventory/products/3?warehouse=Los%20Angeles");
    return Response.json({ id: 3, current_stock: 8 });
  } });
  assert.equal((await getProduct(3, "Los Angeles")).current_stock, 8);
});

test("las órdenes envían product_id, cantidad y almacén reales", async () => {
  tokens.set("auth_token", "jwt");
  const payload = { product_id: 3, quantity: 2, warehouse: "Zaragoza" as const, notes: null };
  const paths: string[] = [];
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: async (url: string, options: RequestInit) => {
    paths.push(url);
    assert.deepEqual(JSON.parse(String(options.body)), payload);
    assert.equal((options.headers as Record<string, string>).Authorization, "Bearer jwt");
    return Response.json({ id: 5, ...payload }, { status: 201 });
  } });
  await createInboundOrder(payload);
  await createOutboundOrder(payload);
  assert.deepEqual(paths, ["/api/inventory/orders/inbound", "/api/inventory/orders/outbound"]);
});

test("un 400 de stock mantiene el mensaje y código de la API", async () => {
  tokens.set("auth_token", "jwt");
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: async () => Response.json({ detail: "Stock insuficiente" }, { status: 400 }) });
  await assert.rejects(createOutboundOrder({ product_id: 3, quantity: 200, warehouse: "Zaragoza", notes: null }),
    (error: unknown) => error instanceof InventoryApiError && error.status === 400 && error.message === "Stock insuficiente");
});

test("un 500 HTML muestra mensaje legible", async () => {
  tokens.set("auth_token", "jwt");
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: async () => new Response("error", { status: 500, headers: { "content-type": "text/html" } }) });
  await assert.rejects(listOrders(), /HTTP 500/);
});

test("un 401 elimina el token y redirige al login", async () => {
  tokens.set("auth_token", "jwt");
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: async () => Response.json({ detail: "Token expirado" }, { status: 401 }) });
  await assert.rejects(listProducts(), /Token expirado/);
  assert.equal(tokens.has("auth_token"), false);
  assert.deepEqual(redirects, ["/login"]);
});