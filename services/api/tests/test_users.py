"""
Tests para el router de usuarios (/users/*).
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.database import users_table
from app.services.crud import User


# ──────────────────────────────────────────────
# POST /users (Registro)
# ──────────────────────────────────────────────


class TestRegister:
    """POST /users"""

    def test_happy_path_register_all_fields(self, client: TestClient):
        """Camino feliz: registro con todos los campos → 201."""
        response = client.post("/users", json={
            "email": "newuser@test.com",
            "password": "password123",
            "name": "New User",
            "phone": "555-1234",
            "address": "Calle Nueva 456",
        })
        assert response.status_code == 201
        body = response.json()
        assert "user" in body
        assert "profile" in body
        assert body["user"]["email"] == "newuser@test.com"
        assert body["profile"]["name"] == "New User"

    def test_happy_path_register_required_only(self, client: TestClient):
        """Camino feliz: registro solo con campos obligatorios → 201."""
        response = client.post("/users", json={
            "email": "minimal@test.com",
            "password": "password123",
        })
        assert response.status_code == 201
        body = response.json()
        assert body["user"]["email"] == "minimal@test.com"

    def test_register_duplicate_email(self, client: TestClient, user: dict):
        """Caso límite: email duplicado → 400."""
        response = client.post("/users", json={
            "email": user["email"],
            "password": "password123",
        })
        assert response.status_code == 400
        assert "ya está registrado" in response.json()["detail"].lower()

    def test_register_short_password(self, client: TestClient):
        """Modo fallo: password < 8 caracteres → 422."""
        response = client.post("/users", json={
            "email": "shortpass@test.com",
            "password": "abc",
        })
        assert response.status_code == 422


# ──────────────────────────────────────────────
# GET /users (Listar)
# ──────────────────────────────────────────────


class TestListUsers:
    """GET /users"""

    def test_happy_path_list_users(self, client: TestClient, user_token: str):
        """Camino feliz: usuario autenticado lista usuarios → 200."""
        response = client.get("/users", headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200
        body = response.json()
        assert isinstance(body, list)
        assert len(body) >= 1

    def test_list_users_no_auth(self, client: TestClient):
        """Modo fallo: sin autenticación → 401."""
        response = client.get("/users")
        assert response.status_code == 401


# ──────────────────────────────────────────────
# GET /users/{user_id}
# ──────────────────────────────────────────────


class TestGetUser:
    """GET /users/{user_id}"""

    def test_happy_path_get_own_user(self, client: TestClient, user: dict, user_token: str):
        """Camino feliz: usuario obtiene sus propios datos → 200."""
        response = client.get(f"/users/{user['id']}", headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200
        body = response.json()
        assert body["id"] == user["id"]
        assert body["email"] == user["email"]

    def test_happy_path_admin_get_other_user(self, client: TestClient, second_user: dict, admin_token: str):
        """Camino feliz: admin obtiene datos de otro usuario → 200."""
        response = client.get(f"/users/{second_user['id']}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        body = response.json()
        assert body["id"] == second_user["id"]

    def test_get_user_forbidden_other_user(self, client: TestClient, second_user: dict, user_token: str):
        """Caso límite: usuario no admin obtiene otro usuario → 403."""
        response = client.get(f"/users/{second_user['id']}", headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 403
        assert "permiso" in response.json()["detail"].lower()

    def test_get_user_not_found(self, client: TestClient, admin_token: str):
        """Modo fallo: usuario no encontrado → 404."""
        response = client.get("/users/id-inexistente", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 404
        assert "no encontrado" in response.json()["detail"].lower()

    def test_get_user_no_auth(self, client: TestClient, user: dict):
        """Modo fallo: sin autenticación → 401."""
        response = client.get(f"/users/{user['id']}")
        assert response.status_code == 401


# ──────────────────────────────────────────────
# PUT /users/{user_id}
# ──────────────────────────────────────────────


class TestUpdateUser:
    """PUT /users/{user_id}"""

    def test_happy_path_update_own_email(self, client: TestClient, user: dict, user_token: str):
        """Camino feliz: usuario actualiza su propio email → 200."""
        response = client.put(f"/users/{user['id']}", json={
            "email": "nuevoemail@test.com",
        }, headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200
        assert response.json()["email"] == "nuevoemail@test.com"

    def test_happy_path_update_own_password(self, client: TestClient, user: dict, user_token: str):
        """Camino feliz: usuario actualiza su propia contraseña → 200."""
        response = client.put(f"/users/{user['id']}", json={
            "password": "nuevaPasswordSegura123",
        }, headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200

    def test_happy_path_admin_change_role(self, client: TestClient, second_user: dict, admin_token: str):
        """Camino feliz: admin cambia rol de otro usuario → 200."""
        response = client.put(f"/users/{second_user['id']}", json={
            "role": "manager",
        }, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert response.json()["role"] == "manager"

    def test_update_user_duplicate_email(self, client: TestClient, user: dict, second_user: dict, user_token: str):
        """Caso límite: email duplicado en edición → 400."""
        response = client.put(f"/users/{user['id']}", json={
            "email": second_user["email"],
        }, headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 400
        assert "ya está registrado" in response.json()["detail"].lower()

    def test_update_user_non_admin_cannot_change_role(self, client: TestClient, user: dict, user_token: str):
        """Caso límite: usuario no admin intenta cambiar rol → 403."""
        response = client.put(f"/users/{user['id']}", json={
            "role": "admin",
        }, headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 403
        assert "admin puede cambiar roles" in response.json()["detail"].lower()

    def test_update_user_not_found(self, client: TestClient, admin_token: str):
        """Caso límite: usuario no encontrado → 404."""
        response = client.put("/users/id-inexistente", json={
            "email": "nadie@test.com",
        }, headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 404

    def test_update_user_no_auth(self, client: TestClient, second_user: dict):
        """Modo fallo: sin autenticación → 401."""
        response = client.put(f"/users/{second_user['id']}", json={
            "email": "nuevo@test.com",
        })
        assert response.status_code == 401


# ──────────────────────────────────────────────
# DELETE /users/{user_id}
# ──────────────────────────────────────────────


class TestDeleteUser:
    """DELETE /users/{user_id}"""

    def test_happy_path_delete_own_user(self, client: TestClient, user: dict, user_token: str):
        """Camino feliz: usuario se elimina a sí mismo → 200."""
        response = client.delete(f"/users/{user['id']}", headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 200
        assert "eliminado" in response.json()["message"].lower()
        # Verificar que el usuario ya no existe
        assert users_table.get(User.id == user["id"]) is None

    def test_happy_path_admin_delete_other_user(self, client: TestClient, second_user: dict, admin_token: str):
        """Camino feliz: admin elimina otro usuario → 200."""
        response = client.delete(f"/users/{second_user['id']}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        assert "eliminado" in response.json()["message"].lower()
        assert users_table.get(User.id == second_user["id"]) is None

    def test_delete_user_forbidden_other_user(self, client: TestClient, second_user: dict, user_token: str):
        """Caso límite: usuario no admin elimina otro usuario → 403."""
        response = client.delete(f"/users/{second_user['id']}", headers={
            "Authorization": f"Bearer {user_token}"
        })
        assert response.status_code == 403

    def test_delete_user_not_found(self, client: TestClient, admin_token: str):
        """Modo fallo: usuario no encontrado → 404."""
        response = client.delete("/users/id-inexistente", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 404

    def test_delete_user_no_auth(self, client: TestClient, second_user: dict):
        """Modo fallo: sin autenticación → 401."""
        response = client.delete(f"/users/{second_user['id']}")
        assert response.status_code == 401