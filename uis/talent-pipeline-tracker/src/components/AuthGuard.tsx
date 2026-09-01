'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/src/context/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Componente que protege rutas del lado cliente.
 *
 * Espera a que AuthProvider termine de cargar la sesión.
 * Si no hay usuario autenticado, redirige a /login.
 * Muestra un spinner mientras verifica.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}