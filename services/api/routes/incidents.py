from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

from app.core.database import incidents_table
from services.api.models import (
	INCIDENT_CATEGORIES,
	INCIDENT_ORIGINS,
	INCIDENT_STATUSES,
	IncidentCreate,
	IncidentResponse,
	IncidentStatusUpdate,
	IncidentUpdate,
	PaginatedIncidentResponse,
)


router = APIRouter(prefix="/api/incidents", tags=["incidents"])


def _to_incident_response(doc: dict) -> IncidentResponse:
	return IncidentResponse.model_validate({
		"id": doc["id"],
		"title": doc["title"],
		"description": doc["description"],
		"category": doc["category"],
		"status": doc["status"],
		"origin": doc["origin"],
		"branch": doc["branch"],
		"created_at": doc["created_at"],
		"updated_at": doc["updated_at"],
	})


# ──────────────────────────────────────────────
# POST /incidents — Crear incidencia
# ──────────────────────────────────────────────


@router.post("", response_model=IncidentResponse, status_code=201)
def create_incident(payload: IncidentCreate) -> IncidentResponse:
	table = incidents_table
	now = datetime.now(timezone.utc).isoformat()

	record = {
		"id": str(uuid4()),
		"title": payload.title,
		"description": payload.description,
		"category": payload.category.value,
		"status": payload.status.value,
		"origin": payload.origin.value,
		"branch": payload.branch,
		"created_at": now,
		"updated_at": now,
	}

	table.insert(record)

	return _to_incident_response(record)


# ──────────────────────────────────────────────
# GET /incidents — Listar con filtros
# ──────────────────────────────────────────────


@router.get("", response_model=PaginatedIncidentResponse)
def list_incidents(
	category: str | None = Query(default=None),
	status: str | None = Query(default=None),
	origin: str | None = Query(default=None),
	branch: str | None = Query(default=None),
	sort_by: str | None = Query(default=None, description="Field to sort by"),
	sort_order: str | None = Query(default="asc", description="asc or desc"),
	skip: int = Query(default=0, ge=0, description="Number of records to skip"),
	limit: int = Query(default=10, ge=1, le=100, description="Max records per page"),
) -> PaginatedIncidentResponse:
	table = incidents_table
	results = table.all()

	# Filters
	if category is not None:
		results = [doc for doc in results if doc.get("category") == category]
	if status is not None:
		results = [doc for doc in results if doc.get("status") == status]
	if origin is not None:
		results = [doc for doc in results if doc.get("origin") == origin]
	if branch is not None:
		results = [doc for doc in results if doc.get("branch") == branch]

	# Sorting
	if sort_by in ("created_at", "updated_at", "title", "category", "status", "origin", "branch"):
		reverse = sort_order == "desc"
		results.sort(key=lambda doc: doc.get(sort_by, ""), reverse=reverse)

	total = len(results)
	paginated = results[skip : skip + limit]

	return PaginatedIncidentResponse(
		items=[_to_incident_response(doc) for doc in paginated],
		total=total,
		skip=skip,
		limit=limit,
	)


# ──────────────────────────────────────────────
# GET /incidents/summary — Métricas agregadas
# ──────────────────────────────────────────────
# NOTA: debe ir ANTES que GET /{incident_id} para evitar
# que FastAPI interprete "summary" como un ID.


@router.get("/summary")
def incidents_summary() -> dict:
	table = incidents_table
	all_incidents = table.all()

	status_counter: Counter[str] = Counter()
	category_counter: Counter[str] = Counter()
	origin_counter: Counter[str] = Counter()
	branch_counter: Counter[str] = Counter()

	for doc in all_incidents:
		status_counter[doc.get("status", "unknown")] += 1
		category_counter[doc.get("category", "unknown")] += 1
		origin_counter[doc.get("origin", "unknown")] += 1
		branch_counter[doc.get("branch", "unknown")] += 1

	return {
		"total": len(all_incidents),
		"by_status": dict(status_counter),
		"by_category": dict(category_counter),
		"by_origin": dict(origin_counter),
		"by_branch": dict(branch_counter),
	}


# ──────────────────────────────────────────────
# GET /incidents/{incident_id} — Detalle
# ──────────────────────────────────────────────


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: str) -> IncidentResponse:
	table = incidents_table

	doc = table.get(lambda d: d.get("id") == incident_id)

	if doc is None:
		raise HTTPException(status_code=404, detail="Incidencia no encontrada")

	return _to_incident_response(doc)


# ──────────────────────────────────────────────
# PATCH /incidents/{incident_id}/status — Cambiar estado
# ──────────────────────────────────────────────


@router.patch("/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(incident_id: str, payload: IncidentStatusUpdate) -> IncidentResponse:
	table = incidents_table

	existing = table.get(lambda d: d.get("id") == incident_id)

	if existing is None:
		raise HTTPException(status_code=404, detail="Incidencia no encontrada")

	current_status = existing.get("status", "")

	try:
		payload.validate_transition(current_status)
	except ValueError as exc:
		raise HTTPException(status_code=400, detail=str(exc)) from exc

	now = datetime.now(timezone.utc).isoformat()
	table.update(
		{"status": payload.status.value, "updated_at": now},
		lambda d: d.get("id") == incident_id,
	)

	updated_doc = table.get(lambda d: d.get("id") == incident_id)
	if updated_doc is None:
		raise HTTPException(status_code=500, detail="Error al actualizar el estado")

	return _to_incident_response(updated_doc)

	table.remove(lambda doc: doc.get("id") == incident_id)

	return {"detail": "Incidencia eliminada"}