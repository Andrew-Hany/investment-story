"""Small risk and drawdown calculations."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional, Sequence


@dataclass(frozen=True)
class DrawdownResult:
    """Maximum drawdown result for a value series."""

    max_drawdown: float
    peak_index: int
    trough_index: int
    recovery_index: Optional[int]


def calculate_max_drawdown(values: Sequence[float]) -> DrawdownResult:
    """Return maximum drawdown for a sequence of portfolio values or prices."""
    if not values:
        raise ValueError("values must not be empty")

    peak_value = values[0]
    peak_index = 0
    max_drawdown = 0.0
    max_peak_index = 0
    trough_index = 0

    for index, value in enumerate(values):
        if value <= 0:
            raise ValueError("values must be greater than 0")
        if value > peak_value:
            peak_value = value
            peak_index = index
        drawdown = value / peak_value - 1
        if drawdown < max_drawdown:
            max_drawdown = drawdown
            max_peak_index = peak_index
            trough_index = index

    recovery_index = None
    recovery_level = values[max_peak_index]
    for index in range(trough_index + 1, len(values)):
        if values[index] >= recovery_level:
            recovery_index = index
            break

    return DrawdownResult(
        max_drawdown=max_drawdown,
        peak_index=max_peak_index,
        trough_index=trough_index,
        recovery_index=recovery_index,
    )


def calculate_period_return(start_value: float, end_value: float) -> float:
    """Return simple period return as a decimal."""
    if start_value <= 0:
        raise ValueError("start_value must be greater than 0")
    if end_value < 0:
        raise ValueError("end_value must be greater than or equal to 0")
    return end_value / start_value - 1


def calculate_best_period_return(values: Sequence[float], window_size: int) -> float:
    """Return the best rolling return for a fixed-size window."""
    returns = list(_rolling_returns(values, window_size))
    if not returns:
        raise ValueError("window_size must leave at least one complete period")
    return max(returns)


def calculate_worst_period_return(values: Sequence[float], window_size: int) -> float:
    """Return the worst rolling return for a fixed-size window."""
    returns = list(_rolling_returns(values, window_size))
    if not returns:
        raise ValueError("window_size must leave at least one complete period")
    return min(returns)


def _rolling_returns(values: Sequence[float], window_size: int) -> Iterable[float]:
    if window_size <= 0:
        raise ValueError("window_size must be greater than 0")
    for index in range(window_size, len(values)):
        yield calculate_period_return(values[index - window_size], values[index])
