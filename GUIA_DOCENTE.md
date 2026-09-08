# Guía rápida para docente

Esta guía permite probar la entrega de Fase 1, Fase 2 y **recuperación de contraseña (AUTH-03)** en pocos minutos.

---

## 🚀 Lanzar desde un Codespace nuevo (resumen rápido)

Si clonás el proyecto en un Codespace limpio, seguí estos pasos en orden:

```bash
# ── 1. Backend ──────────────────────────────────
cd /workspaces/Hito-0-Compania/services/api

# Crear y activar entorno virtual
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt 2>/dev/null || pip install "fastapi>=0.116,<1" "uvicorn[standard]>=0.35,<1" "python-multipart>=0.0.9,<1" "python-dotenv>=1.0,<2" "passlib[bcrypt]>=1.7,<2" "python-jose[cryptography]>=3.3,<4" "tinydb>=4.8,<5" "resend>=0.8,<1"

# Configurar .env con secrets (IMPORTANTE: generar clave única)
echo "JWT_SECRET=$(python3 -c 'import secrets; print(secrets.token_urlsafe(64))')" >> .env
echo "RESEND_API_KEY=re_e8tg1CRG_..." >> .env           # ← pedir a un compañero
echo 'FRONTEND_URL=http://localhost:3000' >> .env
echo 'EMAIL_FROM=Mi App <onboarding@resend.dev>' >> .env

# Sembrar datos de prueba
python3 seed.py

# Iniciar backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

```bash
# ── 2. Frontend (otra terminal) ─────────────────
cd /workspaces/Hito-0-Compania/uis/talent-pipeline-tracker

# Instalar dependencias
npm install

# Configurar URL del backend para desarrollo local
echo "NEXT_PUBLIC_AUTH_API_URL=http://localhost:8000" > .env.local

# Iniciar frontend
npm run dev
```

```bash
# ── 3. Probar ──────────────────────────────────
# Abrir http://localhost:3000/login
# Email: admin@test.com
# Contraseña: admin123
```

> **En Codespaces:** una vez que ambos servidores estén corriendo, abrir la pestaña **Ports** y hacer público el puerto **8000** (click derecho → Port Visibility → Public) para que el frontend pueda llamar a la API desde la URL pública.

---

## 1) Preparación

Ubicación del proyecto:

- /workspaces/Hito-0-Compania

CSV de prueba sugerido:

- scripts/incidents-COMPANY.csv

## 2) Fase 1 (Script)

Ejecutar desde la raíz del proyecto:

```bash
cd /workspaces/Hito-0-Compania
python3 scripts/analyze.py scripts/incidents-COMPANY.csv
```

## 3) Fase 2 — API Unificada + Frontend

> El backend `services/api/main.py` es una **API unificada** que incluye:
> - **Auth** (login, recuperación y cambio de contraseña)
> - **Proveedores** (CRUD con TinyDB)
> - **Análisis de incidencias** (subir CSV y descargar reporte)
> - **Backoffice** montado en `/backoffice`
>
> El frontend está en `uis/talent-pipeline-tracker/` (Next.js App Router).

Abrir dos terminales.

### Terminal 1: Backend (FastAPI + TinyDB)

```bash
cd /workspaces/Hito-0-Compania/services/api
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Rutas a validar:

1. Docs: http://127.0.0.1:8000/docs
2. Login: `POST /auth/login` (form-urlencoded: username + password)
3. Forgot password: `POST /auth/forgot-password`
4. Reset password: `POST /auth/reset-password`
5. Change password: `POST /auth/change-password`
6. Proveedores: `GET /suppliers` (json con 15 proveedores)
7. Análisis incidencias: `POST /api/incidents/analyze`
8. Exportar resultados: `GET /api/incidents/results/export`
9. Backoffice: http://localhost:8000/backoffice/
10. Health: http://127.0.0.1:8000/

### Terminal 2: Frontend (Next.js)

```bash
cd /workspaces/Hito-0-Compania/uis/talent-pipeline-tracker
npm run dev
```

Abrir:

