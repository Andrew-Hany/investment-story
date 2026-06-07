"""Services for side-by-side investment comparisons."""

from __future__ import annotations

from typing import Optional

import pandas as pd

from analysis_engine.calculations import compare_investments
from analysis_engine.data_access import load_prices
from analysis_engine.services.serialization import to_jsonable
from analysis_engine.utils import row_on_or_after, row_on_or_before


def build_investment_comparison(
    first_ticker: str,
    second_ticker: str,
    initial_amount: float,
    years: Optional[float] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> dict:
    """Build a JSON-ready comparison for two buy-and-hold investments."""
    first_prices = load_prices(first_ticker)
    second_prices = load_prices(second_ticker)

    actual_end = _resolve_end_date(first_prices, second_prices, end_date)
    actual_start = _resolve_start_date(actual_end, years, start_date)

    first_start = row_on_or_after(first_prices, actual_start)
    first_end = row_on_or_before(first_prices, actual_end)
    second_start = row_on_or_after(second_prices, actual_start)
    second_end = row_on_or_before(second_prices, actual_end)
    actual_years = (first_end["date"] - first_start["date"]).days / 365.25

    comparison = compare_investments(
        first_ticker.upper(),
        first_start["adj_close"],
        first_end["adj_close"],
        second_ticker.upper(),
        second_start["adj_close"],
        second_end["adj_close"],
        initial_amount,
        years=actual_years,
    )

    return to_jsonable(
        {
            "input": {
                "first_ticker": first_ticker.upper(),
                "second_ticker": second_ticker.upper(),
                "initial_amount": initial_amount,
                "years": years,
                "start_date": start_date,
                "end_date": end_date,
            },
            "resolved_dates": {
                "start_date": first_start["date"],
                "end_date": first_end["date"],
                "years": actual_years,
            },
            "comparison": comparison,
        }
    )


def _resolve_end_date(
    first_prices: pd.DataFrame,
    second_prices: pd.DataFrame,
    end_date: Optional[str],
) -> pd.Timestamp:
    if end_date is not None:
        return pd.Timestamp(end_date)
    return min(first_prices["date"].max(), second_prices["date"].max())


def _resolve_start_date(
    end_date: pd.Timestamp,
    years: Optional[float],
    start_date: Optional[str],
) -> pd.Timestamp:
    if start_date is not None:
        return pd.Timestamp(start_date)
    if years is None:
        raise ValueError("Either years or start_date is required")
    return end_date - pd.DateOffset(years=int(years))
