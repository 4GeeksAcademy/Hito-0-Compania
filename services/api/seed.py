"""
Seed data — pobla la base de datos con usuarios, perfiles, proveedores,
inventario e incidencias de prueba.

Uso directo:
    uv run python seed.py                    # Carga los datos
    uv run python seed.py --clean            # Limpia y carga los datos
    uv run python seed.py --include-incidents  # Incluye incidencias desde CSV

Uso programático:
    from seed import seed_all
    seed_all()                               # Todo incluido
"""

from __future__ import annotations

import csv
import io
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from passlib.hash import bcrypt
from tinydb import Query, TinyDB

from app.core.database import (
    engine,
    get_db,
    incidents_table,
    profiles_table,
    users_table,
)
from sqlmodel import Session, select

from app.models.inventory import InboundOrder, OutboundOrder, Product

# ──────────────────────────────────────────────
# Incidencias — importaciones de shared
# ──────────────────────────────────────────────
try:
    from shared.csv_validation import (  # type: ignore[import-untyped]
        CSV_CATEGORY_TO_INCIDENT,
        CSV_STATUS_TO_INCIDENT,
        parse_incidents_csv,
        _validate_row,
    )
except ImportError:
    # Fallback: buscar en packages/shared/py
    _shared_dir = (Path(__file__).resolve().parents[2] / "packages" / "shared" / "py").resolve()
    if _shared_dir.exists():
        sys.path.insert(0, str(_shared_dir))
        from shared.csv_validation import (  # type: ignore[import-untyped]
            CSV_CATEGORY_TO_INCIDENT,
            CSV_STATUS_TO_INCIDENT,
            parse_incidents_csv,
            _validate_row,
        )
    else:
        CSV_CATEGORY_TO_INCIDENT = {}
        CSV_STATUS_TO_INCIDENT = {}
        parse_incidents_csv = None  # type: ignore[assignment]
        _validate_row = None  # type: ignore[assignment]

# ── Ruta al CSV de incidencias ──
_INCIDENTS_CSV_PATH = Path(__file__).resolve().parents[2] / "scripts" / "incidents-COMPANY.csv"

# ── Country → branch mapping ──
_COUNTRY_TO_BRANCH = {
    "US": "US Central",
    "ES": "Spain Central",
}

# ════════════════════════════════════════════
# Seed data — Inventario (Supabase / SQLModel)
# ════════════════════════════════════════════

SEED_USERS = [
    {
        "email": "admin@test.com",
        "password": "admin123",
        "name": "Admin",
        "phone": "1111111111",
        "address": "Oficina Central",
        "role": "admin",
    },
    {
        "email": "manager@test.com",
        "password": "manager123",
        "name": "Manager",
        "phone": "2222222222",
        "address": "Oficina Sucursal",
        "role": "manager",
    },
    {
        "email": "user1@test.com",
        "password": "user123",
        "name": "Usuario Uno",
        "phone": "3333333333",
        "address": "Calle Falsa 123",
        "role": "user",
    },
    {
        "email": "user2@test.com",
        "password": "user123",
        "name": "Usuario Dos",
        "phone": "4444444444",
        "address": "Avenida Siempre Viva 742",
        "role": "user",
    },
    {
        "email": "alumno@test.com",
        "password": "12345678",
        "name": "Alumno",
        "phone": "1122334455",
        "address": "Buenos Aires",
        "role": "user",
    },
]

