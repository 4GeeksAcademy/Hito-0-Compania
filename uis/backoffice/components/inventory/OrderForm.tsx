"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createInboundOrder, createOutboundOrder, getProduct, InventoryApiError, listProducts } from "../../lib/inventory";
import type { Product, Warehouse } from "../../types/inventory";
import styles from "../../app/backoffice/inventory/inventory.module.css";

export default function OrderForm({ direction }: { direction: "inbound" | "outbound" }) {
  const outbound = direction === "outbound";
  const label = outbound ? "salida" : "entrada";
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [warehouse, setWarehouse] = useState<Warehouse>("Los Angeles");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [stock, setStock] = useState<{ productId: string; warehouse: Warehouse; value: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    listProducts().then((items) => {
      if (!active) return;
      setProducts(items);
      const preselected = new URLSearchParams(window.location.search).get("productId");
      if (preselected && items.some((item) => String(item.id) === preselected)) setProductId(preselected);
    }).catch((failure: unknown) => {
      if (active) setError(failure instanceof Error ? failure.message : "No se pudieron cargar los productos.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!outbound || !productId) return;
    let active = true;
    setStockLoading(true);
    getProduct(Number(productId), warehouse).then((product) => {
      if (active) setStock({ productId, warehouse, value: product.current_stock });
    }).catch((failure: unknown) => {
      if (active) setError(failure instanceof Error ? failure.message : "No se pudo consultar el stock.");
    }).finally(() => {
      if (active) setStockLoading(false);
    });
    return () => { active = false; };
  }, [outbound, productId, warehouse]);

  const currentStock = stock?.productId === productId && stock.warehouse === warehouse ? stock.value : null;
  const exceedsStock = outbound && currentStock !== null && quantity !== "" && Number(quantity) > currentStock;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setQuantityError("");
    setSuccess("");
    if (!products.some((product) => String(product.id) === productId)) {
      setError("Selecciona un producto válido.");
      return;
    }
    if (outbound && currentStock === null) {
      setError("Espera a consultar el stock disponible antes de registrar la salida.");
      return;
    }
    setSubmitting(true);
    try {
      const order = { product_id: Number(productId), quantity: Number(quantity), warehouse, notes: notes.trim() || null };
      if (outbound) await createOutboundOrder(order);
      else await createInboundOrder(order);
      setSuccess(`Orden de ${label} registrada correctamente.`);
      setProductId("");
      setQuantity("");
      setNotes("");
      setStock(null);
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : `No se pudo registrar la ${label}.`;
      if (outbound && failure instanceof InventoryApiError && failure.status === 400) setQuantityError(message);
      else setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className={styles.heading}><div><h1>Registrar orden de {label}</h1><p>Movimientos de almacén de TrackFlow.</p></div></div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status">{success}</p>}
      {loading && <p role="status">Cargando productos...</p>}
      {!loading && <form className={styles.form} onSubmit={handleSubmit}>
        <label>Producto (SKU)
          <select required value={productId} onChange={(event) => { setProductId(event.target.value); setError(""); setQuantityError(""); }}>
            <option value="">Selecciona un producto</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
          </select>
        </label>
        <label>Almacén
          <select value={warehouse} onChange={(event) => { setWarehouse(event.target.value as Warehouse); setError(""); setQuantityError(""); }}>
            <option value="Los Angeles">Los Angeles</option><option value="Zaragoza">Zaragoza</option>
          </select>
        </label>
        {outbound && productId && <p className={styles.stockBox} aria-live="polite">
          {currentStock === null ? stockLoading ? "Consultando stock disponible..." : "No se pudo consultar el stock." : `Disponible en ${warehouse}: ${currentStock} unidades`}
        </p>}
        <label>Cantidad
          <input required type="number" min="1" step="1" value={quantity} aria-invalid={Boolean(quantityError || exceedsStock)} aria-describedby={quantityError || exceedsStock ? "quantity-feedback" : undefined} onChange={(event) => { setQuantity(event.target.value); setQuantityError(""); }} />
        </label>
        {outbound && (quantityError || exceedsStock) && <p id="quantity-feedback" className={quantityError ? styles.error : styles.warning} role={quantityError ? "alert" : "status"}>
          {quantityError || `La cantidad supera las ${currentStock} unidades disponibles en ${warehouse}.`}
        </p>}
        <label>Notas (opcional)<textarea rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <button className={styles.button} type="submit" disabled={submitting || loading || (outbound && (!productId || currentStock === null))}>
          {submitting ? "Registrando..." : `Registrar ${label}`}
        </button>
      </form>}
    </>
  );
}