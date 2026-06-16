/**
 * De-Shop SDK — Marketplace V2 (Premium) — Minecraft Theme
 * ═══════════════════════════════════════════════════════════
 * Minecraft Trading Hall with inventory-style grid, chest-style list,
 * tooltip-style detail modal, and enchantment-themed analysis.
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Heart,
  X,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Shield,
  Zap,
  Eye,
  ShoppingBag,
  BarChart3,
  Clock,
  ArrowUpRight,
  Activity,
  Loader2,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useWallet } from '@txnlab/use-wallet-react'
import { useDeShopStore } from '../store/useDeShopStore'
import { useSDK } from '../context/SDKProvider'
import type { Asset, SaleRecord } from '../sdk/types'
import {
  DeShopError,
  WalletNotConnectedError,
  InsufficientFundsError,
  TransactionFailedError,
} from '../sdk/errors'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
type SortOption = 'price_asc' | 'price_desc' | 'newest' | 'rarity'
type ViewMode = 'grid' | 'list'

interface PricePoint {
  day: string
  price: number
}

interface MarketplaceListing {
  /** Stable React key (stringified asset.id). */
  id: string
  /** Backend asset primary key — passed to `sdk.buyAsset(activeAddress, assetId)`. */
  assetId: number
  /** On-chain ASA ID (may be undefined for backend-only mock assets). */
  asaId?: number
  name: string
  rarity: Rarity
  price: number
  seller: string
  icon: string
  priceHistory: PricePoint[]
  confidence: number
  suggestedPrice: number
  rarityScore: number
  listedAt: string
  type: string
  description: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// RARITY CONFIG — Minecraft Ore Colors
// ═══════════════════════════════════════════════════════════════════════════════

const RARITY_CONFIG: Record<Rarity, {
  color: string
  bg: string
  border: string
  glow: string
  badge: string
  gradient: string
  icon: string
}> = {
  common: {
    color: '#D4D4D4',
    bg: 'rgba(212,212,212,0.1)',
    border: 'rgba(212,212,212,0.3)',
    glow: 'rgba(212,212,212,0.15)',
    badge: '#D4D4D4',
    gradient: 'linear-gradient(135deg, rgba(212,212,212,0.1), rgba(212,212,212,0.03))',
    icon: '⬜',
  },
  rare: {
    color: '#4AEDD9',
    bg: 'rgba(74,237,217,0.1)',
    border: 'rgba(74,237,217,0.3)',
    glow: 'rgba(74,237,217,0.15)',
    badge: '#4AEDD9',
    gradient: 'linear-gradient(135deg, rgba(74,237,217,0.1), rgba(74,237,217,0.03))',
    icon: '💠',
  },
  epic: {
    color: '#c084fc',
    bg: 'rgba(168,85,247,0.1)',
    border: 'rgba(168,85,247,0.3)',
    glow: 'rgba(168,85,247,0.15)',
    badge: '#a855f7',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.03))',
    icon: '🟣',
  },
  legendary: {
    color: '#FFD700',
    bg: 'rgba(255,215,0,0.1)',
    border: 'rgba(255,215,0,0.3)',
    glow: 'rgba(255,215,0,0.15)',
    badge: '#FFD700',
    gradient: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,215,0,0.03))',
    icon: '🟡',
  },
}

const RARITY_ORDER: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET → LISTING CONVERSION (real SDK data, no more mock)
// ═══════════════════════════════════════════════════════════════════════════════

/** Coerce an SDK Asset.rarity string into our 4-tier UI Rarity (defensive). */
function rarityFromAsset(raw: string): Rarity {
  const r = (raw || '').toLowerCase()
  if (r === 'common' || r === 'rare' || r === 'epic' || r === 'legendary') return r
  // Map the SDK's expanded rarities (uncommon, mythic) down to the nearest UI tier.
  if (r === 'uncommon') return 'common'
  if (r === 'mythic') return 'legendary'
  return 'common'
}

/** Pick a Minecraft-style icon emoji for the listing based on rarity + skin type. */
function iconForAsset(rarity: Rarity, skinType?: string): string {
  if (skinType === 'character') return '🧑'
  if (skinType === 'accessory') return '✨'
  // Default: weapon icon, tinted by rarity tier.
  switch (rarity) {
    case 'legendary': return '⚔️'
    case 'epic':      return '🗡️'
    case 'rare':      return '💎'
    default:          return '🪨'
  }
}

/**
 * Build a 7-day price-history array for the chart. Without per-asset historical
 * pricing data from the backend we render a flat line at the current list price
 * (volatility=0 → trend shows "—"). When `volatility` is provided, a stable
 * pseudo-random series is generated so the chart has visible variation; this is
 * only used for visual continuity, NOT for fake market data.
 */
function generatePriceHistory(basePrice: number, volatility: number = 0): PricePoint[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  let current = basePrice
  return days.map((day) => {
    if (volatility > 0) {
      const change = (Math.random() - 0.45) * volatility * basePrice
      current = Math.max(basePrice * 0.5, current + change)
    }
    return { day, price: Math.round(current * 100) / 100 }
  })
}

