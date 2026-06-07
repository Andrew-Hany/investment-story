"""Historical corporate events, dividends, milestones, and news data from Yahoo Finance."""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import yfinance as yf

from analysis_engine.data_sources.egx30 import load_egx30_tickers
from analysis_engine.data_sources.nasdaq100 import load_nasdaq100_tickers
from analysis_engine.data_sources.prices import load_sp500_tickers, yahoo_symbol_for_ticker


def fetch_events(ticker: str) -> dict[str, Any]:
    """Fetch earnings announcements, dividend payments, stock splits, and recent news from Yahoo Finance."""
    yahoo_symbol = yahoo_symbol_for_ticker(ticker)
    yahoo_ticker = yf.Ticker(yahoo_symbol)

    timeline_events = []

    # 1. Earnings History
    try:
        df = yahoo_ticker.get_earnings_dates()
        if df is not None and not df.empty:
            df = df.dropna(how="all")
            for timestamp, row in df.iterrows():
                date_str = pd.Timestamp(timestamp).strftime("%Y-%m-%d")
                est = _clean_number(row.get("EPS Estimate"))
                act = _clean_number(row.get("Reported EPS"))
                surp = _clean_number(row.get("Surprise(%)"))
                
                desc = "Earnings Announcement"
                if act is not None:
                    desc += f" (Reported EPS: {act}"
                    if est is not None:
                        desc += f" vs Est: {est}"
                    if surp is not None:
                        desc += f", Surprise: {surp:+.2f}%"
                    desc += ")"
                elif est is not None:
                    desc += f" (Estimated EPS: {est})"
                    
                timeline_events.append({
                    "date": date_str,
                    "event_type": "Earnings Announcement",
                    "description": desc,
                    "details": {
                        "eps_estimate": est,
                        "eps_actual": act,
                        "surprise_pct": surp
                    }
                })
    except Exception as e:
        print(f"Error fetching earnings dates for {ticker}: {e}")

    # 2. Historical Dividends
    try:
        divs = yahoo_ticker.dividends
        if divs is not None and not divs.empty:
            for timestamp, value in divs.items():
                date_str = pd.Timestamp(timestamp).strftime("%Y-%m-%d")
                timeline_events.append({
                    "date": date_str,
                    "event_type": "Dividend Payment",
                    "description": f"Paid Dividend: ${value:.4f} per share",
                    "details": {
                        "value": _clean_number(value)
                    }
                })
    except Exception as e:
        print(f"Error fetching dividends for {ticker}: {e}")

    # 3. Stock Splits (Automated)
    try:
        splits = yahoo_ticker.splits
        if splits is not None and not splits.empty:
            for timestamp, value in splits.items():
                date_str = pd.Timestamp(timestamp).strftime("%Y-%m-%d")
                if value > 1:
                    desc = f"Stock Split: {int(value)} shares for 1" if value.is_integer() else f"Stock Split: {value:.2f} for 1"
                else:
                    reciprocal = 1 / value
                    desc = f"Reverse Stock Split: 1 share for {int(reciprocal)}" if reciprocal.is_integer() else f"Reverse Stock Split: 1 for {reciprocal:.2f}"
                timeline_events.append({
                    "date": date_str,
                    "event_type": "Stock Split",
                    "description": desc,
                    "details": {
                        "ratio": _clean_number(value)
                    }
                })
    except Exception as e:
        print(f"Error fetching stock splits for {ticker}: {e}")


    # Sort the unified events list chronologically (newest first)
    timeline_events.sort(key=lambda x: x["date"], reverse=True)

    # 6. Upcoming Calendar Events (earnings, dividends)
    upcoming_events = {}
    try:
        cal = yahoo_ticker.calendar
        if cal:
            if "Earnings Date" in cal and cal["Earnings Date"]:
                upcoming_events["earnings_dates"] = [
                    d.strftime("%Y-%m-%d") for d in cal["Earnings Date"] if hasattr(d, "strftime")
                ]
            if "Dividend Date" in cal and cal["Dividend Date"]:
                upcoming_events["dividend_date"] = cal["Dividend Date"].strftime("%Y-%m-%d") if hasattr(cal["Dividend Date"], "strftime") else str(cal["Dividend Date"])
            if "Ex-Dividend Date" in cal and cal["Ex-Dividend Date"]:
                upcoming_events["ex_dividend_date"] = cal["Ex-Dividend Date"].strftime("%Y-%m-%d") if hasattr(cal["Ex-Dividend Date"], "strftime") else str(cal["Ex-Dividend Date"])
    except Exception as e:
        print(f"Error fetching calendar events for {ticker}: {e}")

    # 7. Recent News
    recent_news = []
    try:
        news_list = yahoo_ticker.news
        if news_list:
            for item in news_list:
                content = item.get("content", {})
                title = content.get("title")
                pub_date = content.get("pubDate")
                canonical_url = content.get("canonicalUrl", {})
                link = canonical_url.get("url") if isinstance(canonical_url, dict) else canonical_url
                provider = content.get("provider", {})
                publisher = provider.get("displayName") if isinstance(provider, dict) else provider
                
                recent_news.append({
                    "title": title,
                    "publisher": publisher,
                    "link": link,
                    "published_at": pub_date,
                    "type": content.get("contentType", "STORY")
                })
    except Exception as e:
        print(f"Error fetching news for {ticker}: {e}")

    return {
        "ticker": ticker.upper(),
        "yahoo_symbol": yahoo_symbol,
        "source": "Yahoo Finance via yfinance",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "timeline_events": timeline_events,
        "upcoming_events": upcoming_events,
        "recent_news": recent_news
    }


