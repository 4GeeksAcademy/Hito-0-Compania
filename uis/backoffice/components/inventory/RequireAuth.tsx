"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "../../lib/auth";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
    } else {
      setAuthenticated(true);
    }
  }, [router]);

  return authenticated ? <>{children}</> : <p role="status" style={{ padding: "2rem" }}>Verificando sesión...</p>;
}