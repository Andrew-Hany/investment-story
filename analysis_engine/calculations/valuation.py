"""Small valuation calculations."""

from __future__ import annotations


def calculate_pe_ratio(price: float, eps: float) -> float:
    """Return price-to-earnings ratio."""
    _require_non_negative(price, "price")
    _require_positive(eps, "eps")
    return price / eps


def calculate_forward_pe(price: float, forward_eps: float) -> float:
    """Return forward price-to-earnings ratio."""
    return calculate_pe_ratio(price, forward_eps)


def calculate_earnings_yield(eps: float, price: float) -> float:
    """Return earnings yield as a decimal."""
    _require_positive(price, "price")
    return eps / price


def calculate_price_to_sales(market_cap: float, revenue: float) -> float:
    """Return price-to-sales ratio."""
    _require_non_negative(market_cap, "market_cap")
    _require_positive(revenue, "revenue")
    return market_cap / revenue


def calculate_price_to_book(market_cap: float, book_value: float) -> float:
    """Return price-to-book ratio."""
    _require_non_negative(market_cap, "market_cap")
    _require_positive(book_value, "book_value")
    return market_cap / book_value


def calculate_eps_growth(current_eps: float, previous_eps: float) -> float:
    """Return EPS growth as a decimal."""
    _require_positive(previous_eps, "previous_eps")
    return current_eps / previous_eps - 1


def calculate_margin_of_safety(fair_value: float, current_price: float) -> float:
    """Return margin of safety as a decimal relative to fair value."""
    _require_positive(fair_value, "fair_value")
    _require_non_negative(current_price, "current_price")
    return (fair_value - current_price) / fair_value


def classify_pe_level(pe_ratio: float) -> str:
    """Classify PE into a coarse valuation bucket."""
    _require_non_negative(pe_ratio, "pe_ratio")
    if pe_ratio < 15:
        return "low"
    if pe_ratio < 25:
        return "normal"
    if pe_ratio < 40:
        return "high"
    return "extreme"


def _require_positive(value: float, name: str) -> None:
    if value <= 0:
        raise ValueError(f"{name} must be greater than 0")


def _require_non_negative(value: float, name: str) -> None:
    if value < 0:
        raise ValueError(f"{name} must be greater than or equal to 0")
