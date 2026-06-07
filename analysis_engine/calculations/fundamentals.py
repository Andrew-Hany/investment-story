"""Small company fundamentals calculations."""

from __future__ import annotations


def calculate_revenue_growth(current_revenue: float, previous_revenue: float) -> float:
    """Return revenue growth as a decimal."""
    _require_positive(previous_revenue, "previous_revenue")
    _require_non_negative(current_revenue, "current_revenue")
    return current_revenue / previous_revenue - 1


def calculate_gross_margin(gross_profit: float, revenue: float) -> float:
    """Return gross margin as a decimal."""
    return _margin(gross_profit, revenue, "gross_profit")


def calculate_operating_margin(operating_income: float, revenue: float) -> float:
    """Return operating margin as a decimal."""
    return _margin(operating_income, revenue, "operating_income")


def calculate_net_margin(net_income: float, revenue: float) -> float:
    """Return net margin as a decimal."""
    return _margin(net_income, revenue, "net_income")


def calculate_debt_to_cash(total_debt: float, total_cash: float) -> float:
    """Return debt-to-cash ratio."""
    _require_non_negative(total_debt, "total_debt")
    _require_positive(total_cash, "total_cash")
    return total_debt / total_cash


def calculate_market_cap_to_revenue(market_cap: float, revenue: float) -> float:
    """Return market-cap-to-revenue ratio."""
    _require_non_negative(market_cap, "market_cap")
    _require_positive(revenue, "revenue")
    return market_cap / revenue


def calculate_cost_ratio(costs: float, revenue: float) -> float:
    """Return costs as a share of revenue."""
    _require_non_negative(costs, "costs")
    _require_positive(revenue, "revenue")
    return costs / revenue


def classify_growth_rate(growth_rate: float) -> str:
    """Classify a growth rate into a coarse bucket."""
    if growth_rate < 0:
        return "shrinking"
    if growth_rate < 0.05:
        return "slow"
    if growth_rate < 0.15:
        return "steady"
    if growth_rate < 0.30:
        return "fast"
    return "very_fast"


def classify_margin(margin: float) -> str:
    """Classify a profit margin into a coarse bucket."""
    if margin < 0:
        return "negative"
    if margin < 0.05:
        return "thin"
    if margin < 0.15:
        return "healthy"
    if margin < 0.30:
        return "strong"
    return "exceptional"


def _margin(numerator: float, revenue: float, numerator_name: str) -> float:
    _require_positive(revenue, "revenue")
    if numerator < 0:
        return numerator / revenue
    _require_non_negative(numerator, numerator_name)
    return numerator / revenue


def _require_positive(value: float, name: str) -> None:
    if value <= 0:
        raise ValueError(f"{name} must be greater than 0")


def _require_non_negative(value: float, name: str) -> None:
    if value < 0:
        raise ValueError(f"{name} must be greater than or equal to 0")
