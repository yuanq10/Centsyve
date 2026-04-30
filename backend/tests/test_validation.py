"""Unit tests for the data validation service."""

import pytest
from datetime import date, timedelta
from app.services.validation import (
    validate_amount,
    validate_date,
    validate_merchant,
    validate_transaction_type,
    validate_parsed_receipt,
)


class TestValidateAmount:
    def test_valid_amount(self):
        assert validate_amount(25.99) == []

    def test_large_valid_amount(self):
        assert validate_amount(999.99) == []

    def test_none_amount_warns(self):
        warnings = validate_amount(None)
        assert len(warnings) == 1
        assert "Amount" in warnings[0]

    def test_zero_amount_warns(self):
        warnings = validate_amount(0.0)
        assert len(warnings) == 1

    def test_negative_amount_warns(self):
        warnings = validate_amount(-5.00)
        assert len(warnings) == 1

    def test_unreasonably_large_warns(self):
        warnings = validate_amount(99_999.99)
        assert len(warnings) == 1
        assert "large" in warnings[0].lower()


class TestValidateDate:
    def test_valid_recent_date(self):
        yesterday = date.today() - timedelta(days=1)
        assert validate_date(yesterday) == []

    def test_today_is_valid(self):
        assert validate_date(date.today()) == []

    def test_none_date_warns(self):
        warnings = validate_date(None)
        assert len(warnings) == 1

    def test_future_date_warns(self):
        future = date.today() + timedelta(days=10)
        warnings = validate_date(future)
        assert len(warnings) == 1
        assert "future" in warnings[0].lower()

    def test_old_date_warns(self):
        old = date.today() - timedelta(days=400)
        warnings = validate_date(old)
        assert len(warnings) == 1
        assert "year" in warnings[0].lower()


class TestValidateMerchant:
    def test_valid_merchant(self):
        assert validate_merchant("Starbucks") == []

    def test_none_merchant_warns(self):
        warnings = validate_merchant(None)
        assert len(warnings) == 1

    def test_short_merchant_warns(self):
        warnings = validate_merchant("A")
        assert len(warnings) == 1


class TestValidateTransactionType:
    def test_income_is_valid(self):
        assert validate_transaction_type("income") == []

    def test_expense_is_valid(self):
        assert validate_transaction_type("expense") == []

    def test_invalid_type_warns(self):
        warnings = validate_transaction_type("debit")
        assert len(warnings) == 1


class TestValidateParsedReceipt:
    def test_good_receipt_no_warnings(self):
        parsed = {
            "amount": 15.99,
            "date": date.today() - timedelta(days=1),
            "merchant": "Whole Foods",
        }
        result = validate_parsed_receipt(parsed)
        assert result["warnings"] == []

    def test_bad_receipt_has_warnings(self):
        parsed = {"amount": None, "date": None, "merchant": None}
        result = validate_parsed_receipt(parsed)
        assert len(result["warnings"]) == 3

    def test_preserves_original_fields(self):
        parsed = {"amount": 5.00, "date": date.today(), "merchant": "Test", "raw_text": "test"}
        result = validate_parsed_receipt(parsed)
        assert result["raw_text"] == "test"
        assert result["amount"] == 5.00
