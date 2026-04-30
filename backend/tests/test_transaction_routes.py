"""Integration tests for the /transactions routes, including the OCR pipeline."""

import pytest
from unittest.mock import patch


class TestCreateTransaction:
    def test_create_expense(self, client, auth_headers):
        response = client.post("/transactions/", json={
            "type": "expense",
            "amount": 29.99,
            "category": "Food",
            "merchant": "Starbucks",
            "date": "2024-03-01",
        }, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["amount"] == 29.99
        assert data["type"] == "expense"
        assert data["merchant"] == "Starbucks"

    def test_create_income(self, client, auth_headers):
        response = client.post("/transactions/", json={
            "type": "income",
            "amount": 5000.00,
            "category": "Salary",
            "merchant": "Employer Inc",
            "date": "2024-03-01",
        }, headers=auth_headers)
        assert response.status_code == 201
        assert response.json()["type"] == "income"

    def test_create_invalid_type(self, client, auth_headers):
        response = client.post("/transactions/", json={
            "type": "debit",
            "amount": 10.00,
        }, headers=auth_headers)
        assert response.status_code == 400

    def test_create_requires_auth(self, client):
        response = client.post("/transactions/", json={"type": "expense", "amount": 10.00})
        assert response.status_code == 403

    def test_create_missing_amount(self, client, auth_headers):
        response = client.post("/transactions/", json={"type": "expense"}, headers=auth_headers)
        assert response.status_code == 422


class TestListTransactions:
    def test_list_returns_user_transactions_only(self, client, auth_headers, sample_transactions):
        response = client.get("/transactions/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == len(sample_transactions)

    def test_list_requires_auth(self, client):
        response = client.get("/transactions/")
        assert response.status_code == 403

    def test_list_empty_for_new_user(self, client, db):
        from app.core.security import hash_password, create_access_token
        from app.models.user import User
        new_user = User(email="empty@example.com", password_hash=hash_password("pass"))
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        token = create_access_token({"sub": str(new_user.id)})
        response = client.get("/transactions/", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json() == []


class TestScanReceiptEndpoint:
    def test_scan_non_image_rejected(self, client, auth_headers):
        response = client.post(
            "/transactions/scan",
            files={"file": ("test.txt", b"not an image", "text/plain")},
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_scan_returns_parsed_data(self, client, auth_headers):
        """Mocks OCR so we test the parse+validate pipeline without calling Google Vision."""
        mock_ocr_text = (
            "Starbucks Coffee\n"
            "Date: 2024-03-15\n"
            "Cafe Latte       4.50\n"
            "TOTAL $4.50\n"
        )
        with patch("app.api.routes.transactions.extract_text_from_image", return_value=mock_ocr_text):
            response = client.post(
                "/transactions/scan",
                files={"file": ("receipt.jpg", b"fake_image_bytes", "image/jpeg")},
                headers=auth_headers,
            )
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 4.50
        assert data["merchant"] == "Starbucks Coffee"
        assert data["suggested_category"] == "Food"
        assert "confidence" in data
        assert "warnings" in data

    def test_scan_missing_fields_returns_warnings(self, client, auth_headers):
        """Garbled OCR text should return warnings for unextracted fields."""
        with patch("app.api.routes.transactions.extract_text_from_image", return_value="@#$%^&*"):
            response = client.post(
                "/transactions/scan",
                files={"file": ("receipt.jpg", b"fake", "image/jpeg")},
                headers=auth_headers,
            )
        assert response.status_code == 200
        data = response.json()
        assert len(data["warnings"]) > 0

    def test_scan_ocr_unavailable(self, client, auth_headers):
        """If OCR credentials are missing, endpoint should return 503."""
        with patch("app.api.routes.transactions.extract_text_from_image",
                   side_effect=RuntimeError("Google Vision credentials not configured.")):
            response = client.post(
                "/transactions/scan",
                files={"file": ("receipt.jpg", b"fake", "image/jpeg")},
                headers=auth_headers,
            )
        assert response.status_code == 503

    def test_scan_requires_auth(self, client):
        response = client.post(
            "/transactions/scan",
            files={"file": ("receipt.jpg", b"fake", "image/jpeg")},
        )
        assert response.status_code == 403
