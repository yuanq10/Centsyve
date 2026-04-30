"""
Receipt parser — extracts amount, date, merchant, and line items from OCR text.

Strategy:
  1. Amount  — scan for total-keyword lines first; fall back to largest dollar value.
  2. Date    — try 12 common date formats; validate the result is plausible.
  3. Merchant — first meaningful non-numeric, non-address line in the receipt.
  4. Items   — lines that look like  <description>  <price>.
  5. Confidence — 0-1 score based on how many fields were successfully extracted.
"""

import re
from datetime import date, datetime
from typing import Optional


# ═══════════════════════════════════════════════════════════════════
# AMOUNT
# ═══════════════════════════════════════════════════════════════════

_TOTAL_KW = (
    r"(?:grand\s*total|total\s*(?:due|amount|paid)?|amount\s*(?:due|paid|tendered)?"
    r"|balance\s*(?:due|owing)?|subtotal|sum\s*total|amt\s*(?:due)?|net\s*(?:total|amount)?)"
)

# Matches:  TOTAL   $1,234.56  /  TOTAL  1234.56  /  TOTAL: 12.50
_TOTAL_LINE = re.compile(
    rf"(?i){_TOTAL_KW}[^0-9\n]{{0,15}}(\d{{1,6}}(?:[,\s]\d{{3}})*[.,]\d{{2}})"
)

# Generic dollar amount anywhere:  $12.50  /  $ 1,234.56
_DOLLAR = re.compile(r"\$\s*(\d{1,6}(?:,\d{3})*\.\d{2})")

# Plain decimal that looks like a price (fallback):  12.50  /  1234.56
_PLAIN_AMOUNT = re.compile(r"(?<!\d)(\d{1,6}\.\d{2})(?!\d)")


def _clean_amount(raw: str) -> float:
    return float(raw.replace(",", "").replace(" ", ""))


def _parse_amount(text: str) -> Optional[float]:
    # Priority 1: line with a total keyword
    for line in text.splitlines():
        m = _TOTAL_LINE.search(line)
        if m:
            return _clean_amount(m.group(1))

    # Priority 2: largest explicit dollar amount
    dollar_amounts = [_clean_amount(m.group(1)) for m in _DOLLAR.finditer(text)]
    if dollar_amounts:
        return max(dollar_amounts)

    # Priority 3: largest plain decimal
    plain_amounts = [_clean_amount(m.group(1)) for m in _PLAIN_AMOUNT.finditer(text)]
    if plain_amounts:
        return max(plain_amounts)

    return None


# ═══════════════════════════════════════════════════════════════════
# DATE
# ═══════════════════════════════════════════════════════════════════

_MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    "january": 1, "february": 2, "march": 3, "april": 4, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}

# (pattern, handler) — handler receives m.groups() (0-indexed tuple)
_DATE_PATTERNS = [
    # ISO:  2024-01-15  /  2024/01/15  →  groups: (year, month, day)
    (re.compile(r"\b(20\d{2})[-/\.](\d{1,2})[-/\.](\d{1,2})\b"),
     lambda m: _make_date(int(m[0]), int(m[1]), int(m[2]))),

    # US:  01/15/2024  /  1-15-24  →  groups: (month, day, year)
    (re.compile(r"\b(\d{1,2})[-/\.](\d{1,2})[-/\.](20\d{2}|\d{2})\b"),
     lambda m: _make_date(_expand_year(m[2]), int(m[0]), int(m[1]))),

    # EU:  15.01.2024  /  15-01-24  →  groups: (day, month, year)
    (re.compile(r"\b(\d{1,2})[.\-](\d{1,2})[.\-](20\d{2}|\d{2})\b"),
     lambda m: _make_date(_expand_year(m[2]), int(m[1]), int(m[0]))),

    # Word month day-first:  15 Jan 2024  →  groups: (day, month_str, year)
    (re.compile(r"\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(20\d{2}|\d{2})\b", re.I),
     lambda m: _make_date(_expand_year(m[2]), _MONTH_MAP[m[1][:3].lower()], int(m[0]))),

    # Word month US-order:  January 15, 2024  →  groups: (month_str, day, year)
    (re.compile(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})[,\s]+(20\d{2}|\d{2})\b", re.I),
     lambda m: _make_date(_expand_year(m[2]), _MONTH_MAP[m[0][:3].lower()], int(m[1]))),
]


