"use client";

import { useEffect, useState } from "react";
import { listOrders } from "../../../../lib/inventory";
import type { InventoryOrder } from "../../../../types/inventory";
import styles from "../inventory.module.css";

export default function OrdersPage() {
  const [orders, setOrders] = useState<InventoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listOrders().then((items) => {
      if (active) setOrders(items);
    }).catch((failure: unknown) => {
      if (active) setError(failure instanceof Error ? failure.message : "No se pudo cargar el historial.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <>
      <div className={styles.heading}><div><h1>Historial de órdenes</h1><p>Entradas y salidas de los almacenes de TrackFlow.</p></div></div>
      {loading && <p role="status">Cargando historial...</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!loading && !error && (orders.length ? (
        <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>Tipo</th><th>Producto</th><th>Cantidad</th><th>Almacén</th><th>Fecha</th><th>Creado por (user_uuid)</th><th>Notas</th></tr></thead>
          <tbody>{orders.map((order) => <tr key={`${order.type}-${order.id}`}>
            <td><span className={`${styles.badge} ${order.type === "inbound" ? styles.inbound : styles.outbound}`}>{order.type === "inbound" ? "Entrada" : "Salida"}</span></td>
            <td><strong>{order.product_name}</strong><small>{order.product_sku}</small></td>
            <td>{order.quantity}</td><td>{order.warehouse}</td>
            <td><time dateTime={order.created_at}>{new Date(order.created_at).toLocaleString("es-ES")}</time></td>
            <td className={styles.userUuid}>{order.user_uuid}</td><td>{order.notes || "—"}</td>
          </tr>)}</tbody>
        </table></div>
      ) : <p className={styles.emptyState}>Todavía no hay órdenes de inventario.</p>)}
    </>
  );
}