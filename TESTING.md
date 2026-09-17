# Plan de Pruebas — API de Autenticación

## Cómo ejecutar las pruebas

### Backend (pytest)

```bash
# Instalar dependencias de desarrollo
uv pip install "pytest>=8" "httpx>=0.28"

# Ejecutar todas las pruebas
uv run pytest services/api/tests/ -v

# Ejecutar con cobertura
uv run pytest services/api/tests/ -v --cov=app --cov-report=term-missing

# Ejecutar una suite específica
uv run pytest services/api/tests/test_auth.py -v
```

### TypeScript (Jest)

```bash
# Ejecutar todas las pruebas con cobertura
NODE_OPTIONS='--experimental-vm-modules' npx jest --coverage
```

### Todo en uno

```bash
# Backend
uv run pytest services/api/tests/ -v --cov=app --cov-report=term-missing && \
# Utilidades TypeScript
NODE_OPTIONS='--experimental-vm-modules' npx jest --coverage
```

## Estructura del proyecto de pruebas

```
# pytest — backend FastAPI (77 tests)
services/api/tests/
├── __init__.py
├── conftest.py               # Fixtures compartidos (cliente, BD, tokens, usuarios semilla)
├── .env                      # Variables de entorno para tests
├── test_auth.py              # Tests del router /auth/* (25 tests)
├── test_users.py             # Tests del router /users/* (19 tests)
├── test_profiles.py          # Tests del router /profiles/* (6 tests)
└── test_suppliers.py         # Tests del router /suppliers/* (24 tests)
└── test_incidents.py         # Tests del router /api/incidents/* (14 tests)

# Jest — utilidades TypeScript (57 tests)
src/utils/__tests__/
├── auth.test.ts              # decodeTokenPayload, isTokenExpired, getTokenRemainingTime,
│                             #   validatePassword, validateEmail, hashStringSHA256 (26 tests)
├── collections.test.ts       # filtrarPorTransportista, filtrarPorEstado,
│                             #   ordenarPorCostoEnvio, ordenarPorPeso (8 tests)
├── search.test.ts            # busquedaLinealEnvio, busquedaBinariaEnvio (6 tests)
├── transformations.test.ts   # contarEnviosDevueltos, calcularCostoTotalEnvios,
│                             #   calcularPromedioPeso, obtenerEnvioMas/MenosCostoso (11 tests)
└── validations.test.ts       # validarEnvio (6 tests)

# Jest — frontend Next.js (16 tests)
uis/talent-pipeline-tracker/
├── __tests__/
│   └── http-client.test.ts   # resolveApiBase, token helpers, handleUnauthorized,
│                             #   buildAuthHeaders, checkUnauthorized (16 tests)
├── jest.config.mjs
└── jest.setup.mjs
```

## Estrategia de pruebas

Cada endpoint se prueba bajo **tres pilares**:

1. **Camino feliz** — la entrada es válida y el sistema responde correctamente.
2. **Caso límite** — entrada válida pero inusual (campos vacíos, valores extremos, duplicados, estados transitorios).
3. **Modo de fallo** — la entrada es inválida o el estado del sistema no permite la operación.

---

## Endpoint: `POST /auth/login`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Credenciales correctas | email + password válidos | `200` con `access_token` y `token_type: bearer` |
| ⚠️ Caso límite | Password vacío | email válido + password="" | `401` — credenciales incorrectas |
| ⚠️ Caso límite | Email vacío | email="" + password válido | `401` — credenciales incorrectas (o `422` por validación) |
| ⚠️ Caso límite | Email con formato inválido | "no-es-un-email" + password | `422` — error de validación Pydantic |
| ❌ Modo fallo | Usuario no existe | email@inexistente.com + password | `401` — "Email o contraseña incorrectos" |
| ❌ Modo fallo | Password incorrecta | email correcto + password errónea | `401` — "Email o contraseña incorrectos" |

**Por qué estos casos:** El login es la puerta de entrada. Probar credenciales vacías, usuarios inexistentes y contraseñas erróneas cubre los escenarios reales más comunes. El email con formato inválido verifica que la validación Pydantic está activa.

