/**
 * De-Shop SDK — AI-Powered Decentralized Game Marketplace on Algorand
 *
 * @packageDocumentation
 * @module de-shop-sdk
 */

// ── Core SDK ─────────────────────────────────────────────────────────────────
export { DeShopSDK } from './DeShopSDK'
export { SKIN_IMAGES } from './DeShopSDK'

// ── Types ────────────────────────────────────────────────────────────────────
export type {
  Asset,
  AssetMetadata,
  AssetsResponse,
  BuyResult,
  MarketData,
  PriceSuggestion,
  DeShopConfig,
  DeShopNetwork,
  DeShopEvents,
  MarketplaceQuery,
  MintParams,
  BatchMintResult,
  TransferResult,
  AssetHistoryEntry,
  SaleRecord,
  BridgeResult,
  BridgeSkin,
} from './types'

// ── Errors ───────────────────────────────────────────────────────────────────
export {
  DeShopError,
  WalletNotConnectedError,
  InsufficientFundsError,
  AssetNotFoundError,
  AssetNotListedError,
  TransactionFailedError,
  NetworkError,
  ValidationError,
} from './errors'

// ── Skin Intelligence ────────────────────────────────────────────────────────
export { SkinIntelligence, skinIntelligence } from './SkinIntelligence'
export type {
  SkinType,
  SkinAnalysis,
  SkinAttributes,
  NFTMetadata,
  GameMapping,
  WeaponClass,
} from './SkinIntelligence'

// ── Utilities ────────────────────────────────────────────────────────────────
export { EventEmitter } from './events'
export { Logger } from './logger'
export { Cache } from './cache'
