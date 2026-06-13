/**
 * De-Shop SDK — Marketplace V2 (Premium) — Minecraft Theme
 * ═══════════════════════════════════════════════════════════
 * Minecraft Trading Hall with inventory-style grid, chest-style list,
 * tooltip-style detail modal, and enchantment-themed analysis.
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
// MOCK DATA GENERATOR — Minecraft Items
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
    addNotification('success', `Trade initiated for "${item.name}" at ${item.price.toLocaleString()} μA`)
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
              No trading hall items match your current filters. Try adjusting your search or clearing all filters.
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
                    boxShadow: `0 8px 20px ${rc.glow}, 0 0 0 2px ${rc.border}`,
                  }}
                  style={{
                    background: rc.gradient,
                    border: `3px solid ${rc.border}`,
                    borderRadius: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'box-shadow 0.2s ease',
                    imageRendering: 'pixelated',
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBuy(item)
                      }}
                      style={{
                        borderRadius: 0,
                        background: 'rgba(74,237,217,0.15)',
                        border: '2px solid rgba(74,237,217,0.4)',
                        color: '#4AEDD9',
                        width: '100%',
                        ...pixelFont,
                      }}
                    >
                      <Zap className="h-3 w-3" />
                      TRADE
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleBuy(item)
                      }}
                      style={{
                        borderRadius: 0,
                        background: 'rgba(74,237,217,0.15)',
                        border: '2px solid rgba(74,237,217,0.4)',
                        color: '#4AEDD9',
                        ...pixelFont,
                      }}
                    >
                      TRADE
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
                            onClick={() => handleBuy(item)}
                            style={{
                              borderRadius: 0,
                              background: 'rgba(74,237,217,0.2)',
                              border: '2px solid rgba(74,237,217,0.5)',
                              color: '#4AEDD9',
                              ...pixelFont,
                            }}
                          >
                            <Zap className="h-3.5 w-3.5" />
                            TRADE
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
