from __future__ import annotations

import os

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from deshop_backend.ai_pricing import AIPricingEngine
from deshop_backend.blockchain import AlgorandAdapter
from deshop_backend.store import InMemoryStore
from deshop_backend.steam_auth import steam_bp, fetch_steam_inventory, fetch_steam_profile
from deshop_backend.price_oracle import get_skinport_price, get_bulk_prices, map_steam_item_to_sdk_asset

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET", "dev-secret-please-change")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///deshop.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
CORS(app)

# Rate limiting — 60 requests/minute per IP, stricter on write endpoints
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["60 per minute", "5 per second"],
    storage_uri="memory://",
)

# Register Steam OpenID blueprint
app.register_blueprint(steam_bp)

ai_engine = AIPricingEngine()
store = InMemoryStore(ai=ai_engine)
algorand = AlgorandAdapter.from_env()


@app.get("/health")
def health() -> tuple[dict, int]:
    return {"ok": True, "blockchain": algorand.health()}, 200


@app.post("/mint")
def mint() -> tuple[dict, int]:
    data = request.get_json(silent=True) or {}
    wallet = str(data.get("wallet", "")).strip()
    skin_name = str(data.get("skin_name", "Neon Phantom")).strip()
    rarity = str(data.get("rarity", "rare")).strip().lower()
    skin_type = str(data.get("skin_type", "weapon")).strip().lower()
    royalty_bps = int(data.get("royalty_bps", 500))

    if not wallet:
        return {"error": "wallet is required"}, 400
    if royalty_bps < 0 or royalty_bps > 1_000:
        return {"error": "royalty_bps must be between 0 and 1000"}, 400

    # Optional on-chain fields from SDK
    asa_id = data.get("asa_id")
    txn_id = data.get("txn_id")

    asset = store.mint(wallet=wallet, skin_name=skin_name, rarity=rarity, royalty_bps=royalty_bps, skin_type=skin_type)

    if asa_id:
        asset["id"] = int(asa_id)
        asset["asa_id"] = int(asa_id)
        # Re-map in store to ensure primary key lookup matches the SC ID
        del store.assets[store.next_asset_id - 1]
        store.assets[int(asa_id)] = asset
        store.next_asset_id = max(store.next_asset_id, int(asa_id) + 1)
        
    if txn_id:
        asset["txn_id"] = str(txn_id)

    return {"asset": asset, "mode": "testnet" if algorand.enabled else "mock"}, 201


@app.get("/assets/<wallet>")
def assets(wallet: str) -> tuple[dict, int]:
    return {"wallet": wallet, "assets": store.assets_by_owner(wallet)}, 200


@app.post("/list")
def list_asset() -> tuple[dict, int]:
    data = request.get_json(silent=True) or {}
    wallet = str(data.get("wallet", "")).strip()
    asset_id = int(data.get("asset_id", 0))
    price = int(data.get("price", 0))

    if not wallet:
        return {"error": "wallet is required"}, 400
    try:
        asset = store.list_asset(wallet=wallet, asset_id=asset_id, price=price)
        return {"asset": asset}, 200
    except PermissionError as exc:
        return {"error": str(exc)}, 403
    except ValueError as exc:
        return {"error": str(exc)}, 400


@app.post("/buy")
def buy() -> tuple[dict, int]:
    data = request.get_json(silent=True) or {}
    buyer_wallet = str(data.get("buyer_wallet", "")).strip()
    asset_id = int(data.get("asset_id", 0))
    txn_id = data.get("txn_id")  # on-chain payment transaction ID

    if not buyer_wallet:
        return {"error": "buyer_wallet is required"}, 400
    try:
        result = store.buy_asset(buyer_wallet=buyer_wallet, asset_id=asset_id)
        # Attach on-chain txn_id to the sale record if provided
        if txn_id and "sale" in result:
            result["sale"]["txn_id"] = str(txn_id)
        return result, 200
    except ValueError as exc:
        return {"error": str(exc)}, 400


@app.get("/marketplace")
def marketplace() -> tuple[dict, int]:
    return {"marketplace": store.marketplace(), "sales": store.sales[-20:]}, 200


@app.post("/cancel")
def cancel() -> tuple[dict, int]:
    data = request.get_json(silent=True) or {}
    wallet = str(data.get("wallet", "")).strip()
    asset_id = int(data.get("asset_id", 0))
    if not wallet:
        return {"error": "wallet is required"}, 400

    try:
        asset = store.cancel_listing(wallet=wallet, asset_id=asset_id)
        return {"asset": asset}, 200
    except PermissionError as exc:
        return {"error": str(exc)}, 403
    except ValueError as exc:
        return {"error": str(exc)}, 400


@app.post("/ai-price")
def ai_price() -> tuple[dict, int]:
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


# ─── Skin Intelligence Engine Endpoint ──────────────────────────────────────

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
    """Simulate Minecraft skin bridge — returns NFT skins mapped to Minecraft format."""
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
    """
    Real Steam Bridge: Fetches linked SteamID for the wallet.
    Falls back to a demo ID if no link exists.
    """
    # Prefer steam_id from query param if provided (linked via frontend)
    steam_id = request.args.get("steam_id", "76561198715018502") 
    
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
    """
    Fetch real-time skin price from Skinport.

    Query: ?name=AK-47%20|%20Redline%20(Field-Tested)&currency=USD

    Returns Skinport min_price and suggested_price in USD.
    Falls back gracefully if Skinport is unavailable.
    """
    name = request.args.get("name", "").strip()
    currency = request.args.get("currency", "USD")
    if not name:
        return {"error": "name query param required"}, 400
    result = get_skinport_price(name, currency)
    return jsonify(result), 200


