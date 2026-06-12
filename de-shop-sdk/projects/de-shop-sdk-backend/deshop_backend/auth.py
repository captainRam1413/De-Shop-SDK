"""
De-Shop SDK — JWT Authentication & Authorization
===================================================
Provides wallet-based authentication using signed messages
and JWT token issuance/verification.

Flow:
  1. Client requests a nonce: POST /auth/nonce { wallet: "..." }
  2. Client signs the nonce with their Algorand wallet
  3. Client submits: POST /auth/verify { wallet, signature }
  4. Server verifies signature and issues a JWT
  5. Client includes JWT in Authorization: Bearer <token> header

Security:
  - Nonces are single-use and expire after 5 minutes
  - JWT tokens expire after 24 hours
  - Tokens are signed with HMAC-SHA256 using the Flask SECRET_KEY
  - Wallet address is embedded in the token payload
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import time
from functools import wraps
from typing import Any, Callable

import jwt
from flask import Request, current_app, jsonify, request

# ─── Configuration ────────────────────────────────────────────────────────────

JWT_SECRET = os.getenv("JWT_SECRET", "")  # Falls back to Flask SECRET_KEY
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_SECONDS = 86400  # 24 hours
NONCE_EXPIRY_SECONDS = 300  # 5 minutes

# In-memory nonce store (use Redis in production for multi-instance)
_nonce_store: dict[str, tuple[str, float]] = {}


def _get_jwt_secret() -> str:
    """Get the JWT signing secret, preferring JWT_SECRET env var."""
    secret = JWT_SECRET
    if not secret:
        try:
            secret = current_app.config.get("SECRET_KEY", "")
        except RuntimeError:
            secret = "fallback-dev-secret"
    if not secret or secret == "dev-secret-please-change":
        # Generate a stable secret for dev based on a hash (>= 32 bytes for HS256)
        secret = hashlib.sha256(b"deshop-sdk-dev-key-deshop-sdk-production-jwt-secret").hexdigest()
    return secret


# ─── Nonce Management ─────────────────────────────────────────────────────────

def generate_nonce(wallet: str) -> str:
    """
    Generate a unique nonce for wallet authentication.
    The nonce must be signed by the wallet owner to prove ownership.
    """
    nonce = secrets.token_urlsafe(32)
    _nonce_store[wallet] = (nonce, time.time())
    return nonce


def verify_nonce(wallet: str, nonce: str) -> bool:
    """Verify that the nonce is valid and not expired."""
    entry = _nonce_store.get(wallet)
    if entry is None:
        return False
    stored_nonce, created_at = entry
    if time.time() - created_at > NONCE_EXPIRY_SECONDS:
        del _nonce_store[wallet]
        return False
    if stored_nonce != nonce:
        return False
    # Nonce is single-use — remove after verification
    del _nonce_store[wallet]
    return True


# ─── JWT Token Management ─────────────────────────────────────────────────────

def create_token(wallet: str, extra_claims: dict[str, Any] | None = None) -> str:
    """
    Create a JWT token for the authenticated wallet.

    Args:
        wallet: The Algorand wallet address
        extra_claims: Optional additional claims (e.g., steam_id, role)

    Returns:
        Encoded JWT string
    """
    now = time.time()
    payload = {
        "sub": wallet,
        "iat": int(now),
        "exp": int(now + JWT_EXPIRY_SECONDS),
        "type": "deshop_sdk_auth",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, _get_jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any] | None:
    """
    Decode and verify a JWT token.

    Returns:
        Token payload dict if valid, None if invalid/expired
    """
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "deshop_sdk_auth":
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ─── API Key Authentication ──────────────────────────────────────────────────

def verify_api_key(api_key: str) -> dict[str, Any] | None:
    """
    Verify an API key against the database.

    For gaming company partners who prefer API key auth over JWT.
    Returns the associated user dict if valid, None otherwise.
    """
    from .models import db, User
    user = User.query.filter_by(api_key=api_key).first()
    if user:
        return user.to_dict()
    return None


# ─── Flask Auth Decorators ────────────────────────────────────────────────────

def require_auth(f: Callable) -> Callable:
    """
    Decorator that requires JWT authentication.
    Extracts wallet address from the token and passes it to the route.

    Usage:
        @app.post("/mint")
        @require_auth
        def mint():
            wallet = request.auth_wallet  # Set by decorator
            ...

    Supports:
        - Bearer token in Authorization header
        - API key in X-API-Key header
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        api_key = request.headers.get("X-API-Key", "")

        # Try API key first
        if api_key:
            user_data = verify_api_key(api_key)
            if user_data:
                request.auth_wallet = user_data.get("wallet_address")
                request.auth_method = "api_key"
                request.auth_user = user_data
                return f(*args, **kwargs)
            return jsonify({"error": "Invalid API key"}), 401

        # Try Bearer token
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            payload = decode_token(token)
            if payload:
                request.auth_wallet = payload.get("sub")
                request.auth_method = "jwt"
                request.auth_user = payload
                return f(*args, **kwargs)
            return jsonify({"error": "Invalid or expired token"}), 401

        return jsonify({"error": "Authentication required. Provide Bearer token or X-API-Key header."}), 401

    return decorated_function


def require_wallet_match(f: Callable) -> Callable:
    """
    Decorator that verifies the authenticated wallet matches the target wallet.
    Must be used AFTER @require_auth.

    Ensures users can only perform actions on their own assets.
    Checks request.auth_wallet against the 'wallet' field in the JSON body.

    Usage:
        @app.post("/list")
        @require_auth
        @require_wallet_match
        def list_asset():
            ...
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(request, "auth_wallet"):
            return jsonify({"error": "Authentication required"}), 401

        data = request.get_json(silent=True) or {}
        target_wallet = str(data.get("wallet", "")).strip()

        if not target_wallet:
            return jsonify({"error": "wallet field is required"}), 400

        if request.auth_wallet != target_wallet:
            return jsonify({
                "error": "Wallet mismatch: authenticated wallet does not match target wallet"
            }), 403

        return f(*args, **kwargs)

    return decorated_function


def optional_auth(f: Callable) -> Callable:
    """
    Decorator that optionally extracts auth info if present.
    Does NOT block unauthenticated requests.
    Sets request.auth_wallet if a valid token is found.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        api_key = request.headers.get("X-API-Key", "")

        request.auth_wallet = None
        request.auth_method = None
        request.auth_user = None

        if api_key:
            user_data = verify_api_key(api_key)
            if user_data:
                request.auth_wallet = user_data.get("wallet_address")
                request.auth_method = "api_key"
                request.auth_user = user_data

        elif auth_header.startswith("Bearer "):
            token = auth_header[7:]
            payload = decode_token(token)
            if payload:
                request.auth_wallet = payload.get("sub")
                request.auth_method = "jwt"
                request.auth_user = payload

        return f(*args, **kwargs)

    return decorated_function
