import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SEED_ASSETS = [
  { assetId: 1001, name: 'Neon Blade', description: 'A cyberpunk-themed blade', rarity: 'legendary', type: 'weapon', price: 45.5, confidence: 96.2, emoji: '⚔️', seller: 'ALGO7X...3K9M', owner: '', listed: true },
  { assetId: 1002, name: 'Cyber Shield', description: 'Reactive energy shield', rarity: 'epic', type: 'weapon', price: 28.0, confidence: 91.5, emoji: '🛡️', seller: 'ALGO2A...8N4P', owner: '', listed: true },
  { assetId: 1003, name: 'Quantum Helm', description: 'Neural-interface helmet', rarity: 'rare', type: 'character', price: 12.5, confidence: 85.3, emoji: '⛑️', seller: 'ALGO9B...1Q7R', owner: '', listed: true },
  { assetId: 1004, name: 'Digital Crown', description: 'Royal digital artifact', rarity: 'legendary', type: 'accessory', price: 50.0, confidence: 97.8, emoji: '👑', seller: 'ALGO5C...6T2W', owner: '', listed: true },
  { assetId: 1005, name: 'Phase Dagger', description: 'Phase-shifting dagger', rarity: 'rare', type: 'weapon', price: 8.5, confidence: 82.1, emoji: '🗡️', seller: 'ALGO3D...9V5X', owner: '', listed: true },
  { assetId: 1006, name: 'Void Cape', description: 'Invisibility cape', rarity: 'epic', type: 'character', price: 22.0, confidence: 89.4, emoji: '🧥', seller: 'ALGO8E...2Y8Z', owner: '', listed: true },
  { assetId: 1007, name: 'Pixel Sword', description: 'Retro pixel sword', rarity: 'common', type: 'weapon', price: 1.2, confidence: 72.5, emoji: '⚔️', seller: 'ALGO1F...5B3A', owner: '', listed: true },
  { assetId: 1008, name: 'Nano Armor', description: 'Nanotech body armor', rarity: 'epic', type: 'character', price: 35.0, confidence: 93.7, emoji: '🦺', seller: 'ALGO6G...8D6C', owner: '', listed: true },
  { assetId: 1009, name: 'Cryo Ring', description: 'Ice-element ring', rarity: 'rare', type: 'accessory', price: 9.0, confidence: 80.6, emoji: '💍', seller: 'ALGO4H...1G9E', owner: '', listed: true },
  { assetId: 1010, name: 'Shadow Gauntlet', description: 'Dark-powered gauntlet', rarity: 'legendary', type: 'weapon', price: 42.0, confidence: 95.1, emoji: '🧤', seller: 'ALGO7I...4J2G', owner: '', listed: true },
  { assetId: 1011, name: 'Data Visor', description: 'HUD visor overlay', rarity: 'common', type: 'accessory', price: 0.8, confidence: 68.9, emoji: '🥽', seller: 'ALGO2J...7M5I', owner: '', listed: true },
  { assetId: 1012, name: 'Fusion Core', description: 'Energy core reactor', rarity: 'rare', type: 'accessory', price: 15.0, confidence: 87.3, emoji: '🔮', seller: 'ALGO9K...0P8K', owner: '', listed: true },
  { assetId: 1013, name: 'Plasma Rifle', description: 'Plasma-powered rifle', rarity: 'epic', type: 'weapon', price: 30.0, confidence: 90.8, emoji: '🔫', seller: 'ALGO5L...3S1M', owner: '', listed: true },
  { assetId: 1014, name: 'Ghost Skin', description: 'Transparent character skin', rarity: 'rare', type: 'character', price: 11.0, confidence: 83.4, emoji: '👻', seller: 'ALGO3M...6V4O', owner: '', listed: true },
  { assetId: 1015, name: 'Iron Pendant', description: 'Basic iron pendant', rarity: 'common', type: 'accessory', price: 0.5, confidence: 60.2, emoji: '📿', seller: 'ALGO8N...9Y7Q', owner: '', listed: true },
  { assetId: 1016, name: 'Obsidian Staff', description: 'Dark obsidian staff', rarity: 'legendary', type: 'weapon', price: 48.0, confidence: 94.5, emoji: '🪄', seller: 'ALGO6O...2Z0S', owner: '', listed: true },
]

