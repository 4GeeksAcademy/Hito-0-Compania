from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query
from tinydb.table import Document

from services.api.database import get_suppliers_table
from services.api.models import (
	SupplierCountry,
	SupplierCreate,
	SupplierResponse,
	SupplierStatusUpdate,
	SupplierRateUpdate,
	PaginatedSupplierResponse,
)


router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def _get_db():
	"""Abre la conexión a la base de datos de proveedores de forma segura."""
	try:
		return get_suppliers_table()
	except Exception as exc:
		raise HTTPException(
			status_code=500,
			detail="Error interno al conectar con la base de datos.",
		) from exc


def _to_supplier_response(document: Document) -> SupplierResponse:
	return SupplierResponse.model_validate({"id": document.doc_id, **dict(document)})


@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(payload: SupplierCreate) -> SupplierResponse:
	db, suppliers = _get_db()
	try:
		record = payload.model_dump()
		record["updated_at"] = datetime.now(timezone.utc).isoformat()
		try:
			doc_id = suppliers.insert(record)
		except Exception as exc:
			raise HTTPException(
				status_code=500,
				detail="Error interno al guardar el proveedor.",
			) from exc

		try:
			document = suppliers.get(doc_id=doc_id)
		except Exception as exc:
			raise HTTPException(
				status_code=500,
				detail="Error interno al leer la base de datos.",
			) from exc

		if document is None:
			raise HTTPException(status_code=500, detail="El proveedor no fue persistido.")
		return _to_supplier_response(document)
	finally:
		db.close()


@router.get("", response_model=PaginatedSupplierResponse)
def list_suppliers(
	country: SupplierCountry | None = Query(default=None),
	category: str | None = Query(default=None),
	skip: int = Query(default=0, ge=0, description="Number of records to skip"),
	limit: int = Query(default=10, ge=1, le=100, description="Max records per page"),
) -> PaginatedSupplierResponse:
	db, suppliers = _get_db()
	try:
		try:
			results = suppliers.all()
		except Exception as exc:
			raise HTTPException(
				status_code=500,
				detail="Error interno al leer la base de datos.",
			) from exc

		if country is not None:
			results = [doc for doc in results if doc.get("country") == country.value]

		if category is not None:
			results = [doc for doc in results if category in doc.get("categories", [])]

		total = len(results)
		paginated = results[skip : skip + limit]

		return PaginatedSupplierResponse(
			items=[_to_supplier_response(doc) for doc in paginated],
			total=total,
			skip=skip,
			limit=limit,
		)
	finally:
		db.close()


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int) -> SupplierResponse:
	db, suppliers = _get_db()
	try:
		try:
			document = suppliers.get(doc_id=supplier_id)
		except Exception as exc:
			raise HTTPException(
				status_code=500,
				detail="Error interno al leer la base de datos.",
			) from exc

		if document is None:
			raise HTTPException(status_code=404, detail="Proveedor no encontrado.")
		return _to_supplier_response(document)
	finally:
		db.close()


@router.patch("/{supplier_id}/rate", response_model=SupplierResponse)
def update_supplier_rate(supplier_id: int, payload: SupplierRateUpdate) -> SupplierResponse:
	db, suppliers = _get_db()
	try:
		try:
			document = suppliers.get(doc_id=supplier_id)
		except Exception as exc:
			raise HTTPException(
				status_code=500,
				detail="Error interno al leer la base de datos.",
			) from exc

		if document is None:
			raise HTTPException(status_code=404, detail="Proveedor no encontrado.")

		try:
			suppliers.update(
				{
					"rate_per_shipment": payload.rate_per_shipment,
					"updated_at": datetime.now(timezone.utc).isoformat(),
				},
				doc_ids=[supplier_id],
			)
		except Exception as exc:
			raise HTTPException(
				status_code=500,
				detail="Error interno al actualizar el proveedor.",
			) from exc

		updated_document = suppliers.get(doc_id=supplier_id)
		if updated_document is None:
			raise HTTPException(status_code=500, detail="Error al actualizar el proveedor.")
		return _to_supplier_response(updated_document)
	finally:
		db.close()


@router.patch("/{supplier_id}/status", response_model=SupplierResponse)
def update_supplier_status(
	supplier_id: int, payload: SupplierStatusUpdate
) -> SupplierResponse:
	db, suppliers = _get_db()
	try:
		try:
			document = suppliers.get(doc_id=supplier_id)
		except Exception as exc:
			raise HTTPException(
				status_code=500,
				detail="Error interno al leer la base de datos.",
			) from exc

		if document is None:
			raise HTTPException(status_code=404, detail="Proveedor no encontrado.")

		try:
			suppliers.update({"status": payload.status.value}, doc_ids=[supplier_id])
		except Exception as exc:
			raise HTTPException(
				status_code=500,
				detail="Error interno al actualizar el proveedor.",
			) from exc

		updated_document = suppliers.get(doc_id=supplier_id)
		if updated_document is None:
			raise HTTPException(status_code=500, detail="Error al actualizar el proveedor.")
		return _to_supplier_response(updated_document)
	finally:
		db.close()


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int) -> dict[str, str]:
	db, suppliers = _get_db()
	try:
		try:
			document = suppliers.get(doc_id=supplier_id)
		except Exception as exc:
			raise HTTPException(
				status_code=500,
				detail="Error interno al leer la base de datos.",
			) from exc

		if document is None:
			raise HTTPException(status_code=404, detail="Proveedor no encontrado.")

		try:
			suppliers.remove(doc_ids=[supplier_id])
		except Exception as exc:
			raise HTTPException(
				status_code=500,
				detail="Error interno al eliminar el proveedor.",
			) from exc

		return {"detail": "Proveedor eliminado."}
	finally:
		db.close()