---

## Endpoint: `GET /auth/me`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Token válido | Bearer token generado en login | `200` con id, email, role y profile |
| ⚠️ Caso límite | Token de usuario sin perfil | Token de usuario sin profile asociado | `200` con `profile: None` |
| ❌ Modo fallo | Sin token | Sin cabecera Authorization | `401` — "Not authenticated" |
| ❌ Modo fallo | Token malformado | `Bearer token-inventado` | `401` — "Token inválido o expirado" |
| ❌ Modo fallo | Token expirado | Token JWT con exp pasado | `401` — "Token inválido o expirado" |

**Por qué estos casos:** `GET /me` es el endpoint que valida que un token es funcional. Probar token expirado es crítico porque la regresión del ticket AUTH-088 fue precisamente en expiración de tokens. Token malformado cubre el escenario de clientes con tokens corruptos.

---

## Endpoint: `POST /auth/forgot-password`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Email registrado | email de usuario existente | `200` con mensaje genérico |
| ⚠️ Caso límite | Email no registrado | email aleatorio no existente | `200` con el mismo mensaje genérico (no revelar existencia) |
| ❌ Modo fallo | Email vacío | `email: ""` | `422` — error de validación |
| ❌ Modo fallo | Error al enviar email | Email válido pero RESEND_API_KEY no configurada | `200` igualmente (el error se captura con `print`, no debe romper la respuesta) |

**Por qué estos casos:** El endpoint no debe filtrar qué emails están registrados (seguridad por oscuridad). El mensaje genérico es idéntico exista o no el usuario. El fallo en el envío de email no debe propagarse al cliente.

---

## Endpoint: `POST /auth/reset-password`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Token válido y nueva password | token real + new_password >= 8 chars | `200` — contraseña actualizada |
| ⚠️ Caso límite | Token expirado | token emitido hace > 30 min | `400` — "El token expiró" |
| ⚠️ Caso límite | Token ya usado | token que ya fue consumido | `400` — "El token ya fue utilizado" |
| ⚠️ Caso límite | Nueva password < 8 caracteres | `new_password: "abc"` | `422` — error de validación (min_length) |
| ❌ Modo fallo | Token inválido (no existe) | `token: "fake-token"` | `400` — "Token inválido" |
| ❌ Modo fallo | Token malformado (no es SHA256 válido) | `token: ""` | `400` — "Token inválido" |

**Por qué estos casos:** El flujo de reset-password es crítico para la seguridad. Probar token expirado, usado, inválido y password demasiado corta cubre los abusos más comunes. La validación de `min_length=8` en el schema es una barrera importante.

---

## Endpoint: `POST /auth/change-password`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Cambio con contraseña actual correcta | current_password + new_password >= 8 chars | `200` — contraseña actualizada |
| ⚠️ Caso límite | Nueva password < 8 caracteres | `new_password: "abc"` | `422` — error de validación |
| ⚠️ Caso límite | Contraseña actual incorrecta | current_password errónea | `400` — "La contraseña actual es incorrecta" |
| ❌ Modo fallo | Sin autenticación | Sin token Bearer | `401` — "Not authenticated" |

**Por qué estos casos:** Es la operación que un usuario autenticado usa para cambiar su contraseña. El principal riesgo es que alguien sin la contraseña actual pueda cambiarla, de ahí probar current_password incorrecta. La autenticación es obligatoria.

---

## Endpoint: `POST /users` (Registro)

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Registro con todos los campos | email + password + name + phone + address | `201` con user y profile |
| ✅ Camino feliz | Registro solo campos obligatorios | email + password, sin opcionales | `201` con profile con campos None |
| ⚠️ Caso límite | Email duplicado | email ya registrado | `400` — "El email ya está registrado" |
| ❌ Modo fallo | Password demasiado corta | password < 8 chars | `422` — error de validación |

**Por qué estos casos:** El registro es el punto de entrada de nuevos usuarios. El email duplicado es el caso límite más común en producción. Probar solo campos obligatorios verifica que los opcionales son realmente opcionales.

---

