"""Serialization helpers for service outputs."""

from __future__ import annotations

from dataclasses import asdict, is_dataclass
from typing import Any

import pandas as pd


def to_jsonable(value: Any) -> Any:
    """Convert common analysis objects to JSON-serializable values."""
    if is_dataclass(value):
        return to_jsonable(asdict(value))
    if isinstance(value, dict):
        return {key: to_jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [to_jsonable(item) for item in value]
    if isinstance(value, tuple):
        return [to_jsonable(item) for item in value]
    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()
    if hasattr(value, "item"):
        return value.item()
    return value
