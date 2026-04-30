"""Unit tests for the auto-categorization service."""

import pytest
from app.services.categorizer import auto_categorize


class TestAutoCategorizeMerchant:
    def test_food_starbucks(self):
        assert auto_categorize("Starbucks") == "Food"

    def test_food_mcdonalds(self):
        assert auto_categorize("McDonald's") == "Food"

    def test_food_grocery(self):
        assert auto_categorize("Whole Foods Market") == "Food"

    def test_transport_uber(self):
        assert auto_categorize("Uber") == "Transport"

    def test_transport_gas_station(self):
        assert auto_categorize("Shell Gas Station") == "Transport"

    def test_shopping_amazon(self):
        assert auto_categorize("Amazon") == "Shopping"

    def test_shopping_walmart(self):
        assert auto_categorize("Walmart") == "Shopping"

    def test_health_pharmacy(self):
        assert auto_categorize("CVS Pharmacy") == "Health"

    def test_health_gym(self):
        assert auto_categorize("Planet Fitness") == "Health"

    def test_entertainment_netflix(self):
        assert auto_categorize("Netflix") == "Entertainment"

    def test_bills_electric(self):
        assert auto_categorize("Electric Bill") == "Bills"

    def test_salary_payroll(self):
        assert auto_categorize("Payroll Deposit") == "Salary"

    def test_freelance_invoice(self):
        assert auto_categorize("Freelance Invoice") == "Freelance"

    def test_case_insensitive(self):
        assert auto_categorize("STARBUCKS") == "Food"
        assert auto_categorize("starbucks") == "Food"

    def test_unknown_merchant_returns_other(self):
        assert auto_categorize("XYZ Unknown Store 12345") == "Other"

    def test_none_merchant_uses_raw_text(self):
        assert auto_categorize(None, "starbucks coffee receipt") == "Food"

    def test_none_merchant_no_text(self):
        assert auto_categorize(None, "") == "Other"

    def test_raw_text_fallback(self):
        assert auto_categorize("Unknown Store", "uber receipt ride share") == "Transport"
