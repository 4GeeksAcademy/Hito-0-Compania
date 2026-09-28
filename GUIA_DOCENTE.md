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

# IMPORTANTE (solo Python 3.12+): fijar bcrypt a 4.0.1
# Si pip instala bcrypt >= 4.1, passlib se rompe con:
#   AttributeError: module 'bcrypt' has no attribute '__about__'
pip install "bcrypt==4.0.1"

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

## 8) Hito 6 — Gestor de Incidencias Centralizado

> Flujo completo: modelo de datos → seed histórico → API REST → frontend de gestión.

### 8.1) Arquitectura

El gestor de incidencias sigue la estructura del monorepo:

| Capa | Ubicación | Rol |
|---|---|---|
| **Modelo compartido** | `packages/shared/py/shared/csv_validation.py` | Validación CSV extraída del proyecto anterior |
| **Script de carga** | `scripts/seed_incidents.py` | Poblar la BD desde el CSV histórico |
| **API** | `services/api/` | FastAPI + TinyDB + Pydantic v2 |
| **Frontend** | `uis/incident-manager/` | Vanilla JS (ES modules) + CSS |

### 8.2) Preparación

```bash
cd /workspaces/Hito-0-Compania

# Asegurar que el servidor está instalado
pip install "fastapi>=0.141,<1" "uvicorn[standard]>=0.35,<1" "tinydb>=4.9,<1" "pydantic>=2.0,<3"

# ⚠️ Si usas Python 3.12+, fijar bcrypt a 4.0.1 para evitar:
#    AttributeError: module 'bcrypt' has no attribute '__about__'
pip install "bcrypt==4.0.1"
```

### 8.3) Seed — Cargar datos históricos

El script `scripts/seed_incidents.py` lee el CSV legacy (`scripts/incidents-COMPANY.csv`), valida cada fila usando el módulo compartido, transforma los campos al modelo de incidencias y los inserta en TinyDB.

```bash
cd /workspaces/Hito-0-Compania

# Cargar datos históricos (82 incidencias válidas, 18 inválidas reportadas)
python scripts/seed_incidents.py

# Ver en modo dry-run (sin escribir)
python scripts/seed_incidents.py --dry-run

# Es idempotente: si se ejecuta de nuevo, las 82 duplicadas se omiten
python scripts/seed_incidents.py
```

**Transformaciones que aplica el seed:**

| CSV original | Incidencia (TinyDB) |
|---|---|
| `status = "abierto" / "en_proceso" / "resuelto" / "cerrado" / "descartado"` | `status = "open" / "in_progress" / "resolved" / "discarded"` |
| `category = "queja" / "solicitud" / "fallo_operativo"` | `category = "queja" / "solicitud" / "fallo_operativo"` |
| `description` (texto largo) | `title` (primeros ~80 caracteres) |
| `created_at = "YYYY-MM-DD"` | `created_at = "YYYY-MM-DDTHH:MM:SS+00:00"` (ISO datetime) |
| `country = "US" / "ES"` | `branch = "US Central" / "Spain Central"` |
| — | `origin = "customer"` (todas las históricas) |
| `incident_id` | `csv_ref = "csv:INC-XXXX"` (para deduplicación) |

### 8.4) Backend — API REST

Abrir una terminal:

```bash
cd /workspaces/Hito-0-Compania/services/api
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Endpoints disponibles:**

| Método | Ruta | Descripción | Códigos |
|---|---|---|---|
| `POST` | `/api/incidents` | Crear una incidencia | 201 ✅ / 400 ❌ |
| `GET` | `/api/incidents` | Listar incidencias (con filtros) | 200 ✅ |
| `GET` | `/api/incidents/summary` | Métricas agregadas | 200 ✅ |
| `GET` | `/api/incidents/{id}` | Detalle de una incidencia | 200 ✅ / 404 ❌ |
| `PATCH` | `/api/incidents/{id}/status` | Cambiar estado (ciclo de vida) | 200 ✅ / 400 ❌ |

**Filtros del listado:** `?status=open&origin=customer&branch=Spain+Central&category=queja`

**Ciclo de vida del estado:**

```
Open ──→ In Progress ──→ Resolved (final)
  │                        │
  └──→ Discarded (final)   └──→ (no se puede cambiar)