SUPPLIERS_SEED = [
    {
        "name": "UPS Ground",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 7.45,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "business@ups.com",
        "notes": "Carrier principal para entregas locales en Los Angeles y alrededores.",
    },
    {
        "name": "FedEx Ground",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 7.90,
        "currency": "USD",
        "status": "active",
        "service_zone": "Continental USA",
        "contact_email": "business.solutions@fedex.com",
    },
    {
        "name": "DHL Express USA",
        "country": "USA",
        "categories": ["carrier_last_mile", "carrier_international"],
        "rate_per_shipment": 14.20,
        "currency": "USD",
        "status": "active",
        "service_zone": "Continental USA + International",
        "contact_email": "business.us@dhl.com",
        "notes": "Usado para envios urgentes y exportaciones a Europa.",
    },
    {
        "name": "OnTrac",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 6.10,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "solutions@ontrac.com",
        "notes": "Carrier regional. Mejor tarifa en la zona de Los Angeles.",
    },
    {
        "name": "Laser Ship",
        "country": "USA",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 5.80,
        "currency": "USD",
        "status": "suspended",
        "service_zone": "East Coast",
        "contact_email": "business@lasership.com",
        "notes": "Suspendido. Tasa de incidencias superior al 8% en Q3.",
    },
    {
        "name": "PackSource LA",
        "country": "USA",
        "categories": ["packaging_materials"],
        "rate_per_shipment": 0.42,
        "currency": "USD",
        "status": "active",
        "contact_email": "orders@packsource.com",
        "notes": "Cajas, relleno y precinto para el almacen de Los Angeles.",
    },
    {
        "name": "CleanTeam West",
        "country": "USA",
        "categories": ["cleaning_and_facilities"],
        "rate_per_shipment": 1800.0,
        "currency": "USD",
        "status": "active",
        "contact_email": "accounts@cleanteamwest.com",
        "notes": "Tarifa mensual por servicio de limpieza del almacen de LA.",
    },
    {
        "name": "MRW Espana",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 4.90,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Peninsula Iberica",
        "contact_email": "clientes.empresa@mrw.es",
        "notes": "Carrier principal para entregas en Espana. Contrato negociado por volumen.",
    },
    {
        "name": "SEUR",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 5.20,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Peninsula Iberica + Baleares",
        "contact_email": "grandes.cuentas@seur.com",
    },
    {
        "name": "DHL Express Espana",
        "country": "Spain",
        "categories": ["carrier_last_mile", "carrier_international"],
        "rate_per_shipment": 12.80,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Espana + Internacional",
        "contact_email": "business.es@dhl.com",
        "notes": "Envios urgentes y exportaciones desde Zaragoza.",
    },
    {
        "name": "Nacex",
        "country": "Spain",
        "categories": ["carrier_last_mile"],
        "rate_per_shipment": 4.60,
        "currency": "EUR",
        "status": "active",
        "service_zone": "Aragon y zona norte",
        "contact_email": "empresas@nacex.es",
        "notes": "Carrier regional con buena cobertura en Aragon.",
    },
    {
        "name": "Logistica Inversa Iberia",
        "country": "Spain",
        "categories": ["reverse_logistics"],
        "rate_per_shipment": 6.30,
        "currency": "EUR",
        "status": "active",
        "contact_email": "operaciones@liiberia.es",
        "notes": "Gestion de devoluciones para el almacen de Zaragoza.",
    },
    {
        "name": "Embalajes Zaragoza S.L.",
        "country": "Spain",
        "categories": ["packaging_materials"],
        "rate_per_shipment": 0.28,
        "currency": "EUR",
        "status": "active",
        "contact_email": "pedidos@embalajeszgz.es",
    },
    {
        "name": "SAP WM Cloud",
        "country": "USA",
        "categories": ["it_and_wms_software"],
        "rate_per_shipment": 2200.0,
        "currency": "USD",
        "status": "suspended",
        "contact_email": "enterprise@sap.com",
        "notes": "Suspendido. Andres esta evaluando alternativas mas ligeras para el almacen de LA.",
    },
    {
        "name": "ReturnBear",
        "country": "USA",
        "categories": ["reverse_logistics"],
        "rate_per_shipment": 4.15,
        "currency": "USD",
        "status": "active",
        "service_zone": "West Coast",
        "contact_email": "partnerships@returnbear.com",
        "notes": "Gestion de devoluciones para clientes de Los Angeles.",
    },
]

SEED_PRODUCTS = [
    {
        "name": "EcoBottle Pro",
        "sku": "ECO-001",
        "description": "Botella reutilizable de acero inoxidable 500ml",
        "category": "hidratacion",
    },
    {
        "name": "FitBand Watch",
        "sku": "FIT-001",
        "description": "Reloj inteligente con monitor de actividad fisica",
        "category": "tecnologia",
    },
    {
        "name": "Canvas Tote Bag",
        "sku": "CAN-001",
        "description": "Bolsa de tela reutilizable con asas largas",
        "category": "accesorios",
    },
    {
        "name": "Solar Charger 20W",
        "sku": "SOL-001",
        "description": "Cargador solar portatil de 20W con doble puerto USB",
        "category": "tecnologia",
    },
]

SEED_INBOUND: list[dict] = [
    {"product_index": 0, "quantity": 100, "warehouse": "Los Angeles"},
    {"product_index": 0, "quantity": 50,  "warehouse": "Zaragoza"},
    {"product_index": 1, "quantity": 75,  "warehouse": "Los Angeles"},
    {"product_index": 2, "quantity": 200, "warehouse": "Zaragoza"},
    {"product_index": 3, "quantity": 30,  "warehouse": "Los Angeles"},
]

