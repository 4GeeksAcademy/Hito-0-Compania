import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.engine import make_url


load_dotenv()
load_dotenv(Path(__file__).resolve().parents[2] / ".env.local")


JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
)

RESET_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "30")
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "Mi App <onboarding@resend.dev>")

# === Supabase (PostgreSQL) ===
DATABASE_URL: str = os.getenv("DATABASE_URL", "")
if os.getenv("DATABASE_POOLER_HOST") and DATABASE_URL:
    DATABASE_URL = make_url(DATABASE_URL).set(
        username=os.getenv("DATABASE_POOLER_USER"),
        host=os.environ["DATABASE_POOLER_HOST"],
    ).render_as_string(hide_password=False)