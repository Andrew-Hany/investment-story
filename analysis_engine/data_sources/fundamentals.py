"""Fundamental financial statement data from Yahoo Finance and SEC EDGAR."""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any

import pandas as pd
import yfinance as yf

from analysis_engine.data_sources.egx30 import load_egx30_company_names, load_egx30_tickers
from analysis_engine.data_sources.nasdaq100 import load_nasdaq100_company_names, load_nasdaq100_tickers
from analysis_engine.data_sources.prices import load_sp500_tickers, yahoo_symbol_for_ticker


# --- SEC EDGAR MAPPINGS & CONFIGS ---
_CIK_MAP = None

SEC_TAGS_MAP = {
    # Revenues / Top Line
    "total_revenue": [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "SalesRevenueNet",
        "OperatingRevenue"
    ],
    "operating_revenue": [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "OperatingRevenue"
    ],
    "gross_profit": [
        "GrossProfit"
    ],
    "operating_income": [
        "OperatingIncomeLoss"
    ],
    # Bottom Line & EPS
    "net_income": [
        "NetIncomeLoss",
        "NetIncomeLossAvailableToCommonStockholdersBasic"
    ],
    "normalized_income": [
        "NetIncomeLoss"
    ],
    "pretax_income": [
        "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
        "IncomeLossFromContinuingOperationsBeforeIncomeTaxesForeignAndDomestic"
    ],
    "tax_provision": [
        "IncomeTaxExpenseBenefit"
    ],
    "basic_eps": [
        "EarningsPerShareBasic"
    ],
    "diluted_eps": [
        "EarningsPerShareDiluted"
    ],
    "basic_average_shares": [
        "WeightedAverageNumberOfSharesOutstandingBasic",
        "WeightedAverageNumberOfCommonSharesOutstandingBasic"
    ],
    "diluted_average_shares": [
        "WeightedAverageNumberOfCommonSharesOutstandingDiluted",
        "WeightedAverageNumberOfSharesOutstandingDiluted"
    ],
    "selling_general_and_administration": [
        "SellingGeneralAndAdministrativeExpense"
    ],
    # Balance Sheet - Assets & Liabilities
    "total_assets": [
        "Assets"
    ],
    "total_liabilities_net_minority_interest": [
        "Liabilities"
    ],
    "stockholders_equity": [
        "StockholdersEquity",
        "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"
    ],
    "common_stock_equity": [
        "StockholdersEquity"
    ],
    "retained_earnings": [
        "RetainedEarningsAccumulatedDeficit"
    ],
    "cash_and_cash_equivalents": [
        "CashAndCashEquivalentsAtCarryingValue"
    ],
    "long_term_debt": [
        "LongTermDebt",
        "LongTermDebtNoncurrent"
    ],
    "current_debt": [
        "ShortTermBorrowings",
        "ShortTermBorrowingsAndCurrentPortionsOfLongTermDebt"
    ],
    # Cash Flow
    "operating_cash_flow": [
        "NetCashProvidedByUsedInOperatingActivities"
    ],
    "investing_cash_flow": [
        "NetCashProvidedByUsedInInvestingActivities"
    ],
    "financing_cash_flow": [
        "NetCashProvidedByUsedInFinancingActivities"
    ],
    "capital_expenditure": [
        "PaymentsToAcquirePropertyPlantAndEquipment"
    ],
    "repurchase_of_capital_stock": [
        "PaymentsForRepurchaseOfCommonStock",
        "PaymentsForRepurchaseOfEquity"
    ],
    "cash_dividends_paid": [
        "PaymentsOfDividends",
        "PaymentsOfDividendsCommonStock",
        "PaymentsOfDividendsMinorityInterest"
    ],
    "repayment_of_debt": [
        "RepaymentsOfLongTermDebt"
    ],
    "issuance_of_debt": [
        "ProceedsFromIssuanceOfLongTermDebt"
    ],
}

INCOME_STATEMENT_KEYS = [
    "total_revenue", "operating_revenue", "gross_profit", "operating_income",
    "net_income", "normalized_income", "pretax_income", "tax_provision",
    "basic_eps", "diluted_eps", "basic_average_shares", "diluted_average_shares",
    "selling_general_and_administration"
]

