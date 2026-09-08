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

# ──────────────────────────────────────────────
# Incident categories (from CSV analyzer context)
# ──────────────────────────────────────────────
INCIDENT_CATEGORIES = ["queja", "solicitud", "fallo_operativo"]
INCIDENT_STATUSES = ["open", "in_progress", "resolved", "discarded"]
INCIDENT_ORIGINS = ["customer", "branch", "internal"]


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


class PaginatedSupplierResponse(BaseModel):
    """Response model for a paginated list of suppliers."""

    items: list[SupplierResponse]
    total: int
    skip: int
    limit: int


class SupplierRateUpdate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	rate_per_shipment: float = Field(gt=0)


class SupplierStatusUpdate(BaseModel):
	model_config = ConfigDict(extra="forbid")

	status: SupplierStatus


# ──────────────────────────────────────────────
# Incident models
# ──────────────────────────────────────────────


class IncidentStatus(str, Enum):
	OPEN = "open"
	IN_PROGRESS = "in_progress"
	RESOLVED = "resolved"
	DISCARDED = "discarded"


class IncidentOrigin(str, Enum):
	CUSTOMER = "customer"
	BRANCH = "branch"
	INTERNAL = "internal"


class IncidentCategory(str, Enum):
	QUEJA = "queja"
	SOLICITUD = "solicitud"
	FALLO_OPERATIVO = "fallo_operativo"


class IncidentCreate(BaseModel):
	"""Input model for incident creation."""

	model_config = ConfigDict(extra="forbid")

	title: str = Field(min_length=1, max_length=200)
	description: str = Field(min_length=1)
	category: IncidentCategory
	origin: IncidentOrigin
	branch: str = Field(min_length=1)

	# Status por defecto al crear
	status: IncidentStatus = IncidentStatus.OPEN


class IncidentUpdate(BaseModel):
	"""Input model for incident updates (partial)."""

	model_config = ConfigDict(extra="forbid")

	title: str | None = Field(default=None, min_length=1, max_length=200)
	description: str | None = Field(default=None, min_length=1)
	category: IncidentCategory | None = None
	status: IncidentStatus | None = None
	origin: IncidentOrigin | None = None
	branch: str | None = Field(default=None, min_length=1)


class IncidentResponse(BaseModel):
	"""Response model for an incident."""

	id: str
	title: str
	description: str
	category: str
	status: str
	origin: str
	branch: str
	created_at: str
	updated_at: str


class PaginatedIncidentResponse(BaseModel):
    """Response model for a paginated list of incidents."""

    items: list[IncidentResponse]
    total: int
    skip: int
    limit: int


# ──────────────────────────────────────────────
# Lifecycle transitions for incidents
# ──────────────────────────────────────────────

INCIDENT_TRANSITIONS: dict[str, list[str]] = {
    "open": ["in_progress", "discarded"],
    "in_progress": ["resolved", "discarded"],
    "resolved": [],      # final state
    "discarded": [],     # final state
}


class IncidentStatusUpdate(BaseModel):
    """Input model for status-only update with lifecycle validation."""

    model_config = ConfigDict(extra="forbid")

    status: IncidentStatus

    def validate_transition(self, current_status: str) -> None:
        allowed = INCIDENT_TRANSITIONS.get(current_status, [])
        if not allowed:
            raise ValueError(
                f"El estado '{current_status}' es final. No se puede cambiar a '{self.status.value}'."
            )
        if self.status.value not in allowed:
            raise ValueError(
                f"Transición inválida: de '{current_status}' a '{self.status.value}'. "
                f"Transiciones permitidas desde '{current_status}': {', '.join(allowed)}."
            )
