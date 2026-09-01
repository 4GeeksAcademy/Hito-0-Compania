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
)


router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def _to_supplier_response(document: Document) -> SupplierResponse:
	return SupplierResponse.model_validate({"id": document.doc_id, **dict(document)})


@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(payload: SupplierCreate) -> SupplierResponse:
	db, suppliers = get_suppliers_table()
	try:
		record = payload.model_dump()
		record["updated_at"] = datetime.now(timezone.utc).isoformat()
		doc_id = suppliers.insert(record)
		document = suppliers.get(doc_id=doc_id)
		if document is None:
			raise HTTPException(status_code=500, detail="Supplier was not persisted")
		return _to_supplier_response(document)
	finally:
		db.close()


@router.get("", response_model=list[SupplierResponse])
def list_suppliers(
	country: SupplierCountry | None = Query(default=None),
	category: str | None = Query(default=None),
) -> list[SupplierResponse]:
	db, suppliers = get_suppliers_table()
	try:
		results = suppliers.all()

		if country is not None:
			results = [doc for doc in results if doc.get("country") == country.value]

		if category is not None:
			results = [doc for doc in results if category in doc.get("categories", [])]

		return [_to_supplier_response(doc) for doc in results]
	finally:
		db.close()


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int) -> SupplierResponse:
	db, suppliers = get_suppliers_table()
	try:
		document = suppliers.get(doc_id=supplier_id)
		if document is None:
			raise HTTPException(status_code=404, detail="Supplier not found")
		return _to_supplier_response(document)
	finally:
		db.close()


@router.patch("/{supplier_id}/rate", response_model=SupplierResponse)
def update_supplier_rate(supplier_id: int, payload: SupplierRateUpdate) -> SupplierResponse:
	db, suppliers = get_suppliers_table()
	try:
		document = suppliers.get(doc_id=supplier_id)
		if document is None:
			raise HTTPException(status_code=404, detail="Supplier not found")

		suppliers.update(
			{
				"rate_per_shipment": payload.rate_per_shipment,
				"updated_at": datetime.now(timezone.utc).isoformat(),
			},
			doc_ids=[supplier_id],
		)
		updated_document = suppliers.get(doc_id=supplier_id)
		if updated_document is None:
			raise HTTPException(status_code=500, detail="Supplier update failed")
		return _to_supplier_response(updated_document)
	finally:
		db.close()


@router.patch("/{supplier_id}/status", response_model=SupplierResponse)
def update_supplier_status(
	supplier_id: int, payload: SupplierStatusUpdate
) -> SupplierResponse:
	db, suppliers = get_suppliers_table()
	try:
		document = suppliers.get(doc_id=supplier_id)
		if document is None:
			raise HTTPException(status_code=404, detail="Supplier not found")

		suppliers.update({"status": payload.status.value}, doc_ids=[supplier_id])
		updated_document = suppliers.get(doc_id=supplier_id)
		if updated_document is None:
			raise HTTPException(status_code=500, detail="Supplier update failed")
		return _to_supplier_response(updated_document)
	finally:
		db.close()


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int) -> dict[str, str]:
	db, suppliers = get_suppliers_table()
	try:
		document = suppliers.get(doc_id=supplier_id)
		if document is None:
			raise HTTPException(status_code=404, detail="Supplier not found")

		suppliers.remove(doc_ids=[supplier_id])
		return {"detail": "Supplier deleted"}
	finally:
		db.close()
