"""EGX 30 constituent data.

Yahoo Finance uses the Cairo exchange suffix ``.CA`` for Egyptian-listed
shares, for example ``COMI.CA`` for Commercial International Bank.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


EGX30_CONSTITUENTS = [
    {"ticker": "CCAP.CA", "egx_symbol": "CCAP", "name": "Qalaa Holdings"},
    {"ticker": "COMI.CA", "egx_symbol": "COMI", "name": "Commercial International Bank (Egypt)"},
    {"ticker": "ETEL.CA", "egx_symbol": "ETEL", "name": "Telecom Egypt"},
    {"ticker": "HRHO.CA", "egx_symbol": "HRHO", "name": "EFG Holding"},
    {"ticker": "PHDC.CA", "egx_symbol": "PHDC", "name": "Palm Hills Development"},
    {"ticker": "TMGH.CA", "egx_symbol": "TMGH", "name": "Talaat Moustafa Group Holding"},
    {"ticker": "GBCO.CA", "egx_symbol": "GBCO", "name": "GB Corp"},
    {"ticker": "HELI.CA", "egx_symbol": "HELI", "name": "Heliopolis Housing"},
    {"ticker": "ORWE.CA", "egx_symbol": "ORWE", "name": "Oriental Weavers"},
    {"ticker": "RAYA.CA", "egx_symbol": "RAYA", "name": "Raya Holding"},
    {"ticker": "ABUK.CA", "egx_symbol": "ABUK", "name": "Abu Qir Fertilizers and Chemical Industries"},
    {"ticker": "MCQE.CA", "egx_symbol": "MCQE", "name": "Misr Cement Qena"},
    {"ticker": "AMOC.CA", "egx_symbol": "AMOC", "name": "Alexandria Mineral Oils Company"},
    {"ticker": "EAST.CA", "egx_symbol": "EAST", "name": "Eastern Company"},
    {"ticker": "EGCH.CA", "egx_symbol": "EGCH", "name": "Egyptian Chemical Industries (Kima)"},
    {"ticker": "BTFH.CA", "egx_symbol": "BTFH", "name": "Beltone Holding"},
    {"ticker": "EGAL.CA", "egx_symbol": "EGAL", "name": "Egypt Aluminum"},
    {"ticker": "JUFO.CA", "egx_symbol": "JUFO", "name": "Juhayna Food Industries"},
    {"ticker": "ORHD.CA", "egx_symbol": "ORHD", "name": "Orascom Development Egypt"},
    {"ticker": "OIH.CA", "egx_symbol": "OIH", "name": "Orascom Investment Holding"},
    {"ticker": "ADIB.CA", "egx_symbol": "ADIB", "name": "Abu Dhabi Islamic Bank - Egypt"},
    {"ticker": "ARCC.CA", "egx_symbol": "ARCC", "name": "Arabian Cement Company"},
    {"ticker": "ORAS.CA", "egx_symbol": "ORAS", "name": "Orascom Construction"},
    {"ticker": "EMFD.CA", "egx_symbol": "EMFD", "name": "Emaar Misr for Development"},
    {"ticker": "EFID.CA", "egx_symbol": "EFID", "name": "Edita Food Industries"},
    {"ticker": "ISPH.CA", "egx_symbol": "ISPH", "name": "Ibnsina Pharma"},
    {"ticker": "FWRY.CA", "egx_symbol": "FWRY", "name": "Fawry for Banking Technology and Electronic Payments"},
    {"ticker": "RMDA.CA", "egx_symbol": "RMDA", "name": "Tenth of Ramadan Pharmaceutical Industries and Diagnostic-Rameda"},
    {"ticker": "VALU.CA", "egx_symbol": "VALU", "name": "Valu for Financial Technology"},
    {"ticker": "EFIH.CA", "egx_symbol": "EFIH", "name": "e-finance for Digital and Financial Investments"},
]


def fetch_egx30_holdings() -> dict[str, Any]:
    """Return the current EGX 30 constituent list used by the app."""
    holdings = [
        {
            "ticker": holding["ticker"],
            "egx_symbol": holding["egx_symbol"],
            "name": holding["name"],
            "exchange": "EGX",
            "currency": "EGP",
        }
        for holding in EGX30_CONSTITUENTS
    ]

    return {
        "source": "Investing.com EGX 30 constituents, normalized to Yahoo Finance symbols",
        "source_url": "https://ca.investing.com/indices/egx30-components",
        "benchmark_proxy": "^CASE30",
        "as_of": "2026-05-25",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "holdings_count": len(holdings),
        "holdings": holdings,
        "notes": [
            "Yahoo Finance uses .CA suffixes for Egyptian Exchange listings.",
            "EGX 30 constituents can change at index reviews; regenerate this snapshot when the index is rebalanced.",
        ],
    }


def load_egx30_tickers(egx30_path: Path | str, include_benchmark: bool = True) -> list[str]:
    """Load Yahoo Finance tickers from the generated EGX 30 JSON."""
    data = json.loads(Path(egx30_path).read_text(encoding="utf-8"))
    tickers = [holding["ticker"] for holding in data["holdings"] if holding.get("ticker")]

    if include_benchmark and "^CASE30" not in tickers:
        tickers.insert(0, "^CASE30")

    return _dedupe(tickers)


def load_egx30_company_names(egx30_path: Path | str) -> dict[str, str]:
    """Load display names keyed by Yahoo Finance ticker from the EGX 30 JSON."""
    data = json.loads(Path(egx30_path).read_text(encoding="utf-8"))
    return {
        holding["ticker"].strip().upper(): holding["name"]
        for holding in data["holdings"]
        if holding.get("ticker") and holding.get("name")
    }


def write_egx30_snapshot(output_path: Path | str) -> Path:
    """Write the normalized EGX 30 snapshot to JSON."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = fetch_egx30_holdings()
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def _dedupe(values: list[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        normalized = value.strip().upper()
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result
