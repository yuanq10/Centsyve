"""Integration tests for the /auth routes."""

import pytest


class TestRegister:
    def test_register_success(self, client):
        response = client.post("/auth/register", json={
            "email": "newuser@example.com",
            "password": "password123",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert "id" in data
        assert "password_hash" not in data

    def test_register_duplicate_email(self, client, test_user):
        response = client.post("/auth/register", json={
            "email": test_user.email,
            "password": "anotherpassword",
        })
        assert response.status_code == 409

    def test_register_invalid_email(self, client):
        response = client.post("/auth/register", json={
            "email": "not-an-email",
            "password": "password123",
        })
        assert response.status_code == 422

    def test_register_missing_fields(self, client):
        response = client.post("/auth/register", json={"email": "a@b.com"})
        assert response.status_code == 422


class TestLogin:
    def test_login_success(self, client, test_user):
        response = client.post("/auth/login", json={
            "email": test_user.email,
            "password": "password123",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_user):
        response = client.post("/auth/login", json={
            "email": test_user.email,
            "password": "wrongpassword",
        })
        assert response.status_code == 401

    def test_login_unknown_email(self, client):
        response = client.post("/auth/login", json={
            "email": "nobody@example.com",
            "password": "password123",
        })
        assert response.status_code == 401


class TestGetMe:
    def test_get_me_authenticated(self, client, test_user, auth_headers):
        response = client.get("/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["id"] == test_user.id

    def test_get_me_no_token(self, client):
        response = client.get("/auth/me")
        assert response.status_code == 403

    def test_get_me_invalid_token(self, client):
        response = client.get("/auth/me", headers={"Authorization": "Bearer invalidtoken"})
        assert response.status_code == 401