SEED_OUTBOUND: list[dict] = [
    {"product_index": 0, "quantity": 20, "warehouse": "Los Angeles"},
    {"product_index": 0, "quantity": 10, "warehouse": "Zaragoza"},
    {"product_index": 1, "quantity": 15, "warehouse": "Los Angeles"},
    {"product_index": 2, "quantity": 50, "warehouse": "Zaragoza"},
]


def clean():
    """Elimina todos los datos existentes."""
    users_table.truncate()
    profiles_table.truncate()
    
    # Limpia también la base de proveedores si existe
    db_path = Path(__file__).resolve().parent / "suppliers_db.json"
    if db_path.exists():
        db = TinyDB(db_path)
        db.table("suppliers").truncate()
        db.close()
        
    print("🗑️  Base de datos limpiada")


def seed_users():
    """Inserta los datos de prueba para usuarios y perfiles. Idempotente."""
    user_query = Query()
    inserted_count = 0

    for data in SEED_USERS:
        # Idempotent: saltar si ya existe
        existing = users_table.get(user_query.email == data["email"])
        if existing:
            print(f"⏭️  {data['email']:<20} → ya existe")
            continue

        user_id = str(uuid4())

        user = {
            "id": user_id,
            "email": data["email"],
            "hashed_password": bcrypt.hash(data["password"]),
            "is_active": True,
            "role": data["role"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        profile = {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": data["name"],
            "phone": data["phone"],
            "address": data["address"],
        }

        users_table.insert(user)
        profiles_table.insert(profile)
        inserted_count += 1
        print(f"✅  {data['email']:<20} → role: {data['role']}")

    print(f"\n🎉  {inserted_count} usuarios nuevos creados (de {len(SEED_USERS)} definidos)")


def seed_suppliers():
    """Inserta los datos de prueba para proveedores."""
    db_path = Path(__file__).resolve().parent / "suppliers_db.json"
    db = TinyDB(db_path)
    suppliers_table = db.table("suppliers")
    supplier = Query()

    inserted_count = 0

    for item in SUPPLIERS_SEED:
        exists = suppliers_table.contains(
            (supplier.name == item["name"]) & (supplier.country == item["country"])
        )
        if exists:
            continue

        new_item = item.copy()
        new_item["updated_at"] = datetime.now(timezone.utc).isoformat()
        suppliers_table.insert(new_item)
        inserted_count += 1

    print(f"📦  Seeder de proveedores completado. Registros insertados: {inserted_count}")
    db.close()


def seed_inventory(db_session: Session, default_user_uuid: str) -> None:
    """Inserta productos y ordenes de entrada/salida de prueba en Supabase.

    Stock neto esperado:
        EcoBottle Pro (ECO-001):  LA=80,  Zaragoza=40, Total=120
        FitBand Watch (FIT-001):  LA=60,  Zaragoza=0,  Total=60
        Canvas Tote Bag (CAN-001): LA=0,  Zaragoza=150, Total=150
        Solar Charger 20W (SOL-001): LA=30, Zaragoza=0, Total=30
    """

    # ── Productos ──
    products: list[Product] = []
    for data in SEED_PRODUCTS:
        existing = db_session.exec(
            select(Product).where(Product.sku == data["sku"])
        ).first()
        if existing:
            products.append(existing)
            continue

        product = Product(**data)
        db_session.add(product)
        db_session.flush()
        db_session.refresh(product)
        products.append(product)
        print(f"   📦  {product.sku:<10} {product.name}")

    # ── Ordenes de entrada ──
    for entry in SEED_INBOUND:
        product = products[entry["product_index"]]
        order = InboundOrder(
            product_id=product.id,
            quantity=entry["quantity"],
            warehouse=entry["warehouse"],
            user_uuid=default_user_uuid,
        )
        db_session.add(order)

    # ── Ordenes de salida ──
    for entry in SEED_OUTBOUND:
        product = products[entry["product_index"]]
        order = OutboundOrder(
            product_id=product.id,
            quantity=entry["quantity"],
            warehouse=entry["warehouse"],
            user_uuid=default_user_uuid,
        )
        db_session.add(order)

    db_session.commit()
    print(f"   📥  {len(SEED_INBOUND)} ordenes de entrada")
    print(f"   📤  {len(SEED_OUTBOUND)} ordenes de salida")


def seed_incidents():
    """Inserta incidencias históricas desde el CSV. Idempotente (por csv_ref)."""
    csv_path = _INCIDENTS_CSV_PATH

    if not csv_path.exists():
        print("⚠️   Archivo CSV de incidencias no encontrado → saltando seed de incidencias")
        print(f"    Buscado en: {csv_path}")
        return

    if parse_incidents_csv is None:
        print("⚠️   Módulo shared.csv_validation no disponible → saltando seed de incidencias")
        return

    csv_content = csv_path.read_text(encoding="utf-8")

    try:
        rows = parse_incidents_csv(csv_content)
    except ValueError as exc:
        print(f"❌  Error de estructura CSV: {exc}")
        return

    table = incidents_table
    inserted = 0
    skipped_invalid = 0
    skipped_duplicate = 0

    for idx, csv_row in enumerate(rows):
        row_number = idx + 2

        issues = _validate_row(csv_row, row_number)
        if issues:
            skipped_invalid += 1
            continue

        # Transform CSV row to incident record
        csv_status = csv_row["status"]
        csv_category = csv_row["category"]
        incident_status = CSV_STATUS_TO_INCIDENT.get(csv_status)
        incident_category = CSV_CATEGORY_TO_INCIDENT.get(csv_category)

        if incident_status is None or incident_category is None:
            skipped_invalid += 1
            continue

        # Title: first 80 chars of description
        description = csv_row["description"]
        title_candidate = description.strip()
        if len(title_candidate) > 80:
            truncated = title_candidate[:80]
            last_dot = truncated.rfind(".")
            if last_dot > 20:
                title_candidate = truncated[: last_dot + 1]
            else:
                title_candidate = truncated + "…"
        if not title_candidate:
            title_candidate = f"Incidencia {csv_row.get('incident_id', 'desconocida')}"

        # Date parsing
        try:
            created_dt = datetime.strptime(csv_row["created_at"], "%Y-%m-%d")
            created_at = created_dt.replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            created_at = datetime.now(timezone.utc).isoformat()

        branch = _COUNTRY_TO_BRANCH.get(csv_row["country"], "central")
        now = datetime.now(timezone.utc).isoformat()
        csv_ref = f"csv:{csv_row.get('incident_id', '')}"

        # Idempotency check
        if len(table.search(lambda doc: doc.get("csv_ref") == csv_ref)) > 0:
            skipped_duplicate += 1
            continue

        record = {
            "id": str(uuid4()),
            "title": title_candidate,
            "description": description,
            "category": incident_category,
            "status": incident_status,
            "origin": "customer",
            "branch": branch,
            "created_at": created_at,
            "updated_at": now,
            "csv_ref": csv_ref,
        }

        table.insert(record)
        inserted += 1

    total = len(rows)
    print(f"📋  Incidencias: {inserted} insertadas, {skipped_invalid} inválidas, "
          f"{skipped_duplicate} duplicadas (de {total} en CSV)")


def seed_all(*, include_incidents: bool = True, verbose: bool = True) -> None:
    """Ejecuta todos los seeders en orden. Idempotente.

    Args:
        include_incidents: Si True, carga también las incidencias desde el CSV.
        verbose: Si True, imprime el resumen de credenciales.
    """
    print("🌱  Seed — Inicio")
    print("═" * 40)

    # 1. Usuarios y perfiles
    seed_users()

    # 2. Proveedores
    seed_suppliers()

    # 3. Inventario (requiere admin user)
    print("\n🏭  Sembrando inventario...")
    from sqlmodel import Session

    admin_user = users_table.get(Query().email == "admin@test.com")
    default_user_uuid = admin_user["id"] if admin_user else str(uuid4())

    with Session(engine) as db_session:
        seed_inventory(db_session, default_user_uuid)

    # 4. Incidencias (desde CSV)
    if include_incidents:
        print()
        seed_incidents()

    # 5. Resumen
    if verbose:
        print("\n📋  Resumen de credenciales de usuario:")
        print("   ┌─────────────────────┬──────────────┐")
        print("   │ Email               │ Contraseña   │")
        print("   ├─────────────────────┼──────────────┤")
        for data in SEED_USERS:
            print(f"   │ {data['email']:<20} │ {data['password']:<12} │")
        print("   └─────────────────────┴──────────────┘")

    print("\n✅  Seed completado. Todos los datos están listos.")


def main():
    do_clean = "--clean" in sys.argv
    include_incidents = "--include-incidents" in sys.argv

    if do_clean:
        clean()

    seed_all(include_incidents=include_incidents)


if __name__ == "__main__":
    main()