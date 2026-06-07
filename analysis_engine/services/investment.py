"""Services for single-company investment analysis."""

from __future__ import annotations

from typing import Optional

import pandas as pd

from analysis_engine.calculations import calculate_event_return, calculate_max_drawdown
from analysis_engine.data_access import load_events, load_prices
from analysis_engine.services.company import build_company_snapshot
from analysis_engine.services.comparison import build_investment_comparison
from analysis_engine.services.serialization import to_jsonable
from analysis_engine.utils import ceo_events, row_on_or_after, row_on_or_before


def build_investment_analysis(
    ticker: str,
    benchmark: str = "SPY",
    initial_amount: float = 10_000,
    years: Optional[float] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> dict:
    """Build a JSON-ready end-to-end company investment analysis."""
    ticker = ticker.upper()
    comparison = build_investment_comparison(
        ticker,
        benchmark,
        initial_amount,
        years=years,
        start_date=start_date,
        end_date=end_date,
    )

    prices = load_prices(ticker)
    events = load_events(ticker)
    resolved_start = pd.Timestamp(comparison["resolved_dates"]["start_date"])
    resolved_end = pd.Timestamp(comparison["resolved_dates"]["end_date"])
    path = prices[(prices["date"] >= resolved_start) & (prices["date"] <= resolved_end)].copy()
    start_row = row_on_or_after(path, resolved_start)
    path["wealth"] = initial_amount * path["adj_close"] / start_row["adj_close"]

    drawdown = calculate_max_drawdown(path["wealth"].tolist())
    ceo_event_table = ceo_events(events, resolved_start, resolved_end)

    return to_jsonable(
        {
            "input": {
                "ticker": ticker,
                "benchmark": benchmark.upper(),
                "initial_amount": initial_amount,
                "years": years,
                "start_date": start_date,
                "end_date": end_date,
            },
            "comparison": comparison,
            "company_snapshot": build_company_snapshot(ticker),
            "risk": {
                "max_drawdown": drawdown,
                "peak_date": path.iloc[drawdown.peak_index]["date"],
                "trough_date": path.iloc[drawdown.trough_index]["date"],
                "recovery_date": (
                    None
                    if drawdown.recovery_index is None
                    else path.iloc[drawdown.recovery_index]["date"]
                ),
            },
            "events": {
                "ceo_events": ceo_event_table.to_dict(orient="records"),
                "ceo_event_reactions": _build_ceo_event_reactions(
                    prices,
                    ceo_event_table,
                    periods_before=60,
                    periods_after=120,
                ),
            },
        }
    )


def _build_ceo_event_reactions(
    prices: pd.DataFrame,
    ceo_event_table: pd.DataFrame,
    periods_before: int,
    periods_after: int,
) -> list[dict]:
    reactions = []
    price_values = prices["adj_close"].tolist()
    for _, event in ceo_event_table.drop_duplicates(subset=["date"]).iterrows():
        event_row = row_on_or_after(prices, event["date"])
        reaction = calculate_event_return(
            price_values,
            int(event_row.name),
            periods_before=periods_before,
            periods_after=periods_after,
        )
        reactions.append(
            {
                "date": event["date"],
                "executive_name": event["executive_name"],
                "action": event["action"],
                "reaction": reaction,
            }
        )
    return reactions
