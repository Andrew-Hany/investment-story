"""Historical price, dividend, and split data from Yahoo Finance."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import yfinance as yf

from analysis_engine.data_sources.egx30 import load_egx30_tickers
from analysis_engine.data_sources.nasdaq100 import load_nasdaq100_tickers


DEFAULT_INTERVAL = "1d"
YAHOO_SUFFIXES_TO_PRESERVE = (".CA",)


def yahoo_symbol_for_ticker(ticker: str) -> str:
    """Convert app tickers to Yahoo Finance symbols."""
    normalized = ticker.strip().upper()
    if normalized.startswith("^") or normalized.endswith(YAHOO_SUFFIXES_TO_PRESERVE):
        return normalized
    return normalized.replace(".", "-")


def load_sp500_tickers(sp500_path: Path | str, include_benchmark: bool = True) -> list[str]:
    """Load tickers from the generated SPY/S&P 500 proxy holdings JSON."""
    data = json.loads(Path(sp500_path).read_text(encoding="utf-8"))
    tickers = [holding["ticker"] for holding in data["holdings"] if holding.get("ticker")]

    if include_benchmark and "SPY" not in tickers:
        tickers.insert(0, "SPY")

    return _dedupe(tickers)


def fetch_price_history(
    tickers: list[str],
    start: str | None = None,
    end: str | None = None,
    period: str = "max",
    interval: str = DEFAULT_INTERVAL,
) -> dict[str, dict[str, Any]]:
    """Fetch historical OHLCV, adjusted close, dividends, and splits for tickers."""
    symbol_map = {yahoo_symbol_for_ticker(ticker): ticker for ticker in _dedupe(tickers)}
    yahoo_symbols = list(symbol_map.keys())

    download_kwargs = {
        "tickers": yahoo_symbols,
        "interval": interval,
        "auto_adjust": False,
        "actions": True,
        "group_by": "ticker",
        "threads": True,
        "progress": False,
    }
    if start or end:
        download_kwargs["start"] = start
        download_kwargs["end"] = end
    else:
        download_kwargs["period"] = period

    frame = yf.download(**download_kwargs)
    return _frame_to_price_payloads(frame, symbol_map, start, end, period, interval)


def write_price_history(
    tickers: list[str],
    output_dir: Path | str,
    start: str | None = None,
    end: str | None = None,
    period: str = "max",
    interval: str = DEFAULT_INTERVAL,
    batch_size: int = 50,
    skip_existing: bool = True,
) -> list[Path]:
    """Fetch price history in batches and write one JSON file per ticker."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    written_paths = []
    fetch_tickers = [
        ticker
        for ticker in _dedupe(tickers)
        if not skip_existing or not (output_path / f"{_filename_for_ticker(ticker)}.json").exists()
    ]

    for batch in _chunks(fetch_tickers, batch_size):
        payloads = fetch_price_history(
            batch,
            start=start,
            end=end,
            period=period,
            interval=interval,
        )

        for ticker, payload in payloads.items():
            path = output_path / f"{_filename_for_ticker(ticker)}.json"
            path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
            written_paths.append(path)

    return written_paths


def write_sp500_price_history(
    sp500_path: Path | str,
    output_dir: Path | str,
    start: str | None = None,
    end: str | None = None,
    period: str = "max",
    interval: str = DEFAULT_INTERVAL,
    batch_size: int = 50,
    limit: int | None = None,
    include_benchmark: bool = True,
    skip_existing: bool = True,
) -> list[Path]:
    """Write price history for SPY plus all holdings in the SPY/S&P 500 proxy JSON."""
    tickers = load_sp500_tickers(sp500_path, include_benchmark=include_benchmark)
    if limit is not None:
        tickers = tickers[:limit]

    return write_price_history(
        tickers=tickers,
        output_dir=output_dir,
        start=start,
        end=end,
        period=period,
        interval=interval,
        batch_size=batch_size,
        skip_existing=skip_existing,
    )


