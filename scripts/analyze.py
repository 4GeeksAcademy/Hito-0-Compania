#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
ANALYZER_SRC = ROOT_DIR / "services" / "api"
if str(ANALYZER_SRC) not in sys.path:
    sys.path.insert(0, str(ANALYZER_SRC))

from incident_analyzer import (  # noqa: E402
    analyze_incidents,
    compare_expected,
    flatten_summary_to_rows,
    parse_incidents_csv,
)


DEFAULT_EXPECTED_PATH = ROOT_DIR / "data" / "eval" / "incidencias_expected_metrics.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analiza incidencias desde un CSV y valida métricas esperadas."
    )
    parser.add_argument(
        "csv_path",
        help="Ruta al fichero CSV de incidencias. Ejemplo: python analyze.py incidents-COMPANY.csv",
    )
    parser.add_argument(
        "--expected",
        default=str(DEFAULT_EXPECTED_PATH),
        help="Ruta al JSON con valores esperados para verificación exacta.",
    )
    return parser.parse_args()


def print_section(title: str) -> None:
    print("\n" + "=" * 76)
    print(title)
    print("=" * 76)


def print_key_values(data: dict[str, object], label_width: int = 42) -> None:
    for key, value in data.items():
        print(f"{key:<{label_width}} : {value}")


def print_breakdown(title: str, data: dict[str, object]) -> None:
    print(f"\n{title}")
    print("-" * 76)
    print_key_values(data)


def export_results_csv(output_path: Path, summary: dict[str, object]) -> None:
    rows = flatten_summary_to_rows(summary)
    with output_path.open("w", encoding="utf-8", newline="") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=["section", "metric", "value"])
        writer.writeheader()
        writer.writerows(rows)


def ask_export() -> bool:
    prompt = "\n¿Deseas exportar los resultados a CSV? [s / n]: "
    try:
        answer = input(prompt).strip().lower()
    except EOFError:
        return False
    return answer == "s"


def main() -> int:
    args = parse_args()
    csv_path = Path(args.csv_path)
    expected_path = Path(args.expected)

    if not csv_path.exists():
        print(f"Error: no existe el archivo CSV: {csv_path}")
        return 1

    csv_content = csv_path.read_text(encoding="utf-8")

    try:
        rows = parse_incidents_csv(csv_content)
    except ValueError as exc:
        print(f"Error de estructura CSV: {exc}")
        return 1

    summary = analyze_incidents(rows)

    print_section("RESUMEN DE ANALISIS DE INCIDENCIAS")
    print(f"Archivo analizado{'':<32}: {csv_path}")

    print_breakdown("Totales de procesamiento", summary["totals"])
    print_breakdown("Totalizacion por categoria", summary["breakdowns"]["by_category"])
    print_breakdown("Totalizacion por estado", summary["breakdowns"]["by_status"])
    print_breakdown(
        "Registros invalidos por tipo de problema",
        summary["breakdowns"]["invalid_by_rule"],
    )

    print_breakdown("KPIs", summary["kpis"])
    print(
        f"\nIndice de satisfaccion medio en cerrados con puntuacion: "
        f"{summary['kpis'].get('avg_satisfaction_closed')}"
    )

    print_section("VERIFICACION CONTRA VALORES ESPERADOS")
    if expected_path.exists():
        expected = json.loads(expected_path.read_text(encoding="utf-8"))
        mismatches = compare_expected(summary, expected)
        if mismatches:
            print("Resultado: FALLA")
            for mismatch in mismatches:
                print(f"- {mismatch}")
            status_code = 1
        else:
            print("Resultado: OK (coincide exactamente con valores esperados)")
            status_code = 0
    else:
        print(f"Advertencia: no se encontro archivo expected en {expected_path}")
        status_code = 1

    if ask_export():
        output_path = Path(os.getcwd()) / "results.csv"
        export_results_csv(output_path, summary)
        print(f"Resultados exportados en: {output_path}")
    else:
        print("Exportacion omitida.")

    return status_code


if __name__ == "__main__":
    raise SystemExit(main())