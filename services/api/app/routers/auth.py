from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from passlib.hash import bcrypt

from app.core.security import (
    create_access_token,
    get_current_user,
)
from app.services.crud import (
    get_profile_by_user_id,
    get_user_by_email,
)


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