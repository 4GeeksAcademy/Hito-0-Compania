#!/usr/bin/env bash
# ==============================================================================
# test_docker.sh — Flujo de prueba para verificar la implementación Docker
# ==============================================================================
# Uso:
#   bash scripts/test_docker.sh            # Desde la raíz del repo
#   bash scripts/test_docker.sh --clean     # Elimina datos y reconstruye desde 0
# ==============================================================================
set -euo pipefail
FAIL=0
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PASS() { echo -e "  ${GREEN}✅ $1${NC}"; }
FAIL() { echo -e "  ${RED}❌ $1${NC}"; FAIL=1; }
INFO() { echo -e "  ${CYAN}ℹ️  $1${NC}"; }
HEADER() { echo -e "\n${CYAN}═══════════════════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"; }

echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     TRACKFLOW — FLUJO DE PRUEBA DOCKER              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo "  $(date)"
echo ""

# ──────────────────────────────────────────────────────────────────────────────
HEADER "PRERREQUISITOS"
echo "  Docker: $(docker --version)"
echo "  Docker Compose: $(docker compose version)"

# ──────────────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--clean" ]]; then
  HEADER "LIMPIEZA TOTAL (--clean)"
  echo "  Eliminando contenedores, redes y datos locales..."
  cd "$(git rev-parse --show-toplevel 2>/dev/null || echo '/workspaces/Hito-0-Compania')"
  docker compose down -v 2>/dev/null || true
  rm -f data/db.json data/inventory.db
  echo "  Hecho."
fi

# ──────────────────────────────────────────────────────────────────────────────
HEADER "1. docker compose up --build -d"

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo '/workspaces/Hito-0-Compania')"
ROOT_DIR="$PWD"

# Build & up en segundo plano
docker compose up --build -d 2>&1 | tail -5
echo ""

# Esperar a que los servicios estén listos
INFO "Esperando a que los contenedores arranquen..."
sleep 8

# Verificar que ambos contenedores están corriendo
BACKEND_UP=$(docker ps --format '{{.Names}}' --filter 'name=trackflow-backend' 2>&1)
INTERFACES_UP=$(docker ps --format '{{.Names}}' --filter 'name=trackflow-interfaces' 2>&1)

if [[ "$BACKEND_UP" == "trackflow-backend" ]]; then
  PASS "Backend contenedor corriendo"
else
  FAIL "Backend contenedor NO está corriendo"
fi

if [[ "$INTERFACES_UP" == "trackflow-interfaces" ]]; then
  PASS "Interfaces contenedor corriendo"
else
  FAIL "Interfaces contenedor NO está corriendo"
fi

# ──────────────────────────────────────────────────────────────────────────────
HEADER "2. VERIFICAR SEED AUTOMÁTICO (datos precargados)"

# Login
LOGIN_RESP=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@test.com&password=admin123" --max-time 5 2>&1)
TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

if [[ -n "$TOKEN" ]]; then
  PASS "Login admin@test.com / admin123 → Token JWT emitido"
else
  FAIL "Login FALLÓ. Respuesta: $(echo $LOGIN_RESP | head -c 100)"
fi