## Endpoint: `GET /users` (Listar usuarios)

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Usuario autenticado lista usuarios | Token válido | `200` con lista de usuarios |
| ❌ Modo fallo | Sin autenticación | Sin token | `401` — "Not authenticated" |

---

## Endpoint: `GET /users/{user_id}`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Propio usuario se obtiene a sí mismo | Token del mismo usuario | `200` con datos del usuario |
| ✅ Camino feliz | Admin obtiene otro usuario | Token de admin + user_id de otro | `200` con datos del usuario |
| ⚠️ Caso límite | Usuario no admin obtiene otro usuario | Token de user + user_id de otro | `403` — "No tenés permiso" |
| ❌ Modo fallo | Usuario no encontrado | Token válido + user_id inexistente | `404` — "Usuario no encontrado" |
| ❌ Modo fallo | Sin autenticación | Sin token | `401` |

---

## Endpoint: `PUT /users/{user_id}`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Usuario edita su propio email | Token propio + nuevo email | `200` con datos actualizados |
| ✅ Camino feliz | Admin cambia rol a otro usuario | Token admin + role: "manager" | `200` con nuevo rol |
| ⚠️ Caso límite | Email duplicado en edición | email que ya pertenece a otro usuario | `400` — "El email ya está registrado" |
| ⚠️ Caso límite | Usuario no admin intenta cambiar rol | Token user + role: "admin" | `403` — "Solo un admin puede cambiar roles" |
| ❌ Modo fallo | Usuario no encontrado | user_id inexistente | `404` |
| ❌ Modo fallo | Sin autenticación | Sin token | `401` |

---

## Endpoint: `DELETE /users/{user_id}`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Usuario se elimina a sí mismo | Token propio | `200` — "Usuario eliminado" |
| ✅ Camino feliz | Admin elimina otro usuario | Token admin | `200` — "Usuario eliminado" |
| ⚠️ Caso límite | Usuario no admin elimina otro usuario | Token user + otro user_id | `403` — "No tenés permiso" |
| ❌ Modo fallo | Usuario no encontrado | user_id inexistente | `404` |
| ❌ Modo fallo | Sin autenticación | Sin token | `401` |

---

## Endpoint: `GET /profiles/me`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Perfil propio | Token válido | `200` con datos del perfil |
| ❌ Modo fallo | Sin autenticación | Sin token | `401` |
| ❌ Modo fallo | Perfil no encontrado | Token de usuario sin profile | `404` — "Perfil no encontrado" |

---

## Endpoint: `PUT /profiles/me`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Actualizar nombre y teléfono | Token + {name, phone} | `200` con perfil actualizado |
| ⚠️ Caso límite | Actualizar con body vacío | Token + `{}` | `200` — sin cambios (exclude_none) |
| ❌ Modo fallo | Sin autenticación | Sin token | `401` |

---

## API-042: Endpoints de /suppliers (proveedores)

### Endpoint: `POST /suppliers`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Crear proveedor completo | Todos los campos válidos | `201` con datos del proveedor |
| ✅ Camino feliz | Proveedor en España con EUR | Spain + EUR | `201` con datos correctos |
| ⚠️ Caso límite | Solo campos obligatorios | Sin opcionales | `201` con service_zone=None |
| ❌ Modo fallo | Categoría inválida | categories: ["invalid"] | `422` |
| ❌ Modo fallo | USA con EUR | currency: "EUR" | `422` |
| ❌ Modo fallo | Name vacío | name: "" | `422` |
| ❌ Modo fallo | Rate <= 0 | rate_per_shipment: 0 | `422` |

### Endpoint: `GET /suppliers`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Listar todos | Sin filtros | `200` con lista completa |
| ⚠️ Caso límite | Filtrar por país | ?country=Spain | `200` solo suppliers de Spain |
| ⚠️ Caso límite | Filtrar por categoría | ?category=packaging_materials | `200` solo suppliers con esa categoría |
| ⚠️ Caso límite | Lista vacía | Sin suppliers en BD | `200` con [] |
| ❌ Modo fallo | País inválido | ?country=Atlantis | `422` |

