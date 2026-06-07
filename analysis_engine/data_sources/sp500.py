"""S&P 500 constituent and weight data.

The official S&P 500 constituent and weight feed is licensed by S&P Dow Jones
Indices. For the free MVP, use SPY holdings from State Street as a practical
daily proxy for current S&P 500 weights.
"""

from __future__ import annotations

import json
import re
from io import BytesIO
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

import pandas as pd


SPY_HOLDINGS_URL = (
    "https://www.ssga.com/library-content/products/fund-data/etfs/us/"
    "holdings-daily-us-en-spy.xlsx"
)


def fetch_spy_holdings(url: str = SPY_HOLDINGS_URL) -> dict[str, Any]:
    """Fetch and normalize the current SPY holdings file."""
    workbook, last_modified = _download_workbook(url)
    raw = pd.read_excel(workbook, header=None, engine="openpyxl")
    header_index = _find_header_row(raw)
    table = raw.iloc[header_index + 1 :].copy()
    table.columns = [_normalize_column(value) for value in raw.iloc[header_index]]
    table = table.dropna(how="all")

    ticker_col = _find_column(table, ["ticker", "identifier"])
    name_col = _find_column(table, ["name", "holding", "security name"])
    weight_col = _find_column(table, ["weight", "weight percent", "weight_pct"])
    sector_col = _find_column(table, ["sector"])
    shares_col = _find_column(table, ["shares held", "shares"])

    holdings = []
    for _, row in table.iterrows():
        ticker = _clean_text(row.get(ticker_col))
        weight = _parse_weight(row.get(weight_col))

        if not ticker or weight is None:
            continue
        if _is_non_tradable_holding(ticker, _clean_text(row.get(name_col))):
            continue

        holdings.append(
            {
                "ticker": ticker,
                "name": _clean_text(row.get(name_col)),
                "sector": _clean_text(row.get(sector_col)) if sector_col else None,
                "weight_percent": weight,
                "shares_held": _parse_number(row.get(shares_col)) if shares_col else None,
            }
        )

    return {
        "source": "State Street SPY daily holdings",
        "source_url": url,
        "benchmark_proxy": "SPY",
        "as_of": _find_as_of_date(raw) or last_modified,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "holdings_count": len(holdings),
        "holdings": holdings,
        "notes": [
            "SPY holdings are used as a free MVP proxy for current S&P 500 weights.",
            "The official S&P 500 constituent and weight feed is licensed by S&P Dow Jones Indices.",
            "Some companies have multiple share classes, so holdings count can be greater than 500.",
        ],
    }


def write_sp500_snapshot(output_path: Path | str) -> Path:
    """Write the normalized SPY/S&P 500 proxy snapshot to JSON."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = fetch_spy_holdings()
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def _download_workbook(url: str) -> tuple[BytesIO, str | None]:
    request = Request(url, headers={"User-Agent": "investment-story-analysis/0.1"})
    with urlopen(request) as response:
        payload = response.read()
        last_modified = response.headers.get("Last-Modified")
    return BytesIO(payload), last_modified


def _find_header_row(frame: pd.DataFrame) -> int:
    for index, row in frame.iterrows():
        values = {_normalize_column(value) for value in row.dropna().tolist()}
        if "ticker" in values and any("weight" in value for value in values):
            return index
    raise ValueError("Could not find holdings header row in SPY holdings file.")


def _find_column(frame: pd.DataFrame, candidates: list[str]) -> str | None:
    columns = list(frame.columns)
    for candidate in candidates:
        normalized = _normalize_column(candidate)
        for column in columns:
            if column == normalized:
                return column
    for candidate in candidates:
        normalized = _normalize_column(candidate)
        for column in columns:
            if normalized in column:
                return column
    return None


def _is_non_tradable_holding(ticker: str, name: str) -> bool:
    ticker_upper = ticker.upper()
    name_upper = name.upper()
    if ticker_upper in {"-", "USD", "CASH_USD", "CASH"}:
        return True
    if "DOLLAR" in name_upper or "CASH" in name_upper or name_upper.startswith("CONTRA "):
        return True
    return not any(character.isalpha() for character in ticker_upper)


def _normalize_column(value: Any) -> str:
    text = _clean_text(value).lower()
    text = text.replace("%", " percent ")
    return re.sub(r"[^a-z0-9]+", " ", text).strip().replace(" ", "_")


def _clean_text(value: Any) -> str:
    if value is None or pd.isna(value):
        return ""
    return str(value).strip()


def _parse_weight(value: Any) -> float | None:
    number = _parse_number(value)
    if number is None:
        return None
    return round(number, 6)


def _parse_number(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip().replace(",", "").replace("%", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _find_as_of_date(frame: pd.DataFrame) -> str | None:
    pattern = re.compile(r"as of\s+([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4}|\d{1,2}/\d{1,2}/\d{2,4})", re.I)
    for value in frame.astype(str).to_numpy().flatten():
        match = pattern.search(value)
        if match:
            return match.group(1)
    return None
