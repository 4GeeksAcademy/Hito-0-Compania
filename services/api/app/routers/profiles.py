from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.schemas.users import ProfileUpdate
from app.services.crud import (
    get_profile_by_user_id,
    update_profile,
)


router = APIRouter(
    prefix="/profiles",
    tags=["profiles"]
)


@router.get("/me")
def get_my_profile(
    current_user: dict = Depends(get_current_user)
):
    profile = get_profile_by_user_id(
        current_user["id"]
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Perfil no encontrado"
        )

    return profile


@router.put("/me")
def edit_my_profile(
    data: ProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    changes = data.model_dump(
        exclude_none=True
    )

    return update_profile(
        current_user["id"],
        changes
    )