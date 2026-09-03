from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from passlib.hash import bcrypt

from app.core.config import FRONTEND_URL, PASSWORD_RESET_RATE_LIMIT_PER_HOUR
from app.core.email import send_password_reset_email
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    get_current_user,
    verify_password_reset_token,
)
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.services.crud import (
    count_recent_password_reset_requests,
    get_profile_by_user_id,
    get_user_by_email,
    log_password_event,
    mark_password_reset_used,
    update_user,
)


def client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)


@router.post("/login")
def login(
    form: OAuth2PasswordRequestForm = Depends()
):
    # Swagger llama "username" al campo.
    # Nosotros usamos ese campo para enviar el email.

    user = get_user_by_email(form.username)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Email o contraseña incorrectos"
        )

    if not bcrypt.verify(
        form.password,
        user["hashed_password"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Email o contraseña incorrectos"
        )

    token = create_access_token(
        user["id"]
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.get("/me")
def get_me(
    current_user: dict = Depends(get_current_user)
):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "role": current_user["role"],
        "profile": get_profile_by_user_id(
            current_user["id"]
        )
    }


@router.post("/forgot-password", status_code=200)
def forgot_password(data: ForgotPasswordRequest, request: Request):
    now = datetime.now(timezone.utc)
    since = (now - timedelta(hours=1)).isoformat()

    recent_requests = count_recent_password_reset_requests(data.email, since)

    log_password_event({
        "event": "forgot_password_requested",
        "email": data.email,
        "ip": client_ip(request),
        "timestamp": now.isoformat(),
    })

    # Rate limiting: por encima del límite, no se genera token ni se envía email,
    # pero la respuesta al cliente es idéntica para no revelar nada.
    if recent_requests < PASSWORD_RESET_RATE_LIMIT_PER_HOUR:
        user = get_user_by_email(data.email)

        if user:
            token = create_password_reset_token(user["id"])
            reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
            send_password_reset_email(user["email"], reset_url)

    # Siempre la misma respuesta, exista o no el email, para evitar enumeración de usuarios.
    return {
        "message": "Si esa dirección está en nuestro sistema, recibirás un enlace de restablecimiento."
    }


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, request: Request):
    user_id, jti = verify_password_reset_token(data.token)

    update_user(
        user_id,
        {"hashed_password": bcrypt.hash(data.new_password)}
    )
    mark_password_reset_used(jti)

    log_password_event({
        "event": "password_reset",
        "user_id": user_id,
        "ip": client_ip(request),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "message": "Contraseña actualizada correctamente"
    }


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    if not bcrypt.verify(
        data.current_password,
        current_user["hashed_password"]
    ):
        raise HTTPException(
            status_code=400,
            detail="La contraseña actual es incorrecta"
        )

    update_user(
        current_user["id"],
        {"hashed_password": bcrypt.hash(data.new_password)}
    )

    log_password_event({
        "event": "password_changed",
        "user_id": current_user["id"],
        "ip": client_ip(request),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "message": "Contraseña actualizada correctamente"
    }