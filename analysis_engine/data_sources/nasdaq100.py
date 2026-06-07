"""Nasdaq-100 constituent data.

The official Nasdaq-100 constituent and weight feed is licensed. For this app,
use the public constituent table and QQQ as the benchmark proxy.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

import pandas as pd


NASDAQ100_CONSTITUENTS_URL = "https://en.wikipedia.org/wiki/Nasdaq-100"


def fetch_nasdaq100_constituents(url: str = NASDAQ100_CONSTITUENTS_URL) -> dict[str, Any]:
    """Fetch and normalize current Nasdaq-100 constituents."""
    html = _download_html(url)
    tables = pd.read_html(StringIO(html))
    table = _find_constituents_table(tables)
    if table is None:
        raise ValueError("Could not find Nasdaq-100 constituents table.")

    holdings = []
    for _, row in table.iterrows():
        ticker = _clean_text(row.get("Ticker"))
        name = _clean_text(row.get("Company"))
        sector = _clean_text(row.get("ICB Industry[14]"))
        industry = _clean_text(row.get("ICB Subsector[14]"))

        if not ticker or not name:
            continue
        if _is_non_tradable_holding(ticker, name):
            continue

        holdings.append(
            {
                "ticker": ticker,
                "name": name,
                "sector": sector,
                "industry": industry,
                "currency": "USD",
            }
        )

    return {
        "source": "Wikipedia Nasdaq-100 constituents, with QQQ as benchmark proxy",
        "source_url": url,
        "benchmark_proxy": "QQQ",
        "as_of": datetime.now(timezone.utc).date().isoformat(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "holdings_count": len(holdings),
        "holdings": holdings,
        "notes": [
            "The official Nasdaq-100 constituent and weight feed is licensed.",
            "QQQ is used as a practical benchmark proxy for Nasdaq-100 comparisons.",
            "The constituent list can include multiple share classes, so holdings count can be greater than 100.",
        ],
    }


def load_nasdaq100_tickers(nasdaq100_path: Path | str, include_benchmark: bool = True) -> list[str]:
    """Load Yahoo Finance tickers from the generated QQQ/Nasdaq-100 JSON."""
    data = json.loads(Path(nasdaq100_path).read_text(encoding="utf-8"))
    tickers = [holding["ticker"] for holding in data["holdings"] if holding.get("ticker")]

    if include_benchmark and "QQQ" not in tickers:
        tickers.insert(0, "QQQ")

    return _dedupe(tickers)


def load_nasdaq100_company_names(nasdaq100_path: Path | str) -> dict[str, str]:
    """Load display names keyed by Yahoo Finance ticker from the Nasdaq-100 JSON."""
    data = json.loads(Path(nasdaq100_path).read_text(encoding="utf-8"))
    return {
        holding["ticker"].strip().upper(): holding["name"]
        for holding in data["holdings"]
        if holding.get("ticker") and holding.get("name")
    }


def write_nasdaq100_snapshot(output_path: Path | str) -> Path:
    """Write the normalized QQQ/Nasdaq-100 proxy snapshot to JSON."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = fetch_nasdaq100_constituents()
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def _download_html(url: str) -> str:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 investment-story-analysis/0.1"})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def _find_constituents_table(tables: list[pd.DataFrame]) -> pd.DataFrame | None:
    for table in tables:
        columns = {str(column) for column in table.columns}
        if {"Ticker", "Company"}.issubset(columns):
            return table
    return None


def _is_non_tradable_holding(ticker: str, name: str) -> bool:
    ticker_upper = ticker.upper()
    name_upper = name.upper()
    if ticker_upper in {"-", "USD", "CASH", "CASH_USD"}:
        return True
    if "CASH" in name_upper or "FUTURE" in name_upper:
        return True
    return not any(character.isalpha() for character in ticker_upper)


def _clean_text(value: Any) -> str:
    if value is None or pd.isna(value):
        return ""
    return str(value).strip()


def _dedupe(values: list[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        normalized = value.strip().upper()
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result
