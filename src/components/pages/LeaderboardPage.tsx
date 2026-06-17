'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Trophy,
  Medal,
  ArrowUp,
  ArrowDown,
  Download,
  TrendingUp,
  Activity,
  Check,
} from 'lucide-react'

/* ============================================================
 * TYPES
 * ============================================================ */

type Timeframe = '24h' | '7d' | '30d' | 'all'
type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'
type Status = 'active' | 'idle'

interface Trader {
  rank: number
  handle: string
  avatar: string
  volume: number
  trades: number
  winRate: number
  bestRarity: Rarity
  status: Status
  trend7d: number[]
  verified: boolean
  bio: string
}

interface LiveEvent {
  id: string
  ts: string
  type: 'buy' | 'sell' | 'list' | 'mint' | 'cancel' | 'transfer'
  text: string
}

interface TraderTrade {
  time: string
  type: 'BUY' | 'SELL' | 'MINT' | 'LIST' | 'TRANSFER'
  asset: string
  amount: string
}

interface TraderAsset {
  name: string
  rarity: Rarity
  value: string
}

/* ============================================================
 * CONSTANTS
 * ============================================================ */

const TRADER_HANDLES: string[] = [
  '@satoshi.dev',
  '@vitalik.gaming',
  '@whale.algo',
  '@nft_queen',
  '@crypto_lord',
  '@pixel_artist',
  '@block_miner',
  '@degen.trader',
  '@meta_collector',
  '@lunar.dev',
  '@cyber.punk',
  '@atomic_swaps',
  '@algo_maximalist',
  '@shadow.broker',
  '@neon_runner',
  '@flux.capacitor',
  '@quartz.mint',
  '@nova.dust',
  '@echo.lambda',
  '@zero.knowledge',
]

const AVATAR_EMOJIS: string[] = [
  '🦊', '🐺', '🦁', '🐯', '🐻', '🐼', '🦅', '🐉',
  '🦈', '👾', '🤖', '👻', '🐧', '🐙', '🦄', '🐲',
]

const RARITIES: Rarity[] = [
  'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic',
]

const RARITY_COLOR: Record<Rarity, string> = {
  common: 'var(--t-dim)',
  uncommon: 'var(--t-primary)',
  rare: 'var(--t-cyan)',
  epic: 'var(--t-magenta)',
  legendary: 'var(--t-amber)',
  mythic: 'var(--t-red)',
}

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'COMMON',
  uncommon: 'UNCOMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
  mythic: 'MYTHIC',
}

const ASSET_NAMES: string[] = [
  'MythicBlade', 'Cyber Shield', 'Plasma Rifle', 'Quantum Helm',
  'Digital Crown', 'Void Cape', 'Iron Gauntlet', 'Shadow Dagger',
  'Pixel Potion', 'Titan Armor', 'Storm Ring', 'Byte Staff',
  'Chain Mail', 'Data Crystal', 'Flame Scroll', 'Neural Core',
  'Neon Blade', 'Crystal Shard', 'Diamond Sword', 'Enchanted Bow',
]

const BIOS: string[] = [
  'De-Shop power user since 2024 • Owns 47 Mythic assets',
  'Whale accumulator • Top 1% volume on Algorand testnet',
  'Day-trader extraordinaire • 99% win rate streak holder',
  'NFT historian • Curates the rarest pixel collections',
  'Cross-chain bridge veteran • Bridged 500+ assets',
  'Floor-price sniper • Never pays above market',
  'Minting machine • Forged 1,200+ assets this year',
  'Arbitrage specialist • Profits on every spread',
  'Mythic hunter • Tracks legendary drops across chains',
  'Liquidity provider • De-Shop market maker since genesis',
  'Community curator • Featured trader of the month',
  'Bot-free trader • Pure manual execution only',
  'Volume king • 7-figure weekly turnover',
  'Stealth collector • Anonymous high-roller wallet',
  'Neon-drenched degen • YOLOs into every mint',
  'Time-traveling trader • First-mover on every trend',
  'Quartz minter • Specializes in crystalline rarities',
  'Cosmic investor • Stellar portfolio performance',
  'Echo hunter • Mirrors top traders with 1-block delay',
  'Privacy maximalist • Zero-knowledge everything',
]

