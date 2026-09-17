"""
Tests para los endpoints de análisis de incidentes.

Cubre:
  - POST /api/incidents/analyze  — subir CSV y analizar
  - GET /api/incidents/results/export — exportar resultados

Estructura: camino feliz, caso límite, modo de fallo para cada uno.
"""
from __future__ import annotations

import io

import main as api_main
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def _reset_analysis_state() -> None:
    """Resetea LAST_ANALYSIS global antes de cada test."""
    api_main.LAST_ANALYSIS = None
    api_main.LAST_ANALYSIS_AT = None
    yield


# ── CSV de prueba ──

_VALID_CSV = """\
incident_id,created_at,country,customer_id,customer_email,customer_phone,category,status,priority,resolution_hours,channel,description
INC-001,2026-01-15,ES,CUST-001,cliente@test.com,+34-666666666,queja,cerrado,baja,2.5,email,Cliente reporta retraso en entrega
INC-002,2026-01-16,US,CUST-002,user@test.com,+1-555-123-4567,solicitud,abierto,media,0,web,Solicita cambio de direccion
INC-003,2026-01-17,ES,CUST-003,otro@test.com,+34-612345678,fallo_operativo,en_proceso,alta,4.0,telefono,Fallo en sistema de picking
"""

_EMPTY_CSV = """\
incident_id,created_at,country,customer_id,customer_email,customer_phone,category,status,priority,resolution_hours,channel,description
"""

_MISSING_FIELDS_CSV = """\
incident_id,created_at,country
INC-001,2026-01-15,ES
"""

_INVALID_CSV_BINARY = b"\xff\xfe\x00\x31\x00\x2c\x00\x32\x00"

_CSV_WITH_INVALID_ROWS = """\
incident_id,created_at,country,customer_id,customer_email,customer_phone,category,status,priority,resolution_hours,channel,description
INC-001,2026-01-15,ES,CUST-001,cliente@test.com,+34-666666666,queja,cerrado,baja,2.5,email,Valido
INC-002,2026-01-16,XX,CUST-002,email-invalido,+34-666666666,solicitud,abierto,media,0,web,Pais invalido y email invalido
INC-003,2026-01-17,US,CUST-003,valido@test.com,telefono-mal,categ_inexistente,estado_falso,prioridad_falsa,0,chat_no_valido,Multiples errores
INC-004,2026-01-18,ES,CUST-004,otro@test.com,+34-612345678,fallo_operativo,resuelto,alta,-1.0,email,Horas negativas
INC-005,2026-01-19,ES,CUST-005,test@test.com,+34-612345679,queja,cerrado,media,3.0,telefono,Con satisfaction
"""

_CSV_WITH_SATISFACTION = """\
incident_id,created_at,country,customer_id,customer_email,customer_phone,category,status,priority,resolution_hours,channel,description,satisfaction_score
INC-001,2026-01-15,ES,CUST-001,cliente@test.com,+34-666666666,queja,cerrado,baja,2.5,email,Cliente satisfecho,4
INC-002,2026-01-16,US,CUST-002,user@test.com,+1-555-123-4567,solicitud,resuelto,media,5.0,web,Muy satisfecho,5
INC-003,2026-01-17,ES,CUST-003,otro@test.com,+34-612345678,fallo_operativo,cerrado,alta,4.0,telefono,Insatisfecho,1
"""

_CSV_NO_INCIDENT_ID = """\
created_at,country,customer_id,customer_email,customer_phone,category,status,priority,resolution_hours,channel,description
2026-01-15,ES,CUST-001,cliente@test.com,+34-666666666,queja,cerrado,baja,2.5,email,Sin incident_id
"""


