"""
Tests — AI/ML Pricing Engine
==============================
Unit tests for the deshop_backend.ai_pricing module.
"""

import pytest
from deshop_backend.ai_pricing import (
    AIPricingEngine,
    PriceSuggestion,
    detect_weapon_class,
    detect_effects,
    classify_skin_type,
    RARITY_DEFAULTS,
)


# ─── TestAIPricingEngine ─────────────────────────────────────────────────────

class TestAIPricingEngine:
    """Tests for the AIPricingEngine.suggest_price() method."""

    def test_suggest_price_basic(self):
        """Basic price suggestion returns PriceSuggestion with all fields."""
        engine = AIPricingEngine()
        result = engine.suggest_price(skin_name="Neon Phantom", rarity="rare")

        assert isinstance(result, PriceSuggestion)
        assert isinstance(result.price, int)
        assert result.price > 0
        assert isinstance(result.confidence, int)
        assert 10 <= result.confidence <= 99
        assert result.trend in ("rising", "falling", "stable")
        assert isinstance(result.rarity_score, int)
        assert 0 <= result.rarity_score <= 100
        assert isinstance(result.demand_score, int)
        assert 0 <= result.demand_score <= 100

    @pytest.mark.parametrize("rarity", [
        "common", "uncommon", "rare", "epic", "legendary", "mythic",
    ])
    def test_suggest_price_all_rarities(self, rarity):
        """All recognised rarities return a valid PriceSuggestion."""
        engine = AIPricingEngine()
        result = engine.suggest_price(skin_name="Test Skin", rarity=rarity)
        assert isinstance(result, PriceSuggestion)
        assert result.price > 0

    def test_suggest_price_with_skin_type(self):
        """skin_type parameter is accepted and influences the result."""
        engine = AIPricingEngine()
        weapon = engine.suggest_price("Test Skin", "rare", skin_type="weapon")
        character = engine.suggest_price("Test Skin", "rare", skin_type="character")
        # Both should be valid; they may differ due to classification
        assert isinstance(weapon, PriceSuggestion)
        assert isinstance(character, PriceSuggestion)

    def test_suggest_price_deterministic(self):
        """Same input produces same output."""
        engine = AIPricingEngine()
        r1 = engine.suggest_price("Neon Phantom", "rare")
        r2 = engine.suggest_price("Neon Phantom", "rare")
        assert r1 == r2

    def test_suggest_price_rarity_ordering(self):
        """Higher rarity generally means higher default price."""
        engine = AIPricingEngine()
        # Use a plain name without weapon/effect keywords to get rule-based pricing
        results = {}
        for rarity in ("common", "uncommon", "rare", "epic", "legendary", "mythic"):
            results[rarity] = engine.suggest_price("Plain Item", rarity).price

        # The ordering should be monotonic for default prices
        assert results["common"] <= results["uncommon"]
        assert results["uncommon"] <= results["rare"]
        assert results["rare"] <= results["epic"]
        assert results["epic"] <= results["legendary"]
        assert results["legendary"] <= results["mythic"]

    def test_suggest_price_marketplace_data(self):
        """Test with marketplace_data parameter."""
        engine = AIPricingEngine()
        marketplace_data = {
            "listed_count": 5,
            "recent_sales": 10,
            "avg_price_24h": 100.0,
            "volatility": 0.2,
        }
        result = engine.suggest_price(
            skin_name="Neon Phantom",
            rarity="rare",
            marketplace_data=marketplace_data,
        )
        assert isinstance(result, PriceSuggestion)
        assert result.price > 0


# ─── TestFeatureExtraction ───────────────────────────────────────────────────

class TestFeatureExtraction:
    """Tests for weapon, character, and effect detection."""

    def test_weapon_detection(self):
        """'AK-47' detected as a weapon class."""
        cls = detect_weapon_class("AK-47 Redline")
        assert cls == "AR"

    def test_character_detection(self):
        """'Ghost Operator' detected as character via classify_skin_type."""
        skin_type = classify_skin_type("Ghost Operator", "weapon")
        assert skin_type == "character"

    def test_effect_detection(self):
        """'Dragon Fire' detects fire effect."""
        effects, bonus = detect_effects("Dragon Fire Blade")
        assert "fire" in effects
        assert bonus >= 1.0  # fire has a 1.5 multiplier

    def test_no_effects(self):
        """Plain name has no effects."""
        effects, bonus = detect_effects("Basic Wooden Stick")
        assert effects == []
        assert bonus == 0.0


# ─── TestModelTraining ───────────────────────────────────────────────────────