const EVENT_TEMPLATES: Array<{
  type: LiveEvent['type']
  template: (trader: string, asset: string, amount: string, id: string) => string
}> = [
  { type: 'buy', template: (t, a, p) => `${t} bought ${a} for ${p} ALGO` },
  { type: 'buy', template: (t, a, p) => `${t} sniped ${a} at ${p} ALGO` },
  { type: 'buy', template: (t, a, p) => `${t} acquired ${a} for ${p} ALGO` },
  { type: 'buy', template: (t, a, p) => `${t} won auction for ${a} at ${p} ALGO` },
  { type: 'buy', template: (t, a, p) => `${t} grabbed ${a} for ${p} ALGO` },
  { type: 'buy', template: (t, a, p) => `${t} purchased ${a} (${p} ALGO)` },
  { type: 'sell', template: (t, a, p) => `${t} sold ${a} for ${p} ALGO` },
  { type: 'sell', template: (t, a, p) => `${t} flipped ${a} at ${p} ALGO` },
  { type: 'sell', template: (t, a, p) => `${t} exited ${a} for ${p} ALGO` },
  { type: 'sell', template: (t, a, p) => `${t} liquidated ${a} at ${p} ALGO` },
  { type: 'sell', template: (t, a, p) => `${t} dumped ${a} for ${p} ALGO` },
  { type: 'list', template: (t, a, p) => `${t} listed ${a} at ${p} ALGO` },
  { type: 'list', template: (t, a, p) => `${t} posted ${a} for ${p} ALGO` },
  { type: 'list', template: (t, a, p) => `${t} priced ${a} at ${p} ALGO` },
  { type: 'list', template: (t, a, p) => `${t} added ${a} to market (${p} ALGO)` },
  { type: 'list', template: (t, a, p) => `${t} set floor for ${a} at ${p} ALGO` },
  { type: 'mint', template: (t, a, _p, id) => `${t} minted ${a} #${id}` },
  { type: 'mint', template: (t, a, _p, id) => `${t} forged ${a} #${id}` },
  { type: 'mint', template: (t, a, _p, id) => `${t} created ${a} #${id}` },
  { type: 'mint', template: (t, a, _p, id) => `${t} summoned ${a} #${id}` },
  { type: 'mint', template: (t, a, _p, id) => `${t} crafted ${a} #${id}` },
  { type: 'mint', template: (t, a, _p, id) => `${t} conjured ${a} #${id}` },
  { type: 'cancel', template: (t, a) => `${t} cancelled order for ${a}` },
  { type: 'cancel', template: (t, a) => `${t} delisted ${a}` },
  { type: 'cancel', template: (t, a) => `${t} pulled ${a} from market` },
  { type: 'cancel', template: (t, a) => `${t} revoked listing for ${a}` },
  { type: 'cancel', template: (t, a) => `${t} withdrew ${a}` },
  { type: 'transfer', template: (t, a) => `${t} transferred ${a} to another wallet` },
  { type: 'transfer', template: (t, a) => `${t} bridged ${a} cross-chain` },
  { type: 'transfer', template: (t, a) => `${t} gifted ${a} to a friend`,
  },
]

const EVENT_META: Record<LiveEvent['type'], { icon: string; color: string }> = {
  buy: { icon: '↗', color: 'var(--t-primary)' },
  sell: { icon: '↘', color: 'var(--t-red)' },
  list: { icon: '◆', color: 'var(--t-amber)' },
  mint: { icon: '✦', color: 'var(--t-cyan)' },
  cancel: { icon: '✗', color: 'var(--t-dim)' },
  transfer: { icon: '⇄', color: 'var(--t-magenta)' },
}

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '24h': '24H',
  '7d': '7D',
  '30d': '30D',
  all: 'ALL',
}

// Per-trader per-timeframe multiplier so rankings shuffle across timeframes.
// Deterministic — generated once from a fixed seed.
const TIMEFRAME_FACTORS: Record<Timeframe, number[]> = (() => {
  const seed = 1337
  const rng = mulberry32(seed)
  const factors: Record<Timeframe, number[]> = {
    '24h': TRADER_HANDLES.map(() => 1),
    '7d': TRADER_HANDLES.map(() => 5.5 + rng() * 2.5),
    '30d': TRADER_HANDLES.map(() => 22 + rng() * 10),
    all: TRADER_HANDLES.map(() => 85 + rng() * 70),
  }
  return factors
})()

/* ============================================================
 * UTILITIES
 * ============================================================ */

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0')
}

