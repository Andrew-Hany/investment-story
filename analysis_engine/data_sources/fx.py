"""Historical foreign exchange data from Yahoo Finance."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import yfinance as yf


DEFAULT_CURRENCIES = ["USD", "EUR", "EGP", "CAD", "AED"]
DEFAULT_INTERVAL = "1d"


def yahoo_fx_symbol(from_currency: str, to_currency: str) -> str:
    """Return Yahoo Finance's symbol for a currency pair."""
    return f"{from_currency.upper()}{to_currency.upper()}=X"


def build_currency_pairs(currencies: list[str]) -> list[tuple[str, str]]:
    """Build all directed currency pairs, excluding same-currency pairs."""
    normalized = [currency.upper().strip() for currency in currencies]
    return [
        (from_currency, to_currency)
        for from_currency in normalized
        for to_currency in normalized
        if from_currency != to_currency
    ]


def fetch_fx_history(
    from_currency: str,
    to_currency: str,
    start: str | None = None,
    end: str | None = None,
    period: str = "max",
    interval: str = DEFAULT_INTERVAL,
) -> dict[str, Any]:
    """Fetch one currency pair history."""
    symbol = yahoo_fx_symbol(from_currency, to_currency)
    download_kwargs = {
        "tickers": symbol,
        "interval": interval,
        "auto_adjust": False,
        "actions": False,
        "progress": False,
    }
    if start or end:
        download_kwargs["start"] = start
        download_kwargs["end"] = end
    else:
        download_kwargs["period"] = period

    frame = yf.download(**download_kwargs)
    rates = _frame_to_rates(frame)

    return {
        "from_currency": from_currency.upper(),
        "to_currency": to_currency.upper(),
        "pair": f"{from_currency.upper()}_{to_currency.upper()}",
        "yahoo_symbol": symbol,
        "source": "Yahoo Finance via yfinance",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "query": {
            "start": start,
            "end": end,
            "period": None if start or end else period,
            "interval": interval,
        },
        "row_count": len(rates),
        "rates": rates,
    }


def write_fx_history(
    currencies: list[str],
    output_dir: Path | str,
    start: str | None = None,
    end: str | None = None,
    period: str = "max",
    interval: str = DEFAULT_INTERVAL,
) -> list[Path]:
    """Write one JSON file for every directed from/to currency pair."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    payloads = {}
    for from_currency, to_currency in build_currency_pairs(currencies):
        payloads[(from_currency, to_currency)] = fetch_fx_history(
            from_currency=from_currency,
            to_currency=to_currency,
            start=start,
            end=end,
            period=period,
            interval=interval,
        )

    for from_currency, to_currency in build_currency_pairs(currencies):
        if from_currency != "USD" and to_currency != "USD":
            derived = _derive_cross_via_usd(
                from_payload=payloads.get((from_currency, "USD")),
                to_payload=payloads.get(("USD", to_currency)),
                from_currency=from_currency,
                to_currency=to_currency,
                start=start,
                end=end,
                period=period,
                interval=interval,
            )
            if derived["row_count"] > payloads[(from_currency, to_currency)]["row_count"]:
                payloads[(from_currency, to_currency)] = derived

    written_paths = []
    for from_currency, to_currency in build_currency_pairs(currencies):
        payload = payloads[(from_currency, to_currency)]
        path = output_path / f"{from_currency}_{to_currency}.json"
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        written_paths.append(path)

    return written_paths


def _derive_cross_via_usd(
    from_payload: dict[str, Any] | None,
    to_payload: dict[str, Any] | None,
    from_currency: str,
    to_currency: str,
    start: str | None,
    end: str | None,
    period: str,
    interval: str,
) -> dict[str, Any]:
    from_rates = _rates_by_date(from_payload)
    to_rates = _rates_by_date(to_payload)
    dates = sorted(set(from_rates).intersection(to_rates))

    rates = []
    for date in dates:
        rates.append(
            {
                "date": date,
                "rate": round(from_rates[date] * to_rates[date], 6),
                "derived_from": [
                    f"{from_currency}_USD",
                    f"USD_{to_currency}",
                ],
            }
        )

    return {
        "from_currency": from_currency,
        "to_currency": to_currency,
        "pair": f"{from_currency}_{to_currency}",
        "yahoo_symbol": None,
        "source": "Derived from Yahoo Finance USD legs via yfinance",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "query": {
            "start": start,
            "end": end,
            "period": None if start or end else period,
            "interval": interval,
        },
        "row_count": len(rates),
        "rates": rates,
    }


def _rates_by_date(payload: dict[str, Any] | None) -> dict[str, float]:
    if not payload:
        return {}
    return {
        row["date"]: float(row["rate"])
        for row in payload.get("rates", [])
        if row.get("rate") is not None
    }


def _frame_to_rates(frame: pd.DataFrame) -> list[dict[str, Any]]:
    if frame.empty:
        return []

    if isinstance(frame.columns, pd.MultiIndex):
        frame = frame.droplevel(1, axis=1)

    rates = []
    frame = frame.dropna(how="all")
    for date, row in frame.iterrows():
        close = _clean_number(row.get("Close"))
        adj_close = _clean_number(row.get("Adj Close"))
        rate = adj_close if adj_close is not None else close
        if rate is None:
            continue

        rates.append(
            {
                "date": date.strftime("%Y-%m-%d"),
                "rate": rate,
                "open": _clean_number(row.get("Open")),
                "high": _clean_number(row.get("High")),
                "low": _clean_number(row.get("Low")),
                "close": close,
                "adj_close": adj_close,
            }
        )

    return rates


def _clean_number(value: Any) -> float | int | None:
    if value is None or pd.isna(value):
        return None
    number = float(value)
    if number.is_integer():
        return int(number)
    return round(number, 6)