const SEED_TRANSACTIONS = [
  { type: 'mint', assetId: 1001, assetName: 'Neon Blade', from: '', to: 'ALGO7X...3K9M', amount: 45.5, status: 'confirmed', txHash: '0xa3f2...b8c1' },
  { type: 'mint', assetId: 1002, assetName: 'Cyber Shield', from: '', to: 'ALGO2A...8N4P', amount: 28.0, status: 'confirmed', txHash: '0x7d1e...f4a2' },
  { type: 'buy', assetId: 1003, assetName: 'Quantum Helm', from: 'ALGO9B...1Q7R', to: 'ALGO4H...1G9E', amount: 12.5, status: 'confirmed', txHash: '0xc5b8...d3e6' },
  { type: 'list', assetId: 1004, assetName: 'Digital Crown', from: 'ALGO5C...6T2W', to: '', amount: 50.0, status: 'confirmed', txHash: '0x1a9f...e7b4' },
  { type: 'sell', assetId: 1005, assetName: 'Phase Dagger', from: 'ALGO3D...9V5X', to: 'ALGO8E...2Y8Z', amount: 8.5, status: 'confirmed', txHash: '0xf2c6...a1d8' },
  { type: 'transfer', assetId: 1006, assetName: 'Void Cape', from: 'ALGO8E...2Y8Z', to: 'ALGO1F...5B3A', amount: 0, status: 'confirmed', txHash: '0x4e7b...c9f2' },
  { type: 'mint', assetId: 1007, assetName: 'Pixel Sword', from: '', to: 'ALGO1F...5B3A', amount: 1.2, status: 'confirmed', txHash: '0x8c3d...b5a4' },
  { type: 'buy', assetId: 1008, assetName: 'Nano Armor', from: 'ALGO6G...8D6C', to: 'ALGO3M...6V4O', amount: 35.0, status: 'confirmed', txHash: '0x2f9a...d8c7' },
  { type: 'list', assetId: 1009, assetName: 'Cryo Ring', from: 'ALGO4H...1G9E', to: '', amount: 9.0, status: 'confirmed', txHash: '0x6b1e...a3f5' },
  { type: 'mint', assetId: 1010, assetName: 'Shadow Gauntlet', from: '', to: 'ALGO7I...4J2G', amount: 42.0, status: 'confirmed', txHash: '0xd4c2...e9b1' },
  { type: 'buy', assetId: 1011, assetName: 'Data Visor', from: 'ALGO2J...7M5I', to: 'ALGO5L...3S1M', amount: 0.8, status: 'pending', txHash: '0x9a5f...c2d4' },
  { type: 'mint', assetId: 1012, assetName: 'Fusion Core', from: '', to: 'ALGO9K...0P8K', amount: 15.0, status: 'confirmed', txHash: '0x3e8b...f7a6' },
  { type: 'sell', assetId: 1013, assetName: 'Plasma Rifle', from: 'ALGO5L...3S1M', to: 'ALGO8N...9Y7Q', amount: 30.0, status: 'confirmed', txHash: '0x7c2d...b4e8' },
  { type: 'cancel', assetId: 1014, assetName: 'Ghost Skin', from: 'ALGO3M...6V4O', to: '', amount: 11.0, status: 'confirmed', txHash: '0x1f6a...d9c3' },
  { type: 'mint', assetId: 1016, assetName: 'Obsidian Staff', from: '', to: 'ALGO6O...2Z0S', amount: 48.0, status: 'confirmed', txHash: '0x5b9e...a2f7' },
]

