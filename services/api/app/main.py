import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.database import init_supabase
from app.routers import auth, inventory, profiles, users

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("api.timing")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: inicializar esquema en Supabase
    init_supabase()
    yield


app = FastAPI(
    title="Company API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = (time.perf_counter() - start) * 1000
    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} | {duration:.1f}ms"
    )
    return response

# ──────────────────────────────────────────────
# Manejadores globales de errores
# ──────────────────────────────────────────────


@app.exception_handler(RequestValidationError)
def validation_exception_handler(_request, exc: RequestValidationError) -> JSONResponse:
    """Errores de validación Pydantic → 400 con campo y mensaje claro."""
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error.get("loc", [])) if error.get("loc") else "body"
        message = "El valor introducido no es válido."
        if error.get("type") == "value_error":
            raw_msg = (error.get("msg") or "").replace("Value error, ", "")
            message = raw_msg
        elif error.get("type") == "string_too_short":
            message = "El valor es demasiado corto."
        elif error.get("type") == "missing":
            message = "Falta un valor obligatorio."
        errors.append({"field": field, "message": message})
    return JSONResponse(
        status_code=400,
        content={"detail": errors},
    )


@app.exception_handler(Exception)
def global_exception_handler(_request, exc: Exception) -> JSONResponse:
    """Cualquier excepción no controlada → 500 genérico, sin stack trace."""
    from fastapi import HTTPException
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor. Intente nuevamente más tarde."},
    )


app.include_router(users.router)
app.include_router(profiles.router)
app.include_router(auth.router)
app.include_router(inventory.router)


@app.get("/")
def home():
    return {
        "message": "API funcionando"
    }