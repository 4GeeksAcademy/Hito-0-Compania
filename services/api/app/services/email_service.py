from urllib.parse import quote

import resend

from app.core.config import EMAIL_FROM, FRONTEND_URL, RESEND_API_KEY


def send_password_reset_email(to_email: str, token: str) -> None:
    if not RESEND_API_KEY:
        raise RuntimeError("Falta RESEND_API_KEY en las variables de entorno.")

    resend.api_key = RESEND_API_KEY

    encoded_token = quote(token, safe="")
    reset_url = f"{FRONTEND_URL}/reset-password?token={encoded_token}"

    resend.Emails.send(
        {
            "from": EMAIL_FROM,
            "to": [to_email],
            "subject": "Restablecer contraseña",
            "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="font-size: 20px;">Restablecer contraseña</h2>
                    <p>Recibimos una solicitud para cambiar tu contraseña.</p>
                    <p>El enlace vence en 30 minutos.</p>
                    <p style="text-align: center; margin: 24px 0;">
                        <a href="{reset_url}"
                           style="background-color:#2563eb;color:#ffffff;padding:12px 20px;
                                  border-radius:6px;text-decoration:none;display:inline-block;">
                            Restablecer contraseña
                        </a>
                    </p>
                    <p>Si no solicitaste el cambio, ignora este email.</p>
                </div>
            """,
        }
    )