### Endpoint: `GET /suppliers/{supplier_id}`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Obtener supplier existente | ID válido | `200` con datos |
| ❌ Modo fallo | ID inexistente | 99999 | `404` |

### Endpoint: `PATCH /suppliers/{supplier_id}/rate`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Actualizar tarifa | rate_per_shipment: 9.99 | `200` con nueva tarifa |
| ❌ Modo fallo | Supplier inexistente | ID 99999 | `404` |
| ❌ Modo fallo | Tarifa inválida | rate_per_shipment: 0 | `422` |
| ❌ Modo fallo | Campos extra | Incluye name en body | `422` (extra=forbid) |

### Endpoint: `PATCH /suppliers/{supplier_id}/status`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Suspender proveedor | status: "suspended" | `200` con status suspended |
| ✅ Camino feliz | Reactivar proveedor | status: "active" | `200` con status active |
| ❌ Modo fallo | Status inválido | status: "unknown" | `422` |
| ❌ Modo fallo | Supplier inexistente | ID 99999 | `404` |

### Endpoint: `DELETE /suppliers/{supplier_id}`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Eliminar supplier existente | ID válido | `200` con confirmación |
| ❌ Modo fallo | ID inexistente | 99999 | `404` |

---

## FE-019: Utilidades HTTP del frontend (http-client.ts)

| Función | Tests | Camino feliz | Caso límite | Modo fallo |
|---|---|---|---|---|
| `resolveApiBase` | 4 | localhost → :8000 | Codespace auto-detect | Sin window → env var / vacío |
| `getStoredToken` / `storeToken` / `clearToken` | 4 | Guarda y recupera | Token vacío | Sin token → null |
| `handleUnauthorized` | 1 | Limpia token y redirige | — | — |
| `buildAuthHeaders` | 4 | Incluye Bearer token | Headers extra sin token | Sin token no incluye Auth |
| `checkUnauthorized` | 3 | 401 → true + redirect | 403 → false | 200 → false |

---

## Resumen de cobertura

### Backend — pytest

| Suite | Tests | Camino feliz | Casos límite | Modos fallo | Total |
|---|---|---|---|---|---|
| `test_auth.py` | `/auth/*` | 5 | 10 | 10 | **25** |
| `test_users.py` | `/users/*` | 6 | 6 | 7 | **19** |
| `test_profiles.py` | `/profiles/*` | 2 | 1 | 3 | **6** |
| `test_suppliers.py` | `/suppliers/*` | 7 | 4 | 13 | **24** |
| `test_incidents.py` | `/api/incidents/*` | 5 | 6 | 9 | **14** |
| **Total** | **20 endpoints** | **24** | **22** | **42** | **91** |

> **Cobertura real:** 95% global (app + services.api). 100% en auth, users, profiles, suppliers routes. 82% en `incident_analyzer.py`.

### TypeScript — Utilidades (`src/utils/`)

| Archivo | % Statements | % Branch | % Funcs | % Lines |
|---|---|---|---|---|
| `auth.ts` | 91.48% | 88.46% | 100% | 97.43% |
| `collections.ts` | 100% | 100% | 100% | 100% |
| `search.ts` | 100% | 90% | 100% | 100% |
| `transformations.ts` | 100% | 100% | 100% | 100% |
| `validations.ts` | 100% | 100% | 100% | 100% |
| **Total** | **96.52%** | **92.85%** | **100%** | **99.05%** |

### TypeScript — Frontend Next.js (`uis/talent-pipeline-tracker/`)

| Archivo | % Statements | % Branch | % Funcs | % Lines |
|---|---|---|---|---|
| `http-client.ts` | 92.59% | 63.63% | 100% | 96.15% |

> **Total combinado:** 164 tests (91 pytest + 57 src/utils Jest + 16 frontend Jest)

## Comandos de ejecución

```bash
# pytest — todos los tests del backend (auth + suppliers + incidents)
uv run pytest services/api/tests/ -v --cov=app --cov=services.api --cov=incident_analyzer --cov-report=term-missing

# Jest — utilidades TypeScript (src/utils/)
NODE_OPTIONS='--experimental-vm-modules' npx jest --coverage

# Jest — frontend Next.js (uis/talent-pipeline-tracker/)
cd uis/talent-pipeline-tracker && NODE_OPTIONS='--experimental-vm-modules' npx jest --coverage
```

