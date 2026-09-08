from datetime import datetime, timedelta, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from passlib.hash import bcrypt

from app.core.config import RESET_TOKEN_EXPIRE_MINUTES
from app.core.security import (
    create_access_token,
    create_reset_token,
    get_current_user,
    hash_reset_token,
)
from app.schemas.users import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
)
from app.services.crud import (
    create_reset_token_record,
    get_profile_by_user_id,
    get_reset_token_by_hash,
    get_user_by_email,
    get_user_by_id,
    invalidate_active_reset_tokens,
    mark_reset_token_used,
    update_user,
)
from app.services.email_service import send_password_reset_email


logger = logging.getLogger(__name__)

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


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest):
    generic_message = (
        "Si esa dirección está registrada, recibirás un enlace en breve."
    )

    user = get_user_by_email(payload.email)

    if not user:
        # Nunca revelamos si el email existe: evita enumeración de usuarios.
        return {"message": generic_message}

    invalidate_active_reset_tokens(user["id"])

    raw_token = create_reset_token()
    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    ).isoformat()

    create_reset_token_record(
        user_id=user["id"],
        token_hash=hash_reset_token(raw_token),
        expires_at=expires_at,
    )

    try:
        send_password_reset_email(to_email=user["email"], token=raw_token)
    except Exception as error:
        # Nunca se filtra el detalle técnico al cliente. Solo se registra
        # de forma interna para diagnóstico (sin credenciales ni emails).
        logger.warning("No se pudo enviar el email de reseteo: %s", error)

    return {"message": generic_message}


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest):
    token_hash = hash_reset_token(payload.token)
    reset_token = get_reset_token_by_hash(token_hash)

    if not reset_token:
        raise HTTPException(status_code=400, detail="Token inválido.")

    if reset_token.get("used") is True:
        raise HTTPException(
            status_code=400,
            detail="El token ya fue utilizado."
        )

    expires_at = datetime.fromisoformat(reset_token["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El token expiró.")

    user = get_user_by_id(reset_token["user_id"])

    if not user:
        raise HTTPException(status_code=400, detail="Token inválido.")

    update_user(
        user["id"],
        {"hashed_password": bcrypt.hash(payload.new_password)},
    )

    mark_reset_token_used(reset_token.doc_id)
    invalidate_active_reset_tokens(user["id"])

    return {"message": "Contraseña actualizada correctamente."}


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    if not bcrypt.verify(
        payload.current_password,
        current_user["hashed_password"],
    ):
        raise HTTPException(
            status_code=400,
            detail="La contraseña actual es incorrecta."
        )

    update_user(
        current_user["id"],
        {"hashed_password": bcrypt.hash(payload.new_password)},
    )

    # Un reset pendiente no debe seguir siendo válido tras cambiar la contraseña.
    invalidate_active_reset_tokens(current_user["id"])

    return {"message": "Contraseña actualizada correctamente."}