const SEED_PLUGINS = [
  { name: 'De-Shop Minecraft Plugin', description: 'Full-featured Minecraft server integration with Bukkit/Spigot support. Enables in-game NFT marketplace, skin application, and wallet commands.', version: '2.1.0', engine: 'minecraft', language: 'Java', status: 'stable', downloads: 12847, rating: 4.8, fileUrl: '/downloads/deshop-minecraft-2.1.0.jar', sourceUrl: 'https://github.com/captainRam1413/De-Shop-SDK', fileSize: '2.4 MB', checksum: 'sha256:a1b2c3d4e5f6' },
  { name: 'De-Shop Unity SDK', description: 'Complete Unity package for integrating De-Shop marketplace into your Unity game. Supports Unity 2021.3+ and includes prefabs and UI components.', version: '1.8.0', engine: 'unity', language: 'C#', status: 'stable', downloads: 8432, rating: 4.6, fileUrl: '/downloads/deshop-unity-1.8.0.unitypackage', sourceUrl: 'https://github.com/captainRam1413/De-Shop-SDK', fileSize: '5.1 MB', checksum: 'sha256:b2c3d4e5f6a7' },
  { name: 'De-Shop Unreal Plugin', description: 'Unreal Engine 5 plugin for De-Shop SDK integration. Includes C++ classes for wallet connection, NFT management, and marketplace UI.', version: '1.3.0', engine: 'unreal', language: 'C++', status: 'beta', downloads: 3219, rating: 4.2, fileUrl: '/downloads/deshop-unreal-1.3.0.zip', sourceUrl: 'https://github.com/captainRam1413/De-Shop-SDK', fileSize: '3.8 MB', checksum: 'sha256:c3d4e5f6a7b8' },
  { name: 'De-Shop Web3 Bridge', description: 'TypeScript SDK for Node.js and browser environments. Provides wallet-agnostic interface for Algorand dApp integration.', version: '1.0.0', engine: 'web', language: 'TypeScript', status: 'stable', downloads: 5621, rating: 4.7, fileUrl: '/downloads/deshop-web3-1.0.0.tgz', sourceUrl: 'https://github.com/captainRam1413/De-Shop-SDK', fileSize: '1.2 MB', checksum: 'sha256:d4e5f6a7b8c9' },
  { name: 'De-Shop AI Pricing Engine', description: 'Machine learning-powered pricing engine for NFT valuation. Uses on-chain data and market trends to suggest optimal listing prices.', version: '0.9.0', engine: 'web', language: 'Python', status: 'beta', downloads: 2189, rating: 4.0, fileUrl: '/downloads/deshop-ai-pricing-0.9.0.tar.gz', sourceUrl: 'https://github.com/captainRam1413/De-Shop-SDK', fileSize: '8.7 MB', checksum: 'sha256:e5f6a7b8c9d0' },
  { name: 'De-Shop Steam Integration', description: 'Steam overlay integration for displaying and trading NFTs. Supports Steam inventory sync and escrow-based trading.', version: '1.1.0', engine: 'web', language: 'TypeScript', status: 'stable', downloads: 4326, rating: 4.5, fileUrl: '/downloads/deshop-steam-1.1.0.tgz', sourceUrl: 'https://github.com/captainRam1413/De-Shop-SDK', fileSize: '2.1 MB', checksum: 'sha256:f6a7b8c9d0e1' },
]

export async function POST() {
  try {
    const existingAssets = await db.asset.count()

    if (existingAssets > 0) {
      return NextResponse.json({ message: 'Database already seeded', assetCount: existingAssets })
    }

    const assets = await db.asset.createMany({ data: SEED_ASSETS })
    const transactions = await db.transaction.createMany({ data: SEED_TRANSACTIONS })
    const plugins = await db.plugin.createMany({ data: SEED_PLUGINS })

    return NextResponse.json({
      message: 'Database seeded successfully',
      assets: assets.count,
      transactions: transactions.count,
      plugins: plugins.count,
    })
  } catch (error) {
    console.error('Error seeding database:', error)
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 })
  }
}
