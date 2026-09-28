#!/usr/bin/env python3
"""
Seed historical incidents from the legacy CSV into the incident database.

Usage:
    uv run python scripts/seed_incidents.py
    uv run python scripts/seed_incidents.py --csv scripts/incidents-COMPANY.csv

Behaviour:
    - Reads the legacy CSV with the same schema as the original analyzer.
    - Applies transformations: CSV status → Incident status, CSV category → Incident category,
      description → title (first ~80 chars), created_at → ISO datetime, country → branch.
    - Validates each row using the shared validation module; invalid rows are skipped.
    - Idempotent: uses incident_id from the CSV as a deduplication key (stored as csv_ref).
"""

from __future__ import annotations

import argparse
import os
import sys
import csv
import io
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

# ── Path setup ──────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent

# Add services/api to path for app.core.database
API_DIR = REPO_ROOT / "services" / "api"
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

# Add packages/shared/py to path for shared.csv_validation
SHARED_PY_DIR = REPO_ROOT / "packages" / "shared" / "py"
if str(SHARED_PY_DIR) not in sys.path:
    sys.path.insert(0, str(SHARED_PY_DIR))

from app.core.database import incidents_table
from shared.csv_validation import (
    CSV_CATEGORY_TO_INCIDENT,
    CSV_STATUS_TO_INCIDENT,
    parse_incidents_csv,
    _validate_row,
)

# ── Country → branch mapping ────────────────────
COUNTRY_TO_BRANCH = {
    "US": "US Central",
    "ES": "Spain Central",
}


def get_csv_ref(csv_row: dict[str, str]) -> str:
    """Build a unique reference from the CSV's incident_id."""
    return f"csv:{csv_row.get('incident_id', '')}"


def row_to_incident(csv_row: dict[str, str]) -> dict | None:
    """Transform a valid CSV row into an incident record for TinyDB."""
    csv_status = csv_row["status"]
    csv_category = csv_row["category"]

    # Map status & category; skip if unknown
    incident_status = CSV_STATUS_TO_INCIDENT.get(csv_status)
    incident_category = CSV_CATEGORY_TO_INCIDENT.get(csv_category)
    if incident_status is None or incident_category is None:
        return None

    # Title: take first 80 chars of description, or first sentence
    description = csv_row["description"]
    title_candidate = description.strip()
    if len(title_candidate) > 80:
        # Try to cut at first sentence boundary within limit
        truncated = title_candidate[:80]
        last_dot = truncated.rfind(".")
        if last_dot > 20:
            title_candidate = truncated[: last_dot + 1]
        else:
            title_candidate = truncated + "…"
    if not title_candidate:
        title_candidate = f"Incidencia {csv_row.get('incident_id', 'desconocida')}"

    # Date: CSV date is YYYY-MM-DD, convert to ISO datetime
    created_at_str = csv_row["created_at"]
    try:
        created_dt = datetime.strptime(created_at_str, "%Y-%m-%d")
        created_at = created_dt.replace(tzinfo=timezone.utc).isoformat()
    except ValueError:
        created_at = datetime.now(timezone.utc).isoformat()

    # Branch: map from country
    branch = COUNTRY_TO_BRANCH.get(csv_row["country"], "central")

    now = datetime.now(timezone.utc).isoformat()

    return {
        "id": str(uuid4()),
        "title": title_candidate,
        "description": description,
        "category": incident_category,
        "status": incident_status,
        "origin": "customer",
        "branch": branch,
        "created_at": created_at,
        "updated_at": now,
        "csv_ref": get_csv_ref(csv_row),
    }


def already_seeded(table, csv_ref: str) -> bool:
    """Check if a csv_ref already exists in the database."""
    return len(table.search(lambda doc: doc.get("csv_ref") == csv_ref)) > 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Seed historical incidents from legacy CSV into TinyDB."
    )
    parser.add_argument(
        "--csv",
        default=str(SCRIPT_DIR / "incidents-COMPANY.csv"),
        help="Path to the legacy CSV file (default: scripts/incidents-COMPANY.csv).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and print what would be inserted without writing.",
    )
    args = parser.parse_args()

    csv_path = Path(args.csv)

    if not csv_path.exists():
        print(f"❌ Error: no se encuentra el fichero CSV: {csv_path}")
        return 1

    csv_content = csv_path.read_text(encoding="utf-8")

    # Parse CSV rows
    try:
        rows = parse_incidents_csv(csv_content)
    except ValueError as exc:
        print(f"❌ Error de estructura CSV: {exc}")
        return 1

    table = incidents_table
    inserted = 0
    skipped_invalid = 0
    skipped_duplicate = 0
    invalid_details: list[str] = []

    for idx, csv_row in enumerate(rows):
        row_number = idx + 2  # +2 because header is row 1, 0-indexed

        # Validate using shared logic
        issues = _validate_row(csv_row, row_number)
        if issues:
            skipped_invalid += 1
            for issue in issues:
                invalid_details.append(
                    f"  Fila {issue.row_number}: [{issue.rule}] {issue.field} = '{issue.value}'"
                )
            continue

        # Transform
        incident = row_to_incident(csv_row)
        if incident is None:
            skipped_invalid += 1
            invalid_details.append(
                f"  Fila {row_number}: mapeo de estado/categoría fallido "
                f"(status='{csv_row.get('status')}', category='{csv_row.get('category')}')"
            )
            continue

        # Idempotency check
        csv_ref = incident["csv_ref"]
        if already_seeded(table, csv_ref):
            skipped_duplicate += 1
            continue

        if args.dry_run:
            print(f"  🔍 [DRY-RUN] Se insertaría: {incident['title']} ({csv_ref})")
            inserted += 1
            continue

        # Insert
        table.insert(incident)
        inserted += 1

    # ── Report ─────────────────────────────────
    total = len(rows)
    print(f"\n{'='*60}")
    print(f"  RESULTADO DE CARGA DE INCIDENCIAS")
    print(f"{'='*60}")
    print(f"  Total filas en CSV       : {total}")
    print(f"  Insertadas               : {inserted}")
    print(f"  Inválidas (no insertadas) : {skipped_invalid}")
    print(f"  Duplicadas (omitidas)    : {skipped_duplicate}")
    print(f"{'='*60}")

    if invalid_details:
        print(f"\n  Detalle de registros inválidos:")
        for detail in invalid_details:
            print(detail)

    if args.dry_run and inserted == 0:
        print("\n  🟡 No se insertaría ningún registro (dry-run).")
    elif not args.dry_run and inserted == 0 and skipped_invalid == 0 and skipped_duplicate == 0:
        print("\n  🟡 No se encontraron filas en el CSV.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())