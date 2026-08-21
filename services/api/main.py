from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from services.api.routes.suppliers import router as suppliers_router


app = FastAPI(title="TrackFlow Suppliers API")
app.add_middleware(
	CORSMiddleware,
	allow_origins=[
		"http://localhost:8080",
		"http://127.0.0.1:8080",
		"http://localhost:5500",
		"http://127.0.0.1:5500",
	],
	allow_origin_regex=r"https://.*\.app\.github\.dev",
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)
app.include_router(suppliers_router)

BACKOFFICE_DIR = Path(__file__).resolve().parents[2] / "uis" / "backoffice"
if BACKOFFICE_DIR.exists():
	app.mount("/backoffice", StaticFiles(directory=BACKOFFICE_DIR, html=True), name="backoffice")