class TestAnalyzeIncidents:
    """POST /api/incidents/analyze"""

    def test_happy_path_valid_csv(self, client: TestClient) -> None:
        """Camino feliz: CSV válido devuelve 200 con análisis."""
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("incidents.csv", _VALID_CSV, "text/csv")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "analyzed_at" in data
        assert "summary" in data
        summary = data["summary"]
        assert summary["totals"]["total_rows"] == 3
        assert summary["totals"]["valid_rows"] == 3
        assert summary["totals"]["invalid_rows"] == 0

    def test_happy_path_kpis_computed(self, client: TestClient) -> None:
        """Camino feliz: KPIs se calculan correctamente."""
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("data.csv", _VALID_CSV, "text/csv")},
        )
        assert response.status_code == 200
        kpis = response.json()["summary"]["kpis"]
        # avg_resolution_hours = (2.5 + 0 + 4.0) / 3 = 2.17
        assert kpis["avg_resolution_hours"] == 2.17
        assert kpis["avg_satisfaction_closed"] is None  # no satisfaction_score in CSV

    def test_limit_case_empty_csv(self, client: TestClient) -> None:
        """Caso límite: CSV sin datos (solo cabeceras) devuelve 0 filas."""
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("empty.csv", _EMPTY_CSV, "text/csv")},
        )
        assert response.status_code == 200
        summary = response.json()["summary"]
        assert summary["totals"]["total_rows"] == 0
        assert summary["totals"]["valid_rows"] == 0

    def test_failure_missing_fields(self, client: TestClient) -> None:
        """Modo fallo: CSV con cabeceras incompletas devuelve 400."""
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("bad.csv", _MISSING_FIELDS_CSV, "text/csv")},
        )
        assert response.status_code == 400
        assert "cabeceras incompletas" in response.json()["detail"].lower()

    def test_failure_no_file(self, client: TestClient) -> None:
        """Modo fallo: sin archivo devuelve 422."""
        response = client.post("/api/incidents/analyze")
        assert response.status_code == 422

    def test_failure_not_csv(self, client: TestClient) -> None:
        """Modo fallo: archivo no CSV devuelve 415."""
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("data.txt", "contenido", "text/plain")},
        )
        assert response.status_code == 415

    def test_failure_binary_file(self, client: TestClient) -> None:
        """Modo fallo: archivo binario sin UTF-8 devuelve 400."""
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("data.csv", _INVALID_CSV_BINARY, "text/csv")},
        )
        assert response.status_code == 400
        assert "utf-8" in response.json()["detail"].lower()

    def test_failure_empty_file(self, client: TestClient) -> None:
        """Modo fallo: archivo vacío devuelve 400."""
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("empty.csv", b"", "text/csv")},
        )
        assert response.status_code == 400
        assert "vacio" in response.json()["detail"].lower()

    def test_validation_missing_field(self, client: TestClient) -> None:
        """Validación: campo requerido faltante en cabeceras devuelve 400."""
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("data.csv", _CSV_NO_INCIDENT_ID, "text/csv")},
        )
        assert response.status_code == 400
        assert "cabeceras incompletas" in response.json()["detail"].lower()

    def test_validation_multi_invalid_rows(self, client: TestClient) -> None:
        """Validación: CSV con múltiples filas inválidas reporta todos los errores."""
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("data.csv", _CSV_WITH_INVALID_ROWS, "text/csv")},
        )
        assert response.status_code == 200
        summary = response.json()["summary"]
        assert summary["totals"]["total_rows"] == 5
        # Fila 1 (INC-001) es válida, fila 5 (INC-005) es válida → 2 válidas
        assert summary["totals"]["valid_rows"] == 2
        assert summary["totals"]["invalid_rows"] == 3
        rules_found = {i["rule"] for i in summary["issues"]}
        assert "invalid_country" in rules_found
        assert "invalid_email" in rules_found
        assert "invalid_phone" in rules_found
        assert "invalid_category" in rules_found
        assert "negative_resolution_hours" in rules_found

    def test_happy_path_satisfaction_score(self, client: TestClient) -> None:
        """Camino feliz: CSV con satisfaction_score calcula el promedio."""
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("data.csv", _CSV_WITH_SATISFACTION, "text/csv")},
        )
        assert response.status_code == 200
        kpis = response.json()["summary"]["kpis"]
        # avg_satisfaction_closed = (4 + 5 + 1) / 3 = 3.33
        assert kpis["avg_satisfaction_closed"] == 3.33

    def test_breakdowns_populated(self, client: TestClient) -> None:
        """Validación: breakdowns se generan correctamente."""
        response = client.post(
            "/api/incidents/analyze",
            files={"file": ("data.csv", _VALID_CSV, "text/csv")},
        )
        assert response.status_code == 200
        breakdowns = response.json()["summary"]["breakdowns"]
        assert breakdowns["by_category"]["queja"] == 1
        assert breakdowns["by_country"]["ES"] == 2
        assert breakdowns["by_priority"]["media"] == 1
        assert breakdowns["by_channel"]["email"] == 1


class TestExportResults:
    """GET /api/incidents/results/export"""

    def test_happy_path_export_after_analyze(self, client: TestClient) -> None:
        """Camino feliz: exportar después de analizar devuelve CSV."""
        # Primero analizar
        client.post(
            "/api/incidents/analyze",
            files={"file": ("incidents.csv", _VALID_CSV, "text/csv")},
        )
        # Luego exportar
        response = client.get("/api/incidents/results/export")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        content = response.content.decode()
        assert "totals" in content
        assert "total_rows" in content

    def test_failure_no_previous_analysis(self, client: TestClient) -> None:
        """Modo fallo: exportar sin haber analizado devuelve 404."""
        response = client.get("/api/incidents/results/export")
        assert response.status_code == 404
        assert "no hay analisis previo" in response.json()["detail"].lower()