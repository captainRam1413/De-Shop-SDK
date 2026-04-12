from __future__ import annotations

from flask import Flask, jsonify, request
from flask_cors import CORS

from deshop_backend.ai_pricing import AIPricingEngine
from deshop_backend.blockchain import AlgorandAdapter
from deshop_backend.store import InMemoryStore

app = Flask(__name__)
CORS(app)

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
    royalty_bps = int(data.get("royalty_bps", 500))

    if not wallet:
        return {"error": "wallet is required"}, 400
    if royalty_bps < 0 or royalty_bps > 1_000:
        return {"error": "royalty_bps must be between 0 and 1000"}, 400

    # Optional on-chain fields from SDK
    asa_id = data.get("asa_id")
    txn_id = data.get("txn_id")

    asset = store.mint(wallet=wallet, skin_name=skin_name, rarity=rarity, royalty_bps=royalty_bps)

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
            "id": asset["id"],
            "name": asset["name"],
            "rarity": rarity,
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
def bridge_steam(wallet: str) -> tuple[dict, int]:
    """Simulate Steam trade bot — returns NFT skins as tradeable Steam items."""
    player_assets = store.assets_by_owner(wallet)
    skins = []
    for asset in player_assets:
        rarity = asset.get("rarity", "common")
        skins.append({
            "id": asset["id"],
            "name": asset["name"],
            "rarity": rarity,
            "image_url": SKIN_IMAGES.get(rarity, SKIN_IMAGES["common"]),
            "applied": False,
            "steam_item_id": f"deshop_item_{asset['id']:06d}",
            "tradeable": not asset.get("listed", False),
            "market_value_usd": round(
                (asset.get("list_price") or 0) * 0.001, 2
            ),
        })

    return {
        "platform": "Steam Trade Bot (Simulated)",
        "wallet": wallet,
        "skins": skins,
        "status": "connected" if skins else "no_inventory",
        "bridge_version": "1.0.0-mock",
        "trade_url": "https://steamcommunity.com/tradeoffer/fake/123",
    }, 200


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
