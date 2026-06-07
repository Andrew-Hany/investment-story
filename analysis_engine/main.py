"""Entry point for generating frontend-ready investment story JSON."""

import argparse
from pathlib import Path

from analysis_engine.data_sources.egx30 import write_egx30_snapshot


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CURRENCIES = ["USD", "EUR", "EGP", "CAD", "AED"]


def main():
    """Run the analysis pipeline."""
    args = _parse_args()
    sp500_path = PROJECT_ROOT / "public" / "data" / "index" / "sp500.json"
    egx30_path = PROJECT_ROOT / "public" / "data" / "index" / "egx30.json"
    nasdaq100_path = PROJECT_ROOT / "public" / "data" / "index" / "nasdaq100.json"

    if args.sp500:
        from analysis_engine.data_sources.sp500 import write_sp500_snapshot

        write_sp500_snapshot(sp500_path)

    if args.egx30:
        write_egx30_snapshot(egx30_path)

    if args.nasdaq100:
        from analysis_engine.data_sources.nasdaq100 import write_nasdaq100_snapshot

        write_nasdaq100_snapshot(nasdaq100_path)

    if args.prices:
        from analysis_engine.data_sources.prices import write_sp500_price_history

        write_sp500_price_history(
            sp500_path=sp500_path,
            output_dir=PROJECT_ROOT / "public" / "data" / "prices",
            start=args.start,
            end=args.end,
            period=args.period,
            batch_size=args.batch_size,
            limit=args.limit,
            skip_existing=not args.refresh_existing,
        )

    if args.egx30_prices:
        from analysis_engine.data_sources.prices import write_egx30_price_history

        if not egx30_path.exists():
            write_egx30_snapshot(egx30_path)
        write_egx30_price_history(
            egx30_path=egx30_path,
            output_dir=PROJECT_ROOT / "public" / "data" / "prices",
            start=args.start,
            end=args.end,
            period=args.period,
            batch_size=args.batch_size,
            limit=args.limit,
            skip_existing=not args.refresh_existing,
        )

    if args.nasdaq100_prices:
        from analysis_engine.data_sources.nasdaq100 import write_nasdaq100_snapshot
        from analysis_engine.data_sources.prices import write_nasdaq100_price_history

        if not nasdaq100_path.exists():
            write_nasdaq100_snapshot(nasdaq100_path)
        write_nasdaq100_price_history(
            nasdaq100_path=nasdaq100_path,
            output_dir=PROJECT_ROOT / "public" / "data" / "prices",
            start=args.start,
            end=args.end,
            period=args.period,
            batch_size=args.batch_size,
            limit=args.limit,
            skip_existing=not args.refresh_existing,
        )

    if args.fx:
        from analysis_engine.data_sources.fx import write_fx_history

        write_fx_history(
            currencies=args.currencies,
            output_dir=PROJECT_ROOT / "public" / "data" / "fx",
            start=args.start,
            end=args.end,
            period=args.period,
        )

    if args.fundamentals:
        from analysis_engine.data_sources.fundamentals import write_sp500_fundamentals

        write_sp500_fundamentals(
            sp500_path=sp500_path,
            output_dir=PROJECT_ROOT / "public" / "data" / "fundamentals",
            limit=args.limit,
            pause_seconds=args.pause_seconds,
            skip_existing=not args.refresh_existing,
        )

    if args.egx30_fundamentals:
        from analysis_engine.data_sources.fundamentals import write_egx30_fundamentals

        if not egx30_path.exists():
            write_egx30_snapshot(egx30_path)
        write_egx30_fundamentals(
            egx30_path=egx30_path,
            output_dir=PROJECT_ROOT / "public" / "data" / "fundamentals",
            limit=args.limit,
            pause_seconds=args.pause_seconds,
            skip_existing=not args.refresh_existing,
        )

    if args.nasdaq100_fundamentals:
        from analysis_engine.data_sources.nasdaq100 import write_nasdaq100_snapshot
        from analysis_engine.data_sources.fundamentals import write_nasdaq100_fundamentals

        if not nasdaq100_path.exists():
            write_nasdaq100_snapshot(nasdaq100_path)
        write_nasdaq100_fundamentals(
            nasdaq100_path=nasdaq100_path,
            output_dir=PROJECT_ROOT / "public" / "data" / "fundamentals",
            limit=args.limit,
            pause_seconds=args.pause_seconds,
            skip_existing=not args.refresh_existing,
        )

    if args.inflation:
        from analysis_engine.data_sources.inflation import write_inflation_history

        write_inflation_history(
            output_dir=PROJECT_ROOT / "public" / "data" / "inflation",
        )

    if args.gold:
        from analysis_engine.data_sources.prices import write_gold_price_history

        write_gold_price_history(
            output_dir=PROJECT_ROOT / "public" / "data" / "prices",
            start=args.start,
            end=args.end,
            period=args.period,
        )

    if args.events:
        from analysis_engine.data_sources.events import write_sp500_events

        write_sp500_events(
            sp500_path=sp500_path,
            output_dir=PROJECT_ROOT / "public" / "data" / "events",
            limit=args.limit,
            pause_seconds=args.pause_seconds,
            skip_existing=not args.refresh_existing,
        )

    if args.egx30_events:
        from analysis_engine.data_sources.events import write_egx30_events

        if not egx30_path.exists():
            write_egx30_snapshot(egx30_path)
        write_egx30_events(
            egx30_path=egx30_path,
            output_dir=PROJECT_ROOT / "public" / "data" / "events",
            limit=args.limit,
            pause_seconds=args.pause_seconds,
            skip_existing=not args.refresh_existing,
        )

    if args.nasdaq100_events:
        from analysis_engine.data_sources.nasdaq100 import write_nasdaq100_snapshot
        from analysis_engine.data_sources.events import write_nasdaq100_events

        if not nasdaq100_path.exists():
            write_nasdaq100_snapshot(nasdaq100_path)
        write_nasdaq100_events(
            nasdaq100_path=nasdaq100_path,
            output_dir=PROJECT_ROOT / "public" / "data" / "events",
            limit=args.limit,
            pause_seconds=args.pause_seconds,
            skip_existing=not args.refresh_existing,
        )