function nowTimestamp(): string {
  const d = new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

/* ----- Reduced-motion subscription via useSyncExternalStore ----- */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(REDUCED_MOTION_QUERY)
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function getReducedMotionServerSnapshot(): boolean {
  return false
}

function trendIsUp(points: number[]): boolean {
  if (points.length < 2) return true
  // Compare first-half avg vs second-half avg for stability.
  const mid = Math.floor(points.length / 2)
  const firstAvg = points.slice(0, mid).reduce((a, b) => a + b, 0) / mid
  const secondAvg = points.slice(mid).reduce((a, b) => a + b, 0) / (points.length - mid)
  return secondAvg >= firstAvg
}

function generateSparkline(seed: number): number[] {
  const rng = mulberry32(seed)
  const base = 40 + rng() * 40
  return Array.from({ length: 7 }, (_, i) => {
    const drift = (rng() - 0.5) * 30
    const slope = (rng() - 0.45) * i * 4
    return Math.max(5, Math.min(100, base + drift + slope))
  })
}

function pickRarity(rng: () => number): Rarity {
  const r = rng()
  if (r < 0.45) return 'common'
  if (r < 0.7) return 'uncommon'
  if (r < 0.86) return 'rare'
  if (r < 0.95) return 'epic'
  if (r < 0.99) return 'legendary'
  return 'mythic'
}

function generateBaseTrader(handle: string, index: number): Trader {
  const seed = hashString(handle)
  const rng = mulberry32(seed)
  const volume = Math.round(45000 + rng() * 320000)
  const trades = Math.round(60 + rng() * 1240)
  const winRate = Math.round(34 + rng() * 62)
  const bestRarity = pickRarity(rng)
  const status: Status = rng() < 0.72 ? 'active' : 'idle'
  const trend7d = generateSparkline(seed ^ 0x9e3779b9)
  const verified = rng() < 0.35
  const avatar = AVATAR_EMOJIS[index % AVATAR_EMOJIS.length]
  const bio = BIOS[index % BIOS.length]
  return {
    rank: 0,
    handle,
    avatar,
    volume,
    trades,
    winRate,
    bestRarity,
    status,
    trend7d,
    verified,
    bio,
  }
}

function generateDataset(timeframe: Timeframe): Trader[] {
  const factors = TIMEFRAME_FACTORS[timeframe]
  const base = TRADER_HANDLES.map((h, i) => {
    const t = generateBaseTrader(h, i)
    const factor = factors[i]
    return {
      ...t,
      volume: Math.round(t.volume * factor),
      trades: Math.round(t.trades * Math.max(1, factor * 0.8)),
    }
  })
  base.sort((a, b) => b.volume - a.volume)
  base.forEach((t, i) => {
    t.rank = i + 1
  })
  return base
}

function generateTraderDetail(handle: string): {
  trades: TraderTrade[]
  assets: TraderAsset[]
} {
  const rng = mulberry32(hashString(handle + '|detail'))
  const tradeTypes: TraderTrade['type'][] = ['BUY', 'SELL', 'MINT', 'LIST', 'TRANSFER']
  const trades: TraderTrade[] = Array.from({ length: 5 }, () => {
    const type = tradeTypes[Math.floor(rng() * tradeTypes.length)]
    const asset = ASSET_NAMES[Math.floor(rng() * ASSET_NAMES.length)]
    const amount = (1 + rng() * 80).toFixed(2)
    const hoursAgo = Math.floor(rng() * 71) + 1
    return {
      time: hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`,
      type,
      asset,
      amount,
    }
  })
  const assets: TraderAsset[] = Array.from({ length: 3 }, () => ({
    name: ASSET_NAMES[Math.floor(rng() * ASSET_NAMES.length)],
    rarity: pickRarity(rng),
    value: (5 + rng() * 120).toFixed(1),
  }))
  return { trades, assets }
}

function generateLiveEvent(): LiveEvent {
  const rng = mulberry32(Date.now() ^ Math.floor(Math.random() * 1e9))
  const tmpl = EVENT_TEMPLATES[Math.floor(rng() * EVENT_TEMPLATES.length)]
  const trader = TRADER_HANDLES[Math.floor(rng() * TRADER_HANDLES.length)]
  const asset = ASSET_NAMES[Math.floor(rng() * ASSET_NAMES.length)]
  const amount = (1 + rng() * 100).toFixed(rng() < 0.5 ? 0 : 2)
  const id = String(1000 + Math.floor(rng() * 9000))
  return {
    id: `evt-${Date.now()}-${Math.floor(rng() * 1e6)}`,
    ts: nowTimestamp(),
    type: tmpl.type,
    text: tmpl.template(trader, asset, amount, id),
  }
}

function generateInitialEvents(count: number): LiveEvent[] {
  const events: LiveEvent[] = []
  for (let i = 0; i < count; i++) {
    const ev = generateLiveEvent()
    // Stagger timestamps into the past for realism
    const d = new Date(Date.now() - i * 30000)
    events.push({ ...ev, ts: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` })
  }
  return events
}

/* ============================================================
 * SUB-COMPONENTS
 * ============================================================ */

function TrafficLights() {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className="terminal-dot terminal-dot-red" />
      <span className="terminal-dot terminal-dot-yellow" />
      <span className="terminal-dot terminal-dot-green" />
    </div>
  )
}

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const w = 60
  const h = 20
  const pad = 2
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = (w - pad * 2) / (data.length - 1)
  const pts = data.map((v, i) => {
    const x = pad + i * step
    const y = pad + (h - pad * 2) * (1 - (v - min) / range)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const color = up ? 'var(--t-primary)' : 'var(--t-red)'
  return (
    <svg
      width={w}
      height={h}
      role="img"
      aria-label={up ? 'trending up over 7 days' : 'trending down over 7 days'}
      className="inline-block align-middle"
    >
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function RarityBadge({ rarity }: { rarity: Rarity }) {
  const color = RARITY_COLOR[rarity]
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold tracking-wider border"
      style={{
        color,
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      {RARITY_LABEL[rarity]}
    </span>
  )
}

function WinRateCell({ rate }: { rate: number }) {
  const color = rate > 70 ? 'var(--t-primary)' : rate >= 50 ? 'var(--t-amber)' : 'var(--t-red)'
  return (
    <span className="font-bold tabular-nums" style={{ color }}>
      {rate}%
    </span>
  )
}

function StatusDot({ status }: { status: Status }) {
  const color = status === 'active' ? 'var(--t-primary)' : 'var(--t-dim)'
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--t-text)' }}>
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: status === 'active' ? `0 0 6px ${color}` : 'none',
        }}
      />
      {status}
    </span>
  )
}