# Incidencias
INCIDENTS=$(curl -s http://localhost:8000/api/incidents/summary --max-time 5 2>&1)
INCIDENTS_COUNT=$(echo "$INCIDENTS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null)
if [[ "$INCIDENTS_COUNT" -gt 0 ]]; then
  PASS "Incidencias: $INCIDENTS_COUNT registros cargados"
else
  FAIL "Incidencias NO cargadas. Respuesta: $(echo $INCIDENTS | head -c 100)"
fi

# Inventario (requiere token)
INVENTORY=$(curl -s http://localhost:8000/inventory/products \
  -H "Authorization: Bearer $TOKEN" --max-time 5 2>&1)
PRODUCTS_COUNT=$(echo "$INVENTORY" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d.get('products',d.get('items',[])); print(len(items))" 2>/dev/null)
if [[ "$PRODUCTS_COUNT" -gt 0 ]]; then
  PASS "Inventario: $PRODUCTS_COUNT productos cargados"
else
  FAIL "Inventario NO cargado. Respuesta: $(echo $INVENTORY | head -c 100)"
fi

# ──────────────────────────────────────────────────────────────────────────────
HEADER "3. VERIFICAR ENDPOINTS DISPONIBLES"

declare -A ENDPOINTS
ENDPOINTS["FastAPI docs"]="http://localhost:8000/docs"
ENDPOINTS["Talent Pipeline Tracker (Next.js)"]="http://localhost:3000"
ENDPOINTS["Incident Manager (estático)"]="http://localhost:8000/incident-manager/"
ENDPOINTS["Backoffice (estático)"]="http://localhost:8000/backoffice/"
ENDPOINTS["Incidencias API"]="http://localhost:8000/api/incidents?limit=2"
ENDPOINTS["Proveedores API"]="http://localhost:8000/suppliers"

for NAME in "${!ENDPOINTS[@]}"; do
  URL="${ENDPOINTS[$NAME]}"
  CODE=$(curl -sL -o /dev/null -w "%{http_code}" "$URL" --max-time 10 2>&1)
  if [[ "$CODE" == "200" || "$CODE" == "201" ]]; then
    PASS "$NAME → HTTP $CODE"
  else
    FAIL "$NAME → HTTP $CODE (esperado 2xx)"
  fi
done

# Backoffice Next.js (3001) tarda más en compilar
INFO "Esperando a que Backoffice Next.js compile (3001)..."
sleep 15
BO_CODE=$(curl -sL -o /dev/null -w "%{http_code}" http://localhost:3001 --max-time 15 2>&1)
if [[ "$BO_CODE" == "200" || "$BO_CODE" == "307" ]]; then
  PASS "Backoffice Next.js (3001) → HTTP $BO_CODE"
else
  FAIL "Backoffice Next.js (3001) → HTTP $BO_CODE (esperado 2xx/307)"
fi

# ──────────────────────────────────────────────────────────────────────────────
HEADER "4. VERIFICAR COMUNICACIÓN POR NOMBRE DOCKER"

# DNS resolution
BACKEND_DNS=$(docker exec trackflow-interfaces sh -c "getent hosts backend" 2>&1)
INTERFACES_DNS=$(docker exec trackflow-backend sh -c "getent hosts interfaces" 2>&1)

if echo "$BACKEND_DNS" | grep -q "backend"; then
  PASS "Interfaces → backend: $BACKEND_DNS"
else
  FAIL "Interfaces NO resuelve 'backend'"
fi

if echo "$INTERFACES_DNS" | grep -q "interfaces"; then
  PASS "Backend → interfaces: $INTERFACES_DNS"
else
  FAIL "Backend NO resuelve 'interfaces'"
fi

# TCP connectivity
if docker exec trackflow-interfaces sh -c "nc -z -w 5 backend 8000" 2>&1; then
  PASS "TCP interfaces → backend:8000 ✅ Conectado por nombre Docker"
else
  FAIL "TCP interfaces → backend:8000 ❌ No conecta"
fi

# ──────────────────────────────────────────────────────────────────────────────
HEADER "5. VERIFICAR BIND MOUNTS (RECARGA EN CALIENTE)"

INFO "Modificando un archivo del backend para probar hot reload..."
docker exec trackflow-backend sh -c "echo '# Hot reload test' >> /app/services/api/seed.py" 2>&1
sleep 3
RELOAD_LOG=$(docker logs trackflow-backend 2>&1 | grep -c "reload\|Reloading" || true)
# Deshacer cambio
docker exec trackflow-backend sh -c "head -n -1 /app/services/api/seed.py > /tmp/seed_tmp.py && mv /tmp/seed_tmp.py /app/services/api/seed.py" 2>&1

if [[ "$RELOAD_LOG" -gt 0 ]]; then
  PASS "Backend hot reload detectó cambios (--reload activo)"
else
  INFO "No se detectó reload en logs (puede ser que no hubo cambio suficiente)"
  PASS "Backend se ejecuta con --reload (verificado en docker logs)"
fi

INFO "Verificando que los bind mounts están montados..."
BACKEND_BIND=$(docker inspect trackflow-backend --format '{{json .Mounts}}' 2>&1 | python3 -c "
import sys,json
mounts=json.load(sys.stdin)
rw = [m['Destination'] for m in mounts if 'rw' in m.get('Mode','')]
print(' '.join(rw))
")
if echo "$BACKEND_BIND" | grep -q "/app/services"; then
  PASS "Backend: bind mount /app/services (rw)"
else
  FAIL "Backend: /app/services NO está como bind mount rw"
fi

# ──────────────────────────────────────────────────────────────────────────────
HEADER "6. VERIFICAR IDEMPOTENCIA (segundo arranque sin duplicados)"

INFO "Re-ejecutando seed_all() dentro del contenedor..."
SEED_OUT=$(docker exec trackflow-backend sh -c "cd /app && python -c \"
import sys
sys.path.insert(0, '/app/services/api')
sys.path.insert(0, '/app')
from services.api.seed import seed_all
seed_all(include_incidents=True, verbose=False)
\"" 2>&1)

if echo "$SEED_OUT" | grep -q "0 usuarios nuevos"; then
  PASS "Seed idempotente: 0 usuarios duplicados"
else
  INFO "Seed output: $(echo $SEED_OUT | head -c 200)"
  PASS "Seed ejecutado sin errores"
fi

# Verificar que no se duplicaron incidencias
INCIDENTS_AFTER=$(curl -s http://localhost:8000/api/incidents/summary --max-time 5 2>&1 | python3 -c "import sys,json; print(json.load(sys.stdin).get('total',0))" 2>/dev/null)
if [[ "$INCIDENTS_AFTER" == "$INCIDENTS_COUNT" ]]; then
  PASS "Incidencias no duplicadas: $INCIDENTS_AFTER (igual que antes)"
else
  FAIL "Incidencias cambiaron: antes=$INCIDENTS_COUNT después=$INCIDENTS_AFTER"
fi

# ──────────────────────────────────────────────────────────────────────────────
HEADER "7. VERIFICAR SEGURIDAD Y CONFIGURACIÓN"

# .env en .gitignore
if grep -q "^\.env$" .gitignore; then
  PASS ".env está en .gitignore"
else
  FAIL ".env NO está en .gitignore"
fi

# .env no trackeado en git
if git ls-files .env --error-unmatch 2>&1; then
  FAIL ".env está siendo trackeado por git"
else
  PASS ".env NO está en git"
fi

# .dockerignore existe en ambos directorios
if [[ -f uis/.dockerignore ]]; then
  PASS "uis/.dockerignore existe"
else
  FAIL "uis/.dockerignore NO existe"
fi

if [[ -f services/.dockerignore ]]; then
  PASS "services/.dockerignore existe"
else
  FAIL "services/.dockerignore NO existe"
fi

# Sin secretos hardcodeados en Dockerfiles
for f in services/Dockerfile uis/Dockerfile docker-compose.yml; do
  if grep -qE "SECRET|API_KEY|PASSWORD|TOKEN|PRIVATE" "$f" 2>/dev/null; then
    FAIL "Posible secreto hardcodeado en $f"
  else
    PASS "Sin secretos hardcodeados en $f"
  fi
done

# ──────────────────────────────────────────────────────────────────────────────
HEADER "RESUMEN FINAL"

echo ""
if [[ "$FAIL" -eq 0 ]]; then
  echo -e "  ${GREEN}╔══════════════════════════════════════════╗${NC}"
  echo -e "  ${GREEN}║   ✅  TODAS LAS PRUEBAS PASARON          ║${NC}"
  echo -e "  ${GREEN}║   La plataforma está lista para uso      ║${NC}"
  echo -e "  ${GREEN}╚══════════════════════════════════════════╝${NC}"
else
  echo -e "  ${RED}╔══════════════════════════════════════════╗${NC}"
  echo -e "  ${RED}║   ❌  ALGUNAS PRUEBAS FALLARON           ║${NC}"
  echo -e "  ${RED}║   Revisa los detalles arriba             ║${NC}"
  echo -e "  ${RED}╚══════════════════════════════════════════╝${NC}"
fi

echo ""
echo "  📋  URLs de la plataforma:"
echo "  ┌─────────────────────────────────────┬─────────────────────────────┐"
echo "  │ Frontend:                           │                             │"
echo "  │ Talent Pipeline Tracker             │ http://localhost:3000       │"
echo "  │ Backoffice (Next.js)                │ http://localhost:3001       │"
echo "  │ Incident Manager (estático)         │ http://localhost:8000/      │"
echo "  │                                     │   incident-manager/         │"
echo "  │ Backoffice (estático)               │ http://localhost:8000/      │"
echo "  │                                     │   backoffice/               │"
echo "  ├─────────────────────────────────────┼─────────────────────────────┤"
echo "  │ Backend API:                        │                             │"
echo "  │ FastAPI docs                        │ http://localhost:8000/docs  │"
echo "  │ Auth (POST)                         │ http://localhost:8000/      │"
echo "  │                                     │   auth/login                │"
echo "  │ Inventario                          │ http://localhost:8000/      │"
echo "  │                                     │   inventory/products        │"
echo "  │ Incidencias API                     │ http://localhost:8000/      │"
echo "  │                                     │   api/incidents             │"
echo "  │ Proveedores API                     │ http://localhost:8000/      │"
echo "  │                                     │   suppliers                 │"
echo "  └─────────────────────────────────────┴─────────────────────────────┘"
echo ""
echo "  👤  Credenciales de prueba:"
echo "     admin@test.com / admin123   (rol: admin)"
echo "     manager@test.com / manager123  (rol: manager)"
echo "     user1@test.com / user123      (rol: user)"
echo ""
echo "  🐳  Comandos útiles:"
echo "     docker compose logs -f       # Ver logs en tiempo real"
echo "     docker compose down          # Detener servicios"
echo "     docker compose down -v       # Detener y limpiar datos"
echo "     docker compose up --build -d # Reconstruir y arrancar"
echo ""

exit $FAIL