BALANCE_SHEET_KEYS = [
    "total_assets", "total_liabilities_net_minority_interest", "stockholders_equity",
    "common_stock_equity", "retained_earnings", "cash_and_cash_equivalents",
    "long_term_debt", "current_debt"
]

CASH_FLOW_KEYS = [
    "operating_cash_flow", "investing_cash_flow", "financing_cash_flow", "free_cash_flow",
    "capital_expenditure", "repurchase_of_capital_stock", "cash_dividends_paid",
    "repayment_of_debt", "issuance_of_debt"
]


def get_sec_cik(ticker: str) -> str | None:
    """Fetch ticker to 10-digit zero-padded CIK map from SEC."""
    global _CIK_MAP
    if _CIK_MAP is not None:
        return _CIK_MAP.get(ticker.upper())

    url = "https://www.sec.gov/files/company_tickers.json"
    headers = {"User-Agent": "InvestmentStoryApp/1.0 contact@myemail.com"}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode("utf-8"))
            _CIK_MAP = {
                item["ticker"].upper(): f"{item['cik_str']:010d}"
                for item in data.values()
            }
            return _CIK_MAP.get(ticker.upper())
    except Exception as e:
        print(f"Error fetching SEC CIK map: {e}")
        return None


def _extract_statement_data(facts: dict, is_annual: bool) -> dict[str, dict[str, Any]]:
    """
    Extract and group key metrics by period_end.
    Returns: dict of period_end -> dict of key -> value.
    """
    grouped_data = {}
    
    for key, tags in SEC_TAGS_MAP.items():
        entries = None
        for tag in tags:
            for taxonomy in ["us-gaap", "dei"]:
                if taxonomy in facts and tag in facts[taxonomy]:
                    tag_data = facts[taxonomy][tag]
                    units = tag_data.get("units", {})
                    for unit_cand in ["USD", "shares", "USD/shares", "pure"]:
                        if unit_cand in units:
                            entries = units[unit_cand]
                            break
                    if not entries and units:
                        entries = list(units.values())[0]
                    if entries:
                        break
            if entries:
                break
                
        if not entries:
            continue
            
        for entry in entries:
            form = entry.get("form")
            fp = entry.get("fp")
            end = entry.get("end")
            start = entry.get("start")
            filed = entry.get("filed", "")
            val = entry.get("val")
            
            if not end or val is None:
                continue
                
            is_balance_sheet_key = key in BALANCE_SHEET_KEYS
            
            # Categorize Balance Sheet (point-in-time) vs Flow (Income & Cash Flow statements)
            if is_balance_sheet_key:
                if is_annual:
                    is_match = (form == "10-K") or (fp == "FY")
                else:
                    is_match = (form == "10-Q") or (fp in ["Q1", "Q2", "Q3"])
            else:
                # For income statement & cash flows (flows):
                if start:
                    try:
                        start_dt = datetime.strptime(start, "%Y-%m-%d")
                        end_dt = datetime.strptime(end, "%Y-%m-%d")
                        days = (end_dt - start_dt).days
                        if is_annual:
                            # Annual statements are cumulative for a full year (~365 days)
                            is_match = (340 <= days <= 390)
                        else:
                            # Quarterly statements are standalone for a single quarter (~90 days)
                            is_match = (70 <= days <= 110)
                    except Exception:
                        is_match = False
                else:
                    # Fallback if start is missing
                    if is_annual:
                        is_match = (form == "10-K") or (fp == "FY")
                    else:
                        is_match = (form == "10-Q") or (fp in ["Q1", "Q2", "Q3", "Q4"])
            
            if not is_match:
                continue
            
            if end not in grouped_data:
                grouped_data[end] = {}
                
            existing = grouped_data[end].get(key)
            if existing is None or filed > existing["filed"]:
                grouped_data[end][key] = {"val": val, "filed": filed}
                
    result = {}
    for end_date, metrics in grouped_data.items():
        result[end_date] = {}
        for key, info in metrics.items():
            result[end_date][key] = _clean_value(info["val"])
            
        if "operating_cash_flow" in result[end_date]:
            ocf = result[end_date]["operating_cash_flow"]
            capex = result[end_date].get("capital_expenditure", 0) or 0
            result[end_date]["free_cash_flow"] = _clean_value(ocf - capex)
            
    return result


