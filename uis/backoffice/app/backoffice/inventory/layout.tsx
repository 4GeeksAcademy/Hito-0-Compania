import type { ReactNode } from "react";
import InventoryNav from "../../../components/inventory/InventoryNav";
import RequireAuth from "../../../components/inventory/RequireAuth";
import styles from "./inventory.module.css";

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <header className={styles.topbar}>
        <div><span className={styles.brand}>TrackFlow Tech</span><strong>Inventario</strong></div>
        <span className={styles.context}>Operaciones de almacén</span>
      </header>
      <InventoryNav />
      <main className={styles.page}>{children}</main>
    </RequireAuth>
  );
}