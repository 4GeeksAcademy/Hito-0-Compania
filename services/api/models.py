from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


VALID_CATEGORIES = [
	"carrier_last_mile",
	"carrier_international",
	"warehouse_supplies",
	"packaging_materials",
	"reverse_logistics",
	"fleet_maintenance",
	"it_and_wms_software",
	"cleaning_and_facilities",
]


class SupplierStatus(str, Enum):
	ACTIVE = "active"
	SUSPENDED = "suspended"


class SupplierCountry(str, Enum):
	USA = "USA"
	SPAIN = "Spain"


class SupplierCurrency(str, Enum):
	USD = "USD"
	EUR = "EUR"


class SupplierBase(BaseModel):
	name: str = Field(min_length=1)
	country: SupplierCountry
	categories: list[str] = Field(min_length=1)
	rate_per_shipment: float = Field(gt=0)
	currency: SupplierCurrency
	status: SupplierStatus
	service_zone: str | None = None
	contact_email: str | None = None
	notes: str | None = None

	@field_validator("categories")
	@classmethod
	def validate_categories(cls, categories: list[str]) -> list[str]:
		invalid_categories = [c for c in categories if c not in VALID_CATEGORIES]
		if invalid_categories:
			raise ValueError(
				"Invalid categories: "
				+ ", ".join(invalid_categories)
				+ ". Allowed values: "
				+ ", ".join(VALID_CATEGORIES)
			)
		return categories

	@model_validator(mode="after")
	def validate_currency_by_country(self) -> SupplierBase:
		if self.country == SupplierCountry.USA and self.currency != SupplierCurrency.USD:
			raise ValueError("Suppliers in USA must use USD currency")
		if self.country == SupplierCountry.SPAIN and self.currency != SupplierCurrency.EUR:
			raise ValueError("Suppliers in Spain must use EUR currency")
		return self


class SupplierCreate(SupplierBase):
	"""Input model for supplier creation requests."""

	model_config = ConfigDict(extra="forbid")


class SupplierUpdate(SupplierBase):
	"""Input model for full supplier updates."""

	model_config = ConfigDict(extra="forbid")


class Supplier(SupplierBase):
	updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SupplierResponse(SupplierBase):
	id: int
	updated_at: datetime


class SupplierRateUpdate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	rate_per_shipment: float = Field(gt=0)


class SupplierStatusUpdate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	status: SupplierStatus
