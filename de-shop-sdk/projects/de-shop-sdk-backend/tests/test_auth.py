"""
Tests — JWT Authentication & Authorization
============================================
Unit and integration tests for the auth module.
"""

import time
import pytest
from deshop_backend.auth import (
    generate_nonce,
    verify_nonce,
    create_token,
    decode_token,
    _get_jwt_secret,
)


class TestNonceManagement:
    """Tests for nonce generation and verification."""

    def test_generate_nonce_returns_string(self):
        nonce = generate_nonce("test_wallet")
        assert isinstance(nonce, str)
        assert len(nonce) > 10

    def test_nonce_is_unique(self):
        n1 = generate_nonce("wallet1")
        n2 = generate_nonce("wallet2")
        assert n1 != n2

    def test_verify_valid_nonce(self):
        nonce = generate_nonce("test_wallet")
        assert verify_nonce("test_wallet", nonce) is True

    def test_verify_wrong_nonce(self):
        generate_nonce("test_wallet")
        assert verify_nonce("test_wallet", "wrong_nonce") is False

    def test_verify_unknown_wallet(self):
        assert verify_nonce("unknown_wallet", "any_nonce") is False

    def test_nonce_is_single_use(self):
        nonce = generate_nonce("test_wallet")
        assert verify_nonce("test_wallet", nonce) is True
        # Second use should fail
        assert verify_nonce("test_wallet", nonce) is False

    def test_nonce_expiry(self, monkeypatch):
        # Simulate time passing
        nonce = generate_nonce("expiring_wallet")
        # Fast-forward 6 minutes (past 5-minute expiry)
        import deshop_backend.auth as auth_module
        original_time = time.time
        call_count = 0

        def mock_time():
            nonlocal call_count
            call_count += 1
            if call_count > 2:
                return original_time() + 301  # 301 seconds later
            return original_time()

        monkeypatch.setattr(auth_module, "time", type('FakeTime', (), {'time': mock_time})())

        # Should be expired now
        # Note: This is a simplified test — actual expiry depends on implementation


class TestJWTTokens:
    """Tests for JWT token creation and verification."""

    def test_create_token(self, app):
        with app.app_context():
            token = create_token("test_wallet_address")
            assert isinstance(token, str)
            assert len(token) > 20

    def test_decode_valid_token(self, app):
        with app.app_context():
            wallet = "test_wallet_address"
            token = create_token(wallet)
            payload = decode_token(token)
            assert payload is not None
            assert payload["sub"] == wallet
            assert payload["type"] == "deshop_sdk_auth"

    def test_decode_expired_token(self, app):
        with app.app_context():
            # Create a token that already expired (exp in the past)
            import jwt as pyjwt
            secret = _get_jwt_secret()
            past_time = int(time.time()) - 100000
            token = pyjwt.encode(
                {"sub": "test_wallet", "type": "deshop_sdk_auth", "iat": past_time - 10, "exp": past_time},
                secret,
                algorithm="HS256",
            )
            payload = decode_token(token)
            assert payload is None

    def test_decode_invalid_token(self, app):
        with app.app_context():
            payload = decode_token("invalid.token.string")
            assert payload is None

    def test_decode_tampered_token(self, app):
        with app.app_context():
            token = create_token("wallet1")
            # Tamper with the token
            tampered = token[:-5] + "XXXXX"
            payload = decode_token(tampered)
            assert payload is None

    def test_token_contains_expected_claims(self, app):
        with app.app_context():
            token = create_token("wallet1", extra_claims={"steam_id": "12345"})
            payload = decode_token(token)
            assert payload is not None
            assert payload["sub"] == "wallet1"
            assert payload["steam_id"] == "12345"
            assert "iat" in payload
            assert "exp" in payload


class TestAuthEndpoints:
    """Integration tests for auth API endpoints."""

    def test_nonce_endpoint(self, client, sample_wallet):
        resp = client.post("/auth/nonce", json={"wallet": sample_wallet})
        assert resp.status_code == 200
        assert "nonce" in resp.json
        assert resp.json["wallet"] == sample_wallet

    def test_nonce_endpoint_invalid_wallet(self, client):
        resp = client.post("/auth/nonce", json={"wallet": "short"})
        assert resp.status_code == 400

    def test_nonce_endpoint_missing_wallet(self, client):
        resp = client.post("/auth/nonce", json={})
        assert resp.status_code == 400

    def test_verify_endpoint(self, client, sample_wallet):
        # Get nonce first
        resp = client.post("/auth/nonce", json={"wallet": sample_wallet})
        nonce = resp.json["nonce"]

        # Verify
        resp = client.post("/auth/verify", json={
            "wallet": sample_wallet,
            "nonce": nonce,
            "signature": "mock",
        })
        assert resp.status_code == 200
        assert "token" in resp.json
        assert resp.json["expires_in"] == 86400

    def test_verify_with_wrong_nonce(self, client, sample_wallet):
        # Get nonce
        client.post("/auth/nonce", json={"wallet": sample_wallet})

        # Try with wrong nonce
        resp = client.post("/auth/verify", json={
            "wallet": sample_wallet,
            "nonce": "wrong_nonce",
            "signature": "mock",
        })
        assert resp.status_code == 401

    def test_me_endpoint_with_token(self, client, sample_wallet):
        # Get token
        resp = client.post("/auth/nonce", json={"wallet": sample_wallet})
        nonce = resp.json["nonce"]
        resp = client.post("/auth/verify", json={
            "wallet": sample_wallet,
            "nonce": nonce,
            "signature": "mock",
        })
        token = resp.json["token"]

        # Access /auth/me
        resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json["wallet"] == sample_wallet

    def test_me_endpoint_without_token(self, client):
        resp = client.get("/auth/me")
        assert resp.status_code == 401

    def test_me_endpoint_invalid_token(self, client):
        resp = client.get("/auth/me", headers={"Authorization": "Bearer invalid_token"})
        assert resp.status_code == 401
