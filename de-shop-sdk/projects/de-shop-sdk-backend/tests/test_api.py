"""
Tests — Marketplace API Endpoints (Integration)
==================================================
Full integration tests for the Flask API with database persistence.
Tests the complete flow: auth → mint → list → buy → cancel.
"""

import pytest


class TestHealthEndpoint:
    """Tests for the health check endpoint."""

    def test_health_returns_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json["ok"] is True

    def test_health_includes_blockchain(self, client):
        resp = client.get("/health")
        assert "blockchain" in resp.json


class TestMintEndpoint:
    """Tests for POST /mint."""

    def test_mint_requires_auth(self, client, sample_wallet):
        resp = client.post("/mint", json={
            "wallet": sample_wallet,
            "skin_name": "Neon Phantom",
            "rarity": "rare",
        })
        assert resp.status_code == 401

    def test_mint_with_auth(self, client, auth_headers, sample_wallet):
        resp = client.post("/mint", json={
            "wallet": sample_wallet,
            "skin_name": "Neon Phantom",
            "rarity": "rare",
            "skin_type": "weapon",
            "royalty_bps": 500,
        }, headers=auth_headers)
        assert resp.status_code == 201
        assert "asset" in resp.json
        assert resp.json["asset"]["name"] == "Neon Phantom"
        assert resp.json["asset"]["owner"] == sample_wallet
        assert resp.json["asset"]["rarity"] == "rare"

    def test_mint_wallet_mismatch(self, client, auth_headers, sample_wallet_2):
        """Authenticated wallet must match the target wallet."""
        resp = client.post("/mint", json={
            "wallet": sample_wallet_2,
            "skin_name": "Test Skin",
            "rarity": "common",
        }, headers=auth_headers)
        assert resp.status_code == 403

    def test_mint_invalid_rarity(self, client, auth_headers, sample_wallet):
        resp = client.post("/mint", json={
            "wallet": sample_wallet,
            "skin_name": "Test",
            "rarity": "ultra_rare",
        }, headers=auth_headers)
        assert resp.status_code == 400

    def test_mint_invalid_wallet(self, client, auth_headers):
        resp = client.post("/mint", json={
            "wallet": "short",
            "skin_name": "Test",
            "rarity": "rare",
        }, headers=auth_headers)
        assert resp.status_code == 400

    def test_mint_with_asa_id(self, client, auth_headers, sample_wallet):
        resp = client.post("/mint", json={
            "wallet": sample_wallet,
            "skin_name": "On-Chain Skin",
            "rarity": "epic",
            "asa_id": 12345,
            "txn_id": "TXN_ABC123",
        }, headers=auth_headers)
        assert resp.status_code == 201
        assert resp.json["asset"]["asa_id"] == 12345


class TestAssetsEndpoint:
    """Tests for GET /assets/<wallet>."""

    def test_get_assets_empty(self, client, sample_wallet):
        resp = client.get(f"/assets/{sample_wallet}")
        assert resp.status_code == 200
        assert resp.json["assets"] == []

    def test_get_assets_after_mint(self, client, auth_headers, sample_wallet):
        # Mint an asset first
        client.post("/mint", json={
            "wallet": sample_wallet,
            "skin_name": "Test Skin",
            "rarity": "rare",
        }, headers=auth_headers)

        # Get assets
        resp = client.get(f"/assets/{sample_wallet}")
        assert resp.status_code == 200
        assert len(resp.json["assets"]) == 1
        assert resp.json["assets"][0]["name"] == "Test Skin"

    def test_get_assets_invalid_wallet(self, client):
        resp = client.get("/assets/invalid")
        assert resp.status_code == 400


