"""
Seed data — pobla la base de datos con usuarios, perfiles y proveedores de prueba.

Uso:
    uv run python seed.py              # Carga los datos
    uv run python seed.py --clean      # Limpia y carga los datos
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from passlib.hash import bcrypt
from tinydb import Query, TinyDB

from app.core.database import engine, get_db, profiles_table, users_table
from sqlmodel import Session, select

from app.models.inventory import InboundOrder, OutboundOrder, Product

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
    """Inserta los datos de prueba para usuarios y perfiles."""
    for data in SEED_USERS:
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

        print(f"✅  {data['email']:<20} → role: {data['role']}")

    print(f"\n🎉  {len(SEED_USERS)} usuarios creados")


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


def main():
    do_clean = "--clean" in sys.argv

    if do_clean:
        clean()

    seed_users()
    seed_suppliers()

    print("\n🏭  Sembrando inventario en Supabase...")
    from app.core.database import engine
    from sqlmodel import Session
    from tinydb import Query

    admin_user = users_table.get(Query().email == "admin@test.com")
    default_user_uuid = admin_user["id"] if admin_user else str(uuid4())

    with Session(engine) as db_session:
        seed_inventory(db_session, default_user_uuid)

    print("\n📋  Resumen de credenciales de usuario:")
    print("   ┌─────────────────────┬──────────────┐")
    print("   │ Email               │ Contraseña   │")
    print("   ├─────────────────────┼──────────────┤")
    for data in SEED_USERS:
        print(f"   │ {data['email']:<20} │ {data['password']:<12} │")
    print("   └─────────────────────┴──────────────┘")


if __name__ == "__main__":
    main()