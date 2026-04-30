"""Unit tests for password hashing and JWT token utilities."""

import pytest
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        hashed = hash_password("mysecretpassword")
        assert hashed != "mysecretpassword"

    def test_verify_correct_password(self):
        hashed = hash_password("correctpassword")
        assert verify_password("correctpassword", hashed) is True

    def test_reject_wrong_password(self):
        hashed = hash_password("correctpassword")
        assert verify_password("wrongpassword", hashed) is False

    def test_same_password_different_hashes(self):
        """bcrypt uses a random salt — two hashes of the same password differ."""
        h1 = hash_password("samepassword")
        h2 = hash_password("samepassword")
        assert h1 != h2

    def test_empty_password_hashes(self):
        hashed = hash_password("")
        assert verify_password("", hashed) is True


class TestJWT:
    def test_create_and_decode_token(self):
        token = create_access_token({"sub": "42"})
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "42"

    def test_invalid_token_returns_none(self):
        assert decode_access_token("not.a.valid.token") is None

    def test_tampered_token_returns_none(self):
        token = create_access_token({"sub": "1"})
        tampered = token[:-5] + "XXXXX"
        assert decode_access_token(tampered) is None

    def test_empty_token_returns_none(self):
        assert decode_access_token("") is None

    def test_payload_preserved(self):
        token = create_access_token({"sub": "7", "role": "user"})
        payload = decode_access_token(token)
        assert payload["sub"] == "7"
        assert payload["role"] == "user"
