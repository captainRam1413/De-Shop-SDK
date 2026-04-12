import { AlgorandClient, microAlgo } from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'
import { DeshopsdkClient } from '../contracts/Deshopsdk'

// ─── Types ──────────────────────────────────────────────────────────────────

export type PriceSuggestion = {
  price: number
  confidence: number
  trend: string
  rarity_score?: number
  demand_score?: number
}

export type Asset = {
  id: number
  asa_id?: number
  txn_id?: string
  name: string
  rarity: string
  metadata: {
    skin_name: string
    rarity: string
    ipfs_uri: string
    image_url?: string
  }
  owner: string
  creator: string
  royalty_bps: number
  listed: boolean
  list_price: number | null
  created_at: string
  suggested_price: PriceSuggestion
}

export type AssetsResponse = {
  wallet: string
  assets: Asset[]
}

export type BuyResult = {
  success: true
  asset?: Asset
  sale?: {
    buyer: string
    seller: string
    price: number
    creator: string
    royalty: number
    timestamp: string
    seller_proceeds?: number
    royalty_paid?: number
  }
  payment_txn_id?: string
  royalty_txn_id?: string
  amount_paid?: number
  message?: string
}

export type MarketData = {
  marketplace: Asset[]
  sales: BuyResult['sale'][]
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const SKIN_IMAGES: Record<string, string> = {
  common: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&q=80&w=200',
  rare: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=200',
  epic: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200',
  legendary: 'https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?auto=format&fit=crop&q=80&w=200',
  mythic: 'https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?auto=format&fit=crop&q=80&w=200',
}

// ─── SDK Class ──────────────────────────────────────────────────────────────

export class DeShopSDK {
  public baseUrl: string
  public algorand: AlgorandClient
  public appClient: DeshopsdkClient | null = null

  private _activeAddress: string | null = null
  private _transactionSigner: algosdk.TransactionSigner | null = null
  
  // App ID we just deployed to TestNet (Escrow Marketplace)
  public readonly APP_ID = 758710979n

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
    // Initialize standard Algorand Client natively configured for TestNet
    this.algorand = AlgorandClient.testNet()
    this.algorand.setDefaultValidityWindow(100)
  }

  // ── Authentication & Connection ───────────────────────────────────────

  public get isWalletConnected(): boolean {
    return this._activeAddress !== null && this._transactionSigner !== null
  }

  public get activeAddress(): string | null {
    return this._activeAddress
  }

  public connectWallet(address: string, signer: algosdk.TransactionSigner) {
    this._activeAddress = address
    this._transactionSigner = signer
    
    // Register the signer globally on the Algorand Client
    this.algorand.setSigner(address, signer)
    
    this.appClient = new DeshopsdkClient({
      appId: this.APP_ID,
      defaultSender: address,
      algorand: this.algorand
    })
  }

  public disconnectWallet() {
    this._activeAddress = null
    this._transactionSigner = null
    this.appClient = null
  }

  // ── Native On-chain Logic ───────────────────────────────────────────

  async mintNFT(params: {
    wallet: string
    skin_name: string
    rarity: string
    royalty_bps?: number
  }): Promise<Asset> {
    const imageUrl = SKIN_IMAGES[params.rarity] || SKIN_IMAGES.common
    
    if (this.isWalletConnected && this.appClient && this._activeAddress) {
      // 1. Ment Real Algorand Standard Asset (ASA) native to layer-1
      const metadataStr = JSON.stringify({
        skin_name: params.skin_name,
        rarity: params.rarity,
        royalty_bps: params.royalty_bps ?? 500,
        image: imageUrl
      })

      const createResult = await this.algorand.send.assetCreate({
        sender: this._activeAddress,
        total: 1n,
        decimals: 0,
        defaultFrozen: false,
        assetName: params.skin_name,
        unitName: params.rarity.substring(0, 4).toUpperCase(),
        url: `ipfs://mock/dynamic`,
        note: new TextEncoder().encode(metadataStr),
      })
      const asaId = Number(createResult.confirmation.assetIndex!)
      const txnId = createResult.transaction.txID()

      // 2. Setup contract opt-in to asset
      // Using a composer ensures all transactions in the group are signed by the correct account
      const composer = this.appClient.newGroup()
      
      const mbrPayTxn = await this.algorand.createTransaction.payment({
        sender: this._activeAddress,
        receiver: this.appClient.appAddress,
        amount: microAlgo(100_000),
      })

      await composer.setupAsset({
        args: {
            asset: BigInt(asaId),
            mbrPay: { txn: mbrPayTxn, signer: this._transactionSigner! }
        },
        signer: this._transactionSigner!,
        validityWindow: 100,
        extraFee: microAlgo(2000)
      })

      await composer.send()

      // Sync the real ASA data to the mock backend DB for UI fast-lookups
      const backendAsset = await this.post<{ asset: Asset }>('/mint', {
        wallet: this._activeAddress,
        skin_name: params.skin_name,
        rarity: params.rarity,
        royalty_bps: params.royalty_bps ?? 500,
        asa_id: asaId,
        txn_id: txnId,
      })
      
      return {
        ...backendAsset.asset,
        asa_id: asaId,
        txn_id: txnId,
        metadata: {
          ...backendAsset.asset.metadata,
          image_url: imageUrl,
        },
      }
    }

    // Fallback: backend-only mock (offline)
    const response = await this.post<{ asset: Asset }>('/mint', {
      wallet: params.wallet,
      skin_name: params.skin_name,
      rarity: params.rarity,
      royalty_bps: params.royalty_bps ?? 500,
    })
    return { ...response.asset, metadata: { ...response.asset.metadata, image_url: imageUrl } }
  }

  // ── Inventory & Marketplace ───────────────────────────────────────────

  async getPlayerAssets(wallet: string): Promise<Asset[]> {
    const response = await fetch(`${this.baseUrl}/assets/${encodeURIComponent(wallet)}`)
    if (!response.ok) throw new Error(await this.errorText(response))
    const body = (await response.json()) as AssetsResponse
    return body.assets.map((a) => ({
      ...a,
      metadata: {
        ...a.metadata,
        image_url: SKIN_IMAGES[a.rarity] || SKIN_IMAGES.common,
      },
    }))
  }

  async listAsset(wallet: string, asset_id: number, price: number): Promise<Asset> {
    if (this.isWalletConnected && this.appClient && this._activeAddress) {
      const composer = this.appClient.newGroup()
      
      const axferTxn = await this.algorand.createTransaction.assetTransfer({
        sender: this._activeAddress,
        receiver: this.appClient.appAddress,
        assetId: BigInt(asset_id),
        amount: 1n,
      })
      await composer.listAsset({
        args: { 
          axfer: { txn: axferTxn, signer: this._transactionSigner! }, 
          price: BigInt(price), 
          creator: this._activeAddress, 
          royaltyBps: 500n
        },
        signer: this._transactionSigner!,
        validityWindow: 100,
        extraFee: microAlgo(1000)
      })
      
      await composer.send()
    }
    const response = await this.post<{ asset: Asset }>('/list', { wallet, asset_id, price })
    return response.asset
  }

  async buyAsset(buyer_wallet: string, asset_id: number): Promise<BuyResult> {
    if (this.isWalletConnected && this.appClient && this._activeAddress) {
      // First try to fetch the asking price heavily relying on UI listing price
      const assets = await this.getMarketplace()
      const listing = assets.find(a => a.id === asset_id || a.asa_id === asset_id)
      if (!listing || !listing.list_price) throw new Error("Item not listed in backend UI db")
      
      const priceMicroAlgos = Math.floor(listing.list_price * 1_000_000)

      // 1. Opt-in Buyer to the ASA if they don't hold it already
      try {
        const accountInfo = await this.algorand.account.getInformation(this._activeAddress)
        const hasAsset = accountInfo.assets?.some(a => BigInt(a.assetId) === BigInt(asset_id))
        if (!hasAsset) {
          await this.algorand.send.assetOptIn({
            sender: this._activeAddress,
            assetId: BigInt(asset_id),
          })
        }
      } catch (e) {
         console.error("Opt-in check failed", e)
      }

      // 2. Buy: Atomic Payment + Method Call
      const composer = this.appClient.newGroup()
      
      const payTxn = await this.algorand.createTransaction.payment({
        sender: this._activeAddress,
        receiver: this.appClient.appAddress,
        amount: microAlgo(priceMicroAlgos),
      })
 
      await composer.buyAsset({
        args: {
            asset: BigInt(asset_id),
            payment: { txn: payTxn, signer: this._transactionSigner! }
        },
        signer: this._transactionSigner!,
        validityWindow: 100,
        extraFee: microAlgo(4000),
      })

      const buyResult = await composer.send()
      const paymentTxnId = buyResult.transactions[0].txID()
      
      const response = await this.post<{ asset: Asset; sale: BuyResult['sale'] }>('/buy', { buyer_wallet, asset_id, txn_id: paymentTxnId })
      return { success: true, asset: response.asset, sale: response.sale, payment_txn_id: paymentTxnId, message: "Bought!" }
    } else {
      const response = await this.post<{ asset: Asset; sale: BuyResult['sale'] }>('/buy', { buyer_wallet, asset_id })
      return { success: true, asset: response.asset, sale: response.sale, payment_txn_id: 'mock-txn', message: "Bought!" }
    }
  }

  async cancelListing(wallet: string, asset_id: number): Promise<Asset> {
    if (this.isWalletConnected && this.appClient && this._activeAddress) {
      await this.appClient.send.cancelListing({
        args: { asset: BigInt(asset_id) },
        populateAppCallResources: true,
        validityWindow: 100,
        extraFee: microAlgo(2000), // Cover inner asset return
      })
    }
    const response = await this.post<{ asset: Asset }>('/cancel', { wallet, asset_id })
    return response.asset
  }

  async getMarketplace(): Promise<Asset[]> {
    const response = await fetch(`${this.baseUrl}/marketplace`)
    if (!response.ok) throw new Error(await this.errorText(response))
    const body = (await response.json()) as MarketData
    return body.marketplace.map((a) => ({
      ...a,
      metadata: {
        ...a.metadata,
        image_url: SKIN_IMAGES[a.rarity] || SKIN_IMAGES.common,
      },
    }))
  }

  // ── Utils & Legacy Handlers ──────────────────────────────────────────

  public setWalletSigner(address: string | null, signer: algosdk.TransactionSigner | null) {
    if (address && signer) {
      this.connectWallet(address, signer);
    } else {
      this.disconnectWallet();
    }
  }

  async getMarketData(): Promise<MarketData> {
    const response = await fetch(`${this.baseUrl}/marketplace`)
    if (!response.ok) throw new Error(await this.errorText(response))
    const body = (await response.json()) as MarketData
    return {
      ...body,
      marketplace: body.marketplace.map((a) => ({
        ...a,
        metadata: {
          ...a.metadata,
          image_url: SKIN_IMAGES[a.rarity] || SKIN_IMAGES.common,
        },
      }))
    }
  }

  async getSuggestedPrice(skin_name: string, rarity: string): Promise<PriceSuggestion> {
    const response = await this.post<PriceSuggestion>('/ai-price', { skin_name, rarity })
    return response
  }

  async getBridgeMinecraft(wallet: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/bridge/minecraft/${wallet}`)
    if (!response.ok) return { skins: [] }
    return await response.json()
  }

  async getBridgeSteam(wallet: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/bridge/steam/${wallet}`)
    if (!response.ok) return { skins: [] }
    return await response.json()
  }

  private async post<T>(endpoint: string, body: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(await this.errorText(response))
    return response.json()
  }

  private async errorText(response: Response): Promise<string> {
    try {
      const data = await response.json()
      return data.error || data.detail || response.statusText
    } catch {
      return response.statusText
    }
  }
}

