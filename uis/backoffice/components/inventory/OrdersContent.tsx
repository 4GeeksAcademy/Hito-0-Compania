"use client";

import { useMemo, useState } from "react";
import { useAsyncFetch } from "../../lib/useAsyncFetch";
import { listOrders } from "../../lib/inventory";
import type { InventoryOrder } from "../../types/inventory";
import styles from "../../app/backoffice/inventory/inventory.module.css";

const PAGE_SIZE = 5;

export default function OrdersContent() {
  const { data: orders, loading, error } = useAsyncFetch(listOrders, [] as InventoryOrder[]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const displayedPage = Math.min(currentPage, pageCount);
  const pageStart = (displayedPage - 1) * PAGE_SIZE;
  const pageOrders = useMemo(
    () => orders.slice(pageStart, pageStart + PAGE_SIZE),
    [orders, pageStart],
  );

  return (
    <>
      <div className={styles.heading}><div><h1>Historial de órdenes</h1><p>Entradas y salidas de los almacenes de TrackFlow.</p></div></div>
      {loading && <p role="status">Cargando historial...</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!loading && !error && (orders.length ? (
        <>
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Tipo</th><th>Producto</th><th>Cantidad</th><th>Almacén</th><th>Fecha</th><th>Creado por (user_uuid)</th><th>Notas</th></tr></thead>
            <tbody>{pageOrders.map((order) => <tr key={`${order.type}-${order.id}`}>
            <td><span className={`${styles.badge} ${order.type === "inbound" ? styles.inbound : styles.outbound}`}>{order.type === "inbound" ? "Entrada" : "Salida"}</span></td>
            <td><strong>{order.product_name}</strong><small>{order.product_sku}</small></td>
            <td>{order.quantity}</td><td>{order.warehouse}</td>
            <td><time dateTime={order.created_at}>{new Date(order.created_at).toLocaleString("es-ES")}</time></td>
            <td className={styles.userUuid}>{order.user_uuid}</td><td>{order.notes || "—"}</td>
          </tr>)}</tbody>
        </table></div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4ebea] bg-[#f1f6f5] px-4 py-3 text-xs text-[#53686c] sm:px-6">
          <p className="m-0">
            Mostrando {pageOrders.length ? pageStart + 1 : 0}–{pageStart + pageOrders.length} de {orders.length} órdenes
          </p>
          <nav className="flex items-center gap-2" aria-label="Paginación del historial de órdenes">
            <button
              className={styles.navButton}
              type="button"
              disabled={displayedPage <= 1}
              onClick={() => setCurrentPage(displayedPage - 1)}
            >
              Anterior
            </button>
            <span aria-live="polite">Página {displayedPage} de {pageCount}</span>
            <button
              className={styles.navButton}
              type="button"
              disabled={displayedPage >= pageCount}
              onClick={() => setCurrentPage(displayedPage + 1)}
            >
              Siguiente
            </button>
          </nav>
        </div>
        </>
      ) : <p className={styles.emptyState}>Todavía no hay órdenes de inventario.</p>)}
    </>
  );
}