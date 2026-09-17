/**
 * Utilidades de autenticación para el frontend.
 * Provee helpers de generación y validación de tokens JWT,
 * y funciones de seguridad para el manejo de sesiones.
 */

// --- Token Helpers ---

/**
 * Decodifica un token JWT (solo payload, sin verificar firma).
 * Útil para leer información del token del lado del cliente.
 */
export function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    if (!payload) return null;

    // Base64 URL-safe decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Verifica si un token JWT ha expirado basado en el campo `exp`.
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeTokenPayload(token);
  if (!payload) return true;

  const exp = payload['exp'];
  if (typeof exp !== 'number') return true;

  const ahora = Math.floor(Date.now() / 1000);
  return exp < ahora;
}

/**
 * Calcula el tiempo restante de un token en segundos.
 * Devuelve 0 si el token es inválido o ya expiró.
 */
export function getTokenRemainingTime(token: string): number {
  const payload = decodeTokenPayload(token);
  if (!payload) return 0;

  const exp = payload['exp'];
  if (typeof exp !== 'number') return 0;

  const ahora = Math.floor(Date.now() / 1000);
  return Math.max(0, exp - ahora);
}

// --- Password Validation ---

/**
 * Valida que una contraseña cumpla con los requisitos mínimos.
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una mayúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('La contraseña debe contener al menos una minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('La contraseña debe contener al menos un número');
  }

  return { valid: errors.length === 0, errors };
}

// --- Email Validation ---

/**
 * Valida que un email tenga un formato razonable.
 */
export function validateEmail(email: string): boolean {
  if (!email || email.trim().length === 0) return false;

  // Regex básico de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// --- Hash Helpers (simulación cliente) ---

/**
 * Genera un hash SHA-256 simple de un string (útil para token fingerprinting).
 */
export async function hashStringSHA256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}