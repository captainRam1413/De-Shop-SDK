"""
De-Shop SDK — IPFS Metadata Storage via Pinata
================================================
Uploads JSON metadata and image files to IPFS using the Pinata REST API.

Pinata API Docs:
  JSON: POST https://api.pinata.cloud/pinning/pinJSONToIPFS
  File: POST https://api.pinata.cloud/pinning/pinFileToIPFS
  Auth:  Bearer <PINATA_JWT> (from env var)

Features:
  - ERC-721 compatible metadata formatting
  - SHA-256 content-hash caching (avoids re-uploading identical data)
  - Fallback mode when PINATA_JWT is not configured (returns mock URIs)
  - Rate limiter: max 30 requests per 60 seconds
"""

from __future__ import annotations

import hashlib
import json
import os
import time
import threading
from io import BytesIO
from typing import Any

import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PINATA_JWT: str | None = os.environ.get("PINATA_JWT")

PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"
PINATA_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"

# Rate limiter constants
_RATE_LIMIT_MAX_REQUESTS = 30
_RATE_LIMIT_WINDOW_SECONDS = 60

# ---------------------------------------------------------------------------
# Content-hash cache:  sha256_hex -> ipfs_uri
# ---------------------------------------------------------------------------

_cache: dict[str, str] = {}
_cache_lock = threading.Lock()

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------

_request_timestamps: list[float] = []
_rate_limit_lock = threading.Lock()


def _rate_limit_check() -> None:
    """Block until a request slot is available within the rate-limit window."""
    while True:
        with _rate_limit_lock:
            now = time.time()
            # Prune timestamps outside the current window
            while _request_timestamps and _request_timestamps[0] < now - _RATE_LIMIT_WINDOW_SECONDS:
                _request_timestamps.pop(0)
            if len(_request_timestamps) < _RATE_LIMIT_MAX_REQUESTS:
                _request_timestamps.append(now)
                return
        # Wait briefly before retrying
        time.sleep(0.5)


def _sha256_hex(data: str | bytes) -> str:
    """Return the hex SHA-256 digest of *data*."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _pinata_headers() -> dict[str, str]:
    """Return HTTP headers for Pinata API calls (JWT Bearer auth)."""
    return {"Authorization": f"Bearer {PINATA_JWT}"}


def _upload_json_to_pinata(payload: dict[str, Any]) -> str:
    """
    Upload a JSON payload to Pinata and return the ``ipfs://<CID>`` URI.

    Raises on network / API errors so the caller can fall back.
    """
    _rate_limit_check()
    resp = requests.post(
        PINATA_JSON_URL,
        json=payload,
        headers={**_pinata_headers(), "Content-Type": "application/json"},
        timeout=30,
    )
    resp.raise_for_status()
    cid = resp.json()["IpfsHash"]
    return f"ipfs://{cid}"


def _upload_file_to_pinata(file_data: bytes, filename: str) -> str:
    """
    Upload raw file bytes to Pinata and return the ``ipfs://<CID>`` URI.

    Raises on network / API errors so the caller can fall back.
    """
    _rate_limit_check()
    files = {"file": (filename, BytesIO(file_data))}
    resp = requests.post(
        PINATA_FILE_URL,
        files=files,
        headers=_pinata_headers(),
        timeout=60,
    )
    resp.raise_for_status()
    cid = resp.json()["IpfsHash"]
    return f"ipfs://{cid}"


def _fallback_uri(content_hash: str) -> str:
    """
    Return a mock IPFS URI when Pinata is not configured.

    Uses the first 12 hex chars of the SHA-256 content hash so the URI
    is deterministic for the same content.
    """
    prefix = content_hash[:12]
    return f"ipfs://deshop/{prefix}"


# ---------------------------------------------------------------------------
# ERC-721 metadata helpers
# ---------------------------------------------------------------------------

def _normalise_metadata(metadata: dict[str, Any]) -> dict[str, Any]:
    """
    Ensure *metadata* conforms to the ERC-721 ``{name, description, image, attributes}`` schema.

    Missing top-level keys are filled with sensible defaults.
    ``attributes`` is guaranteed to be a list of ``{trait_type, value}`` dicts.
    """
    normalised: dict[str, Any] = {
        "name": metadata.get("name", "Unnamed De-Shop Asset"),
        "description": metadata.get("description", ""),
        "image": metadata.get("image", ""),
    }

    raw_attrs = metadata.get("attributes", [])
    if not isinstance(raw_attrs, list):
        raw_attrs = []
    attributes: list[dict[str, Any]] = []
    for attr in raw_attrs:
        if isinstance(attr, dict) and "trait_type" in attr and "value" in attr:
            attributes.append({"trait_type": attr["trait_type"], "value": attr["value"]})
    normalised["attributes"] = attributes

    # Preserve any extra top-level keys the caller passed in
    for key, value in metadata.items():
        if key not in normalised:
            normalised[key] = value

    return normalised


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def is_pinata_configured() -> bool:
    """Return ``True`` if the ``PINATA_JWT`` environment variable is set."""
    return bool(PINATA_JWT)


def upload_metadata(metadata: dict[str, Any]) -> str:
    """
    Upload JSON metadata to IPFS via Pinata.

    The metadata is normalised to ERC-721 format before upload. A SHA-256
    content-hash cache prevents re-uploading identical payloads.

    Args:
        metadata: Dict with at least ``name``. May include ``description``,
                  ``image``, and ``attributes`` (list of ``{trait_type, value}``).

    Returns:
        ``ipfs://<CID>`` URI string.
    """
    normalised = _normalise_metadata(metadata)
    content_str = json.dumps(normalised, sort_keys=True, separators=(",", ":"))
    content_hash = _sha256_hex(content_str)

    # Check cache
    with _cache_lock:
        if content_hash in _cache:
            return _cache[content_hash]

    if not is_pinata_configured():
        uri = _fallback_uri(content_hash)
        with _cache_lock:
            _cache[content_hash] = uri
        return uri

    try:
        uri = _upload_json_to_pinata({"pinataContent": normalised})
    except Exception:
        # On any Pinata error, fall back to mock URI
        uri = _fallback_uri(content_hash)

    with _cache_lock:
        _cache[content_hash] = uri
    return uri


def upload_image(file_data: bytes, filename: str) -> str:
    """
    Upload an image file to IPFS via Pinata.

    A SHA-256 content-hash cache prevents re-uploading identical files.

    Args:
        file_data: Raw bytes of the image.
        filename:  Original filename (used as the upload name in Pinata).

    Returns:
        ``ipfs://<CID>`` URI string.
    """
    content_hash = _sha256_hex(file_data)

    # Check cache
    with _cache_lock:
        if content_hash in _cache:
            return _cache[content_hash]

    if not is_pinata_configured():
        uri = _fallback_uri(content_hash)
        with _cache_lock:
            _cache[content_hash] = uri
        return uri

    try:
        uri = _upload_file_to_pinata(file_data, filename)
    except Exception:
        # On any Pinata error, fall back to mock URI
        uri = _fallback_uri(content_hash)

    with _cache_lock:
        _cache[content_hash] = uri
    return uri


def clear_cache() -> None:
    """Remove all entries from the content-hash cache."""
    with _cache_lock:
        _cache.clear()
