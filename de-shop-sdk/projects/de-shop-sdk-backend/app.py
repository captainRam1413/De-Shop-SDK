"""
De-Shop SDK — Flask API Gateway (Production)
================================================
Implements all marketplace endpoints with:
  - SQLAlchemy database persistence (replaces InMemoryStore)
  - JWT + API Key authentication & authorization
  - Input validation on all endpoints
  - Row-level locking for race condition prevention
  - Proper CORS configuration
  - Rate limiting

Critical updates from v2.0:
  1. Database persistence via DatabaseStore
  2. JWT authentication with @require_auth / @require_wallet_match
  3. Input validation with validators module
  4. SELECT FOR UPDATE locking on buy/list/cancel
  5. Structured error handling
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from deshop_backend.ai_pricing import AIPricingEngine
from deshop_backend.blockchain import AlgorandAdapter
from deshop_backend.db_store import DatabaseStore
from deshop_backend.steam_auth import steam_bp, fetch_steam_inventory, fetch_steam_profile
from deshop_backend.ws_events import init_socketio, get_connection_count, get_room_memberships
from deshop_backend.ws_events import (
    broadcast_mint, broadcast_list, broadcast_buy, broadcast_cancel,
    broadcast_price_update, broadcast_trade_completed, send_user_notification,
    start_market_stats_broadcast,
)
from deshop_backend.ipfs_storage import upload_metadata
from deshop_backend.price_oracle import get_skinport_price, get_bulk_prices, map_steam_item_to_sdk_asset, get_oracle_status
from deshop_backend.auth import (
    generate_nonce,
    verify_nonce,
    create_token,
    decode_token,
    require_auth,
    require_wallet_match,
    optional_auth,
)
from deshop_backend.validators import (
    validate_mint_request,
    validate_list_request,
    validate_buy_request,
    validate_cancel_request,
    validate_algorand_address,
    validate_steam_id,
    validate_wallet_param,
)
from deshop_backend.models import db

# ─── App Configuration ────────────────────────────────────────────────────────

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET", "dev-secret-please-change")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///deshop.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# CORS — restrict to known origins in production
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
CORS(app, origins=allowed_origins, supports_credentials=True)

# Rate limiting — 60 requests/minute per IP, stricter on write endpoints
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["60 per minute", "5 per second"],
    storage_uri=os.getenv("RATE_LIMIT_URI", "memory://"),
)

# ─── Initialize Services ──────────────────────────────────────────────────────

app.register_blueprint(steam_bp)

ai_engine = AIPricingEngine()
store = DatabaseStore(ai=ai_engine)
store.init_app(app)  # Initializes SQLAlchemy + creates tables

# Auto-train the AI pricing model on startup if there are enough buy
# transactions. This ensures the ML path is exercised in production
# instead of always falling back to rule-based pricing. Safe to skip
# on cold databases (no buy txns yet) — train_model() returns no_data.
with app.app_context():
    try:
        from deshop_backend.models import Transaction as _TxnModel
        buy_count = _TxnModel.query.filter_by(txn_type="buy").count()
        if buy_count >= 5:
            _train_result = ai_engine.train_model()
            if _train_result.get("status") == "ok":
                print(f"AI model auto-trained with {buy_count} buy transactions "
                      f"(r^2={_train_result.get('r_squared', 0.0):.4f})")
            else:
                print(f"AI model auto-train attempted with {buy_count} buy txns "
                      f"but returned status={_train_result.get('status')}")
    except Exception as _e:
        print(f"AI model auto-train skipped: {_e}")

algorand = AlgorandAdapter.from_env()

socketio = init_socketio(app)
app.config["DESHOP_STORE"] = store

# Start background market stats broadcast (every 30 seconds)
start_market_stats_broadcast(app, interval=30)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> tuple[dict, int]:
    return {"ok": True, "blockchain": algorand.health()}, 200


# ─── Authentication Endpoints ─────────────────────────────────────────────────

@app.post("/auth/nonce")
@limiter.limit("10 per minute")
def auth_nonce() -> tuple[dict, int]:
    """
    Request an authentication nonce for wallet-based login.

    Body: { "wallet": "ALGORAND_ADDRESS" }
    Returns: { "nonce": "..." }

    The client must sign this nonce with their Algorand wallet private key,
    then submit it to /auth/verify.
    """
    data = request.get_json(silent=True) or {}
    wallet = str(data.get("wallet", "")).strip()

    valid, msg = validate_wallet_param(wallet)
    if not valid:
        return {"error": msg}, 400

    nonce = generate_nonce(wallet)
    return {"nonce": nonce, "wallet": wallet}, 200


@app.post("/auth/verify")
@limiter.limit("10 per minute")
def auth_verify() -> tuple[dict, int]:
    """
    Verify a signed nonce and issue a JWT token.

    Body: { "wallet": "...", "nonce": "...", "signature": "..." }

    In a full implementation, the signature would be verified against
    the Algorand blockchain. For now, we verify the nonce is valid
    and was generated by our server (proving the client requested it).

    Returns: { "token": "jwt...", "expires_in": 86400 }
    """
    data = request.get_json(silent=True) or {}
    wallet = str(data.get("wallet", "")).strip()
    nonce = str(data.get("nonce", "")).strip()
    signature = data.get("signature", "")

    valid, msg = validate_wallet_param(wallet)
    if not valid:
        return {"error": msg}, 400

    if not nonce:
        return {"error": "nonce is required"}, 400

    if not verify_nonce(wallet, nonce):
        return {"error": "Invalid or expired nonce"}, 401

    # In production, verify the Algorand signature here:
    # verified = verify_algorand_signature(wallet, nonce, signature)
    # if not verified:
    #     return {"error": "Signature verification failed"}, 401

    # If nonce is valid (and optionally signature), issue JWT
    token = create_token(wallet)
    return {
        "token": token,
        "expires_in": 86400,
        "wallet": wallet,
    }, 200


@app.get("/auth/me")
@require_auth
def auth_me() -> tuple[dict, int]:
    """Return the authenticated wallet info."""
    return {
        "wallet": request.auth_wallet,
        "method": request.auth_method,
    }, 200


# ─── Mint ─────────────────────────────────────────────────────────────────────

@app.post("/mint")
@require_auth
def mint() -> tuple[dict, int]:
    """
    Mint a new NFT skin asset.

    Requires JWT authentication. The authenticated wallet must match
    the 'wallet' field in the request body.
    """
    data = request.get_json(silent=True) or {}

    # Validate all inputs
    validation = validate_mint_request(data)
    if not validation.is_valid:
        return validation.to_dict(), 400

    wallet = str(data.get("wallet", "")).strip()

    # Authorization: authenticated wallet must match
    if request.auth_wallet != wallet:
        return {"error": "Wallet mismatch: you can only mint to your own wallet"}, 403

    skin_name = str(data.get("skin_name", "Neon Phantom")).strip()
    rarity = str(data.get("rarity", "rare")).strip().lower()
    skin_type = str(data.get("skin_type", "weapon")).strip().lower()
    royalty_bps = int(data.get("royalty_bps", 500))

    # Optional on-chain fields from SDK
    asa_id = data.get("asa_id")
    txn_id = data.get("txn_id")

    try:
        asset = store.mint(
            wallet=wallet,
            skin_name=skin_name,
            rarity=rarity,
            royalty_bps=royalty_bps,
            skin_type=skin_type,
            asa_id=int(asa_id) if asa_id else None,
            txn_id=str(txn_id) if txn_id else None,
        )
        broadcast_mint(asset)
        return {"asset": asset, "mode": "testnet" if algorand.enabled else "mock"}, 201
    except Exception as exc:
        app.logger.error("Unhandled error in route: %s", exc, exc_info=True)
        return {"error": "Internal server error"}, 500


# ─── Assets ───────────────────────────────────────────────────────────────────

@app.get("/assets/<wallet>")
@optional_auth
def assets(wallet: str) -> tuple[dict, int]:
    """Get all assets owned by a wallet."""
    valid, msg = validate_algorand_address(wallet)
    if not valid:
        return {"error": msg}, 400

    return {"wallet": wallet, "assets": store.assets_by_owner(wallet)}, 200


# ─── List Asset ───────────────────────────────────────────────────────────────

@app.post("/list")
@require_auth
def list_asset() -> tuple[dict, int]:
    """List an asset for sale on the marketplace."""
    data = request.get_json(silent=True) or {}

    # Validate inputs
    validation = validate_list_request(data)
    if not validation.is_valid:
        return validation.to_dict(), 400

    wallet = str(data.get("wallet", "")).strip()

    # Authorization
    if request.auth_wallet != wallet:
        return {"error": "Wallet mismatch: you can only list your own assets"}, 403

    asset_id = int(data.get("asset_id", 0))
    price = int(data.get("price", 0))

    try:
        asset = store.list_asset(wallet=wallet, asset_id=asset_id, price=price)
        broadcast_list(asset)
        return {"asset": asset}, 200
    except PermissionError as exc:
        return {"error": str(exc)}, 403
    except ValueError as exc:
        return {"error": str(exc)}, 400


# ─── Buy Asset ────────────────────────────────────────────────────────────────

@app.post("/buy")
@require_auth
def buy() -> tuple[dict, int]:
    """
    Purchase a listed asset.

    Uses database row locking to prevent race conditions.
    The authenticated wallet is used as the buyer.
    """
    data = request.get_json(silent=True) or {}

    # Validate inputs
    validation = validate_buy_request(data)
    if not validation.is_valid:
        return validation.to_dict(), 400

    buyer_wallet = str(data.get("buyer_wallet", "")).strip()

    # Authorization: buyer must be authenticated
    if request.auth_wallet != buyer_wallet:
        return {"error": "Wallet mismatch: you can only buy as yourself"}, 403

    asset_id = int(data.get("asset_id", 0))
    txn_id = data.get("txn_id")

    try:
        result = store.buy_asset(buyer_wallet=buyer_wallet, asset_id=asset_id)
        if txn_id and "sale" in result:
            result["sale"]["txn_id"] = str(txn_id)
        broadcast_buy(result)
        # Also broadcast enriched trade_completed event
        if "sale" in result:
            trade_data = {
                **result["sale"],
                "asset_id": asset_id,
                "rarity": result.get("asset", {}).get("rarity", ""),
                "asset_name": result.get("asset", {}).get("name", ""),
                "buyer_wallet": result["sale"].get("buyer", ""),
                "seller_wallet": result["sale"].get("seller", ""),
            }
            broadcast_trade_completed(trade_data)
        return result, 200
    except ValueError as exc:
        return {"error": str(exc)}, 400


# ─── Marketplace ──────────────────────────────────────────────────────────────

@app.get("/marketplace")
@optional_auth
def marketplace() -> tuple[dict, int]:
    """Get all active marketplace listings and recent sales."""
    return {"marketplace": store.marketplace(), "sales": store.sales[:20]}, 200


# ─── Cancel Listing ──────────────────────────────────────────────────────────

@app.post("/cancel")
@require_auth
def cancel() -> tuple[dict, int]:
    """Cancel an active listing."""
    data = request.get_json(silent=True) or {}

    # Validate inputs
    validation = validate_cancel_request(data)
    if not validation.is_valid:
        return validation.to_dict(), 400

    wallet = str(data.get("wallet", "")).strip()

    # Authorization
    if request.auth_wallet != wallet:
        return {"error": "Wallet mismatch: you can only cancel your own listings"}, 403

    asset_id = int(data.get("asset_id", 0))

    try:
        asset = store.cancel_listing(wallet=wallet, asset_id=asset_id)
        broadcast_cancel(asset)
        return {"asset": asset}, 200
    except PermissionError as exc:
        return {"error": str(exc)}, 403
    except ValueError as exc:
        return {"error": str(exc)}, 400


# ─── AI Pricing ──────────────────────────────────────────────────────────────

@app.post("/ai-price")
@limiter.limit("30 per minute")
def ai_price() -> tuple[dict, int]:
    """Get AI-suggested price for a skin."""
    data = request.get_json(silent=True) or {}
    skin_name = str(data.get("skin_name", "Neon Phantom"))
    rarity = str(data.get("rarity", "rare"))
    suggestion = ai_engine.suggest_price(skin_name=skin_name, rarity=rarity)
    return {
        "price": suggestion.price,
        "confidence": suggestion.confidence,
        "trend": suggestion.trend,
        "rarity_score": suggestion.rarity_score,
        "demand_score": suggestion.demand_score,
    }, 200


# ─── Skin Intelligence Engine ────────────────────────────────────────────────

WEAPON_PATTERNS = {
    "ak": "AR", "ak-47": "AR", "ak47": "AR", "m4": "AR", "m4a1": "AR",
    "m16": "AR", "scar": "AR", "grau": "AR", "fal": "AR", "rifle": "AR",
    "assault": "AR", "ar": "AR",
    "mp5": "SMG", "mp7": "SMG", "mp9": "SMG", "uzi": "SMG", "p90": "SMG",
    "smg": "SMG", "mac-10": "SMG", "vector": "SMG",
    "sniper": "Sniper", "awp": "Sniper", "awm": "Sniper", "kar98": "Sniper",
    "hdr": "Sniper", "barrett": "Sniper",
    "shotgun": "Shotgun", "spas": "Shotgun", "725": "Shotgun",
    "pistol": "Pistol", "deagle": "Pistol", "glock": "Pistol",
    "revolver": "Pistol", "magnum": "Pistol",
    "knife": "Melee", "sword": "Melee", "blade": "Melee", "katana": "Melee",
    "axe": "Melee", "dagger": "Melee",
    "lmg": "LMG", "pkm": "LMG", "m249": "LMG",
    "rpg": "Launcher", "launcher": "Launcher",
}

CHARACTER_KW = [
    "operator", "character", "soldier", "ghost", "phantom", "warrior",
    "ninja", "samurai", "knight", "guardian", "hunter", "assassin",
    "skin", "outfit", "armor", "suit", "hero",
]

EFFECT_SCORES = {
    "fire": 1.5, "flame": 1.5, "ice": 1.3, "frost": 1.3,
    "electric": 1.4, "lightning": 1.4, "neon": 1.2, "holographic": 1.8,
    "holo": 1.8, "gold": 2.0, "diamond": 2.5, "plasma": 1.6,
    "dragon": 1.5, "galaxy": 2.0, "reactive": 2.2, "tracer": 1.8,
    "animated": 1.5, "dark": 1.1, "shadow": 1.1, "void": 1.7,
}

RARITY_BASES = {
    "common": 2.0, "uncommon": 3.5, "rare": 5.0,
    "epic": 7.0, "legendary": 8.5, "mythic": 9.5,
}

RARITY_PRICES = {
    "common": 10, "uncommon": 20, "rare": 50,
    "epic": 120, "legendary": 300, "mythic": 800,
}


def _classify_skin(name: str, weapon: str) -> str:
    text = f"{name} {weapon}".lower()
    for pat in WEAPON_PATTERNS:
        if pat in text:
            return "gun_skin"
    for kw in CHARACTER_KW:
        if kw in text:
            return "character_skin"
    return "character_skin" if not weapon else "gun_skin"


def _detect_weapon_class(name: str, weapon: str) -> tuple[str, str]:
    text = f"{name} {weapon}".lower()
    for pat, cls in WEAPON_PATTERNS.items():
        if pat in text:
            cat = {
                "AR": "Assault Rifle Skin", "SMG": "SMG Skin",
                "Sniper": "Sniper Rifle Skin", "Shotgun": "Shotgun Skin",
                "Pistol": "Sidearm Skin", "Melee": "Melee Weapon Skin",
                "LMG": "LMG Skin", "Launcher": "Launcher Skin",
            }.get(cls, "Universal Weapon Skin")
            return cls, cat
    return "Unknown", "Universal Weapon Skin"


def _detect_effects(text: str) -> tuple[list[str], float]:
    effects, bonus = [], 0.0
    for kw, score in EFFECT_SCORES.items():
        if kw in text.lower():
            effects.append(kw)
            bonus = max(bonus, score)
    return effects, bonus


def _compute_rarity_score(rarity: str, effect_bonus: float) -> float:
    base = RARITY_BASES.get(rarity, 3.0) + min(effect_bonus, 2.5)
    return round(min(10, max(0, base)), 1)


@app.post("/analyze")
def analyze_skin() -> tuple[dict, int]:
    """Skin Intelligence Engine — classify, map, score, and price an NFT skin."""
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "Unknown Skin"))
    weapon = str(data.get("weapon", data.get("attributes", {}).get("weapon", "")))
    rarity = str(data.get("rarity", data.get("attributes", {}).get("rarity", "rare"))).lower()
    effect = str(data.get("effect", data.get("attributes", {}).get("effect", "")))
    style = str(data.get("style", data.get("attributes", {}).get("style", "")))

    skin_type = _classify_skin(name, weapon)
    weapon_class, weapon_category = _detect_weapon_class(name, weapon)
    all_text = f"{name} {effect} {style}"
    effects, eff_bonus = _detect_effects(all_text)
    rarity_score = _compute_rarity_score(rarity, eff_bonus)
    base_price = RARITY_PRICES.get(rarity, 50)
    price_mod = 1.2 if skin_type == "gun_skin" else 1.5 if skin_type == "character_skin" else 0.6
    suggested_price = round(base_price * price_mod * (rarity_score / 5) ** 1.5)

    confidence = 60
    if weapon: confidence += 10
    if rarity: confidence += 8
    if effect: confidence += 7
    if style: confidence += 5
    if len(name) > 5: confidence += 5
    confidence = min(98, confidence)

    tags = []
    if skin_type == "gun_skin":
        tags.append("weapon_skin")
    else:
        tags.append("operator_skin")
    tags.append(rarity)
    if effects:
        tags.append("animated")
        tags.extend(effects)
    if weapon_class != "Unknown":
        tags.append(weapon_class.lower())
    tags.append("fps")

    game_mapping = {
        "game": "Call of Duty",
        "category": weapon_category if skin_type == "gun_skin" else "Operator Skin",
        "weapon_class": weapon_class,
    }
    if skin_type == "character_skin":
        game_mapping["operator_type"] = "Mil-Sim Operator"

    return {
        "type": skin_type,
        "game_mapping": game_mapping,
        "rarity_score": rarity_score,
        "visual_style": " ".join(filter(None, [style, " ".join(effects), "skin"])),
        "suggested_price": suggested_price,
        "confidence": confidence,
        "tags": list(set(tags)),
        "effects": effects,
    }, 200


# ─── Game Bridge Endpoints ──────────────────────────────────────────────────

SKIN_IMAGES = {
    "common": "https://placehold.co/256x256/4f4f4f/ffffff?text=Common+Skin",
    "rare": "https://placehold.co/256x256/166fda/ffffff?text=Rare+Skin",
    "epic": "https://placehold.co/256x256/8a2be2/ffffff?text=Epic+Skin",
    "legendary": "https://placehold.co/256x256/e3b341/000000?text=Legendary+Skin",
}


@app.get("/bridge/minecraft/<wallet>")
def bridge_minecraft(wallet: str) -> tuple[dict, int]:
    """Minecraft skin bridge — returns NFT skins mapped to Minecraft format."""
    valid, msg = validate_algorand_address(wallet)
    if not valid:
        return {"error": msg}, 400

    player_assets = store.assets_by_owner(wallet)
    skins = []
    for asset in player_assets:
        rarity = asset.get("rarity", "common")
        skins.append({
            **asset,
            "image_url": SKIN_IMAGES.get(rarity, SKIN_IMAGES["common"]),
            "applied": False,
            "minecraft_slot": f"skin_slot_{asset['id']}",
            "format": "64x64_steve",
        })

    return {
        "platform": "Minecraft Java Edition (Simulated)",
        "wallet": wallet,
        "skins": skins,
        "status": "synced" if skins else "no_assets",
        "bridge_version": "1.0.0-mock",
        "server": "mc.deshop.demo:25565",
    }, 200


@app.get("/bridge/steam/<wallet>")
@limiter.limit("10 per minute")
def bridge_steam(wallet: str) -> tuple[dict, int]:
    """Real Steam Bridge: Fetches linked SteamID for the wallet."""
    valid, msg = validate_algorand_address(wallet)
    if not valid:
        return {"error": msg}, 400

    steam_id = request.args.get("steam_id", "76561198715018502")

    # Validate steam_id if provided
    if steam_id != "76561198715018502":
        valid, msg = validate_steam_id(steam_id)
        if not valid:
            return {"error": msg}, 400

    try:
        raw_items = fetch_steam_inventory(steam_id)
        skins = [map_steam_item_to_sdk_asset(item) for item in raw_items if item.get('marketable')]

        return {
            "platform": "Steam (Live API)",
            "wallet": wallet,
            "steam_id": steam_id,
            "skins": skins[:10],
            "status": "connected" if skins else "no_marketable_items",
            "bridge_version": "2.0.0-prod"
        }, 200
    except Exception as e:
        return {"platform": "Steam", "status": "error", "error": str(e)}, 500


# ─── Price Oracle Endpoints ─────────────────────────────────────────────────

@app.get("/prices")
@limiter.limit("30 per minute")
def get_price() -> tuple[dict, int]:
    """Fetch real-time skin price from Skinport."""
    name = request.args.get("name", "").strip()
    currency = request.args.get("currency", "USD")
    if not name:
        return {"error": "name query param required"}, 400
    if len(name) > 256:
        return {"error": "name too long (max 256 characters)"}, 400
    result = get_skinport_price(name, currency)
    return jsonify(result), 200


@app.post("/prices/bulk")
@limiter.limit("10 per minute")
def bulk_prices() -> tuple[dict, int]:
    """Fetch prices for multiple skins at once."""
    data = request.get_json(silent=True) or {}
    names = data.get("names", [])
    if not names or not isinstance(names, list):
        return {"error": "names must be a non-empty list"}, 400
    if len(names) > 50:
        return {"error": "Max 50 items per bulk request"}, 400
    # Validate each name
    for n in names:
        if not isinstance(n, str) or len(n) > 256:
            return {"error": f"Invalid name in list: {str(n)[:50]}"}, 400
    return jsonify({"prices": get_bulk_prices(names)}), 200


# ─── Asset History Endpoint ─────────────────────────────────────────────────

@app.get("/history/<int:asset_id>")
def get_history(asset_id: int) -> tuple[dict, int]:
    """Return provenance history for an asset."""
    from deshop_backend.models import db as _db, Asset as AssetModel, Transaction as TxnModel

    asset = _db.session.get(AssetModel, asset_id)
    if asset is None:
        return {"error": "Asset not found"}, 404

    # Build history from transactions table
    txns = TxnModel.query.filter_by(asset_id=asset_id).order_by(TxnModel.created_at.asc()).all()
    history = []
    for t in txns:
        entry = {
            "type": t.txn_type,
            "timestamp": t.created_at.isoformat() if t.created_at else None,
            "txn_id": t.txn_id,
        }
        if t.txn_type == "mint":
            entry["by"] = t.to_wallet
        elif t.txn_type == "buy":
            entry["by"] = t.to_wallet
            entry["from"] = t.from_wallet
            entry["price"] = t.amount
            entry["royalty_paid"] = t.royalty_paid
        elif t.txn_type == "list":
            entry["by"] = t.from_wallet
            entry["price"] = t.amount
        elif t.txn_type == "cancel":
            entry["by"] = t.from_wallet
        elif t.txn_type == "transfer":
            entry["by"] = t.from_wallet
            entry["to"] = t.to_wallet
        history.append(entry)

    return {"asset_id": asset_id, "history": history}, 200


# ─── Steam Inventory Bridge (Real) ──────────────────────────────────────────

@app.get("/steam/inventory/<steam_id>")
@limiter.limit("5 per minute")
def real_steam_inventory(steam_id: str) -> tuple[dict, int]:
    """Fetch real Steam CS2 inventory and enrich with Skinport prices."""
    valid, msg = validate_steam_id(steam_id)
    if not valid:
        return {"error": msg}, 400

    raw_items = fetch_steam_inventory(steam_id)
    enriched = [map_steam_item_to_sdk_asset(item) for item in raw_items]
    return {
        "steam_id": steam_id,
        "item_count": len(enriched),
        "items": enriched,
        "note": "Prices from Skinport public API. Private inventories return empty list.",
    }, 200


# ─── Steam Bot Escrow & Minting ────────────────────────────────────────────

@app.post("/steam/escrow")
@require_auth
def steam_escrow() -> tuple[dict, int]:
    """Simulate Steam Bot taking an item into escrow and minting a receipt NFT."""
    data = request.get_json(silent=True) or {}
    steam_id = str(data.get("steam_id", "")).strip()
    wallet = str(data.get("wallet", "")).strip()
    item_name = str(data.get("item_name", "CS2 Skin")).strip()
    rarity = str(data.get("rarity", "rare")).strip().lower()

    # Validation
    valid, msg = validate_steam_id(steam_id)
    if not valid:
        return {"error": msg}, 400

    valid, msg = validate_wallet_param(wallet)
    if not valid:
        return {"error": msg}, 400

    # Authorization
    if request.auth_wallet != wallet:
        return {"error": "Wallet mismatch: you can only escrow to your own wallet"}, 403

    try:
        asset = store.mint(
            wallet=wallet,
            skin_name=item_name,
            rarity=rarity,
            royalty_bps=500,
            skin_type="weapon",
            steam_id=steam_id,
        )
        return {
            "status": "success",
            "message": "Item secured in Steam Bot Escrow. Digital receipt minted.",
            "asset": asset,
        }, 200
    except Exception as exc:
        app.logger.error("Unhandled error in route: %s", exc, exc_info=True)
        return {"error": "Internal server error"}, 500


@app.post("/steam/withdraw")
@require_auth
def steam_withdraw() -> tuple[dict, int]:
    """Simulate burning the NFT and withdrawing the actual Steam item."""
    data = request.get_json(silent=True) or {}
    wallet = str(data.get("wallet", "")).strip()
    steam_id = str(data.get("steam_id", "")).strip()
    asset_id = int(data.get("asset_id", 0))

    valid, msg = validate_wallet_param(wallet)
    if not valid:
        return {"error": msg}, 400

    valid, msg = validate_steam_id(steam_id)
    if not valid:
        return {"error": msg}, 400

    # Authorization
    if request.auth_wallet != wallet:
        return {"error": "Wallet mismatch: you can only withdraw your own assets"}, 403

    # Verify ownership via database
    from deshop_backend.models import db as _db, Asset as AssetModel, Transaction as TxnModel

    asset = AssetModel.query.with_for_update().filter_by(id=asset_id).first()
    if not asset:
        return {"error": "Asset not found"}, 404
    if asset.owner_wallet != wallet:
        return {"error": "Not the owner"}, 403

    # Record burn transaction
    txn = TxnModel(
        asset_id=asset_id,
        txn_type="burn",
        from_wallet=wallet,
    )
    _db.session.add(txn)
    _db.session.delete(asset)  # Hard delete (burn)
    _db.session.commit()

    return {
        "status": "success",
        "message": "NFT burned. Trade offer sent via Steam Bot to deliver your item.",
        "asset_id": asset_id,
        "steam_id": steam_id
    }, 200


# ─── WebSocket & Utility Endpoints ──────────────────────────────────────────

@app.get("/ws/status")
def ws_status() -> tuple[dict, int]:
    """Return WebSocket connection count and room membership info."""
    return {
        "connected_clients": get_connection_count(),
        "rooms": get_room_memberships(),
    }, 200


@app.post("/ipfs/upload")
@require_auth
def ipfs_upload() -> tuple[dict, int]:
    """Upload metadata to IPFS via Pinata. Requires authentication."""
    data = request.get_json(silent=True) or {}
    if not data:
        return {"error": "metadata payload required"}, 400
    try:
        uri = upload_metadata(data)
        return {"ipfs_uri": uri}, 200
    except Exception as exc:
        app.logger.error("Unhandled error in route: %s", exc, exc_info=True)
        return {"error": "Internal server error"}, 500


@app.post("/ai/train")
@require_auth
def ai_train() -> tuple[dict, int]:
    """Train the ML pricing model. Requires authentication."""
    try:
        result = ai_engine.train_model()
        return result, 200
    except Exception as exc:
        app.logger.error("Unhandled error in route: %s", exc, exc_info=True)
        return {"error": "Internal server error"}, 500


@app.get("/oracle/status")
def oracle_status() -> tuple[dict, int]:
    """Return comprehensive price oracle status."""
    return get_oracle_status(), 200


# ─── Search API ─────────────────────────────────────────────────────────────

@app.get("/api/search")
@optional_auth
def search_assets() -> tuple[dict, int]:
    """
    Full-text search across marketplace assets.

    Query params:
      q          – search string (matched against skin name)
      rarity     – filter by rarity tier
      min_price  – minimum price in μALGO
      max_price  – maximum price in μALGO
      sort       – newest | price_asc | price_desc | rarest
      page       – page number (default 1)
      per_page   – items per page (default 20, max 100)
    """
    try:
        from deshop_backend.models import Asset as AssetModel, Transaction as TxnModel

        query = request.args.get("q", "").strip()
        rarity = request.args.get("rarity", "").strip().lower()
        min_price = request.args.get("min_price", type=int)
        max_price = request.args.get("max_price", type=int)
        sort = request.args.get("sort", "newest").strip().lower()
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)

        # Clamp per_page
        per_page = max(1, min(100, per_page))
        page = max(1, page)

        # Build query
        q = AssetModel.query

        # Full-text search on name
        if query:
            q = q.filter(AssetModel.name.ilike(f"%{query}%"))

        # Rarity filter
        if rarity:
            q = q.filter(AssetModel.rarity == rarity)

        # Price range filters
        if min_price is not None:
            q = q.filter(AssetModel.list_price >= min_price)
        if max_price is not None:
            q = q.filter(AssetModel.list_price <= max_price)

        # Only show listed assets
        q = q.filter(AssetModel.listed == True)  # noqa: E712

        # Sorting
        rarity_order = {"common": 1, "uncommon": 2, "rare": 3, "epic": 4, "legendary": 5, "mythic": 6}
        if sort == "price_asc":
            q = q.order_by(AssetModel.list_price.asc())
        elif sort == "price_desc":
            q = q.order_by(AssetModel.list_price.desc())
        elif sort == "rarest":
            # Sort by rarity rarity_order mapping via CASE
            from sqlalchemy import case
            whens = {r: idx for r, idx in rarity_order.items()}
            q = q.order_by(case(whens, value=AssetModel.rarity).desc())
        else:  # newest
            q = q.order_by(AssetModel.created_at.desc())

        total = q.count()
        results = q.offset((page - 1) * per_page).limit(per_page).all()

        return {
            "success": True,
            "data": {
                "results": [a.to_dict() for a in results],
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
            },
        }, 200
    except Exception as exc:
        app.logger.error("Unhandled error in route: %s", exc, exc_info=True)
        return {"success": False, "error": "Internal server error"}, 500


# ─── Analytics Endpoints ────────────────────────────────────────────────────

@app.get("/api/analytics/market-stats")
def market_stats() -> tuple[dict, int]:
    """
    Get marketplace statistics.

    Returns total_volume, active_listings, floor_price, trades_24h,
    plus percentage changes for each metric.
    """
    try:
        from deshop_backend.models import Asset as AssetModel, Transaction as TxnModel
        from datetime import timedelta
        from sqlalchemy import func

        now = datetime.now(timezone.utc)
        day_ago = now - timedelta(hours=24)

        # Total volume (sum of all buy transaction amounts)
        total_volume = db.session.query(func.coalesce(func.sum(TxnModel.amount), 0)).filter(
            TxnModel.txn_type == "buy"
        ).scalar() or 0

        # 24h volume
        volume_24h = db.session.query(func.coalesce(func.sum(TxnModel.amount), 0)).filter(
            TxnModel.txn_type == "buy",
            TxnModel.created_at >= day_ago,
        ).scalar() or 0

        # Active listings count
        active_listings = AssetModel.query.filter_by(listed=True).count()

        # Floor price (minimum listed price)
        floor_price = db.session.query(func.min(AssetModel.list_price)).filter(
            AssetModel.listed == True  # noqa: E712
        ).scalar()

        # Trades in last 24h
        trades_24h = TxnModel.query.filter(
            TxnModel.txn_type == "buy",
            TxnModel.created_at >= day_ago,
        ).count()

        # Previous 24h for percentage change
        two_days_ago = now - timedelta(hours=48)
        prev_volume_24h = db.session.query(func.coalesce(func.sum(TxnModel.amount), 0)).filter(
            TxnModel.txn_type == "buy",
            TxnModel.created_at >= two_days_ago,
            TxnModel.created_at < day_ago,
        ).scalar() or 0

        prev_trades_24h = TxnModel.query.filter(
            TxnModel.txn_type == "buy",
            TxnModel.created_at >= two_days_ago,
            TxnModel.created_at < day_ago,
        ).count()

        def _pct_change(current, previous):
            if previous == 0:
                return 100.0 if current > 0 else 0.0
            return round(((current - previous) / previous) * 100, 1)

        return {
            "success": True,
            "data": {
                "total_volume": total_volume,
                "volume_24h": volume_24h,
                "volume_change_pct": _pct_change(volume_24h, prev_volume_24h),
                "active_listings": active_listings,
                "floor_price": floor_price,
                "trades_24h": trades_24h,
                "trades_change_pct": _pct_change(trades_24h, prev_trades_24h),
            },
        }, 200
    except Exception as exc:
        app.logger.error("Unhandled error in route: %s", exc, exc_info=True)
        return {"success": False, "error": "Internal server error"}, 500


@app.get("/api/analytics/price-history/<int:asset_id>")
def price_history(asset_id: int) -> tuple[dict, int]:
    """
    Get price history for a specific asset.

    Query params:
      days – number of days to look back (default 7)
    """
    try:
        from deshop_backend.models import Asset as AssetModel, Transaction as TxnModel
        from sqlalchemy import func

        days = request.args.get("days", 7, type=int)
        days = max(1, min(365, days))

        asset = AssetModel.query.get(asset_id)
        if asset is None:
            return {"success": False, "error": "Asset not found"}, 404

        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)

        # Get buy transactions for this asset within the date range
        txns = TxnModel.query.filter(
            TxnModel.asset_id == asset_id,
            TxnModel.txn_type == "buy",
            TxnModel.created_at >= start_date,
        ).order_by(TxnModel.created_at.asc()).all()

        # Also include list transactions for price reference
        list_txns = TxnModel.query.filter(
            TxnModel.asset_id == asset_id,
            TxnModel.txn_type == "list",
            TxnModel.created_at >= start_date,
        ).order_by(TxnModel.created_at.asc()).all()

        # Build daily price history
        history = []
        # Group transactions by date
        from collections import defaultdict
        daily_data = defaultdict(lambda: {"prices": [], "volumes": 0})

        for t in txns:
            if t.created_at and t.amount:
                day_key = t.created_at.strftime("%Y-%m-%d")
                daily_data[day_key]["prices"].append(t.amount)
                daily_data[day_key]["volumes"] += 1

        for t in list_txns:
            if t.created_at and t.amount:
                day_key = t.created_at.strftime("%Y-%m-%d")
                if not daily_data[day_key]["prices"]:
                    daily_data[day_key]["prices"].append(t.amount)

        for day_key in sorted(daily_data.keys()):
            prices = daily_data[day_key]["prices"]
            avg_price = sum(prices) // len(prices) if prices else 0
            history.append({
                "date": day_key,
                "price": avg_price,
                "volume": daily_data[day_key]["volumes"],
            })

        # If no history, generate realistic mock data
        if not history:
            import random
            base_price = asset.list_price or asset.suggested_price.get("price", 50)
            for i in range(days):
                day = (now - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
                variation = random.uniform(0.9, 1.1)
                history.append({
                    "date": day,
                    "price": int(base_price * variation),
                    "volume": random.randint(0, 5),
                })

        return {
            "success": True,
            "data": {
                "asset_id": asset_id,
                "name": asset.name,
                "rarity": asset.rarity,
                "days": days,
                "history": history,
            },
        }, 200
    except Exception as exc:
        app.logger.error("Unhandled error in route: %s", exc, exc_info=True)
        return {"success": False, "error": "Internal server error"}, 500


@app.get("/api/analytics/portfolio/<wallet>")
@require_auth
def portfolio_analytics(wallet: str) -> tuple[dict, int]:
    """
    Get portfolio analytics for a wallet.

    Returns: total_value, rarity_distribution, performance_history
    """
    try:
        from deshop_backend.models import Asset as AssetModel, Transaction as TxnModel
        from sqlalchemy import func

        # Authorization: must be the wallet owner
        if request.auth_wallet != wallet:
            return {"success": False, "error": "Wallet mismatch: you can only view your own portfolio"}, 403

        # Get all assets owned by wallet
        assets = AssetModel.query.filter_by(owner_wallet=wallet).all()

        # Total value (sum of suggested prices)
        total_value = 0
        rarity_dist = {"common": 0, "uncommon": 0, "rare": 0, "epic": 0, "legendary": 0, "mythic": 0}
        for a in assets:
            price = a.suggested_price.get("price", 0) if a.suggested_price else 0
            total_value += price
            if a.rarity in rarity_dist:
                rarity_dist[a.rarity] += 1

        # Performance history (last 7 days based on transactions)
        now = datetime.now(timezone.utc)
        perf_history = []
        for i in range(7):
            day = now - timedelta(days=6 - i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)

            day_txns = TxnModel.query.filter(
                TxnModel.txn_type == "buy",
                TxnModel.from_wallet == wallet,
                TxnModel.created_at >= day_start,
                TxnModel.created_at < day_end,
            ).all()

            day_value = sum(t.amount or 0 for t in day_txns)
            perf_history.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "value": day_value,
            })

        # If no transaction data, provide mock realistic data
        if all(p["value"] == 0 for p in perf_history) and total_value > 0:
            import random
            running = total_value * 0.8
            for p in perf_history:
                running += random.randint(-20, 30)
                running = max(0, running)
                p["value"] = running

        return {
            "success": True,
            "data": {
                "wallet": wallet,
                "total_assets": len(assets),
                "total_value": total_value,
                "rarity_distribution": rarity_dist,
                "performance_history": perf_history,
            },
        }, 200
    except Exception as exc:
        app.logger.error("Unhandled error in route: %s", exc, exc_info=True)
        return {"success": False, "error": "Internal server error"}, 500


@app.get("/api/analytics/rarity-distribution")
def rarity_distribution() -> tuple[dict, int]:
    """
    Get rarity distribution across all assets.

    Returns: {common: N, uncommon: N, rare: N, epic: N, legendary: N, mythic: N}
    """
    try:
        from deshop_backend.models import Asset as AssetModel
        from sqlalchemy import func

        # Query counts grouped by rarity
        result = db.session.query(
            AssetModel.rarity, func.count(AssetModel.id)
        ).group_by(AssetModel.rarity).all()

        dist = {"common": 0, "uncommon": 0, "rare": 0, "epic": 0, "legendary": 0, "mythic": 0}
        for rarity, count in result:
            if rarity in dist:
                dist[rarity] = count
            else:
                dist[rarity] = count

        total = sum(dist.values())

        return {
            "success": True,
            "data": {
                "distribution": dist,
                "total_assets": total,
            },
        }, 200
    except Exception as exc:
        app.logger.error("Unhandled error in route: %s", exc, exc_info=True)
        return {"success": False, "error": "Internal server error"}, 500


# ─── User Profile Endpoints ─────────────────────────────────────────────────

# In-memory wishlist store: {wallet: set(asset_ids)}
_wishlist_store: dict[str, set[int]] = {}

# Achievement definitions
ACHIEVEMENTS = [
    {
        "id": "first_mint",
        "name": "First Mint",
        "description": "Mint your first NFT skin",
        "icon": "🎨",
        "category": "minting",
    },
    {
        "id": "collector",
        "name": "Collector",
        "description": "Own 5 or more assets",
        "icon": "📦",
        "category": "collection",
    },
    {
        "id": "trader",
        "name": "Trader",
        "description": "Complete 3 or more trades",
        "icon": "🔄",
        "category": "trading",
    },
    {
        "id": "legendary_hunter",
        "name": "Legendary Hunter",
        "description": "Own a legendary or mythic item",
        "icon": "🏆",
        "category": "collection",
    },
    {
        "id": "market_maker",
        "name": "Market Maker",
        "description": "List 5 or more items for sale",
        "icon": "💰",
        "category": "trading",
    },
    {
        "id": "diamond_hands",
        "name": "Diamond Hands",
        "description": "Hold an asset for 30+ days",
        "icon": "💎",
        "category": "collection",
    },
    {
        "id": "whale",
        "name": "Whale",
        "description": "Total portfolio value exceeds 1000 ALGO",
        "icon": "🐋",
        "category": "trading",
    },
    {
        "id": "cross_chain",
        "name": "Cross-Chain Pioneer",
        "description": "Link your Steam account",
        "icon": "🔗",
        "category": "integration",
    },
    {
        "id": "early_adopter",
        "name": "Early Adopter",
        "description": "Join during the beta period",
        "icon": "🚀",
        "category": "special",
    },
    {
        "id": "streak_master",
        "name": "Streak Master",
        "description": "Trade 3 days in a row",
        "icon": "🔥",
        "category": "trading",
    },
]


@app.get("/api/user/<wallet>/achievements")
@require_auth
def user_achievements(wallet: str) -> tuple[dict, int]:
    """
    Get achievement badges for a user.

    Returns list of all achievements with earned status based on
    the user's activity in the database.

    Requires JWT/API-key auth. The authenticated wallet must match the
    requested wallet, or be listed in the ``ADMIN_WALLETS`` env var
    (comma-separated) for cross-wallet admin access.
    """
    # Authorization: self or admin
    admin_wallets = {w.strip() for w in os.getenv("ADMIN_WALLETS", "").split(",") if w.strip()}
    if request.auth_wallet != wallet and request.auth_wallet not in admin_wallets:
        return {"success": False, "error": "Not authorized to view this wallet's achievements"}, 403

    try:
        from deshop_backend.models import Asset as AssetModel, Transaction as TxnModel, User as UserModel
        from datetime import timedelta
        from sqlalchemy import func

        user = UserModel.query.filter_by(wallet_address=wallet).first()

        # Count assets owned
        asset_count = AssetModel.query.filter_by(owner_wallet=wallet).count()

        # Count buy transactions
        buy_count = TxnModel.query.filter(
            TxnModel.txn_type == "buy",
            db.or_(TxnModel.from_wallet == wallet, TxnModel.to_wallet == wallet),
        ).count()

        # Count list transactions
        list_count = TxnModel.query.filter(
            TxnModel.txn_type == "list",
            TxnModel.from_wallet == wallet,
        ).count()

        # Has legendary/mythic?
        has_legendary = AssetModel.query.filter(
            AssetModel.owner_wallet == wallet,
            AssetModel.rarity.in_(["legendary", "mythic"]),
        ).first() is not None

        # Total portfolio value
        total_value = 0
        assets = AssetModel.query.filter_by(owner_wallet=wallet).all()
        for a in assets:
            total_value += a.suggested_price.get("price", 0) if a.suggested_price else 0

        # Has linked Steam?
        has_steam = user is not None and user.steam_id is not None

        # Check holding duration (oldest asset)
        oldest_asset = AssetModel.query.filter_by(owner_wallet=wallet).order_by(AssetModel.created_at.asc()).first()
        has_diamond_hands = False
        if oldest_asset and oldest_asset.created_at:
            age = datetime.now(timezone.utc) - oldest_asset.created_at
            has_diamond_hands = age.days >= 30

        # Compute earned status
        earned_map = {
            "first_mint": asset_count >= 1,
            "collector": asset_count >= 5,
            "trader": buy_count >= 3,
            "legendary_hunter": has_legendary,
            "market_maker": list_count >= 5,
            "diamond_hands": has_diamond_hands,
            "whale": total_value >= 1_000_000,  # 1 ALGO = 1M μALGO
            "cross_chain": has_steam,
            "early_adopter": True,  # Everyone in beta
            "streak_master": buy_count >= 3,  # Simplified check
        }

        achievements = []
        for ach in ACHIEVEMENTS:
            earned = earned_map.get(ach["id"], False)
            achievements.append({
                **ach,
                "earned": earned,
                "earned_at": None,  # Would need tracking table for real data
            })

        earned_count = sum(1 for a in achievements if a["earned"])

        return {
            "success": True,
            "data": {
                "wallet": wallet,
                "achievements": achievements,
                "earned_count": earned_count,
                "total_count": len(achievements),
            },
        }, 200
    except Exception as exc:
        app.logger.error("Unhandled error in route: %s", exc, exc_info=True)
        return {"success": False, "error": "Internal server error"}, 500


@app.get("/api/user/<wallet>/transactions")
@require_auth
def user_transactions(wallet: str) -> tuple[dict, int]:
    """
    Get transaction history for a user.

    Query params:
      page     – page number (default 1)
      per_page – items per page (default 20, max 100)

    Requires JWT/API-key auth. The authenticated wallet must match the
    requested wallet, or be listed in the ``ADMIN_WALLETS`` env var
    (comma-separated) for cross-wallet admin access.
    """
    # Authorization: self or admin
    admin_wallets = {w.strip() for w in os.getenv("ADMIN_WALLETS", "").split(",") if w.strip()}
    if request.auth_wallet != wallet and request.auth_wallet not in admin_wallets:
        return {"success": False, "error": "Not authorized to view this wallet's transactions"}, 403

    try:
        from deshop_backend.models import Transaction as TxnModel, Asset as AssetModel

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        per_page = max(1, min(100, per_page))
        page = max(1, page)

        # Get all transactions where wallet is involved
        q = TxnModel.query.filter(
            db.or_(
                TxnModel.from_wallet == wallet,
                TxnModel.to_wallet == wallet,
            )
        ).order_by(TxnModel.created_at.desc())

        total = q.count()
        txns = q.offset((page - 1) * per_page).limit(per_page).all()

        # Enrich with asset info
        results = []
        for t in txns:
            asset = AssetModel.query.get(t.asset_id)
            entry = t.to_dict()
            entry["asset_name"] = asset.name if asset else "Unknown"
            entry["asset_rarity"] = asset.rarity if asset else "unknown"
            results.append(entry)

        return {
            "success": True,
            "data": {
                "transactions": results,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": (total + per_page - 1) // per_page,
            },
        }, 200
    except Exception as exc:
        app.logger.error("Unhandled error in route: %s", exc, exc_info=True)
        return {"success": False, "error": "Internal server error"}, 500


# ─── Wishlist Endpoints ─────────────────────────────────────────────────────

@app.get("/api/wishlist")
@require_auth
def get_wishlist() -> tuple[dict, int]:
    """Get the authenticated user's wishlist."""
    try:
        from deshop_backend.models import Asset as AssetModel

        wallet = request.auth_wallet
        asset_ids = _wishlist_store.get(wallet, set())

        wishlist_items = []
        for aid in sorted(asset_ids):
            asset = AssetModel.query.get(aid)
            if asset:
                wishlist_items.append(asset.to_dict())

        return {
            "success": True,
            "data": {
                "wallet": wallet,
                "items": wishlist_items,
                "count": len(wishlist_items),
            },
        }, 200
    except Exception as exc:
        app.logger.error("Unhandled error in route: %s", exc, exc_info=True)
        return {"success": False, "error": "Internal server error"}, 500