```

**Transiciones válidas:**
- `open` → `in_progress` o `discarded`
- `in_progress` → `resolved` o `discarded`
- `resolved` y `discarded` son **finales** (rechazadas con 400)

**Prueba rápida con curl:**

```bash
# Health
curl http://127.0.0.1:8000/health

# Crear incidencia
curl -s -X POST http://127.0.0.1:8000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{"title":"Paquete no entregado","description":"El cliente reclama que no recibi\u00f3 su pedido","category":"queja","origin":"customer","branch":"Los Angeles"}' | python3 -m json.tool

# Listar abiertas
curl -s "http://127.0.0.1:8000/api/incidents?status=open" | python3 -m json.tool | head -30

# Resumen de métricas
curl -s http://127.0.0.1:8000/api/incidents/summary | python3 -m json.tool

# Transición de estado
curl -s -X PATCH "http://127.0.0.1:8000/api/incidents/{ID}/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' | python3 -m json.tool

# Transición inválida (resolved → open → 400)
curl -s -w "\nHTTP: %{http_code}\n" -X PATCH "http://127.0.0.1:8000/api/incidents/{ID_RESUELTA}/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"open"}'

# Error de validación (400 con campo identificado)
curl -s -X POST http://127.0.0.1:8000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{"title":"","category":"invalida"}' | python3 -m json.tool
```

### 8.5) Frontend — Gestor de Incidencias

El frontend es una página HTML/CSS/JS vanilla que se sirve estáticamente. Se puede abrir directamente desde el explorador o servir con cualquier servidor estático.

**Abrir en el navegador:**

```bash
# Opción A: directo desde VS Code (hacer clic derecho en el archivo → Open with Live Server)
uis/incident-manager/index.html

# Opción B: usando Python (si la API está en puerto 8000)
cd /workspaces/Hito-0-Compania
python3 -m http.server 3000 --directory .
# Luego abrir http://localhost:3000/uis/incident-manager/
```

> ⚠️ Si abres el archivo directamente (`file://`), el `fetch` fallará por CORS. Usa Live Server o un servidor HTTP.

**El frontend detecta automáticamente la URL de la API:**
- `localhost` → `http://localhost:8000`
- Codespaces (`*.app.github.dev`) → puerto 8000
- Se puede forzar con `?apiBase=URL`

#### Formulario de registro

1. Completar título, descripción, origen, categoría y sede (opcional según origen)
2. Si se selecciona origen **"Sede"**, el campo sede se **resalta visualmente** (fondo naranja + borde)
3. Pulsar **"Registrar incidencia"**
4. El botón se deshabilita y muestra un spinner durante el envío
5. Si hay errores de validación, aparecen junto a cada campo **antes de enviar al servidor**
6. Si la API devuelve errores, se muestran en lenguaje comprensible (nunca stack traces)

#### Panel de listado

Tres estados visuales:

| Estado | Qué se muestra |
|---|---|
| **Cargando** | Spinner + "Cargando incidencias..." |
| **Vacío** | Mensaje contextual ("No hay incidencias para los filtros aplicados" o "Todavía no hay incidencias registradas") |
| **Con datos** | Tabla con columnas: Título, Estado, Categoría, Origen, Sede, Creada, Actualizada, Acción |

**Filtros:** por Estado, Origen, Sede y Categoría (se actualiza al cambiar).

**Actualización de estado (optimista):**
1. Al hacer clic en "Iniciar" o "Resolver", el badge cambia **inmediatamente**
2. Si la API falla, se **revierte visualmente** al estado anterior (rollback)
3. Los botones de la fila se deshabilitan durante la petición

#### Panel de resumen

Muestra métricas agregadas:
- **Por estado:** Total, Abiertas, En progreso, Resueltas, Descartadas
- **Por categoría:** Queja, Solicitud, Fallo operativo
- **Por origen:** Cliente, Sede, Interno
- **Por sede:** Los Ángeles, Zaragoza, Central / Oficina Principal, US Central, Spain Central

Si la petición falla, se muestra un mensaje de error con botón **"Reintentar"** sin afectar al resto de la página.

### 8.6) Verificación completa

Ejecutar estos checks para validar que todo funciona:

```bash
# 1) Seed (debe decir 82 insertadas, 0 duplicadas si es primera vez)
python scripts/seed_incidents.py

# 2) Servidor funcionando
curl -s http://127.0.0.1:8000/health

# 3) Summary con datos (debe coincidir con las 82 del seed)
curl -s http://127.0.0.1:8000/api/incidents/summary | python3 -m json.tool

# 4) Listado con filtro
curl -s "http://127.0.0.1:8000/api/incidents?status=open" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'{len(d)} incidencias abiertas')"

# 5) POST + transición válida
ID=$(curl -s -X POST http://127.0.0.1:8000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test","category":"queja","origin":"internal","branch":"central"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
echo "Creada: $ID"
curl -s -X PATCH "http://127.0.0.1:8000/api/incidents/$ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' | python3 -c "import json,sys; print('Estado:', json.load(sys.stdin)['status'])"

# 6) Transición inválida (debe dar 400)
RESOLVED_ID=$(curl -s "http://127.0.0.1:8000/api/incidents?status=resolved" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['id'] if d else '')")
curl -s -w "\nHTTP: %{http_code}\n" -X PATCH "http://127.0.0.1:8000/api/incidents/$RESOLVED_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"open"}'

# 7) 404 en detalle inexistente
curl -s -w "\nHTTP: %{http_code}\n" "http://127.0.0.1:8000/api/incidents/no-existe"

# 8) Validación con campo identificado (400)
curl -s -X POST http://127.0.0.1:8000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{"title":""}' | python3 -c "import json,sys; d=json.load(sys.stdin); [print(f'  {e[\"field\"]}: {e[\"message\"]}') for e in d]"
```

### 8.7) Archivos clave del Gestor de Incidencias

| Capa | Archivo | Propósito |
|---|---|---|
| **Modelo** | `services/api/models.py` | Enums, IncidentCreate/Update/Response, validaciones Pydantic v2 |
| **BD** | `services/api/app/core/database.py` | TinyDB con tabla `incidents` |
| **Router** | `services/api/routes/incidents.py` | Endpoints CRUD + summary + transiciones de estado |
| **Error handlers** | `services/api/main.py` | `humanize_validation_error()`, errores 400/500 en español |
| **Validación CSV** | `packages/shared/py/shared/csv_validation.py` | Lógica extraída del proyecto anterior, reutilizada por seed y API |
| **Seed** | `scripts/seed_incidents.py` | Carga idempotente del CSV histórico a TinyDB |
| **Frontend HTML** | `uis/incident-manager/index.html` | Formulario, listado con filtros, panel de resumen |
| **Frontend JS** | `uis/incident-manager/app.js` | Lógica: validación cliente, optimismo+rollback, estados loading/error/empty |
| **Frontend CSS** | `uis/incident-manager/styles.css` | Estilos: badges, highlight, spinner, summary cards |
| **Menú** | `uis/backoffice/index.html`, `index.html`, `application.html` | Enlace "Incidencias" en la navegación |

---

## 9) Hito — Gestión de Inventario con ORM y Doble Base de Datos

> Este hito extiende la API existente añadiendo una **capa de inventario sobre Supabase (PostgreSQL)** usando **SQLModel**, mientras la autenticación permanece en **TinyDB**.

### Preparación del entorno

```bash
cd /workspaces/Hito-0-Compania/services/api

# Asegurar que las dependencias nuevas estén instaladas
pip install sqlmodel psycopg2-binary
```

Verificar que el `.env` tenga la `DATABASE_URL` de Supabase (debería estar desde la configuración inicial):

```bash
grep DATABASE_URL .env
# Debería mostrar algo como:
# DATABASE_URL=postgresql://postgres.pqnxekdcfueynvidpsrc:...@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

### Terminal 1: Iniciar backend

```bash
cd /workspaces/Hito-0-Compania/services/api
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Al iniciar, la aplicación ejecuta automáticamente `init_supabase()` que crea las tablas `products`, `inbound_orders` y `outbound_orders` en Supabase.

### Terminal 2: Sembrar datos de prueba

```bash
cd /workspaces/Hito-0-Compania/services/api
python seed.py --clean
```

Esto inserta:
- Usuarios de prueba en **TinyDB** (admin, manager, etc.)
- Proveedores en **TinyDB** (15 proveedores)
- **4 productos + órdenes de entrada/salida** en **Supabase**

