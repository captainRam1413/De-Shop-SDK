'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Package,
  Sparkles,
  Shield,
  ArrowRightLeft,
  Zap,
  Coins,
  Crown,
  Clock,
  Flame,
} from 'lucide-react'
import { useDeShopStore } from '@/store/useDeShopStore'

/* ===== TRAFFIC LIGHT DOTS ===== */

function TrafficLights() {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className="terminal-dot terminal-dot-red" />
      <span className="terminal-dot terminal-dot-yellow" />
      <span className="terminal-dot terminal-dot-green" />
    </div>
  )
}

/* ===== TYPES ===== */

type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary'
type ItemType = 'Weapon' | 'Character' | 'Accessory'

interface InventoryAsset {
  id: string
  name: string
  emoji: string
  rarity: Rarity
  type: ItemType
  acquiredDate: string
  currentValue: number
  equipped: boolean
}

/* ===== RARITY CONFIG ===== */

const RARITY_CONFIG: Record<Rarity, { color: string; textColor: string; borderColor: string; glow: string; glowClass: string; bg: string }> = {
  Common: { color: '#888888', textColor: 'text-term-dim', borderColor: 'border-[#888888]/50', glow: '', glowClass: 'terminal-card-glow', bg: 'rgba(136, 136, 136, 0.08)' },
  Rare: { color: '#00D4FF', textColor: 'text-term-cyan', borderColor: 'border-[#00D4FF]/50', glow: 'glow-cyan', glowClass: 'terminal-card-cyan-glow', bg: 'rgba(0, 212, 255, 0.08)' },
  Epic: { color: '#FF00FF', textColor: 'text-term-magenta', borderColor: 'border-[#FF00FF]/50', glow: 'glow-magenta', glowClass: 'terminal-card-magenta-glow', bg: 'rgba(255, 0, 255, 0.08)' },
  Legendary: { color: '#FFB800', textColor: 'text-term-amber', borderColor: 'border-[#FFB800]/50', glow: 'glow-amber', glowClass: 'terminal-card-amber-glow', bg: 'rgba(255, 184, 0, 0.08)' },
}

/* ===== MOCK DATA ===== */

const MOCK_INVENTORY: InventoryAsset[] = [
  { id: '0xA1B2', name: 'Neon Blade', emoji: '🗡️', rarity: 'Legendary', type: 'Weapon', acquiredDate: '2026-06-15', currentValue: 42.5, equipped: true },
  { id: '0xC3D4', name: 'Cyber Shield', emoji: '🛡️', rarity: 'Epic', type: 'Accessory', acquiredDate: '2026-06-12', currentValue: 18.0, equipped: true },
  { id: '0xE5F6', name: 'Quantum Helm', emoji: '⛑️', rarity: 'Epic', type: 'Accessory', acquiredDate: '2026-06-10', currentValue: 22.3, equipped: false },
  { id: '0x5C6D', name: 'Shadow Dagger', emoji: '🔪', rarity: 'Rare', type: 'Weapon', acquiredDate: '2026-06-08', currentValue: 6.7, equipped: false },
  { id: '0x7E8F', name: 'Pixel Potion', emoji: '🧪', rarity: 'Common', type: 'Accessory', acquiredDate: '2026-06-16', currentValue: 0.5, equipped: false },
  { id: '0xF6A7', name: 'Chain Mail', emoji: '⛓️', rarity: 'Common', type: 'Accessory', acquiredDate: '2026-06-05', currentValue: 2.0, equipped: false },
  { id: '0x9A0B', name: 'Titan Armor', emoji: '🦺', rarity: 'Legendary', type: 'Character', acquiredDate: '2026-06-14', currentValue: 35.0, equipped: true },
  { id: '0xB2C3', name: 'Storm Ring', emoji: '💍', rarity: 'Rare', type: 'Accessory', acquiredDate: '2026-06-11', currentValue: 5.2, equipped: false },
]

/* ===== SUMMARY STATS ===== */

