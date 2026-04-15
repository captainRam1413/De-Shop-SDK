from algopy import ARC4Contract, BoxMap, Global, Txn, UInt64, arc4, gtxn, itxn, Asset

class ListingRecord(arc4.Struct):
    seller: arc4.Address
    price: arc4.UInt64
    creator: arc4.Address
    royalty_bps: arc4.UInt64

class Deshopsdk(ARC4Contract):
    def __init__(self) -> None:
        self.listings = BoxMap(UInt64, ListingRecord, key_prefix=b"list_")

    @arc4.abimethod
    def setupAsset(self, asset: Asset, mbr_pay: gtxn.PaymentTransaction) -> None:
        # Contract needs to opt-in to the asset. Requires 100,000 ALGO for MBR logic.
        assert mbr_pay.receiver == Global.current_application_address, "pay exact mbr"
        assert mbr_pay.amount == UInt64(100_000), "must pay 0.1 ALGO for ASA MBR"
        itxn.AssetTransfer(
            xfer_asset=asset,
            asset_receiver=Global.current_application_address,
            asset_amount=0,
            fee=0
        ).submit()

    @arc4.abimethod
    def listAsset(self, axfer: gtxn.AssetTransferTransaction, price: arc4.UInt64, creator: arc4.Address, royalty_bps: arc4.UInt64) -> None:
        assert axfer.asset_receiver == Global.current_application_address, "axfer not to contract"
        assert axfer.asset_amount == UInt64(1), "must transfer 1 asset"
        assert axfer.sender == Txn.sender, "must be sender"
        assert price.native > 0, "price > 0"
        
        asset_id = axfer.xfer_asset.id
        assert asset_id not in self.listings, "already listed"
        
        self.listings[asset_id] = ListingRecord(
            arc4.Address(Txn.sender), 
            price, 
            creator, 
            royalty_bps
        )

    @arc4.abimethod
    def buyAsset(self, asset: Asset, payment: gtxn.PaymentTransaction) -> None:
        asset_id = asset.id
        assert asset_id in self.listings, "not listed"
        
        listing = self.listings[asset_id].copy()
        price = listing.price.native
        seller = listing.seller.native
        creator = listing.creator.native
        royalty_bps = listing.royalty_bps.native
        
        assert payment.receiver == Global.current_application_address, "pay contract"
        assert payment.amount >= price, "insufficient payment"
        assert payment.sender == Txn.sender, "sender mismatch"
        
        royalty = (price * royalty_bps) // UInt64(10_000)
        seller_amount = price - royalty
        
        if seller_amount > 0:
            itxn.Payment(receiver=seller, amount=seller_amount, fee=0).submit()
        if royalty > 0:
            itxn.Payment(receiver=creator, amount=royalty, fee=0).submit()
            
        itxn.AssetTransfer(
            xfer_asset=asset,
            asset_receiver=Txn.sender,
            asset_amount=1,
            asset_close_to=seller,
            fee=0
        ).submit()
        
        del self.listings[asset_id]

    @arc4.abimethod
    def cancelListing(self, asset: Asset) -> None:
        asset_id = asset.id
        assert asset_id in self.listings, "not listed"
        listing = self.listings[asset_id].copy()
        assert listing.seller.native == Txn.sender, "not owner"
        
        itxn.AssetTransfer(
            xfer_asset=asset,
            asset_receiver=Txn.sender,
            asset_amount=1,
            asset_close_to=Txn.sender,
            fee=0
        ).submit()
        
        del self.listings[asset_id]
