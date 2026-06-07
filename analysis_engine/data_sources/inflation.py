"""Fetch historical Consumer Price Index (CPI) data from World Bank.

World Bank indicator:
    FP.CPI.TOTL = Consumer price index (2010 = 100)

This module writes a frontend-ready inflation.json file with detailed
metadata, proxy documentation, and data quality metrics.

Example:
    python -m analysis_engine.data_sources.inflation
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

WORLD_BANK_CPI_INDICATOR = "FP.CPI.TOTL"

# Currency -> World Bank country/economy code.
CURRENCY_COUNTRY_MAP: dict[str, str] = {
    "USD": "US",
    "EUR": "DE,FR,IT,ES,FI",  # Composite Eurozone (Averaged index of DE, FR, IT, ES, FI)
    "EUR_DE": "DE",           # Germany
    "EUR_FR": "FR",           # France
    "EUR_IT": "IT",           # Italy
    "EUR_ES": "ES",           # Spain
    "EUR_FI": "FI",           # Finland
    "CAD": "CA",
    "EGP": "EG",
    "AED": "AE",
}

WORLD_BANK_API_URL = (
    "https://api.worldbank.org/v2/country/{country}/indicator/{indicator}"
)


def fetch_world_bank_cpi(
    country_code: str,
    start_year: int = 2000,
    requested_end_year: int | None = None,
) -> list[dict[str, Any]]:
    """Fetch annual CPI data for a single country code from World Bank."""
    if requested_end_year is None:
        requested_end_year = datetime.now(timezone.utc).year

    url = WORLD_BANK_API_URL.format(
        country=country_code,
        indicator=WORLD_BANK_CPI_INDICATOR,
    )

    params = {
        "format": "json",
        "per_page": 200,
        "date": f"{start_year}:{requested_end_year}",
    }

    # Rest rate limiter slightly to be gentle to World Bank API
    time.sleep(0.05)
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()

    data = response.json()

    if not isinstance(data, list) or len(data) < 2:
        return []

    rows = data[1]
    if not rows:
        return []

    records: list[dict[str, Any]] = []
    for row in rows:
        year_raw = row.get("date")
        value = row.get("value")

        if year_raw is None or value is None:
            continue

        records.append(
            {
                "year": int(year_raw),
                "cpi": round(float(value), 4),
            }
        )

    records.sort(key=lambda item: item["year"])
    return records


def add_annual_inflation_rates(
    cpi_records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Add annual inflation rate from CPI percentage change."""
    enriched: list[dict[str, Any]] = []

    previous_cpi: float | None = None

    for record in cpi_records:
        cpi = float(record["cpi"])

        if previous_cpi is None:
            annual_rate = None
        else:
            annual_rate = round((cpi - previous_cpi) / previous_cpi, 6)

        enriched.append(
            {
                "year": record["year"],
                "cpi": cpi,
                "annual_rate": annual_rate,
            }
        )

        previous_cpi = cpi

    return enriched


