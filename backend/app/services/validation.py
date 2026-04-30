"""
Validation rules applied to parsed receipt data and manual transaction input.
Returns a list of warning strings — empty list means data looks clean.
"""

from datetime import date
from typing import Optional


MAX_REASONABLE_AMOUNT = 50_000
MIN_REASONABLE_AMOUNT = 0.01


def validate_amount(amount: Optional[float]) -> list[str]:
    warnings = []
    if amount is None:
        warnings.append("Amount could not be extracted from the receipt.")
    elif amount < MIN_REASONABLE_AMOUNT:
        warnings.append(f"Amount ${amount:.2f} is too small to be valid.")
    elif amount > MAX_REASONABLE_AMOUNT:
        warnings.append(f"Amount ${amount:,.2f} is unusually large — please verify.")
    return warnings


def validate_date(parsed_date: Optional[date]) -> list[str]:
    warnings = []
    today = date.today()
    if parsed_date is None:
        warnings.append("Date could not be extracted from the receipt.")
    elif parsed_date > today:
        warnings.append("Date is in the future — please verify.")
    elif (today - parsed_date).days > 365:
        warnings.append("Date is more than a year ago — please verify.")
    return warnings


def validate_merchant(merchant: Optional[str]) -> list[str]:
    if merchant is None:
        return ["Merchant name could not be extracted from the receipt."]
    if len(merchant) < 2:
        return ["Merchant name is too short — please verify."]
    return []


def validate_transaction_type(tx_type: str) -> list[str]:
    if tx_type not in ("income", "expense"):
        return ["Transaction type must be 'income' or 'expense'."]
    return []


def validate_parsed_receipt(parsed: dict) -> dict:
    """
    Run all validation rules against a parsed receipt dict.
    Returns the same dict with an added 'warnings' key.
    """
    warnings = (
        validate_amount(parsed.get("amount"))
        + validate_date(parsed.get("date"))
        + validate_merchant(parsed.get("merchant"))
    )
    return {**parsed, "warnings": warnings}
