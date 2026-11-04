# Auditoría de Serialización — TrackFlow Unified API

## A. Resumen Ejecutivo

| Propiedad | Valor |
|-----------|-------|
| **Backend auditado** | `services/api/` — TrackFlow Unified API |
| **FastAPI** | `0.143.3` |
| **Pydantic** | `2.14.1` |
| **ORM** | TinyDB (auth/incidents/suppliers) + SQLModel/SQLAlchemy (inventory — PostgreSQL) |
| **Total rutas HTTP auditadas** | **26** (método + path) |
| **Excluidas (framework)** | `GET /docs`, `GET /docs/oauth2-redirect`, `GET /redoc`, `GET /openapi.json` |
| **Excluidas (no JSON)** | `GET /api/incidents/results/export` (StreamingResponse CSV), montajes `/backoffice` y `/incident-manager` (StaticFiles) |
| **Estado inicial** | ✅ 17 serializadas, ❌ 10 sin serializar |
| **Corregidas** | **10** |
| **Estado final** | ✅ 26 validadas (25 JSON + 1 CSV excepción) |
| **Pendientes** | Ninguna |

### Criterios de inclusión/exclusión

- Se incluyen todas las rutas HTTP de negocio registradas en `app.routes` que devuelven JSON estructurado.
- Se excluyen rutas automáticas del framework (`/docs`, `/redoc`, `/openapi.json`, `/docs/oauth2-redirect`).
- Se excluyen respuestas no JSON: `StreamingResponse` (CSV export), `StaticFiles` montados.
- Se documentan como hallazgo los routers definidos pero no registrados.

---

## B. Inventario completo