def compute_inflation_payload(
    start_year: int = 2000,
    requested_end_year: int | None = None,
) -> dict[str, Any]:
    """Fetch and construct the dynamic inflation payload with quality checks."""
    if requested_end_year is None:
        requested_end_year = datetime.now(timezone.utc).year

    # Temporary storage for raw fetched CPI records
    raw_data: dict[str, list[dict[str, Any]]] = {}

    # 1. Fetch stand-alone country CPI records
    for key, code in CURRENCY_COUNTRY_MAP.items():
        if key == "EUR":
            continue  # We will compute EUR proxy separately
        raw_data[key] = fetch_world_bank_cpi(
            country_code=code,
            start_year=start_year,
            requested_end_year=requested_end_year,
        )

    # 2. Compute EUR proxy dynamically by averaging DE, FR, IT, ES, FI on overlapping years
    eur_countries = ["EUR_DE", "EUR_FR", "EUR_IT", "EUR_ES", "EUR_FI"]
    yearly_cpi_groups: dict[int, list[float]] = {}

    for ec in eur_countries:
        for rec in raw_data.get(ec, []):
            year = rec["year"]
            yearly_cpi_groups.setdefault(year, []).append(rec["cpi"])

    eur_cpi_records = []
    for year in sorted(yearly_cpi_groups.keys()):
        vals = yearly_cpi_groups[year]
        # Only compute EUR if ALL 5 selected countries have data for this year (overlapping years only)
        if len(vals) == len(eur_countries):
            eur_cpi_records.append({
                "year": year,
                "cpi": round(sum(vals) / len(vals), 4),
            })

    raw_data["EUR"] = eur_cpi_records

    # 3. Essential series validation - fail fast on empty/missing essential series
    for essential in ["USD", "EUR"]:
        if not raw_data.get(essential):
            raise ValueError(f"Essential series '{essential}' is empty or failed to load. Aborting.")

    # 4. Enrich CPI records with annual inflation rates (CPI percentage change)
    inflation: dict[str, list[dict[str, Any]]] = {}
    for key, cpi_records in raw_data.items():
        inflation[key] = add_annual_inflation_rates(cpi_records)

    # 5. Determine the latest available year across all processed series
    all_years = [
        item["year"]
        for series in inflation.values()
        for item in series
    ]
    latest_available_year = max(all_years) if all_years else requested_end_year

    # 6. Build source details with data quality and proxy metadata
    source_details: dict[str, Any] = {}
    for key in CURRENCY_COUNTRY_MAP.keys():
        series = inflation.get(key, [])
        fetched_years = {item["year"] for item in series}
        
        # Calculate data quality
        total_years_fetched = len(series)
        full_range = set(range(start_year, requested_end_year + 1))
        missing_years = sorted(list(full_range - fetched_years))
        
        has_gaps = False
        if series:
            min_year = min(fetched_years)
            max_year = max(fetched_years)
            fetched_range = set(range(min_year, max_year + 1))
            has_gaps = len(fetched_range - fetched_years) > 0

        data_quality = {
            "total_years_fetched": total_years_fetched,
            "missing_years": missing_years,
            "has_gaps": has_gaps,
        }

        # Handle EUR Proxy metadata
        is_proxy = key == "EUR"
        method = "Averaged index of DE, FR, IT, ES, FI on overlapping years" if is_proxy else None
        note = (
            "Euro Area CPI aggregate FP.CPI.TOTL is not available in World Bank API for recent years. "
            "A composite averaged CPI index of Germany, France, Italy, Spain, and Finland is used as a robust proxy."
            if is_proxy else None
        )

        source_details[key] = {
            "country_code": CURRENCY_COUNTRY_MAP[key],
            "indicator": WORLD_BANK_CPI_INDICATOR,
            "source": "World Bank World Development Indicators",
            "original_source": "IMF International Financial Statistics",
            "unit": "Consumer price index, 2010 = 100",
            "is_proxy": is_proxy,
            "method": method,
            "note": note,
            "data_quality": data_quality,
        }

    return {
        "source": "World Bank FP.CPI.TOTL",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "base_year": 2010,
        "start_year": start_year,
        "requested_end_year": requested_end_year,
        "latest_available_year": latest_available_year,
        "currencies": list(CURRENCY_COUNTRY_MAP.keys()),
        "source_details": source_details,
        "inflation": inflation,
    }


def write_inflation_history(
    output_dir: Path | str,
    start_year: int = 2000,
    requested_end_year: int | None = None,
) -> Path:
    """Fetch CPI data and write inflation.json."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    payload = compute_inflation_payload(
        start_year=start_year,
        requested_end_year=requested_end_year,
    )

    file_path = output_path / "inflation.json"
    file_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    return file_path


if __name__ == "__main__":
    path = write_inflation_history(
        output_dir=Path("public/data/inflation"),
        start_year=2000,
    )
    print(f"Wrote {path}")
