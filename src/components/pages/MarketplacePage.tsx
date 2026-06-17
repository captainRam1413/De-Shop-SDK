'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  X,
  ShoppingCart,
  Tag,
  Sparkles,
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
type SortOption = 'price-asc' | 'price-desc' | 'newest' | 'rarity'
type ViewMode = 'grid' | 'list'

interface MarketplaceAsset {
  id: string
  name: string
  emoji: string
  rarity: Rarity
  price: number
  confidence: number
  seller: string
  description: string
  listedAt: string
  priceHistory: { day: string; price: number }[]
}

/* ===== RARITY CONFIG ===== */

const RARITY_CONFIG: Record<Rarity, { color: string; textColor: string; borderColor: string; glow: string; bg: string; weight: number }> = {
  Common: { color: '#888888', textColor: 'text-term-dim', borderColor: 'border-[#888888]/50', glow: '', bg: 'rgba(136, 136, 136, 0.08)', weight: 1 },
  Rare: { color: '#00D4FF', textColor: 'text-term-cyan', borderColor: 'border-[#00D4FF]/50', glow: 'glow-cyan', bg: 'rgba(0, 212, 255, 0.08)', weight: 2 },
  Epic: { color: '#FF00FF', textColor: 'text-term-magenta', borderColor: 'border-[#FF00FF]/50', glow: 'glow-magenta', bg: 'rgba(255, 0, 255, 0.08)', weight: 3 },
  Legendary: { color: '#FFB800', textColor: 'text-term-amber', borderColor: 'border-[#FFB800]/50', glow: 'glow-amber', bg: 'rgba(255, 184, 0, 0.08)', weight: 4 },
}

/* ===== MOCK DATA ===== */

