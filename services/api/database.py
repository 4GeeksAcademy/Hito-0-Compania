from pathlib import Path

from tinydb import TinyDB
from tinydb.table import Table


DB_PATH = Path(__file__).resolve().parent / "suppliers_db.json"


def get_db() -> TinyDB:
	return TinyDB(DB_PATH)


def get_suppliers_table() -> tuple[TinyDB, Table]:
	db = get_db()
	return db, db.table("suppliers")
