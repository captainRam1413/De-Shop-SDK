"""
De-Shop SDK — Database-Backed Store
=====================================
Production persistence layer using SQLAlchemy.
Replaces InMemoryStore with full database-backed operations.

Features:
  - ACID transactions with row-level locking
  - Automatic user upsert on mint/list/buy
  - Relationship-aware queries (assets → listings → transactions)
  - Provenance tracking via Transaction records
  - Race-condition-safe buy with SELECT FOR UPDATE
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from flask_sqlalchemy import SQLAlchemy

from .models import db, User, Asset, NFT, Transaction, Listing
from .ai_pricing import AIPricingEngine


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _upsert_user(wallet: str, steam_id: str | None = None) -> User:
    """Get or create a User row for the given wallet address."""
    user = User.query.filter_by(wallet_address=wallet).first()
    if user is None:
        user = User(wallet_address=wallet, steam_id=steam_id)
        db.session.add(user)
        db.session.flush()  # ensure user.id is available
    elif steam_id and not user.steam_id:
        user.steam_id = steam_id
    return user


class DatabaseStore:
    """
    Production store backed by SQLAlchemy + SQLite/PostgreSQL.

    Drop-in replacement for InMemoryStore. All mutating operations
    are wrapped in database transactions with appropriate locking.
    """

    def __init__(self, ai: AIPricingEngine):
        self.ai = ai

    def init_app(self, app) -> None:
        """Initialize the database within the Flask app context."""
        db.init_app(app)
        with app.app_context():
            db.create_all()

    # ─── Mint ──────────────────────────────────────────────────────────────────

    def mint(
        self,
        wallet: str,
        skin_name: str,
        rarity: str,
        royalty_bps: int,
        skin_type: str = "weapon",
        asa_id: int | None = None,
        txn_id: str | None = None,
        steam_id: str | None = None,
    ) -> dict[str, Any]:
        """Mint a new NFT skin asset. Creates user if not exists."""
        _upsert_user(wallet, steam_id=steam_id)

        suggestion = self.ai.suggest_price(skin_name=skin_name, rarity=rarity)

        asset = Asset(
            asa_id=asa_id,
            name=skin_name,
            rarity=rarity,
            skin_type=skin_type,
            owner_wallet=wallet,
            creator_wallet=wallet,
            royalty_bps=royalty_bps,
            listed=False,
            list_price=None,
        )
        asset.suggested_price = {
            "price": suggestion.price,
            "confidence": suggestion.confidence,
            "trend": suggestion.trend,
            "rarity_score": suggestion.rarity_score,
            "demand_score": suggestion.demand_score,
        }
        db.session.add(asset)
        db.session.flush()  # get asset.id

        # Create on-chain NFT record if ASA ID provided
        if asa_id:
            nft = NFT(
                asset_id=asset.id,
                asa_id=asa_id,
                mint_txn_id=txn_id,
                chain="algorand-testnet",
            )
            db.session.add(nft)

        # Record the mint transaction
        txn = Transaction(
            asset_id=asset.id,
            txn_type="mint",
            txn_id=txn_id,
            to_wallet=wallet,
            amount=0,
        )
        db.session.add(txn)
        db.session.commit()

        return asset.to_dict()

    # ─── Read ──────────────────────────────────────────────────────────────────

    def assets_by_owner(self, wallet: str) -> list[dict[str, Any]]:
        """Return all assets owned by the given wallet."""
        assets = Asset.query.filter_by(owner_wallet=wallet).all()
        return [a.to_dict() for a in assets]

    def marketplace(self) -> list[dict[str, Any]]:
        """Return all currently listed assets."""
        assets = Asset.query.filter_by(listed=True).all()
        return [a.to_dict() for a in assets]

    # ─── List ──────────────────────────────────────────────────────────────────

    def list_asset(self, wallet: str, asset_id: int, price: int) -> dict[str, Any]:
        """List an asset for sale. Only the owner can list."""
        if price <= 0:
            raise ValueError("Price must be > 0")

        asset = Asset.query.with_for_update().filter_by(id=asset_id).first()
        if asset is None:
            raise ValueError("Asset not found")
        if asset.owner_wallet != wallet:
            raise PermissionError("Only owner can list")

        asset.listed = True
        asset.list_price = price

        # Create a listing record
        listing = Listing(
            asset_id=asset.id,
            seller_wallet=wallet,
            price=price,
            status="open",
        )
        db.session.add(listing)

        # Record transaction
        txn = Transaction(
            asset_id=asset.id,
            txn_type="list",
            from_wallet=wallet,
            amount=price,
        )
        db.session.add(txn)
        db.session.commit()

        return asset.to_dict()

    # ─── Cancel ────────────────────────────────────────────────────────────────

    def cancel_listing(self, wallet: str, asset_id: int) -> dict[str, Any]:
        """Cancel an active listing. Only the owner can cancel."""
        asset = Asset.query.with_for_update().filter_by(id=asset_id).first()
        if asset is None:
            raise ValueError("Asset not found")
        if asset.owner_wallet != wallet:
            raise PermissionError("Only owner can cancel listing")
        if not asset.listed:
            raise ValueError("Asset is not listed")

        asset.listed = False
        asset.list_price = None

        # Close any open listings
        open_listings = Listing.query.filter_by(
            asset_id=asset.id, status="open"
        ).all()
        for lst in open_listings:
            lst.status = "cancelled"
            lst.closed_at = datetime.now(timezone.utc)

        # Record transaction
        txn = Transaction(
            asset_id=asset.id,
            txn_type="cancel",
            from_wallet=wallet,
        )
        db.session.add(txn)
        db.session.commit()

        return asset.to_dict()

    # ─── Buy ───────────────────────────────────────────────────────────────────

    def buy_asset(self, buyer_wallet: str, asset_id: int) -> dict[str, Any]:
        """
        Purchase a listed asset. Uses SELECT FOR UPDATE to prevent
        race conditions (double-spending on the same listing).
        """
        _upsert_user(buyer_wallet)

        # Lock the asset row to prevent concurrent buys
        asset = Asset.query.with_for_update().filter_by(id=asset_id).first()
        if asset is None:
            raise ValueError("Asset not found")
        if not asset.listed or asset.list_price is None:
            raise ValueError("Asset is not listed")
        if asset.owner_wallet == buyer_wallet:
            raise ValueError("Buyer already owns this asset")

        price = asset.list_price
        seller_wallet = asset.owner_wallet
        royalty = (price * asset.royalty_bps) // 10_000
        seller_proceeds = price - royalty

        # Transfer ownership
        asset.owner_wallet = buyer_wallet
        asset.listed = False
        asset.list_price = None

        # Close the listing
        listing = Listing.query.filter_by(
            asset_id=asset.id, status="open"
        ).first()
        if listing:
            listing.status = "sold"
            listing.buyer_wallet = buyer_wallet
            listing.closed_at = datetime.now(timezone.utc)

        # Record the buy transaction
        txn = Transaction(
            asset_id=asset.id,
            txn_type="buy",
            from_wallet=seller_wallet,
            to_wallet=buyer_wallet,
            amount=price,
            royalty_paid=royalty,
            seller_proceeds=seller_proceeds,
        )
        db.session.add(txn)
        db.session.commit()

        sale = {
            "asset_id": asset_id,
            "price": price,
            "seller": seller_wallet,
            "buyer": buyer_wallet,
            "creator": asset.creator_wallet,
            "royalty_paid": royalty,
            "seller_proceeds": seller_proceeds,
            "sold_at": _now_iso(),
        }
        return {"asset": asset.to_dict(), "sale": sale}

    # ─── Transfer ──────────────────────────────────────────────────────────────

    def transfer_asset(
        self, from_wallet: str, to_wallet: str, asset_id: int
    ) -> dict[str, Any]:
        """Transfer an asset directly (gift). Only owner can transfer."""
        _upsert_user(to_wallet)

        asset = Asset.query.with_for_update().filter_by(id=asset_id).first()
        if asset is None:
            raise ValueError("Asset not found")
        if asset.owner_wallet != from_wallet:
            raise PermissionError("Only owner can transfer")
        if asset.listed:
            raise ValueError("Cannot transfer a listed asset — cancel listing first")

        asset.owner_wallet = to_wallet

        txn = Transaction(
            asset_id=asset.id,
            txn_type="transfer",
            from_wallet=from_wallet,
            to_wallet=to_wallet,
        )
        db.session.add(txn)
        db.session.commit()

        return asset.to_dict()

    # ─── Asset lookup ──────────────────────────────────────────────────────────

    @property
    def assets(self) -> dict[int, dict[str, Any]]:
        """Compatibility accessor — returns all assets as a dict keyed by id."""
        all_assets = Asset.query.all()
        return {a.id: a.to_dict() for a in all_assets}

    def get_asset(self, asset_id: int) -> dict[str, Any] | None:
        """Get a single asset by ID."""
        asset = Asset.query.get(asset_id)
        return asset.to_dict() if asset else None

    # ─── Sales history ─────────────────────────────────────────────────────────

    @property
    def sales(self) -> list[dict[str, Any]]:
        """Return recent sales records from transactions."""
        txns = (
            Transaction.query.filter_by(txn_type="buy")
            .order_by(Transaction.created_at.desc())
            .limit(50)
            .all()
        )
        return [
            {
                "asset_id": t.asset_id,
                "price": t.amount,
                "seller": t.from_wallet,
                "buyer": t.to_wallet,
                "royalty_paid": t.royalty_paid,
                "seller_proceeds": t.seller_proceeds,
                "sold_at": t.created_at.isoformat() if t.created_at else None,
                "txn_id": t.txn_id,
            }
            for t in txns
        ]

    # ─── Next asset ID (compatibility) ────────────────────────────────────────

    @property
    def next_asset_id(self) -> int:
        """Return the next auto-increment ID (for compatibility with InMemoryStore)."""
        max_id = db.session.query(db.func.max(Asset.id)).scalar()
        return (max_id or 0) + 1
