"""
Tests para el router de perfiles (/profiles/*).
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.database import profiles_table
from app.services.crud import Profile


# ──────────────────────────────────────────────
# GET /profiles/me
# ──────────────────────────────────────────────


class TestGetMyProfile:
    """GET /profiles/me"""

    def test_happy_path_get_profile(self, client: TestClient, user_token: str):
        """Camino feliz: token válido → perfil del usuario."""
        response = client.get("/profiles/me", headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200
        body = response.json()
        assert "user_id" in body
        assert "name" in body

    def test_get_profile_no_auth(self, client: TestClient):
        """Modo fallo: sin autenticación → 401."""
        response = client.get("/profiles/me")
        assert response.status_code == 401

    def test_get_profile_not_found(self, client: TestClient, user_token: str, user: dict):
        """Modo fallo: perfil no encontrado → 404."""
        # Eliminar el perfil del usuario
        profiles_table.remove(Profile.user_id == user["id"])
        response = client.get("/profiles/me", headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 404
        assert "perfil no encontrado" in response.json()["detail"].lower()


# ──────────────────────────────────────────────
# PUT /profiles/me
# ──────────────────────────────────────────────


class TestUpdateMyProfile:
    """PUT /profiles/me"""

    def test_happy_path_update_profile(self, client: TestClient, user_token: str):
        """Camino feliz: actualizar nombre y teléfono → 200."""
        response = client.put("/profiles/me", json={
            "name": "Nombre Actualizado",
            "phone": "555-9999",
        }, headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "Nombre Actualizado"
        assert body["phone"] == "555-9999"

    def test_update_profile_empty_body(self, client: TestClient, user_token: str):
        """Caso límite: body vacío → 200 (sin cambios, exclude_none)."""
        response = client.put("/profiles/me", json={}, headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200

    def test_update_profile_no_auth(self, client: TestClient):
        """Modo fallo: sin autenticación → 401."""
        response = client.put("/profiles/me", json={
            "name": "Hacker",
        })
        assert response.status_code == 401