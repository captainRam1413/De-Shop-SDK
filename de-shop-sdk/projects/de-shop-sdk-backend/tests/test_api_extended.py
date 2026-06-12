"""
Tests — Extended API Endpoints
=================================
Integration tests for the new Flask API endpoints:
  - GET /oracle/status
  - GET /ws/status
  - POST /ai/train (with auth)
  - POST /ipfs/upload (with auth)
"""

import pytest


class TestNewEndpoints:
    """Extended integration tests for new API endpoints."""

    def test_oracle_status(self, client):
        """GET /oracle/status returns 200 with oracle status data."""
        resp = client.get("/oracle/status")
        assert resp.status_code == 200
        data = resp.json
        assert "algo_usd" in data
        assert isinstance(data["algo_usd"], float)
        assert data["algo_usd"] > 0
        assert "algo_usd_source" in data
        assert "algo_price_trend" in data
        assert "price_history_points" in data
        assert "hardcoded_fallback_algo_usd" in data

    def test_ws_status(self, client):
        """GET /ws/status returns 200 with WebSocket connection info."""
        resp = client.get("/ws/status")
        assert resp.status_code == 200
        data = resp.json
        assert "connected_clients" in data
        assert isinstance(data["connected_clients"], int)
        assert "rooms" in data
        assert isinstance(data["rooms"], dict)

    def test_ai_train_with_auth(self, client, auth_headers):
        """POST /ai/train with auth headers returns 200."""
        resp = client.post("/ai/train", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json
        assert "status" in data
        # With no training data, status should be "no_data" or "ok" or "failed"
        assert data["status"] in ("ok", "no_data", "failed")

    def test_ipfs_upload_with_auth(self, client, auth_headers):
        """POST /ipfs/upload with auth headers returns 200 with ipfs:// URI."""
        resp = client.post("/ipfs/upload", json={
            "name": "Test NFT",
            "description": "A test asset",
            "image": "ipfs://QmTest",
            "attributes": [
                {"trait_type": "Rarity", "value": "Rare"},
            ],
        }, headers=auth_headers)
        assert resp.status_code == 200
        assert "ipfs_uri" in resp.json

    def test_ipfs_upload_response(self, client, auth_headers):
        """POST /ipfs/upload returns a valid ipfs:// URI."""
        resp = client.post("/ipfs/upload", json={
            "name": "IPFS Response Test",
        }, headers=auth_headers)
        assert resp.status_code == 200
        uri = resp.json["ipfs_uri"]
        assert isinstance(uri, str)
        assert uri.startswith("ipfs://")
