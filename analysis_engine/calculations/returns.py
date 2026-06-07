"""Small, pure investment return calculations."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class InvestmentResult:
    """Result for a single buy-and-hold investment."""

    ticker: str
    initial_amount: float
    start_price: float
    end_price: float
    shares: float
    final_value: float
    profit: float
    total_return: float
    annualized_return: Optional[float] = None


@dataclass(frozen=True)
class InvestmentComparison:
    """Comparison between two buy-and-hold investments."""

    first: InvestmentResult
    second: InvestmentResult
    winner: str
    loser: str
    final_value_difference: float
    return_difference: float
    winner_multiple: float


def calculate_shares_bought(initial_amount: float, start_price: float) -> float:
    """Return how many shares can be bought with the starting amount."""
    _require_non_negative(initial_amount, "initial_amount")
    _require_positive(start_price, "start_price")
    return initial_amount / start_price


def calculate_final_value(initial_amount: float, start_price: float, end_price: float) -> float:
    """Return final value for a simple buy-and-hold investment."""
    _require_non_negative(initial_amount, "initial_amount")
    _require_positive(start_price, "start_price")
    _require_non_negative(end_price, "end_price")
    return calculate_shares_bought(initial_amount, start_price) * end_price


def calculate_total_return(start_value: float, end_value: float) -> float:
    """Return total return as a decimal, for example 0.25 for 25%."""
    _require_positive(start_value, "start_value")
    _require_non_negative(end_value, "end_value")
    return end_value / start_value - 1


def calculate_annualized_return(start_value: float, end_value: float, years: float) -> float:
    """Return compound annual growth rate as a decimal."""
    _require_positive(start_value, "start_value")
    _require_non_negative(end_value, "end_value")
    _require_positive(years, "years")
    if end_value == 0:
        return -1.0
    return (end_value / start_value) ** (1 / years) - 1


def calculate_investment_result(
    ticker: str,
    initial_amount: float,
    start_price: float,
    end_price: float,
    years: Optional[float] = None,
) -> InvestmentResult:
    """Calculate a simple buy-and-hold result for one ticker."""
    shares = calculate_shares_bought(initial_amount, start_price)
    final_value = shares * end_price
    total_return = calculate_total_return(initial_amount, final_value)
    annualized = None
    if years is not None:
        annualized = calculate_annualized_return(initial_amount, final_value, years)
    return InvestmentResult(
        ticker=ticker,
        initial_amount=initial_amount,
        start_price=start_price,
        end_price=end_price,
        shares=shares,
        final_value=final_value,
        profit=final_value - initial_amount,
        total_return=total_return,
        annualized_return=annualized,
    )


def compare_investments(
    first_ticker: str,
    first_start_price: float,
    first_end_price: float,
    second_ticker: str,
    second_start_price: float,
    second_end_price: float,
    initial_amount: float,
    years: Optional[float] = None,
) -> InvestmentComparison:
    """Compare two buy-and-hold investments using the same initial amount."""
    first = calculate_investment_result(
        first_ticker,
        initial_amount,
        first_start_price,
        first_end_price,
        years=years,
    )
    second = calculate_investment_result(
        second_ticker,
        initial_amount,
        second_start_price,
        second_end_price,
        years=years,
    )

    if first.final_value >= second.final_value:
        winner_result, loser_result = first, second
    else:
        winner_result, loser_result = second, first

    winner_multiple = (
        winner_result.final_value / loser_result.final_value
        if loser_result.final_value
        else float("inf")
    )
    return InvestmentComparison(
        first=first,
        second=second,
        winner=winner_result.ticker,
        loser=loser_result.ticker,
        final_value_difference=winner_result.final_value - loser_result.final_value,
        return_difference=winner_result.total_return - loser_result.total_return,
        winner_multiple=winner_multiple,
    )


def _require_positive(value: float, name: str) -> None:
    if value <= 0:
        raise ValueError(f"{name} must be greater than 0")


def _require_non_negative(value: float, name: str) -> None:
    if value < 0:
        raise ValueError(f"{name} must be greater than or equal to 0")