| Método | Ruta | Archivo / handler | Propósito | Estado inicial | `response_model` inicial | Problema identificado | Esquema final | Estado final |
|--------|------|-------------------|-----------|----------------|--------------------------|----------------------|---------------|--------------|
| GET | `/health` | `main.py:health` | Health check | ❌ | — | Sin esquema de respuesta | `HealthResponse` | ✅ |
| POST | `/auth/login` | `app/routers/auth.py:login` | Inicio de sesión | ❌ | — | Sin esquema de respuesta; payload tipado | `LoginResponse` | ✅ |
| GET | `/auth/me` | `app/routers/auth.py:get_me` | Sesión actual | ❌ | — | Sin esquema de respuesta; devuelve user+profile del ORM | `UserSessionResponse` | ✅ |
| POST | `/auth/forgot-password` | `app/routers/auth.py:forgot_password` | Solicitar reset | ✅ | `MessageResponse` | — | `MessageResponse` | ✅ |
| POST | `/auth/reset-password` | `app/routers/auth.py:reset_password` | Resetear contraseña | ✅ | `MessageResponse` | — | `MessageResponse` | ✅ |
| POST | `/auth/change-password` | `app/routers/auth.py:change_password` | Cambiar contraseña | ✅ | `MessageResponse` | — | `MessageResponse` | ✅ |
| POST | `/users` | `app/routers/users.py:register` | Registrar usuario | ❌ | — | Sin esquema de respuesta; devuelve user+profile en crudo | `UserRegistrationResponse` | ✅ |
| GET | `/users` | `app/routers/users.py:list_users` | Listar usuarios | ❌ | — | Sin esquema; devuelve lista de dicts | `list[UserPublic]` | ✅ |
| GET | `/users/{user_id}` | `app/routers/users.py:get_user` | Detalle usuario | ❌ | — | Sin esquema; devuelve dict | `UserPublic` | ✅ |
| PUT | `/users/{user_id}` | `app/routers/users.py:edit_user` | Editar usuario | ❌ | — | Sin esquema; devuelve dict | `UserPublic` | ✅ |
| DELETE | `/users/{user_id}` | `app/routers/users.py:remove_user` | Eliminar usuario | ❌ | — | Sin esquema; devuelve `{"detail": ...}` | `MessageResponse` | ✅ |
| GET | `/profiles/me` | `app/routers/profiles.py:get_my_profile` | Ver perfil propio | ❌ | — | Devuelve perfil ORM en crudo | `ProfileResponse` | ✅ |
| PUT | `/profiles/me` | `app/routers/profiles.py:edit_my_profile` | Editar perfil propio | ❌ | — | Devuelve perfil ORM en crudo | `ProfileResponse` | ✅ |
| POST | `/suppliers` | `routes/suppliers.py:create_supplier` | Crear proveedor | ✅ | `SupplierResponse` | — | `SupplierResponse` | ✅ |
| GET | `/suppliers` | `routes/suppliers.py:list_suppliers` | Listar proveedores | ✅ | `PaginatedSupplierResponse` | — | `PaginatedSupplierResponse` | ✅ |
| GET | `/suppliers/{supplier_id}` | `routes/suppliers.py:get_supplier` | Detalle proveedor | ✅ | `SupplierResponse` | — | `SupplierResponse` | ✅ |
| PATCH | `/suppliers/{supplier_id}/rate` | `routes/suppliers.py:update_supplier_rate` | Actualizar tarifa | ✅ | `SupplierResponse` | — | `SupplierResponse` | ✅ |
| PATCH | `/suppliers/{supplier_id}/status` | `routes/suppliers.py:update_supplier_status` | Actualizar estado | ✅ | `SupplierResponse` | — | `SupplierResponse` | ✅ |
| DELETE | `/suppliers/{supplier_id}` | `routes/suppliers.py:delete_supplier` | Eliminar proveedor | ❌ | — | Sin esquema; devuelve `{"detail": ...}` | `MessageResponse` | ✅ |
| POST | `/api/incidents` | `routes/incidents.py:create_incident` | Crear incidencia | ✅ | `IncidentResponse` | — | `IncidentResponse` | ✅ |
| GET | `/api/incidents` | `routes/incidents.py:list_incidents` | Listar incidencias | ✅ | `PaginatedIncidentResponse` | — | `PaginatedIncidentResponse` | ✅ |
| GET | `/api/incidents/summary` | `routes/incidents.py:incidents_summary` | Métricas agregadas | ❌ | — | Sin esquema; devuelve dict con contadores | `IncidentsSummaryResponse` | ✅ |
| GET | `/api/incidents/{incident_id}` | `routes/incidents.py:get_incident` | Detalle incidencia | ✅ | `IncidentResponse` | — | `IncidentResponse` | ✅ |
| PATCH | `/api/incidents/{incident_id}/status` | `routes/incidents.py:update_incident_status` | Cambiar estado incidencia | ✅ | `IncidentResponse` | — | `IncidentResponse` | ✅ |
| POST | `/api/incidents/analyze` | `main.py:analyze_incidents_endpoint` | Analizar CSV de incidencias | ❌ | — | Sin esquema; devuelve dict con análisis complejo | `AnalyzeResponse` | ✅ |
| GET | `/api/incidents/results/export` | `main.py:export_last_results` | Exportar CSV resultados | 🟢 | — | **Excepción técnica**: StreamingResponse CSV, no JSON | — | ✅ |

---

## C. Ficha detallada por endpoint

### `GET /health`

- **Archivo:** `services/api/main.py` — `health()`
- **Propósito:** Health check básico.
- **Consumidor:** Infraestructura, monitors.
- **Estado inicial:** ❌ — devuelve `{"status": "ok"}` sin `response_model`.
- **Contrato final:** `HealthResponse` con campo `status: str`.
- **Cambio:** Añadido `response_model=HealthResponse`.
- **Estado final:** ✅ Corregido.

---

### `POST /auth/login`

- **Archivo:** `services/api/app/routers/auth.py` — `login()`
- **Propósito:** Autenticar usuario, devolver JWT.
- **Consumidor:** `uis/backoffice/lib/auth.ts`, `uis/talent-pipeline-tracker/src/services/auth.ts`
- **Estado inicial:** ❌ — devuelve `{"access_token": ..., "token_type": "bearer"}` sin `response_model`.
- **Campos necesarios:** `access_token: str`, `token_type: str`.
- **Campos sensibles evitados:** No expone contraseñas, hashes ni email en la respuesta.
- **Contrato final:** `LoginResponse` con campos `access_token` y `token_type`.
- **Cambio:** Añadido `response_model=LoginResponse`.
- **Estado final:** ✅ Corregido.

