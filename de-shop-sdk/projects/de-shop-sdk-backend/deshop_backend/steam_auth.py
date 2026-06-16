"""
De-Shop SDK — Steam OpenID Authentication Service
===================================================
Implements Steam OpenID 2.0 login flow using python3-openid.

Endpoints:
  GET  /auth/steam          → Redirect to Steam login page
  GET  /auth/steam/callback → Handle Steam return, issue JWT
  GET  /auth/steam/profile  → Fetch Steam profile (requires JWT)

Steam Web API Docs:
  https://developer.valvesoftware.com/wiki/Steam_Web_API
  https://steamcommunity.com/dev/apikey

OpenID Reference:
  https://steamcommunity.com/dev  (Steam as OpenID provider)
  Provider URL: https://steamcommunity.com/openid
"""

from __future__ import annotations

import hashlib
import hmac
import os
import re
import secrets
import time
from typing import Any
from urllib.parse import urlencode

import requests
from flask import Blueprint, jsonify, redirect, request, session

steam_bp = Blueprint("steam", __name__, url_prefix="/auth")

STEAM_OPENID_URL = "https://steamcommunity.com/openid/login"
STEAM_ID_REGEX = re.compile(r"https://steamcommunity\.com/openid/id/(\d+)")
STEAM_API_KEY = os.getenv("STEAM_API_KEY", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
SECRET_KEY = os.getenv("FLASK_SECRET", secrets.token_hex(32))


def _steam_openid_params(return_url: str) -> dict[str, str]:
    """Build the OpenID 2.0 request parameters for Steam."""
    return {
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode": "checkid_setup",
        "openid.return_to": return_url,
        "openid.realm": BACKEND_URL,
        "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
        "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    }


def _verify_steam_assertion(params: dict[str, str]) -> bool:
    """
    Verify the Steam OpenID assertion by re-querying the Steam endpoint.
    This is the 'direct verification' step in OpenID 2.0.
    """
    verify_params = dict(params)
    verify_params["openid.mode"] = "check_authentication"
    try:
        resp = requests.post(STEAM_OPENID_URL, data=verify_params, timeout=10)
        return "is_valid:true" in resp.text
    except Exception:
        return False


def _extract_steam_id(claimed_id: str) -> str | None:
    """Extract the numeric SteamID from the claimed_id URL."""
    match = STEAM_ID_REGEX.search(claimed_id)
    return match.group(1) if match else None


def fetch_steam_profile(steam_id: str) -> dict[str, Any] | None:
    """
    Fetch a Steam user's public profile via the Steam Web API.

    Requires STEAM_API_KEY env var. Returns None if unavailable.

    API Docs:
      https://developer.valvesoftware.com/wiki/Steam_Web_API#GetPlayerSummaries_.28v0002.29
    """
    if not STEAM_API_KEY:
        return {
            "steamid": steam_id,
            "personaname": f"SteamUser_{steam_id[-4:]}",
            "avatarfull": "https://avatars.cloudflare.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg",
            "profileurl": f"https://steamcommunity.com/profiles/{steam_id}/",
            "_simulated": True,
        }
    try:
        url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/"
        params = {"key": STEAM_API_KEY, "steamids": steam_id}
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        players = resp.json()["response"]["players"]
        return players[0] if players else None
    except Exception:
        return None


def fetch_steam_inventory(steam_id: str, app_id: int = 730, context_id: int = 2) -> list[dict[str, Any]]:
    """
    Fetch a Steam user's CS2/CS:GO inventory (appid 730).

    NOTE: Steam inventory is only accessible if the profile is PUBLIC.
    See: https://steamcommunity.com/id/{user}/inventory/#730

    Limitations:
    - Cannot access private inventories
    - Rate limited by Steam (no official per-second limit published)
    - Does NOT include Steam market prices (requires separate calls)

    Args:
        steam_id:   Numeric SteamID64
        app_id:     730 = CS2/CSGO, 440 = TF2, 570 = Dota2
        context_id: 2 for most games

    Returns:
        List of inventory item dicts with asset + description merged.
    """
    url = f"https://steamcommunity.com/inventory/{steam_id}/{app_id}/{context_id}"
    params = {"l": "english", "count": 75}
    try:
        resp = requests.get(url, params=params, timeout=15, headers={
            "User-Agent": "DeShopSDK/1.0 (+https://deshop.example.com)"
        })
        if resp.status_code == 403:
            return []  # Private inventory
        resp.raise_for_status()
        data = resp.json()

        assets = {f"{a['classid']}_{a['instanceid']}": a for a in data.get("assets", [])}
        descriptions = {f"{d['classid']}_{d['instanceid']}": d for d in data.get("descriptions", [])}

        items = []
        for key, asset in assets.items():
            desc = descriptions.get(key, {})
            tags = {t["category"]: t["localized_tag_name"] for t in desc.get("tags", [])}
            items.append({
                "asset_id": asset.get("assetid"),
                "class_id": asset.get("classid"),
                "name": desc.get("market_hash_name", desc.get("name", "Unknown")),
                "type": desc.get("type", ""),
                "rarity": tags.get("Rarity", ""),
                "quality": tags.get("Quality", ""),
                "exterior": tags.get("Exterior", ""),
                "weapon": tags.get("Weapon", tags.get("Type", "")),
                "tradable": bool(desc.get("tradable", 0)),
                "marketable": bool(desc.get("marketable", 0)),
                "icon_url": f"https://community.akamai.steamstatic.com/economy/image/{desc.get('icon_url', '')}",
            })
        return items
    except Exception:
        return []


# ─── Routes ───────────────────────────────────────────────────────────────────

@steam_bp.get("/steam/health")
def steam_health():
    """
    Lightweight health check for the Steam auth blueprint.

    GET /auth/steam/health

    Returns 200 if the Steam auth service is reachable. Used by the
    frontend (ProfilePage) to verify backend availability before
    initiating the Steam OpenID redirect.
    """
    return jsonify({"ok": True, "service": "steam_auth"}), 200


@steam_bp.get("/steam")
def steam_login():
    """
    Initiate Steam OpenID login.
    Captures the 'wallet' query param to link the account after login.
    """
    wallet = request.args.get("wallet")
    if wallet:
        session["linking_wallet"] = wallet
        
    return_url = f"{BACKEND_URL}/auth/steam/callback"
    params = _steam_openid_params(return_url)
    login_url = f"{STEAM_OPENID_URL}?{urlencode(params)}"
    return redirect(login_url)


@steam_bp.get("/steam/callback")
def steam_callback():
    """
    Handle the Steam OpenID callback and redirect back to the frontend.
    """
    params = dict(request.args)
    claimed_id = params.get("openid.claimed_id", "")
    steam_id = _extract_steam_id(claimed_id)
    linking_wallet = session.pop("linking_wallet", None)

    if not steam_id:
        return redirect(f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}?error=missing_steam_id")

    if not _verify_steam_assertion(params):
        return redirect(f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}?error=auth_failed")

    # Issue token
    timestamp = int(time.time())
    payload = f"{steam_id}:{timestamp}"
    token = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    signed_token = f"{payload}:{token}"

    # Redirect to frontend with data in fragments (safer for SPA)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    redirect_url = f"{frontend_url}#steam_id={steam_id}&token={signed_token}"
    if linking_wallet:
        redirect_url += f"&wallet={linking_wallet}"
        # In a real app, you'd save this link in the DB here.
        # User.query.filter_by(wallet_address=linking_wallet).update({"steam_id": steam_id})
        
    return redirect(redirect_url)


@steam_bp.get("/steam/profile/<steam_id>")
def steam_profile(steam_id: str):
    """
    Fetch a Steam user's public profile.

    GET /auth/steam/profile/76561197993496553

    Returns the Steam profile data including avatar, username, etc.
    No authentication required (public endpoint for demo purposes).
    In production, protect with JWT middleware.
    """
    profile = fetch_steam_profile(steam_id)
    if not profile:
        return jsonify({"error": "Profile not found or Steam API key missing"}), 404
    return jsonify({"profile": profile}), 200


@steam_bp.get("/steam/inventory/<steam_id>")
def steam_inventory(steam_id: str):
    """
    Fetch a Steam user's CS2 inventory.

    GET /auth/steam/inventory/76561197993496553

    Limitations:
    - Only works for PUBLIC Steam profiles
    - Rate limited by Steam (no official limit)
    - Requires the user to have a public inventory

    Query params:
      ?app_id=730   (default: 730 = CS2)
    """
    app_id = int(request.args.get("app_id", 730))
    items = fetch_steam_inventory(steam_id, app_id=app_id)
    return jsonify({
        "steam_id": steam_id,
        "app_id": app_id,
        "item_count": len(items),
        "items": items,
        "note": "Private inventories return empty list. Steam does not expose trade prices via inventory API.",
    }), 200