def _parse_args():
    parser = argparse.ArgumentParser(description="Generate Investment Story data files.")
    parser.add_argument("--sp500", action="store_true", help="Generate the current SPY/S&P 500 proxy holdings JSON.")
    parser.add_argument("--egx30", action="store_true", help="Generate the current EGX 30 constituent JSON.")
    parser.add_argument("--nasdaq100", action="store_true", help="Generate the current QQQ/Nasdaq-100 proxy holdings JSON.")
    parser.add_argument("--prices", action="store_true", help="Generate Yahoo price history for SPY and S&P 500 holdings.")
    parser.add_argument("--egx30-prices", action="store_true", help="Generate Yahoo price history for the EGX 30 index proxy and constituents.")
    parser.add_argument("--nasdaq100-prices", action="store_true", help="Generate Yahoo price history for QQQ and Nasdaq-100 proxy holdings.")
    parser.add_argument("--fx", action="store_true", help="Generate Yahoo FX history for all directed currency pairs.")
    parser.add_argument("--fundamentals", action="store_true", help="Generate Yahoo company fundamentals for S&P 500 holdings.")
    parser.add_argument("--egx30-fundamentals", action="store_true", help="Generate Yahoo company fundamentals for EGX 30 holdings.")
    parser.add_argument("--nasdaq100-fundamentals", action="store_true", help="Generate Yahoo/SEC company fundamentals for Nasdaq-100 proxy holdings.")
    parser.add_argument("--inflation", action="store_true", help="Generate historical CPI and annual inflation averages for S&P 500 currencies.")
    parser.add_argument("--events", action="store_true", help="Generate historical earnings dates, calendar events, and news for S&P 500 holdings.")
    parser.add_argument("--egx30-events", action="store_true", help="Generate Yahoo events, dividends, splits, and recent news for EGX 30 holdings.")
    parser.add_argument("--nasdaq100-events", action="store_true", help="Generate Yahoo events, dividends, splits, and recent news for Nasdaq-100 proxy holdings.")
    parser.add_argument("--gold", action="store_true", help="Generate price history for Gold futures (GC=F) and ETF (GLD).")
    parser.add_argument("--currencies", nargs="+", default=DEFAULT_CURRENCIES, help="Currencies to include in FX generation.")
    parser.add_argument("--start", help="Optional price history start date, YYYY-MM-DD.")
    parser.add_argument("--end", help="Optional price history end date, YYYY-MM-DD.")
    parser.add_argument("--period", default="max", help="Yahoo period when start/end are not provided.")
    parser.add_argument("--batch-size", type=int, default=50, help="Number of tickers per Yahoo download batch.")
    parser.add_argument("--limit", type=int, help="Optional ticker limit for testing.")
    parser.add_argument("--pause-seconds", type=float, default=0.25, help="Pause between fundamentals/events requests.")
    parser.add_argument("--refresh-existing", action="store_true", help="Overwrite existing data files instead of reusing them.")
    args = parser.parse_args()

    if (
        not args.sp500
        and not args.egx30
        and not args.nasdaq100
        and not args.prices
        and not args.egx30_prices
        and not args.nasdaq100_prices
        and not args.fx
        and not args.fundamentals
        and not args.egx30_fundamentals
        and not args.nasdaq100_fundamentals
        and not args.inflation
        and not args.events
        and not args.egx30_events
        and not args.nasdaq100_events
        and not args.gold
    ):
        args.sp500 = True

    return args


if __name__ == "__main__":
    main()
