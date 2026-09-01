'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import { useRouter } from 'next/navigation';

import type { AuthState, FieldErrors, LoginCredentials, ProfileUpdateData, RegisterData, UserProfile, UserSession } from '@/src/types/auth';
import {
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  updateProfile as apiUpdateProfile,
  getCurrentUser,
  ValidationError,
} from '@/src/services/auth';

import {
  clearToken,
  getStoredToken,
} from '@/src/services/http-client';

/* ──────────────────── Estados ──────────────────── */

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: UserSession }
  | { type: 'SET_TOKEN'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FIELD_ERRORS'; payload: FieldErrors }
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'CLEAR_SESSION' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null, fieldErrors: {} };
    case 'SET_USER':
      return { ...state, user: action.payload, loading: false };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_FIELD_ERRORS':
      return { ...state, fieldErrors: action.payload, loading: false };
    case 'SET_PROFILE':
      return {
        ...state,
        user: state.user ? { ...state.user, profile: action.payload } : state.user,
        loading: false,
      };
    case 'CLEAR_SESSION':
      return { token: null, user: null, loading: false, error: null, fieldErrors: {} };
    default:
      return state;
  }
}

const initialState: AuthState = {
  token: null,
  user: null,
  loading: true,
  error: null,
  fieldErrors: {},
};

/* ──────────────────── Contexto ──────────────────── */

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ──────────────────── Provider ──────────────────── */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();

  /** Carga la sesión desde el token almacenado (al montar). */
  const refreshSession = useCallback(async () => {
    const token = getStoredToken();

    if (!token) {
      dispatch({ type: 'CLEAR_SESSION' });
      return;
    }

    dispatch({ type: 'SET_TOKEN', payload: token });

    try {
      const user = await getCurrentUser(token);
      dispatch({ type: 'SET_USER', payload: user });
    } catch {
      // Token inválido o expirado → limpiar
      clearToken();
      dispatch({ type: 'CLEAR_SESSION' });
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const tokens = await apiLogin(credentials);
        dispatch({ type: 'SET_TOKEN', payload: tokens.access_token });

        const user = await getCurrentUser(tokens.access_token);
        dispatch({ type: 'SET_USER', payload: user });
        router.push('/');
      } catch (err) {
        if (err instanceof ValidationError) {
          dispatch({ type: 'SET_FIELD_ERRORS', payload: err.fieldErrors });
          if (!err.fieldErrors || Object.keys(err.fieldErrors).length === 0) {
            dispatch({ type: 'SET_ERROR', payload: err.message });
          }
        } else {
          const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
          dispatch({ type: 'SET_ERROR', payload: message });
        }
      }
    },
    [router],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const tokens = await apiRegister(data);
        dispatch({ type: 'SET_TOKEN', payload: tokens.access_token });

        const user = await getCurrentUser(tokens.access_token);
        dispatch({ type: 'SET_USER', payload: user });
        router.push('/');
      } catch (err) {
        if (err instanceof ValidationError) {
          dispatch({ type: 'SET_FIELD_ERRORS', payload: err.fieldErrors });
          if (!err.fieldErrors || Object.keys(err.fieldErrors).length === 0) {
            dispatch({ type: 'SET_ERROR', payload: err.message });
          }
        } else {
          const message = err instanceof Error ? err.message : 'Error al registrarse';
          dispatch({ type: 'SET_ERROR', payload: message });
        }
      }
    },
    [router],
  );

  const logout = useCallback(() => {
    apiLogout();
    dispatch({ type: 'CLEAR_SESSION' });
    router.push('/login');
  }, [router]);

  const updateProfile = useCallback(
    async (data: ProfileUpdateData) => {
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const profile = await apiUpdateProfile(data);
        dispatch({ type: 'SET_PROFILE', payload: profile });
      } catch (err) {
        if (err instanceof ValidationError) {
          dispatch({ type: 'SET_FIELD_ERRORS', payload: err.fieldErrors });
          if (!err.fieldErrors || Object.keys(err.fieldErrors).length === 0) {
            dispatch({ type: 'SET_ERROR', payload: err.message });
          }
        } else {
          const message = err instanceof Error ? err.message : 'Error al actualizar perfil';
          dispatch({ type: 'SET_ERROR', payload: message });
        }
      }
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      refreshSession,
      updateProfile,
    }),
    [state, login, register, logout, refreshSession, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ──────────────────── Hook ──────────────────── */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un <AuthProvider>');
  }
  return ctx;
}