const MOCK_ASSETS: MarketplaceAsset[] = [
  {
    id: '0xA1B2', name: 'Neon Blade', emoji: '🗡️', rarity: 'Legendary', price: 42.5, confidence: 94,
    seller: '0x7F3a...9c1D', description: 'A legendary plasma-infused blade forged in the digital crucible. Cuts through any blockchain defense.',
    listedAt: '2h ago',
    priceHistory: [{ day: 'Mon', price: 38 }, { day: 'Tue', price: 40 }, { day: 'Wed', price: 39 }, { day: 'Thu', price: 41 }, { day: 'Fri', price: 42 }, { day: 'Sat', price: 44 }, { day: 'Sun', price: 42.5 }],
  },
  {
    id: '0xC3D4', name: 'Cyber Shield', emoji: '🛡️', rarity: 'Epic', price: 18.0, confidence: 88,
    seller: '0x2B8e...4fA2', description: 'Reinforced quantum-barrier shield. Absorbs 80% of incoming digital attacks.',
    listedAt: '4h ago',
    priceHistory: [{ day: 'Mon', price: 15 }, { day: 'Tue', price: 16 }, { day: 'Wed', price: 17 }, { day: 'Thu', price: 16.5 }, { day: 'Fri', price: 17.5 }, { day: 'Sat', price: 18 }, { day: 'Sun', price: 18 }],
  },
  {
    id: '0xE5F6', name: 'Quantum Helm', emoji: '⛑️', rarity: 'Epic', price: 22.3, confidence: 85,
    seller: '0x9C4d...1eB3', description: 'Helmet equipped with quantum processors for enhanced battlefield awareness.',
    listedAt: '1h ago',
    priceHistory: [{ day: 'Mon', price: 20 }, { day: 'Tue', price: 21 }, { day: 'Wed', price: 19.5 }, { day: 'Thu', price: 21.5 }, { day: 'Fri', price: 22 }, { day: 'Sat', price: 23 }, { day: 'Sun', price: 22.3 }],
  },
  {
    id: '0xA7B8', name: 'Digital Crown', emoji: '👑', rarity: 'Legendary', price: 50.0, confidence: 97,
    seller: '0x5E2f...8aD4', description: 'The ultimate symbol of digital sovereignty. Grants governance rights across all realms.',
    listedAt: '30m ago',
    priceHistory: [{ day: 'Mon', price: 45 }, { day: 'Tue', price: 47 }, { day: 'Wed', price: 48 }, { day: 'Thu', price: 49 }, { day: 'Fri', price: 50 }, { day: 'Sat', price: 52 }, { day: 'Sun', price: 50 }],
  },
  {
    id: '0xC9D0', name: 'Plasma Rifle', emoji: '🔫', rarity: 'Rare', price: 8.5, confidence: 76,
    seller: '0x1A3b...7cE5', description: 'Standard-issue plasma weapon with overclocked fire rate module.',
    listedAt: '6h ago',
    priceHistory: [{ day: 'Mon', price: 7 }, { day: 'Tue', price: 7.5 }, { day: 'Wed', price: 8 }, { day: 'Thu', price: 8.2 }, { day: 'Fri', price: 8.5 }, { day: 'Sat', price: 9 }, { day: 'Sun', price: 8.5 }],
  },
  {
    id: '0xE1F2', name: 'Void Cape', emoji: '🧥', rarity: 'Epic', price: 15.8, confidence: 82,
    seller: '0x6D4c...3fA9', description: 'A cape woven from void energy. Grants invisibility in shadow realms.',
    listedAt: '3h ago',
    priceHistory: [{ day: 'Mon', price: 14 }, { day: 'Tue', price: 14.5 }, { day: 'Wed', price: 15 }, { day: 'Thu', price: 15.2 }, { day: 'Fri', price: 15.8 }, { day: 'Sat', price: 16 }, { day: 'Sun', price: 15.8 }],
  },
  {
    id: '0x3A4B', name: 'Iron Gauntlet', emoji: '🧤', rarity: 'Common', price: 1.2, confidence: 65,
    seller: '0x8F7e...2bC6', description: 'Basic iron hand protection. Reliable but unremarkable.',
    listedAt: '12h ago',
    priceHistory: [{ day: 'Mon', price: 1.0 }, { day: 'Tue', price: 1.1 }, { day: 'Wed', price: 1.15 }, { day: 'Thu', price: 1.2 }, { day: 'Fri', price: 1.2 }, { day: 'Sat', price: 1.25 }, { day: 'Sun', price: 1.2 }],
  },
  {
    id: '0x5C6D', name: 'Shadow Dagger', emoji: '🔪', rarity: 'Rare', price: 6.7, confidence: 72,
    seller: '0x3B9a...5dE1', description: 'A swift blade infused with shadow essence. Critical hit chance +25%.',
    listedAt: '5h ago',
    priceHistory: [{ day: 'Mon', price: 5.5 }, { day: 'Tue', price: 6 }, { day: 'Wed', price: 6.3 }, { day: 'Thu', price: 6.5 }, { day: 'Fri', price: 6.7 }, { day: 'Sat', price: 7 }, { day: 'Sun', price: 6.7 }],
  },
  {
    id: '0x7E8F', name: 'Pixel Potion', emoji: '🧪', rarity: 'Common', price: 0.5, confidence: 60,
    seller: '0x4C2d...9aF8', description: 'Restores 50 HP. Basic healing item found in the starter zone.',
    listedAt: '1d ago',
    priceHistory: [{ day: 'Mon', price: 0.4 }, { day: 'Tue', price: 0.45 }, { day: 'Wed', price: 0.48 }, { day: 'Thu', price: 0.5 }, { day: 'Fri', price: 0.5 }, { day: 'Sat', price: 0.52 }, { day: 'Sun', price: 0.5 }],
  },
  {
    id: '0x9A0B', name: 'Titan Armor', emoji: '🦺', rarity: 'Legendary', price: 35.0, confidence: 91,
    seller: '0xD1e3...6bC7', description: 'Mythical armor forged by titans. Provides 95% damage reduction.',
    listedAt: '45m ago',
    priceHistory: [{ day: 'Mon', price: 30 }, { day: 'Tue', price: 31 }, { day: 'Wed', price: 32 }, { day: 'Thu', price: 33 }, { day: 'Fri', price: 34 }, { day: 'Sat', price: 35 }, { day: 'Sun', price: 35 }],
  },
  {
    id: '0xB2C3', name: 'Storm Ring', emoji: '💍', rarity: 'Rare', price: 5.2, confidence: 70,
    seller: '0xA7f8...3eD2', description: 'A ring that channels storm energy. Lightning damage +40%.',
    listedAt: '8h ago',
    priceHistory: [{ day: 'Mon', price: 4.5 }, { day: 'Tue', price: 4.8 }, { day: 'Wed', price: 5 }, { day: 'Thu', price: 5.1 }, { day: 'Fri', price: 5.2 }, { day: 'Sat', price: 5.5 }, { day: 'Sun', price: 5.2 }],
  },
  {
    id: '0xD4E5', name: 'Byte Staff', emoji: '🪄', rarity: 'Epic', price: 19.9, confidence: 86,
    seller: '0xE2c1...7fA4', description: 'A staff that manipulates raw bytecode. Casts system-level spells.',
    listedAt: '2h ago',
    priceHistory: [{ day: 'Mon', price: 17 }, { day: 'Tue', price: 18 }, { day: 'Wed', price: 18.5 }, { day: 'Thu', price: 19 }, { day: 'Fri', price: 19.5 }, { day: 'Sat', price: 20 }, { day: 'Sun', price: 19.9 }],
  },
  {
    id: '0xF6A7', name: 'Chain Mail', emoji: '⛓️', rarity: 'Common', price: 2.0, confidence: 63,
    seller: '0x1D5f...4bE9', description: 'Standard chain mail with interlocking blockchain links.',
    listedAt: '10h ago',
    priceHistory: [{ day: 'Mon', price: 1.8 }, { day: 'Tue', price: 1.9 }, { day: 'Wed', price: 1.95 }, { day: 'Thu', price: 2 }, { day: 'Fri', price: 2 }, { day: 'Sat', price: 2.1 }, { day: 'Sun', price: 2 }],
  },
  {
    id: '0x1829', name: 'Data Crystal', emoji: '💎', rarity: 'Rare', price: 9.8, confidence: 78,
    seller: '0x6A3c...8dF1', description: 'Crystallized data matrix. Stores 1TB of encrypted information.',
    listedAt: '7h ago',
    priceHistory: [{ day: 'Mon', price: 8 }, { day: 'Tue', price: 8.5 }, { day: 'Wed', price: 9 }, { day: 'Thu', price: 9.5 }, { day: 'Fri', price: 9.8 }, { day: 'Sat', price: 10 }, { day: 'Sun', price: 9.8 }],
  },
  {
    id: '0x3B4C', name: 'Flame Scroll', emoji: '📜', rarity: 'Common', price: 0.8, confidence: 61,
    seller: '0xB9e2...5cD7', description: 'A basic scroll containing the flame spell. Good for beginners.',
    listedAt: '18h ago',
    priceHistory: [{ day: 'Mon', price: 0.7 }, { day: 'Tue', price: 0.75 }, { day: 'Wed', price: 0.78 }, { day: 'Thu', price: 0.8 }, { day: 'Fri', price: 0.8 }, { day: 'Sat', price: 0.82 }, { day: 'Sun', price: 0.8 }],
  },
  {
    id: '0x5D6E', name: 'Neural Core', emoji: '🧠', rarity: 'Legendary', price: 48.0, confidence: 96,
    seller: '0xC4a7...2eB3', description: 'An advanced neural processing core. Unlocks AI companion features.',
    listedAt: '15m ago',
    priceHistory: [{ day: 'Mon', price: 42 }, { day: 'Tue', price: 44 }, { day: 'Wed', price: 45 }, { day: 'Thu', price: 46 }, { day: 'Fri', price: 47 }, { day: 'Sat', price: 48 }, { day: 'Sun', price: 48 }],
  },
]