Stock neto sembrado:

| SKU | Producto | Los Ángeles | Zaragoza | Total |
|:---:|----------|:-----------:|:--------:|:-----:|
| ECO-001 | EcoBottle Pro | 80 | 40 | 120 |
| FIT-001 | FitBand Watch | 60 | 0 | 60 |
| CAN-001 | Canvas Tote Bag | 0 | 150 | 150 |
| SOL-001 | Solar Charger 20W | 30 | 0 | 30 |

### Prueba rápida por curl

```bash
# 1. Login (obtener token)
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -d "username=admin@test.com&password=admin123" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
echo "Token: $TOKEN"

# 2. Listar todos los productos con stock calculado
curl -s http://localhost:8000/inventory/products \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 3. Filtrar stock por almacén (Los Ángeles)
curl -s "http://localhost:8000/inventory/products?warehouse=Los%20Angeles" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 4. Obtener producto por ID
curl -s http://localhost:8000/inventory/products/1 \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 5. Crear un nuevo producto
curl -s -X POST http://localhost:8000/inventory/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","sku":"TST-001","category":"test"}' | python3 -m json.tool

# 6. Registrar orden de entrada
curl -s -X POST http://localhost:8000/inventory/orders/inbound \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":50,"warehouse":"Los Angeles"}' | python3 -m json.tool

# 7. Registrar orden de salida
curl -s -X POST http://localhost:8000/inventory/orders/outbound \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":10,"warehouse":"Los Angeles"}' | python3 -m json.tool

# 8. Probar validación de stock negativo (debe dar error HTTP 400)
curl -s -X POST http://localhost:8000/inventory/orders/outbound \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id":2,"quantity":9999,"warehouse":"Los Angeles"}' | python3 -m json.tool

# 9. Listar todas las órdenes con datos del producto
curl -s http://localhost:8000/inventory/orders \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -40
```

### Prueba desde Swagger UI

1. Abrir `http://localhost:8000/docs`
2. Ir a `POST /auth/login` → usar `admin@test.com` / `admin123`
3. Copiar el `access_token`
4. Clic en **Authorize** → pegar `Bearer <token>` → **Authorize**
5. Probar todos los endpoints agrupados bajo **inventory**

### Endpoints de inventario disponibles

| Método | Ruta | Descripción | Auth |
| :---: | :--- | :--- | :---: |
| `GET` | `/inventory/products` | Lista productos con `current_stock` (query opcional `?warehouse=`) | ✅ |
| `POST` | `/inventory/products` | Crea un nuevo producto | ✅ |
| `GET` | `/inventory/products/{id}` | Obtiene producto con stock actual | ✅ |
| `POST` | `/inventory/orders/inbound` | Registra entrada (incrementa stock) | ✅ |
| `POST` | `/inventory/orders/outbound` | Registra salida (reduce stock, valida negativo) | ✅ |
| `GET` | `/inventory/orders` | Lista órdenes con datos del producto | ✅ |

### Verificar reglas de negocio

- **Stock calculado dinámicamente:** `GET /inventory/products` devuelve `current_stock` = entradas - salidas.
- **Stock por almacén:** Usar `?warehouse=Los Angeles` o `?warehouse=Zaragoza`.
- **Sin modificación directa:** No existe un endpoint `PATCH /inventory/products/{id}/stock`.
- **Trazabilidad:** Cada orden contiene `user_uuid` del usuario autenticado.
- **Sin overdraft:** Intentar una salida con cantidad mayor al stock disponible da `HTTP 400`.

### Flujo de prueba completo sugerido

1. Iniciar backend → `uvicorn app.main:app --reload`
2. Sembrar datos → `python seed.py --clean`
3. Login con `admin@test.com` / `admin123`
4. `GET /inventory/products` → verificar stock inicial (ECO-001=120, FIT-001=60, etc.)
5. `GET /inventory/products?warehouse=Zaragoza` → verificar solo stock de Zaragoza
6. `POST /inventory/orders/inbound` → añadir stock a un producto
7. `GET /inventory/products/1` → verificar que el stock aumentó
8. `POST /inventory/orders/outbound` → reducir stock
9. Intentar salida con cantidad excesiva → debe dar `400 Bad Request`
10. `GET /inventory/orders` → ver listado completo con tipo, producto y usuario
