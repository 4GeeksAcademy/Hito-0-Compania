# API (FastAPI + TinyDB)

## Variables de entorno

Crea un `.env` local y completa los valores:

- `JWT_SECRET`: clave para firmar los JWT de sesión.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: duración del token de sesión.
- `RESET_TOKEN_EXPIRE_MINUTES`: duración del token de restablecimiento de contraseña (15-60 min).
- `FRONTEND_URL`: URL base del frontend, usada para construir el enlace de `/reset-password`.
- `RESEND_API_KEY`: API key del servicio de email transaccional [Resend](https://resend.com), usada para enviar el correo de restablecimiento de contraseña. **Nunca la subas al repositorio.**
- `EMAIL_FROM`: remitente que aparece en el email de restablecimiento (por ejemplo `Mi App <onboarding@resend.dev>`).
- `OPENAI_API_KEY`: clave del proveedor de IA, requerida para usar el triage de incidencias. Guárdala solo en el `.env` local y nunca la subas al repositorio.
- `OPENAI_BASE_URL`: URL base OpenAI-compatible del proveedor (para 4Geeks, usa la URL que indique su documentación, normalmente `https://llm.4geeks.ai/v1`).
- `OPENAI_MODEL`: identificador exacto del modelo del proveedor; por defecto `gpt-4o-mini`.

Para inventario, `DATABASE_URL` debe ser la conexión PostgreSQL de Supabase.
Si el host directo solo admite IPv6, coloca `DATABASE_POOLER_HOST` y
`DATABASE_POOLER_USER` en `.env.local` dentro de `services/api`. La configuración
conserva la contraseña del `.env` y sustituye host y usuario mediante el pooler.
Ambos archivos son locales y están ignorados por Git.

Desde esta carpeta, inicia el servidor con
`.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`.
En una base de pruebas vacía puedes ejecutar `.venv/bin/python seed.py` **una
sola vez** para cargar usuarios, productos y órdenes. No uses `--clean` salvo que
quieras borrar los datos locales; repetir el seed duplica usuarios y movimientos.

## Endpoints de contraseña

- `POST /auth/forgot-password` — `{ email }`. Siempre responde `200`. Si el email existe, genera un token de restablecimiento y envía el enlace por email.
- `POST /auth/reset-password` — `{ token, new_password }`. Valida firma/expiración/uso previo del token; `400` si es inválido.
- `POST /auth/change-password` — `{ current_password, new_password }`. Requiere `Authorization: Bearer <token>`; `400` si la contraseña actual es incorrecta.

## Triage de incidencias con IA

- `POST /api/incidents/{incident_id}/triage` requiere sesión (`Authorization: Bearer <token>`) y `OPENAI_API_KEY`.
- Devuelve resumen, prioridad y categoría sugeridas, siguiente paso y un borrador de respuesta. El endpoint no modifica ni persiste la incidencia; una persona debe revisar cualquier sugerencia antes de actuar.
- Antes de enviar el texto al proveedor se redactan emails y teléfonos detectables. Evita incluir datos personales o de seguimiento que no sean necesarios.
- `POST /api/incidents/{incident_id}/triage/reviews` guarda la decisión humana (`approved` o `rejected`) y la sugerencia revisada en una tabla TinyDB; `GET` en la misma ruta lista el historial.

## Picking digital de demostración

Todas las rutas requieren `Authorization: Bearer <token>`.

- `GET /inventory/picking/tasks` lista tareas de preparación.
- `POST /inventory/picking/tasks` crea una tarea pendiente sin descontar stock.
- `POST /inventory/picking/tasks/{task_id}/complete` confirma el picking y registra la salida de inventario en Supabase dentro de la misma transacción.
- `POST /inventory/picking/tasks/{task_id}/tracking-demo/advance` avanza los estados de seguimiento simulados. No consulta transportistas reales.
