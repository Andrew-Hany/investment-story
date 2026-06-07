"""SEC EDGAR 8-K event enrichment: CEO/executive changes and major announcements."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


# EDGAR rate limit is ~10 req/sec; we stay well below that
_REQUEST_DELAY = 0.15
_TIMEOUT = 20

# 8-K item codes we care about
_TARGET_ITEMS = {"5.02", "7.01", "8.01"}

# Keywords that indicate a Product Launch in 8.01/7.01 text
_PRODUCT_KEYWORDS = re.compile(
    r"\b(launch(?:es|ed|ing)?|introduc(?:es|ed|ing)|unveil(?:s|ed|ing)|"
    r"announc(?:es|ed|ing)\s+(?:new|the)\s+|new\s+product|release[sd]?\s+(?:of\s+)?(?:its\s+)?(?:new\s+)?)",
    re.IGNORECASE,
)

# Keywords that indicate a high-value Strategic Corporate Milestone in 8.01/7.01 text
_STRATEGIC_KEYWORDS = re.compile(
    r"\b(merg(?:er|e|ing)|acquir(?:e|ed|ing|isition)|takeover|divest(?:iture|ed)?|"
    r"spin-off|spinoff|restructur(?:e|ed|ing)|joint\s+venture|\bJV\b|"
    r"partner(?:ship|ed|ing)|collaborat(?:e|ed|ing|ion)|fda\s+(?:approv(?:e|ed|al)|clear(?:ed|ance))|"
    r"clinical\s+trial|phase\s+[123]\b|patent|settle(?:ment|d)?)\b",
    re.IGNORECASE,
)

# Keywords that mark noise in 8.01/7.01 (bond offerings, boilerplate)
_NOISE_KEYWORDS = re.compile(
    r"\b(aggregate principal amount|notes due \d{4}|indenture|underwriting agreement|"
    r"offering price|base rate|stress test|dodd.frank|DFAST|Regulation FD)",
    re.IGNORECASE,
)

# Captures the relevant paragraph after an Item heading
_ITEM_PARA_RE = re.compile(
    r"Item\s+(\d+\.\d+)[^\n]*\n?(.*?)(?=Item\s+\d+\.\d+|\Z)",
    re.DOTALL | re.IGNORECASE,
)

_HEADERS = {
    "User-Agent": "InvestingApp/1.0 contact@investing-app.example.com",
    "Accept-Encoding": "gzip",
}


# ---------------------------------------------------------------------------
# CIK helpers
# ---------------------------------------------------------------------------

def build_cik_map(cache_path: Path | str | None = None) -> dict[str, str]:
    """Fetch ticker→CIK mapping from SEC and optionally cache it.

    Returns a dict mapping uppercase ticker → zero-padded 10-digit CIK string.
    """
    url = "https://www.sec.gov/files/company_tickers.json"
    raw = _get_text(url)
    data: dict[str, Any] = json.loads(raw)

    cik_map: dict[str, str] = {}
    for entry in data.values():
        ticker = entry.get("ticker", "").upper().strip()
        cik = str(entry.get("cik_str", "")).zfill(10)
        if ticker:
            cik_map[ticker] = cik

    if cache_path is not None:
        p = Path(cache_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(cik_map, indent=2) + "\n", encoding="utf-8")

    return cik_map


def load_cik_map(cache_path: Path | str) -> dict[str, str]:
    """Load CIK map from cache file, rebuilding if missing."""
    p = Path(cache_path)
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return build_cik_map(cache_path=cache_path)


def ticker_to_cik(ticker: str, cik_map: dict[str, str]) -> str | None:
    """Return zero-padded CIK for a ticker, or None if not found."""
    return cik_map.get(ticker.upper().strip())


# ---------------------------------------------------------------------------
# Core fetcher
# ---------------------------------------------------------------------------

def fetch_sec_events(ticker: str, cik: str) -> list[dict[str, Any]]:
    """Fetch 8-K milestones and announcements from SEC EDGAR for one company.

    Args:
        ticker: Stock ticker symbol (e.g. "AAPL").
        cik:    Zero-padded 10-digit CIK string (e.g. "0000320193").

    Returns:
        List of event dicts compatible with the existing timeline_events format.
    """
    events: list[dict[str, Any]] = []
    cik_padded = cik.zfill(10)

    try:
        subs_url = f"https://data.sec.gov/submissions/CIK{cik_padded}.json"
        raw = _get_text(subs_url)
        subs: dict[str, Any] = json.loads(raw)
    except Exception as e:
        print(f"  [SEC] Could not fetch submissions for {ticker} (CIK {cik}): {e}")
        return events

    company_name = subs.get("name", ticker.upper())
    
    # Gather recent filings
    filings_recent = subs.get("filings", {}).get("recent", {})
    
    # We will build a unified list of filings to process
    unified_filings = []
    
    def add_filings_dict(fd: dict[str, Any]):
        forms = fd.get("form", [])
        dates = fd.get("filingDate", [])
        items_list = fd.get("items", [])
        accessions = fd.get("accessionNumber", [])
        primary_docs = fd.get("primaryDocument", [])
        
        for idx in range(len(forms)):
            unified_filings.append({
                "form": forms[idx] if idx < len(forms) else "",
                "filingDate": dates[idx] if idx < len(dates) else "",
                "items": items_list[idx] if idx < len(items_list) else "",
                "accessionNumber": accessions[idx] if idx < len(accessions) else "",
                "primaryDocument": primary_docs[idx] if idx < len(primary_docs) else "",
            })
            
    add_filings_dict(filings_recent)
    
    # Also fetch and merge all historical filings listed in filings -> files
    history_files = subs.get("filings", {}).get("files", [])
    for hf in history_files:
        hf_name = hf.get("name")
        if not hf_name:
            continue
        try:
            time.sleep(_REQUEST_DELAY)
            hf_url = f"https://data.sec.gov/submissions/{hf_name}"
            hf_raw = _get_text(hf_url)
            hf_data: dict[str, Any] = json.loads(hf_raw)
            add_filings_dict(hf_data)
        except Exception as e:
            print(f"  [SEC] Could not fetch historical filings file {hf_name}: {e}")

    # Process all unified filings
    for filing in unified_filings:
        form = filing["form"]
        if form != "8-K":
            continue

        raw_items = filing["items"]
        filing_item_codes = {it.strip() for it in str(raw_items).split(",")}

        matched = filing_item_codes & _TARGET_ITEMS
        if not matched:
            continue

        filing_date = filing["filingDate"]
        acc = filing["accessionNumber"]
        primary_doc = filing["primaryDocument"]

        if not filing_date or not acc or not primary_doc:
            continue

        # Fetch and parse document text
        acc_path = acc.replace("-", "")
        doc_url = (
            f"https://www.sec.gov/Archives/edgar/data/"
            f"{int(cik_padded)}/{acc_path}/{primary_doc}"
        )
        try:
            time.sleep(_REQUEST_DELAY)
            html = _get_text(doc_url)
            plain = _strip_html(html)
        except Exception as e:
            print(f"  [SEC] Could not fetch doc {doc_url}: {e}")
            continue

        # Extract relevant Item sections from the plain text
        for item_code in sorted(matched):
            parsed_list = _parse_item(
                item_code=item_code,
                plain_text=plain,
                filing_date=filing_date,
                company_name=company_name,
                ticker=ticker,
                accession=acc,
            )
            events.extend(parsed_list)

    return events


# ---------------------------------------------------------------------------
# Enrichment helper (reads existing JSON, merges, writes back)
# ---------------------------------------------------------------------------

def enrich_events_file(
    json_path: Path | str,
    cik_map: dict[str, str],
) -> int:
    """Read an existing events JSON, add SEC events on top, write back.

    Returns the number of new SEC events added.
    """
    p = Path(json_path)
    if not p.exists():
        return 0

    payload: dict[str, Any] = json.loads(p.read_text(encoding="utf-8"))
    ticker = payload.get("ticker", p.stem.upper())

    cik = ticker_to_cik(ticker, cik_map)
    if not cik:
        return 0

    new_events = fetch_sec_events(ticker, cik)
    if not new_events:
        return 0

    # Strip any previously written SEC events to ensure clean idempotent rebuild
    original_len = len(payload.get("timeline_events", []))
    payload["timeline_events"] = [
        e for e in payload.get("timeline_events", [])
        if e.get("details", {}).get("source") != "SEC EDGAR 8-K"
    ]
    stripped_count = original_len - len(payload["timeline_events"])

    # Deduplicate against remaining events
    existing_keys = {
        (e["date"], e["event_type"], e["description"][:60])
        for e in payload["timeline_events"]
    }

    added = 0
    for ev in new_events:
        key = (ev["date"], ev["event_type"], ev["description"][:60])
        if key not in existing_keys:
            payload["timeline_events"].append(ev)
            existing_keys.add(key)
            added += 1

    if added > 0 or stripped_count > 0:
        # Re-sort chronologically (newest first)
        payload["timeline_events"].sort(key=lambda x: x["date"], reverse=True)
        # Update source tag
        payload["source"] = "Yahoo Finance + SEC EDGAR 8-K"
        p.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    return added


# ---------------------------------------------------------------------------
# Text parsing helpers
# ---------------------------------------------------------------------------

def _parse_item(
    item_code: str,
    plain_text: str,
    filing_date: str,
    company_name: str,
    ticker: str,
    accession: str,
) -> list[dict[str, Any]]:
    """Extract structured events from a plain-text 8-K document."""

    # Find the relevant paragraph for this item code
    pattern = re.compile(
        rf"Item\s+{re.escape(item_code)}[^\n]{{0,120}}\n?(.*?)(?=Item\s+\d+\.\d+|\Z)",
        re.DOTALL | re.IGNORECASE,
    )
    match = pattern.search(plain_text)
    if not match:
        return []

    paragraph = match.group(1).strip()
    paragraph = re.sub(r"\s+", " ", paragraph).strip()
    paragraph = _decode_entities(paragraph)

    # Skip if too short — means we extracted nothing useful
    if len(paragraph) < 60:
        return []

    if item_code == "5.02":
        return _build_502_events(paragraph, filing_date, company_name, accession)

    # For 8.01/7.01 — skip bond offerings and regulatory boilerplate
    if _NOISE_KEYWORDS.search(paragraph[:300]):
        return []

    snippet = paragraph[:400].strip()

    # Final sanity — skip XBRL boilerplate
    if re.search(r"xbrl|xmlns|true\s+true\s+true", snippet, re.IGNORECASE):
        return []

    # ONLY keep if it matches high-value product or strategic keywords
    is_product = bool(_PRODUCT_KEYWORDS.search(snippet))
    is_strategic = bool(_STRATEGIC_KEYWORDS.search(snippet))

    if not (is_product or is_strategic):
        return []

    event_type = "Product Launch" if is_product else "Corporate Milestone"

    # Use first complete sentence as description
    first_sentence = _first_sentence(snippet)
    if not first_sentence or len(first_sentence) < 30:
        return []

    return [{
        "date": filing_date,
        "event_type": event_type,
        "description": first_sentence,
        "details": {
            "source": "SEC EDGAR 8-K",
            "item": item_code,
            "accession": accession,
        },
    }]


def _build_502_events(
    paragraph: str,
    filing_date: str,
    company_name: str,
    accession: str,
) -> list[dict[str, Any]]:
    """Parse Item 5.02 text and return all structured executive change events.

    Extracts: executive_name, role, action (appointed/resigned/transition)
    and builds a clean human-readable description for each unique candidate.
    """
    # Strip the legal header boilerplate that always starts Item 5.02
    text = re.sub(
        r"^.*?(?:Departure|Election|Appointment|Compensatory)\s+of[^.]+\.\s*",
        "",
        paragraph,
        flags=re.IGNORECASE,
    ).strip()

    if not text:
        text = paragraph  # fallback if strip removed everything

    # --- Extraction patterns: (name, role, action) ---
    # Each pattern yields: (full_sentence, name, role, action)
    ROLE_WORDS = (
        r"(?:Chief\s+Executive\s+Officer|\bCEO\b|Chief\s+Financial\s+Officer|\bCFO\b|"
        r"Chief\s+Operating\s+Officer|\bCOO\b|Chief\s+Technology\s+Officer|\bCTO\b|"
        r"Chief\s+Legal\s+Officer|General\s+Counsel|Chief\s+Accounting\s+Officer|"
        r"Principal\s+Accounting\s+Officer|\bPresident\b|Executive\s+Chair(?:man)?|"
        r"\bChairman\b|Vice\s+President|Senior\s+Vice\s+President|Board\s+of\s+Directors)"
    )

    # Words that should NOT appear at the start of a valid person name
    _ROLE_TITLE_STARTS = {
        "Chief", "Principal", "Vice", "Senior", "General", "Executive",
        "President", "Chairman", "Director", "Officer", "Board",
    }

    candidates = []

    def is_person_name(name: str) -> bool:
        """Return True if name looks like a human name, not a role title."""
        return name.split()[0] not in _ROLE_TITLE_STARTS

    # Optional possessive prefix between "as" and the role: "as Apple's", "as the"
    _AS_ROLE = rf"as\s+(?:the\s+|[A-Z][A-Za-z']+s\s+)?({ROLE_WORDS})"

    # Match names with optional middle initials (e.g. Steve Jobs, Timothy D. Cook)
    _NAME = r"([A-Z][a-z]+(?:\s+(?:[A-Z]\.?|[A-Z][a-z]+))*\s+[A-Z][a-z]+)"

    # Pattern A: "NAME appointed as [Company's] ROLE ..."
    for m in re.finditer(
        rf"{_NAME}(?:,\s*\d+,)?\s+(?:has been |was |will be )?appointed\s+{_AS_ROLE}[^.{{}}]{{0,200}}\.",
        text,
    ):
        name = m.group(1)
        if is_person_name(name):
            candidates.append((m.group(0), name, m.group(2), "appointed"))

    # Pattern B: "appointed NAME as [Company's] ROLE ..."
    for m in re.finditer(
        rf"appointed\s+{_NAME}(?:,\s*\d+,)?\s+{_AS_ROLE}[^.{{}}]{{0,200}}\.",
        text,
    ):
        name = m.group(1)
        if is_person_name(name):
            candidates.append((m.group(0), name, m.group(2), "appointed"))

    # Pattern C: "NAME will transition / resign / step down ..."
    for m in re.finditer(
        rf"{_NAME}\s+(?:will\s+)?(?:transition|resign(?:ed)?|step(?:ped)?\s+down|notified)[^.{{}}]{{0,200}}\.",
        text,
    ):
        name = m.group(1)
        if not is_person_name(name):
            continue
        action = "resigned" if "resign" in m.group(0).lower() else "transition"
        role_m = re.search(ROLE_WORDS, m.group(0))
        role = role_m.group(0) if role_m else "executive role"
        candidates.append((m.group(0), name, role, action))

    # Pattern D: "NAME, AGE, appointed/elected as [Company's] ROLE"
    for m in re.finditer(
        rf"{_NAME},\s*\d+,\s+(?:has been |was |will be )?(?:elected|appointed)\s+{_AS_ROLE}[^.{{}}]{{0,200}}\.",
        text,
    ):
        name = m.group(1)
        if not is_person_name(name):
            continue
        role = m.group(2)
        candidates.append((m.group(0), name, role, "appointed"))

    # Pattern E: "ROLE NAME will transition / resign ..." (role appears before name)
    for m in re.finditer(
        rf"({ROLE_WORDS})\s+{_NAME}\s+(?:will\s+)?(?:transition|resign(?:ed)?|step(?:ped)?\s+down)[^.{{}}]{{0,200}}\.",
        text,
    ):
        role = m.group(1)
        name = m.group(2)
        if not is_person_name(name):
            continue
        action = "resigned" if "resign" in m.group(0).lower() else "transition"
        candidates.append((m.group(0), name, role, action))

    # Pattern F: "promoted [ROLE] NAME to ROLE ..."
    for m in re.finditer(
        rf"promoted\s+(?:{ROLE_WORDS}\s+)?{_NAME}\s+to\s+({ROLE_WORDS})",
        text,
    ):
        name = m.group(1)
        if is_person_name(name):
            candidates.append((m.group(0), name, m.group(2), "appointed"))

    if not candidates:
        return []

    # Deduplicate candidates by (name, action, role)
    seen = set()
    events = []
    for sentence, name, role, action in candidates:
        key = (name, action, role)
        if key in seen:
            continue
        seen.add(key)

        sentence = sentence.strip()

        # Build clean description
        if action == "appointed":
            description = f"{name} appointed as {role} of {company_name}."
        elif action == "resigned":
            description = f"{name} resigned from {role} at {company_name}."
        else:
            description = f"{name} transitioning from {role} at {company_name}."

        # Append effective date if mentioned in the sentence
        eff_m = re.search(
            r"effective\s+([A-Z][a-z]+\s+\d{1,2},?\s+\d{4}|\w+ \d{1,2},? \d{4}|[A-Z][a-z]+ \d{1,2},? \d{4})",
            sentence,
            re.IGNORECASE,
        )
        if eff_m:
            description = description.rstrip(".") + f", effective {eff_m.group(1)}."

        events.append({
            "date": filing_date,
            "event_type": "Corporate Milestone",
            "description": description,
            "details": {
                "source": "SEC EDGAR 8-K",
                "item": "5.02",
                "executive_name": name,
                "role": role,
                "action": action,
                "accession": accession,
            },
        })

    return events


def _first_sentence(text: str) -> str:
    """Return the first complete, well-formed sentence from text."""
    # Immediately reject text that starts mid-word (HTML truncation artifact)
    if text and text[0].islower():
        return ""
    # Split on sentence-ending punctuation followed by space+capital
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z])", text)
    for part in parts:
        part = part.strip()
        # Must start with uppercase, be long enough, and not be XBRL noise
        if (
            len(part) > 30
            and part[0].isupper()
            and not re.search(r"xbrl|xmlns|0000\d{6}", part, re.IGNORECASE)
        ):
            return part[:350]
    return ""
def _strip_html(html: str) -> str:
    """Remove HTML tags and decode entities."""
    text = re.sub(r"<style[^>]*>.*?</style>", " ", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


def _decode_entities(text: str) -> str:
    """Replace common HTML entities with plain text equivalents."""
    replacements = {
        "&amp;": "&", "&lt;": "<", "&gt;": ">",
        "&nbsp;": " ", "&quot;": '"', "&#8220;": '"',
        "&#8221;": '"', "&#8217;": "'", "&#8216;": "'",
        "&#160;": " ", "&rsquo;": "'", "&ldquo;": '"', "&rdquo;": '"',
    }
    for ent, char in replacements.items():
        text = text.replace(ent, char)
    # Numeric entities fallback
    text = re.sub(r"&#(\d+);", lambda m: chr(int(m.group(1))), text)
    return text


def _get_text(url: str) -> str:
    """HTTP GET with EDGAR-friendly headers, returns decoded text."""
    req = urllib.request.Request(url, headers=_HEADERS)
    with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
        raw = resp.read()
        # Handle gzip transparently (urllib usually does this but be explicit)
        try:
            import gzip
            if resp.info().get("Content-Encoding") == "gzip":
                raw = gzip.decompress(raw)
        except Exception:
            pass
        return raw.decode("utf-8", errors="replace")
