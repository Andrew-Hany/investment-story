"""Read generated public/data JSON into analysis-friendly structures."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATA_DIR = PROJECT_ROOT / "public" / "data"


def load_json(path: Path) -> Any:
    """Load a JSON file from disk."""
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def load_prices(ticker: str, data_dir: Path = DEFAULT_DATA_DIR) -> pd.DataFrame:
    """Load a ticker price file as a date-sorted DataFrame."""
    payload = load_json(data_dir / "prices" / f"{ticker.upper()}.json")
    frame = pd.DataFrame(payload["prices"])
    frame["date"] = pd.to_datetime(frame["date"])
    return frame.sort_values("date").reset_index(drop=True)


def load_fundamentals(ticker: str, data_dir: Path = DEFAULT_DATA_DIR) -> dict[str, Any]:
    """Load a ticker fundamentals file."""
    return load_json(data_dir / "fundamentals" / f"{ticker.upper()}.json")


def load_events(ticker: str, data_dir: Path = DEFAULT_DATA_DIR) -> dict[str, Any]:
    """Load a ticker events file."""
    return load_json(data_dir / "events" / f"{ticker.upper()}.json")


def annual_statement_rows(fundamentals: dict[str, Any], statement_name: str) -> pd.DataFrame:
    """Return annual statement rows as a date-sorted DataFrame."""
    rows = fundamentals["annual"][statement_name]
    frame = pd.DataFrame(
        [{"period_end": row["period_end"], **row["values"]} for row in rows]
    )
    return frame.sort_values("period_end").reset_index(drop=True)
