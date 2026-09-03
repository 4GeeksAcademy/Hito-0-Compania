from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    JWT_SECRET,
    PASSWORD_RESET_EXPIRE_MINUTES,
)
from app.services.crud import (
    create_password_reset,
    get_password_reset,
    get_user_by_id,
)

PASSWORD_RESET_PURPOSE = "password_reset"


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)


def create_access_token(user_id: str):
    expiration = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": user_id,
        "exp": expiration
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=ALGORITHM
    )


def get_current_user(
    token: str = Depends(oauth2_scheme)
):
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")

        user = get_user_by_id(user_id)

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Usuario no válido"
            )

        return user

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Token inválido o expirado"
        )


def create_password_reset_token(user_id: str) -> str:
    jti = str(uuid4())
    expiration = datetime.now(timezone.utc) + timedelta(
        minutes=PASSWORD_RESET_EXPIRE_MINUTES
    )

    # Se persiste el jti server-side para poder invalidarlo tras su uso
    # (la expiración del JWT sola no permite revocar un token ya usado).
    create_password_reset({
        "jti": jti,
        "user_id": user_id,
        "expires_at": expiration.isoformat(),
        "used": False,
    })

    payload = {
        "sub": user_id,
        "jti": jti,
        "purpose": PASSWORD_RESET_PURPOSE,
        "exp": expiration,
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=ALGORITHM
    )


def verify_password_reset_token(token: str) -> tuple[str, str]:
    invalid_token = HTTPException(
        status_code=400,
        detail="Token inválido, expirado o ya utilizado"
    )

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITHM]
        )
    except JWTError:
        raise invalid_token

    if payload.get("purpose") != PASSWORD_RESET_PURPOSE:
        raise invalid_token

    jti = payload.get("jti")
    record = get_password_reset(jti)

    if not record or record["used"]:
        raise invalid_token

    user_id = payload.get("sub")

    if not get_user_by_id(user_id):
        raise invalid_token

    return user_id, jti