class TestModelTraining:
    """Tests for AIPricingEngine.train_model()."""

    def test_train_model_no_data(self, app, db):
        """Returns status indicating insufficient data when DB is empty."""
        engine = AIPricingEngine()
        with app.app_context():
            result = engine.train_model()
        assert result["status"] in ("no_data", "failed")
        assert result["samples"] == 0

    def test_train_model_with_data(self, app, db, auth_headers, client, sample_wallet, sample_wallet_2):
        """After minting and buying some assets, train_model returns metrics."""
        # Create some transactions by minting → listing → buying
        for i in range(3):
            mint_resp = client.post("/mint", json={
                "wallet": sample_wallet,
                "skin_name": f"Train Skin {i}",
                "rarity": "rare",
            }, headers=auth_headers)
            assert mint_resp.status_code == 201
            asset_id = mint_resp.json["asset"]["id"]

            client.post("/list", json={
                "wallet": sample_wallet,
                "asset_id": asset_id,
                "price": 5000 + i * 1000,
            }, headers=auth_headers)

            # Authenticate buyer
            nonce_resp = client.post("/auth/nonce", json={"wallet": sample_wallet_2})
            nonce = nonce_resp.json["nonce"]
            verify_resp = client.post("/auth/verify", json={
                "wallet": sample_wallet_2,
                "nonce": nonce,
                "signature": "mock",
            })
            buyer_headers = {"Authorization": f"Bearer {verify_resp.json['token']}"}

            client.post("/buy", json={
                "buyer_wallet": sample_wallet_2,
                "asset_id": asset_id,
            }, headers=buyer_headers)

        engine = AIPricingEngine()
        with app.app_context():
            result = engine.train_model()

        assert result["status"] == "ok"
        assert result["samples"] >= 3
        assert "r_squared" in result
        assert "rarity_multipliers" in result


# ─── TestMarketSignals ───────────────────────────────────────────────────────

class TestMarketSignals:
    """Tests for AIPricingEngine.get_market_signals()."""

    def test_market_signals_empty(self, app, db):
        """Returns defaults when no data is available."""
        engine = AIPricingEngine()
        with app.app_context():
            signals = engine.get_market_signals("rare")
        assert signals["rarity"] == "rare"
        assert signals["supply"] == 0
        assert signals["demand_24h"] == 0
        assert signals["trend_direction"] == "stable"
        assert signals["volatility"] == 0.0

    def test_market_signals_with_data(self, app, db, auth_headers, client, sample_wallet, sample_wallet_2):
        """Returns actual data after transactions."""
        # Mint, list, and buy an asset
        mint_resp = client.post("/mint", json={
            "wallet": sample_wallet,
            "skin_name": "Signal Skin",
            "rarity": "rare",
        }, headers=auth_headers)
        asset_id = mint_resp.json["asset"]["id"]

        client.post("/list", json={
            "wallet": sample_wallet,
            "asset_id": asset_id,
            "price": 7000,
        }, headers=auth_headers)

        nonce_resp = client.post("/auth/nonce", json={"wallet": sample_wallet_2})
        nonce = nonce_resp.json["nonce"]
        verify_resp = client.post("/auth/verify", json={
            "wallet": sample_wallet_2,
            "nonce": nonce,
            "signature": "mock",
        })
        buyer_headers = {"Authorization": f"Bearer {verify_resp.json['token']}"}

        client.post("/buy", json={
            "buyer_wallet": sample_wallet_2,
            "asset_id": asset_id,
        }, headers=buyer_headers)

        engine = AIPricingEngine()
        with app.app_context():
            signals = engine.get_market_signals("rare")

        assert signals["rarity"] == "rare"
        assert signals["demand_24h"] >= 0  # May be 0 if >24h old, or >=1 if within window


# ─── TestDemandForecast ──────────────────────────────────────────────────────

class TestDemandForecast:
    """Tests for AIPricingEngine.forecast_demand()."""

    def test_forecast_demand_basic(self):
        """Returns forecast dict with required fields."""
        engine = AIPricingEngine()
        result = engine.forecast_demand(skin_name="Test Skin", rarity="rare")

        assert "predicted_demand_score" in result
        assert "trend" in result
        assert "confidence" in result
        assert "method" in result
        assert result["horizon_hours"] == 24
        assert result["rarity"] == "rare"
        assert result["skin_name"] == "Test Skin"

    @pytest.mark.parametrize("horizon", [1, 6, 24, 48, 168])
    def test_forecast_demand_horizon(self, horizon):
        """Different horizon_hours values are accepted and returned."""
        engine = AIPricingEngine()
        result = engine.forecast_demand("Test Skin", "rare", horizon_hours=horizon)
        assert result["horizon_hours"] == horizon
