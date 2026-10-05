from pathlib import Path
from typing import Generator

from sqlmodel import Session, SQLModel, create_engine
from tinydb import TinyDB

from app.core.config import DATABASE_URL
from app.models.inventory import InboundOrder, OutboundOrder, Product  # noqa: F401

# ── Directorio de datos ──
BASE_DIR = Path(__file__).resolve().parent.parent.parent
# app/core/ -> app/ -> services/api/
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# ════════════════════════════════════════════
# Base de datos 1: TinyDB (autenticación)
# ════════════════════════════════════════════
db = TinyDB(DATA_DIR / "db.json")

users_table = db.table("users")
profiles_table = db.table("profiles")
reset_tokens_table = db.table("reset_tokens")
incidents_table = db.table("incidents")

# ════════════════════════════════════════════
# Base de datos 2: Supabase / PostgreSQL (inventario)
# ════════════════════════════════════════════
engine = create_engine(DATABASE_URL, echo=False)


def init_supabase() -> None:
    """Crea todas las tablas definidas con SQLModel en Supabase."""
    SQLModel.metadata.create_all(engine)


def get_db() -> Generator[Session, None, None]:
    """Dependencia FastAPI: sesión SQLModel por petición (inyectada con Depends())."""
    with Session(engine) as session:
        yield session