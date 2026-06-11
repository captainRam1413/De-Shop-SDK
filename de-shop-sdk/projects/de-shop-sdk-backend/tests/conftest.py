"""
De-Shop SDK — Test Configuration & Fixtures
=============================================
Shared pytest fixtures for all backend tests.
"""

import os
import sys
import pytest

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Set test environment variables BEFORE importing app
os.environ["FLASK_SECRET"] = "test-secret-key-for-testing-32-bytes-minimum!"
os.environ["DATABASE_URL"] = "sqlite://"  # In-memory SQLite for tests
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
os.environ["RATE_LIMIT_URI"] = "memory://"

from deshop_backend.models import db as _db
from app import app as _app, limiter as _limiter


@pytest.fixture(scope="session")
def app():
    """Create a Flask app configured for testing."""
    _app.config["TESTING"] = True
    _app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite://"
    _app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    _app.config["SECRET_KEY"] = "test-secret-key-for-testing-32-bytes-minimum!"
    _app.config["RATE_LIMIT_URI"] = "memory://"

    # Disable rate limiting during tests
    _limiter.enabled = False

    ctx = _app.app_context()
    ctx.push()

    yield _app

    ctx.pop()


@pytest.fixture(scope="function")
def db(app):
    """Create fresh database tables for each test."""
    _db.create_all()
    yield _db
    _db.session.remove()
    _db.drop_all()


@pytest.fixture(scope="function")
def client(app, db):
    """Create a test client with a fresh database."""
    with app.test_client() as client:
        yield client


@pytest.fixture
def sample_wallet():
    """A valid-looking Algorand test wallet address."""
    return "A" * 58  # Simple valid format (58 base32 chars)


@pytest.fixture
def sample_wallet_2():
    """A second valid-looking Algorand test wallet address."""
    return "B" * 58


@pytest.fixture
def auth_headers(client, sample_wallet):
    """
    Get JWT authentication headers for the sample wallet.
    Goes through the nonce → verify flow.
    """
    # Request nonce
    resp = client.post("/auth/nonce", json={"wallet": sample_wallet})
    assert resp.status_code == 200
    nonce = resp.json["nonce"]

    # Verify and get token
    resp = client.post("/auth/verify", json={
        "wallet": sample_wallet,
        "nonce": nonce,
        "signature": "mock_signature",
    })
    assert resp.status_code == 200
    token = resp.json["token"]

    return {"Authorization": f"Bearer {token}"}