## Bugs encontrados durante la implementación de tests

### Backend (FastAPI)

1. **`PUT /users/{id}` con usuario inexistente** — La API devolvía un `500 TypeError` porque `public_user(None)` intentaba acceder a `None["id"]`. Se añadió una comprobación temprana que devuelve `404` correctamente.
2. **`UserCreate.password` sin `min_length`** — El schema de registro aceptaba contraseñas de cualquier longitud. Se añadió `min_length=8` para alinearlo con los otros schemas (`ChangePasswordRequest`, `ResetPasswordRequest`).

### TypeScript

3. **`jest` no disponible como global en ESM** — Al ejecutar Jest con `NODE_OPTIONS='--experimental-vm-modules'`, el objeto `jest` no está disponible globalmente. Los tests que usaban `jest.useFakeTimers` fallaban con `ReferenceError: jest is not defined`. Se solucionó importando `describe`, `expect`, `test` desde `@jest/globals` y rediseñando los tests de time-sensitive (`isTokenExpired`, `getTokenRemainingTime`) para usar valores de token extremos en lugar de `useFakeTimers`.
4. **Archivos `.js` pre-compilados interfiriendo con Jest** — Existían archivos `collections.js`, `search.js`, etc. pre-compilados en `src/utils/`. Jest resolvía los imports a estos `.js` en lugar de transformar los `.ts`, resultando en 0% de cobertura para esos módulos. Se solucionó eliminando los archivos compilados para que Jest use los fuentes TypeScript directamente.
5. **`localStorage` y `window` no definidos en Node** — Al importar `http-client.ts` en Jest, las funciones que acceden a `localStorage` y `window.location` lanzaban `ReferenceError` porque Node no tiene estos objetos del navegador. Se solucionó con un `jest.setup.mjs` que define mocks globales de `localStorage` y `window` antes de cargar los módulos.

---

## API-087: Endpoints de /api/incidents (análisis de incidencias)

### Endpoint: `POST /api/incidents/analyze`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | CSV válido con 3 filas | CSV con datos correctos | `200` con `analyzed_at`, `summary.totals.total_rows=3` |
| ✅ Camino feliz | KPIs calculados | CSV con datos válidos | `200` con `avg_resolution_hours=2.17` |
| ✅ Camino feliz | Satisfaction score | CSV con columna satisfaction_score | `200` con `avg_satisfaction_closed` calculado |
| ✅ Camino feliz | Breakdowns poblados | CSV válido | `200` con breakdowns por categoría/país/prioridad/canal |
| ⚠️ Caso límite | CSV vacío (solo cabeceras, sin datos) | CSV con cabeceras únicamente | `200` con `total_rows=0` |
| ❌ Modo fallo | Cabeceras incompletas | CSV sin campos requeridos | `400` — "cabeceras incompletas" |
| ❌ Modo fallo | Sin archivo | No enviar `file` | `422` — error de validación |
| ❌ Modo fallo | Formato no CSV | `.txt` en lugar de `.csv` | `415` — "Formato no soportado" |
| ❌ Modo fallo | Archivo binario | Contenido no UTF-8 | `400` — debe estar codificado en UTF-8 |
| ❌ Modo fallo | Archivo vacío | `b""` | `400` — "CSV vacio" |
| ❌ Modo fallo | Múltiples filas inválidas | País inválido, email inválido, categoría inválida, horas negativas | `200` con issues detallados, invalid_rows=3 |

### Endpoint: `GET /api/incidents/results/export`

| Tipo | Caso | Entrada | Comportamiento esperado |
|---|---|---|---|
| ✅ Camino feliz | Exportar tras analizar | POST /analyze + GET /results/export | `200` con `Content-Type: text/csv` |
| ❌ Modo fallo | Sin análisis previo | GET sin POST previo | `404` — "no hay analisis previo" |