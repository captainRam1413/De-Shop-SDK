# De-Shop SDK

> **AI-Powered Decentralized Game Marketplace on Algorand**
>
> Mint, trade, analyze, and manage NFT game skins with on-chain escrow, AI pricing, and the Skin Intelligence Engine.

[![Algorand](https://img.shields.io/badge/Algorand-TestNet-00D4AA)](https://testnet.algoexplorer.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/de-shop-sdk)](https://www.npmjs.com/package/de-shop-sdk)

---

## Installation

```bash
npm install de-shop-sdk
```

**Peer Dependencies:**
```bash
npm install @algorandfoundation/algokit-utils algosdk
```

## Quick Start

```typescript
import { DeShopSDK } from 'de-shop-sdk'

// Initialize
const sdk = new DeShopSDK({
  network: 'testnet',
  backendUrl: 'http://localhost:5000',
  debug: true,
})

// Listen for events
sdk.on('mint', (asset) => console.log('Minted:', asset.name))
sdk.on('buy', (result) => console.log('Bought:', result.asset?.name))
sdk.on('error', (err) => console.error('SDK Error:', err.code))

// Connect wallet (from Pera/Defly)
sdk.connectWallet(address, signer)

// Mint an NFT skin
const skin = await sdk.mintNFT({
  wallet: address,
  skin_name: 'Dragon Flame AK',
  rarity: 'legendary',
  royalty_bps: 500,
})

console.log(skin.asa_id)  // 758712345
```

## Configuration

```typescript
const sdk = new DeShopSDK({
  // Network: 'testnet' | 'mainnet' | 'localnet'
  network: 'testnet',

  // Smart contract App ID (auto-detected per network)
  appId: 758710979n,

  // Backend URL for AI pricing & metadata (optional)
  backendUrl: 'http://localhost:5000',

  // Cache: { ttl: 30000 } or false to disable
  cache: { ttl: 15_000 },

  // Enable [DeShop] debug logs
  debug: true,
})

// Shorthand: just pass the backend URL
const sdk = new DeShopSDK('http://localhost:5000')
```

## API Reference

### Wallet

| Method | Description |
|--------|-------------|
| `sdk.connectWallet(address, signer)` | Connect a wallet |
| `sdk.disconnectWallet()` | Disconnect |
| `sdk.setWalletSigner(addr, signer)` | Convenience for use-wallet sync |
| `sdk.isWalletConnected` | Check connection status |
| `sdk.activeAddress` | Current wallet address |

### Minting

```typescript
// Single mint
const skin = await sdk.mintNFT({
  wallet: address,
  skin_name: 'Neon Phantom',
  rarity: 'epic',
  royalty_bps: 500,  // 5% royalty
})

// Batch mint (up to 16)
const batch = await sdk.batchMint([
  { wallet: address, skin_name: 'AK Neon', rarity: 'epic' },
  { wallet: address, skin_name: 'Ghost Op', rarity: 'legendary' },
])
console.log(batch.assets)   // successfully minted
console.log(batch.failed)   // any failures
```

### Marketplace

```typescript
// List for sale
await sdk.listAsset(wallet, assetId, priceInMicroAlgos)

// Buy
const result = await sdk.buyAsset(buyerWallet, assetId)

// Cancel listing
await sdk.cancelListing(wallet, assetId)

// Browse with filters
const items = await sdk.getMarketplace({
  rarity: 'legendary',
  priceMin: 10,
  priceMax: 500,
  sortBy: 'price_asc',  // 'price_desc' | 'newest' | 'rarity'
  limit: 20,
  offset: 0,
})

// Full market data with sales history
const data = await sdk.getMarketData()
```

### Transfer / Gift

```typescript
const result = await sdk.transferAsset(toAddress, assetId)
console.log(result.txn_id)
```

### Inventory

```typescript
const skins = await sdk.getPlayerAssets(walletAddress)
```

### Asset History

```typescript
const history = await sdk.getAssetHistory(assetId)
// → [
//   { type: 'mint', by: 'ADDR...', timestamp: '...' },
//   { type: 'list', by: 'ADDR...', price: 100, timestamp: '...' },
//   { type: 'buy',  by: 'BUYER...', price: 100, timestamp: '...' },
// ]
```

### AI Pricing

```typescript
const suggestion = await sdk.getSuggestedPrice('Dragon AK', 'legendary')
console.log(suggestion.price)       // 450
console.log(suggestion.confidence)  // 0.92
console.log(suggestion.trend)       // 'rising'
```

### Skin Intelligence Engine

```typescript
import { skinIntelligence } from 'de-shop-sdk'

const analysis = skinIntelligence.analyze({
  name: 'Dragon Flame AK',
  image: 'ipfs://...',
  attributes: { weapon: 'AK-47', rarity: 'legendary', effect: 'fire', style: 'dragon' },
})

console.log(analysis.type)          // 'gun_skin'
console.log(analysis.rarity_score)  // 9.2
console.log(analysis.game_mapping)  // { game: 'Call of Duty', category: 'Assault Rifle Skin' }
console.log(analysis.tags)          // ['weapon_skin', 'legendary', 'fire', 'dragon', 'ar']
```

### Game Bridges

```typescript
const mc = await sdk.getBridgeMinecraft(wallet)    // { platform, status, skins }
const steam = await sdk.getBridgeSteam(wallet)     // { platform, status, skins }
```

### Events

```typescript
sdk.on('mint', (asset) => { ... })
sdk.on('list', (asset) => { ... })
sdk.on('buy', (result) => { ... })
sdk.on('cancel', (asset) => { ... })
sdk.on('transfer', (result) => { ... })
sdk.on('walletChanged', (address) => { ... })
sdk.on('error', (error) => { ... })

// Returns unsubscribe function
const unsub = sdk.on('mint', handler)
unsub()

// One-time listener
sdk.once('buy', handler)
```

### Cache

```typescript
sdk.clearCache()        // Clear all cached data
sdk.cacheSize           // Number of cached entries
```

## Error Handling

All errors extend `DeShopError` with a `.code` property:

```typescript
import {
  DeShopError,
  WalletNotConnectedError,
  InsufficientFundsError,
  AssetNotFoundError,
  AssetNotListedError,
  TransactionFailedError,
  NetworkError,
  ValidationError,
} from 'de-shop-sdk'

try {
  await sdk.mintNFT({ ... })
} catch (e) {
  if (e instanceof WalletNotConnectedError) {
    // e.code === 'WALLET_NOT_CONNECTED'
    showConnectModal()
  } else if (e instanceof InsufficientFundsError) {
    alert(`Need ${e.required} μALGO, have ${e.available}`)
  } else if (e instanceof ValidationError) {
    console.error(`Invalid ${e.field}: ${e.message}`)
  } else if (e instanceof TransactionFailedError) {
    console.error('TX failed:', e.txnId, e.reason)
  }
}
```

## Architecture

```
de-shop-sdk/
├── DeShopSDK.ts          # Core SDK class (extends EventEmitter)
├── SkinIntelligence.ts   # AI skin classification engine
├── types.ts              # All TypeScript type definitions
├── errors.ts             # Typed error hierarchy
├── events.ts             # Type-safe event emitter
├── cache.ts              # TTL cache with auto-invalidation
├── logger.ts             # Debug logger
├── DeshopsdkClient.ts    # Auto-generated ARC-56 contract client
└── index.ts              # Barrel exports
```

## License

MIT © captainRam1413
