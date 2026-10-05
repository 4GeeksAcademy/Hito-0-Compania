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
    <main className={styles.page}>
      <div className={styles.heading}><div><p>TrackFlow Tech · Operaciones</p><h1>Iniciar sesión</h1></div></div>
      <form className={styles.form} onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
        <label>Correo electrónico<input name="email" type="email" autoComplete="username" required /></label>
        <label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>
        <button className={styles.button} type="submit" disabled={submitting}>{submitting ? "Accediendo..." : "Acceder"}</button>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </form>
    </main>
  );
}