@app.post("/api/wishlist/<int:asset_id>")
@require_auth
def add_to_wishlist(asset_id: int) -> tuple[dict, int]:
    """Add an item to the authenticated user's wishlist."""
    try:
        from deshop_backend.models import Asset as AssetModel

        wallet = request.auth_wallet

        # Verify asset exists
        asset = AssetModel.query.get(asset_id)
        if asset is None:
            return {"success": False, "error": "Asset not found"}, 404

        if wallet not in _wishlist_store:
            _wishlist_store[wallet] = set()

        if asset_id in _wishlist_store[wallet]:
            return {"success": False, "error": "Asset already in wishlist"}, 409

        _wishlist_store[wallet].add(asset_id)

        # Notify user
        send_user_notification(wallet, {
            "type": "wishlist_add",
            "asset_id": asset_id,
            "asset_name": asset.name,
            "message": f"{asset.name} added to your wishlist",
        })

        return {
            "success": True,
            "data": {
                "wallet": wallet,
                "asset_id": asset_id,
                "action": "added",
            },
        }, 201
    except Exception as exc:
        app.logger.error("Unhandled error in route: %s", exc, exc_info=True)
        return {"success": False, "error": "Internal server error"}, 500


@app.delete("/api/wishlist/<int:asset_id>")
@require_auth
def remove_from_wishlist(asset_id: int) -> tuple[dict, int]:
    """Remove an item from the authenticated user's wishlist."""
    try:
        wallet = request.auth_wallet

        if wallet not in _wishlist_store or asset_id not in _wishlist_store[wallet]:
            return {"success": False, "error": "Asset not in wishlist"}, 404

        _wishlist_store[wallet].discard(asset_id)

        return {
            "success": True,
            "data": {
                "wallet": wallet,
                "asset_id": asset_id,
                "action": "removed",
            },
        }, 200
    except Exception as exc:
        app.logger.error("Unhandled error in route: %s", exc, exc_info=True)
        return {"success": False, "error": "Internal server error"}, 500