interface PodiumCardProps {
  trader: Trader
  rank: 1 | 2 | 3
  reducedMotion: boolean
}

function PodiumCard({ trader, rank, reducedMotion }: PodiumCardProps) {
  const up = trendIsUp(trader.trend7d)
  // #1 center: amber (gold), #2 left: cyan (silver), #3 right: magenta (bronze)
  const colorMap: Record<1 | 2 | 3, string> = {
    1: 'var(--t-amber)',
    2: 'var(--t-cyan)',
    3: 'var(--t-magenta)',
  }
  const accent = colorMap[rank]
  const isCenter = rank === 1

  const medalIcon = rank === 1 ? '★' : rank === 2 ? '◆' : '◈'

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (4 - rank) * 0.08 }}
      className={`terminal-card relative ${isCenter ? 'sm:-mt-4 sm:mb-2' : ''}`}
      style={{
        borderColor: accent,
        boxShadow: `0 0 24px color-mix(in srgb, ${accent} 22%, transparent), inset 0 0 0 1px color-mix(in srgb, ${accent} 12%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${accent} 4%, var(--t-surface))`,
      }}
    >
      {/* Chrome header */}
      <div className="terminal-card-header" style={{ borderColor: `color-mix(in srgb, ${accent} 30%, var(--t-border))` }}>
        <TrafficLights />
        <span
          className="text-[11px] ml-2 font-bold tracking-wider"
          style={{ color: accent }}
        >
          {rank === 1 ? 'first.place' : rank === 2 ? 'second.place' : 'third.place'}
        </span>
        <span className="ml-auto text-[10px]" style={{ color: 'var(--t-dim)' }}>
          rank #{rank}
        </span>
      </div>

      {/* Body */}
      <div className="terminal-card-body flex flex-col items-center text-center gap-2 py-5">
        <div
          className="text-3xl leading-none"
          style={{ color: accent, textShadow: `0 0 12px ${accent}` }}
          aria-hidden="true"
        >
          {medalIcon}
        </div>
        <div className="text-4xl leading-none" aria-hidden="true">
          {trader.avatar}
        </div>
        <div
          className="text-lg font-bold tracking-tight flex items-center gap-1.5"
          style={{ color: 'var(--t-primary)' }}
        >
          {trader.handle}
          {trader.verified && (
            <Check
              size={14}
              style={{ color: 'var(--t-cyan)' }}
              strokeWidth={3}
              aria-label="verified"
            />
          )}
        </div>
        <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--t-text)' }}>
          {formatNumber(trader.volume)} <span className="text-xs" style={{ color: 'var(--t-dim)' }}>ALGO</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--t-dim)' }}>
          <span>{formatNumber(trader.trades)} trades</span>
          <span style={{ color: 'var(--t-border)' }}>|</span>
          <WinRateCell rate={trader.winRate} />
        </div>
        <div
          className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 border"
          style={{
            color: up ? 'var(--t-primary)' : 'var(--t-red)',
            borderColor: up ? 'var(--t-primary)' : 'var(--t-red)',
            backgroundColor: `color-mix(in srgb, ${up ? 'var(--t-primary)' : 'var(--t-red)'} 8%, transparent)`,
          }}
        >
          {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {up ? 'UP' : 'DOWN'}
        </div>
        <div className="mt-1">
          <Sparkline data={trader.trend7d} up={up} />
        </div>
      </div>
    </motion.div>
  )
}

interface TraderDetailCardProps {
  trader: Trader
  onClose: () => void
  reducedMotion: boolean
}

