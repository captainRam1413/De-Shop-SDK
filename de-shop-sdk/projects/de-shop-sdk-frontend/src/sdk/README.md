# De-Shop SDK

> AI-Powered Decentralized Game Marketplace SDK for Algorand

Mint, trade, and manage NFT game skins with on-chain escrow on Algorand TestNet/MainNet.

## Installation

```bash
npm install de-shop-sdk
```

### Peer Dependencies

```bash
npm install @algorandfoundation/algokit-utils algosdk
```

## Quick Start

```typescript
import { DeShopSDK } from 'de-shop-sdk'

// Initialize SDK pointing to your backend
const sdk = new DeShopSDK('http://localhost:5000')

// Connect wallet (from your wallet provider)
sdk.connectWallet(walletAddress, transactionSigner)

// Mint an NFT skin
const asset = await sdk.mintNFT({
  wallet: walletAddress,
  skin_name: 'DragonBlade',
  rarity: 'legendary',
})
console.log(`Minted ASA #${asset.asa_id}`)

// Get AI price suggestion
const price = await sdk.getSuggestedPrice('DragonBlade', 'legendary')
console.log(`Suggested: ${price.price} μALGO (${price.confidence}% confidence)`)

// List on marketplace
await sdk.listAsset(walletAddress, asset.asa_id!, price.price)

// View inventory (on-chain + backend merged)
const inventory = await sdk.getPlayerAssets(walletAddress)

// View marketplace (on-chain escrow)
const marketplace = await sdk.getMarketplace()

// Buy from marketplace
const result = await sdk.buyAsset(buyerAddress, assetId)
```

## Features

- **Mint NFTs** — Create Algorand Standard Assets with AI pricing
- **Escrow Marketplace** — List, buy, and cancel with on-chain escrow
- **On-chain Truth** — Inventory reads from real Algorand account holdings
- **Royalty Payments** — Automatic creator royalties on every sale
- **AI Pricing** — ML-backed price suggestions by rarity and demand
- **Cross-platform Bridges** — Minecraft & Steam skin sync

## Smart Contract

Deployed on Algorand TestNet:
- **App ID**: `758710979`
- **Contract Address**: `ASXQPD7RIEJJJKQV6G5H2H34AUGV2CAWPKNWUT4ZITHJJMVBMIJYVMIA2E`

## API Reference

### `new DeShopSDK(backendUrl: string)`

### `sdk.connectWallet(address, signer)`

### `sdk.mintNFT({ wallet, skin_name, rarity })`

### `sdk.listAsset(wallet, assetId, price)`

### `sdk.buyAsset(buyerWallet, assetId)`

### `sdk.cancelListing(wallet, assetId)`

### `sdk.getPlayerAssets(wallet)` — On-chain inventory

### `sdk.getMarketplace()` — On-chain escrow listings

### `sdk.getSuggestedPrice(name, rarity)` — AI pricing

## License

MIT