function SummaryStats({ inventory }: { inventory: InventoryAsset[] }) {
  const totalValue = inventory.reduce((sum, a) => sum + a.currentValue, 0)
  const rarest = inventory.reduce((best, a) => {
    const weights: Record<Rarity, number> = { Common: 1, Rare: 2, Epic: 3, Legendary: 4 }
    return weights[a.rarity] > weights[best.rarity] ? a : best
  }, inventory[0])
  const latest = inventory.reduce((latest, a) => {
    return new Date(a.acquiredDate) > new Date(latest.acquiredDate) ? a : latest
  }, inventory[0])

  const stats = [
    { label: 'Total Items', value: inventory.length.toString(), icon: Package, color: 'text-term-green' },
    { label: 'Total Value', value: `${totalValue.toFixed(1)} ALGO`, icon: Coins, color: 'text-term-amber' },
    { label: 'Rarest Item', value: rarest.name, icon: Crown, color: 'text-term-magenta' },
    { label: 'Latest Acquired', value: latest.name, icon: Clock, color: 'text-term-cyan' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.25 }}
            className="terminal-card terminal-card-glow"
          >
            <div className="terminal-card-header py-1.5 px-3">
              <Icon className={`w-3 h-3 ${stat.color}`} />
              <span className="terminal-title text-[10px] text-left ml-2">{stat.label.toLowerCase().replace(/\s/g, '_')}</span>
            </div>
            <div className="p-3 bg-[#1E1E1E]">
              <div className={`text-sm font-terminal font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ===== INVENTORY CARD ===== */

function InventoryCard({ asset, index }: { asset: InventoryAsset; index: number }) {
  const { walletConnected, addNotification, setShowWalletModal } = useDeShopStore()
  const config = RARITY_CONFIG[asset.rarity]

  const handleEquip = () => {
    addNotification('success', `${asset.equipped ? 'Unequipped' : 'Equipped'} ${asset.name}`)
  }

  const handleList = () => {
    if (!walletConnected) {
      setShowWalletModal(true)
      return
    }
    addNotification('info', `Listing ${asset.name} for ${asset.currentValue} ALGO...`)
  }

  const handleTransfer = () => {
    if (!walletConnected) {
      setShowWalletModal(true)
      return
    }
    addNotification('info', `Initiating transfer of ${asset.name}...`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className={`terminal-card ${config.glowClass} ${asset.equipped ? 'border-term-green/60' : ''}`}
      style={asset.equipped ? { boxShadow: '0 0 12px rgba(51, 255, 51, 0.15)' } : undefined}
    >
      {/* Card Chrome Header */}
      <div className="terminal-card-header py-1.5 px-3">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
        <span className="terminal-title text-[10px] text-left ml-2">{asset.name}</span>
        {asset.equipped && (
          <span className="text-[9px] font-terminal text-term-green bg-term-selection px-1.5 py-0.5 rounded-sm flex-shrink-0">
            EQUIPPED
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 bg-[#1E1E1E]">
        <div className="flex items-start gap-3">
          {/* Emoji Icon */}
          <div className="text-3xl flex-shrink-0 w-12 h-12 flex items-center justify-center bg-[#2D2D2D] border border-[#444444] rounded-sm">
            {asset.emoji}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-term-green text-sm font-terminal font-bold glow-green">{asset.name}</div>

            {/* Rarity Badge */}
            <div className="mt-1">
              <span
                className={`px-1.5 py-0.5 rounded-sm text-[10px] font-terminal font-bold border ${config.textColor}`}
                style={{ borderColor: config.color, backgroundColor: config.bg }}
              >
                {asset.rarity.toUpperCase()}
              </span>
            </div>

            {/* Details */}
            <div className="mt-2 space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] font-terminal">
                <Clock className="w-2.5 h-2.5 text-term-dim" />
                <span className="text-term-dim">Acquired:</span>
                <span className="text-term-text">{asset.acquiredDate}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-terminal">
                <Coins className="w-2.5 h-2.5 text-term-dim" />
                <span className="text-term-dim">Value:</span>
                <span className="text-term-amber">◆ {asset.currentValue} ALGO</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleEquip}
            className={`terminal-btn flex-1 flex items-center justify-center gap-1.5 text-[10px] ${asset.equipped ? 'border-term-amber/50 text-term-amber' : 'terminal-btn-primary'}`}
          >
            <Shield className="w-3 h-3" />
            <span>{asset.equipped ? 'Unequip' : 'Equip'}</span>
          </button>
          <button
            onClick={handleList}
            className="terminal-btn flex-1 flex items-center justify-center gap-1.5 text-[10px] border-term-cyan/50 text-term-cyan"
          >
            <Zap className="w-3 h-3" />
            <span>List</span>
          </button>
          <button
            onClick={handleTransfer}
            className="terminal-btn flex-1 flex items-center justify-center gap-1.5 text-[10px] border-term-magenta/50 text-term-magenta"
          >
            <ArrowRightLeft className="w-3 h-3" />
            <span>Transfer</span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ===== MINT SECTION ===== */

function MintSection() {
  const { walletConnected, addNotification, setShowWalletModal } = useDeShopStore()
  const [name, setName] = useState('')
  const [rarity, setRarity] = useState<Rarity>('Common')
  const [type, setType] = useState<ItemType>('Weapon')
  const [minting, setMinting] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleMint = () => {
    if (!walletConnected) {
      setShowWalletModal(true)
      return
    }
    if (!name.trim()) {
      addNotification('warning', 'Please enter an NFT name')
      return
    }

    setMinting(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setMinting(false)
          setName('')
          setRarity('Common')
          setType('Weapon')
          addNotification('success', `Forged "${name}" as ${rarity} ${type} NFT!`)
          return 0
        }
        return prev + 10
      })
    }, 200)
  }

  const filledBlocks = Math.round(progress / 5)
  const emptyBlocks = 20 - filledBlocks

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.3 }}
      className="terminal-card terminal-card-amber-glow"
    >
      <div className="terminal-card-header">
        <TrafficLights />
        <span className="terminal-title">mint_forge.log</span>
        <Flame className="w-3.5 h-3.5 text-term-amber" />
      </div>
      <div className="p-4 bg-[#1E1E1E] space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="prompt-prefix text-sm">$</span>
          <span className="text-term-green text-xs font-terminal">forge --mint-nft</span>
          <span className="text-term-dim text-[10px] font-terminal">--rarity --type</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Name Input */}
          <div>
            <label className="text-term-dim text-[10px] font-terminal mb-1 block">NAME</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="enter_name"
              className="terminal-input"
              disabled={minting}
            />
          </div>

          {/* Rarity Select */}
          <div>
            <label className="text-term-dim text-[10px] font-terminal mb-1 block">RARITY</label>
            <select
              value={rarity}
              onChange={(e) => setRarity(e.target.value as Rarity)}
              className="terminal-input"
              disabled={minting}
            >
              <option value="Common">Common</option>
              <option value="Rare">Rare</option>
              <option value="Epic">Epic</option>
              <option value="Legendary">Legendary</option>
            </select>
          </div>

          {/* Type Select */}
          <div>
            <label className="text-term-dim text-[10px] font-terminal mb-1 block">TYPE</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ItemType)}
              className="terminal-input"
              disabled={minting}
            >
              <option value="Weapon">Weapon</option>
              <option value="Character">Character</option>
              <option value="Accessory">Accessory</option>
            </select>
          </div>
        </div>

        {/* Mint Button & Progress */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <button
            onClick={handleMint}
            disabled={minting}
            className="terminal-btn terminal-btn-primary flex items-center gap-2"
          >
            {minting ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Forging...</span>
              </>
            ) : (
              <>
                <Flame className="w-3.5 h-3.5" />
                <span>Forge NFT</span>
              </>
            )}
          </button>

          {minting && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-terminal text-term-green">
                {'█'.repeat(filledBlocks)}
              </span>
              <span className="text-[11px] font-terminal text-term-dim">
                {'░'.repeat(emptyBlocks)}
              </span>
              <span className="text-term-amber text-[11px] font-terminal">{progress}%</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ===== API FETCH HELPERS ===== */

interface ApiInventoryAsset {
  id: string
  assetId: number
  name: string
  description: string
  rarity: string
  type: string
  price: number
  confidence: number
  emoji: string
  seller: string
  owner: string
  listed: boolean
  mintedAt: string
}

function mapApiInventoryAsset(a: ApiInventoryAsset, index: number): InventoryAsset {
  const rarity = (a.rarity.charAt(0).toUpperCase() + a.rarity.slice(1)) as Rarity
  const type = (a.type.charAt(0).toUpperCase() + a.type.slice(1)) as ItemType
  return {
    id: `0x${a.assetId.toString(16).toUpperCase().slice(0, 4)}`,
    name: a.name,
    emoji: a.emoji || '📦',
    rarity,
    type,
    acquiredDate: a.mintedAt ? a.mintedAt.split('T')[0] : '',
    currentValue: a.price,
    equipped: index < 3, // first 3 items are "equipped" for demo
  }
}

/* ===== MAIN INVENTORY PAGE ===== */

export default function InventoryPage() {
  const [apiInventory, setApiInventory] = useState<InventoryAsset[]>([])
  const [loading, setLoading] = useState(true)

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/assets?owner=user_wallet')
      if (res.ok) {
        const data = await res.json()
        if (data && data.length > 0) {
          setApiInventory(data.map(mapApiInventoryAsset))
        }
      }
    } catch {
      // fallback to mock data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const inventory = apiInventory.length > 0 ? apiInventory : MOCK_INVENTORY

  return (
    <div className="space-y-4">
      {/* Terminal Window Header */}
      <div className="terminal-card">
        <div className="terminal-chrome">
          <TrafficLights />
          <span className="terminal-title font-terminal">inventory@de-shop:~/inventory</span>
        </div>
        <div className="px-4 py-3 flex items-center gap-2 bg-[#1E1E1E]">
          <span className="prompt-prefix text-sm">$</span>
          <span className="text-term-amber text-sm font-terminal glow-amber">./inventory</span>
          <span className="text-term-dim text-xs font-terminal">--list --forge --manage</span>
          {loading && <span className="text-term-amber text-[10px] font-terminal animate-pulse">[fetching inventory...]</span>}
          <span className="blink-cursor" />
        </div>
      </div>

      {/* Summary Stats */}
      <SummaryStats inventory={inventory} />

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inventory.map((asset, i) => (
          <InventoryCard key={asset.id} asset={asset} index={i} />
        ))}
      </div>

      {/* Mint Section */}
      <MintSection />
    </div>
  )
}