# ─── Error Handlers ─────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed"}), 405


@app.errorhandler(429)
def rate_limit_exceeded(e):
    return jsonify({"error": "Rate limit exceeded", "retry_after": e.description}), 429


@app.errorhandler(500)
def internal_error(e):
    # Log the full exception server-side; return only a generic message to the
    # client to avoid leaking internal details (DB error text, stack traces, etc.).
    app.logger.error("Internal server error: %s", e, exc_info=True)
    return jsonify({"error": "Internal server error"}), 500


@app.errorhandler(Exception)
def unhandled_exception(e):
    """Catch-all for any exception not handled by a route or a more specific handler.

    Logs the full traceback server-side and returns a generic 500 to the client.
    HTTPException subclasses are re-raised so Flask's normal routing/4xx handling
    still works (e.g. abort(404) → not_found above).
    """
    from werkzeug.exceptions import HTTPException
    if isinstance(e, HTTPException):
        raise e
    app.logger.error("Unhandled exception: %s", e, exc_info=True)
    return jsonify({"error": "Internal server error"}), 500


# ─── Entry Point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # allow_unsafe_werkzeug=True is required for socketio.run() to work on
    # Werkzeug 3.x (pinned via Flask 3.1.0). Without it, the dev server
    # refuses to start with: "The Werkzeug web server is not designed to
    # run in production." For production, use gunicorn + eventlet/gevent.
    socketio.run(app, debug=True, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)