- http://localhost:3000/login (login con email/contraseña)
- http://localhost:3000/forgot-password (recuperación de contraseña)
- http://localhost:8000/backoffice/ (proveedores + análisis de incidencias)

> 💡 El backoffice (`uis/backoffice/`) se sirve directamente desde la API en `/backoffice/`.
> Sirve para gestionar proveedores y analizar incidencias — **no requiere login**.

## 4) Flujo funcional esperado en interfaz

1. Ir a http://localhost:3000/login
2. Iniciar sesión con `admin@test.com` / `admin123`
3. Navegar a `/account/change-password` para cambiar la contraseña
4. Probar la recuperación en `/forgot-password` (ingresar email registrado)
5. Recibir el email (vía Resend) con el enlace de restablecimiento
6. Abrir el enlace, elegir nueva contraseña, y redirige a `/login`
7. Iniciar sesión con la nueva contraseña

### Backoffice — Proveedores y análisis de incidencias

1. Ir a http://localhost:8000/backoffice/
2. Ver el listado de 15 proveedores con filtros por país/categoría
3. Probar crear un proveedor, actualizar tarifa y cambiar estado
4. Ir al panel de incidencias (`/backoffice/` arrastrar CSV en `scripts/incidents-COMPANY.csv`)
5. Pulsar **Analizar**
6. Pulsar **Descargar CSV** para exportar el reporte

## 5) Prueba rápida por curl (opcional)

```bash
# Login
curl -s -D- -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@test.com&password=admin123"

# Forgot password
curl -s -X POST http://localhost:8000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com"}'

# Listar proveedores (no requiere token)
curl -s http://localhost:8000/suppliers | python3 -m json.tool | head -20

# Analizar incidencias (subir CSV de prueba)
curl -s -X POST http://localhost:8000/api/incidents/analyze \
  -F "file=@scripts/incidents-COMPANY.csv" | python3 -m json.tool | head -20
```

## 6) Si se prueba en Codespaces (URL pública)

Flujo recomendado:

1. En una terminal, ejecutar Uvicorn (sección Terminal 1) y dejarlo activo.
2. En otra terminal, ejecutar `npm run dev` para el frontend.
3. Abrir la pestaña **Ports** en VS Code y cambiar visibilidad del puerto **8000** a **Public**.
4. Acceder al frontend desde la URL pública del puerto 3000.
5. Si aparece `Failed to fetch` (error CORS), verificar que el puerto 8000 esté en **Public** desde la pestaña Ports.

> 💡 **Tips:** En Codespaces, después de hacer público el puerto 8000, la URL pública del frontend se obtiene desde la pestaña Ports (puerto 3000). Si el login falla con error de red, abrí la consola F12 para ver si es un error CORS o de conexión.

## 7) Archivos clave de la entrega

### Fase 1 (Script de análisis)
- `scripts/analyze.py`

### Fase 2 — Auth API (FastAPI + TinyDB)
- `services/api/app/main.py` — entry point de FastAPI
- `services/api/app/routers/auth.py` — endpoints de autenticación
- `services/api/app/services/crud.py` — operaciones con TinyDB
- `services/api/app/services/email_service.py` — envío de emails (Resend)
- `services/api/app/core/security.py` — JWT, reset tokens, Hashing
- `services/api/app/core/config.py` — variables de entorno
- `services/api/app/core/database.py` — conexión TinyDB

### Frontend (Next.js)
- `uis/talent-pipeline-tracker/app/(auth)/login/page.tsx` — login
- `uis/talent-pipeline-tracker/app/(auth)/forgot-password/page.tsx` — recuperación
- `uis/talent-pipeline-tracker/app/(auth)/reset-password/page.tsx` — restablecimiento
- `uis/talent-pipeline-tracker/app/(protected)/account/change-password/page.tsx` — cambio
- `uis/talent-pipeline-tracker/src/services/auth.ts` — llamadas a la API
- `uis/talent-pipeline-tracker/src/services/http-client.ts` — cliente HTTP con auto-detección de Codespaces