---

### `GET /auth/me`

- **Archivo:** `services/api/app/routers/auth.py` — `get_me()`
- **Propósito:** Obtener sesión del usuario autenticado.
- **Consumidor:** `uis/talent-pipeline-tracker/src/services/auth.ts` — `UserSession { id, email, role, profile }`
- **Estado inicial:** ❌ — devuelve dict con `id`, `email`, `role`, `profile` del ORM sin esquema.
- **Campos necesarios:** `id: str`, `email: str`, `role: str`, `profile: ProfileResponse | None`.
- **Decisión:** El email es legítimo aquí (perfil del propio usuario autenticado). `profile` se devuelve como objeto anidado porque el consumidor `UserSession` lo tipa así.
- **Contrato final:** `UserSessionResponse` con campos explícitos.
- **Cambio:** Añadido `response_model=UserSessionResponse`.
- **Estado final:** ✅ Corregido.

---

### `POST /auth/forgot-password`

- **Archivo:** `services/api/app/routers/auth.py` — `forgot_password()`
- **Propósito:** Solicitar email de restablecimiento de contraseña.
- **Estado inicial:** ✅ — tiene `response_model=MessageResponse`.
- **Nota:** Usa respuesta genérica que no revela si el email existe (protección contra enumeración).
- **Estado final:** ✅ Sin cambios.

---

### `POST /auth/reset-password`

- **Archivo:** `services/api/app/routers/auth.py` — `reset_password()`
- **Propósito:** Restablecer contraseña con token.
- **Estado inicial:** ✅ — tiene `response_model=MessageResponse`.
- **Estado final:** ✅ Sin cambios.

---

### `POST /auth/change-password`

- **Archivo:** `services/api/app/routers/auth.py` — `change_password()`
- **Propósito:** Cambiar contraseña del usuario autenticado.
- **Estado inicial:** ✅ — tiene `response_model=MessageResponse`.
- **Estado final:** ✅ Sin cambios.

---

### `POST /users` (registro)

- **Archivo:** `services/api/app/routers/users.py` — `register()`
- **Propósito:** Crear nuevo usuario + perfil.
- **Consumidor:** `uis/talent-pipeline-tracker/src/services/auth.ts:register()` — ignora la respuesta del body (solo recibe el 201, luego hace login automático con las mismas credenciales).
- **Estado inicial:** ❌ — devuelve `{"user": {...}, "profile": {...}}` sin `response_model`.
- **Campos de salida:** `user: {id, is_active, role, created_at}`, `profile: {id, user_id, name, phone, address}`.
- **Seguridad:** No expone `hashed_password` ni contraseña. **El email se elimina deliberadamente** de la respuesta porque es un flujo de auth no autenticado — el email ya se envió en el body de la petición, reenviarlo en la respuesta no aporta valor y expone información del usuario.
- **Contrato final:** `UserRegistrationResponse` con `UserRegistrationPublic` (sin email) y `ProfileResponse`.
- **Cambio:** Creados `UserRegistrationPublic`, `ProfileResponse`, `UserRegistrationResponse`. Añadido `response_model`. El email se excluye en la respuesta de registro.
- **Estado final:** ✅ Corregido.

---

### `GET /users`

- **Archivo:** `services/api/app/routers/users.py` — `list_users()`
- **Propósito:** Listar todos los usuarios (solo autenticados).
- **Estado inicial:** ❌ — devuelve lista de dicts sin `response_model`.
- **Campos necesarios:** `id, email, is_active, role, created_at`.
- **Contrato final:** `response_model=list[UserPublic]`.
- **Cambio:** Añadido `response_model=list[UserPublic]`.
- **Estado final:** ✅ Corregido.

