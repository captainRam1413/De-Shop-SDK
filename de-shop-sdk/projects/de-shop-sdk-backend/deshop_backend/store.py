from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from .ai_pricing import AIPricingEngine


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class InMemoryStore:
    ai: AIPricingEngine
    next_asset_id: int = 1
    assets: dict[int, dict[str, Any]] = field(default_factory=dict)
    sales: list[dict[str, Any]] = field(default_factory=list)

    def mint(self, wallet: str, skin_name: str, rarity: str, royalty_bps: int) -> dict[str, Any]:
        suggestion = self.ai.suggest_price(skin_name=skin_name, rarity=rarity)
        asset_id = self.next_asset_id
        self.next_asset_id += 1

        asset = {
            "id": asset_id,
            "name": skin_name,
            "rarity": rarity,
            "metadata": {
                "skin_name": skin_name,
                "rarity": rarity,
                "ipfs_uri": f"ipfs://mock/{asset_id:04d}-{skin_name.replace(' ', '-').lower()}",
            },
            "owner": wallet,
            "creator": wallet,
            "royalty_bps": royalty_bps,
            "listed": False,
            "list_price": None,
            "created_at": now_iso(),
            "suggested_price": {
                "price": suggestion.price,
                "confidence": suggestion.confidence,
                "trend": suggestion.trend,
                "rarity_score": suggestion.rarity_score,
                "demand_score": suggestion.demand_score,
            },
        }
        self.assets[asset_id] = asset
        return asset

    def assets_by_owner(self, wallet: str) -> list[dict[str, Any]]:
        return [asset for asset in self.assets.values() if asset["owner"] == wallet]

    def list_asset(self, wallet: str, asset_id: int, price: int) -> dict[str, Any]:
        asset = self.assets.get(asset_id)
        if asset is None:
            raise ValueError("Asset not found")
        if asset["owner"] != wallet:
            raise PermissionError("Only owner can list")
        if price <= 0:
            raise ValueError("Price must be > 0")
        asset["listed"] = True
        asset["list_price"] = price
        return asset

    def cancel_listing(self, wallet: str, asset_id: int) -> dict[str, Any]:
        asset = self.assets.get(asset_id)
        if asset is None:
            raise ValueError("Asset not found")
        if asset["owner"] != wallet:
            raise PermissionError("Only owner can cancel listing")
        asset["listed"] = False
        asset["list_price"] = None
        return asset

    def buy_asset(self, buyer_wallet: str, asset_id: int) -> dict[str, Any]:
        asset = self.assets.get(asset_id)
        if asset is None:
            raise ValueError("Asset not found")
        if not asset["listed"] or asset["list_price"] is None:
            raise ValueError("Asset is not listed")
        if asset["owner"] == buyer_wallet:
            raise ValueError("Buyer already owns this asset")

        price = asset["list_price"]
        seller = asset["owner"]
        royalty = (price * asset["royalty_bps"]) // 10_000
        seller_proceeds = price - royalty

        sale = {
            "asset_id": asset_id,
            "price": price,
            "seller": seller,
            "buyer": buyer_wallet,
            "creator": asset["creator"],
            "royalty_paid": royalty,
            "seller_proceeds": seller_proceeds,
            "sold_at": now_iso(),
        }
        self.sales.append(sale)

        asset["owner"] = buyer_wallet
        asset["listed"] = False
        asset["list_price"] = None
        return {"asset": asset, "sale": sale}

    def marketplace(self) -> list[dict[str, Any]]:
        return [asset for asset in self.assets.values() if asset["listed"]]
