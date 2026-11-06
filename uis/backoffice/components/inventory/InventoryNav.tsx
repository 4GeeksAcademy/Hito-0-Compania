"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clearSession } from "../../lib/auth";
import styles from "../../app/backoffice/inventory/inventory.module.css";

const pages = [
  { href: "/backoffice/inventory/products", label: "Stock" },
  { href: "/backoffice/inventory/orders/inbound", label: "Nueva entrada" },
  { href: "/backoffice/inventory/picking", label: "Picking" },
  { href: "/backoffice/inventory/orders", label: "Historial" },
  { href: "/backoffice/inventory/incidents", label: "Gestión de incidencias" },
];

export default function InventoryNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className={styles.nav} aria-label="Inventario" onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }}>
      <button
        className={styles.menuToggle}
        type="button"
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={menuOpen}
        aria-controls="inventory-menu"
        title={menuOpen ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
      </button>
      <div id="inventory-menu" className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
        {pages.map(({ href, label }) => (
          <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => setMenuOpen(false)}>{label}</Link>
        ))}
        <button type="button" onClick={clearSession}>Cerrar sesión</button>
      </div>
    </nav>
  );
}