/**
 * De-Shop SDK — Type Definitions
 * ───────────────────────────────
 * All public types exported by the SDK.
 * @packageDocumentation
 */

// ─── Configuration ───────────────────────────────────────────────────────────

/** Network the SDK connects to. */
export type DeShopNetwork = 'testnet' | 'mainnet' | 'localnet'

/** SDK initialization options. */
export type DeShopConfig = {
  /** Algorand network to connect to. Default: `'testnet'` */
  network?: DeShopNetwork
  /** On-chain smart contract application ID. */
  appId?: bigint
  /** Backend API URL for metadata & AI pricing. Optional — SDK works without it. */
  backendUrl?: string
  /** Cache configuration. Set `false` to disable caching. */
  cache?: { ttl?: number } | false
  /** Enable debug logging to console. Default: `false` */
  debug?: boolean
}

// ─── Assets ──────────────────────────────────────────────────────────────────

/** AI-generated price suggestion for a skin. */
export type PriceSuggestion = {
  price: number
  confidence: number
  trend: string
  rarity_score?: number
  demand_score?: number
}

/** An NFT skin asset. */
export type Asset = {
  id: number
  asa_id?: number
  txn_id?: string
  name: string
  rarity: string
  metadata: AssetMetadata
  owner: string
  creator: string
  royalty_bps: number
  listed: boolean
  list_price: number | null
  created_at: string
  suggested_price: PriceSuggestion
}

/** Metadata embedded in the NFT note field. */
export type AssetMetadata = {
  skin_name: string
  rarity: string
  skin_type?: 'weapon' | 'character' | 'accessory'
  ipfs_uri: string
  image_url?: string
}

/** Response shape from the assets endpoint. */
export type AssetsResponse = {
  wallet: string
  assets: Asset[]
}

// ─── Marketplace ─────────────────────────────────────────────────────────────

/** Marketplace query with optional filters. */
export type MarketplaceQuery = {
  /** Filter by rarity level. */
  rarity?: string
  /** Minimum price in μALGO. */
  priceMin?: number
  /** Maximum price in μALGO. */
  priceMax?: number
  /** Sort order. */
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'rarity'
  /** Max items to return. Default: 50 */
  limit?: number
  /** Offset for pagination. Default: 0 */
  offset?: number
}

/** Full marketplace data including sales history. */
export type MarketData = {
  marketplace: Asset[]
  sales: SaleRecord[]
  total?: number
}

// ─── Transactions ────────────────────────────────────────────────────────────

/** Result from buying an asset. */
export type BuyResult = {
  success: true
  asset?: Asset
  sale?: SaleRecord
  payment_txn_id?: string
  royalty_txn_id?: string
  amount_paid?: number
  message?: string
}

/** A sale record for provenance history. */
export type SaleRecord = {
  buyer: string
  seller: string
  price: number
  creator: string
  royalty: number
  timestamp: string
  seller_proceeds?: number
  royalty_paid?: number
}

/** Transfer result. */
export type TransferResult = {
  success: true
  txn_id: string
  asset_id: number
  from: string
  to: string
}

/** Mint parameters. */
export type MintParams = {
  wallet: string
  skin_name: string
  rarity: string
  skin_type?: 'weapon' | 'character' | 'accessory'
  royalty_bps?: number
}

/** Batch mint result. */
export type BatchMintResult = {
  assets: Asset[]
  failed: Array<{ params: MintParams; error: string }>
}

// ─── History & Provenance ────────────────────────────────────────────────────

/** A single event in an asset's history. */
export type AssetHistoryEntry = {
  type: 'mint' | 'list' | 'buy' | 'cancel' | 'transfer'
  by: string
  to?: string
  price?: number
  txn_id?: string
  timestamp: string
}

// ─── Events ──────────────────────────────────────────────────────────────────

/** All events the SDK can emit. */
export type DeShopEvents = {
  mint: (asset: Asset) => void
  list: (asset: Asset) => void
  buy: (result: BuyResult) => void
  cancel: (asset: Asset) => void
  transfer: (result: TransferResult) => void
  walletChanged: (address: string | null) => void
  error: (error: Error) => void
}

// ─── Bridge ──────────────────────────────────────────────────────────────────

/** Skin info from an external game platform. */
export type BridgeSkin = {
  name: string
  rarity: string
  applied: boolean
}

/** Bridge query result. */
export type BridgeResult = {
  platform: string
  status: string
  skins: BridgeSkin[]
}
