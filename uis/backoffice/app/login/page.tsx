"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, login } from "../../lib/auth";
import styles from "../backoffice/inventory/inventory.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getAuthToken()) router.replace("/backoffice/inventory/products");
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const fields = new FormData(event.currentTarget);
    try {
      await login(String(fields.get("email") || "").trim(), String(fields.get("password") || ""));
      router.replace("/backoffice/inventory/products");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard} aria-labelledby="backoffice-login-title">
        <header className={styles.loginBrand}>
          <span className={styles.loginMark} aria-hidden="true">TF</span>
          <strong>TrackFlow Tech</strong>
        </header>
        <div className={styles.loginIntro}>
          <h1 id="backoffice-login-title">Iniciar sesión</h1>
          <p>Accede al panel de inventario y operaciones.</p>
        </div>
        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <label htmlFor="backoffice-email">Correo electrónico
            <input id="backoffice-email" name="email" type="email" autoComplete="username" required />
          </label>
          <label htmlFor="backoffice-password">Contraseña
            <input id="backoffice-password" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? "Accediendo..." : "Acceder"}
          </button>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </form>
      </section>
    </main>
  );
}