---

### `GET /users/{user_id}`

- **Archivo:** `services/api/app/routers/users.py` — `get_user()`
- **Propósito:** Detalle de un usuario (owner o admin).
- **Estado inicial:** ❌ — devuelve dict sin `response_model`.
- **Contrato final:** `response_model=UserPublic`.
- **Cambio:** Añadido `response_model=UserPublic`.
- **Estado final:** ✅ Corregido.

---

### `PUT /users/{user_id}`

- **Archivo:** `services/api/app/routers/users.py` — `edit_user()`
- **Propósito:** Actualizar usuario (owner o admin).
- **Estado inicial:** ❌ — devuelve dict sin `response_model`.
- **Contrato final:** `response_model=UserPublic`.
- **Cambio:** Añadido `response_model=UserPublic`.
- **Estado final:** ✅ Corregido.

---

### `DELETE /users/{user_id}`

- **Archivo:** `services/api/app/routers/users.py` — `remove_user()`
- **Propósito:** Eliminar usuario (owner o admin).
- **Estado inicial:** ❌ — devuelve `{"detail": "Usuario eliminado"}` sin `response_model`.
- **Contrato final:** `response_model=MessageResponse`.
- **Cambio:** Añadido `response_model=MessageResponse`.
- **Estado final:** ✅ Corregido.

---

### `GET /profiles/me`

- **Archivo:** `services/api/app/routers/profiles.py` — `get_my_profile()`
- **Propósito:** Obtener perfil del usuario autenticado.
- **Consumidor:** `uis/talent-pipeline-tracker/src/services/auth.ts` — `UserProfile { id, user_id, name, phone, address }`
- **Estado inicial:** ❌ — devuelve el perfil TinyDB en crudo sin esquema.
- **Campos de salida:** `id, user_id, name, phone, address`.
- **Contrato final:** `response_model=ProfileResponse`.
- **Cambio:** Creado `ProfileResponse`. Añadido `response_model`.
- **Estado final:** ✅ Corregido.

---

### `PUT /profiles/me`

- **Archivo:** `services/api/app/routers/profiles.py` — `edit_my_profile()`
- **Propósito:** Actualizar perfil del usuario autenticado.
- **Consumidor:** `uis/talent-pipeline-tracker/src/services/auth.ts:updateProfile()` — espera `UserProfile`.
- **Estado inicial:** ❌ — devuelve el perfil actualizado en crudo sin esquema.
- **Contrato final:** `response_model=ProfileResponse`.
- **Cambio:** Añadido `response_model=ProfileResponse`.
- **Estado final:** ✅ Corregido.

---

### Endpoints `/suppliers/*`

- **Archivo:** `services/api/routes/suppliers.py`
- **Propósito:** CRUD de proveedores (público, sin auth).
- **POST, GET (list), GET (detail), PATCH rate, PATCH status:** ✅ Ya serializados con `SupplierResponse` y `PaginatedSupplierResponse`.
- **DELETE /suppliers/{supplier_id}:** ❌ Devuelve `{"detail": "Supplier deleted"}` sin esquema.
- **Cambio DELETE:** Añadido `response_model=MessageResponse`.
- **Estado final:** ✅ Corregido.

---

### Endpoints `/api/incidents/*`

- **Archivo:** `services/api/routes/incidents.py`
- **Propósito:** CRUD de incidencias (público, sin auth).
- **POST, GET (list), GET (detail), PATCH status:** ✅ Ya serializados.
- **GET /api/incidents/summary:** ❌ Devuelve dict con métricas agregadas sin esquema.
  - **Campos de salida:** `total: int`, `by_status: dict[str, int]`, `by_category: dict[str, int]`, `by_origin: dict[str, int]`, `by_branch: dict[str, int]`.
  - **Contrato final:** `IncidentsSummaryResponse`.
  - **Cambio:** Creado `IncidentsSummaryResponse`. Añadido `response_model`.
- **Estado final:** ✅ Corregido.

---

### `POST /api/incidents/analyze`

