import os
from dotenv import load_dotenv


load_dotenv()


JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)
PASSWORD_RESET_EXPIRE_MINUTES = int(
    os.getenv("PASSWORD_RESET_EXPIRE_MINUTES", "30")
)

# Máximo de solicitudes de /auth/forgot-password por email por hora.
PASSWORD_RESET_RATE_LIMIT_PER_HOUR = int(
    os.getenv("PASSWORD_RESET_RATE_LIMIT_PER_HOUR", "3")
)

# URL del frontend, usada para armar el enlace de restablecimiento.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Servicio de correo transaccional (Resend).
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")