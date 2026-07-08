/**
 * De-Shop SDK — Marketplace V2 (Premium) — macOS Glassmorphism Theme
 * ═════════════════════════════════════════════════════════════════════
 * Premium, modern trading interface featuring glassmorphic design systems,
 * fluid layout grids, clean typographic hierarchy, and responsive data charts.
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
  TrendingUp,
  TrendingDown,
  Sparkles,
  Shield,
  Zap,
  Eye,
  ShoppingBag,
  BarChart3,
  Clock,
  Activity,
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
// RARITY CONFIG — Premium macOS Colors
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
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.04)',
    border: 'rgba(148, 163, 184, 0.12)',
    glow: 'rgba(148, 163, 184, 0.1)',
    badge: '#94a3b8',
    gradient: 'linear-gradient(135deg, rgba(148, 163, 184, 0.06), rgba(148, 163, 184, 0.01))',
    icon: '✨',
  },
  rare: {
    color: '#00f2fe',
    bg: 'rgba(0, 242, 254, 0.04)',
    border: 'rgba(0, 242, 254, 0.15)',
    glow: 'rgba(0, 242, 254, 0.12)',
    badge: '#00f2fe',
    gradient: 'linear-gradient(135deg, rgba(0, 242, 254, 0.06), rgba(0, 242, 254, 0.01))',
    icon: '⚡',
  },
  epic: {
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.04)',
    border: 'rgba(192, 132, 252, 0.15)',
    glow: 'rgba(192, 132, 252, 0.12)',
    badge: '#c084fc',
    gradient: 'linear-gradient(135deg, rgba(192, 132, 252, 0.06), rgba(192, 132, 252, 0.01))',
    icon: '🔮',
  },
  legendary: {
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.04)',
    border: 'rgba(251, 191, 36, 0.15)',
    glow: 'rgba(251, 191, 36, 0.12)',
    badge: '#fbbf24',
    gradient: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(251, 191, 36, 0.01))',
    icon: '👑',
  },
}

const RARITY_ORDER: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA GENERATOR — Assets
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
    id: '1',
    name: 'Diamond Sword',
    rarity: 'legendary',
    price: 2500,
    seller: 'Steve_42',
    icon: '⚔️',
    priceHistory: generatePriceHistory(2500, 0.12),
    confidence: 94,
    suggestedPrice: 2400,
    rarityScore: 9.2,
    listedAt: '2h ago',
    type: 'weapon',
    description: 'A mighty blade forged from the rarest gems in the Overworld. Sharpness V enchantment glows along the edge.',
  },
  {
    id: '2',
    name: 'Netherite Pickaxe',
    rarity: 'legendary',
    price: 3200,
    seller: 'Alex_Miner',
    icon: '⛏️',
    priceHistory: generatePriceHistory(3200, 0.10),
    confidence: 96,
    suggestedPrice: 3100,
    rarityScore: 9.5,
    listedAt: '30m ago',
    type: 'tool',
    description: 'The pinnacle of mining technology. Netherite alloy makes it faster and more durable than diamond.',
  },
  {
    id: '3',
    name: 'Ender Pearl',
    rarity: 'epic',
    price: 800,
    seller: 'Ender_Trader',
    icon: '💎',
    priceHistory: generatePriceHistory(800, 0.18),
    confidence: 88,
    suggestedPrice: 780,
    rarityScore: 7.8,
    listedAt: '5h ago',
    type: 'material',
    description: 'A mysterious orb harvested from the End dimension. Throw it to teleport — if you can stomach the trip.',
  },
  {
    id: '4',
    name: 'Enchanted Bow',
    rarity: 'epic',
    price: 1200,
    seller: 'Villager_7',
    icon: '🏹',
    priceHistory: generatePriceHistory(1200, 0.14),
    confidence: 86,
    suggestedPrice: 1150,
    rarityScore: 7.5,
    listedAt: '3h ago',
    type: 'weapon',
    description: 'Power V, Flame, and Infinity enchantments. One arrow is all you need with this legendary bow.',
  },
  {
    id: '5',
    name: 'Iron Chestplate',
    rarity: 'rare',
    price: 450,
    seller: 'Steve_42',
    icon: '🛡️',
    priceHistory: generatePriceHistory(450, 0.10),
    confidence: 82,
    suggestedPrice: 430,
    rarityScore: 5.4,
    listedAt: '1h ago',
    type: 'armor',
    description: 'Sturdy iron plating that has protected countless adventurers from creeper explosions.',
  },
  {
    id: '6',
    name: 'Golden Apple',
    rarity: 'epic',
    price: 950,
    seller: 'Notch_Fan',
    icon: '🍎',
    priceHistory: generatePriceHistory(950, 0.09),
    confidence: 89,
    suggestedPrice: 920,
    rarityScore: 8.1,
    listedAt: '1h ago',
    type: 'material',
    description: 'Not just any apple — this one glows with regeneration and absorption powers. A lifesaver in tough battles.',
  },
  {
    id: '7',
    name: 'Blaze Rod',
    rarity: 'rare',
    price: 350,
    seller: 'NetherWalker',
    icon: '🧪',
    priceHistory: generatePriceHistory(350, 0.16),
    confidence: 79,
    suggestedPrice: 370,
    rarityScore: 5.1,
    listedAt: '6h ago',
    type: 'material',
    description: 'A blazing rod from a fallen Blaze. Essential for brewing potions and crafting Eyes of Ender.',
  },
  {
    id: '8',
    name: 'Elytra Wings',
    rarity: 'legendary',
    price: 5000,
    seller: 'Ender_Trader',
    icon: '✨',
    priceHistory: generatePriceHistory(5000, 0.08),
    confidence: 91,
    suggestedPrice: 4800,
    rarityScore: 9.0,
    listedAt: '45m ago',
    type: 'accessory',
    description: 'Soar through the skies like the Ender Dragon. Found only in the End City ships.',
  },
  {
    id: '9',
    name: 'Totem of Undying',
    rarity: 'legendary',
    price: 8000,
    seller: 'Woodland_Master',
    icon: '🌟',
    priceHistory: generatePriceHistory(8000, 0.06),
    confidence: 97,
    suggestedPrice: 7800,
    rarityScore: 9.8,
    listedAt: '20m ago',
    type: 'accessory',
    description: 'Cheats death itself. Hold this totem and survive a fatal blow — but only once. Dropped by Evokers.',
  },
  {
    id: '10',
    name: 'Trident',
    rarity: 'epic',
    price: 1500,
    seller: 'Ocean_Explorer',
    icon: '🗡️',
    priceHistory: generatePriceHistory(1500, 0.13),
    confidence: 85,
    suggestedPrice: 1450,
    rarityScore: 7.3,
    listedAt: '4h ago',
    type: 'weapon',
    description: 'A powerful weapon from the ocean depths. Channel lightning with Riptide or throw it with Loyalty.',
  },
  {
    id: '11',
    name: 'Stone Sword',
    rarity: 'common',
    price: 50,
    seller: 'Villager_3',
    icon: '⚔️',
    priceHistory: generatePriceHistory(50, 0.25),
    confidence: 72,
    suggestedPrice: 55,
    rarityScore: 2.1,
    listedAt: '12h ago',
    type: 'weapon',
    description: 'A basic weapon for the early adventurer. Cobblestone craftsmanship — reliable but unremarkable.',
  },
  {
    id: '12',
    name: 'Iron Ingot',
    rarity: 'common',
    price: 25,
    seller: 'Cave_Dweller',
    icon: '🪨',
    priceHistory: generatePriceHistory(25, 0.30),
    confidence: 70,
    suggestedPrice: 28,
    rarityScore: 1.8,
    listedAt: '1d ago',
    type: 'material',
    description: 'The backbone of civilization. Smelted from iron ore, used in everything from tools to rails.',
  },
  {
    id: '13',
    name: 'Gold Ingot',
    rarity: 'rare',
    price: 120,
    seller: 'Alex_Miner',
    icon: '💫',
    priceHistory: generatePriceHistory(120, 0.20),
    confidence: 80,
    suggestedPrice: 110,
    rarityScore: 5.7,
    listedAt: '8h ago',
    type: 'material',
    description: 'Shiny and valuable, but soft. Piglins love it — use it to trade in the Nether.',
  },
  {
    id: '14',
    name: 'Emerald',
    rarity: 'rare',
    price: 100,
    seller: 'Villager_7',
    icon: '💚',
    priceHistory: generatePriceHistory(100, 0.15),
    confidence: 78,
    suggestedPrice: 95,
    rarityScore: 4.8,
    listedAt: '10h ago',
    type: 'material',
    description: 'The currency of village trading. Hard to find but villagers will trade almost anything for these.',
  },
  {
    id: '15',
    name: 'Lapis Lazuli',
    rarity: 'common',
    price: 30,
    seller: 'Cave_Dweller',
    icon: '💎',
    priceHistory: generatePriceHistory(30, 0.22),
    confidence: 75,
    suggestedPrice: 32,
    rarityScore: 2.5,
    listedAt: '2d ago',
    type: 'material',
    description: 'Deep blue gemstone found deep underground. Essential for enchanting your equipment at the table.',
  },
  {
    id: '16',
    name: 'Redstone Dust',
    rarity: 'common',
    price: 15,
    seller: 'Redstone_King',
    icon: '🔴',
    priceHistory: generatePriceHistory(15, 0.30),
    confidence: 68,
    suggestedPrice: 18,
    rarityScore: 1.5,
    listedAt: '3d ago',
    type: 'material',
    description: 'The power of electricity in dust form. Build circuits, traps, and elaborate contraptions.',
  },
  {
    id: '17',
    name: 'Obsidian Block',
    rarity: 'rare',
    price: 200,
    seller: 'NetherWalker',
    icon: '⬛',
    priceHistory: generatePriceHistory(200, 0.11),
    confidence: 81,
    suggestedPrice: 190,
    rarityScore: 5.3,
    listedAt: '7h ago',
    type: 'material',
    description: 'The hardest block in the Overworld. Only a diamond pickaxe can mine it. Used to build Nether portals.',
  },
  {
    id: '18',
    name: 'Nether Star',
    rarity: 'legendary',
    price: 10000,
    seller: 'Wither_Slayer',
    icon: '✴️',
    priceHistory: generatePriceHistory(10000, 0.05),
    confidence: 98,
    suggestedPrice: 9500,
    rarityScore: 9.9,
    listedAt: '15m ago',
    type: 'material',
    description: 'Dropped by the fearsome Wither boss. Used to craft a Beacon — the ultimate status symbol.',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// FLOOR PRICE DATA — Per Rarity
// ═══════════════════════════════════════════════════════════════════════════════

const floorPriceData: Record<Rarity, { price: number; change24h: number; listCount: number }> = {
  common:   { price: 15,   change24h: -2.1, listCount: 42 },
  rare:     { price: 100,  change24h: +4.8, listCount: 28 },
  epic:     { price: 800,  change24h: +12.3, listCount: 14 },
  legendary:{ price: 2500, change24h: +8.7, listCount: 6 },
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECENTLY SOLD DATA
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

const recentSales: RecentSale[] = [
  { id: 's1', name: 'Nether Star', icon: '✴️', rarity: 'legendary', salePrice: 9800, buyer: 'Wither_Slayer', soldAt: '3m ago' },
  { id: 's2', name: 'Elytra Wings', icon: '✨', rarity: 'legendary', salePrice: 4750, buyer: 'SkyRider_22', soldAt: '8m ago' },
  { id: 's3', name: 'Golden Apple', icon: '🍎', rarity: 'epic', salePrice: 920, buyer: 'PvP_Master', soldAt: '15m ago' },
  { id: 's4', name: 'Enchanted Bow', icon: '🏹', rarity: 'epic', salePrice: 1180, buyer: 'Archer_King', soldAt: '22m ago' },
  { id: 's5', name: 'Diamond Sword', icon: '⚔️', rarity: 'legendary', salePrice: 2400, buyer: 'BladeRunner', soldAt: '35m ago' },
  { id: 's6', name: 'Emerald', icon: '💚', rarity: 'rare', salePrice: 95, buyer: 'Trader_Joe', soldAt: '42m ago' },
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
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
}

const listVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 10,
    transition: { duration: 0.15, ease: 'easeIn' as const },
  },
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP FOR PRICE CHART — macOS Glassmorphism Style
// ═══════════════════════════════════════════════════════════════════════════════

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'rgba(15, 17, 28, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '10px',
        padding: '8px 12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
      }}
    >
      <p style={{ color: '#94a3b8', fontSize: 10, marginBottom: 2, fontFamily: 'Outfit, sans-serif' }}>{label}</p>
      <p style={{ color: '#4AEDD9', fontSize: 12, fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>
        {payload[0].value.toLocaleString()} <span style={{ fontSize: 8, color: '#94a3b8' }}>ALGO</span>
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
        background: config.bg,
        color: config.color,
        fontSize: 9,
        padding: '2px 8px',
        borderRadius: 999,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase' as const,
        border: `1px solid ${config.border}`,
      }}
    >
      {rarity}
    </span>
  )
}

const premiumFont = {
  fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif",
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

  // ── Buy handler (Trade) ──────────────────────────────────────────────────
  const handleBuy = (item: MarketplaceListing) => {
    addNotification('success', `Purchase initiated for "${item.name}" at ${item.price.toLocaleString()} ALGO`)
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
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.01)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingBag className="h-5 w-5" style={{ color: '#00f2fe' }} />
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                margin: 0,
                ...premiumFont,
              }}
            >
              P2P Marketplace
            </h2>
            <span
              style={{
                fontSize: 9,
                color: '#00f2fe',
                background: 'rgba(0, 242, 254, 0.1)',
                padding: '2px 8px',
                borderRadius: 999,
                fontWeight: 600,
                border: '1px solid rgba(0, 242, 254, 0.3)',
              }}
            >
              V2
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#94a3b8', ...premiumFont }}>
              {filteredListings.length} item{filteredListings.length !== 1 ? 's' : ''}
            </span>
            {wishlist.size > 0 && (
              <span
                style={{
                  fontSize: 10,
                  color: '#f87171',
                  background: 'rgba(248, 113, 113, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  border: '1px solid rgba(248, 113, 113, 0.3)',
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
                color: '#94a3b8',
              }}
            />
            <input
              className="premium-input"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                fontSize: 11,
                paddingLeft: 30,
                paddingRight: 8,
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#ffffff',
                height: 32,
                ...premiumFont,
              }}
            />
          </div>

          {/* Rarity filter */}
          <div style={{ position: 'relative' }}>
            <select
              className="premium-select"
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value as Rarity | 'all')}
              style={{
                fontSize: 11,
                minWidth: 120,
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#ffffff',
                height: 32,
                padding: '0 8px',
                ...premiumFont,
              }}
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
            style={{
              fontSize: 11,
              minWidth: 140,
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#ffffff',
              height: 32,
              padding: '0 8px',
              ...premiumFont,
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
              background: showFilters ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255, 255, 255, 0.03)',
              borderColor: showFilters ? 'rgba(0, 242, 254, 0.3)' : 'rgba(255, 255, 255, 0.08)',
              color: showFilters ? '#00f2fe' : '#94a3b8',
              borderRadius: 8,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              ...premiumFont,
            }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </button>

          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.03)',
              height: 32,
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0 10px',
                background: viewMode === 'grid' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                border: 'none',
                borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                color: viewMode === 'grid' ? '#00f2fe' : '#94a3b8',
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
                padding: '0 10px',
                background: viewMode === 'list' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                border: 'none',
                color: viewMode === 'list' ? '#00f2fe' : '#94a3b8',
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
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', ...premiumFont }}>
                  PRICE RANGE
                </span>
                <input
                  className="premium-input"
                  placeholder="Min ALGO"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  type="number"
                  style={{
                    width: 100,
                    fontSize: 11,
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: '#ffffff',
                    height: 28,
                    ...premiumFont,
                  }}
                />
                <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                <input
                  className="premium-input"
                  placeholder="Max ALGO"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  type="number"
                  style={{
                    width: 100,
                    fontSize: 11,
                    borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: '#ffffff',
                    height: 28,
                    ...premiumFont,
                  }}
                />
                {(priceMin || priceMax) && (
                  <button
                    onClick={() => { setPriceMin(''); setPriceMax('') }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      fontSize: 10,
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 9, color: '#94a3b8', ...premiumFont }}>
                  15 — 10,000 ALGO
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
          gap: 8,
          overflowX: 'auto',
          background: 'rgba(255, 255, 255, 0.005)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {(Object.keys(floorPriceData) as Rarity[]).map((rarity) => {
          const fp = floorPriceData[rarity]
          const rc = RARITY_CONFIG[rarity]
          return (
            <motion.div
              key={rarity}
              whileHover={{ y: -2, background: 'rgba(255, 255, 255, 0.03)' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: 'rgba(255, 255, 255, 0.015)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 8,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 8, color: rc.color, fontWeight: 700, ...premiumFont, textTransform: 'uppercase' }}>
                {rarity}
              </span>
              <span style={{ fontSize: 10, color: '#4AEDD9', fontWeight: 700, ...premiumFont }}>
                {fp.price.toLocaleString()} <span style={{ fontSize: 7, color: '#94a3b8' }}>ALGO</span>
              </span>
              <span style={{
                fontSize: 8,
                color: fp.change24h >= 0 ? '#2ECC71' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                fontWeight: 600,
              }}>
                {fp.change24h >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {Math.abs(fp.change24h)}%
              </span>
              <span style={{ fontSize: 7, color: '#94a3b8', ...premiumFont }}>{fp.listCount} listed</span>
            </motion.div>
          )
        })}
      </div>

      {/* ═══ RECENTLY SOLD ═══ */}
      <div
        style={{
          padding: '10px 20px',
          background: 'rgba(255, 255, 255, 0.002)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Activity className="h-3.5 w-3.5" style={{ color: '#2ECC71' }} />
          <span style={{ fontSize: 9, color: '#2ECC71', fontWeight: 700, letterSpacing: '0.06em', ...premiumFont }}>
            RECENTLY SOLD
          </span>
          <span
            style={{
              width: 5,
              height: 5,
              background: '#2ECC71',
              borderRadius: '50%',
              boxShadow: '0 0 4px #2ECC71',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
          {recentSales.map((sale) => {
            const rc = RARITY_CONFIG[sale.rarity]
            return (
              <motion.div
                key={sale.id}
                whileHover={{ y: -2, background: 'rgba(255, 255, 255, 0.03)' }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8,
                  flexShrink: 0,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: 16 }}>{sale.icon}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, color: rc.color, fontWeight: 700, ...premiumFont }}>{sale.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                    <span style={{ fontSize: 9, color: '#4AEDD9', fontWeight: 700, ...premiumFont }}>
                      {sale.salePrice.toLocaleString()} ALGO
                    </span>
                    <span style={{ fontSize: 7, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 2 }}>
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
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              }}
            >
              <ShoppingBag className="h-10 w-10" style={{ color: '#94a3b8', opacity: 0.5 }} />
            </div>
            <h3
              style={{
                color: '#ffffff',
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 8,
                letterSpacing: '-0.01em',
                ...premiumFont,
              }}
            >
              No Items Found
            </h3>
            <p style={{ color: '#94a3b8', fontSize: 12, maxWidth: 320, lineHeight: 1.6, marginBottom: 4 }}>
              No marketplace items match your current filters. Try adjusting your search or clearing all filters.
            </p>
            <button
              className="premium-btn premium-btn--sm premium-btn--green"
              style={{ marginTop: 20, borderRadius: 8, ...premiumFont }}
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 12,
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
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.015)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 12,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.25s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    backdropFilter: 'blur(4px)',
                  }}
                  onClick={() => setSelectedItem(item)}
                >
                  {/* Card content */}
                  <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* Item icon — slots */}
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
                          color: isWished ? '#f87171' : '#94a3b8',
                          transition: 'all 0.15s',
                        }}
                      >
                        <Heart
                          className="h-3.5 w-3.5"
                          style={isWished ? { fill: '#f87171' } : {}}
                        />
                      </button>
                      {/* Rarity dot */}
                      <span style={{ fontSize: 10 }}>{rc.icon}</span>
                    </div>

                    {/* Icon slot — premium glass container */}
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        marginBottom: 10,
                        boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2)',
                      }}
                    >
                      {item.icon}
                    </div>

                    {/* Name */}
                    <div
                      style={{
                        color: rc.color,
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 4,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%',
                        ...premiumFont,
                      }}
                    >
                      {item.name}
                    </div>

                    {/* Rarity badge */}
                    <div style={{ marginBottom: 8 }}>
                      <RarityBadge rarity={item.rarity} />
                    </div>

                    {/* Price */}
                    <div style={{ textAlign: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#4AEDD9', ...premiumFont }}>
                        {item.price.toLocaleString()} <span style={{ fontSize: 8, color: '#94a3b8' }}>ALGO</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center', marginTop: 2 }}>
                        {trend.direction === 'up' && <TrendingUp className="h-3 w-3" style={{ color: '#2ECC71' }} />}
                        {trend.direction === 'down' && <TrendingDown className="h-3 w-3" style={{ color: '#ef4444' }} />}
                        <span
                          style={{
                            fontSize: 8,
                            color: trend.direction === 'up' ? '#2ECC71' : trend.direction === 'down' ? '#ef4444' : '#94a3b8',
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBuy(item)
                      }}
                      style={{
                        borderRadius: 8,
                        background: 'rgba(0, 242, 254, 0.1)',
                        border: '1px solid rgba(0, 242, 254, 0.3)',
                        color: '#00f2fe',
                        width: '100%',
                        height: 28,
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        ...premiumFont,
                      }}
                    >
                      <Zap className="h-3 w-3" />
                      Buy Asset
                    </button>

                    {/* Seller */}
                    <div
                      style={{
                        marginTop: 10,
                        width: '100%',
                        paddingTop: 8,
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: 8, color: '#94a3b8' }}>
                        {item.seller}
                      </span>
                      <span style={{ fontSize: 8, color: '#94a3b8' }}>
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
            style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {/* Header row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 100px 100px 120px 120px',
                gap: 12,
                padding: '10px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: 8,
                color: '#94a3b8',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                background: 'rgba(255, 255, 255, 0.015)',
                borderRadius: 8,
                ...premiumFont,
              }}
            >
              <span></span>
              <span>Asset</span>
              <span>Quality</span>
              <span>Price</span>
              <span>Trend / Seller</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
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
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                  className="marketplace-list-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px 1fr 100px 100px 120px 120px',
                    gap: 12,
                    padding: '12px 16px',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.005)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: 8,
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
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
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
                    <div style={{ color: rc.color, fontSize: 11, fontWeight: 600, ...premiumFont }}>{item.name}</div>
                    <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 1 }}>{item.type} • {item.listedAt}</div>
                  </div>

                  {/* Rarity */}
                  <div>
                    <RarityBadge rarity={item.rarity} />
                  </div>

                  {/* Price */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4AEDD9', ...premiumFont }}>
                    {item.price.toLocaleString()} <span style={{ fontSize: 8, color: '#94a3b8' }}>ALGO</span>
                  </div>

                  {/* Trend + Seller */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {trend.direction === 'up' && <TrendingUp className="h-3 w-3" style={{ color: '#2ECC71' }} />}
                      {trend.direction === 'down' && <TrendingDown className="h-3 w-3" style={{ color: '#ef4444' }} />}
                      <span
                        style={{
                          fontSize: 9,
                          color: trend.direction === 'up' ? '#2ECC71' : trend.direction === 'down' ? '#ef4444' : '#94a3b8',
                          fontWeight: 600,
                        }}
                      >
                        {trend.direction !== 'flat' ? `${trend.pct.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                    <span style={{ fontSize: 8, color: '#94a3b8' }}>{item.seller}</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
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
                        color: isWished ? '#f87171' : '#94a3b8',
                      }}
                    >
                      <Heart className="h-3.5 w-3.5" style={isWished ? { fill: '#f87171' } : {}} />
                    </button>
                    <button
                      className="premium-btn premium-btn--xs marketplace-card-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBuy(item)
                      }}
                      style={{
                        borderRadius: 8,
                        background: 'rgba(0, 242, 254, 0.1)',
                        border: '1px solid rgba(0, 242, 254, 0.3)',
                        color: '#00f2fe',
                        height: 24,
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '0 8px',
                        ...premiumFont,
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
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
              }}
            />

            {/* Modal — premium glass style */}
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
                maxHeight: '85vh',
                overflowY: 'auto',
                background: 'rgba(15, 17, 28, 0.85)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 16,
                zIndex: 1001,
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
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
                        top: 14,
                        right: 14,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '50%',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 6,
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>

                    <div style={{ padding: '24px' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                        {/* Large icon — slot */}
                        <div
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: 14,
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 36,
                            flexShrink: 0,
                            boxShadow: `0 0 20px ${rc.glow}`,
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
                                letterSpacing: '-0.01em',
                                ...premiumFont,
                              }}
                            >
                              {item.name}
                            </h3>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                            <RarityBadge rarity={item.rarity} />
                            <span style={{ fontSize: 9, color: '#94a3b8', ...premiumFont }}>{item.type}</span>
                            <span style={{ fontSize: 9, color: 'rgba(255, 255, 255, 0.2)' }}>•</span>
                            <span style={{ fontSize: 9, color: '#94a3b8' }}>Listed {item.listedAt}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5, ...premiumFont }}>
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
                          padding: '14px 18px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: 12,
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          marginBottom: 20,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 2, ...premiumFont }}>
                            CURRENT PRICE
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                            <span style={{ fontSize: 20, fontWeight: 700, color: '#4AEDD9', ...premiumFont }}>
                              {item.price.toLocaleString()}
                            </span>
                            <span style={{ fontSize: 9, color: '#94a3b8', ...premiumFont }}>ALGO</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 6 }}>
                              {trend.direction === 'up' && <TrendingUp className="h-3 w-3" style={{ color: '#2ECC71' }} />}
                              {trend.direction === 'down' && <TrendingDown className="h-3 w-3" style={{ color: '#ef4444' }} />}
                              <span
                                style={{
                                  fontSize: 9,
                                  color: trend.direction === 'up' ? '#2ECC71' : trend.direction === 'down' ? '#ef4444' : '#94a3b8',
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
                              borderColor: isWished ? '#f87171' : 'rgba(255, 255, 255, 0.08)',
                              color: isWished ? '#f87171' : '#94a3b8',
                              background: isWished ? 'rgba(248,113,113,0.08)' : 'rgba(255, 255, 255, 0.03)',
                              borderRadius: 8,
                              height: 32,
                              ...premiumFont,
                            }}
                          >
                            <Heart className="h-3.5 w-3.5" style={isWished ? { fill: '#f87171' } : {}} />
                            {isWished ? 'Saved' : 'Save'}
                          </button>
                          <button
                            className="premium-btn premium-btn--sm"
                            onClick={() => handleBuy(item)}
                            style={{
                              borderRadius: 8,
                              background: 'rgba(0, 242, 254, 0.15)',
                              border: '1px solid rgba(0, 242, 254, 0.3)',
                              color: '#00f2fe',
                              height: 32,
                              ...premiumFont,
                            }}
                          >
                            <Zap className="h-3.5 w-3.5" />
                            Buy Asset
                          </button>
                        </div>
                      </div>

                      {/* Trading History Chart */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <BarChart3 className="h-3.5 w-3.5" style={{ color: '#00f2fe' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em', ...premiumFont }}>
                            TRADING HISTORY — 7 DAYS
                          </span>
                        </div>
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.01)',
                            borderRadius: 12,
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '12px 8px 4px',
                          }}
                        >
                          <ResponsiveContainer width="100%" height={120}>
                            <AreaChart data={item.priceHistory}>
                              <defs>
                                <linearGradient id={`grad-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={rc.color} stopOpacity={0.2} />
                                  <stop offset="100%" stopColor={rc.color} stopOpacity={0.01} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                              <XAxis
                                dataKey="day"
                                tick={{ fill: '#94a3b8', fontSize: 8 }}
                                axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fill: '#94a3b8', fontSize: 8 }}
                                axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
                                tickLine={false}
                                width={50}
                                tickFormatter={(v: number) => `${v.toLocaleString()}`}
                              />
                              <Tooltip content={<ChartTooltip />} />
                              <Area
                                type="monotone"
                                dataKey="price"
                                stroke={rc.color}
                                strokeWidth={1.5}
                                fill={`url(#grad-${item.id})`}
                                dot={false}
                                activeDot={{ r: 4, fill: rc.color, stroke: '#ffffff', strokeWidth: 1 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Appraisal & Rarity Stats */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Sparkles className="h-3.5 w-3.5" style={{ color: '#c084fc' }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em', ...premiumFont }}>
                            MARKET INTELLIGENCE
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 8,
                          }}
                        >
                          {/* Confidence Score */}
                          <div
                            style={{
                              background: 'rgba(255, 255, 255, 0.015)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: 12,
                              padding: '10px',
                            }}
                          >
                            <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4, ...premiumFont }}>
                              CONFIDENCE SCORE
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#4AEDD9', ...premiumFont }}>
                              {item.confidence}%
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                height: 3,
                                borderRadius: 999,
                                background: 'rgba(255, 255, 255, 0.05)',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${item.confidence}%`,
                                  background: '#4AEDD9',
                                  borderRadius: 999,
                                }}
                              />
                            </div>
                          </div>

                          {/* Suggested Price / Appraisal */}
                          <div
                            style={{
                              background: 'rgba(255, 255, 255, 0.015)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: 12,
                              padding: '10px',
                            }}
                          >
                            <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4, ...premiumFont }}>
                              APPRAISAL VALUE
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#c084fc', ...premiumFont }}>
                              {item.suggestedPrice.toLocaleString()}
                            </div>
                            <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 4, ...premiumFont }}>
                              ALGO
                            </div>
                          </div>

                          {/* Rarity Level */}
                          <div
                            style={{
                              background: 'rgba(255, 255, 255, 0.015)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: 12,
                              padding: '10px',
                            }}
                          >
                            <div style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 4, ...premiumFont }}>
                              RARITY SCORE
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: rc.color, ...premiumFont }}>
                              {item.rarityScore}/10
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                height: 3,
                                borderRadius: 999,
                                background: 'rgba(255, 255, 255, 0.05)',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${item.rarityScore * 10}%`,
                                  background: rc.color,
                                  borderRadius: 999,
                                }}
                              />
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
                          background: 'rgba(255, 255, 255, 0.01)',
                          borderRadius: 12,
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Shield className="h-3.5 w-3.5" style={{ color: '#94a3b8' }} />
                          <span style={{ fontSize: 9, color: '#94a3b8', ...premiumFont }}>
                            Seller
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#4AEDD9',
                              ...premiumFont,
                            }}
                          >
                            {item.seller}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Eye className="h-3 w-3" style={{ color: '#94a3b8' }} />
                          <span style={{ fontSize: 8, color: '#94a3b8', ...premiumFont }}>
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
