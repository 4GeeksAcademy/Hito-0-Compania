/**
 * Utilidad compartida para llamadas HTTP.
 *
 * Centraliza:
 * - Inclusión del token `Authorization: Bearer`
 * - Detección de 401 → limpieza de token + redirección a /login
 */

const STORAGE_KEY = 'auth_token';

/* ──────────────────── Resolución dinámica de la API base ────── */

/**
 * Calcula la URL base de la API en tiempo de ejecución (navegador),
 * para que funcione tanto en localhost como en un Codespace con
 * puertos reenviados por *.app.github.dev, donde "localhost" en el
 * bundle apuntaría a la máquina del usuario en vez del contenedor.
 */
export function resolveApiBase(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_AUTH_API_URL?.replace(/\/$/, '') ?? '';
  }

  const { protocol, hostname } = window.location;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:8000`;
  }

  if (hostname.endsWith('.app.github.dev')) {
    const apiHost = hostname.replace(/-\d+\.app\.github\.dev$/, '-8000.app.github.dev');
    return `${protocol}//${apiHost}`;
  }

  return process.env.NEXT_PUBLIC_AUTH_API_URL?.replace(/\/$/, '') ?? '';
}

/* ──────────────────── Token helpers ─────────────────────────── */

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/* ──────────────────── 401 handler ───────────────────────────── */

/**
 * Limpia la sesión y redirige al login.
 * Se llama automáticamente cuando una respuesta protegida devuelve 401.
 */
export function handleUnauthorized(): void {
  clearToken();
  // Usar window.location para redirigir desde cualquier contexto (servicio, hook, etc.)
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

/**
 * Construye los headers incluyendo Authorization si hay token.
 */
export function buildAuthHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = { ...extra };

  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Verifica si la respuesta es 401 y, de ser así, ejecuta la redirección.
 * Devuelve `true` si era 401.
 */
export function checkUnauthorized(response: Response): boolean {
  if (response.status === 401) {
    handleUnauthorized();
    return true;
  }
  return false;
}