# API (FastAPI + TinyDB)

## Variables de entorno

Crea un `.env` local y completa los valores:

- `JWT_SECRET`: clave para firmar los JWT de sesión.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: duración del token de sesión.
- `RESET_TOKEN_EXPIRE_MINUTES`: duración del token de restablecimiento de contraseña (15-60 min).
- `FRONTEND_URL`: URL base del frontend, usada para construir el enlace de `/reset-password`.
- `RESEND_API_KEY`: API key del servicio de email transaccional [Resend](https://resend.com), usada para enviar el correo de restablecimiento de contraseña. **Nunca la subas al repositorio.**
- `EMAIL_FROM`: remitente que aparece en el email de restablecimiento (por ejemplo `Mi App <onboarding@resend.dev>`).

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
