"use client";

import Link from "next/link";
import { useMemo } from "react";
import { listProducts } from "../../../../lib/inventory";
import { useAsyncFetch } from "../../../../lib/useAsyncFetch";
import type { Product } from "../../../../types/inventory";
import styles from "../inventory.module.css";

export default function ProductsPage() {
  const { data: products, loading, error } = useAsyncFetch(listProducts, [] as Product[]);

  const productRows = useMemo(
    () => products.map((product) => {
      // 0 o menos: agotado; 1-10: stock bajo; más de 10: saludable.
      const stockClass = product.current_stock <= 0 ? styles.empty : product.current_stock <= 10 ? styles.low : styles.healthy;
      const stockLabel = product.current_stock <= 0 ? "Agotado" : product.current_stock <= 10 ? "Stock bajo" : "Disponible";
      return (
        <tr key={product.id}>
          <td><strong>{product.name}</strong></td><td>{product.sku}</td>
          <td>{product.category || "Sin categoría"}</td><td>{product.description || "—"}</td>
          <td><span className={`${styles.badge} ${stockClass}`}>{product.current_stock} · {stockLabel}</span></td>
          <td><div className={styles.actions}>
            <Link href={`/backoffice/inventory/orders/inbound?productId=${product.id}`}>Registrar entrada</Link>
            <Link href={`/backoffice/inventory/picking?productId=${product.id}`}>Preparar picking</Link>
          </div></td>
        </tr>
      );
    }),
    [products, styles],
  );

  return (
    <>
      <div className={styles.heading}>
        <div><h1>Catálogo de stock</h1><p>Productos en los almacenes de TrackFlow.</p></div>
        <Link className={styles.buttonLink} href="/backoffice/inventory/products/new">＋ Agregar producto</Link>
      </div>
      {loading && <p role="status">Cargando productos...</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!loading && !error && (products.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Producto</th><th>SKU</th><th>Categoría</th><th>Descripción</th><th>Stock actual</th><th>Acciones</th></tr></thead>
            <tbody>{productRows}</tbody>
          </table>
        </div>
      ) : <p className={styles.emptyState}>No hay productos registrados.</p>)}
    </>
  );
}