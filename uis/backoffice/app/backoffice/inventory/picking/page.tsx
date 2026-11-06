"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  advanceDemoTracking,
  completePickingTask,
  createPickingTask,
  listPickingTasks,
  listProducts,
} from "../../../../lib/inventory";
import type { PickingTask, Product, Warehouse } from "../../../../types/inventory";
import styles from "../inventory.module.css";

const trackingLabels: Record<PickingTask["demo_tracking_stage"], string> = {
  pending_pick: "Pendiente de picking",
  ready_for_dispatch: "Picking confirmado · listo para despacho",
  in_transit_demo: "En tránsito · evento simulado",
  delivered_demo: "Entregado · evento simulado",
};

export default function PickingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [tasks, setTasks] = useState<PickingTask[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [warehouse, setWarehouse] = useState<Warehouse>("Los Angeles");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    setError("");
    const [productList, taskList] = await Promise.all([listProducts(), listPickingTasks()]);
    setProducts(productList);
    setTasks(taskList);
    if (!productId && productList.length) setProductId(String(productList[0].id));
  }

  useEffect(() => {
    let active = true;
    Promise.all([listProducts(), listPickingTasks()])
      .then(([productList, taskList]) => {
        if (!active) return;
        setProducts(productList);
        setTasks(taskList);
        const requestedProductId = new URLSearchParams(window.location.search).get("productId");
        const selectedProduct = productList.find((product) => String(product.id) === requestedProductId);
        if (selectedProduct || productList.length) setProductId(String(selectedProduct?.id ?? productList[0].id));
      })
      .catch((failure: unknown) => {
        if (active) setError(failure instanceof Error ? failure.message : "No se pudo cargar picking.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await createPickingTask({
        product_id: Number(productId),
        quantity: Number(quantity),
        warehouse,
        notes: notes.trim() || null,
      });
      await refresh();
      setQuantity("1");
      setNotes("");
      setMessage("Tarea de picking creada. El stock se descuenta al confirmar el picking.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo crear la tarea.");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(taskId: number) {
    setBusyTaskId(taskId);
    setError("");
    setMessage("");
    try {
      await completePickingTask(taskId);
      await refresh();
      setMessage("Picking confirmado y salida de inventario registrada.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo confirmar el picking.");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleAdvanceTracking(taskId: number) {
    setBusyTaskId(taskId);
    setError("");
    setMessage("");
    try {
      await advanceDemoTracking(taskId);
      await refresh();
      setMessage("Evento de tracking de demostración avanzado.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo avanzar el tracking demo.");
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <>
      <div className={styles.heading}>
        <div>
          <h1>Picking digital</h1>
          <p>Prepara una tarea, confirma los artículos recogidos y registra la salida del almacén.</p>
        </div>
      </div>

      <p className={styles.demoNotice}>Tracking de demostración: los eventos de transporte son simulados y no consultan carriers reales.</p>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {message ? <p className={styles.success} role="status">{message}</p> : null}

      <section className={styles.pickingPanel} aria-labelledby="new-pick-title">
        <h2 id="new-pick-title">Preparar picking</h2>
        {loading ? <p className={styles.loading} role="status">Cargando productos y tareas...</p> : (
          <form className={styles.pickingForm} onSubmit={handleCreate}>
            <label>Producto
              <select required value={productId} onChange={(event) => setProductId(event.target.value)}>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
              </select>
            </label>
            <label>Almacén
              <select value={warehouse} onChange={(event) => setWarehouse(event.target.value as Warehouse)}>
                <option value="Los Angeles">Los Angeles</option>
                <option value="Zaragoza">Zaragoza</option>
              </select>
            </label>
            <label>Cantidad
              <input required min="1" step="1" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </label>
            <label className={styles.pickingNotes}>Referencia o nota (opcional)
              <input maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ej.: pedido de demo" />
            </label>
            <button className={styles.button} type="submit" disabled={saving || !products.length}>
              {saving ? "Creando..." : "Crear tarea"}
            </button>
          </form>
        )}
      </section>

      <section className={styles.pickingTasks} aria-labelledby="pick-tasks-title">
        <div className={styles.pickingTasksHeading}>
          <div>
            <h2 id="pick-tasks-title">Tareas de picking</h2>
            <p className={styles.muted}>Confirmar un picking crea una orden de salida y reduce el stock disponible.</p>
          </div>
          <span className={styles.taskCount}>{tasks.length}</span>
        </div>
        {tasks.length === 0 && !loading ? <p className={styles.emptyState}>Todavía no hay tareas de picking.</p> : null}
        <div className={styles.taskList}>
          {tasks.map((task) => (
            <article key={task.id} className={styles.pickTask}>
              <div className={styles.pickTaskMain}>
                <div>
                  <h3>{task.product_name} <span className={styles.muted}>· {task.product_sku}</span></h3>
                  <p>{task.quantity} unidades · {task.warehouse}</p>
                  {task.notes ? <p className={styles.muted}>{task.notes}</p> : null}
                </div>
                <span className={`${styles.badge} ${task.status === "picked" ? styles.healthy : styles.low}`}>
                  {task.status === "picked" ? "Picking confirmado" : "Pendiente"}
                </span>
              </div>
              <div className={styles.trackingDemoLine}>
                <span aria-hidden="true">●</span>
                <span>{trackingLabels[task.demo_tracking_stage]}</span>
                <time dateTime={task.demo_tracking_updated_at}>{new Date(task.demo_tracking_updated_at).toLocaleString("es-ES")}</time>
              </div>
              <div className={styles.pickTaskActions}>
                {task.status === "pending" ? (
                  <button className={styles.button} type="button" disabled={busyTaskId === task.id} onClick={() => handleComplete(task.id)}>
                    {busyTaskId === task.id ? "Confirmando..." : "Confirmar picking"}
                  </button>
                ) : null}
                {task.status === "picked" && task.demo_tracking_stage !== "delivered_demo" ? (
                  <button className={styles.triageCopyButton} type="button" disabled={busyTaskId === task.id} onClick={() => handleAdvanceTracking(task.id)}>
                    Simular siguiente evento
                  </button>
                ) : null}
                {task.outbound_order_id ? <span className={styles.muted}>Salida #{task.outbound_order_id}</span> : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}