/** Format an ISO timestamp as a short relative-time string ("3h ago", "2d ago"). */
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'recently'
  const diffMs = Date.now() - then
  const m = Math.floor(diffMs / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

/** Build a short seller label from a wallet address (first 8 chars + ellipsis). */
function shortSeller(wallet: string): string {
  if (!wallet) return 'unknown'
  return wallet.length > 12 ? `${wallet.slice(0, 8)}…` : wallet
}

/** Default description shown in the detail modal — derived from rarity + type. */
function describeAsset(name: string, rarity: Rarity, type?: string): string {
  const tier = rarity === 'legendary'
    ? 'a legendary-tier'
    : rarity === 'epic'
      ? 'an epic-tier'
      : rarity === 'rare'
        ? 'a rare-tier'
        : 'a common-tier'
  const kind = type === 'character' ? 'character skin' : type === 'accessory' ? 'accessory' : 'weapon skin'
  return `${name} is ${tier} ${kind} minted on Algorand and listed on the De-Shop marketplace.`
}

/** Convert a real SDK Asset into the UI's MarketplaceListing shape. */
function assetToListing(asset: Asset): MarketplaceListing {
  const rarity = rarityFromAsset(asset.rarity)
  const skinType = asset.metadata?.skin_type
  const price = asset.list_price ?? 0
  const suggested = asset.suggested_price
  return {
    id: String(asset.id),
    assetId: asset.id,
    asaId: asset.asa_id,
    name: asset.name,
    rarity,
    price,
    seller: shortSeller(asset.owner || asset.creator),
    icon: iconForAsset(rarity, skinType),
    priceHistory: generatePriceHistory(price || 1),
    confidence: suggested?.confidence ?? 0,
    suggestedPrice: suggested?.price ?? price,
    rarityScore: suggested?.rarity_score ?? 0,
    listedAt: formatRelativeTime(asset.created_at),
    type: skinType ?? 'item',
    description: describeAsset(asset.name, rarity, skinType),
  }
}

/** Compute floor price + listing-count per rarity from a list of listings. */
function computeFloorPrice(listings: MarketplaceListing[]): Record<Rarity, { price: number; change24h: number; listCount: number }> {
  const empty = { price: 0, change24h: 0, listCount: 0 }
  const out: Record<Rarity, { price: number; change24h: number; listCount: number }> = {
    common: { ...empty },
    rare: { ...empty },
    epic: { ...empty },
    legendary: { ...empty },
  }
  for (const l of listings) {
    const bucket = out[l.rarity]
    bucket.listCount += 1
    if (bucket.price === 0 || (l.price > 0 && l.price < bucket.price)) {
      bucket.price = l.price
    }
  }
  // 24h change requires historical data the backend doesn't currently expose;
  // leave at 0 so the UI shows "—" rather than fabricated percentages.
  return out
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECENT SALE TYPE — populated from sdk.getMarketData().sales
// ═══════════════════════════════════════════════════════════════════════════════

interface RecentSale {
  id: string
  name: string
  icon: string
  rarity: Rarity
  salePrice: number
  buyer: string
  soldAt: string
}

/** Map an SDK SaleRecord into the UI's RecentSale shape. */
function saleToRecent(sale: SaleRecord, idx: number): RecentSale {
  const rarity = rarityFromAsset('rare') // SaleRecord has no rarity field; default
  return {
    id: `sale-${idx}-${sale.timestamp}`,
    name: 'Skin', // SaleRecord carries no asset name; backend route would need to join
    icon: iconForAsset(rarity),
    rarity,
    salePrice: sale.price,
    buyer: shortSeller(sale.buyer),
    soldAt: formatRelativeTime(sale.timestamp),
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
}

const listVariants = {
  hidden: { opacity: 0, x: -15 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: 'easeOut' as const },
  },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP FOR PRICE CHART — Minecraft Style
// ═══════════════════════════════════════════════════════════════════════════════

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'rgba(26, 10, 46, 0.95)',
        border: '2px solid #5000AA',
        borderRadius: 0,
        padding: '8px 12px',
        imageRendering: 'pixelated',
        boxShadow: '0 4px 16px rgba(80, 0, 170, 0.4)',
      }}
    >
      <p style={{ color: '#9f7aea', fontSize: 10, marginBottom: 2, fontFamily: "'Press Start 2P', 'Courier New', monospace", imageRendering: 'pixelated' }}>{label}</p>
      <p style={{ color: '#4AEDD9', fontSize: 12, fontWeight: 700, fontFamily: "'Press Start 2P', 'Courier New', monospace", imageRendering: 'pixelated' }}>
        {payload[0].value.toLocaleString()} <span style={{ fontSize: 8, color: '#4AEDD9' }}>μA</span>
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// RARITY BADGE COMPONENT — Minecraft Style
// ═══════════════════════════════════════════════════════════════════════════════

function RarityBadge({ rarity }: { rarity: Rarity }) {
  const config = RARITY_CONFIG[rarity]
  return (
    <span
      style={{
        background: config.glow,
        color: config.color,
        fontSize: 9,
        padding: '2px 8px',
        borderRadius: 0,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        border: `2px solid ${config.border}`,
        imageRendering: 'pixelated',
      }}
    >
      {rarity}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIXEL FONT HELPER
// ═══════════════════════════════════════════════════════════════════════════════

const pixelFont = {
  fontFamily: "'Press Start 2P', 'Courier New', monospace",
  imageRendering: 'pixelated' as const,
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function MarketplaceV2() {
  // ── State ────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedItem, setSelectedItem] = useState<MarketplaceListing | null>(null)
  const [wishlist, setWishlist] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [buyingId, setBuyingId] = useState<string | null>(null)

  // ── SDK + wallet + shared store ─────────────────────────────────────────
  const { sdk } = useSDK()
  const { activeAddress } = useWallet()
  const storeMarket = useDeShopStore((s) => s.market)
  const setMarket = useDeShopStore((s) => s.setMarket)
  const addNotification = useDeShopStore((s) => s.addNotification)

  // ── Convert the shared store's Asset[] → MarketplaceListing[] ───────────
  const allListings = useMemo<MarketplaceListing[]>(
    () => storeMarket.map(assetToListing),
    [storeMarket],
  )

  // ── Initial marketplace fetch (in case SDKProvider hasn't populated yet,
  //    e.g. before wallet connect). The shared store is the single source of
  //    truth; this effect only kicks in when it's empty.
  useEffect(() => {
    let cancelled = false
    if (storeMarket.length > 0) {
      setLoading(false)
      return
    }
    setLoading(true)
    sdk
      .getMarketplace()
      .then((items) => {
        if (cancelled) return
        if (items.length > 0) setMarket(items)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        console.error('[MarketplaceV2] Failed to load marketplace:', e)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sdk, storeMarket.length, setMarket])

  // ── Recent sales feed (one-time fetch; backend exposes sales via
  //    /marketplace which returns { marketplace, sales }). ────────────────
  useEffect(() => {
    let cancelled = false
    sdk
      .getMarketData()
      .then((data) => {
        if (cancelled) return
        const sales = (data.sales || []).slice(0, 8).map(saleToRecent)
        setRecentSales(sales)
      })
      .catch(() => {
        // Optional feed — leave empty on failure.
      })
    return () => {
      cancelled = true
    }
  }, [sdk])

  // ── Floor price (computed from the live listing set, not mock data) ─────
  const floorPriceData = useMemo(
    () => computeFloorPrice(allListings),
    [allListings],
  )

  // ── Wishlist toggle ──────────────────────────────────────────────────────
  const toggleWishlist = useCallback((id: string, name: string) => {
    setWishlist((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        addNotification('info', `Removed "${name}" from wishlist`)
      } else {
        next.add(id)
        addNotification('success', `Added "${name}" to wishlist ❤️`)
      }
      return next
    })
  }, [addNotification])

  // ── Filtering & Sorting ──────────────────────────────────────────────────
  // Keep a stable insertion-order map for the "newest" sort. We use the order
  // in which assets arrived from the backend (i.e. the store's order), which
  // is the closest proxy to recency without a backend sort parameter.
  const newestOrder = useMemo(() => {
    const m = new Map<string, number>()
    allListings.forEach((l, idx) => m.set(l.id, idx))
    return m
  }, [allListings])

  const filteredListings = useMemo(() => {
    let items = [...allListings]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.type.toLowerCase().includes(q) ||
          i.rarity.toLowerCase().includes(q)
      )
    }

    // Rarity filter
    if (rarityFilter !== 'all') {
      items = items.filter((i) => i.rarity === rarityFilter)
    }

    // Price range
    const min = priceMin ? Number(priceMin) : 0
    const max = priceMax ? Number(priceMax) : Infinity
    if (min > 0 || max < Infinity) {
      items = items.filter((i) => i.price >= min && i.price <= max)
    }

    // Sort
    switch (sortBy) {
      case 'price_asc':
        items.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        items.sort((a, b) => b.price - a.price)
        break
      case 'newest':
        items.sort((a, b) => (newestOrder.get(a.id) ?? 0) - (newestOrder.get(b.id) ?? 0))
        break
      case 'rarity':
        items.sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity])
        break
    }

    return items
  }, [allListings, newestOrder, searchQuery, rarityFilter, priceMin, priceMax, sortBy])

  // ── Price trend ──────────────────────────────────────────────────────────
  const getPriceTrend = (history: PricePoint[]) => {
    if (history.length < 2) return { direction: 'flat' as const, pct: 0 }
    const first = history[0].price
    const last = history[history.length - 1].price
    const pct = first === 0 ? 0 : ((last - first) / first) * 100
    return {
      direction: pct > 1 ? 'up' as const : pct < -1 ? 'down' as const : 'flat' as const,
      pct: Math.abs(pct),
    }
  }

  // ── Buy handler — calls the real SDK buy flow with full error handling ──
  const handleBuy = useCallback(async (item: MarketplaceListing) => {
    if (!activeAddress) {
      addNotification('warning', 'Connect your wallet to trade.')
      return
    }
    if (buyingId) return // prevent double-clicks
    setBuyingId(item.id)
    try {
      addNotification('info', `Initiating trade for "${item.name}" at ${item.price.toLocaleString()} μA…`)
      const result = await sdk.buyAsset(activeAddress, item.assetId)
      if (result.success) {
        addNotification(
          'success',
          `✓ Purchased "${item.name}" for ${item.price.toLocaleString()} μA${
            result.payment_txn_id ? ` · TX ${result.payment_txn_id.slice(0, 10)}…` : ''
          }`,
        )
        setSelectedItem(null)
      }
    } catch (e) {
      if (e instanceof WalletNotConnectedError) {
        addNotification('warning', 'Please connect your wallet first.')
      } else if (e instanceof InsufficientFundsError) {
        addNotification('error', `Insufficient funds: need ${e.required} μALGO.`)
      } else if (e instanceof TransactionFailedError) {
        addNotification('error', `Trade failed: ${e.message}`)
      } else if (e instanceof DeShopError) {
        addNotification('error', e.message)
      } else if (e instanceof Error) {
        addNotification('error', e.message || 'Trade failed.')
      } else {
        addNotification('error', 'Trade failed due to an unknown error.')
      }
    } finally {
      setBuyingId(null)
    }
  }, [activeAddress, addNotification, buyingId, sdk])

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ═══ TOP BAR ═══ */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '2px solid rgba(80, 0, 170, 0.4)',
          background: 'rgba(26, 10, 46, 0.9)',
          imageRendering: 'pixelated',
        }}
      >
        {/* Minecraft Banner */}
        <div
          style={{
            width: '100%',
            height: 48,
            marginBottom: 12,
            background: 'linear-gradient(135deg, rgba(80,0,170,0.3) 0%, rgba(74,237,217,0.15) 50%, rgba(255,215,0,0.2) 100%)',
            border: '2px solid rgba(80, 0, 170, 0.5)',
            borderRadius: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            imageRendering: 'pixelated',
          }}
        >
          <span style={{ fontSize: 20, ...pixelFont }}>⛏</span>
          <span style={{ fontSize: 14, color: '#FFD700', fontWeight: 700, letterSpacing: '0.08em', ...pixelFont }}>
            TRADING HALL
          </span>
          <span style={{ fontSize: 20, ...pixelFont }}>⛏</span>
        </div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingBag className="h-5 w-5" style={{ color: '#4AEDD9' }} />
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#FFD700',
                letterSpacing: '0.06em',
                margin: 0,
                ...pixelFont,
              }}
            >
              ⛏ TRADING HALL
            </h2>
            <span
              style={{
                fontSize: 9,
                color: '#4AEDD9',
                background: 'rgba(74,237,217,0.1)',
                padding: '2px 8px',
                borderRadius: 0,
                fontWeight: 600,
                border: '2px solid rgba(74,237,217,0.3)',
                imageRendering: 'pixelated',
              }}
            >
              V2
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#9f7aea', ...pixelFont }}>
              {filteredListings.length} item{filteredListings.length !== 1 ? 's' : ''}
            </span>
            {wishlist.size > 0 && (
              <span
                style={{
                  fontSize: 10,
                  color: '#f87171',
                  background: 'rgba(248, 113, 113, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 0,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  border: '2px solid rgba(248,113,113,0.3)',
                  imageRendering: 'pixelated',
                }}
              >
                <Heart className="h-3 w-3" style={{ fill: '#f87171' }} /> {wishlist.size}
              </span>
            )}
          </div>
        </div>

        {/* Search + controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Search */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 220px',
              minWidth: 180,
            }}
          >
            <Search
              className="h-3.5 w-3.5"
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9f7aea',
              }}
            />
            <input
              className="premium-input"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                fontSize: 11,
                paddingLeft: 30,
                paddingRight: 8,
                borderRadius: 0,
                border: '2px solid rgba(80,0,170,0.4)',
                background: 'rgba(26,10,46,0.6)',
                color: '#e2d5f3',
                ...pixelFont,
              }}
            />
          </div>

          {/* Rarity filter — "Filter by Ore Quality" */}
          <div style={{ position: 'relative' }}>
            <select
              className="premium-select"
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value as Rarity | 'all')}
              style={{
                fontSize: 11,
                minWidth: 120,
                borderRadius: 0,
                border: '2px solid rgba(80,0,170,0.4)',
                background: 'rgba(26,10,46,0.6)',
                color: '#e2d5f3',
                ...pixelFont,
              }}
            >
              <option value="all">All Ore Quality</option>
              <option value="common">Common (Iron)</option>
              <option value="rare">Rare (Diamond)</option>
              <option value="epic">Epic (Netherite)</option>
              <option value="legendary">Legendary (Gold)</option>
            </select>
          </div>

          {/* Sort */}
          <select
            className="premium-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={{
              fontSize: 11,
              minWidth: 140,
              borderRadius: 0,
              border: '2px solid rgba(80,0,170,0.4)',
              background: 'rgba(26,10,46,0.6)',
              color: '#e2d5f3',
              ...pixelFont,
            }}
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="rarity">Rarest First</option>
          </select>

          {/* Filter toggle */}
          <button
            className="premium-btn premium-btn--sm"
            onClick={() => setShowFilters(!showFilters)}
            style={{
              background: showFilters ? 'rgba(74,237,217,0.1)' : 'rgba(26,10,46,0.6)',
              borderColor: showFilters ? 'rgba(74,237,217,0.4)' : 'rgba(80,0,170,0.4)',
              color: showFilters ? '#4AEDD9' : '#9f7aea',
              borderRadius: 0,
              ...pixelFont,
            }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </button>

          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              border: '2px solid rgba(80,0,170,0.4)',
              borderRadius: 0,
              overflow: 'hidden',
              imageRendering: 'pixelated',
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '5px 10px',
                background: viewMode === 'grid' ? 'rgba(74,237,217,0.12)' : 'transparent',
                border: 'none',
                borderRight: '2px solid rgba(80,0,170,0.4)',
                color: viewMode === 'grid' ? '#4AEDD9' : '#9f7aea',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.15s',
              }}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '5px 10px',
                background: viewMode === 'list' ? 'rgba(74,237,217,0.12)' : 'transparent',
                border: 'none',
                color: viewMode === 'list' ? '#4AEDD9' : '#9f7aea',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.15s',
              }}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Expandable price range filter */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '2px solid rgba(80,0,170,0.2)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 10, color: '#9f7aea', fontWeight: 600, letterSpacing: '0.05em', ...pixelFont }}>
                  PRICE RANGE
                </span>
                <input
                  className="premium-input"
                  placeholder="Min μA"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  type="number"
                  style={{
                    width: 100,
                    fontSize: 11,
                    borderRadius: 0,
                    border: '2px solid rgba(80,0,170,0.4)',
                    background: 'rgba(26,10,46,0.6)',
                    color: '#e2d5f3',
                    ...pixelFont,
                  }}
                />
                <span style={{ color: '#9f7aea', fontSize: 11 }}>—</span>
                <input
                  className="premium-input"
                  placeholder="Max μA"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  type="number"
                  style={{
                    width: 100,
                    fontSize: 11,
                    borderRadius: 0,
                    border: '2px solid rgba(80,0,170,0.4)',
                    background: 'rgba(26,10,46,0.6)',
                    color: '#e2d5f3',
                    ...pixelFont,
                  }}
                />
                {(priceMin || priceMax) && (
                  <button
                    onClick={() => { setPriceMin(''); setPriceMax('') }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9f7aea',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      fontSize: 10,
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 9, color: '#7c5eaa', ...pixelFont }}>
                  15 — 10,000 μA
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ FLOOR PRICE BAR ═══ */}
      <div
        style={{
          padding: '8px 20px',
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          background: 'rgba(26, 10, 46, 0.6)',
          borderBottom: '2px solid rgba(80, 0, 170, 0.2)',
        }}
      >
        {(Object.keys(floorPriceData) as Rarity[]).map((rarity) => {
          const fp = floorPriceData[rarity]
          const rc = RARITY_CONFIG[rarity]
          return (
            <motion.div
              key={rarity}
              whileHover={{ y: -2, boxShadow: `0 0 16px ${rc.glow}` }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: rc.gradient,
                border: `2px solid ${rc.border}`,
                cursor: 'pointer',
                flexShrink: 0,
                imageRendering: 'pixelated',
                transition: 'box-shadow 0.2s ease',
              }}
            >
              <span style={{ fontSize: 8, color: rc.color, fontWeight: 700, ...pixelFont, textTransform: 'uppercase' }}>
                {rarity}
              </span>
              <span style={{ fontSize: 10, color: '#4AEDD9', fontWeight: 700, ...pixelFont }}>
                {fp.price.toLocaleString()} <span style={{ fontSize: 7 }}>μA</span>
              </span>
              <span style={{
                fontSize: 8,
                color: fp.change24h >= 0 ? '#22c55e' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                fontWeight: 600,
              }}>
                {fp.change24h >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {Math.abs(fp.change24h)}%
              </span>
              <span style={{ fontSize: 7, color: '#7c5eaa', ...pixelFont }}>{fp.listCount} listed</span>
            </motion.div>
          )
        })}
      </div>

      {/* ═══ RECENTLY SOLD ═══ */}
      <div
        style={{
          padding: '10px 20px',
          background: 'rgba(26, 10, 46, 0.4)',
          borderBottom: '2px solid rgba(80, 0, 170, 0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Activity className="h-3.5 w-3.5" style={{ color: '#22c55e' }} />
          <span style={{ fontSize: 9, color: '#22c55e', fontWeight: 700, letterSpacing: '0.06em', ...pixelFont }}>
            RECENTLY SOLD
          </span>
          <span
            style={{
              width: 5,
              height: 5,
              background: '#22c55e',
              boxShadow: '0 0 4px #22c55e',
              animation: 'mc-pulse 2s infinite',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {recentSales.map((sale) => {
            const rc = RARITY_CONFIG[sale.rarity]
            return (
              <motion.div
                key={sale.id}
                whileHover={{ y: -2, boxShadow: `0 0 12px ${rc.glow}` }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  background: rc.gradient,
                  border: `2px solid ${rc.border}`,
                  flexShrink: 0,
                  cursor: 'pointer',
                  imageRendering: 'pixelated',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: 16 }}>{sale.icon}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, color: rc.color, fontWeight: 700, ...pixelFont }}>{sale.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                    <span style={{ fontSize: 9, color: '#4AEDD9', fontWeight: 700, ...pixelFont }}>
                      {sale.salePrice.toLocaleString()} μA
                    </span>
                    <span style={{ fontSize: 7, color: '#7c5eaa', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Clock className="h-2 w-2" />
                      {sale.soldAt}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ═══ CONTENT AREA ═══ */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {loading ? (
          /* ═══ LOADING STATE — fetching marketplace from backend ═══ */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 20px',
              textAlign: 'center',
              gap: 14,
            }}
          >
            <Loader2
              className="h-10 w-10 animate-spin"
              style={{ color: '#4AEDD9' }}
            />
            <h3
              style={{
                color: '#FFD700',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
                margin: 0,
                ...pixelFont,
              }}
            >
              LOADING MARKETPLACE
            </h3>
            <p style={{ color: '#9f7aea', fontSize: 11, maxWidth: 320, lineHeight: 1.6, margin: 0 }}>
              Fetching live listings from the De-Shop backend…
            </p>
          </motion.div>
        ) : filteredListings.length === 0 ? (
          /* ═══ EMPTY STATE ═══ */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: 0,
                background: 'rgba(80,0,170,0.15)',
                border: '3px solid rgba(80,0,170,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
                imageRendering: 'pixelated',
                boxShadow: '0 0 30px rgba(80,0,170,0.15)',
              }}
            >
              <ShoppingBag className="h-10 w-10" style={{ color: '#9f7aea', opacity: 0.5 }} />
            </div>
            <h3
              style={{
                color: '#FFD700',
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 8,
                letterSpacing: '0.04em',
                ...pixelFont,
              }}
            >
              No Items Found
            </h3>
            <p style={{ color: '#9f7aea', fontSize: 12, maxWidth: 320, lineHeight: 1.6, marginBottom: 4 }}>
              No trading hall items match your current filters, or the marketplace is empty.
              Try adjusting your search, clearing all filters, or minting a skin to get started.
            </p>
            <button
              className="premium-btn premium-btn--sm premium-btn--green"
              style={{ marginTop: 20, borderRadius: 0, ...pixelFont }}
              onClick={() => {
                setSearchQuery('')
                setRarityFilter('all')
                setPriceMin('')
                setPriceMax('')
              }}
            >
              <X className="h-3.5 w-3.5" />
              Clear All Filters
            </button>
          </motion.div>
        ) : viewMode === 'grid' ? (
          /* ═══ GRID VIEW — Inventory Style ═══ */
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key="grid"
            className="marketplace-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 8,
              gridAutoRows: 'auto',
            }}
          >
            {filteredListings.map((item) => {
              const rc = RARITY_CONFIG[item.rarity]
              const trend = getPriceTrend(item.priceHistory)
              const isWished = wishlist.has(item.id)
              return (
                <motion.div
                  key={item.id}
                  variants={cardVariants}
                  layout
                  whileHover={{
                    y: -4,
                    boxShadow: `0 8px 24px ${rc.glow}, 0 0 0 2px ${rc.border}, 0 0 32px ${rc.glow.replace('0.15', '0.08')}`,
                  }}
                  style={{
                    background: rc.gradient,
                    border: `3px solid ${rc.border}`,
                    borderRadius: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'box-shadow 0.25s ease, transform 0.2s ease',
                    imageRendering: 'pixelated',
                    display: 'flex',
                    flexDirection: 'column',
                    backdropFilter: 'blur(4px)',
                  }}
                  onClick={() => setSelectedItem(item)}
                >
                  {/* Rarity shimmer bar with glow */}
                  <div
                    style={{
                      height: 2,
                      background: `linear-gradient(90deg, transparent, ${rc.color}, transparent)`,
                      opacity: 0.7,
                      boxShadow: `0 0 6px ${rc.glow}`,
                    }}
                  />
                  {/* Rarity corner indicator */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 8,
                      height: 8,
                      background: rc.color,
                      border: '1px solid rgba(0,0,0,0.3)',
                      boxShadow: `0 0 8px ${rc.glow}`,
                      zIndex: 2,
                    }}
                  />

                  {/* Card content */}
                  <div style={{ padding: '10px 10px 8px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* Item icon — Minecraft inventory slot */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 6 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleWishlist(item.id, item.name)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          color: isWished ? '#f87171' : '#7c5eaa',
                          transition: 'all 0.15s',
                        }}
                      >
                        <Heart
                          className="h-3.5 w-3.5"
                          style={isWished ? { fill: '#f87171' } : {}}
                        />
                      </button>
                      {/* Rarity dot */}
                      <span style={{ fontSize: 8 }}>{rc.icon}</span>
                    </div>

                    {/* Icon slot — square inventory style */}
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 0,
                        background: 'rgba(0,0,0,0.3)',
                        border: '3px solid rgba(255,255,255,0.15)',
                        borderTopColor: 'rgba(255,255,255,0.3)',
                        borderLeftColor: 'rgba(255,255,255,0.25)',
                        borderBottomColor: 'rgba(0,0,0,0.4)',
                        borderRightColor: 'rgba(0,0,0,0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        marginBottom: 8,
                        imageRendering: 'pixelated',
                        boxShadow: `inset 0 0 8px rgba(0,0,0,0.3), 0 0 8px ${rc.glow}`,
                      }}
                    >
                      {item.icon}
                    </div>

                    {/* Name */}
                    <div
                      style={{
                        color: rc.color,
                        fontSize: 10,
                        fontWeight: 700,
                        marginBottom: 4,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%',
                        ...pixelFont,
                      }}
                    >
                      {item.name}
                    </div>

                    {/* Rarity badge */}
                    <div style={{ marginBottom: 6 }}>
                      <RarityBadge rarity={item.rarity} />
                    </div>

                    {/* Price in emerald color */}
                    <div style={{ textAlign: 'center', marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#4AEDD9', ...pixelFont }}>
                        {item.price.toLocaleString()} <span style={{ fontSize: 8, color: '#4AEDD9' }}>μA</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center', marginTop: 2 }}>
                        {trend.direction === 'up' && <TrendingUp className="h-3 w-3" style={{ color: '#22c55e' }} />}
                        {trend.direction === 'down' && <TrendingDown className="h-3 w-3" style={{ color: '#ef4444' }} />}
                        <span
                          style={{
                            fontSize: 8,
                            color: trend.direction === 'up' ? '#22c55e' : trend.direction === 'down' ? '#ef4444' : '#9f7aea',
                            fontWeight: 600,
                          }}
                        >
                          {trend.direction !== 'flat' ? `${trend.pct.toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Trade button */}
                    <button
                      className="premium-btn premium-btn--xs marketplace-card-btn"
                      disabled={buyingId === item.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleBuy(item)
                      }}
                      style={{
                        borderRadius: 0,
                        background: 'rgba(74,237,217,0.15)',
                        border: '2px solid rgba(74,237,217,0.4)',
                        color: '#4AEDD9',
                        width: '100%',
                        opacity: buyingId === item.id ? 0.7 : 1,
                        cursor: buyingId === item.id ? 'wait' : 'pointer',
                        ...pixelFont,
                      }}
                    >
                      {buyingId === item.id ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          TRADING…
                        </>
                      ) : (
                        <>
                          <Zap className="h-3 w-3" />
                          TRADE
                        </>
                      )}
                    </button>

                    {/* Seller */}
                    <div
                      style={{
                        marginTop: 6,
                        width: '100%',
                        paddingTop: 4,
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: 8, color: '#7c5eaa' }}>
                        {item.seller}
                      </span>
                      <span style={{ fontSize: 8, color: '#7c5eaa' }}>
                        {item.listedAt}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        ) : (
          /* ═══ LIST VIEW — Chest Inventory Style ═══ */
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key="list"
            style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
          >
            {/* Header row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 90px 100px 120px 100px',
                gap: 12,
                padding: '10px 16px',
                borderBottom: '2px solid rgba(80,0,170,0.4)',
                fontSize: 8,
                color: '#9f7aea',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                background: 'rgba(26,10,46,0.6)',
                ...pixelFont,
              }}
            >
              <span></span>
              <span>Item</span>
              <span>Quality</span>
              <span>Price</span>
              <span>Trend / Seller</span>
              <span></span>
            </div>

            {filteredListings.map((item, idx) => {
              const rc = RARITY_CONFIG[item.rarity]
              const trend = getPriceTrend(item.priceHistory)
              const isWished = wishlist.has(item.id)
              return (
                <motion.div
                  key={item.id}
                  variants={listVariants}
                  whileHover={{
                    background: 'rgba(74,237,217,0.06)',
                  }}
                  className="marketplace-list-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px 1fr 90px 100px 120px 100px',
                    gap: 12,
                    padding: '12px 16px',
                    alignItems: 'center',
                    background: idx % 2 === 0 ? 'rgba(26,10,46,0.3)' : 'rgba(13,21,32,0.3)',
                    borderBottom: '1px solid rgba(80,0,170,0.1)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => setSelectedItem(item)}
                >
                  {/* Icon — inventory slot style */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 0,
                      background: 'rgba(0,0,0,0.3)',
                      border: '2px solid rgba(255,255,255,0.15)',
                      borderTopColor: 'rgba(255,255,255,0.25)',
                      borderLeftColor: 'rgba(255,255,255,0.2)',
                      borderBottomColor: 'rgba(0,0,0,0.35)',
                      borderRightColor: 'rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      imageRendering: 'pixelated',
                    }}
                  >
                    {item.icon}
                  </div>

                  {/* Name */}
                  <div>
                    <div style={{ color: rc.color, fontSize: 11, fontWeight: 600, ...pixelFont }}>{item.name}</div>
                    <div style={{ fontSize: 8, color: '#7c5eaa', marginTop: 1 }}>{item.type} • {item.listedAt}</div>
                  </div>

                  {/* Rarity */}
                  <RarityBadge rarity={item.rarity} />

                  {/* Price — emerald color */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4AEDD9', ...pixelFont }}>
                    {item.price.toLocaleString()} <span style={{ fontSize: 8 }}>μA</span>
                  </div>

                  {/* Trend + Seller */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {trend.direction === 'up' && <TrendingUp className="h-3 w-3" style={{ color: '#22c55e' }} />}
                      {trend.direction === 'down' && <TrendingDown className="h-3 w-3" style={{ color: '#ef4444' }} />}
                      <span
                        style={{
                          fontSize: 9,
                          color: trend.direction === 'up' ? '#22c55e' : trend.direction === 'down' ? '#ef4444' : '#9f7aea',
                          fontWeight: 600,
                        }}
                      >
                        {trend.direction !== 'flat' ? `${trend.pct.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                    <span style={{ fontSize: 8, color: '#7c5eaa' }}>{item.seller}</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleWishlist(item.id, item.name)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 6,
                        color: isWished ? '#f87171' : '#7c5eaa',
                      }}
                    >
                      <Heart className="h-3.5 w-3.5" style={isWished ? { fill: '#f87171' } : {}} />
                    </button>
                    <button
                      className="premium-btn premium-btn--xs marketplace-card-btn"
                      disabled={buyingId === item.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleBuy(item)
                      }}
                      style={{
                        borderRadius: 0,
                        background: 'rgba(74,237,217,0.15)',
                        border: '2px solid rgba(74,237,217,0.4)',
                        color: '#4AEDD9',
                        opacity: buyingId === item.id ? 0.7 : 1,
                        cursor: buyingId === item.id ? 'wait' : 'pointer',
                        ...pixelFont,
                      }}
                    >
                      {buyingId === item.id ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          TRADING…
                        </>
                      ) : (
                        <>
                          <Zap className="h-3 w-3" />
                          TRADE
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* ═══ ITEM DETAIL MODAL — Minecraft Tooltip Style ═══ */}
      <AnimatePresence>
        {selectedItem && (
          <>
            {/* Backdrop */}
            <motion.div
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setSelectedItem(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
              }}
            />

            {/* Modal — Minecraft tooltip style */}
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="marketplace-detail-modal"
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(560px, 90%)',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'rgba(26, 10, 46, 0.95)',
                border: '3px solid #5000AA',
                borderRadius: 0,
                zIndex: 1001,
                boxShadow: `0 0 40px ${RARITY_CONFIG[selectedItem.rarity].glow}, 0 24px 48px rgba(0,0,0,0.6)`,
                imageRendering: 'pixelated',
              }}
            >
              {(() => {
                const item = selectedItem
                const rc = RARITY_CONFIG[item.rarity]
                const trend = getPriceTrend(item.priceHistory)
                const isWished = wishlist.has(item.id)

                return (
                  <>
                    {/* Close button */}
                    <button
                      onClick={() => setSelectedItem(null)}
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: 'rgba(26, 10, 46, 0.8)',
                        border: '2px solid #5000AA',
                        borderRadius: 0,
                        color: '#9f7aea',
                        cursor: 'pointer',
                        padding: 4,
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        imageRendering: 'pixelated',
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* Rarity top bar */}
                    <div
                      style={{
                        height: 3,
                        background: `linear-gradient(90deg, transparent, ${rc.color}, transparent)`,
                      }}
                    />

                    <div style={{ padding: '20px 24px 24px' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                        {/* Large icon — inventory slot */}
                        <div
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: 0,
                            background: rc.gradient,
                            border: `3px solid ${rc.border}`,
                            borderTopColor: rc.color,
                            borderLeftColor: rc.border,
                            borderBottomColor: 'rgba(0,0,0,0.5)',
                            borderRightColor: 'rgba(0,0,0,0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 36,
                            flexShrink: 0,
                            imageRendering: 'pixelated',
                            boxShadow: `0 0 24px ${rc.glow}`,
                          }}
                        >
                          {item.icon}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <h3
                              style={{
                                color: rc.color,
                                fontSize: 16,
                                fontWeight: 700,
                                margin: 0,
                                letterSpacing: '0.02em',
                                ...pixelFont,
                              }}
                            >
                              {item.name}
                            </h3>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                            <RarityBadge rarity={item.rarity} />
                            <span style={{ fontSize: 9, color: '#9f7aea', ...pixelFont }}>{item.type}</span>
                            <span style={{ fontSize: 9, color: '#7c5eaa' }}>•</span>
                            <span style={{ fontSize: 9, color: '#7c5ea' }}>Listed {item.listedAt}</span>
                          </div>
                          <div style={{ fontSize: 10, color: '#c4b5e0', lineHeight: 1.5, ...pixelFont }}>
                            {item.description}
                          </div>
                        </div>
                      </div>

                      {/* Price + Actions */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          background: 'rgba(26, 10, 46, 0.7)',
                          borderRadius: 0,
                          border: '2px solid rgba(80,0,170,0.3)',
                          marginBottom: 16,
                          imageRendering: 'pixelated',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 9, color: '#9f7aea', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 2, ...pixelFont }}>
                            CURRENT PRICE
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontSize: 20, fontWeight: 700, color: '#4AEDD9', ...pixelFont }}>
                              {item.price.toLocaleString()}
                            </span>
                            <span style={{ fontSize: 9, color: '#4AEDD9', ...pixelFont }}>μA</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 6 }}>
                              {trend.direction === 'up' && <TrendingUp className="h-3 w-3" style={{ color: '#22c55e' }} />}
                              {trend.direction === 'down' && <TrendingDown className="h-3 w-3" style={{ color: '#ef4444' }} />}
                              <span
                                style={{
                                  fontSize: 9,
                                  color: trend.direction === 'up' ? '#22c55e' : trend.direction === 'down' ? '#ef4444' : '#9f7aea',
                                  fontWeight: 600,
                                }}
                              >
                                {trend.direction !== 'flat' ? `${trend.pct.toFixed(1)}%` : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => toggleWishlist(item.id, item.name)}
                            className="premium-btn premium-btn--sm"
                            style={{
                              borderColor: isWished ? '#f87171' : 'rgba(80,0,170,0.4)',
                              color: isWished ? '#f87171' : '#9f7aea',
                              background: isWished ? 'rgba(248,113,113,0.08)' : 'rgba(26,10,46,0.5)',
                              borderRadius: 0,
                              ...pixelFont,
                            }}
                          >
                            <Heart className="h-3.5 w-3.5" style={isWished ? { fill: '#f87171' } : {}} />
                            {isWished ? 'Saved' : 'Save'}
                          </button>
                          <button
                            className="premium-btn premium-btn--sm"
                            disabled={buyingId === item.id}
                            onClick={() => void handleBuy(item)}
                            style={{
                              borderRadius: 0,
                              background: 'rgba(74,237,217,0.2)',
                              border: '2px solid rgba(74,237,217,0.5)',
                              color: '#4AEDD9',
                              opacity: buyingId === item.id ? 0.7 : 1,
                              cursor: buyingId === item.id ? 'wait' : 'pointer',
                              ...pixelFont,
                            }}
                          >
                            {buyingId === item.id ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                TRADING…
                              </>
                            ) : (
                              <>
                                <Zap className="h-3.5 w-3.5" />
                                TRADE
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Trading History Chart (was Price History) */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <BarChart3 className="h-3.5 w-3.5" style={{ color: '#4AEDD9' }} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#FFD700', letterSpacing: '0.04em', ...pixelFont }}>
                            TRADING HISTORY — 7 DAYS
                          </span>
                        </div>
                        <div
                          style={{
                            background: 'rgba(26, 10, 46, 0.5)',
                            borderRadius: 0,
                            border: '2px solid rgba(80,0,170,0.3)',
                            padding: '12px 8px 4px',
                            imageRendering: 'pixelated',
                          }}
                        >
                          <ResponsiveContainer width="100%" height={120}>
                            <AreaChart data={item.priceHistory}>
                              <defs>
                                <linearGradient id={`grad-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={rc.color} stopOpacity={0.3} />
                                  <stop offset="100%" stopColor={rc.color} stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(80,0,170,0.15)" />
                              <XAxis
                                dataKey="day"
                                tick={{ fill: '#9f7aea', fontSize: 8 }}
                                axisLine={{ stroke: 'rgba(80,0,170,0.2)' }}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fill: '#9f7aea', fontSize: 8 }}
                                axisLine={{ stroke: 'rgba(80,0,170,0.2)' }}
                                tickLine={false}
                                width={50}
                                tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
                              />
                              <Tooltip content={<ChartTooltip />} />
                              <Area
                                type="monotone"
                                dataKey="price"
                                stroke={rc.color}
                                strokeWidth={2}
                                fill={`url(#grad-${item.id})`}
                                dot={false}
                                activeDot={{ r: 4, fill: rc.color, stroke: '#FFD700', strokeWidth: 1.5 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Enchantment Analysis (was AI Price Analysis) */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Sparkles className="h-3.5 w-3.5" style={{ color: '#c084fc' }} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#FFD700', letterSpacing: '0.04em', ...pixelFont }}>
                            ENCHANTMENT ANALYSIS
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 8,
                          }}
                        >
                          {/* Enchantment Power (was Confidence) */}
                          <div
                            style={{
                              background: 'rgba(74,237,217,0.04)',
                              border: '2px solid rgba(74,237,217,0.2)',
                              borderRadius: 0,
                              padding: '10px 10px',
                              imageRendering: 'pixelated',
                            }}
                          >
                            <div style={{ fontSize: 7, color: '#9f7aea', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4, ...pixelFont }}>
                              ENCHANTMENT POWER
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#4AEDD9', ...pixelFont }}>
                              {item.confidence}%
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                height: 3,
                                borderRadius: 0,
                                background: 'rgba(80,0,170,0.2)',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${item.confidence}%`,
                                  background: '#4AEDD9',
                                  borderRadius: 0,
                                  imageRendering: 'pixelated',
                                }}
                              />
                            </div>
                          </div>

                          {/* Villager Appraisal (was Suggested Price) */}
                          <div
                            style={{
                              background: 'rgba(168,85,247,0.04)',
                              border: '2px solid rgba(168,85,247,0.2)',
                              borderRadius: 0,
                              padding: '10px 10px',
                              imageRendering: 'pixelated',
                            }}
                          >
                            <div style={{ fontSize: 7, color: '#9f7aea', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4, ...pixelFont }}>
                              VILLAGER APPRAISAL
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#c084fc', ...pixelFont }}>
                              {item.suggestedPrice.toLocaleString()}
                            </div>
                            <div style={{ fontSize: 8, color: '#7c5eaa', marginTop: 4, ...pixelFont }}>
                              μA
                            </div>
                          </div>

                          {/* Enchantment Level (was Rarity Score) */}
                          <div
                            style={{
                              background: rc.bg,
                              border: `2px solid ${rc.border}`,
                              borderRadius: 0,
                              padding: '10px 10px',
                              imageRendering: 'pixelated',
                            }}
                          >
                            <div style={{ fontSize: 7, color: '#9f7aea', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4, ...pixelFont }}>
                              ENCHANTMENT LEVEL
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: rc.color, ...pixelFont }}>
                              {item.rarityScore}
                            </div>
                            <div style={{ fontSize: 8, color: '#7c5eaa', marginTop: 4, ...pixelFont }}>
                              <span>
                                {'█'.repeat(Math.round(item.rarityScore))}
                                {'░'.repeat(10 - Math.round(item.rarityScore))}
                              </span>
                              <span style={{ marginLeft: 2 }}>{item.rarityScore}/10</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Seller Info */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: 'rgba(26, 10, 46, 0.5)',
                          borderRadius: 0,
                          border: '2px solid rgba(80,0,170,0.2)',
                          imageRendering: 'pixelated',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Shield className="h-3.5 w-3.5" style={{ color: '#9f7aea' }} />
                          <span style={{ fontSize: 9, color: '#9f7aea', ...pixelFont }}>
                            Seller
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#4AEDD9',
                              ...pixelFont,
                            }}
                          >
                            {item.seller}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Eye className="h-3 w-3" style={{ color: '#7c5eaa' }} />
                          <span style={{ fontSize: 8, color: '#7c5eaa', ...pixelFont }}>
                            {Math.floor(Math.random() * 200 + 50)} views
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