@app.post("/prices/bulk")
@limiter.limit("10 per minute")
def bulk_prices() -> tuple[dict, int]:
    """
    Fetch prices for multiple skins at once.

    Body: { "names": ["AK-47 | Redline (Field-Tested)", ...] }
    Returns list of price objects in same order.
    """
    data = request.get_json(silent=True) or {}
    names = data.get("names", [])
    if not names or not isinstance(names, list):
        return {"error": "names must be a non-empty list"}, 400
    if len(names) > 50:
        return {"error": "Max 50 items per bulk request"}, 400
    return jsonify({"prices": get_bulk_prices(names)}), 200


# ─── Asset History Endpoint ──────────────────────────────────────────────────


@app.get("/history/<int:asset_id>")
def get_history(asset_id: int) -> tuple[dict, int]:
    """
    Return on-chain provenance history for an asset.

    Reconstructed from the sales log and asset record in the store.
    In production this would query the blockchain indexer.
    """
    asset = store.assets.get(asset_id)
    if asset is None:
        return {"error": "Asset not found"}, 404

    history = []
    # Mint event
    history.append({
        "type": "mint",
        "by": asset["creator"],
        "timestamp": asset["created_at"],
        "txn_id": asset.get("txn_id"),
    })
    # Sales events from store
    for sale in store.sales:
        if sale["asset_id"] == asset_id:
            history.append({
                "type": "buy",
                "by": sale["buyer"],
                "from": sale["seller"],
                "price": sale["price"],
                "royalty_paid": sale["royalty_paid"],
                "timestamp": sale["sold_at"],
                "txn_id": sale.get("txn_id"),
            })
    # Current listing
    if asset.get("listed"):
        history.append({
            "type": "list",
            "by": asset["owner"],
            "price": asset["list_price"],
            "timestamp": asset["created_at"],  # approximate
        })

    return {"asset_id": asset_id, "history": history}, 200


# ─── Steam Inventory Bridge (Real) ──────────────────────────────────────────


@app.get("/steam/inventory/<steam_id>")
@limiter.limit("5 per minute")
def real_steam_inventory(steam_id: str) -> tuple[dict, int]:
    """
    Fetch real Steam CS2 inventory and enrich with Skinport prices.

    Limitations:
    - Profile must be PUBLIC
    - Steam rate-limits IPs heavily (~10-20 req/min)
    - Returns empty list for private inventories (not an error)
    """
    raw_items = fetch_steam_inventory(steam_id)
    enriched = [map_steam_item_to_sdk_asset(item) for item in raw_items]
    return {
        "steam_id": steam_id,
        "item_count": len(enriched),
        "items": enriched,
        "note": "Prices from Skinport public API. Private inventories return empty list.",
    }, 200


# ─── Steam Bot Escrow & Minting (Mock) ────────────────────────────────────

@app.post("/steam/escrow")
def steam_escrow() -> tuple[dict, int]:
    """
    Simulate Steam Bot taking an item into escrow and minting a receipt NFT.
    In production, this would trigger a Trade Offer via steam-tradeoffer-manager,
    wait for acceptance, and then trigger the minting process.
    """
    data = request.get_json(silent=True) or {}
    steam_id = str(data.get("steam_id", "")).strip()
    wallet = str(data.get("wallet", "")).strip()
    item_name = str(data.get("item_name", "CS2 Skin")).strip()
    rarity = str(data.get("rarity", "rare")).strip().lower()

    if not steam_id or not wallet:
        return {"error": "steam_id and wallet are required"}, 400

    # Simulate bot trade offer and escrow success
    # Then mint the asset on the backend store
    asset = store.mint(
        wallet=wallet, 
        skin_name=item_name, 
        rarity=rarity, 
        royalty_bps=500, 
        skin_type="weapon"
    )

    return {
        "status": "success",
        "message": "Item secured in Steam Bot Escrow. Digital receipt minted.",
        "asset": asset,
    }, 200


@app.post("/steam/withdraw")
def steam_withdraw() -> tuple[dict, int]:
    """
    Simulate Burning the NFT and withdrawing the actual Steam item.
    In production, this would burn the ASA/Polygon NFT and instruct the
    Steam Bot to send a Trade Offer to deliver the CS2 skin to the user.
    """
    data = request.get_json(silent=True) or {}
    wallet = str(data.get("wallet", "")).strip()
    steam_id = str(data.get("steam_id", "")).strip()
    asset_id = int(data.get("asset_id", 0))

    if not wallet or not steam_id:
        return {"error": "wallet and steam_id are required"}, 400

    asset = store.assets.get(asset_id)
    if not asset:
        return {"error": "Asset not found"}, 404

    if asset["owner"] != wallet:
        return {"error": "Not the owner"}, 403

    # Simulate Burn (Remove from store)
    del store.assets[asset_id]

    return {
        "status": "success",
        "message": "NFT burned. Trade offer sent via Steam Bot to deliver your item.",
        "asset_id": asset_id,
        "steam_id": steam_id
    }, 200


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