/* ===== FLOOR PRICE HELPER ===== */

function getFloorPrices(assets: MarketplaceAsset[]) {
  const floors: Partial<Record<Rarity, number>> = {}
  for (const a of assets) {
    if (floors[a.rarity] === undefined || a.price < floors[a.rarity]!) {
      floors[a.rarity] = a.price
    }
  }
  return floors
}

/* ===== CUSTOM TERMINAL TOOLTIP ===== */

function TerminalTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-[#1E1E1E] border border-[#444444] p-2 rounded-sm shadow-lg font-terminal text-xs">
      <div className="text-term-dim mb-1">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="text-term-green">
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value} ALGO
        </div>
      ))}
    </div>
  )
}

/* ===== CONFIDENCE BAR ===== */

function ConfidenceBar({ value }: { value: number }) {
  const filled = Math.round(value / 5)
  const empty = 20 - filled
  return (
    <span className="text-[11px] font-terminal">
      <span className="text-term-green">{'█'.repeat(filled)}</span>
      <span className="text-term-dim">{'░'.repeat(empty)}</span>
      <span className="text-term-amber ml-1">{value}%</span>
    </span>
  )
}

/* ===== DETAIL MODAL ===== */

function DetailModal({ asset, onClose }: { asset: MarketplaceAsset; onClose: () => void }) {
  const { walletConnected, addNotification, setShowWalletModal } = useDeShopStore()
  const config = RARITY_CONFIG[asset.rarity]
  const rarityScore = config.weight * 25

  const handleBuy = () => {
    if (!walletConnected) {
      setShowWalletModal(true)
      return
    }
    addNotification('success', `Purchased ${asset.name} for ${asset.price} ALGO`)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg terminal-card z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Chrome */}
        <div className="terminal-card-header">
          <TrafficLights />
          <span className="terminal-title">asset_detail.log</span>
          <button onClick={onClose} className="ml-auto terminal-dot terminal-dot-red cursor-pointer hover:opacity-80 flex-shrink-0" />
        </div>

        <div className="terminal-card-body bg-[#1E1E1E] space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Asset Header */}
          <div className="flex items-start gap-4">
            <div className="text-5xl flex-shrink-0 w-16 h-16 flex items-center justify-center bg-[#2D2D2D] border border-[#444444] rounded-sm">
              {asset.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-term-dim font-terminal mb-1">ID: {asset.id}</div>
              <div className={`text-lg font-terminal font-bold text-term-green glow-green`}>{asset.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-1.5 py-0.5 rounded-sm text-[10px] font-terminal font-bold border ${config.textColor}`}
                  style={{ borderColor: config.color, backgroundColor: config.bg }}
                >
                  {asset.rarity.toUpperCase()}
                </span>
                <span className="text-term-amber text-sm font-terminal">◆ {asset.price} ALGO</span>
              </div>
            </div>
          </div>

          {/* Price Chart */}
          <div>
            <div className="text-term-dim text-[10px] font-terminal mb-2">PRICE HISTORY (7D)</div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={asset.priceHistory} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="modalPriceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={config.color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                <XAxis dataKey="day" tick={{ fill: '#888888', fontSize: 9, fontFamily: 'monospace' }} axisLine={{ stroke: '#444444' }} tickLine={{ stroke: '#444444' }} />
                <YAxis tick={{ fill: '#888888', fontSize: 9, fontFamily: 'monospace' }} axisLine={{ stroke: '#444444' }} tickLine={{ stroke: '#444444' }} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip content={<TerminalTooltip />} />
                <Area type="monotone" dataKey="price" stroke={config.color} strokeWidth={2} fill="url(#modalPriceGrad)" name="Price" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* AI Confidence */}
          <div>
            <div className="text-term-dim text-[10px] font-terminal mb-1">AI CONFIDENCE</div>
            <ConfidenceBar value={asset.confidence} />
          </div>

          {/* Rarity Score */}
          <div>
            <div className="text-term-dim text-[10px] font-terminal mb-1">RARITY SCORE</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-3 bg-[#2D2D2D] border border-[#444444] rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all"
                  style={{ width: `${rarityScore}%`, backgroundColor: config.color, opacity: 0.7 }}
                />
              </div>
              <span className={`text-xs font-terminal ${config.textColor}`}>{rarityScore}/100</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="text-term-dim text-[10px] font-terminal mb-1">DESCRIPTION</div>
            <div className="text-term-text text-xs font-terminal leading-relaxed">{asset.description}</div>
          </div>

          {/* Seller Info */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-term-dim text-[10px] font-terminal">SELLER</div>
              <div className="text-term-cyan text-xs font-terminal">{asset.seller}</div>
            </div>
            <div>
              <div className="text-term-dim text-[10px] font-terminal">LISTED</div>
              <div className="text-term-text text-xs font-terminal">{asset.listedAt}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleBuy}
              className="terminal-btn terminal-btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Buy for {asset.price} ALGO</span>
            </button>
            <button
              onClick={() => { addNotification('info', `Listing ${asset.name}...`); onClose() }}
              className="terminal-btn flex items-center justify-center gap-2 border-term-cyan/50 text-term-cyan hover:bg-[#1E1E1E]"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ===== GRID CARD ===== */

function GridCard({ asset, onClick, index }: { asset: MarketplaceAsset; onClick: () => void; index: number }) {
  const config = RARITY_CONFIG[asset.rarity]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className={`terminal-card cursor-pointer border ${config.borderColor} hover:border-[${config.color}] transition-all group`}
      onClick={onClick}
      style={{
        boxShadow: undefined,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 12px ${config.color}33`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = undefined
      }}
    >
      {/* Card Chrome Header */}
      <div className="terminal-card-header py-1.5 px-3">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
        <span className="terminal-title text-[10px] text-left ml-2">{asset.id}</span>
      </div>

      {/* Card Body */}
      <div className="p-4 bg-[#1E1E1E]">
        {/* Emoji Icon */}
        <div className="text-4xl mb-3 text-center py-2">{asset.emoji}</div>

        {/* Name */}
        <div className="text-term-green text-sm font-terminal font-bold text-center mb-2 glow-green">
          {asset.name}
        </div>

        {/* Price + Confidence */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-term-amber text-xs font-terminal">◆ {asset.price} ALGO</span>
          <span className="text-term-dim text-[10px] font-terminal">{asset.confidence}% conf.</span>
        </div>

        {/* Rarity Badge */}
        <div className="flex items-center justify-center mb-2">
          <span
            className={`px-2 py-0.5 rounded-sm text-[10px] font-terminal font-bold border ${config.textColor}`}
            style={{ borderColor: config.color, backgroundColor: config.bg }}
          >
            {asset.rarity.toUpperCase()}
          </span>
        </div>

        {/* Seller */}
        <div className="text-center">
          <span className="text-term-dim text-[10px] font-terminal">seller: {asset.seller}</span>
        </div>
      </div>
    </motion.div>
  )
}