class TestListEndpoint:
    """Tests for POST /list."""

    def test_list_requires_auth(self, client, sample_wallet):
        resp = client.post("/list", json={
            "wallet": sample_wallet,
            "asset_id": 1,
            "price": 1000,
        })
        assert resp.status_code == 401

    def test_list_asset(self, client, auth_headers, sample_wallet):
        # Mint first
        mint_resp = client.post("/mint", json={
            "wallet": sample_wallet,
            "skin_name": "List Test",
            "rarity": "epic",
        }, headers=auth_headers)
        asset_id = mint_resp.json["asset"]["id"]

        # List it
        resp = client.post("/list", json={
            "wallet": sample_wallet,
            "asset_id": asset_id,
            "price": 5000,
        }, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json["asset"]["listed"] is True
        assert resp.json["asset"]["list_price"] == 5000

    def test_list_wallet_mismatch(self, client, auth_headers, sample_wallet_2):
        resp = client.post("/list", json={
            "wallet": sample_wallet_2,
            "asset_id": 1,
            "price": 1000,
        }, headers=auth_headers)
        assert resp.status_code == 403

    def test_list_nonexistent_asset(self, client, auth_headers, sample_wallet):
        resp = client.post("/list", json={
            "wallet": sample_wallet,
            "asset_id": 9999,
            "price": 1000,
        }, headers=auth_headers)
        assert resp.status_code == 400

    def test_list_zero_price(self, client, auth_headers, sample_wallet):
        resp = client.post("/list", json={
            "wallet": sample_wallet,
            "asset_id": 1,
            "price": 0,
        }, headers=auth_headers)
        assert resp.status_code == 400


class TestBuyEndpoint:
    """Tests for POST /buy."""

    def _setup_listing(self, client, auth_headers, sample_wallet):
        """Helper: mint and list an asset, return its ID."""
        mint_resp = client.post("/mint", json={
            "wallet": sample_wallet,
            "skin_name": "Buy Test",
            "rarity": "legendary",
        }, headers=auth_headers)
        asset_id = mint_resp.json["asset"]["id"]

        client.post("/list", json={
            "wallet": sample_wallet,
            "asset_id": asset_id,
            "price": 10000,
        }, headers=auth_headers)
        return asset_id

    def test_buy_requires_auth(self, client, sample_wallet_2):
        resp = client.post("/buy", json={
            "buyer_wallet": sample_wallet_2,
            "asset_id": 1,
        })
        assert resp.status_code == 401

    def test_buy_asset(self, client, auth_headers, sample_wallet, sample_wallet_2):
        asset_id = self._setup_listing(client, auth_headers, sample_wallet)

        # Buyer authenticates
        nonce_resp = client.post("/auth/nonce", json={"wallet": sample_wallet_2})
        nonce = nonce_resp.json["nonce"]
        verify_resp = client.post("/auth/verify", json={
            "wallet": sample_wallet_2,
            "nonce": nonce,
            "signature": "mock",
        })
        buyer_token = verify_resp.json["token"]
        buyer_headers = {"Authorization": f"Bearer {buyer_token}"}

        # Buy
        resp = client.post("/buy", json={
            "buyer_wallet": sample_wallet_2,
            "asset_id": asset_id,
        }, headers=buyer_headers)
        assert resp.status_code == 200
        assert "sale" in resp.json
        assert resp.json["sale"]["buyer"] == sample_wallet_2
        assert resp.json["sale"]["seller"] == sample_wallet
        assert resp.json["sale"]["price"] == 10000

    def test_buy_own_asset_fails(self, client, auth_headers, sample_wallet):
        asset_id = self._setup_listing(client, auth_headers, sample_wallet)

        # Same wallet tries to buy
        resp = client.post("/buy", json={
            "buyer_wallet": sample_wallet,
            "asset_id": asset_id,
        }, headers=auth_headers)
        assert resp.status_code == 400

    def test_buy_unlisted_asset_fails(self, client, auth_headers, sample_wallet, sample_wallet_2):
        # Mint but don't list
        mint_resp = client.post("/mint", json={
            "wallet": sample_wallet,
            "skin_name": "Unlisted",
            "rarity": "common",
        }, headers=auth_headers)
        asset_id = mint_resp.json["asset"]["id"]

        # Authenticate buyer
        nonce_resp = client.post("/auth/nonce", json={"wallet": sample_wallet_2})
        nonce = nonce_resp.json["nonce"]
        verify_resp = client.post("/auth/verify", json={
            "wallet": sample_wallet_2,
            "nonce": nonce,
        })
        buyer_headers = {"Authorization": f"Bearer {verify_resp.json['token']}"}

        resp = client.post("/buy", json={
            "buyer_wallet": sample_wallet_2,
            "asset_id": asset_id,
        }, headers=buyer_headers)
        assert resp.status_code == 400


class TestCancelEndpoint:
    """Tests for POST /cancel."""

    def test_cancel_requires_auth(self, client, sample_wallet):
        resp = client.post("/cancel", json={
            "wallet": sample_wallet,
            "asset_id": 1,
        })
        assert resp.status_code == 401

    def test_cancel_listing(self, client, auth_headers, sample_wallet):
        # Mint and list
        mint_resp = client.post("/mint", json={
            "wallet": sample_wallet,
            "skin_name": "Cancel Test",
            "rarity": "epic",
        }, headers=auth_headers)
        asset_id = mint_resp.json["asset"]["id"]

        client.post("/list", json={
            "wallet": sample_wallet,
            "asset_id": asset_id,
            "price": 5000,
        }, headers=auth_headers)

        # Cancel
        resp = client.post("/cancel", json={
            "wallet": sample_wallet,
            "asset_id": asset_id,
        }, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json["asset"]["listed"] is False


class TestMarketplaceEndpoint:
    """Tests for GET /marketplace."""

    def test_marketplace_empty(self, client):
        resp = client.get("/marketplace")
        assert resp.status_code == 200
        assert resp.json["marketplace"] == []

    def test_marketplace_with_listings(self, client, auth_headers, sample_wallet):
        # Mint and list
        mint_resp = client.post("/mint", json={
            "wallet": sample_wallet,
            "skin_name": "Market Skin",
            "rarity": "rare",
        }, headers=auth_headers)
        asset_id = mint_resp.json["asset"]["id"]

        client.post("/list", json={
            "wallet": sample_wallet,
            "asset_id": asset_id,
            "price": 5000,
        }, headers=auth_headers)

        # Check marketplace
        resp = client.get("/marketplace")
        assert resp.status_code == 200
        assert len(resp.json["marketplace"]) == 1


class TestHistoryEndpoint:
    """Tests for GET /history/<asset_id>."""

    def test_history_not_found(self, client):
        resp = client.get("/history/9999")
        assert resp.status_code == 404

    def test_history_after_mint(self, client, auth_headers, sample_wallet):
        mint_resp = client.post("/mint", json={
            "wallet": sample_wallet,
            "skin_name": "History Skin",
            "rarity": "rare",
        }, headers=auth_headers)
        asset_id = mint_resp.json["asset"]["id"]

        resp = client.get(f"/history/{asset_id}")
        assert resp.status_code == 200
        assert len(resp.json["history"]) >= 1
        assert resp.json["history"][0]["type"] == "mint"

    def test_history_after_buy(self, client, auth_headers, sample_wallet, sample_wallet_2):
        # Mint and list
        mint_resp = client.post("/mint", json={
            "wallet": sample_wallet,
            "skin_name": "History Buy",
            "rarity": "epic",
        }, headers=auth_headers)
        asset_id = mint_resp.json["asset"]["id"]

        client.post("/list", json={
            "wallet": sample_wallet,
            "asset_id": asset_id,
            "price": 8000,
        }, headers=auth_headers)

        # Buyer auth
        nonce_resp = client.post("/auth/nonce", json={"wallet": sample_wallet_2})
        nonce = nonce_resp.json["nonce"]
        verify_resp = client.post("/auth/verify", json={
            "wallet": sample_wallet_2,
            "nonce": nonce,
        })
        buyer_headers = {"Authorization": f"Bearer {verify_resp.json['token']}"}

        # Buy
        client.post("/buy", json={
            "buyer_wallet": sample_wallet_2,
            "asset_id": asset_id,
        }, headers=buyer_headers)

        # Check history
        resp = client.get(f"/history/{asset_id}")
        assert resp.status_code == 200
        types = [h["type"] for h in resp.json["history"]]
        assert "mint" in types
        assert "list" in types
        assert "buy" in types


class TestAIPricingEndpoint:
    """Tests for POST /ai-price."""

    def test_ai_price(self, client):
        resp = client.post("/ai-price", json={
            "skin_name": "Neon Phantom",
            "rarity": "rare",
        })
        assert resp.status_code == 200
        assert "price" in resp.json
        assert "confidence" in resp.json
        assert "trend" in resp.json

    def test_ai_price_default_values(self, client):
        resp = client.post("/ai-price", json={})
        assert resp.status_code == 200


class TestAnalyzeEndpoint:
    """Tests for POST /analyze."""

    def test_analyze_skin(self, client):
        resp = client.post("/analyze", json={
            "name": "Dragon AK-47",
            "weapon": "AK-47",
            "rarity": "legendary",
            "effect": "fire",
        })
        assert resp.status_code == 200
        assert resp.json["type"] == "gun_skin"
        assert "rarity_score" in resp.json
        assert "suggested_price" in resp.json
        assert "tags" in resp.json

    def test_analyze_character_skin(self, client):
        resp = client.post("/analyze", json={
            "name": "Ghost Operator",
            "rarity": "epic",
        })
        assert resp.status_code == 200
        assert resp.json["type"] == "character_skin"


class TestErrorHandling:
    """Tests for error handling and edge cases."""

    def test_404_on_unknown_endpoint(self, client):
        resp = client.get("/nonexistent")
        assert resp.status_code == 404

    def test_405_wrong_method(self, client):
        resp = client.delete("/health")
        assert resp.status_code == 405

    def test_invalid_json_body(self, client):
        resp = client.post("/mint",
            data="not json",
            content_type="application/json",
        )
        # Should either 400 or 401 (auth check might come first)
        assert resp.status_code in (400, 401)
