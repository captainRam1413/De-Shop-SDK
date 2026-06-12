"""
Tests — Database Store
========================
Unit tests for the DatabaseStore (SQLAlchemy-backed persistence).
"""

import pytest
from deshop_backend.db_store import DatabaseStore
from deshop_backend.ai_pricing import AIPricingEngine
from deshop_backend.models import db, Asset, User, Transaction, Listing


@pytest.fixture
def db_store(app, db):
    """Create a DatabaseStore instance with the test app and fresh DB."""
    ai = AIPricingEngine()
    store = DatabaseStore(ai=ai)
    # The db fixture already creates tables; store uses the shared db object
    return store


class TestDatabaseStoreMint:
    """Tests for DatabaseStore.mint()."""

    def test_mint_creates_asset(self, app, db_store, sample_wallet):
        with app.app_context():
            asset = db_store.mint(
                wallet=sample_wallet,
                skin_name="Test Skin",
                rarity="rare",
                royalty_bps=500,
                skin_type="weapon",
            )
            assert asset["name"] == "Test Skin"
            assert asset["owner"] == sample_wallet
            assert asset["rarity"] == "rare"
            assert asset["listed"] is False

    def test_mint_creates_user(self, app, db_store, sample_wallet):
        with app.app_context():
            db_store.mint(
                wallet=sample_wallet,
                skin_name="Test",
                rarity="common",
                royalty_bps=0,
            )
            user = User.query.filter_by(wallet_address=sample_wallet).first()
            assert user is not None

    def test_mint_creates_transaction_record(self, app, db_store, sample_wallet):
        with app.app_context():
            asset = db_store.mint(
                wallet=sample_wallet,
                skin_name="Test",
                rarity="common",
                royalty_bps=0,
            )
            txn = Transaction.query.filter_by(asset_id=asset["id"], txn_type="mint").first()
            assert txn is not None
            assert txn.to_wallet == sample_wallet

    def test_mint_with_asa_id_creates_nft(self, app, db_store, sample_wallet):
        with app.app_context():
            from deshop_backend.models import NFT
            asset = db_store.mint(
                wallet=sample_wallet,
                skin_name="On-Chain Skin",
                rarity="epic",
                royalty_bps=500,
                asa_id=12345,
                txn_id="TXN_ABC",
            )
            nft = NFT.query.filter_by(asset_id=asset["id"]).first()
            assert nft is not None
            assert nft.asa_id == 12345
            assert nft.mint_txn_id == "TXN_ABC"

    def test_mint_includes_suggested_price(self, app, db_store, sample_wallet):
        with app.app_context():
            asset = db_store.mint(
                wallet=sample_wallet,
                skin_name="Neon Phantom",
                rarity="legendary",
                royalty_bps=500,
            )
            assert "suggested_price" in asset
            assert "price" in asset["suggested_price"]
            assert "confidence" in asset["suggested_price"]


class TestDatabaseStoreList:
    """Tests for DatabaseStore.list_asset()."""

    def test_list_asset(self, app, db_store, sample_wallet):
        with app.app_context():
            asset = db_store.mint(wallet=sample_wallet, skin_name="Test", rarity="rare", royalty_bps=500)
            result = db_store.list_asset(wallet=sample_wallet, asset_id=asset["id"], price=1000)
            assert result["listed"] is True
            assert result["list_price"] == 1000

    def test_list_creates_listing_record(self, app, db_store, sample_wallet):
        with app.app_context():
            asset = db_store.mint(wallet=sample_wallet, skin_name="Test", rarity="rare", royalty_bps=500)
            db_store.list_asset(wallet=sample_wallet, asset_id=asset["id"], price=1000)
            listing = Listing.query.filter_by(asset_id=asset["id"], status="open").first()
            assert listing is not None
            assert listing.price == 1000

    def test_list_non_owner_fails(self, app, db_store, sample_wallet, sample_wallet_2):
        with app.app_context():
            asset = db_store.mint(wallet=sample_wallet, skin_name="Test", rarity="rare", royalty_bps=500)
            with pytest.raises(PermissionError):
                db_store.list_asset(wallet=sample_wallet_2, asset_id=asset["id"], price=1000)

    def test_list_nonexistent_fails(self, app, db_store, sample_wallet):
        with app.app_context():
            with pytest.raises(ValueError):
                db_store.list_asset(wallet=sample_wallet, asset_id=9999, price=1000)

    def test_list_zero_price_fails(self, app, db_store, sample_wallet):
        with app.app_context():
            asset = db_store.mint(wallet=sample_wallet, skin_name="Test", rarity="rare", royalty_bps=500)
            with pytest.raises(ValueError):
                db_store.list_asset(wallet=sample_wallet, asset_id=asset["id"], price=0)