/* ===== LIST ROW ===== */

function ListRow({ asset, index }: { asset: MarketplaceAsset; index: number }) {
  const { walletConnected, addNotification, setShowWalletModal } = useDeShopStore()
  const config = RARITY_CONFIG[asset.rarity]

  const handleBuy = () => {
    if (!walletConnected) {
      setShowWalletModal(true)
      return
    }
    addNotification('success', `Purchased ${asset.name} for ${asset.price} ALGO`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className="flex items-center gap-2 py-2 px-3 text-[11px] font-terminal border-b border-[#333333] hover:bg-[#252525] transition-colors"
    >
      <span className="text-term-dim w-14 flex-shrink-0">{asset.id}</span>
      <span className="text-term-green flex-1 min-w-0 truncate">{asset.name}</span>
      <span className={`w-16 text-center flex-shrink-0 ${config.textColor}`} style={{ color: config.color }}>{asset.rarity}</span>
      <span className="text-term-amber w-20 text-right flex-shrink-0">◆ {asset.price} ALGO</span>
      <span className="text-term-dim w-14 text-right flex-shrink-0">{asset.confidence}%</span>
      <span className="text-term-dim w-20 text-right flex-shrink-0 truncate">{asset.seller}</span>
      <button
        onClick={handleBuy}
        className="terminal-btn terminal-btn-primary text-[10px] px-2 py-1 flex-shrink-0"
      >
        Buy
      </button>
    </motion.div>
  )
}

/* ===== API FETCH HELPERS ===== */

interface ApiAsset {
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

function mapApiAsset(a: ApiAsset): MarketplaceAsset {
  const rarity = (a.rarity.charAt(0).toUpperCase() + a.rarity.slice(1)) as Rarity
  return {
    id: `0x${a.assetId.toString(16).toUpperCase().slice(0, 4)}`,
    name: a.name,
    emoji: a.emoji || '📦',
    rarity,
    price: a.price,
    confidence: a.confidence,
    seller: a.seller,
    description: a.description,
    listedAt: a.mintedAt ? new Date(a.mintedAt).toLocaleDateString() : '',
    priceHistory: [
      { day: 'Mon', price: a.price * 0.9 },
      { day: 'Tue', price: a.price * 0.93 },
      { day: 'Wed', price: a.price * 0.95 },
      { day: 'Thu', price: a.price * 0.97 },
      { day: 'Fri', price: a.price * 0.99 },
      { day: 'Sat', price: a.price * 1.02 },
      { day: 'Sun', price: a.price },
    ],
  }
}

/* ===== MAIN MARKETPLACE PAGE ===== */

export default function MarketplacePage() {
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'All'>('All')
  const [sort, setSort] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedAsset, setSelectedAsset] = useState<MarketplaceAsset | null>(null)
  const [apiAssets, setApiAssets] = useState<MarketplaceAsset[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch('/api/market')
      if (res.ok) {
        const data = await res.json()
        if (data.assets && data.assets.length > 0) {
          setApiAssets(data.assets.map(mapApiAsset))
        }
      }
    } catch {
      // fallback to mock data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMarket()
  }, [fetchMarket])

  // Use API data if available, otherwise fall back to mock
  const baseAssets = apiAssets.length > 0 ? apiAssets : MOCK_ASSETS

  const filteredAssets = useMemo(() => {
    let result = [...baseAssets]

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.rarity.toLowerCase().includes(q)
      )
    }

    // Rarity filter
    if (rarityFilter !== 'All') {
      result = result.filter((a) => a.rarity === rarityFilter)
    }

    // Sort
    switch (sort) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'newest':
        // Keep original order (simulated newest first by listing time)
        break
      case 'rarity':
        result.sort((a, b) => RARITY_CONFIG[b.rarity].weight - RARITY_CONFIG[a.rarity].weight)
        break
    }

    return result
  }, [search, rarityFilter, sort, baseAssets])

  const floorPrices = useMemo(() => getFloorPrices(baseAssets), [baseAssets])

  return (
    <div className="space-y-4">
      {/* Terminal Window Header */}
      <div className="terminal-card">
        <div className="terminal-chrome">
          <TrafficLights />
          <span className="terminal-title font-terminal">marketplace@de-shop:~/market</span>
        </div>
        <div className="px-4 py-3 flex items-center gap-2 bg-[#1E1E1E]">
          <span className="prompt-prefix text-sm">$</span>
          <span className="text-term-cyan text-sm font-terminal glow-cyan">./marketplace</span>
          <span className="text-term-dim text-xs font-terminal">--browse --filter --trade</span>
          {loading && <span className="text-term-amber text-[10px] font-terminal animate-pulse">[loading...]</span>}
          <span className="cursor-blink" />
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="terminal-card">
        <div className="terminal-card-header">
          <TrafficLights />
          <span className="terminal-title">search_and_filter.sh</span>
          <Sparkles className="w-3.5 h-3.5 text-term-amber" />
        </div>
        <div className="p-4 bg-[#1E1E1E] space-y-3">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-term-green text-sm font-terminal">$</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="search --query"
                className="terminal-input pl-7"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-term-dim" />
            </div>

            {/* Rarity Filter */}
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value as Rarity | 'All')}
              className="terminal-input w-auto min-w-[120px]"
            >
              <option value="All">All Rarities</option>
              <option value="Common">Common</option>
              <option value="Rare">Rare</option>
              <option value="Epic">Epic</option>
              <option value="Legendary">Legendary</option>
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="terminal-input w-auto min-w-[140px]"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price Low→High</option>
              <option value="price-desc">Price High→Low</option>
              <option value="rarity">Rarity</option>
            </select>

            {/* View Toggle */}
            <div className="flex border border-[#444444] rounded-sm overflow-hidden flex-shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-xs font-terminal transition-colors ${viewMode === 'grid' ? 'bg-[#3D3D3D] text-term-green' : 'bg-[#2D2D2D] text-term-dim hover:text-term-text'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-terminal transition-colors ${viewMode === 'list' ? 'bg-[#3D3D3D] text-term-green' : 'bg-[#2D2D2D] text-term-dim hover:text-term-text'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Floor Price Summary */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-term-dim text-[10px] font-terminal">FLOOR:</span>
            {(['Common', 'Rare', 'Epic', 'Legendary'] as Rarity[]).map((r) => {
              const cfg = RARITY_CONFIG[r]
              const floor = floorPrices[r]
              return (
                <div key={r} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                  <span className={`text-[10px] font-terminal ${cfg.textColor}`} style={{ color: cfg.color }}>
                    {r}
                  </span>
                  <span className="text-term-amber text-[10px] font-terminal">
                    {floor !== undefined ? `${floor} ALGO` : '—'}
                  </span>
                </div>
              )
            })}
            <span className="text-term-dim text-[10px] font-terminal ml-auto">
              {filteredAssets.length} result{filteredAssets.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Content: Grid or List */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredAssets.map((asset, i) => (
              <GridCard
                key={asset.id}
                asset={asset}
                onClick={() => setSelectedAsset(asset)}
                index={i}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="terminal-card"
          >
            <div className="terminal-card-header">
              <TrafficLights />
              <span className="terminal-title">listings_table.log</span>
              <ArrowUpDown className="w-3.5 h-3.5 text-term-dim" />
            </div>
            <div className="bg-[#1E1E1E] max-h-[500px] overflow-y-auto">
              {/* Table Header */}
              <div className="flex items-center gap-2 py-2 px-3 text-[10px] font-terminal text-term-dim border-b border-[#444444] bg-[#252525] sticky top-0 z-10">
                <span className="w-14 flex-shrink-0">ID</span>
                <span className="flex-1">NAME</span>
                <span className="w-16 text-center flex-shrink-0">RARITY</span>
                <span className="w-20 text-right flex-shrink-0">PRICE</span>
                <span className="w-14 text-right flex-shrink-0">CONF</span>
                <span className="w-20 text-right flex-shrink-0">SELLER</span>
                <span className="w-12 text-center flex-shrink-0">ACTION</span>
              </div>
              {/* Table Body */}
              {filteredAssets.map((asset, i) => (
                <ListRow key={asset.id} asset={asset} index={i} />
              ))}
              {filteredAssets.length === 0 && (
                <div className="py-8 text-center text-term-dim text-xs font-terminal">
                  No assets found matching your criteria.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewMode === 'grid' && filteredAssets.length === 0 && (
        <div className="terminal-card">
          <div className="p-8 text-center text-term-dim text-xs font-terminal">
            No assets found matching your criteria.
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedAsset && (
          <DetailModal
            asset={selectedAsset}
            onClose={() => setSelectedAsset(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
