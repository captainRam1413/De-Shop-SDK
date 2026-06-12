"""
Tests — WebSocket Events
============================
Unit tests for the deshop_backend.ws_events module and
related Flask endpoints (/ws/status, /oracle/status, /ipfs/upload, /ai/train).
"""

import pytest
from deshop_backend.ws_events import (
    broadcast_mint,
    broadcast_list,
    broadcast_buy,
    broadcast_cancel,
    broadcast_price_update,
    get_connection_count,
    get_room_memberships,
    _connected_sids,
)


# ─── TestWebSocketEvents ─────────────────────────────────────────────────────

class TestWebSocketEvents:
    """Tests for WebSocket broadcast functions (no connected clients)."""

    def test_broadcast_mint_no_crash(self):
        """broadcast_mint doesn't crash when no clients are connected."""
        # Ensure no connected SIDs
        _connected_sids.clear()
        broadcast_mint({"id": 1, "name": "Test", "rarity": "rare", "wallet": "A" * 58})

    def test_broadcast_list_no_crash(self):
        """broadcast_list doesn't crash when no clients are connected."""
        _connected_sids.clear()
        broadcast_list({"id": 2, "name": "Listed", "rarity": "epic", "wallet": "A" * 58})

    def test_broadcast_buy_no_crash(self):
        """broadcast_buy doesn't crash when no clients are connected."""
        _connected_sids.clear()
        broadcast_buy({
            "asset_id": 3,
            "sale": {
                "buyer_wallet": "B" * 58,
                "seller_wallet": "A" * 58,
                "price": 5000,
            },
        })

    def test_broadcast_cancel_no_crash(self):
        """broadcast_cancel doesn't crash when no clients are connected."""
        _connected_sids.clear()
        broadcast_cancel({"id": 4, "name": "Cancelled", "rarity": "common", "wallet": "A" * 58})

    def test_broadcast_price_update_no_crash(self):
        """broadcast_price_update doesn't crash when no clients are connected."""
        _connected_sids.clear()
        broadcast_price_update({"name": "AK-47 Redline", "price": 10000})

    def test_get_connection_count(self):
        """Returns 0 when no connections."""
        _connected_sids.clear()
        assert get_connection_count() == 0

    def test_get_room_memberships(self):
        """Returns dict when no connections."""
        _connected_sids.clear()
        result = get_room_memberships()
        assert isinstance(result, dict)


# ─── TestWSEndpoints ─────────────────────────────────────────────────────────

class TestWSEndpoints:
    """Integration tests for WebSocket-related Flask endpoints."""

    def test_ws_status_endpoint(self, client):
        """GET /ws/status returns 200 with connection info."""
        resp = client.get("/ws/status")
        assert resp.status_code == 200
        assert "connected_clients" in resp.json
        assert "rooms" in resp.json

    def test_oracle_status_endpoint(self, client):
        """GET /oracle/status returns 200 with oracle status."""
        resp = client.get("/oracle/status")
        assert resp.status_code == 200
        assert "algo_usd" in resp.json

    def test_ipfs_upload_requires_auth(self, client):
        """POST /ipfs/upload returns 401 without auth."""
        resp = client.post("/ipfs/upload", json={"name": "Test"})
        assert resp.status_code == 401

    def test_ai_train_requires_auth(self, client):
        """POST /ai/train returns 401 without auth."""
        resp = client.post("/ai/train")
        assert resp.status_code == 401
