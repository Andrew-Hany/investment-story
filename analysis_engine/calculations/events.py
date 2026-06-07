"""Small event reaction calculations."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Sequence


@dataclass(frozen=True)
class EventReturnResult:
    """Return profile around a single event."""

    event_index: int
    before_index: Optional[int]
    after_index: Optional[int]
    event_price: float
    before_price: Optional[float]
    after_price: Optional[float]
    before_to_event_return: Optional[float]
    event_to_after_return: Optional[float]


def calculate_event_return(
    prices: Sequence[float],
    event_index: int,
    periods_before: int,
    periods_after: int,
) -> EventReturnResult:
    """Return price reaction around an event index."""
    if not prices:
        raise ValueError("prices must not be empty")
    if event_index < 0 or event_index >= len(prices):
        raise ValueError("event_index is outside prices")
    if periods_before < 0:
        raise ValueError("periods_before must be greater than or equal to 0")
    if periods_after < 0:
        raise ValueError("periods_after must be greater than or equal to 0")

    for price in prices:
        if price <= 0:
            raise ValueError("prices must be greater than 0")

    before_index = event_index - periods_before
    if before_index < 0:
        before_index = None

    after_index = event_index + periods_after
    if after_index >= len(prices):
        after_index = None

    event_price = prices[event_index]
    before_price = prices[before_index] if before_index is not None else None
    after_price = prices[after_index] if after_index is not None else None

    return EventReturnResult(
        event_index=event_index,
        before_index=before_index,
        after_index=after_index,
        event_price=event_price,
        before_price=before_price,
        after_price=after_price,
        before_to_event_return=(
            event_price / before_price - 1 if before_price is not None else None
        ),
        event_to_after_return=(
            after_price / event_price - 1 if after_price is not None else None
        ),
    )
