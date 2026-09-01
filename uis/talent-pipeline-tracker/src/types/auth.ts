/** Tipos compartidos para el flujo de autenticación. */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface UserSession {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  profile: UserProfile | null;
}

export interface AuthState {
  /** Token JWT almacenado, o null si no hay sesión. */
  token: string | null;
  /** Datos del usuario (sesión), o null si no hay sesión. */
  user: UserSession | null;
  /** true mientras se está cargando la sesión inicial. */
  loading: boolean;
  /** Error global, si lo hay. */
  error: string | null;
  /** Errores de validación a nivel de campo. */
  fieldErrors: FieldErrors;
}

/** Mapa de nombre de campo → mensaje de error. */
export type FieldErrors = Record<string, string>;

/** Datos editables del perfil del usuario. */
export interface ProfileUpdateData {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
}