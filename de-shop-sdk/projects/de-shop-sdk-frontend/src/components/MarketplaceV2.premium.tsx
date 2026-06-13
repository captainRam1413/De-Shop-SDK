/**
 * De-Shop SDK — Marketplace V2 (Premium)
 * ═════════════════════════════════════
 * Standalone advanced marketplace with filtering, grid/list views,
 * item detail modal with price history, AI analysis, and wishlist.
 */

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Heart,
  X,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Shield,
  Zap,
  Eye,
  ChevronDown,
  ShoppingBag,
  Star,
  BarChart3,
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
import { useDeShopStore } from '../store/useDeShopStore'

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
  id: string
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
// RARITY CONFIG
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
    color: '#9ca3af',
    bg: 'rgba(107,114,128,0.08)',
    border: 'rgba(107,114,128,0.3)',
    glow: 'rgba(107,114,128,0.15)',
    badge: '#6b7280',
    gradient: 'linear-gradient(135deg, rgba(107,114,128,0.1), rgba(107,114,128,0.03))',
    icon: '⚪',
  },
  rare: {
    color: '#60a5fa',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.3)',
    glow: 'rgba(59,130,246,0.15)',
    badge: '#3b82f6',
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.03))',
    icon: '🔵',
  },
  epic: {
    color: '#c084fc',
    bg: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.3)',
    glow: 'rgba(168,85,247,0.15)',
    badge: '#a855f7',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.03))',
    icon: '🟣',
  },
  legendary: {
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.3)',
    glow: 'rgba(245,158,11,0.15)',
    badge: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.03))',
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
// MOCK DATA GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function generatePriceHistory(basePrice: number, volatility: number = 0.15): PricePoint[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  let current = basePrice * (0.8 + Math.random() * 0.2)
  return days.map((day) => {
    const change = (Math.random() - 0.45) * volatility * basePrice
    current = Math.max(basePrice * 0.5, current + change)
    return { day, price: Math.round(current * 100) / 100 }
  })
}