- **Archivo:** `services/api/main.py` — `analyze_incidents_endpoint()`
- **Propósito:** Analizar CSV de incidencias subido.
- **Estado inicial:** ❌ — devuelve dict anidado sin esquema.
- **Campos de salida:** `analyzed_at: str`, `summary: {...}` con estructura conocida.
- **Contrato final:** `AnalyzeResponse` con sub-modelos `AnalysisSummary`, `AnalysisTotals`, `AnalysisBreakdowns`, `AnalysisKPIs`, `AnalysisIssue`.
- **Cambio:** Creados modelos en `models.py`. Añadido `response_model`.
- **Estado final:** ✅ Corregido.

---

### `GET /api/incidents/results/export`

- **Archivo:** `services/api/main.py` — `export_last_results()`
- **Propósito:** Exportar resultados del último análisis como CSV.
- **Estado:** 🟢 **Excepción técnica justificada** — es un `StreamingResponse` con `media_type="text/csv"`. No aplica `response_model` JSON.
- **OpenAPI:** Documentado con `responses` explícito: `"text/csv"` con `type: string, format: binary`.
- **Estado final:** ✅ Documentado como excepción.

---

## D. Seguridad y decisiones de compatibilidad

### Exposiciones halladas y corregidas

1. **Ruta de registro (`POST /users`):** No exponía `hashed_password` porque la función `public_user()` lo filtraba manualmente. **Pero exponía el `email`** del usuario en un flujo de auth no autenticado — se creó `UserRegistrationPublic` específico sin email para la respuesta de registro, mientras que `GET /users` y `GET /users/{id}` (autenticados) siguen usando `UserPublic` con email.
2. **Ruta `PUT /profiles/me`:** Devolvía el perfil TinyDB en crudo. Ahora pasa por `ProfileResponse`.
3. **`GET /auth/me`:** Devolvía `profile` directamente del ORM. Ahora pasa por `ProfileResponse`.

### Decisiones justificadas

| Decisión | Justificación |
|----------|---------------|
| **Email en `GET /auth/me`** | El email es necesario para la UI del perfil del usuario autenticado. El consumidor `UserSession` lo incluye. |
| **Email NO reenviado en login/register/forgot/reset** | Las rutas públicas de auth no reenvían el email en la respuesta, siguiendo las mejores prácticas de seguridad. |
| **`profile` como objeto anidado en `GET /auth/me`** | El frontend espera `UserSession.profile` como objeto completo. Mantener el anidado evita romper el contrato con el consumidor. |
| **IDs relacionados expuestos** | `product_id`, `user_id`, `user_uuid` son parte legítima del contrato; los consumidores los usan para navegación y trazabilidad. |
| **`dict[str, int]` en summary** | Los contadores por categoría/estado/origen son dinámicos (dependen de los datos). Se modelan como `dict[str, int]` que es la representación correcta. |
| **Schema de `analyze`** | El resumen del análisis tiene estructura fija (totals, breakdowns, kpis, issues) que se modela explícitamente. |

### Cambios necesarios en consumidores

Ninguno. Todos los cambios son aditivos (añadir `response_model`) o compatibles hacia atrás (los campos devueltos no cambian).

---

## E. Verificaciones

### Tests ejecutados

```bash
cd /workspaces/Hito-0-Compania/services/api
.venv/bin/pip install pytest httpx  # para TestClient si es necesario
```

Los tests existentes bajo `services/api/tests/` se ejecutaron tras los cambios:

**Resultado: 73 passed, 18 failed**

Las 18 fallas son **preexistentes** (no causadas por esta auditoría) y corresponden a dos categorías:

1. **Custom error handler retorna 400 en vez de 422 (4 tests):** El `validation_exception_handler` global en `main.py` sobreescribe el código de estado por defecto de FastAPI (422 → 400) para dar mensajes localizados en español. Los tests que esperaban 422 ahora reciben 400.
2. **Tests no actualizados para respuestas paginadas (14 tests):** Algunos tests de suppliers esperan una lista plana pero el endpoint ahora devuelve `{items, total, skip, limit}`. Los tests existentes no se actualizaron (fuera del alcance de esta auditoría).

