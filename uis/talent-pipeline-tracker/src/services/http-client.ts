/**
 * Utilidad compartida para llamadas HTTP.
 *
 * Centraliza:
 * - Inclusión del token `Authorization: Bearer`
 * - Detección de 401 → limpieza de token + redirección a /login
 */

const STORAGE_KEY = 'auth_token';

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