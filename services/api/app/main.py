import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request

from fastapi.middleware.cors import CORSMiddleware

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


app.include_router(users.router)
app.include_router(profiles.router)
app.include_router(auth.router)
app.include_router(inventory.router)


@app.get("/")
def home():
    return {
        "message": "API funcionando"
    }