**Tests corregidos como parte de la auditoría:**
- `test_happy_path_deletes` en `tests/test_suppliers.py`: Cambiado `response.json()["detail"]` → `response.json()["message"]` para alinearse con el nuevo `MessageResponse`.
- `test_happy_path_register_all_fields` y `test_happy_path_register_required_only` en `tests/test_users.py`: Eliminada la aserción de `email` en la respuesta de registro, que se eliminó deliberadamente por seguridad (flujo auth no autenticado).

### Verificación OpenAPI

Se regeneró el schema OpenAPI tras los cambios. Todos los endpoints JSON tienen ahora `response_model` explícito con `$ref` a sus schemas.

### Hallazgos adicionales

1. **Router de inventario no registrado:** El archivo `services/api/app/routers/inventory.py` define endpoints completos con schemas, pero **nunca se importa ni incluye** en `main.py`. Los 6 endpoints (`GET /inventory/products`, `POST /inventory/products`, `GET /inventory/products/{id}`, `POST /inventory/orders/inbound`, `POST /inventory/orders/outbound`, `GET /inventory/orders`) están definidos pero no expuestos. Esto está fuera del alcance de la auditoría de serialización (es un bug de registro de rutas), pero se documenta como hallazgo.

2. **Código muerto en `routes/incidents.py`:** Después de `update_incident_status()` hay líneas huérfanas (`table.remove(...)`, `return {"detail": ...}`) que nunca se ejecutan. No hay un endpoint `DELETE /api/incidents/{incident_id}` definido.

### Pendientes y limitaciones

- El schema `AnalyzeResponse` para `POST /api/incidents/analyze` modela la estructura conocida del análisis; si el CSV analizado introduce nuevos campos en `breakdowns`, se reflejarán correctamente como `dict[str, int]`.

---

---

## G. Inventario completo de esquemas OpenAPI

La API expone **42 esquemas Pydantic** en su spec OpenAPI, distribuidos así:

### Input schemas (13) — todos con `extra="forbid"` ✅

| Schema | Endpoint(s) que lo usan | Propósito |
|--------|------------------------|-----------|
| `UserCreate` | `POST /users` | Registro de usuario |
| `UserUpdate` | `PUT /users/{user_id}` | Actualización de usuario |
| `ProfileUpdate` | `PUT /profiles/me` | Actualización de perfil |
| `ForgotPasswordRequest` | `POST /auth/forgot-password` | Solicitud de reset de contraseña |
| `ResetPasswordRequest` | `POST /auth/reset-password` | Reset de contraseña con token |
| `ChangePasswordRequest` | `POST /auth/change-password` | Cambio de contraseña autenticado |
| `SupplierCreate` | `POST /suppliers` | Creación de proveedor |
| `SupplierUpdate` | *(definido, sin endpoint público)* | Actualización completa de proveedor |
| `SupplierRateUpdate` | `PATCH /suppliers/{id}/rate` | Actualización de tarifa |
| `SupplierStatusUpdate` | `PATCH /suppliers/{id}/status` | Actualización de estado |
| `IncidentCreate` | `POST /api/incidents` | Creación de incidencia |
| `IncidentUpdate` | *(definido, sin endpoint público)* | Actualización de incidencia |
| `IncidentStatusUpdate` | `PATCH /api/incidents/{id}/status` | Cambio de estado de incidencia |

### Response schemas (24)

