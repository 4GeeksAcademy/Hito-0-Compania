"use client";

import dynamic from "next/dynamic";
import styles from "../inventory.module.css";

const OrdersContent = dynamic(() => import("../../../../components/inventory/OrdersContent"), {
  loading: () => <p role="status" className={styles.loading}>Cargando historial de órdenes...</p>,
  ssr: false,
});

export default function OrdersPage() {
  return <OrdersContent />;
}