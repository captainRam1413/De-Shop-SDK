"""
Tests — CoinGecko Price Oracle & Skinport
============================================
Unit tests for the deshop_backend.price_oracle module.

CoinGecko tests use the hardcoded fallback ($0.20) when the live API
is unavailable or rate-limited in CI. Skinport tests verify the
not-found / empty-list paths without making real API calls.
"""

import pytest
from unittest.mock import patch, MagicMock

from deshop_backend.price_oracle import (
    get_algo_usd_price,
    get_crypto_price,
    convert_usd_to_microalgo,
    get_price_trend,
    get_oracle_status,
    get_price_history,
    get_skinport_price,
    get_bulk_prices,
    map_steam_item_to_sdk_asset,
    HARDCODED_ALGO_USD,
    _cg_cache,
    _price_history,
)


# ─── TestCoinGeckoOracle ─────────────────────────────────────────────────────

class TestCoinGeckoOracle:
    """Tests for the CoinGecko price oracle functions."""

    def test_get_algo_usd_price(self):
        """Returns a float > 0 (may be live or fallback)."""
        price = get_algo_usd_price()
        assert isinstance(price, float)
        assert price > 0

    def test_get_algo_usd_price_fallback(self):
        """Always returns something (never raises), even if API is down."""
        # Mock the internal fetch to simulate complete failure
        with patch("deshop_backend.price_oracle._fetch_coingecko_price", return_value=None):
            # Clear cache so it can't use a cached value
            _cg_cache.pop("algorand_usd", None)
            # The function has a hardcoded fallback, so it should still return
            price = get_algo_usd_price()
            assert price == HARDCODED_ALGO_USD

    def test_get_crypto_price(self):
        """Generic crypto price fetcher returns float or None."""
        # For an unknown coin with no cache, it may return None
        result = get_crypto_price("nonexistent_coin_xyz_12345")
        # It should return None or a float, never raise
        assert result is None or isinstance(result, float)

    def test_convert_usd_to_microalgo(self):
        """Converts correctly using live ALGO rate."""
        # Use a known rate for deterministic testing
        with patch("deshop_backend.price_oracle.get_algo_usd_price", return_value=0.20):
            result = convert_usd_to_microalgo(1.0)
            # 1 USD / 0.20 ALGO per USD * 1_000_000 = 5_000_000 μALGO
            assert result == 5_000_000

    def test_convert_usd_to_microalgo_zero_rate(self):
        """Returns 0 when ALGO rate is 0 or negative."""
        with patch("deshop_backend.price_oracle.get_algo_usd_price", return_value=0.0):
            result = convert_usd_to_microalgo(1.0)
            assert result == 0

    def test_price_trend(self):
        """Returns 'rising', 'falling', or 'stable'."""
        trend = get_price_trend()
        assert trend in ("rising", "falling", "stable")

    def test_price_trend_stable_with_few_points(self):
        """With <2 data points, trend should be stable."""
        # Save and clear history
        saved_history = list(_price_history)
        _price_history.clear()
        try:
            trend = get_price_trend()
            assert trend == "stable"
        finally:
            # Restore
            _price_history.extend(saved_history)

    def test_oracle_status(self):
        """Returns status dict with required fields."""
        status = get_oracle_status()
        assert "algo_usd" in status
        assert isinstance(status["algo_usd"], float)
        assert status["algo_usd"] > 0
        assert "algo_usd_source" in status
        assert "algo_price_trend" in status
        assert "price_history_points" in status
        assert "coingecko_cache_ttl" in status
        assert "hardcoded_fallback_algo_usd" in status

    def test_price_history(self):
        """Returns a list."""
        history = get_price_history()
        assert isinstance(history, list)


# ─── TestSkinportExisting ────────────────────────────────────────────────────

class TestSkinportExisting:
    """Tests for Skinport price functions (non-live paths)."""

    def test_skinport_price_not_found(self):
        """Unknown skin returns not_found status."""
        result = get_skinport_price("COMPLETELY_UNKNOWN_SKIN_XYZ_99999")
        assert result["source"] == "skinport_not_found"
        assert result["min_price"] is None

    def test_bulk_prices_empty(self):
        """Empty list returns empty results."""
        with patch("deshop_backend.price_oracle._get_skinport_catalog", return_value=[]):
            result = get_bulk_prices([])
        assert result == []

    def test_map_steam_item(self):
        """Maps Steam item to SDK format with live ALGO rate."""
        steam_item = {
            "name": "AK-47 | Redline (Field-Tested)",
            "asset_id": "12345",
            "rarity": "Restricted",
            "weapon": "AK-47",
            "exterior": "Field-Tested",
            "tradable": True,
            "icon_url": "https://example.com/icon.png",
            "marketable": True,
        }
        # Patch Skinport to return not_found (deterministic)
        with patch("deshop_backend.price_oracle.get_skinport_price", return_value={
            "name": steam_item["name"],
            "min_price": None,
            "suggested_price": None,
            "quantity": 0,
            "source": "skinport_not_found",
        }):
            result = map_steam_item_to_sdk_asset(steam_item)

        assert result["name"] == steam_item["name"]
        assert result["rarity"] == "rare"  # "Restricted" maps to "rare"
        assert result["skin_type"] == "weapon"
        assert result["weapon"] == "AK-47"
        assert result["exterior"] == "Field-Tested"
        assert result["tradable"] is True
        assert isinstance(result["real_market_price_micro_algo"], int)
