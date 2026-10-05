from __future__ import annotations

import csv
import io
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

# Ajuste de path para que "services.api" y "app" sean importables sin importar el cwd
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(CURRENT_DIR))
for path in (REPO_ROOT, CURRENT_DIR):
    if path not in sys.path:
        sys.path.insert(0, path)

# Importar rutas de proveedores e incidencias
from services.api.routes.suppliers import router as suppliers_router
from services.api.routes.incidents import router as incidents_router

from incident_analyzer import analyze_incidents, flatten_summary_to_rows, parse_incidents_csv
from app.routers import auth as auth_router
from app.routers import inventory as inventory_router
from app.routers import profiles as profiles_router
from app.routers import users as users_router
from app.core.database import init_supabase


@asynccontextmanager
async def _lifespan(app: FastAPI):
    """Inicializa tablas y siembra datos de prueba al arrancar."""
    # 1. Crear tablas de inventario (SQLite/SQLModel)
    init_supabase()

    # 2. Sembrar datos semilla (idempotente — no duplica)
    try:
        from services.api.seed import seed_all
        seed_all(include_incidents=True, verbose=False)
    except Exception as exc:
        # No debe impedir el arranque del servidor
        print(f"⚠️  Error en seed automático (el servidor igual funciona): {exc}")

    yield


# Inicialización de FastAPI
app = FastAPI(title="TrackFlow Unified API", version="1.0.0", lifespan=_lifespan)


def humanize_validation_error(error: dict[str, Any]) -> str:
    """Traduce un error de Pydantic a un mensaje legible para personas.

    Los mensajes nativos de Pydantic están en inglés y son técnicos
    (p.ej. "String should have at least 1 character"). Aquí se convierten
    a frases claras en español que un usuario final puede entender.
    """
    error_type = error.get("type", "")
    field = str(error.get("loc", ["campo"])[-1]) if error.get("loc") else "campo"
    input_value = error.get("input")
    ctx = error.get("ctx") or {}
    expected = ctx.get("expected")

    # Descartar envoltorio técnico de Pydantic
    raw_msg = (error.get("msg") or "").replace("Value error, ", "")

    raise_description = {
        "missing": "Falta un valor obligatorio.",
        "string_too_short": "El valor es demasiado corto; asegúrate de rellenarlo completo.",
        "string_too_long": "El valor es demasiado largo.",
        "string_type": "El valor debe ser texto.",
        "int_type": "El valor debe ser un número entero.",
        "float_type": "El valor debe ser un número.",
        "bool_type": "El valor debe ser verdadero o falso.",
        "list_type": "El formato de este campo es incorrecto.",
        "dict_type": "El formato de este campo es incorrecto.",
        "date_type": "La fecha no tiene el formato correcto.",
        "datetime_type": "La fecha y hora no tienen el formato correcto.",
        "uuid_type": "El identificador no es válido.",
        "enum": "El valor elegido no es válido. Elige una de las opciones disponibles.",
        "literal_error": "El valor elegido no es válido. Elige una de las opciones disponibles.",
        "email": "El correo electrónico no es válido.",
    }

    if error_type in raise_description:
        return raise_description[error_type]

    # Casos específicos por tipo de validador
    if error_type == "value_error":
        if "minimum" in raw_msg.lower():
            return "El valor está por debajo del mínimo permitido."
        if "maximum" in raw_msg.lower():
            return "El valor supera el máximo permitido."
        if "invalid" in raw_msg.lower() and "email" in raw_msg.lower():
            return "El correo electrónico no es válido."
        # Mensaje personalizado en español lanzado con raise ValueError(...)
        return raw_msg

    if error_type.endswith("_too_short"):
        min_len = ctx.get("min_length")
        if min_len:
            return f"Debe contener al menos {min_len} carácter(es)."
        return "El valor es demasiado corto."

    if error_type.endswith("_too_long"):
        max_len = ctx.get("max_length")
        if max_len:
            return f"No puede superar los {max_len} caracteres."
        return "El valor es demasiado largo."

    if error_type in ("enum", "literal_error"):
        if expected:
            return f"El valor elegido no es válido. Opciones permitidas: {expected}."

    if "email" in raw_msg:
        return "El correo electrónico no es válido."

    # Fallback seguro:
    #  - value_error: usa el mensaje personalizado (p.ej. raise ValueError en español)
    #  - el resto: mensaje genérico en español, nunca el mensaje técnico de Pydantic.
    if error_type == "value_error":
        return raw_msg
    return "El valor introducido no es válido."

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Manejadores globales de errores
# ──────────────────────────────────────────────


@app.exception_handler(RequestValidationError)
def validation_exception_handler(_request, exc: RequestValidationError) -> JSONResponse:
    """Errores de validación Pydantic → 400 con campo problemático y mensaje claro en español."""
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error.get("loc", [])) if error.get("loc") else "body"
        message = humanize_validation_error(error)
        errors.append({"field": field, "message": message})
    return JSONResponse(
        status_code=400,
        content={"detail": errors},
    )


@app.exception_handler(Exception)
def global_exception_handler(_request, exc: Exception) -> JSONResponse:
    """Cualquier excepción no controlada → 500 genérico, nunca stack trace."""
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor. Intente nuevamente más tarde."},
    )


# Inclusión de routers
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(profiles_router.router)
# Inventario — rutas protegidas (productos y órdenes con SQLModel + Supabase)
app.include_router(inventory_router.router)
# Proveedores — acceso público (no requiere login)
app.include_router(suppliers_router)
# Incidencias — acceso público (no requiere login)
app.include_router(incidents_router)

# Montaje de archivos estáticos para Backoffice
BACKOFFICE_DIR = Path(__file__).resolve().parents[2] / "uis" / "backoffice"
if BACKOFFICE_DIR.exists():
    app.mount("/backoffice", StaticFiles(directory=BACKOFFICE_DIR, html=True), name="backoffice")

# Montaje de archivos estáticos para Gestor de Incidencias
INCIDENT_DIR = Path(__file__).resolve().parents[2] / "uis" / "incident-manager"
if INCIDENT_DIR.exists():
    app.mount("/incident-manager", StaticFiles(directory=INCIDENT_DIR, html=True), name="incident-manager")


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