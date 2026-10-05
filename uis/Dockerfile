# =============================================================================
# Dockerfile — Interfaces (uis/)
# =============================================================================
# Construye un contenedor con Node.js que ejecuta dos aplicaciones Next.js:
#   - talent-pipeline-tracker (sitio público)  → puerto 3000
#   - backoffice (panel interno)               → puerto 3001
# =============================================================================

FROM node:20-alpine

WORKDIR /app

# ── 1. Copiar solo los archivos de dependencias para cachear capas ──
COPY backoffice/package.json backoffice/package-lock.json ./backoffice/
COPY talent-pipeline-tracker/package.json talent-pipeline-tracker/package-lock.json ./talent-pipeline-tracker/

# ── 2. Instalar dependencias de cada aplicación ──
WORKDIR /app/backoffice
RUN npm ci

WORKDIR /app/talent-pipeline-tracker
RUN npm ci

# ── 3. Copiar el resto del código fuente ──
WORKDIR /app
COPY . .

# ── 4. Script de arranque que lanza ambas aplicaciones ──
RUN printf '#!/bin/sh\n\
cd /app/backoffice && npm run dev -- -p 3001 &\n\
cd /app/talent-pipeline-tracker && npm run dev -- -p 3000 &\n\
wait\n' > /start.sh && chmod +x /start.sh

EXPOSE 3000 3001

CMD ["/start.sh"]
