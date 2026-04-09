import json
import os
import uuid

from flask import Flask, jsonify, request
from flask_cors import CORS

try:
    from algosdk import mnemonic, transaction
    from algosdk.v2client import algod
except ImportError:  # Allows running in mock-only mode without Algorand deps installed
    mnemonic = None
    transaction = None
    algod = None


app = Flask(__name__)
CORS(app)


DEFAULT_ASSETS = [
    {
        "id": "asset-ember-01",
        "name": "Ember Drake Blade",
        "image": "⚔️",
        "rarity": "Legendary",
        "price": 120,
        "currency": "ALGO",
        "owner": "marketplace",
        "listed": True,
        "attributes": {"element": "Fire", "attack": 150},
    },
    {
        "id": "asset-veil-02",
        "name": "Spectral Veil",
        "image": "🛡️",
        "rarity": "Epic",
        "price": 62,
        "currency": "ALGO",
        "owner": "marketplace",
        "listed": True,
        "attributes": {"defense": 90, "origin": "Nightfall"},
    },
    {
        "id": "asset-echo-03",
        "name": "Echostep Boots",
        "image": "👢",
        "rarity": "Rare",
        "price": 28,
        "currency": "ALGO",
        "owner": "demo-wallet",
        "listed": False,
        "attributes": {"speed": "+18%", "class": "Rogue"},
    },
]

ASSETS = list(DEFAULT_ASSETS)


def _get_algod_client():
    if algod is None:
        return None
    address = os.getenv("ALGOD_ADDRESS", "https://testnet-api.algonode.cloud")
    token = os.getenv("ALGOD_TOKEN", "")
    return algod.AlgodClient(token, address)


def _wait_for_confirmation(client, txid, timeout=12):
    if client is None:
        return None
    current_round = client.status().get("last-round", 0) + 1
    for _ in range(timeout):
        pending = client.pending_transaction_info(txid)
        if pending.get("confirmed-round", 0) > 0:
            return pending
        client.status_after_block(current_round)
        current_round += 1
    raise RuntimeError("Transaction confirmation timed out")


def _try_mint_on_algorand(payload):
    if mnemonic is None or transaction is None:
        return None, "Algorand SDK not available"

    creator_mnemonic = os.getenv("CREATOR_MNEMONIC")
    if not creator_mnemonic:
        return None, "CREATOR_MNEMONIC not configured"

    client = _get_algod_client()
    if client is None:
        return None, "Algod client not available"

    try:
        creator_key = mnemonic.to_private_key(creator_mnemonic)
        creator_address = mnemonic.to_public_key(creator_mnemonic)
        params = client.suggested_params()

        note_bytes = json.dumps(payload.get("attributes", {})).encode("utf-8")
        txn = transaction.AssetCreateTxn(
            sender=creator_address,
            sp=params,
            total=1,
            decimals=0,
            default_frozen=False,
            unit_name=payload.get("unit_name", "DSHOP"),
            asset_name=payload["name"],
            url=payload.get("image"),
            manager=creator_address,
            reserve=creator_address,
            freeze=creator_address,
            clawback=creator_address,
            note=note_bytes,
        )
        signed_txn = txn.sign(creator_key)
        txid = client.send_transaction(signed_txn)
        confirmed = _wait_for_confirmation(client, txid)
        return confirmed.get("asset-index"), None
    except Exception as exc:  # pragma: no cover - defensive for API demo
        app.logger.exception("Algorand mint failed")
        return None, str(exc)


@app.get("/assets")
def list_assets():
    owner = request.args.get("owner")
    if owner:
        filtered_assets = [asset for asset in ASSETS if asset.get("owner") == owner]
        return jsonify({"assets": filtered_assets})
    return jsonify({"assets": ASSETS})


@app.post("/mint")
def mint_asset():
    payload = request.get_json(silent=True) or {}
    name = payload.get("name")
    image = payload.get("image")
    if not name or not image:
        return jsonify({"error": "name and image are required"}), 400

    owner = payload.get("owner") or "demo-wallet"
    asset = {
        "id": f"asset-{uuid.uuid4().hex[:8]}",
        "name": name,
        "image": image,
        "rarity": payload.get("rarity", "Rare"),
        "price": payload.get("price", 40),
        "currency": payload.get("currency", "ALGO"),
        "owner": owner,
        "listed": payload.get("listed", False),
        "attributes": payload.get("attributes", {}),
    }

    asset_id, error = _try_mint_on_algorand(payload)
    asset["mint_mode"] = "algorand" if asset_id else "mock"
    asset["asset_id"] = asset_id
    if error and asset_id is None:
        asset["mint_error"] = error

    ASSETS.append(asset)
    return jsonify(asset), 201


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=debug_mode)
