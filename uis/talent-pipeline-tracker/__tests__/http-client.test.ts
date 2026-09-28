/**
 * Tests para http-client.ts — utilidades HTTP del frontend.
 *
 * Funciones probadas:
 *   - resolveApiBase()
 *   - getStoredToken() / storeToken() / clearToken()
 *   - handleUnauthorized()
 *   - buildAuthHeaders()
 *   - checkUnauthorized()
 *
 * Cada función: al menos camino feliz + modo de fallo.
 */
import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import {
  resolveApiBase,
  getStoredToken,
  storeToken,
  clearToken,
  handleUnauthorized,
  buildAuthHeaders,
  checkUnauthorized,
} from '../src/services/http-client.js';

beforeEach(() => {
  localStorage.clear();
  // Restaurar window.location a localhost por defecto
  Object.defineProperty(globalThis, 'window', {
    value: {
      location: { href: 'http://localhost:3000/', hostname: 'localhost', protocol: 'http:' },
    },
    writable: true,
    configurable: true,
  });
});

// ────────────────────────────────────────────────────────────────
//  resolveApiBase
// ────────────────────────────────────────────────────────────────

describe('resolveApiBase', () => {
  test('camino feliz: localhost devuelve http://localhost:8000', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          protocol: 'http:',
          hostname: 'localhost',
        },
      },
      writable: true,
      configurable: true,
    });
    expect(resolveApiBase()).toBe('http://localhost:8000');
  });

  test('modo fallo: servidor Node sin window devuelve env var', () => {
    // Simular que window no está definido
    delete (globalThis as Record<string, unknown>).window;
    process.env.NEXT_PUBLIC_AUTH_API_URL = 'https://api.example.com';
    expect(resolveApiBase()).toBe('https://api.example.com');
  });

  test('modo fallo: servidor Node sin env var devuelve string vacío', () => {
    delete (globalThis as Record<string, unknown>).window;
    delete process.env.NEXT_PUBLIC_AUTH_API_URL;
    expect(resolveApiBase()).toBe('');
  });

  test('caso límite: Codespace detecta puerto correcto', () => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          protocol: 'https:',
          hostname: 'mi-codespace-3000.app.github.dev',
        },
      },
      writable: true,
      configurable: true,
    });
    expect(resolveApiBase()).toBe('https://mi-codespace-8000.app.github.dev');
  });
});

// ────────────────────────────────────────────────────────────────
//  getStoredToken / storeToken / clearToken
// ────────────────────────────────────────────────────────────────

describe('token helpers', () => {
  test('camino feliz: storeToken guarda y getStoredToken recupera', () => {
    storeToken('mi-token-jwt');
    expect(getStoredToken()).toBe('mi-token-jwt');
  });

  test('camino feliz: clearToken elimina el token almacenado', () => {
    storeToken('algo');
    clearToken();
    expect(getStoredToken()).toBeNull();
  });

  test('modo fallo: getStoredToken sin token devuelve null', () => {
    expect(getStoredToken()).toBeNull();
  });

  test('caso límite: storeToken con string vacío', () => {
    storeToken('');
    expect(getStoredToken()).toBe('');
  });
});

// ────────────────────────────────────────────────────────────────
//  handleUnauthorized
// ────────────────────────────────────────────────────────────────

describe('handleUnauthorized', () => {
  test('camino feliz: limpia token y redirige a /login', () => {
    const hrefSetter = jest.fn();
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          set href(url: string) { hrefSetter(url); },
          get href() { return '/'; },
        },
      },
      writable: true,
      configurable: true,
    });

    storeToken('token-que-será-limpiado');
    handleUnauthorized();

    expect(getStoredToken()).toBeNull();
    expect(hrefSetter).toHaveBeenCalledWith('/login');
  });
});

// ────────────────────────────────────────────────────────────────
//  buildAuthHeaders
// ────────────────────────────────────────────────────────────────

describe('buildAuthHeaders', () => {
  test('camino feliz: con token añade Authorization Bearer', () => {
    storeToken('jwt-token');
    const headers = buildAuthHeaders();
    expect(headers['Authorization']).toBe('Bearer jwt-token');
  });

  test('camino feliz: mergea headers extra con Authorization', () => {
    storeToken('jwt-token');
    const headers = buildAuthHeaders({ 'X-Custom': 'value' });
    expect(headers['Authorization']).toBe('Bearer jwt-token');
    expect(headers['X-Custom']).toBe('value');
  });

  test('modo fallo: sin token no incluye Authorization', () => {
    const headers = buildAuthHeaders();
    expect(headers['Authorization']).toBeUndefined();
  });

  test('caso límite: headers extra sin token se pasan limpios', () => {
    const headers = buildAuthHeaders({ 'Content-Type': 'application/json' });
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Authorization']).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────
//  checkUnauthorized
// ────────────────────────────────────────────────────────────────

describe('checkUnauthorized', () => {
  test('camino feliz: respuesta 401 devuelve true y ejecuta handleUnauthorized', () => {
    // Mock location
    const hrefSetter = jest.fn();
    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          set href(url: string) { hrefSetter(url); },
          get href() { return '/'; },
        },
      },
      writable: true,
      configurable: true,
    });

    storeToken('token');
    const response = new Response(null, { status: 401 });
    const result = checkUnauthorized(response);

    expect(result).toBe(true);
    expect(getStoredToken()).toBeNull();
    expect(hrefSetter).toHaveBeenCalledWith('/login');
  });

  test('modo fallo: respuesta 200 no dispara nada y devuelve false', () => {
    storeToken('token');
    const response = new Response(null, { status: 200 });
    const result = checkUnauthorized(response);

    expect(result).toBe(false);
    expect(getStoredToken()).toBe('token');
  });

  test('caso límite: respuesta 403 no se considera no autorizada', () => {
    const response = new Response(null, { status: 403 });
    expect(checkUnauthorized(response)).toBe(false);
  });
});