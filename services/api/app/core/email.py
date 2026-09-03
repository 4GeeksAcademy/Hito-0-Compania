import json
import urllib.error
import urllib.request

from app.core.config import RESEND_API_KEY, RESEND_FROM_EMAIL

RESEND_API_URL = "https://api.resend.com/emails"


def _build_reset_email_html(reset_url: str) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #1e3a8a;">Restablecé tu contraseña</h2>
      <p>Recibimos una solicitud para restablecer tu contraseña. Si fuiste vos, tocá el botón:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="{reset_url}"
           style="display:inline-block;padding:12px 24px;background:#1e3a8a;color:#ffffff;
                  border-radius:8px;text-decoration:none;font-weight:bold;">
          Restablecer contraseña
        </a>
      </p>
      <p style="font-size: 13px; color: #6b7280;">
        Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br />
        <a href="{reset_url}">{reset_url}</a>
      </p>
      <p style="font-size: 13px; color: #6b7280;">
        Este enlace vence pronto. Si no solicitaste este cambio, podés ignorar este email.
      </p>
    </div>
    """


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """Envía el email de restablecimiento vía Resend. No propaga errores: el envío
    no debe filtrar información sobre el resultado ni romper la respuesta del endpoint."""
    if not RESEND_API_KEY:
        print(f"[email] RESEND_API_KEY no configurada. Enlace de restablecimiento: {reset_url}")
        return

    payload = {
        "from": RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": "Restablecé tu contraseña",
        "html": _build_reset_email_html(reset_url),
    }

    request = urllib.request.Request(
        RESEND_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        urllib.request.urlopen(request, timeout=10)
    except urllib.error.URLError as error:
        print(f"[email] Error al enviar el email de restablecimiento: {error}")
