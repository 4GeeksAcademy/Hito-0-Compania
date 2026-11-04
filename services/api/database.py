from pathlib import Path

from tinydb import TinyDB
from tinydb.table import Table


DB_PATH = Path(__file__).resolve().parent / "suppliers_db.json"


def get_db() -> TinyDB:
	try:
		return TinyDB(DB_PATH)
	except Exception as exc:
		# No exponemos la ruta interna en el mensaje.
		raise RuntimeError(
			"No se pudo abrir la base de datos de proveedores."
		) from exc


def get_suppliers_table() -> tuple[TinyDB, Table]:
	db = get_db()
	return db, db.table("suppliers")
