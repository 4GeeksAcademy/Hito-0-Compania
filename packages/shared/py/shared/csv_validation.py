"""
csv_validation — Shared validation logic for incident CSV parsing.

Extracted from the original incident_analyzer to be reused by both
the analysis endpoint and the seed script.
"""

from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any


# ──────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────

REQUIRED_FIELDS = [
    "incident_id",
    "created_at",
    "country",
    "customer_id",
    "customer_email",
    "customer_phone",
    "category",
    "status",
    "priority",
    "resolution_hours",
    "channel",
    "description",
]

VALID_CATEGORIES = {"queja", "solicitud", "fallo_operativo"}
VALID_STATUSES = {"abierto", "en_proceso", "resuelto", "cerrado", "descartado"}
VALID_COUNTRIES = {"US", "ES"}
VALID_PRIORITIES = {"baja", "media", "alta", "critica"}
VALID_CHANNELS = {"email", "telefono", "web", "chat"}
CLOSED_STATUS_EQUIVALENTS = {"cerrado", "resuelto"}

DATE_FORMAT = "%Y-%m-%d"
EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_REGEX = re.compile(r"^\+?[0-9\-\s]{8,20}$")


# ──────────────────────────────────────────────
# Domain mappings (CSV → Incident model)
# ──────────────────────────────────────────────

CSV_STATUS_TO_INCIDENT = {
    "abierto": "open",
    "en_proceso": "in_progress",
    "resuelto": "resolved",
    "cerrado": "resolved",
    "descartado": "discarded",
}

CSV_CATEGORY_TO_INCIDENT = {
    "queja": "queja",
    "solicitud": "solicitud",
    "fallo_operativo": "fallo_operativo",
}


# ──────────────────────────────────────────────
# Types
# ──────────────────────────────────────────────


@dataclass
class ValidationIssue:
    row_number: int
    field: str
    rule: str
    value: str


# ──────────────────────────────────────────────
# Validation helpers
# ──────────────────────────────────────────────


def _normalize_row(row: dict[str, str]) -> dict[str, str]:
    return {k: (v or "").strip() for k, v in row.items()}


def _validate_row(row: dict[str, str], row_number: int) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []

    for field in REQUIRED_FIELDS:
        if field not in row:
            issues.append(
                ValidationIssue(
                    row_number=row_number,
                    field=field,
                    rule="missing_field",
                    value="",
                )
            )

    if issues:
        return issues

    created_at = row["created_at"]
    if not created_at:
        issues.append(ValidationIssue(row_number, "created_at", "required", created_at))
    else:
        try:
            datetime.strptime(created_at, DATE_FORMAT)
        except ValueError:
            issues.append(
                ValidationIssue(row_number, "created_at", "invalid_date_format", created_at)
            )

    if row["country"] not in VALID_COUNTRIES:
        issues.append(ValidationIssue(row_number, "country", "invalid_country", row["country"]))

    if not row["customer_id"]:
        issues.append(ValidationIssue(row_number, "customer_id", "required", row["customer_id"]))

    if not EMAIL_REGEX.match(row["customer_email"]):
        issues.append(
            ValidationIssue(row_number, "customer_email", "invalid_email", row["customer_email"])
        )

    if not PHONE_REGEX.match(row["customer_phone"]):
        issues.append(
            ValidationIssue(row_number, "customer_phone", "invalid_phone", row["customer_phone"])
        )

    if row["category"] not in VALID_CATEGORIES:
        issues.append(ValidationIssue(row_number, "category", "invalid_category", row["category"]))

    if row["status"] not in VALID_STATUSES:
        issues.append(ValidationIssue(row_number, "status", "invalid_status", row["status"]))

    if row["priority"] not in VALID_PRIORITIES:
        issues.append(ValidationIssue(row_number, "priority", "invalid_priority", row["priority"]))

    if row["channel"] not in VALID_CHANNELS:
        issues.append(ValidationIssue(row_number, "channel", "invalid_channel", row["channel"]))

    resolution_hours = row["resolution_hours"]
    if resolution_hours:
        try:
            parsed_hours = float(resolution_hours)
            if parsed_hours < 0:
                issues.append(
                    ValidationIssue(
                        row_number,
                        "resolution_hours",
                        "negative_resolution_hours",
                        resolution_hours,
                    )
                )
        except ValueError:
            issues.append(
                ValidationIssue(
                    row_number,
                    "resolution_hours",
                    "resolution_hours_not_numeric",
                    resolution_hours,
                )
            )
    elif row["status"] in CLOSED_STATUS_EQUIVALENTS:
        issues.append(
            ValidationIssue(
                row_number,
                "resolution_hours",
                "missing_resolution_hours_for_closed_status",
                resolution_hours,
            )
        )

    if not row["description"]:
        issues.append(ValidationIssue(row_number, "description", "required", row["description"]))

    if "satisfaction_score" in row and row["satisfaction_score"]:
        try:
            score = float(row["satisfaction_score"])
            if score < 0 or score > 5:
                issues.append(
                    ValidationIssue(
                        row_number,
                        "satisfaction_score",
                        "satisfaction_score_out_of_range",
                        row["satisfaction_score"],
                    )
                )
        except ValueError:
            issues.append(
                ValidationIssue(
                    row_number,
                    "satisfaction_score",
                    "satisfaction_score_not_numeric",
                    row["satisfaction_score"],
                )
            )

    return issues


def parse_incidents_csv(csv_content: str) -> list[dict[str, str]]:
    """Parse a CSV string into a list of normalized row dicts."""
    reader = csv.DictReader(io.StringIO(csv_content))
    if reader.fieldnames is None:
        raise ValueError("CSV sin cabeceras")

    missing_columns = [column for column in REQUIRED_FIELDS if column not in reader.fieldnames]
    if missing_columns:
        raise ValueError(f"CSV con cabeceras incompletas. Faltan: {', '.join(missing_columns)}")

    rows: list[dict[str, str]] = []
    for row in reader:
        rows.append(_normalize_row(row))
    return rows