def write_egx30_price_history(
    egx30_path: Path | str,
    output_dir: Path | str,
    start: str | None = None,
    end: str | None = None,
    period: str = "max",
    interval: str = DEFAULT_INTERVAL,
    batch_size: int = 20,
    limit: int | None = None,
    include_benchmark: bool = True,
    skip_existing: bool = True,
) -> list[Path]:
    """Write price history for the EGX 30 index proxy plus current constituents."""
    tickers = load_egx30_tickers(egx30_path, include_benchmark=include_benchmark)
    if limit is not None:
        tickers = tickers[:limit]

    return write_price_history(
        tickers=tickers,
        output_dir=output_dir,
        start=start,
        end=end,
        period=period,
        interval=interval,
        batch_size=batch_size,
        skip_existing=skip_existing,
    )


def write_nasdaq100_price_history(
    nasdaq100_path: Path | str,
    output_dir: Path | str,
    start: str | None = None,
    end: str | None = None,
    period: str = "max",
    interval: str = DEFAULT_INTERVAL,
    batch_size: int = 50,
    limit: int | None = None,
    include_benchmark: bool = True,
    skip_existing: bool = True,
) -> list[Path]:
    """Write price history for QQQ plus current Nasdaq-100 proxy holdings."""
    tickers = load_nasdaq100_tickers(nasdaq100_path, include_benchmark=include_benchmark)
    if limit is not None:
        tickers = tickers[:limit]

    return write_price_history(
        tickers=tickers,
        output_dir=output_dir,
        start=start,
        end=end,
        period=period,
        interval=interval,
        batch_size=batch_size,
        skip_existing=skip_existing,
    )


def _frame_to_price_payloads(
    frame: pd.DataFrame,
    symbol_map: dict[str, str],
    start: str | None,
    end: str | None,
    period: str,
    interval: str,
) -> dict[str, dict[str, Any]]:
    payloads = {}

    for yahoo_symbol, ticker in symbol_map.items():
        ticker_frame = _select_ticker_frame(frame, yahoo_symbol, len(symbol_map))
        if ticker_frame is None or ticker_frame.empty:
            continue

        rows = []
        ticker_frame = ticker_frame.dropna(how="all")
        for date, row in ticker_frame.iterrows():
            close = _clean_number(row.get("Close"))
            adj_close = _clean_number(row.get("Adj Close"))
            if close is None and adj_close is None:
                continue

            rows.append(
                {
                    "date": date.strftime("%Y-%m-%d"),
                    "open": _clean_number(row.get("Open")),
                    "high": _clean_number(row.get("High")),
                    "low": _clean_number(row.get("Low")),
                    "close": close,
                    "adj_close": adj_close,
                    "volume": _clean_number(row.get("Volume")),
                    "dividends": _clean_number(row.get("Dividends")) or 0,
                    "stock_splits": _clean_number(row.get("Stock Splits")) or 0,
                }
            )

        if not rows:
            continue

        payloads[ticker] = {
            "ticker": ticker,
            "yahoo_symbol": yahoo_symbol,
            "source": "Yahoo Finance via yfinance",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "query": {
                "start": start,
                "end": end,
                "period": None if start or end else period,
                "interval": interval,
            },
            "row_count": len(rows),
            "prices": rows,
        }

    return payloads


def _select_ticker_frame(frame: pd.DataFrame, yahoo_symbol: str, symbol_count: int) -> pd.DataFrame | None:
    if frame.empty:
        return None

    if isinstance(frame.columns, pd.MultiIndex):
        if yahoo_symbol not in frame.columns.get_level_values(0):
            return None
        return frame[yahoo_symbol]

    if symbol_count == 1:
        return frame

    return None


def _clean_number(value: Any) -> float | int | None:
    if value is None or pd.isna(value):
        return None
    number = float(value)
    if number.is_integer():
        return int(number)
    return round(number, 6)


def _dedupe(values: list[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        normalized = value.strip().upper()
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


def _chunks(values: list[str], size: int):
    for index in range(0, len(values), size):
        yield values[index : index + size]


def _filename_for_ticker(ticker: str) -> str:
    return ticker.replace("/", "-")


def write_gold_price_history(
    output_dir: Path | str,
    start: str | None = None,
    end: str | None = None,
    period: str = "max",
    interval: str = DEFAULT_INTERVAL,
) -> list[Path]:
    """Write price history for Gold futures (GC=F) and Gold ETF (GLD)."""
    tickers = ["GLD", "GC=F"]
    return write_price_history(
        tickers=tickers,
        output_dir=output_dir,
        start=start,
        end=end,
        period=period,
        interval=interval,
        skip_existing=False,
    )

