"""Unit tests for the receipt parser — covers normal cases and all edge cases."""

import pytest
from datetime import date
from app.services.parser import parse_receipt


# ── Amount extraction ─────────────────────────────────────────────────────────

class TestAmountExtraction:
    def test_total_keyword(self):
        result = parse_receipt("Items...\nTOTAL  $24.99\nThank you")
        assert result["amount"] == 24.99

    def test_grand_total(self):
        result = parse_receipt("GRAND TOTAL: 112.50")
        assert result["amount"] == 112.50

    def test_amount_due(self):
        result = parse_receipt("AMOUNT DUE  $8.75")
        assert result["amount"] == 8.75

    def test_balance_due(self):
        result = parse_receipt("Balance Due: 33.00")
        assert result["amount"] == 33.00

    def test_dollar_sign_fallback(self):
        result = parse_receipt("Coffee $3.50\nMuffin $2.00")
        assert result["amount"] == 3.50  # largest value

    def test_comma_thousands(self):
        result = parse_receipt("TOTAL $1,234.56")
        assert result["amount"] == 1234.56

    def test_no_amount(self):
        result = parse_receipt("Thank you for shopping!")
        assert result["amount"] is None

    def test_empty_text(self):
        result = parse_receipt("")
        assert result["amount"] is None

    def test_garbled_text(self):
        result = parse_receipt("@#$%^ !!!! ???")
        assert result["amount"] is None


# ── Date extraction ───────────────────────────────────────────────────────────

class TestDateExtraction:
    def test_iso_format(self):
        result = parse_receipt("Date: 2024-03-15")
        assert result["date"] == date(2024, 3, 15)

    def test_us_slash_format(self):
        result = parse_receipt("Date: 03/15/2024")
        assert result["date"] is not None

    def test_word_month_format(self):
        result = parse_receipt("Date: 15 Jan 2024")
        assert result["date"] == date(2024, 1, 15)

    def test_word_month_us_order(self):
        result = parse_receipt("January 15, 2024")
        assert result["date"] == date(2024, 1, 15)

    def test_future_date_rejected(self):
        result = parse_receipt("Date: 2099-01-01")
        assert result["date"] is None

    def test_very_old_date_rejected(self):
        result = parse_receipt("Date: 2010-01-01")
        assert result["date"] is None

    def test_no_date(self):
        result = parse_receipt("No date here")
        assert result["date"] is None


# ── Merchant extraction ───────────────────────────────────────────────────────

class TestMerchantExtraction:
    def test_first_meaningful_line(self):
        result = parse_receipt("Starbucks Coffee\nDate: 2024-01-15\nTOTAL $5.00")
        assert result["merchant"] == "Starbucks Coffee"

    def test_skips_short_lines(self):
        result = parse_receipt("--\nWhole Foods Market\nTOTAL $45.00")
        assert result["merchant"] == "Whole Foods Market"

    def test_skips_numeric_lines(self):
        result = parse_receipt("123456\nBest Buy\nTOTAL $299.99")
        assert result["merchant"] == "Best Buy"

    def test_skips_receipt_keyword(self):
        result = parse_receipt("Receipt\nTarget Store\nTOTAL $22.00")
        assert result["merchant"] == "Target Store"

    def test_no_merchant(self):
        result = parse_receipt("123\n456\n789")
        assert result["merchant"] is None


# ── Item extraction ───────────────────────────────────────────────────────────

class TestItemExtraction:
    def test_detects_items(self):
        text = "Cafe Latte       4.50\nBlueberry Muffin 3.00\nTOTAL $7.50"
        result = parse_receipt(text)
        assert len(result["items"]) == 2
        assert result["items"][0]["name"] == "Cafe Latte"
        assert result["items"][0]["price"] == 4.50

    def test_skips_total_lines(self):
        text = "Coffee 3.00\nTOTAL  3.00"
        result = parse_receipt(text)
        names = [i["name"] for i in result["items"]]
        assert "TOTAL" not in names

    def test_no_items(self):
        result = parse_receipt("TOTAL $10.00")
        assert result["items"] == []


# ── Confidence scoring ────────────────────────────────────────────────────────

class TestConfidence:
    def test_full_confidence(self):
        text = "McDonald's\nDate: 2024-01-15\nBig Mac  5.99\nTOTAL $5.99"
        result = parse_receipt(text)
        assert result["confidence"] == 1.0

    def test_partial_confidence(self):
        result = parse_receipt("TOTAL $10.00")
        assert 0 < result["confidence"] < 1.0

    def test_zero_confidence(self):
        result = parse_receipt("")
        assert result["confidence"] == 0.0


# ── Edge cases ────────────────────────────────────────────────────────────────

class TestEdgeCases:
    def test_blurry_image_garbled_text(self):
        """Blurry images produce garbage OCR — parser should not crash."""
        garbled = "lI1|l0O lI1 !!@# $%^ &*() 0O0 lIl"
        result = parse_receipt(garbled)
        assert result is not None
        assert "amount" in result
        assert "date" in result

    def test_missing_all_fields(self):
        result = parse_receipt("Thank you for visiting!")
        assert result["amount"] is None
        assert result["date"] is None
        assert result["confidence"] == 0.0

    def test_unusual_layout_multiline_total(self):
        text = "GRAND\nTOTAL\n$99.99\n2024-06-01"
        result = parse_receipt(text)
        # Should at minimum find the date
        assert result["date"] == date(2024, 6, 1)

    def test_returns_raw_text(self):
        text = "Some receipt text"
        result = parse_receipt(text)
        assert result["raw_text"] == text