def _build_statement_records(grouped_metrics: dict, keys: list[str]) -> list[dict[str, Any]]:
    records = []
    for date in sorted(grouped_metrics.keys(), reverse=True):
        metrics = grouped_metrics[date]
        values = {k: metrics[k] for k in keys if k in metrics}
        if values:
            records.append({"period_end": date, "values": values})
    return records


def fetch_fundamentals(ticker: str) -> dict[str, Any]:
    """Fetch company metadata and financial statements for one ticker, using SEC with yfinance fallback."""
    yahoo_symbol = yahoo_symbol_for_ticker(ticker)
    yahoo_ticker = yf.Ticker(yahoo_symbol)
    company_profile = _company_profile(yahoo_ticker)
    
    sec_data = None
    cik = get_sec_cik(ticker)
    if cik:
        try:
            url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
            headers = {"User-Agent": "InvestmentStoryApp/1.0 contact@myemail.com"}
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as response:
                facts_data = json.loads(response.read().decode("utf-8"))
                facts = facts_data.get("facts", {})
                
                annual_metrics = _extract_statement_data(facts, is_annual=True)
                quarterly_metrics = _extract_statement_data(facts, is_annual=False)
                
                if annual_metrics or quarterly_metrics:
                    sec_data = {
                        "annual": {
                            "income_statement": _build_statement_records(annual_metrics, INCOME_STATEMENT_KEYS),
                            "balance_sheet": _build_statement_records(annual_metrics, BALANCE_SHEET_KEYS),
                            "cash_flow": _build_statement_records(annual_metrics, CASH_FLOW_KEYS),
                        },
                        "quarterly": {
                            "income_statement": _build_statement_records(quarterly_metrics, INCOME_STATEMENT_KEYS),
                            "balance_sheet": _build_statement_records(quarterly_metrics, BALANCE_SHEET_KEYS),
                            "cash_flow": _build_statement_records(quarterly_metrics, CASH_FLOW_KEYS),
                        }
                    }
        except Exception as e:
            print(f"SEC fetch failed for {ticker}, falling back to Yahoo: {e}")

    if sec_data:
        source_str = "SEC EDGAR API + Yahoo Finance"
        annual_stmts = sec_data["annual"]
        quarterly_stmts = sec_data["quarterly"]
    else:
        source_str = "Yahoo Finance via yfinance"
        annual_stmts = {
            "income_statement": _statement_to_records(_safe_statement(yahoo_ticker, "income_stmt")),
            "balance_sheet": _statement_to_records(_safe_statement(yahoo_ticker, "balance_sheet")),
            "cash_flow": _statement_to_records(_safe_statement(yahoo_ticker, "cashflow")),
        }
        quarterly_stmts = {
            "income_statement": _statement_to_records(_safe_statement(yahoo_ticker, "quarterly_income_stmt")),
            "balance_sheet": _statement_to_records(_safe_statement(yahoo_ticker, "quarterly_balance_sheet")),
            "cash_flow": _statement_to_records(_safe_statement(yahoo_ticker, "quarterly_cashflow")),
        }

    return {
        "ticker": ticker.upper(),
        "yahoo_symbol": yahoo_symbol,
        "source": source_str,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "company": company_profile,
        "annual": annual_stmts,
        "quarterly": quarterly_stmts,
    }



