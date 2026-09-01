from __future__ import annotations

import csv
import io
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

# Ajuste de path para que "services.api" y "app" sean importables sin importar el cwd
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(CURRENT_DIR))
for path in (REPO_ROOT, CURRENT_DIR):
    if path not in sys.path:
        sys.path.insert(0, path)

# Importar rutas de proveedores
from services.api.routes.suppliers import router as suppliers_router

from incident_analyzer import analyze_incidents, flatten_summary_to_rows, parse_incidents_csv
from app.core.security import get_current_user
from app.routers import auth as auth_router
from app.routers import profiles as profiles_router
from app.routers import users as users_router


# Inicialización de FastAPI
app = FastAPI(title="TrackFlow Unified API", version="1.0.0")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.app\.github\.dev",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusión de routers
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(profiles_router.router)
# Proveedores protegidos: requieren estar logueado
app.include_router(suppliers_router, dependencies=[Depends(get_current_user)])

# Montaje de archivos estáticos para Backoffice
BACKOFFICE_DIR = Path(__file__).resolve().parents[2] / "uis" / "backoffice"
if BACKOFFICE_DIR.exists():
    app.mount("/backoffice", StaticFiles(directory=BACKOFFICE_DIR, html=True), name="backoffice")


# Variables globales para análisis de incidentes
LAST_ANALYSIS: dict[str, Any] | None = None
LAST_ANALYSIS_AT: str | None = None


def _decode_csv(upload: UploadFile) -> str:
    if not upload.filename:
        raise HTTPException(status_code=400, detail="No se recibio nombre de archivo.")

    if not upload.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=415, detail="Formato no soportado. Debe ser .csv")

    raw = upload.file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="El fichero CSV esta vacio.")

    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="El CSV debe estar codificado en UTF-8.",
        ) from exc


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/incidents/analyze")
def analyze_incidents_endpoint(file: UploadFile = File(...)) -> dict[str, Any]:
    csv_content = _decode_csv(file)

    try:
        rows = parse_incidents_csv(csv_content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    summary = analyze_incidents(rows)

    global LAST_ANALYSIS, LAST_ANALYSIS_AT
    LAST_ANALYSIS = summary
    LAST_ANALYSIS_AT = datetime.now(timezone.utc).isoformat()

    return {
        "analyzed_at": LAST_ANALYSIS_AT,
        "summary": summary,
    }


@app.get("/api/incidents/results/export")
def export_last_results() -> StreamingResponse:
    if LAST_ANALYSIS is None:
        raise HTTPException(
            status_code=404,
            detail="No hay analisis previo para exportar. Ejecuta primero POST /api/incidents/analyze.",
        )

    flat_rows = flatten_summary_to_rows(LAST_ANALYSIS)
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=["section", "metric", "value"])
    writer.writeheader()
    writer.writerows(flat_rows)
    buffer.seek(0)

    timestamp = (LAST_ANALYSIS_AT or "latest").replace(":", "-")
    filename = f"incidents-results-{timestamp}.csv"

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )