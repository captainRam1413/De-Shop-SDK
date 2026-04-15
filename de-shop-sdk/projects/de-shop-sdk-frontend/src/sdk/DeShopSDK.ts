/**
 * De-Shop SDK — AI-Powered Decentralized Game Marketplace on Algorand
 * ════════════════════════════════════════════════════════════════════
 *
 * Mint, trade, analyze, and manage NFT game skins with on-chain escrow,
 * AI pricing, and the Skin Intelligence Engine.
 *
 * @example
 * ```ts
 * import { DeShopSDK } from 'de-shop-sdk'
 *
 * const sdk = new DeShopSDK({
 *   network: 'testnet',
 *   appId: 758710979n,
 *   backendUrl: 'http://localhost:5000',
 *   debug: true,
 * })
 *
 * sdk.on('mint', (asset) => console.log('Minted:', asset.name))
 *
 * sdk.connectWallet(address, signer)
 * const skin = await sdk.mintNFT({ wallet: address, skin_name: 'Dragon AK', rarity: 'legendary' })
 * ```
 *
 * @packageDocumentation
 */

import { AlgorandClient, microAlgo } from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'
import { DeshopsdkClient } from './DeshopsdkClient'
import { EventEmitter } from './events'
import { Logger } from './logger'
import { Cache } from './cache'
import {
  DeShopError,
  WalletNotConnectedError,
  AssetNotFoundError,
  AssetNotListedError,
  TransactionFailedError,
  NetworkError,
  ValidationError,
} from './errors'
import type {
  DeShopConfig,
  DeShopNetwork,
  DeShopEvents,
  Asset,
  AssetMetadata,
  AssetsResponse,
  BuyResult,
  SaleRecord,
  MarketData,
  MarketplaceQuery,
  PriceSuggestion,
  MintParams,
  BatchMintResult,
  TransferResult,
  AssetHistoryEntry,
  BridgeResult,
} from './types'

// Re-export types so consumers can still import from DeShopSDK
export type {
  Asset, AssetsResponse, BuyResult, MarketData, PriceSuggestion,
  MarketplaceQuery, TransferResult, BatchMintResult, MintParams,
  AssetHistoryEntry, DeShopConfig, DeShopNetwork, BridgeResult, SaleRecord,
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Default rarity-to-image mapping. Override via `sdk.skinImages`. */
export const SKIN_IMAGES: Record<string, string> = {
  common: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&q=80&w=200',
  rare: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=200',
  epic: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200',
  legendary: 'https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?auto=format&fit=crop&q=80&w=200',
  mythic: 'https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?auto=format&fit=crop&q=80&w=200',
}

const DEFAULT_APP_IDS: Record<DeShopNetwork, bigint> = {
  testnet: 758710979n,
  mainnet: 0n,  // Not deployed yet
  localnet: 0n,
}

const MAX_RETRIES = 3
const RETRY_BASE_MS = 1000

// ─── SDK Class ──────────────────────────────────────────────────────────────

export class DeShopSDK extends EventEmitter<DeShopEvents> {
  /** The backend API URL (if configured). */
  public readonly backendUrl: string | null
  /** The Algorand network this SDK instance targets. */
  public readonly network: DeShopNetwork
  /** The smart contract application ID. */
  public readonly appId: bigint
  /** AlgorandClient instance for direct chain access. */
  public readonly algorand: AlgorandClient
  /** Rarity-to-image mapping. Consumers can mutate this. */
  public skinImages = { ...SKIN_IMAGES }

  /** @internal */ private _log: Logger
  /** @internal */ private _cache: Cache
  /** @internal */ private _appClient: DeshopsdkClient | null = null
  /** @internal */ private _activeAddress: string | null = null
  /** @internal */ private _signer: algosdk.TransactionSigner | null = null
  /** @internal */ private _history = new Map<number, AssetHistoryEntry[]>()

  // ══════════════════════════════════════════════════════════════════════════
  //  CONSTRUCTOR
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new De-Shop SDK instance.
   *
   * @param config - Configuration object, or a backend URL string for quick setup.
   *
   * @example
   * ```ts
   * // Quick setup (TestNet, default app ID)
   * const sdk = new DeShopSDK('http://localhost:5000')
   *
   * // Full configuration
   * const sdk = new DeShopSDK({
   *   network: 'testnet',
   *   appId: 758710979n,
   *   backendUrl: 'http://localhost:5000',
   *   cache: { ttl: 15_000 },
   *   debug: true,
   * })
   * ```
   */
  constructor(config: DeShopConfig | string) {
    super()

    const cfg: DeShopConfig = typeof config === 'string'
      ? { backendUrl: config }
      : config

    this.network = cfg.network ?? 'testnet'
    this.appId = cfg.appId ?? DEFAULT_APP_IDS[this.network]
    this.backendUrl = cfg.backendUrl?.replace(/\/+$/, '') ?? null

    this._log = new Logger(cfg.debug ?? false)
    this._cache = cfg.cache === false
      ? new Cache(0, false)
      : new Cache(cfg.cache?.ttl ?? 30_000)

    // Initialize Algorand Client for the target network
    if (this.network === 'testnet') this.algorand = AlgorandClient.testNet()
    else if (this.network === 'mainnet') this.algorand = AlgorandClient.mainNet()
    else this.algorand = AlgorandClient.defaultLocalNet()

    this.algorand.setDefaultValidityWindow(100)

    this._log.info(`SDK initialized — ${this.network} — App #${this.appId}`)
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  WALLET CONNECTION
  // ══════════════════════════════════════════════════════════════════════════

  /** Whether a wallet is currently connected. */
  get isWalletConnected(): boolean {
    return this._activeAddress !== null && this._signer !== null
  }

  /** The currently connected wallet address, or `null`. */
  get activeAddress(): string | null {
    return this._activeAddress
  }

  /** The app client instance (available after wallet connect). */
  get appClient(): DeshopsdkClient | null {
    return this._appClient
  }

  /**
   * Connect a wallet to the SDK.
   * Typically called after the user approves via Pera/Defly.
   */
  connectWallet(address: string, signer: algosdk.TransactionSigner): void {
    this._activeAddress = address
    this._signer = signer
    this.algorand.setSigner(address, signer)

    this._appClient = new DeshopsdkClient({
      appId: this.appId,
      defaultSender: address,
      algorand: this.algorand,
    })

    this._log.success(`Wallet connected: ${address.slice(0, 8)}...`)
    this.emit('walletChanged', address)
  }

  /** Disconnect the current wallet. */
  disconnectWallet(): void {
    const prev = this._activeAddress
    this._activeAddress = null
    this._signer = null
    this._appClient = null
    this._cache.clear()

    if (prev) {
      this._log.info('Wallet disconnected')
      this.emit('walletChanged', null)
    }
  }

  /**
   * Convenience method compatible with `@txnlab/use-wallet` signer pattern.
   * Call this in a React `useEffect` syncing wallet state.
   */
  setWalletSigner(address: string | null, signer: algosdk.TransactionSigner | null): void {
    if (address && signer) this.connectWallet(address, signer)
    else this.disconnectWallet()
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  MINTING
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Mint a new NFT game skin as an Algorand Standard Asset (ASA).
   *
   * If a wallet is connected, creates a real on-chain ASA and registers
   * the contract opt-in. Falls back to backend-only mock if offline.
   *
   * @returns The newly minted Asset.
   *
   * @example
   * ```ts
   * const skin = await sdk.mintNFT({
   *   wallet: myAddress,
   *   skin_name: 'Dragon Flame AK',
   *   rarity: 'legendary',
   *   royalty_bps: 500,   // 5% royalty
   * })
   * console.log(skin.asa_id) // 758712345
   * ```
   */
  async mintNFT(params: MintParams): Promise<Asset> {
    // Validation
    if (!params.wallet) throw new ValidationError('wallet', 'Wallet address is required')
    if (!params.skin_name?.trim()) throw new ValidationError('skin_name', 'Skin name cannot be empty')
    if (params.royalty_bps !== undefined && (params.royalty_bps < 0 || params.royalty_bps > 1000)) {
      throw new ValidationError('royalty_bps', 'Must be between 0 and 1000 (0-10%)')
    }

    const done = this._log.time(`Minting "${params.skin_name}" [${params.rarity}]`)
    const imageUrl = this.skinImages[params.rarity] || this.skinImages.common

    try {
      if (this.isWalletConnected && this._appClient && this._activeAddress) {
        // ── On-chain mint ────────────────────────────────────────────
        const metadataStr = JSON.stringify({
          skin_name: params.skin_name,
          rarity: params.rarity,
          skin_type: params.skin_type,
          royalty_bps: params.royalty_bps ?? 500,
          image: imageUrl,
        })

        const getUnitName = (r: string) => {
          const upper = r.toUpperCase()
          if (upper === 'LEGENDARY') return 'LEGENDRY' // Exactly 8 bytes max
          return upper.substring(0, 8)
        }

        const createResult = await this.algorand.send.assetCreate({
          sender: this._activeAddress,
          total: 1n,
          decimals: 0,
          defaultFrozen: false,
          assetName: params.skin_name,
          unitName: getUnitName(params.rarity),
          url: 'ipfs://mock/dynamic',
          note: new TextEncoder().encode(metadataStr),
        })

        const asaId = Number(createResult.confirmation.assetIndex!)
        const txnId = createResult.transaction.txID()
        this._log.info(`ASA #${asaId} created, tx: ${txnId.slice(0, 12)}...`)

        // Contract opt-in
        await this._setupContractOptIn(asaId)

        // Sync to backend
        const asset = await this._syncToBackend(params, asaId, txnId, imageUrl)

        // Record history
        this._recordHistory(asaId, { type: 'mint', by: this._activeAddress, txn_id: txnId, timestamp: new Date().toISOString() })

        // Invalidate caches
        this._cache.invalidatePrefix('inventory:')
        this._cache.invalidatePrefix('marketplace')

        done()
        this.emit('mint', asset)
        return asset
      }

      // ── Fallback: backend-only ───────────────────────────────────
      const response = await this._post<{ asset: Asset }>('/mint', {
        wallet: params.wallet,
        skin_name: params.skin_name,
        rarity: params.rarity,
        skin_type: params.skin_type,
        royalty_bps: params.royalty_bps ?? 500,
      })
      const asset = { ...response.asset, metadata: { ...response.asset.metadata, image_url: imageUrl } }

      done()
      this.emit('mint', asset)
      return asset
    } catch (e) {
      if (e instanceof DeShopError) throw e
      const err = new TransactionFailedError(`Mint failed: ${(e as Error).message}`)
      this.emit('error', err)
      throw err
    }
  }

  /**
   * Mint multiple skins in a single call.
   * Processes sequentially to avoid nonce conflicts.
   *
   * @returns Object with `assets` (successes) and `failed` (with error messages).
   */
  async batchMint(paramsList: MintParams[]): Promise<BatchMintResult> {
    if (paramsList.length === 0) throw new ValidationError('paramsList', 'Must provide at least one item')
    if (paramsList.length > 16) throw new ValidationError('paramsList', 'Maximum 16 items per batch')

    this._log.info(`Batch minting ${paramsList.length} skins...`)
    const result: BatchMintResult = { assets: [], failed: [] }

    for (const params of paramsList) {
      try {
        const asset = await this.mintNFT(params)
        result.assets.push(asset)
      } catch (e) {
        result.failed.push({ params, error: (e as Error).message })
      }
    }

    this._log.success(`Batch complete: ${result.assets.length} minted, ${result.failed.length} failed`)
    return result
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  INVENTORY & MARKETPLACE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get all NFT skins owned by a wallet.
   * Merges on-chain ASA data with backend metadata.
   * Results are cached for 10 seconds.
   */
  async getPlayerAssets(wallet: string): Promise<Asset[]> {
    const cacheKey = `inventory:${wallet}`
    const cached = this._cache.get<Asset[]>(cacheKey)
    if (cached) return cached

    const done = this._log.time(`Fetching inventory for ${wallet.slice(0, 8)}...`)

    try {
      // 1. On-chain assets
      const accountInfo = await this._retry(() => this.algorand.account.getInformation(wallet))
      const onChainAssets = (accountInfo.assets || []).filter(a => a.amount > 0)

      // 2. Backend metadata
      const backendAssets = await this._fetchBackendAssets(wallet)

      // 3. Resolve
      const assetPromises = onChainAssets.map(async (onChain) => {
        const asaId = Number(onChain.assetId)
        const match = backendAssets.find(a => a.asa_id === asaId)
        if (match) return this._enrichAsset(match)

        // Recovery: fetch from chain
        return this._recoverAssetFromChain(asaId, wallet)
      })

      const resolved = (await Promise.all(assetPromises)).filter((a): a is Asset => a !== null)

      // Include listed items (held by contract, not user wallet)
      backendAssets.filter(a => a.listed).forEach(a => {
        if (!resolved.find(r => r.asa_id === a.asa_id)) {
          resolved.push(this._enrichAsset(a))
        }
      })

      this._cache.set(cacheKey, resolved, 10_000)
      done()
      return resolved
    } catch (e) {
      this._log.warn('On-chain inventory fetch failed, falling back to backend', e)
      const fallback = await this._fetchBackendAssets(wallet)
      const enriched = fallback.map(a => this._enrichAsset(a))
      done()
      return enriched
    }
  }

  /**
   * List an asset for sale on the marketplace.
   *
   * @param wallet - Owner's wallet address
   * @param assetId - ASA ID to list
   * @param price - Price in μALGO
   */
  async listAsset(wallet: string, assetId: number, price: number): Promise<Asset> {
    if (price <= 0) throw new ValidationError('price', 'Price must be greater than 0')

    const done = this._log.time(`Listing #${assetId} at ${price} μALGO`)

    try {
      if (this.isWalletConnected && this._appClient && this._activeAddress) {
        await this._ensureContractOptIn(assetId)

        const composer = this._appClient.newGroup()
        const axferTxn = await this.algorand.createTransaction.assetTransfer({
          sender: this._activeAddress,
          receiver: this._appClient.appAddress,
          assetId: BigInt(assetId),
          amount: 1n,
        })
        await composer.listAsset({
          args: {
            axfer: { txn: axferTxn, signer: this._signer! },
            price: BigInt(price),
            creator: this._activeAddress,
            royaltyBps: 500n,
          },
          signer: this._signer!,
          validityWindow: 100,
          extraFee: microAlgo(1000),
        })
        await composer.send()
        this._recordHistory(assetId, { type: 'list', by: this._activeAddress, price, timestamp: new Date().toISOString() })
      }

      const response = await this._post<{ asset: Asset }>('/list', { wallet, asset_id: assetId, price })
      this._cache.invalidatePrefix('inventory:')
      this._cache.invalidatePrefix('marketplace')

      done()
      this.emit('list', response.asset)
      return response.asset
    } catch (e) {
      if (e instanceof DeShopError) throw e
      const err = new TransactionFailedError(`List failed: ${(e as Error).message}`)
      this.emit('error', err)
      throw err
    }
  }

  /**
   * Buy a listed asset from the marketplace.
   */
  async buyAsset(buyerWallet: string, assetId: number): Promise<BuyResult> {
    const done = this._log.time(`Buying #${assetId}`)

    try {
      if (this.isWalletConnected && this._appClient && this._activeAddress) {
        const assets = await this.getMarketplace()
        const listing = assets.find(a => a.id === assetId || a.asa_id === assetId)
        if (!listing || !listing.list_price) throw new AssetNotListedError(assetId)

        const priceMicroAlgos = Math.floor(listing.list_price * 1_000_000)

        // Opt-in buyer
        await this._ensureBuyerOptIn(assetId)

        // Atomic buy
        const composer = this._appClient.newGroup()
        const payTxn = await this.algorand.createTransaction.payment({
          sender: this._activeAddress,
          receiver: this._appClient.appAddress,
          amount: microAlgo(priceMicroAlgos),
        })
        await composer.buyAsset({
          args: {
            asset: BigInt(assetId),
            payment: { txn: payTxn, signer: this._signer! },
          },
          signer: this._signer!,
          validityWindow: 100,
          extraFee: microAlgo(4000),
        })
        const buyRes = await composer.send()
        const paymentTxnId = buyRes.transactions[0].txID()

        this._recordHistory(assetId, { type: 'buy', by: this._activeAddress, price: listing.list_price, timestamp: new Date().toISOString() })

        const response = await this._post<{ asset: Asset; sale: SaleRecord }>('/buy', { buyer_wallet: buyerWallet, asset_id: assetId, txn_id: paymentTxnId })
        this._cache.invalidatePrefix('inventory:')
        this._cache.invalidatePrefix('marketplace')

        const result: BuyResult = { success: true, asset: response.asset, sale: response.sale, payment_txn_id: paymentTxnId, message: 'Bought!' }
        done()
        this.emit('buy', result)
        return result
      }

      // Fallback
      const response = await this._post<{ asset: Asset; sale: SaleRecord }>('/buy', { buyer_wallet: buyerWallet, asset_id: assetId })
      const result: BuyResult = { success: true, asset: response.asset, sale: response.sale, payment_txn_id: 'mock-txn', message: 'Bought!' }
      done()
      this.emit('buy', result)
      return result
    } catch (e) {
      if (e instanceof DeShopError) throw e
      const err = new TransactionFailedError(`Buy failed: ${(e as Error).message}`)
      this.emit('error', err)
      throw err
    }
  }

  /**
   * Cancel a marketplace listing, returning the asset to the seller.
   */
  async cancelListing(wallet: string, assetId: number): Promise<Asset> {
    const done = this._log.time(`Cancelling listing #${assetId}`)

    try {
      if (this.isWalletConnected && this._appClient) {
        await this._appClient.send.cancelListing({
          args: { asset: BigInt(assetId) },
          populateAppCallResources: true,
          validityWindow: 100,
          extraFee: microAlgo(2000),
        })
        this._recordHistory(assetId, { type: 'cancel', by: wallet, timestamp: new Date().toISOString() })
      }
      const response = await this._post<{ asset: Asset }>('/cancel', { wallet, asset_id: assetId })
      this._cache.invalidatePrefix('inventory:')
      this._cache.invalidatePrefix('marketplace')

      done()
      this.emit('cancel', response.asset)
      return response.asset
    } catch (e) {
      if (e instanceof DeShopError) throw e
      throw new TransactionFailedError(`Cancel failed: ${(e as Error).message}`)
    }
  }

  /**
   * Get marketplace listings with optional filters.
   *
   * @example
   * ```ts
   * const legendaries = await sdk.getMarketplace({
   *   rarity: 'legendary',
   *   sortBy: 'price_asc',
   *   limit: 10,
   * })
   * ```
   */
  async getMarketplace(query?: MarketplaceQuery): Promise<Asset[]> {
    const cacheKey = `marketplace:${JSON.stringify(query || {})}`
    const cached = this._cache.get<Asset[]>(cacheKey)
    if (cached) return cached

    try {
      let assets: Asset[]

      if (this._appClient) {
        // On-chain source of truth
        const contractInfo = await this._retry(() => this.algorand.account.getInformation(this._appClient!.appAddress))
        const escrowAssets = (contractInfo.assets || []).filter(a => a.amount > 0)
        const backendMarket = await this._fetchBackendMarketplace()

        const resolved = await Promise.all(
          escrowAssets.map(async (escrow) => {
            const asaId = Number(escrow.assetId)
            const match = backendMarket.find(a => a.asa_id === asaId)
            if (match) return this._enrichAsset(match)
            return this._recoverAssetFromChain(asaId, this._appClient!.appAddress.toString(), true)
          })
        )
        assets = resolved.filter((a): a is Asset => a !== null)
      } else {
        assets = await this._fetchBackendMarketplace()
      }

      // Apply filters
      if (query) assets = this._applyMarketFilters(assets, query)

      this._cache.set(cacheKey, assets, 15_000)
      return assets
    } catch (e) {
      this._log.warn('Marketplace on-chain fetch failed', e)
      let fallback = await this._fetchBackendMarketplace()
      if (query) fallback = this._applyMarketFilters(fallback, query)
      return fallback
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  TRANSFER (NEW)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Transfer (gift) an NFT skin to another wallet.
   *
   * @param toAddress - Recipient wallet address
   * @param assetId - ASA ID to transfer
   *
   * @example
   * ```ts
   * const result = await sdk.transferAsset('RECV_ADDRESS...', 758712094)
   * console.log(result.txn_id)
   * ```
   */
  async transferAsset(toAddress: string, assetId: number): Promise<TransferResult> {
    if (!this.isWalletConnected || !this._activeAddress || !this._signer) {
      throw new WalletNotConnectedError('transferAsset')
    }
    if (!toAddress) throw new ValidationError('toAddress', 'Recipient address is required')

    const done = this._log.time(`Transferring #${assetId} → ${toAddress.slice(0, 8)}...`)

    try {
      const result = await this.algorand.send.assetTransfer({
        sender: this._activeAddress,
        receiver: toAddress,
        assetId: BigInt(assetId),
        amount: 1n,
      })

      const txnId = result.transaction.txID()
      this._recordHistory(assetId, { type: 'transfer', by: this._activeAddress, to: toAddress, txn_id: txnId, timestamp: new Date().toISOString() })
      this._cache.invalidatePrefix('inventory:')

      const transferResult: TransferResult = {
        success: true, txn_id: txnId, asset_id: assetId,
        from: this._activeAddress, to: toAddress,
      }

      done()
      this.emit('transfer', transferResult)
      return transferResult
    } catch (e) {
      throw new TransactionFailedError(`Transfer failed: ${(e as Error).message}`)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  HISTORY & PROVENANCE (NEW)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get the ownership and trade history of an asset.
   *
   * @example
   * ```ts
   * const history = await sdk.getAssetHistory(758712094)
   * // → [{ type: 'mint', by: '...', timestamp: '...' }, { type: 'list', price: 100, ... }, ...]
   * ```
   */
  async getAssetHistory(assetId: number): Promise<AssetHistoryEntry[]> {
    // Local history (from this session)
    const local = this._history.get(assetId) || []

    // Backend history (if available)
    if (this.backendUrl) {
      try {
        const resp = await fetch(`${this.backendUrl}/history/${assetId}`)
        if (resp.ok) {
          const data = await resp.json() as { history: AssetHistoryEntry[] }
          // Merge and deduplicate by timestamp
          const all = [...data.history, ...local]
          const seen = new Set<string>()
          return all.filter(h => {
            const key = `${h.type}:${h.timestamp}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        }
      } catch { /* fallthrough */ }
    }

    return local
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  AI PRICING & INTELLIGENCE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get an AI-generated price suggestion for a skin.
   *
   * @param skinName - Name of the skin
   * @param rarity - Rarity tier ('common' | 'rare' | 'epic' | 'legendary')
   */
  async getSuggestedPrice(skinName: string, rarity: string): Promise<PriceSuggestion> {
    return this._post<PriceSuggestion>('/ai-price', { skin_name: skinName, rarity })
  }

  /**
   * Get full market data including sales history.
   */
  async getMarketData(): Promise<MarketData> {
    const response = await this._fetchJson<MarketData>('/marketplace')
    return {
      ...response,
      marketplace: response.marketplace.map(a => this._enrichAsset(a)),
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  GAME BRIDGES
  // ══════════════════════════════════════════════════════════════════════════

  /** Query the Minecraft skin bridge for a wallet. */
  async getBridgeMinecraft(wallet: string): Promise<BridgeResult> {
    try {
      return await this._fetchJson<BridgeResult>(`/bridge/minecraft/${wallet}`)
    } catch { return { platform: 'minecraft', status: 'offline', skins: [] } }
  }

  /** Query the Steam skin bridge for a wallet. */
  async getBridgeSteam(wallet: string): Promise<BridgeResult> {
    try {
      return await this._fetchJson<BridgeResult>(`/bridge/steam/${wallet}`)
    } catch { return { platform: 'steam', status: 'offline', skins: [] } }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  CACHE CONTROL
  // ══════════════════════════════════════════════════════════════════════════

  /** Clear all cached data. Useful after external wallet transactions. */
  clearCache(): void {
    this._cache.clear()
    this._log.info('Cache cleared')
  }

  /** Number of items currently in cache. */
  get cacheSize(): number {
    return this._cache.size
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /** @internal Setup contract opt-in for an ASA during minting. */
  private async _setupContractOptIn(asaId: number): Promise<void> {
    if (!this._appClient || !this._activeAddress || !this._signer) return
    const composer = this._appClient.newGroup()
    const mbrPayTxn = await this.algorand.createTransaction.payment({
      sender: this._activeAddress,
      receiver: this._appClient.appAddress,
      amount: microAlgo(100_000),
    })
    await composer.setupAsset({
      args: { asset: BigInt(asaId), mbrPay: { txn: mbrPayTxn, signer: this._signer } },
      signer: this._signer,
      validityWindow: 100,
      extraFee: microAlgo(2000),
    })
    await composer.send()
  }

  /** @internal Ensure contract is opted-in before listing. */
  private async _ensureContractOptIn(assetId: number): Promise<void> {
    if (!this._appClient || !this._activeAddress) return
    try {
      const info = await this.algorand.account.getInformation(this._appClient.appAddress)
      const has = info.assets?.some(a => BigInt(a.assetId) === BigInt(assetId))
      if (!has) await this._setupContractOptIn(assetId)
    } catch (e) {
      this._log.warn('Contract opt-in check failed, attempting anyway', e)
    }
  }

  /** @internal Ensure buyer opted-in to ASA before buying. */
  private async _ensureBuyerOptIn(assetId: number): Promise<void> {
    if (!this._activeAddress) return
    try {
      const info = await this.algorand.account.getInformation(this._activeAddress)
      const has = info.assets?.some(a => BigInt(a.assetId) === BigInt(assetId))
      if (!has) {
        await this.algorand.send.assetOptIn({
          sender: this._activeAddress,
          assetId: BigInt(assetId),
        })
      }
    } catch (e) {
      this._log.warn('Buyer opt-in check failed', e)
    }
  }

  /** @internal Sync a minted asset to the backend. */
  private async _syncToBackend(params: MintParams, asaId: number, txnId: string, imageUrl: string): Promise<Asset> {
    const response = await this._post<{ asset: Asset }>('/mint', {
      wallet: this._activeAddress,
      skin_name: params.skin_name,
      rarity: params.rarity,
      skin_type: params.skin_type,
      royalty_bps: params.royalty_bps ?? 500,
      asa_id: asaId,
      txn_id: txnId,
    })
    return { ...response.asset, asa_id: asaId, txn_id: txnId, metadata: { ...response.asset.metadata, image_url: imageUrl } }
  }

  /** @internal Try to recover asset metadata from on-chain ASA info. */
  private async _recoverAssetFromChain(asaId: number, owner: string, listed = false): Promise<Asset | null> {
    try {
      const asaInfo = await this.algorand.asset.getById(BigInt(asaId))
      const name = asaInfo.assetName || `Skin #${asaId}`
      const unit = (asaInfo.unitName || 'common').toLowerCase()
      return {
        id: asaId, asa_id: asaId, name, rarity: unit, owner, creator: asaInfo.creator,
        royalty_bps: 500, listed, list_price: listed ? 0 : null,
        created_at: new Date().toISOString(),
        suggested_price: { price: 0, confidence: 0, trend: 'stable' },
        metadata: { skin_name: name, rarity: unit, ipfs_uri: '', image_url: this.skinImages[unit] || this.skinImages.common },
      }
    } catch { return null }
  }

  /** @internal Add an image_url to an asset based on rarity. */
  private _enrichAsset(asset: Asset): Asset {
    return {
      ...asset,
      metadata: { ...asset.metadata, image_url: this.skinImages[asset.rarity] || this.skinImages.common },
    }
  }

  /** @internal Record a history entry for an asset. */
  private _recordHistory(assetId: number, entry: AssetHistoryEntry): void {
    if (!this._history.has(assetId)) this._history.set(assetId, [])
    this._history.get(assetId)!.push(entry)
  }

  /** @internal Fetch backend assets for a wallet. */
  private async _fetchBackendAssets(wallet: string): Promise<Asset[]> {
    if (!this.backendUrl) return []
    try {
      const resp = await fetch(`${this.backendUrl}/assets/${encodeURIComponent(wallet)}`)
      if (!resp.ok) return []
      return ((await resp.json()) as AssetsResponse).assets
    } catch { return [] }
  }

  /** @internal Fetch backend marketplace. */
  private async _fetchBackendMarketplace(): Promise<Asset[]> {
    if (!this.backendUrl) return []
    try {
      const resp = await fetch(`${this.backendUrl}/marketplace`)
      if (!resp.ok) return []
      return ((await resp.json()) as MarketData).marketplace.map(a => this._enrichAsset(a))
    } catch { return [] }
  }

  /** @internal Apply filters to a marketplace asset list. */
  private _applyMarketFilters(assets: Asset[], q: MarketplaceQuery): Asset[] {
    let filtered = [...assets]
    if (q.rarity) filtered = filtered.filter(a => a.rarity === q.rarity)
    if (q.priceMin !== undefined) filtered = filtered.filter(a => (a.list_price ?? 0) >= q.priceMin!)
    if (q.priceMax !== undefined) filtered = filtered.filter(a => (a.list_price ?? Infinity) <= q.priceMax!)
    if (q.sortBy === 'price_asc') filtered.sort((a, b) => (a.list_price ?? 0) - (b.list_price ?? 0))
    else if (q.sortBy === 'price_desc') filtered.sort((a, b) => (b.list_price ?? 0) - (a.list_price ?? 0))
    else if (q.sortBy === 'newest') filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    if (q.offset) filtered = filtered.slice(q.offset)
    if (q.limit) filtered = filtered.slice(0, q.limit)
    return filtered
  }

  /** @internal Retry a function with exponential backoff. */
  private async _retry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn()
      } catch (e) {
        if (attempt === retries) throw e
        const delay = RETRY_BASE_MS * Math.pow(2, attempt)
        this._log.warn(`Retry ${attempt + 1}/${retries} in ${delay}ms...`)
        await new Promise(r => setTimeout(r, delay))
      }
    }
    throw new Error('Unreachable')
  }

  /** @internal POST JSON to the backend. */
  private async _post<T>(endpoint: string, body: any): Promise<T> {
    if (!this.backendUrl) throw new NetworkError('No backend URL configured', endpoint)
    const response = await fetch(`${this.backendUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errText = await this._errorText(response)
      throw new NetworkError(errText, `${this.backendUrl}${endpoint}`, response.status)
    }
    return response.json()
  }

  /** @internal GET JSON from the backend. */
  private async _fetchJson<T>(path: string): Promise<T> {
    if (!this.backendUrl) throw new NetworkError('No backend URL configured', path)
    const response = await fetch(`${this.backendUrl}${path}`)
    if (!response.ok) throw new NetworkError(await this._errorText(response), path, response.status)
    return response.json()
  }

  /** @internal Extract error message from a failed response. */
  private async _errorText(response: Response): Promise<string> {
    try {
      const data = await response.json()
      return data.error || data.detail || response.statusText
    } catch { return response.statusText }
  }
}
