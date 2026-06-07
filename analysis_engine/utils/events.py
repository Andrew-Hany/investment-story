"""Event filtering helpers."""

from __future__ import annotations

from typing import Any

import pandas as pd


def ceo_events(events: dict[str, Any], start_date: Any, end_date: Any) -> pd.DataFrame:
    """Return CEO appointment, resignation, and transition events in a date window."""
    rows = pd.DataFrame(events.get("timeline_events", []))
    if rows.empty:
        return _empty_ceo_events()

    rows["date"] = pd.to_datetime(rows["date"], errors="coerce")
    rows = rows.dropna(subset=["date"])
    if rows.empty:
        return _empty_ceo_events()

    details = rows["details"].apply(lambda value: value if isinstance(value, dict) else {})
    rows["executive_name"] = details.apply(lambda value: value.get("executive_name"))
    rows["role"] = details.apply(lambda value: value.get("role", ""))
    rows["action"] = details.apply(lambda value: value.get("action", ""))

    text = (rows["description"].fillna("") + " " + rows["role"].fillna("")).str.lower()
    rows = rows[text.str.contains(r"chief executive officer|\bceo\b", regex=True)]
    rows = rows[
        (rows["date"] >= pd.Timestamp(start_date))
        & (rows["date"] <= pd.Timestamp(end_date))
    ]
    if rows.empty:
        return _empty_ceo_events()

    return rows[
        ["date", "event_type", "description", "executive_name", "role", "action"]
    ].sort_values("date")


def _empty_ceo_events() -> pd.DataFrame:
    return pd.DataFrame(
        columns=["date", "event_type", "description", "executive_name", "role", "action"]
    )
