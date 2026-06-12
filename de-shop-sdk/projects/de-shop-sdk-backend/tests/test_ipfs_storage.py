"""
Tests — IPFS Metadata Storage
================================
Unit tests for the deshop_backend.ipfs_storage module.

All tests operate in fallback mode (no PINATA_JWT set), which is
deterministic and does not require external network access.
"""

import json
import pytest
from deshop_backend.ipfs_storage import (
    upload_metadata,
    upload_image,
    is_pinata_configured,
    clear_cache,
    _normalise_metadata,
    _sha256_hex,
    _cache,
    _RATE_LIMIT_MAX_REQUESTS,
    _RATE_LIMIT_WINDOW_SECONDS,
)


# ─── TestIPFSStorage ─────────────────────────────────────────────────────────

class TestIPFSStorage:
    """Tests for IPFS metadata upload in fallback mode."""

    def test_fallback_mode_no_pinata(self):
        """Without PINATA_JWT, returns mock ipfs:// URI."""
        # In the test environment, PINATA_JWT should not be set
        assert not is_pinata_configured(), "Tests expect PINATA_JWT to be unset"
        uri = upload_metadata({"name": "Test Asset"})
        assert uri.startswith("ipfs://")

    def test_upload_metadata_returns_uri(self):
        """upload_metadata always returns a string starting with 'ipfs://'."""
        clear_cache()
        uri = upload_metadata({"name": "Fallback Test"})
        assert isinstance(uri, str)
        assert uri.startswith("ipfs://")

    def test_upload_metadata_deterministic(self):
        """Same metadata returns same URI (content-hash cache)."""
        clear_cache()
        metadata = {"name": "Deterministic Skin", "description": "Same every time"}
        uri1 = upload_metadata(metadata)
        uri2 = upload_metadata(metadata)
        assert uri1 == uri2

    def test_upload_metadata_different_content(self):
        """Different metadata returns different URI."""
        clear_cache()
        uri1 = upload_metadata({"name": "Skin A"})
        uri2 = upload_metadata({"name": "Skin B"})
        assert uri1 != uri2

    def test_is_pinata_configured_false(self):
        """is_pinata_configured returns False without PINATA_JWT."""
        # The module reads PINATA_JWT at import time; in test env it's unset
        assert is_pinata_configured() is False

    def test_clear_cache(self):
        """clear_cache removes all entries from the content-hash cache."""
        upload_metadata({"name": "Before Clear"})
        assert len(_cache) > 0

        clear_cache()
        assert len(_cache) == 0

    def test_metadata_format(self):
        """Uploaded metadata is properly formatted to ERC-721 schema."""
        normalised = _normalise_metadata({"name": "Test Asset"})
        assert "name" in normalised
        assert "description" in normalised
        assert "image" in normalised
        assert "attributes" in normalised
        assert isinstance(normalised["attributes"], list)

    def test_metadata_format_with_attributes(self):
        """Attributes are normalised to {trait_type, value} dicts."""
        raw = {
            "name": "AK-47 Redline",
            "description": "A cool skin",
            "image": "ipfs://QmFake",
            "attributes": [
                {"trait_type": "Rarity", "value": "Rare"},
                {"trait_type": "Weapon", "value": "AK-47"},
                {"invalid": "no trait_type or value"},
            ],
        }
        normalised = _normalise_metadata(raw)
        attrs = normalised["attributes"]
        assert len(attrs) == 2  # Invalid one is filtered out
        assert all("trait_type" in a and "value" in a for a in attrs)

    def test_metadata_default_values(self):
        """Missing top-level keys are filled with sensible defaults."""
        normalised = _normalise_metadata({})
        assert normalised["name"] == "Unnamed De-Shop Asset"
        assert normalised["description"] == ""
        assert normalised["image"] == ""
        assert normalised["attributes"] == []

    def test_upload_image_fallback(self):
        """upload_image returns ipfs:// URI in fallback mode."""
        clear_cache()
        uri = upload_image(b"fake image bytes", "test.png")
        assert isinstance(uri, str)
        assert uri.startswith("ipfs://")

    def test_upload_image_deterministic(self):
        """Same image data returns same URI."""
        clear_cache()
        data = b"deterministic image content"
        uri1 = upload_image(data, "img1.png")
        uri2 = upload_image(data, "img2.png")  # Different filename, same content
        assert uri1 == uri2

    def test_rate_limiter(self):
        """Rate limiter allows reasonable requests within the limit."""
        # The rate limiter allows _RATE_LIMIT_MAX_REQUESTS per _RATE_LIMIT_WINDOW_SECONDS
        # We just verify the constants are sane and that a single request works
        assert _RATE_LIMIT_MAX_REQUESTS > 0
        assert _RATE_LIMIT_WINDOW_SECONDS > 0
        # A single upload should always succeed (not block)
        clear_cache()
        uri = upload_metadata({"name": "Rate Limit Test"})
        assert uri.startswith("ipfs://")

    def test_sha256_hex_deterministic(self):
        """SHA-256 hashing is deterministic for the same input."""
        h1 = _sha256_hex("test content")
        h2 = _sha256_hex("test content")
        assert h1 == h2
        assert len(h1) == 64  # SHA-256 hex digest is 64 chars

    def test_sha256_hex_bytes_input(self):
        """SHA-256 hashing works with bytes input."""
        h_str = _sha256_hex("hello")
        h_bytes = _sha256_hex(b"hello")
        assert h_str == h_bytes
