"""Date selection helpers for market data frames."""

from __future__ import annotations

from typing import Any

import pandas as pd


def row_on_or_after(frame: pd.DataFrame, value: Any) -> pd.Series:
    """Return the first row whose date is on or after the requested date."""
    rows = frame[frame["date"] >= pd.Timestamp(value)]
    if rows.empty:
        raise ValueError(f"No row on or after {pd.Timestamp(value).date()}")
    return rows.iloc[0]


def row_on_or_before(frame: pd.DataFrame, value: Any) -> pd.Series:
    """Return the last row whose date is on or before the requested date."""
    rows = frame[frame["date"] <= pd.Timestamp(value)]
    if rows.empty:
        raise ValueError(f"No row on or before {pd.Timestamp(value).date()}")
    return rows.iloc[-1]
