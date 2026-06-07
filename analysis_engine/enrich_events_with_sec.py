"""
Enrich existing events JSON files with SEC EDGAR 8-K data.

This script reads existing public/data/events/*.json files and appends
SEC-sourced Corporate Milestone and Product Launch events on top.
It does NOT re-fetch Yahoo Finance data.

Usage:
    .venv/bin/python3 analysis_engine/enrich_events_with_sec.py
    .venv/bin/python3 analysis_engine/enrich_events_with_sec.py --tickers AAPL NVDA MSFT
    .venv/bin/python3 analysis_engine/enrich_events_with_sec.py --limit 10
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

# Ensure project root is on path when run directly
sys.path.insert(0, str(Path(__file__).parent.parent))

from analysis_engine.data_sources.sec_events import build_cik_map, enrich_events_file

EVENTS_DIR = Path(__file__).parent.parent / "public" / "data" / "events"
CIK_CACHE = Path(__file__).parent.parent / "public" / "data" / "index" / "cik_map.json"


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich events JSON files with SEC 8-K data.")
    parser.add_argument("--tickers", nargs="+", help="Process specific tickers only")
    parser.add_argument("--limit", type=int, help="Process only first N tickers")
    parser.add_argument("--rebuild-cik-map", action="store_true", help="Force rebuild CIK map cache")
    args = parser.parse_args()

    # Step 1: Build/load CIK map
    if args.rebuild_cik_map or not CIK_CACHE.exists():
        print("Fetching CIK map from SEC...")
        cik_map = build_cik_map(cache_path=CIK_CACHE)
        print(f"  Cached {len(cik_map)} tickers → CIKs to {CIK_CACHE}")
    else:
        cik_map = json.loads(CIK_CACHE.read_text(encoding="utf-8"))
        print(f"Loaded CIK map: {len(cik_map)} entries")

    # Step 2: Determine which files to process
    if args.tickers:
        json_files = [EVENTS_DIR / f"{t.upper()}.json" for t in args.tickers]
        json_files = [f for f in json_files if f.exists()]
    else:
        json_files = sorted(EVENTS_DIR.glob("*.json"))

    if args.limit:
        json_files = json_files[: args.limit]

    total = len(json_files)
    print(f"\nEnriching {total} event files with SEC 8-K data...\n")

    total_added = 0
    errors = 0

    for idx, json_file in enumerate(json_files, 1):
        ticker = json_file.stem.upper()
        try:
            added = enrich_events_file(json_file, cik_map)
            total_added += added
            status = f"+{added} SEC events" if added else "no new events"
            if idx % 25 == 0 or idx == total or added > 0:
                print(f"[{idx}/{total}] {ticker}: {status}")
        except Exception as e:
            errors += 1
            print(f"[{idx}/{total}] {ticker}: ERROR — {e}")

        # Small pause between tickers (EDGAR allows 10 req/sec, we're well below)
        time.sleep(0.1)

    print(f"\nDone. {total_added} SEC events added across {total} files. Errors: {errors}")


if __name__ == "__main__":
    main()