def _expand_year(y: str) -> int:
    yi = int(y)
    return yi if yi > 99 else 2000 + yi


def _make_date(year: int, month: int, day: int) -> Optional[date]:
    try:
        d = date(year, month, day)
        today = date.today()
        # Reject dates more than 10 years old or in the future
        if d.year < today.year - 10 or d > today:
            return None
        return d
    except ValueError:
        return None


def _parse_date(text: str) -> Optional[date]:
    for pattern, handler in _DATE_PATTERNS:
        m = pattern.search(text)
        if m:
            result = handler(m.groups())
            if result:
                return result
    return None


# ═══════════════════════════════════════════════════════════════════
# MERCHANT
# ═══════════════════════════════════════════════════════════════════

_SKIP_LINE = re.compile(
    r"(?i)^\s*("
    r"receipt|invoice|tax\s*invoice|bill|statement|"   # document types
    r"date|time|tel|phone|fax|www\.|http|email|"       # contact info
    r"thank\s*you|welcome|please|visit|"               # pleasantries
    r"\d{3,}|"                                          # lines starting with long numbers
    r"[\d\s\W]{4,}"                                    # lines that are mostly punctuation/numbers
    r")"
)
_ADDRESS_LINE = re.compile(r"\b(st|ave|blvd|rd|dr|ln|way|suite|ste|floor|fl|unit)\b", re.I)


def _parse_merchant(text: str) -> Optional[str]:
    for line in text.splitlines():
        line = line.strip()
        if len(line) < 3 or len(line) > 60:
            continue
        if _SKIP_LINE.match(line):
            continue
        if _ADDRESS_LINE.search(line):
            continue
        if re.match(r"^[\d\s\W]+$", line):
            continue
        return line
    return None


# ═══════════════════════════════════════════════════════════════════
# LINE ITEMS
# ═══════════════════════════════════════════════════════════════════

# Matches:  Coffee              2.50  /  Burger Meal ... $8.99
_ITEM_LINE = re.compile(
    r"^(?P<name>[A-Za-z][A-Za-z0-9 &\'\-]{2,30})\s+\.{0,10}\s*\$?\s*(?P<price>\d{1,4}\.\d{2})\s*$"
)
_SKIP_ITEM_KW = re.compile(
    r"(?i)(total|subtotal|tax|tip|discount|change|cash|visa|mastercard|debit|credit|balance)"
)


def _parse_items(text: str) -> list[dict]:
    items = []
    for line in text.splitlines():
        line = line.strip()
        m = _ITEM_LINE.match(line)
        if m and not _SKIP_ITEM_KW.search(line):
            items.append({
                "name": m.group("name").strip(),
                "price": float(m.group("price")),
            })
    return items


# ═══════════════════════════════════════════════════════════════════
# PUBLIC API
# ═══════════════════════════════════════════════════════════════════

def parse_receipt(text: str) -> dict:
    from app.services.categorizer import auto_categorize

    amount = _parse_amount(text)
    parsed_date = _parse_date(text)
    merchant = _parse_merchant(text)
    items = _parse_items(text)
    suggested_category = auto_categorize(merchant, text)

    # Confidence: weighted by fields found
    found = sum([
        0.35 if amount is not None else 0,
        0.25 if parsed_date is not None else 0,
        0.25 if merchant is not None else 0,
        0.15 if len(items) > 0 else 0,
    ])

    return {
        "amount": amount,
        "date": parsed_date,
        "merchant": merchant,
        "suggested_category": suggested_category,
        "items": items,
        "confidence": round(found, 2),
        "raw_text": text,
    }