function TraderDetailCard({ trader, onClose, reducedMotion }: TraderDetailCardProps) {
  const detail = useMemo(() => generateTraderDetail(trader.handle), [trader.handle])
  const up = trendIsUp(trader.trend7d)

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, x: 12 }}
      transition={{ duration: 0.18 }}
      className="terminal-card"
    >
      <div className="terminal-card-header">
        <TrafficLights />
        <span className="text-[11px] ml-2 text-term-dim">trader_profile.log</span>
        <button
          onClick={onClose}
          aria-label="Close trader profile"
          className="ml-auto text-[11px] px-1.5 py-0.5 hover:opacity-80"
          style={{ color: 'var(--t-red)' }}
        >
          [×] close
        </button>
      </div>
      <div className="terminal-card-body space-y-4">
        {/* Identity */}
        <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: 'var(--t-border)' }}>
          <span className="text-4xl" aria-hidden="true">{trader.avatar}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold" style={{ color: 'var(--t-primary)' }}>
                {trader.handle}
              </span>
              {trader.verified && (
                <Check size={13} style={{ color: 'var(--t-cyan)' }} strokeWidth={3} />
              )}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--t-dim)' }}>
              rank #{trader.rank} • {trader.status}
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="text-[11px] leading-relaxed italic" style={{ color: 'var(--t-text)' }}>
          &gt; {trader.bio}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2 border" style={{ borderColor: 'var(--t-border)' }}>
            <div style={{ color: 'var(--t-dim)' }}>24H VOLUME</div>
            <div className="font-bold tabular-nums" style={{ color: 'var(--t-primary)' }}>
              {formatNumber(trader.volume)} ALGO
            </div>
          </div>
          <div className="p-2 border" style={{ borderColor: 'var(--t-border)' }}>
            <div style={{ color: 'var(--t-dim)' }}>TRADES</div>
            <div className="font-bold tabular-nums" style={{ color: 'var(--t-cyan)' }}>
              {formatNumber(trader.trades)}
            </div>
          </div>
          <div className="p-2 border" style={{ borderColor: 'var(--t-border)' }}>
            <div style={{ color: 'var(--t-dim)' }}>WIN RATE</div>
            <WinRateCell rate={trader.winRate} />
          </div>
          <div className="p-2 border" style={{ borderColor: 'var(--t-border)' }}>
            <div style={{ color: 'var(--t-dim)' }}>BEST RARITY</div>
            <div className="mt-0.5"><RarityBadge rarity={trader.bestRarity} /></div>
          </div>
        </div>

        {/* 7D trend */}
        <div className="flex items-center justify-between p-2 border" style={{ borderColor: 'var(--t-border)' }}>
          <span className="text-[11px]" style={{ color: 'var(--t-dim)' }}>7D TREND</span>
          <div className="flex items-center gap-2">
            <Sparkline data={trader.trend7d} up={up} />
            <span className="text-[11px] font-bold" style={{ color: up ? 'var(--t-primary)' : 'var(--t-red)' }}>
              {up ? '▲' : '▼'}
            </span>
          </div>
        </div>

        {/* Last 5 trades */}
        <div>
          <div className="text-[11px] mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--t-amber)' }}>
            <Activity size={11} /> last_5_trades.log
          </div>
          <div className="border" style={{ borderColor: 'var(--t-border)' }}>
            {detail.trades.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2 py-1 text-[10px] border-b last:border-b-0"
                style={{ borderColor: 'var(--t-border)' }}
              >
                <span style={{ color: 'var(--t-dim)' }} className="w-12 flex-shrink-0">{t.time}</span>
                <span
                  className="font-bold w-12 flex-shrink-0"
                  style={{
                    color:
                      t.type === 'BUY' ? 'var(--t-primary)' :
                      t.type === 'SELL' ? 'var(--t-red)' :
                      t.type === 'MINT' ? 'var(--t-cyan)' :
                      t.type === 'LIST' ? 'var(--t-amber)' :
                      'var(--t-magenta)',
                  }}
                >
                  {t.type}
                </span>
                <span className="flex-1 truncate px-2" style={{ color: 'var(--t-text)' }}>{t.asset}</span>
                <span className="tabular-nums flex-shrink-0" style={{ color: 'var(--t-primary)' }}>{t.amount}A</span>
              </div>
            ))}
          </div>
        </div>

        {/* Best 3 assets */}
        <div>
          <div className="text-[11px] mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--t-magenta)' }}>
            <Trophy size={11} /> best_3_assets.log
          </div>
          <div className="border" style={{ borderColor: 'var(--t-border)' }}>
            {detail.assets.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2 py-1.5 text-[11px] border-b last:border-b-0"
                style={{ borderColor: 'var(--t-border)' }}
              >
                <span style={{ color: 'var(--t-text)' }} className="flex-1 truncate">{a.name}</span>
                <span className="mr-2"><RarityBadge rarity={a.rarity} /></span>
                <span className="tabular-nums" style={{ color: 'var(--t-primary)' }}>{a.value}A</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

interface LiveEventsPanelProps {
  events: LiveEvent[]
}

function LiveEventsPanel({ events }: LiveEventsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="terminal-card flex flex-col" style={{ maxHeight: '720px' }}>
      <div className="terminal-card-header">
        <TrafficLights />
        <span className="text-[11px] ml-2 text-term-dim">live_events.log</span>
        <span className="ml-auto flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--t-primary)' }}>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--t-primary)', boxShadow: '0 0 6px var(--t-primary)' }}
          />
          LIVE
        </span>
      </div>
      <div
        ref={scrollRef}
        className="terminal-card-body flex-1 overflow-y-auto p-2 space-y-1"
        style={{ minHeight: '0' }}
      >
        <AnimatePresence initial={false}>
          {events.map((ev) => {
            const meta = EVENT_META[ev.type]
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, height: 0, x: -8 }}
                animate={{ opacity: 1, height: 'auto', x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 text-[11px] leading-relaxed py-0.5"
                style={{ color: 'var(--t-text)' }}
              >
                <span className="flex-shrink-0" style={{ color: 'var(--t-dim)' }}>
                  [{ev.ts}]
                </span>
                <span className="flex-shrink-0 font-bold" style={{ color: meta.color }}>
                  {meta.icon}
                </span>
                <span className="flex-1 break-words">{ev.text}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ============================================================
 * MAIN COMPONENT
 * ============================================================ */

export default function LeaderboardPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('24h')
  const [secondsAgo, setSecondsAgo] = useState(12)
  const [refreshing, setRefreshing] = useState(false)
  const [events, setEvents] = useState<LiveEvent[]>(() => generateInitialEvents(8))
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null)
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null)
  // Reduced motion preference — subscribed via useSyncExternalStore to avoid
  // setState-in-effect cascading renders.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  )

  // Generate datasets (memoized so they're stable across renders)
  const datasets = useMemo(
    () => ({
      '24h': generateDataset('24h'),
      '7d': generateDataset('7d'),
      '30d': generateDataset('30d'),
      all: generateDataset('all'),
    }),
    [],
  )

  const traders = datasets[timeframe]
  const podium = traders.slice(0, 3)
  const tableRows = traders.slice(3)

  // Selected trader object (lookup from current dataset so rank updates with timeframe)
  const selectedTrader = useMemo(
    () => (selectedHandle ? traders.find((t) => t.handle === selectedHandle) ?? null : null),
    [selectedHandle, traders],
  )

  // Live "updated Xs ago" timer — increments every second, resets at 60s with flash
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsAgo((s) => {
        if (s >= 59) {
          setRefreshing(true)
          window.setTimeout(() => setRefreshing(false), 600)
          return 0
        }
        return s + 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Live events: prepend a new event every 4-6 seconds (random)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      const delay = 4000 + Math.random() * 2000
      timer = setTimeout(() => {
        setEvents((prev) => [generateLiveEvent(), ...prev].slice(0, 12))
        schedule()
      }, delay)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  // CSV export
  const handleExportCsv = useCallback(() => {
    const header = ['Rank', 'Trader', 'Volume (ALGO)', 'Trades', 'Win Rate', 'Best Rarity', 'Status', '7D Trend']
    const rows = traders.map((t) => [
      String(t.rank),
      t.handle,
      String(t.volume),
      String(t.trades),
      `${t.winRate}%`,
      RARITY_LABEL[t.bestRarity],
      t.status,
      t.trend7d.join('|'),
    ])
    const escape = (s: string) => {
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }
    const csv = [header, ...rows]
      .map((row) => row.map(escape).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const d = new Date()
    const dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
    const filename = `leaderboard-${timeframe}-${dateStr}.csv`
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [traders, timeframe])

  // Footer totals
  const totals = useMemo(() => {
    const totalVolume = traders.reduce((sum, t) => sum + t.volume, 0)
    const totalTrades = traders.reduce((sum, t) => sum + t.trades, 0)
    const activeTraders = traders.filter((t) => t.status === 'active').length
    const avgTrade = totalTrades > 0 ? totalVolume / totalTrades : 0
    return { totalVolume, activeTraders, avgTrade }
  }, [traders])

  return (
    <div className="space-y-4 pb-2">
      {/* ===== 1. PAGE HEADER CARD ===== */}
      <div className="terminal-card">
        <div className="terminal-card-header">
          <TrafficLights />
          <span className="text-[11px] ml-2 text-term-dim">
            leaderboard@de-shop:~/top-traders
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="terminal-btn terminal-btn-primary flex items-center gap-1.5 text-[11px]"
              aria-label={`Export ${TIMEFRAME_LABELS[timeframe]} leaderboard as CSV`}
            >
              <Download size={12} />
              export.csv
            </button>
          </div>
        </div>
        <div className="terminal-card-body space-y-2">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-baseline gap-3">
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: 'var(--t-primary)', textShadow: '0 0 8px color-mix(in srgb, var(--t-primary) 40%, transparent)' }}
              >
                top_traders.log
              </h1>
            </div>
            <div
              className="flex items-center gap-2 text-[11px] px-2 py-1 border"
              style={{ borderColor: 'var(--t-border)', color: 'var(--t-dim)' }}
            >
              <Activity size={11} style={{ color: refreshing ? 'var(--t-amber)' : 'var(--t-primary)' }} />
              <span>
                updated <span style={{ color: 'var(--t-primary)' }} className="tabular-nums font-bold">{secondsAgo}</span>s ago
              </span>
              {refreshing && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[10px]"
                  style={{ color: 'var(--t-amber)' }}
                >
                  ⟳ refresh
                </motion.span>
              )}
            </div>
          </div>
          <div className="text-[11px]" style={{ color: 'var(--t-dim)' }}>
            <span style={{ color: 'var(--t-primary)' }}>{'//'}</span> live rankings • algorand testnet • 24h rolling window
          </div>
          {/* Rarity legend */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] pt-1">
            {RARITIES.map((r) => (
              <span key={r} className="inline-flex items-center gap-1" style={{ color: 'var(--t-text)' }}>
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: RARITY_COLOR[r],
                    boxShadow: `0 0 4px ${RARITY_COLOR[r]}`,
                  }}
                />
                <span style={{ color: 'var(--t-dim)' }}>{r}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 2. TIMEFRAME SELECTOR ===== */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px]" style={{ color: 'var(--t-dim)' }}>$ select --timeframe:</span>
        <div className="flex items-center gap-0 border" style={{ borderColor: 'var(--t-border)' }}>
          {(Object.keys(TIMEFRAME_LABELS) as Timeframe[]).map((tf) => {
            const active = tf === timeframe
            return (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                aria-pressed={active}
                aria-label={`Show ${TIMEFRAME_LABELS[tf]} leaderboard`}
                className="px-3 py-1 text-[11px] font-bold tracking-wider transition-all border-r last:border-r-0"
                style={{
                  borderColor: 'var(--t-border)',
                  backgroundColor: active ? 'var(--t-primary)' : 'transparent',
                  color: active ? 'var(--t-bg)' : 'var(--t-dim)',
                  textShadow: active ? 'none' : 'none',
                }}
              >
                {TIMEFRAME_LABELS[tf]}
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== MAIN GRID: podium+table (2/3) | side panel (1/3) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: podium + table */}
        <div className="lg:col-span-2 space-y-4">
          {/* ===== 3. PODIUM ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
            {/* Mobile order: 1, 2, 3 (stacked). Desktop: 2, 1, 3 with 1 tallest in center */}
            {/* #2 left (silver/cyan) */}
            {podium[1] && (
              <div className="order-2 sm:order-1">
                <PodiumCard trader={podium[1]} rank={2} reducedMotion={reducedMotion} />
              </div>
            )}
            {/* #1 center (gold/amber) */}
            {podium[0] && (
              <div className="order-1 sm:order-2">
                <PodiumCard trader={podium[0]} rank={1} reducedMotion={reducedMotion} />
              </div>
            )}
            {/* #3 right (bronze/magenta) */}
            {podium[2] && (
              <div className="order-3 sm:order-3">
                <PodiumCard trader={podium[2]} rank={3} reducedMotion={reducedMotion} />
              </div>
            )}
          </div>

          {/* ===== 4. FULL RANKINGS TABLE (ranks 4-20) ===== */}
          <div
            className={`terminal-card transition-opacity ${refreshing ? 'opacity-60' : 'opacity-100'}`}
          >
            <div className="terminal-card-header">
              <TrafficLights />
              <span className="text-[11px] ml-2 text-term-dim">full_rankings.tsv</span>
              <span className="ml-auto text-[10px]" style={{ color: 'var(--t-dim)' }}>
                showing ranks 4–{traders.length}
              </span>
            </div>
            <div className="terminal-card-body p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--t-elevated)', borderBottom: '1px solid var(--t-border)' }}>
                      <th scope="col" className="px-2 py-2 text-left font-bold tracking-wider" style={{ color: 'var(--t-dim)' }}>#</th>
                      <th scope="col" className="px-2 py-2 text-left font-bold tracking-wider" style={{ color: 'var(--t-dim)' }}>TRADER</th>
                      <th scope="col" className="px-2 py-2 text-right font-bold tracking-wider" style={{ color: 'var(--t-dim)' }}>VOLUME</th>
                      <th scope="col" className="px-2 py-2 text-right font-bold tracking-wider" style={{ color: 'var(--t-dim)' }}>TRADES</th>
                      <th scope="col" className="px-2 py-2 text-right font-bold tracking-wider" style={{ color: 'var(--t-dim)' }}>WIN%</th>
                      <th scope="col" className="px-2 py-2 text-left font-bold tracking-wider" style={{ color: 'var(--t-dim)' }}>BEST</th>
                      <th scope="col" className="px-2 py-2 text-center font-bold tracking-wider" style={{ color: 'var(--t-dim)' }}>7D</th>
                      <th scope="col" className="px-2 py-2 text-left font-bold tracking-wider" style={{ color: 'var(--t-dim)' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((t) => {
                      const up = trendIsUp(t.trend7d)
                      const isSelected = selectedHandle === t.handle
                      const isHovered = hoveredHandle === t.handle
                      return (
                        <tr
                          key={t.handle}
                          onClick={() => setSelectedHandle(t.handle)}
                          onMouseEnter={() => setHoveredHandle(t.handle)}
                          onMouseLeave={() => setHoveredHandle(null)}
                          onFocus={() => setHoveredHandle(t.handle)}
                          onBlur={() => setHoveredHandle(null)}
                          tabIndex={0}
                          role="button"
                          aria-label={`View profile for ${t.handle}`}
                          title={t.bio}
                          className="cursor-pointer transition-colors outline-none"
                          style={{
                            borderBottom: '1px solid var(--t-border)',
                            backgroundColor: isSelected
                              ? 'color-mix(in srgb, var(--t-primary) 8%, transparent)'
                              : isHovered
                                ? 'color-mix(in srgb, var(--t-primary) 4%, transparent)'
                                : 'transparent',
                          }}
                        >
                          <td className="px-2 py-2 tabular-nums font-bold" style={{ color: 'var(--t-dim)' }}>
                            {t.rank}
                          </td>
                          <td className="px-2 py-2 relative">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span className="text-base" aria-hidden="true">{t.avatar}</span>
                              <span className="font-bold" style={{ color: 'var(--t-primary)' }}>{t.handle}</span>
                              {t.verified && (
                                <Check
                                  size={12}
                                  style={{ color: 'var(--t-cyan)' }}
                                  strokeWidth={3}
                                  aria-label="verified trader"
                                />
                              )}
                            </div>
                            {/* Hover tooltip */}
                            {isHovered && (
                              <div
                                className="hidden sm:block absolute z-20 top-full left-2 mt-1 p-2 border text-[10px] leading-relaxed pointer-events-none"
                                style={{
                                  backgroundColor: 'var(--t-surface)',
                                  borderColor: 'var(--t-border)',
                                  color: 'var(--t-text)',
                                  width: '240px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                }}
                                role="tooltip"
                              >
                                <span style={{ color: 'var(--t-primary)' }}>&gt;</span>{' '}
                                <span className="italic">{t.bio}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums font-bold" style={{ color: 'var(--t-primary)' }}>
                            {formatNumber(t.volume)}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums" style={{ color: 'var(--t-text)' }}>
                            {formatNumber(t.trades)}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <WinRateCell rate={t.winRate} />
                          </td>
                          <td className="px-2 py-2">
                            <RarityBadge rarity={t.bestRarity} />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Sparkline data={t.trend7d} up={up} />
                          </td>
                          <td className="px-2 py-2">
                            <StatusDot status={t.status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: side panel (live events OR selected trader detail) */}
        <div className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedTrader ? (
              <TraderDetailCard
                key="detail"
                trader={selectedTrader}
                onClose={() => setSelectedHandle(null)}
                reducedMotion={reducedMotion}
              />
            ) : (
              <LiveEventsPanel key="events" events={events} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ===== STICKY TOTALS FOOTER ===== */}
      <div
        className="sticky bottom-0 z-10 terminal-card"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--t-surface) 92%, transparent)',
          backdropFilter: 'blur(6px)',
        }}
      >
        <div className="terminal-card-body py-2.5">
          <div className="flex items-center justify-between gap-4 flex-wrap text-[11px]">
            <div className="flex items-center gap-2" style={{ color: 'var(--t-dim)' }}>
              <TrendingUp size={12} style={{ color: 'var(--t-primary)' }} />
              <span>total {TIMEFRAME_LABELS[timeframe]} volume:</span>
              <span className="font-bold tabular-nums" style={{ color: 'var(--t-primary)' }}>
                {formatNumber(totals.totalVolume)} ALGO
              </span>
            </div>
            <div className="flex items-center gap-2" style={{ color: 'var(--t-dim)' }}>
              <Activity size={12} style={{ color: 'var(--t-cyan)' }} />
              <span>active traders:</span>
              <span className="font-bold tabular-nums" style={{ color: 'var(--t-cyan)' }}>
                {totals.activeTraders} / {traders.length}
              </span>
            </div>
            <div className="flex items-center gap-2" style={{ color: 'var(--t-dim)' }}>
              <Medal size={12} style={{ color: 'var(--t-amber)' }} />
              <span>avg trade:</span>
              <span className="font-bold tabular-nums" style={{ color: 'var(--t-amber)' }}>
                {formatNumber(Math.round(totals.avgTrade))} ALGO
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
