"""
Tests para el router de autenticación (/auth/*).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from jose import jwt
from passlib.hash import bcrypt

from app.core.config import JWT_SECRET, ALGORITHM
from app.core.database import reset_tokens_table, users_table
from app.services.crud import User
from app.core.security import hash_reset_token, create_reset_token


# ──────────────────────────────────────────────
# POST /auth/login
# ──────────────────────────────────────────────


class TestLogin:
    """POST /auth/login"""

    def test_happy_path_login(self, client: TestClient, user: dict):
        """Camino feliz: credenciales correctas → token."""
        response = client.post("/auth/login", data={
            "username": user["email"],
            "password": "password123",
        })
        assert response.status_code == 200
        body = response.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

        # Verificar que el token es un JWT válido que contiene el user id
        payload = jwt.decode(body["access_token"], JWT_SECRET, algorithms=[ALGORITHM])
        assert payload["sub"] == user["id"]

    def test_login_empty_password(self, client: TestClient, user: dict):
        """Caso límite: password vacío → 422 (validación OAuth2)."""
        response = client.post("/auth/login", data={
            "username": user["email"],
            "password": "",
        })
        # OAuth2PasswordRequestForm rechaza password vacío con 422
        assert response.status_code == 422

    def test_login_empty_email(self, client: TestClient, user: dict):
        """Caso límite: email vacío → 422 (validación OAuth2)."""
        response = client.post("/auth/login", data={
            "username": "",
            "password": "password123",
        })
        assert response.status_code == 422

    def test_login_wrong_password(self, client: TestClient, user: dict):
        """Modo fallo: contraseña incorrecta → 401."""
        response = client.post("/auth/login", data={
            "username": user["email"],
            "password": "wrongpassword",
        })
        assert response.status_code == 401
        assert "incorrectos" in response.json()["detail"]

    def test_login_user_not_found(self, client: TestClient):
        """Modo fallo: usuario inexistente → 401."""
        response = client.post("/auth/login", data={
            "username": "noexiste@test.com",
            "password": "password123",
        })
        assert response.status_code == 401
        assert "incorrectos" in response.json()["detail"]


# ──────────────────────────────────────────────
# GET /auth/me
# ──────────────────────────────────────────────


class TestMe:
    """GET /auth/me"""

    def test_happy_path_me(self, client: TestClient, user_token: str, user: dict):
        """Camino feliz: token válido → datos del usuario."""
        response = client.get("/auth/me", headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200
        body = response.json()
        assert body["id"] == user["id"]
        assert body["email"] == user["email"]
        assert body["role"] == user["role"]
        assert "profile" in body

    def test_me_no_token(self, client: TestClient):
        """Modo fallo: sin token → 401."""
        response = client.get("/auth/me")
        assert response.status_code == 401

    def test_me_malformed_token(self, client: TestClient):
        """Modo fallo: token malformado → 401."""
        response = client.get("/auth/me", headers={
            "Authorization": "Bearer este-no-es-un-token-valido"
        })
        assert response.status_code == 401
        assert "inválido" in response.json()["detail"].lower() or "expirado" in response.json()["detail"].lower()

    def test_me_expired_token(self, client: TestClient, user: dict):
        """Modo fallo: token expirado → 401."""
        expired_payload = {
            "sub": user["id"],
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        }
        expired_token = jwt.encode(expired_payload, JWT_SECRET, algorithm=ALGORITHM)

        response = client.get("/auth/me", headers={
            "Authorization": f"Bearer {expired_token}"
        })
        assert response.status_code == 401
        assert "inválido" in response.json()["detail"].lower() or "expirado" in response.json()["detail"].lower()

    def test_me_valid_token_user_not_found(self, client: TestClient):
        """Modo fallo: token válido pero usuario no existe en BD → 401."""
        fake_user_id = "id-que-no-existe-en-la-base-de-datos"
        payload = {
            "sub": fake_user_id,
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

        response = client.get("/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 401
        assert "no válido" in response.json()["detail"].lower()


# ──────────────────────────────────────────────
# POST /auth/forgot-password
# ──────────────────────────────────────────────


class TestForgotPassword:
    """POST /auth/forgot-password"""

    def test_happy_path_forgot_password(self, client: TestClient, user: dict):
        """Camino feliz: email registrado → mensaje genérico."""
        response = client.post("/auth/forgot-password", json={
            "email": user["email"],
        })
        assert response.status_code == 200
        body = response.json()
        assert "message" in body
        assert "Si esa dirección está registrada" in body["message"]

    def test_forgot_password_unregistered_email(self, client: TestClient):
        """Caso límite: email no registrado → mismo mensaje genérico (no revelar existencia)."""
        response = client.post("/auth/forgot-password", json={
            "email": "noexiste@test.com",
        })
        assert response.status_code == 200
        body = response.json()
        assert "Si esa dirección está registrada" in body["message"]

    def test_forgot_password_empty_email(self, client: TestClient):
        """Caso límite: email vacío → 200 (no se valida formato en este endpoint)."""
        response = client.post("/auth/forgot-password", json={
            "email": "",
        })
        # El schema solo valida que sea str, no formato; devuelve msg genérico
        assert response.status_code == 200


# ──────────────────────────────────────────────
# POST /auth/reset-password
# ──────────────────────────────────────────────


class TestResetPassword:
    """POST /auth/reset-password"""

    def test_happy_path_reset_password(self, client: TestClient, user: dict):
        """Camino feliz: token válido + nueva password → contraseña actualizada."""
        # Crear un reset token real
        raw_token = create_reset_token()
        token_hash = hash_reset_token(raw_token)
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()

        reset_tokens_table.insert({
            "user_id": user["id"],
            "token_hash": token_hash,
            "expires_at": expires_at,
            "used": False,
        })

        # Usar el token para resetear la contraseña
        response = client.post("/auth/reset-password", json={
            "token": raw_token,
            "new_password": "nuevaPassword123",
        })
        assert response.status_code == 200
        assert response.json()["message"] == "Contraseña actualizada correctamente."

        # Verificar que la contraseña se actualizó
        updated_user = users_table.get(User.id == user["id"])
        assert bcrypt.verify("nuevaPassword123", updated_user["hashed_password"])

    def test_reset_password_expired_token(self, client: TestClient, user: dict):
        """Caso límite: token expirado → 400."""
        raw_token = create_reset_token()
        token_hash = hash_reset_token(raw_token)
        expires_at = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()

        reset_tokens_table.insert({
            "user_id": user["id"],
            "token_hash": token_hash,
            "expires_at": expires_at,
            "used": False,
        })

        response = client.post("/auth/reset-password", json={
            "token": raw_token,
            "new_password": "nuevaPassword123",
        })
        assert response.status_code == 400
        assert "expi" in response.json()["detail"].lower()

    def test_reset_password_token_already_used(self, client: TestClient, user: dict):
        """Caso límite: token ya utilizado → 400."""
        raw_token = create_reset_token()
        token_hash = hash_reset_token(raw_token)
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()

        reset_tokens_table.insert({
            "user_id": user["id"],
            "token_hash": token_hash,
            "expires_at": expires_at,
            "used": True,
        })

        response = client.post("/auth/reset-password", json={
            "token": raw_token,
            "new_password": "nuevaPassword123",
        })
        assert response.status_code == 400
        assert "ya fue utilizado" in response.json()["detail"].lower()

    def test_reset_password_short_new_password(self, client: TestClient, user: dict):
        """Caso límite: new_password < 8 caracteres → 422."""
        raw_token = create_reset_token()

        response = client.post("/auth/reset-password", json={
            "token": raw_token,
            "new_password": "abc",
        })
        assert response.status_code == 422

    def test_reset_password_invalid_token(self, client: TestClient):
        """Modo fallo: token inválido (no existe) → 400."""
        response = client.post("/auth/reset-password", json={
            "token": "token-que-no-existe-en-la-bd",
            "new_password": "nuevaPassword123",
        })
        assert response.status_code == 400
        assert "inválido" in response.json()["detail"].lower()

    def test_reset_password_empty_token(self, client: TestClient):
        """Modo fallo: token vacío → 400."""
        response = client.post("/auth/reset-password", json={
            "token": "",
            "new_password": "nuevaPassword123",
        })
        # Con token vacío, el hash será de string vacío y no existirá en BD
        assert response.status_code == 400

    def test_reset_password_user_not_found(self, client: TestClient):
        """Modo fallo: token válido pero el usuario referenciado no existe → 400."""
        raw_token = create_reset_token()
        token_hash = hash_reset_token(raw_token)
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()

        reset_tokens_table.insert({
            "user_id": "id-de-usuario-que-no-existe",
            "token_hash": token_hash,
            "expires_at": expires_at,
            "used": False,
        })

        response = client.post("/auth/reset-password", json={
            "token": raw_token,
            "new_password": "nuevaPassword123",
        })
        assert response.status_code == 400
        assert "inválido" in response.json()["detail"].lower()


# ──────────────────────────────────────────────
# POST /auth/change-password
# ──────────────────────────────────────────────


class TestChangePassword:
    """POST /auth/change-password"""

    def test_happy_path_change_password(self, client: TestClient, user: dict, user_token: str):
        """Camino feliz: contraseña actual correcta → contraseña actualizada."""
        response = client.post("/auth/change-password", json={
            "current_password": "password123",
            "new_password": "nuevaPassword123",
        }, headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200
        assert response.json()["message"] == "Contraseña actualizada correctamente."

        # Verificar que la contraseña se actualizó
        updated_user = users_table.get(User.id == user["id"])
        assert bcrypt.verify("nuevaPassword123", updated_user["hashed_password"])

    def test_change_password_wrong_current(self, client: TestClient, user: dict, user_token: str):
        """Caso límite: contraseña actual incorrecta → 400."""
        response = client.post("/auth/change-password", json={
            "current_password": "contraseña-incorrecta",
            "new_password": "nuevaPassword123",
        }, headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 400
        assert "incorrecta" in response.json()["detail"].lower()

    def test_change_password_short_new_password(self, client: TestClient, user_token: str):
        """Caso límite: new_password < 8 caracteres → 422."""
        response = client.post("/auth/change-password", json={
            "current_password": "password123",
            "new_password": "abc",
        }, headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 422

    def test_change_password_no_auth(self, client: TestClient):
        """Modo fallo: sin autenticación → 401."""
        response = client.post("/auth/change-password", json={
            "current_password": "password123",
            "new_password": "nuevaPassword123",
        })
        assert response.status_code == 401