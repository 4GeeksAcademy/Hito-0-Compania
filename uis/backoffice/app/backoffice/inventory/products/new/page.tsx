"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createProduct } from "../../../../../lib/inventory";
import type { ProductCreate } from "../../../../../types/inventory";
import styles from "../../inventory.module.css";

export default function NewProductPage() {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", sku: "", description: "", category: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: keyof typeof values, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload: ProductCreate = {
      name: values.name.trim(),
      sku: values.sku.trim(),
      description: values.description.trim() || null,
      category: values.category.trim() || null,
    };

    try {
      await createProduct(payload);
      router.replace("/backoffice/inventory/products");
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo crear el producto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className={styles.heading}>
        <div><h1>Agregar producto</h1><p>Registra un producto en el catálogo de inventario.</p></div>
      </div>
      <p className={styles.muted}>El producto se guardará en Supabase. El stock inicial se registra después mediante una entrada de almacén.</p>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <form className={styles.form} onSubmit={handleSubmit}>
        <label htmlFor="product-name">Nombre
          <input id="product-name" autoComplete="off" maxLength={255} required value={values.name} onChange={(event) => updateField("name", event.target.value)} />
        </label>
        <label htmlFor="product-sku">SKU
          <input id="product-sku" autoComplete="off" maxLength={100} required value={values.sku} onChange={(event) => updateField("sku", event.target.value)} />
        </label>
        <label htmlFor="product-category">Categoría (opcional)
          <input id="product-category" maxLength={100} value={values.category} onChange={(event) => updateField("category", event.target.value)} />
        </label>
        <label htmlFor="product-description">Descripción (opcional)
          <textarea id="product-description" maxLength={500} rows={4} value={values.description} onChange={(event) => updateField("description", event.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button className={styles.button} type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar producto"}
          </button>
          <Link className={styles.muted} href="/backoffice/inventory/products">Cancelar</Link>
        </div>
      </form>
    </>
  );
}