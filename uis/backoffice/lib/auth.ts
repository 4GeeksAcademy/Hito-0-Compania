export const TOKEN_KEY = "auth_token";

export function getAuthToken(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.location.assign("/login");
}

export function getApiBase(): string {
  return "/api";
}

export async function login(email: string, password: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${getApiBase()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: email, password }),
    });
  } catch {
    throw new Error("No se pudo conectar con la API. Comprueba que esté activa.");
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof payload?.detail === "string" ? payload.detail : "No se pudo iniciar sesión.");
  }
  if (typeof payload?.access_token !== "string") {
    throw new Error("La API no devolvió un token de sesión válido.");
  }
  window.localStorage.setItem(TOKEN_KEY, payload.access_token);
}