const MOCK_LISTINGS: MarketplaceListing[] = [
  {
    id: 'ml-001',
    name: 'Dragon Flame AK',
    rarity: 'legendary',
    price: 4850,
    seller: 'A4BX7K...3F9Q',
    icon: '🐉',
    priceHistory: generatePriceHistory(4850, 0.12),
    confidence: 94,
    suggestedPrice: 4620,
    rarityScore: 9.2,
    listedAt: '2h ago',
    type: 'Assault Rifle',
    description: 'A fearsome dragon-wrapped AK-47 skin with molten lava dripping from the barrel. Limited edition from the Season 4 Battle Pass.',
  },
  {
    id: 'ml-002',
    name: 'Phantom Edge Knife',
    rarity: 'epic',
    price: 2200,
    seller: 'QW3RT...7Y2P',
    icon: '🗡️',
    priceHistory: generatePriceHistory(2200, 0.18),
    confidence: 88,
    suggestedPrice: 2350,
    rarityScore: 7.8,
    listedAt: '5h ago',
    type: 'Melee',
    description: 'Spectral blade that phases through dimensions. Ethereal purple glow with particle trail effect.',
  },
  {
    id: 'ml-003',
    name: 'Neon Viper M4',
    rarity: 'rare',
    price: 850,
    seller: 'ZX9CV...4B8N',
    icon: '🐍',
    priceHistory: generatePriceHistory(850, 0.1),
    confidence: 82,
    suggestedPrice: 790,
    rarityScore: 5.4,
    listedAt: '1h ago',
    type: 'Assault Rifle',
    description: 'Neon-green serpentine pattern wraps around this M4A1. Glows in dark environments.',
  },
  {
    id: 'ml-004',
    name: 'Golden Eagle AWP',
    rarity: 'legendary',
    price: 3200,
    seller: 'GH6JK...9L1M',
    icon: '🦅',
    priceHistory: generatePriceHistory(3200, 0.08),
    confidence: 91,
    suggestedPrice: 3400,
    rarityScore: 8.9,
    listedAt: '30m ago',
    type: 'Sniper Rifle',
    description: 'Majestic golden eagle spreads its wings across the sniper body. Premium finish with animated feather effects.',
  },
  {
    id: 'ml-005',
    name: 'Arctic Frost Pistol',
    rarity: 'common',
    price: 120,
    seller: 'BN5FG...2H7K',
    icon: '❄️',
    priceHistory: generatePriceHistory(120, 0.2),
    confidence: 75,
    suggestedPrice: 135,
    rarityScore: 2.1,
    listedAt: '12h ago',
    type: 'Pistol',
    description: 'Basic ice-crystal finish. Clean frost patterns on grip and slide.',
  },
  {
    id: 'ml-006',
    name: 'Cyber Katana',
    rarity: 'epic',
    price: 1800,
    seller: 'TY8UI...6O3P',
    icon: '⚔️',
    priceHistory: generatePriceHistory(1800, 0.14),
    confidence: 86,
    suggestedPrice: 1750,
    rarityScore: 7.5,
    listedAt: '3h ago',
    type: 'Melee',
    description: 'Holographic blade with circuit-board patterns. Emits digital sparks on slash.',
  },
  {
    id: 'ml-007',
    name: 'Shadow Reaper Scythe',
    rarity: 'legendary',
    price: 5000,
    seller: 'LK4JH...8N2R',
    icon: '💀',
    priceHistory: generatePriceHistory(5000, 0.1),
    confidence: 96,
    suggestedPrice: 5200,
    rarityScore: 9.6,
    listedAt: '45m ago',
    type: 'Melee',
    description: 'The rarest melee skin. Dark aura surrounds the blade with soul-reaping particle effects.',
  },
  {
    id: 'ml-008',
    name: 'Plasma Burst Shotgun',
    rarity: 'rare',
    price: 680,
    seller: 'DF2AS...5G9H',
    icon: '⚡',
    priceHistory: generatePriceHistory(680, 0.16),
    confidence: 79,
    suggestedPrice: 720,
    rarityScore: 5.1,
    listedAt: '6h ago',
    type: 'Shotgun',
    description: 'Charged plasma cells fire with electrical discharge. Blue energy crackles along the barrel.',
  },
  {
    id: 'ml-009',
    name: 'Desert Storm SMG',
    rarity: 'common',
    price: 85,
    seller: 'MN7BV...1C4X',
    icon: '🏜️',
    priceHistory: generatePriceHistory(85, 0.22),
    confidence: 72,
    suggestedPrice: 90,
    rarityScore: 1.8,
    listedAt: '1d ago',
    type: 'SMG',
    description: 'Sand-worn finish with desert camo. Reliable and battle-tested look.',
  },
  {
    id: 'ml-010',
    name: 'Void Walker Pistol',
    rarity: 'epic',
    price: 1450,
    seller: 'PO9IU...3Y6T',
    icon: '🕳️',
    priceHistory: generatePriceHistory(1450, 0.13),
    confidence: 85,
    suggestedPrice: 1380,
    rarityScore: 7.0,
    listedAt: '4h ago',
    type: 'Pistol',
    description: 'Dark matter pistol with void rift effect on fire. Space-time distortion visual.',
  },
  {
    id: 'ml-011',
    name: 'Solar Flare Launcher',
    rarity: 'rare',
    price: 950,
    seller: 'WE3RT...7U1I',
    icon: '☀️',
    priceHistory: generatePriceHistory(950, 0.11),
    confidence: 80,
    suggestedPrice: 920,
    rarityScore: 5.7,
    listedAt: '8h ago',
    type: 'Launcher',
    description: 'Solar-powered rocket launcher with heat distortion effect. Orange and red gradient finish.',
  },
  {
    id: 'ml-012',
    name: 'Midnight Ops LMG',
    rarity: 'rare',
    price: 720,
    seller: 'AS6DF...0G4H',
    icon: '🌙',
    priceHistory: generatePriceHistory(720, 0.15),
    confidence: 78,
    suggestedPrice: 750,
    rarityScore: 4.8,
    listedAt: '10h ago',
    type: 'LMG',
    description: 'Tactical black-ops finish with infrared accents. Suppressed glow in night maps.',
  },
  {
    id: 'ml-013',
    name: 'Crystal Shard Knife',
    rarity: 'common',
    price: 55,
    seller: 'JK8LM...2N5O',
    icon: '💎',
    priceHistory: generatePriceHistory(55, 0.25),
    confidence: 70,
    suggestedPrice: 60,
    rarityScore: 1.5,
    listedAt: '2d ago',
    type: 'Melee',
    description: 'Simple crystalline blade. Clear faceted design with light refraction.',
  },
  {
    id: 'ml-014',
    name: 'Inferno Blaze Rifle',
    rarity: 'epic',
    price: 2100,
    seller: 'QR4ST...6U8V',
    icon: '🔥',
    priceHistory: generatePriceHistory(2100, 0.09),
    confidence: 89,
    suggestedPrice: 2050,
    rarityScore: 8.1,
    listedAt: '1h ago',
    type: 'Assault Rifle',
    description: 'Blazing fire skin with animated flame effects. Embers drift from the muzzle.',
  },
  {
    id: 'ml-015',
    name: 'Aurora Borealis AWP',
    rarity: 'legendary',
    price: 4100,
    seller: 'WX1YZ...3A5B',
    icon: '🌌',
    priceHistory: generatePriceHistory(4100, 0.07),
    confidence: 93,
    suggestedPrice: 3900,
    rarityScore: 9.0,
    listedAt: '20m ago',
    type: 'Sniper Rifle',
    description: 'Northern lights dance across the sniper body. Animated color-shifting aurora effect.',
  },
  {
    id: 'ml-016',
    name: 'Rust Bucket Pistol',
    rarity: 'common',
    price: 50,
    seller: 'CD7EF...9G1H',
    icon: '🔩',
    priceHistory: generatePriceHistory(50, 0.3),
    confidence: 68,
    suggestedPrice: 55,
    rarityScore: 1.2,
    listedAt: '3d ago',
    type: 'Pistol',
    description: 'Corroded vintage pistol skin. Patina and weathered metal textures.',
  },
  {
    id: 'ml-017',
    name: 'Quantum Rift SMG',
    rarity: 'rare',
    price: 780,
    seller: 'IJ5KL...7M9N',
    icon: '🌀',
    priceHistory: generatePriceHistory(780, 0.13),
    confidence: 81,
    suggestedPrice: 810,
    rarityScore: 5.3,
    listedAt: '7h ago',
    type: 'SMG',
    description: 'Quantum-entangled particles swirl around the barrel. Teleportation visual on reload.',
  },
  {
    id: 'ml-018',
    name: 'Obsidian Guardian Shield',
    rarity: 'epic',
    price: 1600,
    seller: 'OP3QR...5S7T',
    icon: '🛡️',
    priceHistory: generatePriceHistory(1600, 0.12),
    confidence: 87,
    suggestedPrice: 1680,
    rarityScore: 7.3,
    listedAt: '2h ago',
    type: 'Accessory',
    description: 'Dark volcanic glass shield with protective runes. Absorbs damage with visual feedback.',
  },
]

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
// CUSTOM TOOLTIP FOR PRICE CHART
// ═══════════════════════════════════════════════════════════════════════════════

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'rgba(10, 15, 20, 0.95)',
        border: '1px solid rgba(0, 255, 136, 0.25)',
        borderRadius: 8,
        padding: '8px 12px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <p style={{ color: 'var(--space-fog)', fontSize: 10, marginBottom: 2 }}>{label}</p>
      <p style={{ color: 'var(--green-neon)', fontSize: 12, fontWeight: 700 }}>
        {payload[0].value.toLocaleString()} μALGO
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// RARITY BADGE COMPONENT
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
        borderRadius: 3,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        border: `1px solid ${config.border}`,
      }}
    >
      {rarity}
    </span>
  )
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

  const addNotification = useDeShopStore((s) => s.addNotification)

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
  const filteredListings = useMemo(() => {
    let items = [...MOCK_LISTINGS]

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
        // Mock: use id as proxy for recency
        items.sort((a, b) => {
          const order: Record<string, number> = {}
          MOCK_LISTINGS.forEach((l, idx) => { order[l.id] = idx })
          return (order[a.id] ?? 0) - (order[b.id] ?? 0)
        })
        break
      case 'rarity':
        items.sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity])
        break
    }

    return items
  }, [searchQuery, rarityFilter, priceMin, priceMax, sortBy])

  // ── Price trend ──────────────────────────────────────────────────────────
  const getPriceTrend = (history: PricePoint[]) => {
    if (history.length < 2) return { direction: 'flat' as const, pct: 0 }
    const first = history[0].price
    const last = history[history.length - 1].price
    const pct = ((last - first) / first) * 100
    return {
      direction: pct > 1 ? 'up' as const : pct < -1 ? 'down' as const : 'flat' as const,
      pct: Math.abs(pct),
    }
  }

  // ── Buy handler ──────────────────────────────────────────────────────────
  const handleBuy = (item: MarketplaceListing) => {
    addNotification('success', `Purchase initiated for "${item.name}" at ${item.price.toLocaleString()} μALGO`)
    setSelectedItem(null)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ═══ TOP BAR ═══ */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(0, 255, 136, 0.1)',
          background: 'rgba(6, 10, 16, 0.8)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingBag className="h-5 w-5" style={{ color: 'var(--cyan-bright)' }} />
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '0.03em',
                margin: 0,
              }}
            >
              MARKETPLACE
            </h2>
            <span
              style={{
                fontSize: 10,
                color: 'var(--green-neon)',
                background: 'rgba(0, 255, 136, 0.1)',
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 600,
                border: '1px solid rgba(0, 255, 136, 0.2)',
              }}
            >
              V2
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--space-fog)' }}>
              {filteredListings.length} result{filteredListings.length !== 1 ? 's' : ''}
            </span>
            {wishlist.size > 0 && (
              <span
                style={{
                  fontSize: 10,
                  color: '#f87171',
                  background: 'rgba(248, 113, 113, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
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
                color: 'var(--space-fog)',
              }}
            />
            <input
              className="premium-input"
              placeholder="Search skins, weapons, rarities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                fontSize: 11,
                paddingLeft: 30,
                paddingRight: 8,
              }}
            />
          </div>

          {/* Rarity filter */}
          <div style={{ position: 'relative' }}>
            <select
              className="premium-select"
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value as Rarity | 'all')}
              style={{ fontSize: 11, minWidth: 100 }}
            >
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
          </div>

          {/* Sort */}
          <select
            className="premium-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={{ fontSize: 11, minWidth: 130 }}
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
              background: showFilters ? 'rgba(0, 255, 136, 0.1)' : 'rgba(10, 15, 20, 0.6)',
              borderColor: showFilters ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255,255,255,0.1)',
              color: showFilters ? 'var(--green-neon)' : 'var(--space-fog)',
            }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </button>

          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '5px 10px',
                background: viewMode === 'grid' ? 'rgba(0, 255, 136, 0.12)' : 'transparent',
                border: 'none',
                color: viewMode === 'grid' ? 'var(--green-neon)' : 'var(--space-fog)',
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
                background: viewMode === 'list' ? 'rgba(0, 255, 136, 0.12)' : 'transparent',
                border: 'none',
                borderLeft: '1px solid rgba(255,255,255,0.1)',
                color: viewMode === 'list' ? 'var(--green-neon)' : 'var(--space-fog)',
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
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 10, color: 'var(--space-fog)', fontWeight: 600, letterSpacing: '0.05em' }}>
                  PRICE RANGE
                </span>
                <input
                  className="premium-input"
                  placeholder="Min μA"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  type="number"
                  style={{ width: 100, fontSize: 11 }}
                />
                <span style={{ color: 'var(--space-fog)', fontSize: 11 }}>—</span>
                <input
                  className="premium-input"
                  placeholder="Max μA"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  type="number"
                  style={{ width: 100, fontSize: 11 }}
                />
                {(priceMin || priceMax) && (
                  <button
                    onClick={() => { setPriceMin(''); setPriceMax('') }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--space-fog)',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      fontSize: 10,
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 9, color: 'var(--space-steel)' }}>
                  50 — 5,000 μALGO
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ CONTENT AREA ═══ */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {filteredListings.length === 0 ? (
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
                borderRadius: '50%',
                background: 'rgba(0, 255, 136, 0.06)',
                border: '1px solid rgba(0, 255, 136, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
                animation: 'float 3s ease-in-out infinite',
                boxShadow: '0 0 30px rgba(0, 255, 136, 0.08)',
              }}
            >
              <ShoppingBag className="h-10 w-10" style={{ color: 'var(--green-neon)', opacity: 0.5 }} />
            </div>
            <h3
              style={{
                color: '#fff',
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 8,
                letterSpacing: '0.02em',
              }}
            >
              No Items Found
            </h3>
            <p style={{ color: 'var(--space-fog)', fontSize: 12, maxWidth: 320, lineHeight: 1.6, marginBottom: 4 }}>
              No marketplace listings match your current filters. Try adjusting your search criteria or clearing all filters to browse the full marketplace.
            </p>
            <button
              className="premium-btn premium-btn--sm premium-btn--green"
              style={{ marginTop: 20 }}
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
          /* ═══ GRID VIEW ═══ */
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key="grid"
            className="marketplace-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 16,
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
                    y: -6,
                    boxShadow: `0 12px 32px ${rc.glow}, 0 0 0 1px ${rc.border}`,
                  }}
                  style={{
                    background: rc.gradient,
                    border: `1px solid ${rc.border}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'box-shadow 0.2s ease',
                    minHeight: 220,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onClick={() => setSelectedItem(item)}
                >
                  {/* Rarity shimmer bar */}
                  <div
                    style={{
                      height: 2,
                      background: `linear-gradient(90deg, transparent, ${rc.color}, transparent)`,
                      opacity: 0.6,
                    }}
                  />

                  {/* Card content */}
                  <div style={{ padding: '14px 14px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Top: icon + wishlist */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          background: rc.bg,
                          border: `1px solid ${rc.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          boxShadow: `0 0 12px ${rc.glow}`,
                        }}
                      >
                        {item.icon}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleWishlist(item.id, item.name)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 8,
                          color: isWished ? '#f87171' : 'var(--space-steel)',
                          transition: 'all 0.15s',
                        }}
                      >
                        <Heart
                          className="h-4 w-4"
                          style={isWished ? { fill: '#f87171' } : {}}
                        />
                      </button>
                    </div>

                    {/* Name */}
                    <div
                      style={{
                        color: rc.color,
                        fontSize: 13,
                        fontWeight: 700,
                        marginBottom: 6,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </div>

                    {/* Type + Rarity */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <RarityBadge rarity={item.rarity} />
                      <span style={{ fontSize: 9, color: 'var(--space-fog)' }}>{item.type}</span>
                    </div>

                    {/* Price + trend */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--cyan-bright)' }}>
                          {item.price.toLocaleString()} <span style={{ fontSize: 9, fontWeight: 500 }}>μALGO</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          {trend.direction === 'up' && <TrendingUp className="h-3 w-3" style={{ color: '#22c55e' }} />}
                          {trend.direction === 'down' && <TrendingDown className="h-3 w-3" style={{ color: '#ef4444' }} />}
                          <span
                            style={{
                              fontSize: 9,
                              color: trend.direction === 'up' ? '#22c55e' : trend.direction === 'down' ? '#ef4444' : 'var(--space-fog)',
                              fontWeight: 600,
                            }}
                          >
                            {trend.direction !== 'flat' ? `${trend.pct.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                      </div>
                      <button
                        className="premium-btn premium-btn--xs premium-btn--green marketplace-card-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleBuy(item)
                        }}
                      >
                        <Zap className="h-3 w-3" />
                        Buy
                      </button>
                    </div>

                    {/* Seller */}
                    <div
                      style={{
                        marginTop: 'auto',
                        paddingTop: 8,
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: 9, color: 'var(--space-steel)' }}>
                        Seller: {item.seller}
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--space-steel)' }}>
                        {item.listedAt}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        ) : (
          /* ═══ LIST VIEW ═══ */
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
                borderBottom: '1px solid rgba(0, 255, 136, 0.15)',
                fontSize: 9,
                color: 'var(--space-fog)',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
              }}
            >
              <span></span>
              <span>Item</span>
              <span>Rarity</span>
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
                    background: 'rgba(34, 197, 94, 0.06)',
                  }}
                  className="marketplace-list-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px 1fr 90px 100px 120px 100px',
                    gap: 12,
                    padding: '12px 16px',
                    alignItems: 'center',
                    background: idx % 2 === 0 ? 'rgba(10, 15, 20, 0.3)' : 'rgba(13, 21, 32, 0.3)',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => setSelectedItem(item)}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      background: rc.bg,
                      border: `1px solid ${rc.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                  >
                    {item.icon}
                  </div>

                  {/* Name */}
                  <div>
                    <div style={{ color: rc.color, fontSize: 12, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 9, color: 'var(--space-steel)', marginTop: 1 }}>{item.type} • {item.listedAt}</div>
                  </div>

                  {/* Rarity */}
                  <RarityBadge rarity={item.rarity} />

                  {/* Price */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan-bright)' }}>
                    {item.price.toLocaleString()} <span style={{ fontSize: 8 }}>μA</span>
                  </div>

                  {/* Trend + Seller */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {trend.direction === 'up' && <TrendingUp className="h-3 w-3" style={{ color: '#22c55e' }} />}
                      {trend.direction === 'down' && <TrendingDown className="h-3 w-3" style={{ color: '#ef4444' }} />}
                      <span
                        style={{
                          fontSize: 10,
                          color: trend.direction === 'up' ? '#22c55e' : trend.direction === 'down' ? '#ef4444' : 'var(--space-fog)',
                          fontWeight: 600,
                        }}
                      >
                        {trend.direction !== 'flat' ? `${trend.pct.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                    <span style={{ fontSize: 9, color: 'var(--space-steel)' }}>{item.seller}</span>
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
                        padding: 8,
                        color: isWished ? '#f87171' : 'var(--space-steel)',
                      }}
                    >
                      <Heart className="h-3.5 w-3.5" style={isWished ? { fill: '#f87171' } : {}} />
                    </button>
                    <button
                      className="premium-btn premium-btn--xs premium-btn--green marketplace-card-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBuy(item)
                      }}
                    >
                      Buy
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* ═══ ITEM DETAIL MODAL ═══ */}
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
                background: 'rgba(3, 5, 8, 0.8)',
                backdropFilter: 'blur(8px)',
                zIndex: 1000,
              }}
            />

            {/* Modal */}
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
                background: 'var(--space-deep)',
                border: `1px solid ${RARITY_CONFIG[selectedItem.rarity].border}`,
                borderRadius: 14,
                zIndex: 1001,
                boxShadow: `0 0 40px ${RARITY_CONFIG[selectedItem.rarity].glow}, 0 24px 48px rgba(0,0,0,0.5)`,
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
                        top: 12,
                        right: 12,
                        background: 'rgba(10, 15, 20, 0.7)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        color: 'var(--space-fog)',
                        cursor: 'pointer',
                        padding: 4,
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
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
                        {/* Large icon */}
                        <div
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: 12,
                            background: rc.gradient,
                            border: `1px solid ${rc.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 36,
                            flexShrink: 0,
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
                                fontSize: 18,
                                fontWeight: 700,
                                margin: 0,
                                letterSpacing: '0.01em',
                              }}
                            >
                              {item.name}
                            </h3>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <RarityBadge rarity={item.rarity} />
                            <span style={{ fontSize: 10, color: 'var(--space-fog)' }}>{item.type}</span>
                            <span style={{ fontSize: 10, color: 'var(--space-steel)' }}>•</span>
                            <span style={{ fontSize: 10, color: 'var(--space-steel)' }}>Listed {item.listedAt}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--space-fog)', lineHeight: 1.5 }}>
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
                          background: 'rgba(10, 15, 20, 0.6)',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.05)',
                          marginBottom: 16,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--space-fog)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 2 }}>
                            CURRENT PRICE
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--cyan-bright)' }}>
                              {item.price.toLocaleString()}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--space-fog)' }}>μALGO</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 6 }}>
                              {trend.direction === 'up' && <TrendingUp className="h-3 w-3" style={{ color: '#22c55e' }} />}
                              {trend.direction === 'down' && <TrendingDown className="h-3 w-3" style={{ color: '#ef4444' }} />}
                              <span
                                style={{
                                  fontSize: 9,
                                  color: trend.direction === 'up' ? '#22c55e' : trend.direction === 'down' ? '#ef4444' : 'var(--space-fog)',
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
                              borderColor: isWished ? '#f87171' : 'rgba(255,255,255,0.15)',
                              color: isWished ? '#f87171' : 'var(--space-fog)',
                              background: isWished ? 'rgba(248,113,113,0.08)' : 'rgba(10,15,20,0.5)',
                            }}
                          >
                            <Heart className="h-3.5 w-3.5" style={isWished ? { fill: '#f87171' } : {}} />
                            {isWished ? 'Wishlisted' : 'Wishlist'}
                          </button>
                          <button
                            className="premium-btn premium-btn--sm premium-btn--green"
                            onClick={() => handleBuy(item)}
                          >
                            <Zap className="h-3.5 w-3.5" />
                            Buy Now
                          </button>
                        </div>
                      </div>

                      {/* Price History Chart */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <BarChart3 className="h-3.5 w-3.5" style={{ color: 'var(--cyan-bright)' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
                            PRICE HISTORY — 7 DAYS
                          </span>
                        </div>
                        <div
                          style={{
                            background: 'rgba(10, 15, 20, 0.5)',
                            borderRadius: 8,
                            border: '1px solid rgba(255,255,255,0.05)',
                            padding: '12px 8px 4px',
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
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                              <XAxis
                                dataKey="day"
                                tick={{ fill: 'var(--space-fog)', fontSize: 9 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fill: 'var(--space-fog)', fontSize: 9 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
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
                                activeDot={{ r: 4, fill: rc.color, stroke: '#fff', strokeWidth: 1.5 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* AI Price Analysis */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--purple-bright)' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
                            AI PRICE ANALYSIS
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 10,
                          }}
                        >
                          {/* Confidence */}
                          <div
                            style={{
                              background: 'rgba(0, 255, 136, 0.04)',
                              border: '1px solid rgba(0, 255, 136, 0.15)',
                              borderRadius: 8,
                              padding: '10px 12px',
                            }}
                          >
                            <div style={{ fontSize: 9, color: 'var(--space-fog)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>
                              CONFIDENCE
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green-neon)' }}>
                              {item.confidence}%
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                height: 3,
                                borderRadius: 2,
                                background: 'rgba(255,255,255,0.06)',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${item.confidence}%`,
                                  background: 'var(--green-neon)',
                                  borderRadius: 2,
                                }}
                              />
                            </div>
                          </div>

                          {/* Suggested Price */}
                          <div
                            style={{
                              background: 'rgba(34, 211, 238, 0.04)',
                              border: '1px solid rgba(34, 211, 238, 0.15)',
                              borderRadius: 8,
                              padding: '10px 12px',
                            }}
                          >
                            <div style={{ fontSize: 9, color: 'var(--space-fog)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>
                              SUGGESTED PRICE
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--cyan-bright)' }}>
                              {item.suggestedPrice.toLocaleString()}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--space-steel)', marginTop: 4 }}>
                              μALGO
                            </div>
                          </div>

                          {/* Rarity Score */}
                          <div
                            style={{
                              background: rc.bg,
                              border: `1px solid ${rc.border}`,
                              borderRadius: 8,
                              padding: '10px 12px',
                            }}
                          >
                            <div style={{ fontSize: 9, color: 'var(--space-fog)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4 }}>
                              RARITY SCORE
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: rc.color }}>
                              {item.rarityScore}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--space-steel)', marginTop: 4 }}>
                              <span>
                                {'█'.repeat(Math.round(item.rarityScore))}
                                {'░'.repeat(10 - Math.round(item.rarityScore))}
                              </span>
                              <span style={{ marginLeft: 4 }}>{item.rarityScore}/10</span>
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
                          background: 'rgba(10, 15, 20, 0.4)',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Shield className="h-3.5 w-3.5" style={{ color: 'var(--space-fog)' }} />
                          <span style={{ fontSize: 10, color: 'var(--space-fog)' }}>
                            Seller
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: 'var(--cyan-bright)',
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                          >
                            {item.seller}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Eye className="h-3 w-3" style={{ color: 'var(--space-steel)' }} />
                          <span style={{ fontSize: 9, color: 'var(--space-steel)' }}>
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
