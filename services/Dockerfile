# =============================================================================
# Dockerfile — Backend API (services/)
# =============================================================================
# Construye un contenedor con Python 3.12 + uv + FastAPI con Uvicorn.
# En desarrollo (docker compose) se ejecuta con --reload para recarga en caliente.
#
# Build context: ./services/
#   Los archivos se copian a /app/services/ para preservar los imports
#   relativos al raíz del repo (services.api.routes..., app.routers...).
# =============================================================================

FROM python:3.12-slim

# ── 1. Instalar uv (gestor de paquetes ultra-rápido) ──
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# ── 2. Copiar solo archivos de dependencias para cachear capas ──
COPY api/pyproject.toml api/uv.lock api/requirements.txt ./services/api/

# ── 3. Instalar dependencias del proyecto ──
RUN uv pip install --system -r services/api/requirements.txt

# ── 4. Copiar el resto del código fuente ──
#     Se copia a /app/services/ para que los imports del tipo
#     "from services.api.routes..." funcionen correctamente desde /app.
COPY . ./services/

# ── 5. PYTHONPATH para que uvicorn encuentre services.api.main ──
ENV PYTHONPATH=/app

EXPOSE 8000

# Comando por defecto (sin --reload). Docker Compose lo sobrescribe en desarrollo.
CMD ["uvicorn", "services.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