class TestDatabaseStoreBuy:
    """Tests for DatabaseStore.buy_asset()."""

    def test_buy_asset(self, app, db_store, sample_wallet, sample_wallet_2):
        with app.app_context():
            asset = db_store.mint(wallet=sample_wallet, skin_name="Test", rarity="rare", royalty_bps=500)
            db_store.list_asset(wallet=sample_wallet, asset_id=asset["id"], price=10000)

            result = db_store.buy_asset(buyer_wallet=sample_wallet_2, asset_id=asset["id"])
            assert result["asset"]["owner"] == sample_wallet_2
            assert result["sale"]["price"] == 10000
            assert result["sale"]["royalty_paid"] == 500  # 5% of 10000

    def test_buy_own_asset_fails(self, app, db_store, sample_wallet):
        with app.app_context():
            asset = db_store.mint(wallet=sample_wallet, skin_name="Test", rarity="rare", royalty_bps=500)
            db_store.list_asset(wallet=sample_wallet, asset_id=asset["id"], price=10000)
            with pytest.raises(ValueError, match="already owns"):
                db_store.buy_asset(buyer_wallet=sample_wallet, asset_id=asset["id"])

    def test_buy_unlisted_fails(self, app, db_store, sample_wallet, sample_wallet_2):
        with app.app_context():
            asset = db_store.mint(wallet=sample_wallet, skin_name="Test", rarity="rare", royalty_bps=500)
            with pytest.raises(ValueError, match="not listed"):
                db_store.buy_asset(buyer_wallet=sample_wallet_2, asset_id=asset["id"])

    def test_buy_closes_listing(self, app, db_store, sample_wallet, sample_wallet_2):
        with app.app_context():
            asset = db_store.mint(wallet=sample_wallet, skin_name="Test", rarity="rare", royalty_bps=500)
            db_store.list_asset(wallet=sample_wallet, asset_id=asset["id"], price=10000)
            db_store.buy_asset(buyer_wallet=sample_wallet_2, asset_id=asset["id"])

            listing = Listing.query.filter_by(asset_id=asset["id"]).first()
            assert listing.status == "sold"
            assert listing.buyer_wallet == sample_wallet_2


class TestDatabaseStoreCancel:
    """Tests for DatabaseStore.cancel_listing()."""

    def test_cancel_listing(self, app, db_store, sample_wallet):
        with app.app_context():
            asset = db_store.mint(wallet=sample_wallet, skin_name="Test", rarity="rare", royalty_bps=500)
            db_store.list_asset(wallet=sample_wallet, asset_id=asset["id"], price=10000)

            result = db_store.cancel_listing(wallet=sample_wallet, asset_id=asset["id"])
            assert result["listed"] is False
            assert result["list_price"] is None

    def test_cancel_non_owner_fails(self, app, db_store, sample_wallet, sample_wallet_2):
        with app.app_context():
            asset = db_store.mint(wallet=sample_wallet, skin_name="Test", rarity="rare", royalty_bps=500)
            db_store.list_asset(wallet=sample_wallet, asset_id=asset["id"], price=10000)
            with pytest.raises(PermissionError):
                db_store.cancel_listing(wallet=sample_wallet_2, asset_id=asset["id"])


class TestDatabaseStoreAssets:
    """Tests for DatabaseStore asset queries."""

    def test_assets_by_owner(self, app, db_store, sample_wallet):
        with app.app_context():
            db_store.mint(wallet=sample_wallet, skin_name="Skin 1", rarity="common", royalty_bps=0)
            db_store.mint(wallet=sample_wallet, skin_name="Skin 2", rarity="rare", royalty_bps=500)
            assets = db_store.assets_by_owner(sample_wallet)
            assert len(assets) == 2

    def test_marketplace_only_listed(self, app, db_store, sample_wallet):
        with app.app_context():
            db_store.mint(wallet=sample_wallet, skin_name="Listed", rarity="rare", royalty_bps=500)
            asset2 = db_store.mint(wallet=sample_wallet, skin_name="For Sale", rarity="epic", royalty_bps=500)
            db_store.list_asset(wallet=sample_wallet, asset_id=asset2["id"], price=10000)

            marketplace = db_store.marketplace()
            assert len(marketplace) == 1
            assert marketplace[0]["name"] == "For Sale"

    def test_sales_history(self, app, db_store, sample_wallet, sample_wallet_2):
        with app.app_context():
            asset = db_store.mint(wallet=sample_wallet, skin_name="Sale Test", rarity="rare", royalty_bps=500)
            db_store.list_asset(wallet=sample_wallet, asset_id=asset["id"], price=10000)
            db_store.buy_asset(buyer_wallet=sample_wallet_2, asset_id=asset["id"])

            sales = db_store.sales
            assert len(sales) >= 1
            assert sales[0]["asset_id"] == asset["id"]
