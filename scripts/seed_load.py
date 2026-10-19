#!/usr/bin/env python3
"""
Seeder de carga masiva — genera VOLUMEN realista para medir el caching.

Uso:
    services/api/.venv/bin/python scripts/seed_load.py --products 200 --orders-per-product 50

Propósito:
    La consigna pide "aumentar el volumen en las tablas que alimentan tus lecturas
    más pesadas" para que el middleware de timing revele dónde el caching aporta
    valor. Con 4 productos, casi todo responde en <10ms. Con 200 productos y
    miles de órdenes, el cálculo de stock (2 queries por producto) tarda de verdad.

    Genera datos variados y coherentes: nombres, SKUs, categorías, almacenes,
    notas y user_uuids reales — no filas idénticas de "test".
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from random import Random

API_DIR = Path(__file__).resolve().parents[1] / "services" / "api"
sys.path.insert(0, str(API_DIR))

from sqlmodel import Session, select  # noqa: E402

from app.core.database import engine, users_table  # noqa: E402
from app.models.inventory import InboundOrder, OutboundOrder, Product  # noqa: E402

WAREHOUSES = ["Los Angeles", "Zaragoza"]
CATEGORIES = [
    "hidratacion", "tecnologia", "accesorios", "ropa", "hogar",
    "oficina", "alimentacion", "cosmetica", "jardineria", "deportes",
]
ADJETIVOS = [
    "Pro", "Plus", "Max", "Lite", "X", "Ultra", "Eco", "Smart",
    "Compact", "Classic", "Flex", "Prime", "Basic", "Elite", "Standard",
]
TIPOS = [
    "Botella", "Reloj", "Bolsa", "Cargador", "Auriculares", "Lampara",
    "Mochila", "Termo", "Teclado", "Ratón", "Cable", "Adaptador",
    "Soporte", "Fundas", "Set", "Kit", "Caja", "Estuche",
]


def iso(dt: datetime) -> str:
    return dt.replace(tzinfo=timezone.utc).isoformat()


def main() -> int:
    parser = argparse.ArgumentParser(description="Carga masiva de inventario realista")
    parser.add_argument("--products", type=int, default=200, help="Nº de productos a crear")
    parser.add_argument("--orders-per-product", type=int, default=40, help="Nº de órdenes por producto")
    args = parser.parse_args()

    rng = Random(42)  # semilla fija → reproducible

    # user_uuid real de la TinyDB (para trazabilidad coherente)
    users = users_table.all()
    user_uuids = [u["id"] for u in users] or ["00000000-0000-0000-0000-000000000000"]

    with Session(engine) as session:
        existing = session.exec(select(Product)).all()
        print(f"Productos existentes antes del seeder: {len(existing)}")

        products: list[Product] = []
        now = datetime.now(timezone.utc)

        for i in range(args.products):
            sku = f"LOAD-{i+1:04d}"
            if any(p.sku == sku for p in existing):
                continue
            name = f"{rng.choice(TIPOS)} {rng.choice(ADJETIVOS)} {i+1}"
            product = Product(
                name=name,
                sku=sku,
                description=(
                    f"Producto de carga realista nº{i+1}: {name} para canal "
                    f"{rng.choice(['retail', 'wholesale', 'ecommerce'])}"
                ),
                category=rng.choice(CATEGORIES),
                created_at=now - timedelta(days=rng.randint(0, 300)),
            )
            session.add(product)
            session.flush()
            session.refresh(product)
            products.append(product)

        session.commit()
        print(f"✅ Creados {len(products)} productos nuevos (total: {len(existing) + len(products)})")

        # ── Órdenes: cada producto tiene varias entradas y salidas por almacén ──
        n_in = 0
        n_out = 0
        for idx, product in enumerate(products):
            # Stock de entrada repartido entre 1-3 entradas, fechas variadas
            n_entries = rng.randint(1, 3)
            for e in range(n_entries):
                warehouse = rng.choice(WAREHOUSES)
                quantity = rng.randint(10, 500)
                created = now - timedelta(days=rng.randint(0, 90), hours=rng.randint(0, 23))
                session.add(InboundOrder(
                    product_id=product.id,
                    quantity=quantity,
                    warehouse=warehouse,
                    user_uuid=rng.choice(user_uuids),
                    notes=f"Entrada {e+1} lote {idx+1} — recepción de proveedor",
                    created_at=created,
                ))
                n_in += 1

            # Stock de salida entre 1-3 salidas
            n_exits = rng.randint(1, 3)
            for s in range(n_exits):
                warehouse = rng.choice(WAREHOUSES)
                quantity = rng.randint(1, 60)
                created = now - timedelta(days=rng.randint(0, 60), hours=rng.randint(0, 23))
                session.add(OutboundOrder(
                    product_id=product.id,
                    quantity=quantity,
                    warehouse=warehouse,
                    user_uuid=rng.choice(user_uuids),
                    notes=f"Salida {s+1} — pedido cliente / interno",
                    created_at=created,
                ))
                n_out += 1

        session.commit()
        print(f"✅ Creadas {n_in} órdenes de entrada y {n_out} de salida")

    # Resumen final
    with Session(engine) as session:
        total_p = len(session.exec(select(Product)).all())
        total_in = len(session.exec(select(InboundOrder)).all())
        total_out = len(session.exec(select(OutboundOrder)).all())
    print("\n── Estado final ──")
    print(f"Productos (SQL)      : {total_p}")
    print(f"InboundOrders (SQL)  : {total_in}")
    print(f"OutboundOrders (SQL) : {total_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())