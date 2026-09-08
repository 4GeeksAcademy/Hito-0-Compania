from pathlib import Path
from tinydb import TinyDB


BASE_DIR = Path(__file__).resolve().parent.parent.parent
# app/core/ -> app/ -> services/api/
DATA_DIR = BASE_DIR / "data"

try:
    DATA_DIR.mkdir(exist_ok=True)
except OSError as exc:
    # No exponer rutas internas del servidor.
    raise RuntimeError("No se pudo inicializar el directorio de datos.") from exc

try:
    db = TinyDB(DATA_DIR / "db.json")
except Exception as exc:
    raise RuntimeError(
        "No se pudo abrir la base de datos principal del sistema."
    ) from exc

users_table = db.table("users")
profiles_table = db.table("profiles")
reset_tokens_table = db.table("reset_tokens")
incidents_table = db.table("incidents")