def write_events(
    tickers: list[str],
    output_dir: Path | str,
    pause_seconds: float = 0.25,
    skip_existing: bool = True,
) -> list[Path]:
    """Write corporate events JSON files for a list of tickers."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    written_paths = []
    for ticker in _dedupe(tickers):
        path = output_path / f"{_filename_for_ticker(ticker)}.json"
        if skip_existing and path.exists():
            continue

        payload = fetch_events(ticker)
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        written_paths.append(path)
        if pause_seconds:
            time.sleep(pause_seconds)

    return written_paths


def write_sp500_events(
    sp500_path: Path | str,
    output_dir: Path | str,
    limit: int | None = None,
    pause_seconds: float = 0.25,
    skip_existing: bool = True,
) -> list[Path]:
    """Write events for the S&P 500 proxy holdings."""
    tickers = load_sp500_tickers(sp500_path, include_benchmark=False)
    if limit is not None:
        tickers = tickers[:limit]
    return write_events(tickers, output_dir, pause_seconds=pause_seconds, skip_existing=skip_existing)


def write_egx30_events(
    egx30_path: Path | str,
    output_dir: Path | str,
    limit: int | None = None,
    pause_seconds: float = 0.25,
    skip_existing: bool = True,
) -> list[Path]:
    """Write Yahoo events for the current EGX 30 holdings."""
    tickers = load_egx30_tickers(egx30_path, include_benchmark=False)
    if limit is not None:
        tickers = tickers[:limit]
    return write_events(tickers, output_dir, pause_seconds=pause_seconds, skip_existing=skip_existing)


def write_nasdaq100_events(
    nasdaq100_path: Path | str,
    output_dir: Path | str,
    limit: int | None = None,
    pause_seconds: float = 0.25,
    skip_existing: bool = True,
) -> list[Path]:
    """Write events for the current Nasdaq-100 proxy holdings."""
    tickers = load_nasdaq100_tickers(nasdaq100_path, include_benchmark=False)
    if limit is not None:
        tickers = tickers[:limit]
    return write_events(tickers, output_dir, pause_seconds=pause_seconds, skip_existing=skip_existing)


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


def _filename_for_ticker(ticker: str) -> str:
    return ticker.replace("/", "-")
