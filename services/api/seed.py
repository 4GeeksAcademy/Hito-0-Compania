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

from app.core.database import profiles_table, users_table

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


def main():
    do_clean = "--clean" in sys.argv

    if do_clean:
        clean()

    seed_users()
    seed_suppliers()

    print("\n📋  Resumen de credenciales de usuario:")
    print("   ┌─────────────────────┬──────────────┐")
    print("   │ Email               │ Contraseña   │")
    print("   ├─────────────────────┼──────────────┤")
    for data in SEED_USERS:
        print(f"   │ {data['email']:<20} │ {data['password']:<12} │")
    print("   └─────────────────────┴──────────────┘")


if __name__ == "__main__":
    main()