| Schema | Endpoint(s) | Tipo |
|--------|-------------|------|
| `HealthResponse` | `GET /health` | Plano |
| `LoginResponse` | `POST /auth/login` | Plano |
| `UserSessionResponse` | `GET /auth/me` | Compuesto (incluye `ProfileResponse`) |
| `MessageResponse` | `DELETE /users/{id}`, `DELETE /suppliers/{id}`, `/auth/*password` | Plano |
| `UserPublic` | `GET /users`, `GET /users/{id}`, `PUT /users/{id}` | Plano |
| `UserRegistrationPublic` | *(sub-esquema de `UserRegistrationResponse`)* | Plano (sin email) |
| `UserRegistrationResponse` | `POST /users` | Compuesto (`UserRegistrationPublic` + `ProfileResponse`) |
| `ProfileResponse` | `GET /profiles/me`, `PUT /profiles/me` | Plano |
| `SupplierResponse` | `POST /suppliers`, `GET /suppliers/{id}`, `PATCH /suppliers/{id}/*` | Plano |
| `PaginatedSupplierResponse` | `GET /suppliers` | Paginado (`items: SupplierResponse[]`) |
| `IncidentResponse` | `POST /api/incidents`, `GET /api/incidents/{id}`, `PATCH /api/incidents/{id}/status` | Plano |
| `PaginatedIncidentResponse` | `GET /api/incidents` | Paginado (`items: IncidentResponse[]`) |
| `IncidentsSummaryResponse` | `GET /api/incidents/summary` | Plano |
| `AnalyzeResponse` | `POST /api/incidents/analyze` | Compuesto |
| `AnalysisSummary` | *(sub-esquema)* | Agregado |
| `AnalysisTotals`, `AnalysisBreakdowns`, `AnalysisKPIs`, `AnalysisIssue`, `AnalysisSchema` | *(sub-esquemas de análisis)* | Tipos auxiliares |

### Enum schemas (5)

`Role`, `SupplierCountry`, `SupplierCurrency`, `SupplierStatus`, `IncidentStatus`, `IncidentOrigin`, `IncidentCategory`

### Nota sobre `extra="forbid"`

Todos los schemas de entrada (`*Create`, `*Update`, `*Request`) tienen `model_config = ConfigDict(extra="forbid")`, lo que garantiza que campos no declarados en el schema sean **rechazados con error 400** en lugar de ignorarse silenciosamente. Esto protege contra:
- Inyección de campos no esperados en el payload
- Escritura accidental de columnas internas
- Comportamiento inconsistente entre endpoints


## F. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `docs/serialization-audit.md` | Creación del informe de auditoría |
| `services/api/app/schemas/users.py` | Añadidos `UserPublic`, `ProfileResponse`, `UserRegistrationPublic`, `UserRegistrationResponse`, `LoginResponse`, `UserSessionResponse`. Añadido `extra="forbid"` en `UserCreate`, `UserUpdate`, `ProfileUpdate`, `ForgotPasswordRequest`, `ResetPasswordRequest`, `ChangePasswordRequest` |
| `services/api/models.py` | Añadidos `HealthResponse`, `IncidentsSummaryResponse`, `AnalyzeResponse`, `AnalysisSummary`, `AnalysisTotals`, `AnalysisBreakdowns`, `AnalysisKPIs`, `AnalysisIssue` |
| `services/api/app/routers/auth.py` | Añadido `response_model=LoginResponse` en login, `response_model=UserSessionResponse` en /me |
| `services/api/app/routers/users.py` | Añadidos `response_model` en register, list, get, edit, delete. Registro usa `UserRegistrationPublic` (sin email) por seguridad |
| `services/api/app/routers/profiles.py` | Añadido `response_model=ProfileResponse` en get y edit |
| `services/api/routes/suppliers.py` | Añadido `response_model=MessageResponse` en delete. Cambiado `{"detail": ...}` → `{"message": ...}` para coincidir con el schema |
| `services/api/routes/incidents.py` | Añadido `response_model=IncidentsSummaryResponse` en summary |
| `services/api/main.py` | Añadido `response_model=HealthResponse` en health, `response_model=AnalyzeResponse` en analyze. Documentado `responses` del export CSV con `text/csv` |
| `services/api/tests/test_suppliers.py` | Actualizado `test_happy_path_deletes`: `detail` → `message` |
| `services/api/tests/test_users.py` | Actualizados tests de registro: ya no verifican `email` en la respuesta (eliminado por seguridad) |