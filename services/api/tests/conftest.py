"""
Fixtures compartidos para todas las suites de tests de la API de autenticación.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from passlib.hash import bcrypt
from tinydb import TinyDB, Query

# ── Forzar variables de entorno antes de cualquier import del módulo app ──
ENV_PATH = Path(__file__).resolve().parent / ".env"
if ENV_PATH.exists():
    from dotenv import load_dotenv
    load_dotenv(ENV_PATH, override=True)

# También cargar .env.test como respaldo
ENV_TEST_PATH = Path(__file__).resolve().parent / ".env.test"
if ENV_TEST_PATH.exists():
    from dotenv import load_dotenv
    load_dotenv(ENV_TEST_PATH, override=True)

os.environ.setdefault("JWT_SECRET", "test-secret-key-for-testing-only")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("RESET_TOKEN_EXPIRE_MINUTES", "30")

# Ajustar sys.path para que los imports funcionen desde cualquier CWD
_API_DIR = Path(__file__).resolve().parent.parent  # services/api/
_PARENT_DIR = _API_DIR.parent.parent  # raíz del repo
for p in (str(_PARENT_DIR), str(_API_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.core.database import users_table, profiles_table, reset_tokens_table  # noqa: E402
from app.core.security import create_access_token  # noqa: E402
from app.services.crud import create_user  # noqa: E402
from main import app  # noqa: E402


# ── Helpers ──

USER = Query()


def _seed_user(
    email: str = "test@example.com",
    password: str = "password123",
    role: str = "user",
    **extra: Any,
) -> dict:
    """Crea un usuario en la BD de pruebas y devuelve su dict."""
    user_id = str(uuid4())
    user = {
        "id": user_id,
        "email": email,
        "hashed_password": bcrypt.hash(password),
        "is_active": True,
        "role": role,
        "created_at": "2025-01-01T00:00:00Z",
        **extra,
    }
    profile = {
        "id": str(uuid4()),
        "user_id": user_id,
        "name": "Test User",
        "phone": "555-0000",
        "address": "123 Test St",
    }
    create_user(user, profile)
    return user


def _token_for(user: dict) -> str:
    """Genera un token JWT para el usuario indicado."""
    return create_access_token(user["id"])


def _clear_db() -> None:
    """Limpia todas las tablas de la BD."""
    users_table.truncate()
    profiles_table.truncate()
    reset_tokens_table.truncate()


# ── Fixtures ──


@pytest.fixture(autouse=True)
def _clean_db() -> Generator[None, None, None]:
    """Limpia la BD antes de cada test. Se ejecuta automáticamente."""
    _clear_db()
    yield
    _clear_db()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Cliente de pruebas HTTP para la API."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def user() -> dict:
    """Usuario de prueba con role='user'."""
    return _seed_user()


@pytest.fixture
def admin_user() -> dict:
    """Usuario de prueba con role='admin'."""
    return _seed_user(
        email="admin@example.com",
        password="adminpass123",
        role="admin",
    )


@pytest.fixture
def second_user() -> dict:
    """Segundo usuario de prueba (role='user')."""
    return _seed_user(
        email="user2@example.com",
        password="password456",
    )


@pytest.fixture
def user_token(user: dict) -> str:
    """Token JWT para el usuario de prueba."""
    return _token_for(user)


@pytest.fixture
def admin_token(admin_user: dict) -> str:
    """Token JWT para el admin de prueba."""
    return _token_for(admin_user)


@pytest.fixture
def second_user_token(second_user: dict) -> str:
    """Token JWT para el segundo usuario."""
    return _token_for(second_user)