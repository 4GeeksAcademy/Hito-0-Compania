from pathlib import Path
from tinydb import TinyDB


BASE_DIR = Path(__file__).resolve().parent.parent.parent
# app/core/ -> app/ -> services/api/
DATA_DIR = BASE_DIR / "data"

DATA_DIR.mkdir(exist_ok=True)

db = TinyDB(DATA_DIR / "db.json")

users_table = db.table("users")
profiles_table = db.table("profiles")
password_resets_table = db.table("password_resets")
password_audit_table = db.table("password_audit_log")