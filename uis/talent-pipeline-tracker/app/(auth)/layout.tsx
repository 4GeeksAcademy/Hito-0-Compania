/**
 * Layout para rutas públicas de autenticación (login, register).
 * No aplica AuthGuard — estas vistas son accesibles sin sesión.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}