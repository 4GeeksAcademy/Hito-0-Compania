# Guía de prueba: flujo de restablecimiento y cambio de contraseña (AUTH-03)

Esta guía explica, paso a paso desde la terminal, cómo levantar el proyecto y verificar manualmente cada punto del checklist de aceptación.

## 0. Prerrequisitos

- Python 3.12+
- Node.js 18+ y npm
- Una API key de [Resend](https://resend.com) (opcional para probar el envío real de emails; sin ella, el enlace se imprime en la consola del backend)

## 1. Levantar el backend

```bash
cd services/api

# Crear/activar entorno virtual e instalar dependencias
python -m venv .venv
source .venv/bin/activate
pip install -e .

# Configurar variables de entorno
cp .env.example .env
```

Editá `.env` y completá al menos:

```
JWT_SECRET=una-clave-secreta-larga
FRONTEND_URL=http://localhost:3000
RESEND_API_KEY=re_tu_api_key      # opcional: sin esto, el enlace se imprime en consola
RESEND_FROM_EMAIL=onboarding@resend.dev
PASSWORD_RESET_EXPIRE_MINUTES=1   # usar un valor bajo (1 min) para probar la expiración rápido
PASSWORD_RESET_RATE_LIMIT_PER_HOUR=3
```

Levantar el servidor:

```bash
uvicorn app.main:app --reload --port 8000
```

La API queda disponible en `http://localhost:8000` y la documentación interactiva en `http://localhost:8000/docs`.

## 2. Levantar el frontend

En otra terminal:

```bash
cd uis/talent-pipeline-tracker
npm install
npm run dev
```

La app queda disponible en `http://localhost:3000`. Registrá un usuario de prueba desde `/register` (o `POST /users`) antes de continuar.

---

## 3. Checklist de verificación

### 3.1 `POST /auth/forgot-password` envía un email real con el enlace cuando la dirección está registrada

```bash
curl -i -X POST http://localhost:8000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario_registrado@test.com"}'
```

- Si configuraste `RESEND_API_KEY`, revisá la bandeja de entrada de esa dirección: debe llegar un email con estilos HTML y un botón "Restablecer contraseña".
- Si no configuraste la API key, en la terminal del backend debe imprimirse: `[email] RESEND_API_KEY no configurada. Enlace de restablecimiento: http://localhost:3000/reset-password?token=...`. Copiá ese enlace para los pasos siguientes.

### 3.2 `POST /auth/forgot-password` devuelve `200` incluso cuando la dirección no está registrada

```bash
curl -i -X POST http://localhost:8000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "no_existe@test.com"}'
```

- Verificá que el `HTTP/1.1 200` y el cuerpo de la respuesta sean **idénticos** a los del paso 3.1 (mismo mensaje, sin pistas de si el email existe).

### 3.3 El token expira tras la ventana configurada y no puede usarse después

Con `PASSWORD_RESET_EXPIRE_MINUTES=1`:

1. Pedí un enlace (paso 3.1) y guardá el `token` del query string.
2. Esperá más de 1 minuto.
3. Intentá usarlo:

```bash
curl -i -X POST http://localhost:8000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token": "EL_TOKEN_COPIADO", "new_password": "nuevaPass123"}'
```

- Debe responder `400` con el detalle `Token inválido, expirado o ya utilizado`.

### 3.4 `POST /auth/reset-password` actualiza la contraseña e invalida el token en caso de éxito

1. Pedí un enlace nuevo (dentro de la ventana de expiración).
2. Usalo una vez:

```bash
curl -i -X POST http://localhost:8000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token": "TOKEN_VIGENTE", "new_password": "nuevaPass123"}'
```

- Debe responder `200` con `{"message": "Contraseña actualizada correctamente"}`.
- Verificá que ahora podés loguear con la nueva contraseña:

```bash
curl -i -X POST http://localhost:8000/auth/login \
  -d "username=usuario_registrado@test.com&password=nuevaPass123"
```

### 3.5 `POST /auth/reset-password` devuelve `400` para tokens expirados o ya utilizados

- Reutilizá el mismo token del paso 3.4:

```bash
curl -i -X POST http://localhost:8000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token": "TOKEN_YA_USADO", "new_password": "otraPass123"}'
```

- Debe responder `400` (el token ya fue marcado como usado, no se puede reutilizar).
- Repetí también con un token inventado (`"token": "invalido"`) y confirmá `400`.

### 3.6 `/forgot-password` muestra un mensaje de confirmación tras el envío, independientemente del resultado

1. En el navegador, andá a `http://localhost:3000/forgot-password`.
2. Enviá el formulario con un email registrado → debe verse el mensaje de confirmación y el formulario debe ocultarse/desactivarse (no se puede reenviar sin recargar).
3. Repetí con un email no registrado → debe verse **el mismo** mensaje de confirmación.

### 3.7 `/reset-password` lee el token de la URL, envía el formulario y redirige a `/login` en caso de éxito

1. Copiá el enlace recibido (o impreso en consola) y abrilo en el navegador: `http://localhost:3000/reset-password?token=...`.
2. Completá "Nueva contraseña" y "Confirmar contraseña" con el mismo valor y enviá.
3. Debe redirigir a `/login` mostrando un banner de éxito ("Tu contraseña se actualizó correctamente...").

### 3.8 `/reset-password` muestra un error claro con un enlace de vuelta a `/forgot-password` cuando el token es inválido o expirado

1. Abrí `http://localhost:3000/reset-password?token=invalido` (o un token ya usado/expirado).
2. Completá el formulario y enviá.
3. Debe mostrarse un mensaje de error claro y un enlace "Solicitar un nuevo enlace de restablecimiento" que lleva a `/forgot-password`.

### 3.9 La página `/login` tiene un enlace visible a "¿Olvidaste tu contraseña?"

1. Abrí `http://localhost:3000/login`.
2. Verificá que junto al campo "Contraseña" hay un enlace "¿Olvidaste tu contraseña?" que navega a `/forgot-password`.

### 3.10 `/account/change-password` valida que la nueva contraseña y la confirmación coincidan, llama a la API y muestra feedback de éxito o error

1. Iniciá sesión y andá a `http://localhost:3000/account/change-password`.
2. Probá enviar con "Nueva contraseña" y "Confirmar" distintas → debe mostrar el error de coincidencia **sin** llamar a la API (no debería verse actividad en la terminal del backend).
3. Completá ambos campos iguales y una contraseña actual correcta → debe mostrar el mensaje de éxito.
4. Repetí con la contraseña actual incorrecta → debe mostrar el mensaje de error devuelto por la API.

### 3.11 `POST /auth/change-password` rechaza contraseñas actuales incorrectas con `400`

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -d "username=usuario_registrado@test.com&password=nuevaPass123" | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -i -X POST http://localhost:8000/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"current_password": "incorrecta", "new_password": "otraPass123"}'
```

- Debe responder `400` con el detalle `La contraseña actual es incorrecta`.

### 3.12 Ninguna API key está en el código fuente — todos los secretos se cargan desde variables de entorno

```bash
grep -rn "RESEND_API_KEY\s*=\s*['\"]" services/api --include="*.py"
```

- No debe haber coincidencias con un valor hardcodeado (solo debe existir `RESEND_API_KEY = os.getenv("RESEND_API_KEY")` en `app/core/config.py`).
- Confirmá que `.env` está en `.gitignore` y que solo `.env.example` (con placeholders) está versionado:

```bash
git check-ignore -v services/api/.env
git status --porcelain services/api/.env.example
```

---

## 4. Extras opcionales (no evaluados)

- **Rate limiting**: llamá 4 veces seguidas a `POST /auth/forgot-password` con el mismo email (con `PASSWORD_RESET_RATE_LIMIT_PER_HOUR=3`). Las primeras 3 deben imprimir el enlace en consola (o enviar el email); la 4ta no, aunque la respuesta HTTP sea igual en los 4 casos.
- **Registro de auditoría**: cada solicitud de forgot-password, reset y cambio de contraseña queda registrada en la tabla `password_audit_log` de `services/api/data/db.json`, con `timestamp` e `ip`.
