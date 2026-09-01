'use client';

import AuthGuard from '@/src/components/AuthGuard';

/**
 * Layout para rutas protegidas de la aplicación (tracker, perfil, candidatos).
 * Aplica AuthGuard a todas las páginas hijas automáticamente.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}