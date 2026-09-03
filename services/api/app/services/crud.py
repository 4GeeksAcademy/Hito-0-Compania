from tinydb import Query

from app.core.database import (
    password_audit_table,
    password_resets_table,
    profiles_table,
    users_table,
)


User = Query()
Profile = Query()
PasswordReset = Query()
PasswordAudit = Query()


def get_user_by_id(user_id: str):
    return users_table.get(
        User.id == user_id
    )


def get_user_by_email(email: str):
    return users_table.get(
        User.email == email
    )


def get_all_users():
    return users_table.all()


def create_user(user: dict, profile: dict):
    users_table.insert(user)
    profiles_table.insert(profile)

    return user


def update_user(user_id: str, changes: dict):
    users_table.update(
        changes,
        User.id == user_id
    )

    return get_user_by_id(user_id)


def delete_user(user_id: str):
    users_table.remove(
        User.id == user_id
    )

    profiles_table.remove(
        Profile.user_id == user_id
    )


def get_profile_by_user_id(user_id: str):
    return profiles_table.get(
        Profile.user_id == user_id
    )


def update_profile(user_id: str, changes: dict):
    profiles_table.update(
        changes,
        Profile.user_id == user_id
    )

    return get_profile_by_user_id(user_id)


def create_password_reset(record: dict):
    password_resets_table.insert(record)
    return record


def get_password_reset(jti: str):
    return password_resets_table.get(
        PasswordReset.jti == jti
    )


def mark_password_reset_used(jti: str):
    password_resets_table.update(
        {"used": True},
        PasswordReset.jti == jti
    )


def log_password_event(event: dict):
    password_audit_table.insert(event)
    return event


def count_recent_password_reset_requests(email: str, since: str) -> int:
    return len(password_audit_table.search(
        (PasswordAudit.event == "forgot_password_requested")
        & (PasswordAudit.email == email)
        & (PasswordAudit.timestamp >= since)
    ))