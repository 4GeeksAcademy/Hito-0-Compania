"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearSession } from "../../lib/auth";
import styles from "../../app/backoffice/inventory/inventory.module.css";

const pages = [
  { href: "/backoffice/inventory/products", label: "Stock" },
  { href: "/backoffice/inventory/orders/inbound", label: "Nueva entrada" },
  { href: "/backoffice/inventory/orders/outbound", label: "Nueva salida" },
  { href: "/backoffice/inventory/orders", label: "Historial" },
];

export default function InventoryNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Inventario">
      {pages.map(({ href, label }) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>
      ))}
      <button type="button" onClick={clearSession}>Cerrar sesión</button>
    </nav>
  );
}