def write_fundamentals(
    tickers: list[str],
    output_dir: Path | str,
    pause_seconds: float = 0.25,
    company_names: dict[str, str] | None = None,
    skip_existing: bool = True,
) -> list[Path]:
    """Write one fundamentals JSON file per ticker."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    written_paths = []
    for ticker in _dedupe(tickers):
        path = output_path / f"{_filename_for_ticker(ticker)}.json"
        if skip_existing and path.exists():
            continue

        payload = fetch_fundamentals(ticker)
        display_name = (company_names or {}).get(ticker.upper())
        if display_name:
            payload["company"]["shortName"] = display_name
            payload["company"]["longName"] = display_name
            payload["company"]["name"] = display_name
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        written_paths.append(path)
        if pause_seconds:
            time.sleep(pause_seconds)

    return written_paths


def write_sp500_fundamentals(
    sp500_path: Path | str,
    output_dir: Path | str,
    limit: int | None = None,
    pause_seconds: float = 0.25,
    skip_existing: bool = True,
) -> list[Path]:
    """Write fundamentals for the current SPY/S&P 500 proxy holdings."""
    tickers = load_sp500_tickers(sp500_path, include_benchmark=False)
    if limit is not None:
        tickers = tickers[:limit]
    return write_fundamentals(tickers, output_dir, pause_seconds=pause_seconds, skip_existing=skip_existing)


def write_egx30_fundamentals(
    egx30_path: Path | str,
    output_dir: Path | str,
    limit: int | None = None,
    pause_seconds: float = 0.25,
    skip_existing: bool = True,
) -> list[Path]:
    """Write Yahoo fundamentals for the current EGX 30 holdings."""
    tickers = load_egx30_tickers(egx30_path, include_benchmark=False)
    company_names = load_egx30_company_names(egx30_path)
    if limit is not None:
        tickers = tickers[:limit]
    return write_fundamentals(
        tickers,
        output_dir,
        pause_seconds=pause_seconds,
        company_names=company_names,
        skip_existing=skip_existing,
    )


def write_nasdaq100_fundamentals(
    nasdaq100_path: Path | str,
    output_dir: Path | str,
    limit: int | None = None,
    pause_seconds: float = 0.25,
    skip_existing: bool = True,
) -> list[Path]:
    """Write Yahoo/SEC fundamentals for the current Nasdaq-100 proxy holdings."""
    tickers = load_nasdaq100_tickers(nasdaq100_path, include_benchmark=False)
    company_names = load_nasdaq100_company_names(nasdaq100_path)
    if limit is not None:
        tickers = tickers[:limit]
    return write_fundamentals(
        tickers,
        output_dir,
        pause_seconds=pause_seconds,
        company_names=company_names,
        skip_existing=skip_existing,
    )


def _company_profile(yahoo_ticker: yf.Ticker) -> dict[str, Any]:
    try:
        info = yahoo_ticker.info
    except Exception:
        info = {}

    fields = [
        "symbol",
        "shortName",
        "longName",
        "sector",
        "industry",
        "country",
        "currency",
        "quoteType",
        "exchange",
        "marketCap",
        "sharesOutstanding",
        "trailingPE",
        "forwardPE",
        "priceToBook",
        "enterpriseValue",
        "profitMargins",
        "grossMargins",
        "operatingMargins",
        "returnOnAssets",
        "returnOnEquity",
        "totalRevenue",
        "grossProfits",
        "ebitda",
        "totalDebt",
        "totalCash",
        "freeCashflow",
    ]
    return {field: _clean_value(info.get(field)) for field in fields if field in info}


def _safe_statement(yahoo_ticker: yf.Ticker, attribute: str) -> pd.DataFrame:
    try:
        statement = getattr(yahoo_ticker, attribute)
    except Exception:
        return pd.DataFrame()
    if statement is None:
        return pd.DataFrame()
    return statement


def _statement_to_records(statement: pd.DataFrame | None) -> list[dict[str, Any]]:
    if statement is None or statement.empty:
        return []

    records = []
    for column in statement.columns:
        period = pd.Timestamp(column).strftime("%Y-%m-%d")
        values = {
            _clean_statement_key(index): _clean_value(value)
            for index, value in statement[column].items()
            if _clean_value(value) is not None
        }
        records.append({"period_end": period, "values": values})

    return records


def _clean_statement_key(value: Any) -> str:
    text = str(value).strip()
    result = []
    for index, character in enumerate(text):
        if character.isupper() and index > 0 and text[index - 1].islower():
            result.append("_")
        elif character in {" ", "-", "/"}:
            result.append("_")
            continue
        result.append(character.lower())
    return "".join(result).replace("__", "_")


def _clean_value(value: Any) -> Any:
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, (int, float)):
        number = float(value)
        if number.is_integer():
            return int(number)
        return round(number, 6)
    return value


def _dedupe(values: list[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        normalized = value.strip().upper()
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


def _filename_for_ticker(ticker: str) -> str:
    return ticker.replace("/", "-")
