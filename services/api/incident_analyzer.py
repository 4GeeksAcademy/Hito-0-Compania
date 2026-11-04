from __future__ import annotations

import json
import os
import sys
from collections import Counter
from statistics import mean
from typing import Any

# Ensure packages/shared/py is on the path
SHARED_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "packages", "shared", "py")
if SHARED_DIR not in sys.path:
    sys.path.insert(0, os.path.abspath(SHARED_DIR))

from shared.csv_validation import (
    CLOSED_STATUS_EQUIVALENTS,
    REQUIRED_FIELDS,
    VALID_CATEGORIES,
    VALID_CHANNELS,
    VALID_COUNTRIES,
    VALID_PRIORITIES,
    VALID_STATUSES,
    ValidationIssue,
    _normalize_row,
    _validate_row,
    parse_incidents_csv,
)


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
    try:
        with open(output_path, "w", encoding="utf-8") as output_file:
            json.dump(summary, output_file, indent=2, ensure_ascii=False)
    except IOError as exc:
        raise RuntimeError(
            f"No se pudo escribir el archivo de salida en la ruta especificada."
        ) from exc


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