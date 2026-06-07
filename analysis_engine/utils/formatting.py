"""Small display formatting helpers for story prototypes."""

from __future__ import annotations

from typing import Optional


def money(value: float, symbol: str = "$") -> str:
    """Format a number as whole-unit currency."""
    return f"{symbol}{value:,.0f}"


def compact_money(value: float, symbol: str = "$") -> str:
    """Format large currency values with B/M suffixes."""
    if abs(value) >= 1_000_000_000:
        return f"{symbol}{value / 1_000_000_000:,.1f}B"
    if abs(value) >= 1_000_000:
        return f"{symbol}{value / 1_000_000:,.1f}M"
    return money(value, symbol=symbol)


def pct(value: Optional[float]) -> str:
    """Format a decimal return or ratio as a percentage."""
    return "n/a" if value is None else f"{value * 100:,.1f}%"
