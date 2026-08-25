"""
Seed data — pobla la base de datos con usuarios y perfiles de prueba.

Uso:
    uv run python seed.py              # Carga los datos
    uv run python seed.py --clean      # Limpia y carga los datos
"""

import sys
from datetime import datetime, timezone
from uuid import uuid4

from passlib.hash import bcrypt

from app.core.database import users_table, profiles_table


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


def clean():
    """Elimina todos los datos existentes."""
    users_table.truncate()
    profiles_table.truncate()
    print("🗑️  Base de datos limpiada")


def seed():
    """Inserta los datos de prueba."""
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


def main():
    do_clean = "--clean" in sys.argv

    if do_clean:
        clean()

    seed()

    print("\n📋  Resumen de credenciales:")
    print("   ┌─────────────────────┬──────────────┐")
    print("   │ Email               │ Contraseña   │")
    print("   ├─────────────────────┼──────────────┤")
    for data in SEED_USERS:
        print(f"   │ {data['email']:<20} │ {data['password']:<12} │")
    print("   └─────────────────────┴──────────────┘")


if __name__ == "__main__":
    main()