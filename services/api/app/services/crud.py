from tinydb import Query

from app.core.database import profiles_table, reset_tokens_table, users_table


User = Query()
Profile = Query()
ResetToken = Query()


def get_user_by_id(user_id: str):
    try:
        return users_table.get(
            User.id == user_id
        )
    except Exception as exc:
        raise RuntimeError("No se pudo leer el usuario solicitado.") from exc


def get_user_by_email(email: str):
    try:
        return users_table.get(
            User.email == email
        )
    except Exception as exc:
        raise RuntimeError("No se pudo buscar el usuario por email.") from exc


def get_all_users():
    try:
        return users_table.all()
    except Exception as exc:
        raise RuntimeError("No se pudo leer la lista de usuarios.") from exc


def create_user(user: dict, profile: dict):
    try:
        users_table.insert(user)
    except Exception as exc:
        raise RuntimeError("No se pudo crear el usuario.") from exc

    try:
        profiles_table.insert(profile)
    except Exception as exc:
        # Intentamos limpiar el usuario que ya se insertó para evitar
        # estados inconsistentes (usuario sin perfil).
        try:
            users_table.remove(User.id == user["id"])
        except Exception:
            pass
        raise RuntimeError("No se pudo crear el perfil del usuario.") from exc

    return user


def update_user(user_id: str, changes: dict):
    try:
        users_table.update(
            changes,
            User.id == user_id
        )
    except Exception as exc:
        raise RuntimeError("No se pudo actualizar el usuario.") from exc

    try:
        return get_user_by_id(user_id)
    except Exception as exc:
        raise RuntimeError("No se pudo leer el usuario actualizado.") from exc


def delete_user(user_id: str):
    try:
        users_table.remove(
            User.id == user_id
        )
    except Exception as exc:
        raise RuntimeError("No se pudo eliminar el usuario.") from exc

    try:
        profiles_table.remove(
            Profile.user_id == user_id
        )
    except Exception as exc:
        raise RuntimeError("No se pudieron eliminar los datos del perfil.") from exc


def get_profile_by_user_id(user_id: str):
    try:
        return profiles_table.get(
            Profile.user_id == user_id
        )
    except Exception as exc:
        raise RuntimeError("No se pudo leer el perfil solicitado.") from exc


def update_profile(user_id: str, changes: dict):
    try:
        profiles_table.update(
            changes,
            Profile.user_id == user_id
        )
    except Exception as exc:
        raise RuntimeError("No se pudo actualizar el perfil.") from exc

    try:
        return get_profile_by_user_id(user_id)
    except Exception as exc:
        raise RuntimeError("No se pudo leer el perfil actualizado.") from exc


def invalidate_active_reset_tokens(user_id: str):
    try:
        reset_tokens_table.update(
            {"used": True},
            (ResetToken.user_id == user_id) & (ResetToken.used == False)
        )
    except Exception as exc:
        raise RuntimeError("No se pudieron invalidar los tokens de reseteo.") from exc


def create_reset_token_record(user_id: str, token_hash: str, expires_at: str):
    try:
        reset_tokens_table.insert(
            {
                "user_id": user_id,
                "token_hash": token_hash,
                "expires_at": expires_at,
                "used": False,
            }
        )
    except Exception as exc:
        raise RuntimeError("No se pudo guardar el token de reseteo.") from exc


def get_reset_token_by_hash(token_hash: str):
    try:
        return reset_tokens_table.get(
            ResetToken.token_hash == token_hash
        )
    except Exception as exc:
        raise RuntimeError("No se pudo leer el token de reseteo.") from exc


def mark_reset_token_used(token_doc_id: int):
    try:
        reset_tokens_table.update(
            {"used": True},
            doc_ids=[token_doc_id],
        )
    except Exception as exc:
        raise RuntimeError("No se pudo actualizar el token de reseteo.") from exc