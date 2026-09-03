# Company API

## Variables de entorno

Copiá `.env.example` a `.env` y completá los valores:

| Variable | Descripción |
| --- | --- |
| `JWT_SECRET` | Clave para firmar los JWT de sesión. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Minutos de vigencia del token de acceso. |
| `PASSWORD_RESET_EXPIRE_MINUTES` | Minutos de vigencia del token de restablecimiento de contraseña. |
| `FRONTEND_URL` | URL base del frontend, usada para armar el enlace enviado por email (`/reset-password?token=...`). |
| `RESEND_API_KEY` | API key de [Resend](https://resend.com) para enviar el email de restablecimiento de contraseña. |
| `RESEND_FROM_EMAIL` | Remitente del email (usar `onboarding@resend.dev` en desarrollo si no tenés dominio propio verificado). |
| `PASSWORD_RESET_RATE_LIMIT_PER_HOUR` | Máximo de solicitudes de `/auth/forgot-password` por email por hora. |
