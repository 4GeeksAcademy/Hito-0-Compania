from __future__ import annotations

import csv
import io
import json
import re
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from statistics import mean
from typing import Any


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


@dataclass
class ValidationIssue:
    row_number: int
    field: str
    rule: str
    value: str


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
            ValidationIssue(
                row_number,
                "customer_email",
                "invalid_email",
                row["customer_email"],
            )
        )

    if not PHONE_REGEX.match(row["customer_phone"]):
        issues.append(
            ValidationIssue(
                row_number,
                "customer_phone",
                "invalid_phone",
                row["customer_phone"],
            )
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


def analyze_incidents(rows: list[dict[str, str]]) -> dict[str, Any]:
    issues: list[ValidationIssue] = []
    valid_rows: list[dict[str, str]] = []

    category_counter: Counter[str] = Counter()
    status_counter: Counter[str] = Counter()
    country_counter: Counter[str] = Counter()
    priority_counter: Counter[str] = Counter()
    channel_counter: Counter[str] = Counter()
    resolution_times: list[float] = []
    resolution_times_by_category: dict[str, list[float]] = {
        "queja": [],
        "solicitud": [],
        "fallo_operativo": [],
    }
    satisfaction_scores_closed: list[float] = []

    for index, row in enumerate(rows, start=2):
        row_issues = _validate_row(row, index)
        if row_issues:
            issues.extend(row_issues)
            continue

        valid_rows.append(row)
        category_counter[row["category"]] += 1
        status_counter[row["status"]] += 1
        country_counter[row["country"]] += 1
        priority_counter[row["priority"]] += 1
        channel_counter[row["channel"]] += 1

        if row["resolution_hours"]:
            hours = float(row["resolution_hours"])
            resolution_times.append(hours)
            resolution_times_by_category[row["category"]].append(hours)

        if (
            row["status"] in CLOSED_STATUS_EQUIVALENTS
            and "satisfaction_score" in row
            and row["satisfaction_score"]
        ):
            satisfaction_scores_closed.append(float(row["satisfaction_score"]))

    issue_counter: Counter[str] = Counter(issue.rule for issue in issues)

    summary = {
        "schema": {
            "required_fields": REQUIRED_FIELDS,
            "valid_categories": sorted(VALID_CATEGORIES),
            "valid_statuses": sorted(VALID_STATUSES),
            "valid_countries": sorted(VALID_COUNTRIES),
            "valid_priorities": sorted(VALID_PRIORITIES),
            "valid_channels": sorted(VALID_CHANNELS),
        },
        "totals": {
            "total_rows": len(rows),
            "valid_rows": len(valid_rows),
            "invalid_rows": len(rows) - len(valid_rows),
            "error_count": len(issues),
        },
        "breakdowns": {
            "by_category": dict(category_counter),
            "by_status": dict(status_counter),
            "by_country": dict(country_counter),
            "by_priority": dict(priority_counter),
            "by_channel": dict(channel_counter),
            "invalid_by_rule": dict(issue_counter),
        },
        "kpis": {
            "avg_resolution_hours": round(mean(resolution_times), 2) if resolution_times else None,
            "avg_resolution_hours_by_category": {
                category: round(mean(values), 2) if values else None
                for category, values in resolution_times_by_category.items()
            },
            "avg_satisfaction_closed": round(mean(satisfaction_scores_closed), 2)
            if satisfaction_scores_closed
            else None,
        },
        "issues": [
            {
                "row_number": issue.row_number,
                "field": issue.field,
                "rule": issue.rule,
                "value": issue.value,
            }
            for issue in issues
        ],
    }
    return summary


def flatten_summary_to_rows(summary: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for metric, value in summary["totals"].items():
        rows.append({"section": "totals", "metric": metric, "value": value})

    for metric, value in summary["kpis"].items():
        if isinstance(value, dict):
            for nested_metric, nested_value in value.items():
                rows.append(
                    {
                        "section": "kpis",
                        "metric": f"{metric}.{nested_metric}",
                        "value": nested_value,
                    }
                )
        else:
            rows.append({"section": "kpis", "metric": metric, "value": value})

    for breakdown, values in summary["breakdowns"].items():
        for label, total in values.items():
            rows.append(
                {
                    "section": f"breakdown.{breakdown}",
                    "metric": label,
                    "value": total,
                }
            )

    return rows


def write_summary_json(summary: dict[str, Any], output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as output_file:
        json.dump(summary, output_file, indent=2, ensure_ascii=False)


def compare_expected(summary: dict[str, Any], expected: dict[str, Any]) -> list[str]:
    mismatches: list[str] = []

    for section, expected_values in expected.items():
        if section not in summary:
            mismatches.append(f"Seccion esperada no encontrada: {section}")
            continue

        for key, expected_value in expected_values.items():
            actual_value = summary[section].get(key)
            if actual_value != expected_value:
                mismatches.append(
                    f"{section}.{key}: esperado={expected_value} actual={actual_value}"
                )

    return mismatches