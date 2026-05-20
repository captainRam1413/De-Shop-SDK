"""
De-Shop SDK — SQLAlchemy Database Models
==========================================
Persistent storage layer replacing InMemoryStore for production.

Tables:
  - users         (Steam + wallet linked accounts)
  - assets        (minted NFT skins)
  - nfts          (on-chain ASA records)
  - transactions  (all on-chain TXs)
  - listings      (marketplace listings, open or closed)

Usage:
  from deshop_backend.models import db, User, Asset, NFT, Transaction, Listing
  db.init_app(app)
  with app.app_context():
      db.create_all()
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ─── User ─────────────────────────────────────────────────────────────────────

class User(db.Model):  # type: ignore[name-defined]
    """Represents a player account, linked to Steam + wallet."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    steam_id = db.Column(db.String(64), unique=True, nullable=True, index=True)
    steam_username = db.Column(db.String(128), nullable=True)
    steam_avatar = db.Column(db.String(512), nullable=True)
    wallet_address = db.Column(db.String(128), unique=True, nullable=True, index=True)
    api_key = db.Column(db.String(64), unique=True, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=_now)
    last_login = db.Column(db.DateTime(timezone=True), onupdate=_now)

    assets = db.relationship("Asset", back_populates="owner_user", foreign_keys="Asset.owner_wallet", lazy="dynamic")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "steam_id": self.steam_id,
            "steam_username": self.steam_username,
            "steam_avatar": self.steam_avatar,
            "wallet_address": self.wallet_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ─── Asset ────────────────────────────────────────────────────────────────────

class Asset(db.Model):  # type: ignore[name-defined]
    """An NFT skin asset (may or may not be on-chain yet)."""

    __tablename__ = "assets"

    id = db.Column(db.Integer, primary_key=True)
    asa_id = db.Column(db.BigInteger, unique=True, nullable=True, index=True)
    name = db.Column(db.String(128), nullable=False)
    rarity = db.Column(db.String(32), nullable=False, default="common")
    skin_type = db.Column(db.String(32), nullable=False, default="weapon")  # weapon | character | accessory
    owner_wallet = db.Column(db.String(128), db.ForeignKey("users.wallet_address"), nullable=False, index=True)
    creator_wallet = db.Column(db.String(128), nullable=False)
    royalty_bps = db.Column(db.Integer, nullable=False, default=500)
    ipfs_uri = db.Column(db.String(512), nullable=True)
    image_url = db.Column(db.String(512), nullable=True)
    listed = db.Column(db.Boolean, default=False, nullable=False)
    list_price = db.Column(db.Integer, nullable=True)  # μALGO
    created_at = db.Column(db.DateTime(timezone=True), default=_now)
    _suggested_price_json = db.Column("suggested_price", db.Text, nullable=True)

    owner_user = db.relationship("User", back_populates="assets", foreign_keys=[owner_wallet])
    nft = db.relationship("NFT", back_populates="asset", uselist=False, cascade="all, delete-orphan")
    transactions = db.relationship("Transaction", back_populates="asset", lazy="dynamic")
    listings = db.relationship("Listing", back_populates="asset", lazy="dynamic")

    @property
    def suggested_price(self) -> dict[str, Any]:
        if self._suggested_price_json:
            return json.loads(self._suggested_price_json)
        return {"price": 50, "confidence": 60, "trend": "stable", "rarity_score": 5.0, "demand_score": 0.5}

    @suggested_price.setter
    def suggested_price(self, value: dict[str, Any]) -> None:
        self._suggested_price_json = json.dumps(value)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "asa_id": self.asa_id,
            "name": self.name,
            "rarity": self.rarity,
            "metadata": {
                "skin_name": self.name,
                "rarity": self.rarity,
                "skin_type": self.skin_type,
                "ipfs_uri": self.ipfs_uri or f"ipfs://deshop/{self.id:04d}-{self.name.lower().replace(' ','-')}",
                "image_url": self.image_url,
            },
            "owner": self.owner_wallet,
            "creator": self.creator_wallet,
            "royalty_bps": self.royalty_bps,
            "listed": self.listed,
            "list_price": self.list_price,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "suggested_price": self.suggested_price,
        }


# ─── NFT ──────────────────────────────────────────────────────────────────────

class NFT(db.Model):  # type: ignore[name-defined]
    """On-chain ASA record — binds an Asset to a specific blockchain TX."""

    __tablename__ = "nfts"

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey("assets.id"), unique=True, nullable=False)
    asa_id = db.Column(db.BigInteger, unique=True, nullable=False, index=True)
    mint_txn_id = db.Column(db.String(128), nullable=True)
    chain = db.Column(db.String(32), default="algorand-testnet")
    contract_app_id = db.Column(db.BigInteger, nullable=True)
    metadata_hash = db.Column(db.String(128), nullable=True)
    minted_at = db.Column(db.DateTime(timezone=True), default=_now)

    asset = db.relationship("Asset", back_populates="nft")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "asa_id": self.asa_id,
            "mint_txn_id": self.mint_txn_id,
            "chain": self.chain,
            "minted_at": self.minted_at.isoformat() if self.minted_at else None,
        }


# ─── Transaction ──────────────────────────────────────────────────────────────

class Transaction(db.Model):  # type: ignore[name-defined]
    """All on-chain and off-chain transactions (mint, list, buy, transfer)."""

    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey("assets.id"), nullable=False, index=True)
    txn_type = db.Column(db.String(32), nullable=False)  # mint | list | buy | cancel | transfer
    txn_id = db.Column(db.String(128), nullable=True)     # on-chain TX ID
    from_wallet = db.Column(db.String(128), nullable=True)
    to_wallet = db.Column(db.String(128), nullable=True)
    amount = db.Column(db.Integer, nullable=True)         # μALGO
    royalty_paid = db.Column(db.Integer, nullable=True)
    seller_proceeds = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=_now)

    asset = db.relationship("Asset", back_populates="transactions")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "type": self.txn_type,
            "txn_id": self.txn_id,
            "from": self.from_wallet,
            "to": self.to_wallet,
            "amount": self.amount,
            "royalty_paid": self.royalty_paid,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ─── Listing ──────────────────────────────────────────────────────────────────

class Listing(db.Model):  # type: ignore[name-defined]
    """Marketplace listing record — open or closed."""

    __tablename__ = "listings"

    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey("assets.id"), nullable=False, index=True)
    seller_wallet = db.Column(db.String(128), nullable=False)
    buyer_wallet = db.Column(db.String(128), nullable=True)
    price = db.Column(db.Integer, nullable=False)  # μALGO
    status = db.Column(db.String(16), default="open")  # open | sold | cancelled
    listed_at = db.Column(db.DateTime(timezone=True), default=_now)
    closed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    sale_txn_id = db.Column(db.String(128), nullable=True)

    asset = db.relationship("Asset", back_populates="listings")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "seller": self.seller_wallet,
            "buyer": self.buyer_wallet,
            "price": self.price,
            "status": self.status,
            "listed_at": self.listed_at.isoformat() if self.listed_at else None,
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
            "sale_txn_id": self.sale_txn_id,
        }
