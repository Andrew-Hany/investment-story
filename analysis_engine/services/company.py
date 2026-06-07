"""Services for company fundamentals and valuation snapshots."""

from __future__ import annotations

from typing import Any

from analysis_engine.calculations import (
    calculate_debt_to_cash,
    calculate_gross_margin,
    calculate_net_margin,
    calculate_pe_ratio,
    calculate_revenue_growth,
    classify_growth_rate,
    classify_margin,
    classify_pe_level,
)
from analysis_engine.data_access import annual_statement_rows, load_fundamentals, load_prices
from analysis_engine.services.serialization import to_jsonable


def build_company_snapshot(ticker: str) -> dict[str, Any]:
    """Build a JSON-ready company snapshot from fundamentals and latest price."""
    ticker = ticker.upper()
    fundamentals = load_fundamentals(ticker)
    prices = load_prices(ticker)
    income = annual_statement_rows(fundamentals, "income_statement")
    balance = annual_statement_rows(fundamentals, "balance_sheet")

    latest_income = income.iloc[-1]
    previous_income = income.iloc[-2]
    latest_balance = balance.iloc[-1]
    latest_price = float(prices.iloc[-1]["adj_close"])
    latest_eps = float(latest_income["diluted_eps"])

    revenue_growth = calculate_revenue_growth(
        latest_income["total_revenue"],
        previous_income["total_revenue"],
    )
    gross_margin = calculate_gross_margin(
        latest_income["gross_profit"],
        latest_income["total_revenue"],
    )
    net_margin = calculate_net_margin(
        latest_income["net_income"],
        latest_income["total_revenue"],
    )
    debt_to_cash = calculate_debt_to_cash(
        latest_balance["long_term_debt"],
        latest_balance["cash_and_cash_equivalents"],
    )
    pe_ratio = calculate_pe_ratio(latest_price, latest_eps)

    return to_jsonable(
        {
            "ticker": ticker,
            "company": fundamentals.get("company", {}),
            "price": {
                "latest_date": prices.iloc[-1]["date"],
                "latest_adj_close": latest_price,
                "first_date": prices.iloc[0]["date"],
                "last_date": prices.iloc[-1]["date"],
            },
            "fundamentals": {
                "latest_period": latest_income["period_end"],
                "latest_revenue": latest_income["total_revenue"],
                "latest_net_income": latest_income["net_income"],
                "revenue_growth": revenue_growth,
                "revenue_growth_label": classify_growth_rate(revenue_growth),
                "gross_margin": gross_margin,
                "gross_margin_label": classify_margin(gross_margin),
                "net_margin": net_margin,
                "net_margin_label": classify_margin(net_margin),
                "debt_to_cash": debt_to_cash,
            },
            "valuation": {
                "latest_price": latest_price,
                "latest_eps": latest_eps,
                "pe_ratio": pe_ratio,
                "pe_label": classify_pe_level(pe_ratio),
                "market_cap": fundamentals.get("company", {}).get("marketCap"),
            },
        }
    )
