"""
Tests para el router /suppliers/* (proveedores).

Cubre los endpoints:
  - POST /suppliers
  - GET /suppliers
  - GET /suppliers/{supplier_id}
  - PATCH /suppliers/{supplier_id}/rate
  - PATCH /suppliers/{supplier_id}/status
  - DELETE /suppliers/{supplier_id}

Estructura: camino feliz, caso límite, modo de fallo para cada uno.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# ── Seed data para suppliers ──

_SUPPLIER_SEED = {
    "name": "Test Carrier",
    "country": "USA",
    "categories": ["carrier_last_mile"],
    "rate_per_shipment": 5.5,
    "currency": "USD",
    "status": "active",
    "service_zone": "West Coast",
    "contact_email": "test@carrier.com",
    "notes": "Proveedor de prueba",
}

_SUPPLIER_SEED_SPAIN = {
    "name": "Transportes España",
    "country": "Spain",
    "categories": ["carrier_last_mile"],
    "rate_per_shipment": 8.0,
    "currency": "EUR",
    "status": "active",
}


@pytest.fixture(autouse=True)
def _clean_suppliers_db() -> None:
    """Limpia la BD de suppliers antes y después de cada test."""
    db_path = Path(__file__).resolve().parent.parent / "suppliers_db.json"
    if db_path.exists():
        with open(db_path) as f:
            content = f.read()
        # Reseteamos solo la tabla suppliers, dejando la estructura
        data = json.loads(content) if content.strip() else {}
        data["suppliers"] = {}
        with open(db_path, "w") as f:
            json.dump(data, f)
    yield
    if db_path.exists():
        with open(db_path) as f:
            content = f.read()
        data = json.loads(content) if content.strip() else {}
        data["suppliers"] = {}
        with open(db_path, "w") as f:
            json.dump(data, f)


def _seed_supplier(client: TestClient, data: dict | None = None) -> dict:
    """Crea un supplier de prueba vía API y devuelve su respuesta JSON."""
    payload = data or _SUPPLIER_SEED
    response = client.post("/suppliers", json=payload)
    assert response.status_code == 201, f"Seed failed: {response.json()}"
    return response.json()


# ────────────────────────────────────────────────────────────────
#  POST /suppliers — Crear proveedor
# ────────────────────────────────────────────────────────────────

class TestCreateSupplier:
    def test_happy_path_creates_supplier(self, client: TestClient) -> None:
        """Camino feliz: crear un proveedor completo devuelve 201 con datos."""
        response = client.post("/suppliers", json=_SUPPLIER_SEED)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Carrier"
        assert data["country"] == "USA"
        assert data["currency"] == "USD"
        assert data["status"] == "active"
        assert isinstance(data["id"], int)
        assert "updated_at" in data

    def test_happy_path_spain_supplier(self, client: TestClient) -> None:
        """Camino feliz: proveedor en España con EUR."""
        response = client.post("/suppliers", json=_SUPPLIER_SEED_SPAIN)
        assert response.status_code == 201
        data = response.json()
        assert data["country"] == "Spain"
        assert data["currency"] == "EUR"

    def test_limit_case_minimal_fields(self, client: TestClient) -> None:
        """Caso límite: solo campos obligatorios (sin opcionales)."""
        minimal = {
            "name": "Min",
            "country": "USA",
            "categories": ["warehouse_supplies"],
            "rate_per_shipment": 1.0,
            "currency": "USD",
            "status": "active",
        }
        response = client.post("/suppliers", json=minimal)
        assert response.status_code == 201
        data = response.json()
        assert data["service_zone"] is None
        assert data["contact_email"] is None
        assert data["notes"] is None

    def test_failure_invalid_category(self, client: TestClient) -> None:
        """Modo fallo: categoría inválida devuelve 422."""
        payload = {**_SUPPLIER_SEED, "categories": ["invalid_category"]}
        response = client.post("/suppliers", json=payload)
        assert response.status_code == 422

    def test_failure_currency_mismatch(self, client: TestClient) -> None:
        """Modo fallo: USA con EUR devuelve 422."""
        payload = {**_SUPPLIER_SEED, "currency": "EUR"}
        response = client.post("/suppliers", json=payload)
        assert response.status_code == 422

    def test_failure_empty_name(self, client: TestClient) -> None:
        """Modo fallo: name vacío devuelve 422."""
        payload = {**_SUPPLIER_SEED, "name": ""}
        response = client.post("/suppliers", json=payload)
        assert response.status_code == 422

    def test_failure_zero_rate(self, client: TestClient) -> None:
        """Modo fallo: rate_per_shipment <= 0 devuelve 422."""
        payload = {**_SUPPLIER_SEED, "rate_per_shipment": 0}
        response = client.post("/suppliers", json=payload)
        assert response.status_code == 422


# ────────────────────────────────────────────────────────────────
#  GET /suppliers — Listar proveedores
# ────────────────────────────────────────────────────────────────

class TestListSuppliers:
    def test_happy_path_returns_all(self, client: TestClient) -> None:
        """Camino feliz: lista todos los suppliers."""
        _seed_supplier(client)
        _seed_supplier(client, _SUPPLIER_SEED_SPAIN)
        response = client.get("/suppliers")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

    def test_limit_case_filter_by_country(self, client: TestClient) -> None:
        """Caso límite: filtrar por país."""
        _seed_supplier(client)  # USA
        _seed_supplier(client, _SUPPLIER_SEED_SPAIN)  # Spain
        response = client.get("/suppliers?country=Spain")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["country"] == "Spain"

    def test_limit_case_filter_by_category(self, client: TestClient) -> None:
        """Caso límite: filtrar por categoría."""
        usa_carrier = {**_SUPPLIER_SEED, "categories": ["carrier_last_mile"]}
        usa_packaging = {
            **_SUPPLIER_SEED,
            "name": "Pack Co",
            "categories": ["packaging_materials"],
        }
        _seed_supplier(client, usa_carrier)
        _seed_supplier(client, usa_packaging)
        response = client.get("/suppliers?category=packaging_materials")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Pack Co"

    def test_limit_case_empty_list(self, client: TestClient) -> None:
        """Caso límite: sin suppliers devuelve lista vacía."""
        response = client.get("/suppliers")
        assert response.status_code == 200
        assert response.json() == []

    def test_failure_invalid_country_query(self, client: TestClient) -> None:
        """Modo fallo: país inválido en query devuelve 422."""
        response = client.get("/suppliers?country=Atlantis")
        assert response.status_code == 422


# ────────────────────────────────────────────────────────────────
#  GET /suppliers/{supplier_id} — Obtener proveedor por ID
# ────────────────────────────────────────────────────────────────

class TestGetSupplier:
    def test_happy_path_returns_supplier(self, client: TestClient) -> None:
        """Camino feliz: obtener supplier por ID."""
        created = _seed_supplier(client)
        response = client.get(f"/suppliers/{created['id']}")
        assert response.status_code == 200
        assert response.json()["id"] == created["id"]

    def test_failure_not_found(self, client: TestClient) -> None:
        """Modo fallo: ID inexistente devuelve 404."""
        response = client.get("/suppliers/99999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()


# ────────────────────────────────────────────────────────────────
#  PATCH /suppliers/{supplier_id}/rate — Actualizar tarifa
# ────────────────────────────────────────────────────────────────

class TestUpdateRate:
    def test_happy_path_updates_rate(self, client: TestClient) -> None:
        """Camino feliz: actualizar tarifa."""
        created = _seed_supplier(client)
        response = client.patch(
            f"/suppliers/{created['id']}/rate",
            json={"rate_per_shipment": 9.99},
        )
        assert response.status_code == 200
        assert response.json()["rate_per_shipment"] == 9.99

    def test_failure_not_found(self, client: TestClient) -> None:
        """Modo fallo: supplier inexistente."""
        response = client.patch(
            "/suppliers/99999/rate",
            json={"rate_per_shipment": 5.0},
        )
        assert response.status_code == 404

    def test_failure_invalid_rate(self, client: TestClient) -> None:
        """Modo fallo: tarifa <= 0 devuelve 422."""
        created = _seed_supplier(client)
        response = client.patch(
            f"/suppliers/{created['id']}/rate",
            json={"rate_per_shipment": 0},
        )
        assert response.status_code == 422

    def test_failure_extra_fields(self, client: TestClient) -> None:
        """Modo fallo: campos extra en el body devuelven 422 (extra=forbid)."""
        created = _seed_supplier(client)
        response = client.patch(
            f"/suppliers/{created['id']}/rate",
            json={"rate_per_shipment": 5.0, "name": "Hack"},
        )
        assert response.status_code == 422


# ────────────────────────────────────────────────────────────────
#  PATCH /suppliers/{supplier_id}/status — Actualizar estado
# ────────────────────────────────────────────────────────────────

class TestUpdateStatus:
    def test_happy_path_activate(self, client: TestClient) -> None:
        """Camino feliz: cambiar estado a suspended."""
        created = _seed_supplier(client)  # active
        response = client.patch(
            f"/suppliers/{created['id']}/status",
            json={"status": "suspended"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "suspended"

    def test_happy_path_reactivate(self, client: TestClient) -> None:
        """Camino feliz: cambiar de suspended a active."""
        suspended = {**_SUPPLIER_SEED, "status": "suspended"}
        created = _seed_supplier(client, suspended)
        response = client.patch(
            f"/suppliers/{created['id']}/status",
            json={"status": "active"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "active"

    def test_failure_invalid_status(self, client: TestClient) -> None:
        """Modo fallo: status inválido devuelve 422."""
        created = _seed_supplier(client)
        response = client.patch(
            f"/suppliers/{created['id']}/status",
            json={"status": "unknown"},
        )
        assert response.status_code == 422

    def test_failure_not_found(self, client: TestClient) -> None:
        """Modo fallo: supplier inexistente."""
        response = client.patch(
            "/suppliers/99999/status",
            json={"status": "suspended"},
        )
        assert response.status_code == 404


# ────────────────────────────────────────────────────────────────
#  DELETE /suppliers/{supplier_id} — Eliminar proveedor
# ────────────────────────────────────────────────────────────────

class TestDeleteSupplier:
    def test_happy_path_deletes(self, client: TestClient) -> None:
        """Camino feliz: eliminar supplier existente."""
        created = _seed_supplier(client)
        response = client.delete(f"/suppliers/{created['id']}")
        assert response.status_code == 200
        assert "deleted" in response.json()["detail"].lower()
        # Verificar que ya no existe
        get_response = client.get(f"/suppliers/{created['id']}")
        assert get_response.status_code == 404

    def test_failure_not_found(self, client: TestClient) -> None:
        """Modo fallo: supplier inexistente devuelve 404."""
        response = client.delete("/suppliers/99999")
        assert response.status_code == 404