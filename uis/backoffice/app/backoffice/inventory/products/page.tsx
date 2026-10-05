"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listProducts } from "../../../../lib/inventory";
import type { Product } from "../../../../types/inventory";
import styles from "../inventory.module.css";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listProducts().then((items) => {
      if (active) setProducts(items);
    }).catch((failure: unknown) => {
      if (active) setError(failure instanceof Error ? failure.message : "No se pudo cargar el inventario.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <>
      <div className={styles.heading}><div><h1>Catálogo de stock</h1><p>Productos en los almacenes de TrackFlow.</p></div></div>
      {loading && <p role="status">Cargando productos...</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!loading && !error && (products.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Producto</th><th>SKU</th><th>Categoría</th><th>Descripción</th><th>Stock actual</th><th>Acciones</th></tr></thead>
            <tbody>{products.map((product) => {
              // 0 o menos: agotado; 1-10: stock bajo; más de 10: saludable.
              const stockClass = product.current_stock <= 0 ? styles.empty : product.current_stock <= 10 ? styles.low : styles.healthy;
              return <tr key={product.id}>
                <td><strong>{product.name}</strong></td><td>{product.sku}</td>
                <td>{product.category || "Sin categoría"}</td><td>{product.description || "—"}</td>
                <td><span className={`${styles.badge} ${stockClass}`}>{product.current_stock} · {product.current_stock <= 0 ? "Agotado" : product.current_stock <= 10 ? "Stock bajo" : "Disponible"}</span></td>
                <td><div className={styles.actions}>
                  <Link href={`/backoffice/inventory/orders/inbound?productId=${product.id}`}>Registrar entrada</Link>
                  <Link href={`/backoffice/inventory/orders/outbound?productId=${product.id}`}>Registrar salida</Link>
                </div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      ) : <p className={styles.emptyState}>No hay productos registrados.</p>)}
    </>
  );
}