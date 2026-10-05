from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import init_supabase
from app.routers import auth, inventory, profiles, users


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

app.include_router(users.router)
app.include_router(profiles.router)
app.include_router(auth.router)
app.include_router(inventory.router)


@app.get("/")
def home():
    return {
        "message": "API funcionando"
    }