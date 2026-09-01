/**
 * Servicio de autenticación para el frontend.
 *
 * Se comunica con la API FastAPI propia (services/api/).
 * La URL base se configura via NEXT_PUBLIC_AUTH_API_URL
 * (ej: http://localhost:8000).
 */

import type {
  AuthTokens,
  FieldErrors,
  LoginCredentials,
  ProfileUpdateData,
  RegisterData,
  UserProfile,
  UserSession,
} from '@/src/types/auth';

import {
  buildAuthHeaders,
  checkUnauthorized,
  clearToken,
  getStoredToken,
  storeToken,
} from './http-client';

const AUTH_API_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL?.replace(/\/$/, '') ?? '';

/* ──────────────────── Error con validación por campo ─────────── */

export class ValidationError extends Error {
  fieldErrors: FieldErrors;

  constructor(message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

/* ──────────────────── Peticiones helpers ────────────────────── */

type ApiErrorPayload = {
  message?: string;
  error?: string;
  detail?: string | Array<{ msg?: string; loc?: string[]; type?: string }>;
};

/** Mapea nombres de campo de FastAPI a nombres de campo del frontend. */
function mapFieldName(loc: string[]): string {
  // FastAPI devuelve loc como ["body", "email"] → extraemos el último segmento
  const raw = loc[loc.length - 1];
  // Mapeo para campos de registro/login
  const fieldMap: Record<string, string> = {
    username: 'email',
    email: 'email',
    password: 'password',
    name: 'name',
    phone: 'phone',
    address: 'address',
  };
  return fieldMap[raw] ?? raw;
}

function parseFieldErrors(detail: unknown): { message: string; fieldErrors: FieldErrors } {
  const fieldErrors: FieldErrors = {};
  const globalMessages: string[] = [];

  if (Array.isArray(detail)) {
    for (const item of detail) {
      if (item?.loc && Array.isArray(item.loc)) {
        const fieldName = mapFieldName(item.loc);
        if (item.msg) {
          fieldErrors[fieldName] = item.msg;
        }
      } else if (item?.msg) {
        globalMessages.push(item.msg);
      }
    }
  }

  const message =
    Object.keys(fieldErrors).length > 0
      ? Object.values(fieldErrors).join('. ')
      : globalMessages.join(', ') || 'Error de validación';

  return { message, fieldErrors };
}

async function extractError(response: Response): Promise<ValidationError> {
  try {
    const data = (await response.json()) as ApiErrorPayload;

    // FastAPI validation errors (422): detail es un array con loc/msg
    if (Array.isArray(data.detail)) {
      const parsed = parseFieldErrors(data.detail);
      return new ValidationError(parsed.message, parsed.fieldErrors);
    }

    if (typeof data.detail === 'string') {
      return new ValidationError(data.detail);
    }

    if (data.error) return new ValidationError(data.error);
    if (data.message) return new ValidationError(data.message);
  } catch {
    // fallback
  }
  return new ValidationError(`Error del servidor (${response.status})`);
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const response = await fetch(`${AUTH_API_BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) },
  });

  // 401 → token inválido/expirado: limpiar sesión y redirigir
  if (response.status === 401) {
    checkUnauthorized(response);
    throw new ValidationError('Sesión expirada. Iniciá sesión nuevamente.');
  }

  if (!response.ok) {
    throw await extractError(response);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/* ──────────────────── Endpoints públicos ────────────────────── */

/** Inicia sesión y devuelve el token. */
export async function login(credentials: LoginCredentials): Promise<AuthTokens> {
  const formData = new URLSearchParams();
  formData.append('username', credentials.email);
  formData.append('password', credentials.password);

  const data = await request<AuthTokens>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  storeToken(data.access_token);
  return data;
}

/** Registra un nuevo usuario, luego inicia sesión automáticamente. */
export async function register(data: RegisterData): Promise<AuthTokens> {
  // 1. Crear usuario
  await request<unknown>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  // 2. Login automático con las mismas credenciales
  return login({ email: data.email, password: data.password });
}

/** Obtiene los datos del usuario logueado (requiere token). */
export async function getCurrentUser(
  token: string,
): Promise<UserSession> {
  return request<UserSession>('/auth/me', { token });
}

/** Actualiza el perfil del usuario logueado (requiere token). PUT /profiles/me */
export async function updateProfile(
  data: ProfileUpdateData,
): Promise<UserProfile> {
  const token = getStoredToken();
  if (!token) throw new Error('No hay sesión activa');

  return request<UserProfile>('/profiles/me', {
    method: 'PUT',
    token,
    body: JSON.stringify(data),
  });
}

/** Cierra sesión: elimina el token del almacenamiento. */
export function logout(): void {
  clearToken();
}

/** Crea un objeto RequestInit con el token de autorización incluido,
 *  útil para llamar a endpoints protegidos de la API de autenticación. */
export function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}