/**
 * De-Shop SDK — Profile / Stats Page (Premium — Minecraft Theme)
 * ══════════════════════════════════════════════
 * Achievements → Advancements, Transaction History → Village Ledger,
 * Portfolio Analytics → Ender Chest Stats, Connected Accounts → Portal Links
 * All in Minecraft earthy dark theme with pixel fonts and no border-radius.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy,
  Check,
  Edit3,
  Sparkles,
  ShoppingCart,
  Coins,
  Tag,
  ArrowDownToLine,
  Clock,
  Zap,
  Wallet,
  ChevronRight,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Shield,
  Unplug,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useDeShopStore } from '../store/useDeShopStore'
import { useWallet } from '@txnlab/use-wallet-react'
import { ellipseAddress } from '../utils/ellipseAddress'

// ═══════════════════════════════════════════════════════════════════════════════
// MINECRAFT THEME CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const MC = {
  // Earthy palette
  dirt: '#8B6914',
  dirtDark: '#6B4F0A',
  dirtLight: '#A07D1E',
  stone: '#7A7A7A',
  stoneDark: '#5A5A5A',
  stoneLight: '#999999',
  grass: '#5D8C2E',
  grassDark: '#4A7024',
  grassLight: '#6FA035',
  emerald: '#2ECC71',
  emeraldDark: '#1A9B4E',
  emeraldGlow: 'rgba(46, 204, 113, 0.3)',
  diamond: '#4DD0E1',
  diamondDark: '#26C6DA',
  diamondGlow: 'rgba(77, 208, 225, 0.3)',
  gold: '#FFD700',
  goldDark: '#DAA520',
  goldGlow: 'rgba(255, 215, 0, 0.3)',
  redstone: '#FF3333',
  redstoneGlow: 'rgba(255, 51, 51, 0.3)',
  netherite: '#4A4040',
  netheriteLight: '#6A5555',
  obsidian: '#1A1A2E',
  ender: '#9B59B6',
  enderGlow: 'rgba(155, 89, 182, 0.3)',
  nightSky: '#1a1a2e',
  panelBg: 'rgba(20, 20, 35, 0.92)',
  panelBorder: 'rgba(139, 105, 20, 0.5)',
  textLight: '#E0D8C8',
  textMuted: '#9A917E',
  textDark: '#6A6355',
}

const mcBorder = `3px solid ${MC.dirt}`
const mcInnerBorder = `1px solid ${MC.dirtLight}`
const mcPanelShadow = `4px 4px 0px ${MC.dirtDark}, inset 1px 1px 0px ${MC.dirtLight}33`

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Minecraft Advancements ────────────────────────────────────────────────────

interface Achievement {
  id: string
  name: string
  description: string
  earned: boolean
  earnedDate?: string
  emoji: string
}

const achievements: Achievement[] = [
  {
    id: 'first-ingot',
    name: 'First Ingot',
    description: 'Forge your first blockchain asset',
    earned: true,
    earnedDate: '2024-11-15',
    emoji: '⚒️',
  },
  {
    id: 'wandering-trader',
    name: 'Wandering Trader',
    description: 'Complete your first trade',
    earned: true,
    earnedDate: '2024-12-03',
    emoji: '🧳',
  },
  {
    id: 'hoarder',
    name: 'Hoarder',
    description: 'Own 5 or more rare items',
    earned: false,
    emoji: '💎',
  },
  {
    id: 'diamond-hands',
    name: 'Diamond Hands',
    description: 'Trade over 10,000 μALGO',
    earned: false,
    emoji: '💎',
  },
  {
    id: 'pioneer',
    name: 'Pioneer',
    description: 'Joined in the first era',
    earned: true,
    earnedDate: '2025-01-20',
    emoji: '🏕️',
  },
  {
    id: 'portal-linked',
    name: 'Portal Linked',
    description: 'Connected Steam account',
    earned: false,
    emoji: '🌀',
  },
]

// ─── Village Ledger (Transaction History) ──────────────────────────────────────

type TxType = 'Mint' | 'Buy' | 'Sell' | 'List' | 'Withdraw'
type TxStatus = 'Confirmed' | 'Pending'

interface Transaction {
  id: string
  type: TxType
  itemName: string
  price: number
  counterparty: string
  date: string
  status: TxStatus
}

const txTypeLabel: Record<TxType, string> = {
  Mint: 'Forged',
  Buy: 'Traded',
  Sell: 'Sold',
  List: 'Displayed',
  Withdraw: 'Withdrawn',
}

const txTypeEmoji: Record<TxType, string> = {
  Mint: '⚒️',
  Buy: '🤝',
  Sell: '💰',
  List: '🏪',
  Withdraw: '⬇️',
}

const txTypeColor: Record<TxType, string> = {
  Mint: MC.emerald,
  Buy: MC.diamond,
  Sell: MC.gold,
  List: MC.ender,
  Withdraw: MC.redstone,
}

const mockTransactions: Transaction[] = [
  { id: 'tx-1', type: 'Buy', itemName: 'Diamond Pickaxe', price: 58400, counterparty: 'VILLAGER7X...K4M2', date: '2025-03-03 14:23', status: 'Confirmed' },
  { id: 'tx-2', type: 'Sell', itemName: 'Ender Pearl', price: 34200, counterparty: 'VILLAGER3F...N8P1', date: '2025-03-03 11:05', status: 'Confirmed' },
  { id: 'tx-3', type: 'Mint', itemName: 'Netherite Sword', price: 0, counterparty: 'You', date: '2025-03-02 22:17', status: 'Confirmed' },
  { id: 'tx-4', type: 'List', itemName: 'Iron Chestplate', price: 22800, counterparty: 'You', date: '2025-03-02 18:40', status: 'Confirmed' },
  { id: 'tx-5', type: 'Buy', itemName: 'Enchanted Bow', price: 112000, counterparty: 'VILLAGER9A...Q5R7', date: '2025-03-02 09:12', status: 'Confirmed' },
  { id: 'tx-6', type: 'Withdraw', itemName: 'Golden Apple', price: 45000, counterparty: 'You', date: '2025-03-01 20:55', status: 'Confirmed' },
  { id: 'tx-7', type: 'Buy', itemName: 'Blaze Rod', price: 45000, counterparty: 'VILLAGER2B...W3T9', date: '2025-03-01 15:33', status: 'Pending' },
  { id: 'tx-8', type: 'Sell', itemName: 'Creeper Head', price: 89500, counterparty: 'VILLAGER6D...Y1U4', date: '2025-02-28 12:08', status: 'Confirmed' },
  { id: 'tx-9', type: 'Mint', itemName: 'TNT Block', price: 0, counterparty: 'You', date: '2025-02-28 07:45', status: 'Confirmed' },
  { id: 'tx-10', type: 'List', itemName: 'Obsidian Shard', price: 76300, counterparty: 'You', date: '2025-02-27 21:30', status: 'Confirmed' },
  { id: 'tx-11', type: 'Buy', itemName: 'Totem of Undying', price: 64700, counterparty: 'VILLAGER8E...L2H6', date: '2025-02-27 16:22', status: 'Confirmed' },
  { id: 'tx-12', type: 'Sell', itemName: 'Ghast Tear', price: 19900, counterparty: 'VILLAGER1C...M5J8', date: '2025-02-27 10:15', status: 'Pending' },
]

// ─── Ender Chest Stats (Portfolio Data) ────────────────────────────────────────

const rarityDistribution = [
  { name: 'Iron', count: 5, color: '#AAAAAA' },
  { name: 'Gold', count: 3, color: '#FFD700' },
  { name: 'Diamond', count: 2, color: '#4DD0E1' },
  { name: 'Netherite', count: 1, color: '#4A4040' },
]

const portfolioPerformance = Array.from({ length: 7 }, (_, i) => {
  const day = new Date()
  day.setDate(day.getDate() - (6 - i))
  const base = 285 + i * 4.5
  const noise = Math.sin(i * 1.7) * 8 + (Math.random() * 6 - 3)
  return {
    day: day.toLocaleDateString('en', { weekday: 'short' }),
    value: +(base + noise).toFixed(2),
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM TOOLTIP (Minecraft style)
// ═══════════════════════════════════════════════════════════════════════════════

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: MC.panelBg,
        border: mcBorder,
        padding: '8px 12px',
        boxShadow: mcPanelShadow,
      }}
    >
      <p style={{ color: MC.textMuted, fontSize: 11, marginBottom: 4, fontFamily: "'Courier New', monospace" }}>{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color || MC.emerald, fontSize: 13, fontWeight: 700, fontFamily: "'Courier New', monospace" }}>
          {entry.name === 'value' ? 'Ender Chest' : entry.name}: {entry.name === 'value' ? `${entry.value} ⬡` : entry.value}
        </p>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatMicroAlgo(val: number): string {
  if (val === 0) return '—'
  return `${(val / 1000).toFixed(1)}k μALGO`
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ProfilePage() {
  const { activeAddress } = useWallet()
  const { steamProfile, inventory, setSteamProfile, addNotification } = useDeShopStore()
  const [copied, setCopied] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [displayNameValue, setDisplayNameValue] = useState('')

  // Theme detection for Recharts tick colors
  const [isLightTheme, setIsLightTheme] = useState(false)
  useEffect(() => {
    const checkTheme = () => setIsLightTheme(document.documentElement.getAttribute('data-theme') === 'light')
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  // Parse Steam login callback from URL hash fragment
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('steam_id=')) {
      const params = new URLSearchParams(hash.substring(1))
      const steamId = params.get('steam_id')
      if (steamId) {
        fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/auth/steam/profile/${steamId}`)
          .then(res => res.json())
          .then(data => {
            if (data.profile) setSteamProfile(data.profile)
          })
          .catch(err => console.error('Failed to fetch steam profile:', err))
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [setSteamProfile])

  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null)

  const displayName = steamProfile?.personaname || (activeAddress ? ellipseAddress(activeAddress, 8) : 'Steve')
  const avatarUrl = steamProfile?.avatarfull || null

  const handleCopyAddress = () => {
    if (activeAddress) {
      navigator.clipboard.writeText(activeAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const [steamConnecting, setSteamConnecting] = useState(false)

  const handleSteamConnect = async () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'
    setSteamConnecting(true)
    try {
      // Check if the backend is reachable before redirecting
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(`${backendUrl}/auth/steam/health`, { method: 'GET', signal: controller.signal })
      clearTimeout(timeoutId)
      if (res.ok) {
        window.location.href = `${backendUrl}/auth/steam`
      } else {
        addNotification('error', 'Backend not available. Please start the Flask server first.')
      }
    } catch {
      addNotification('error', 'Backend not available. Please start the Flask server first.')
    } finally {
      setSteamConnecting(false)
    }
  }

  const handleStartEditName = () => {
    setDisplayNameValue(steamProfile?.personaname || '')
    setEditingName(true)
  }

  const handleSaveName = () => {
    setEditingName(false)
    // In a real app, this would save the display name to the backend
  }

  const statsRow = [
    { label: 'Emeralds Spent 💎', value: '3.2k', color: MC.emerald },
    { label: 'Items in Chest 📦', value: String(inventory.length || 11), color: MC.diamond },
    { label: 'Trading Profit 📈', value: '+12.4%', color: MC.gold },
    { label: 'Chest Displays 🏪', value: '3', color: MC.ender },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        height: '100%',
        overflowY: 'auto',
        paddingRight: 4,
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          PLAYER PROFILE HEADER — Minecraft Player Card
          ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        variants={itemVariants}
        style={{
          background: MC.panelBg,
          border: mcBorder,
          padding: 20,
          boxShadow: mcPanelShadow,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          {/* Avatar — Steve or Steam */}
          <div
            style={{
              position: 'relative',
              width: 64,
              height: 64,
              flexShrink: 0,
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Player Avatar"
                style={{
                  width: 64,
                  height: 64,
                  imageRendering: 'pixelated',
                  border: `2px solid ${MC.dirtLight}`,
                }}
              />
            ) : (
              <img
                src="/minecraft/steve-avatar.png"
                alt="Steve Avatar"
                style={{
                  width: 64,
                  height: 64,
                  imageRendering: 'pixelated',
                  border: `2px solid ${MC.dirtLight}`,
                }}
                onError={(e) => {
                  // Fallback if Steve image not found
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    parent.style.background = `${MC.grassDark}`
                    parent.style.display = 'flex'
                    parent.style.alignItems = 'center'
                    parent.style.justifyContent = 'center'
                    const fallback = document.createElement('span')
                    fallback.textContent = '⛏️'
                    fallback.style.fontSize = '28px'
                    parent.appendChild(fallback)
                  }
                }}
              />
            )}
            {/* Online indicator — green square (MC style, no circle) */}
            <div
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 12,
                height: 12,
                background: MC.emerald,
                border: `2px solid ${MC.dirtDark}`,
              }}
            />
          </div>

          {/* Player Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            {/* Title Label */}
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: MC.textDark,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                margin: '0 0 4px 0',
                fontFamily: "'Courier New', monospace",
              }}
            >
              PLAYER PROFILE
            </p>

            {/* Display Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {editingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    value={displayNameValue}
                    onChange={(e) => setDisplayNameValue(e.target.value)}
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: MC.textLight,
                      background: 'rgba(0,0,0,0.4)',
                      border: `2px solid ${MC.emerald}`,
                      padding: '2px 8px',
                      fontFamily: "'Courier New', monospace",
                      outline: 'none',
                      width: 180,
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') setEditingName(false)
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    style={{
                      background: MC.emeraldDark,
                      border: `2px solid ${MC.emerald}`,
                      color: '#fff',
                      padding: '2px 8px',
                      cursor: 'pointer',
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "'Courier New', monospace",
                    }}
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <>
                  <h2
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: MC.textLight,
                      letterSpacing: '0.02em',
                      margin: 0,
                      fontFamily: "'Courier New', monospace",
                    }}
                  >
                    {displayName}
                  </h2>
                  <button
                    onClick={handleStartEditName}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: MC.textMuted,
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'color 0.2s',
                    }}
                    title="Edit display name"
                    onMouseEnter={(e) => { e.currentTarget.style.color = MC.emerald }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = MC.textMuted }}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  background: `${MC.gold}15`,
                  border: `1px solid ${MC.goldDark}40`,
                  fontSize: 9,
                  color: MC.gold,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  fontFamily: "'Courier New', monospace",
                }}
              >
                <span style={{ width: 5, height: 5, background: MC.gold }} />
                TESTNET
              </div>
            </div>

            {/* Wallet Address — MC Tooltip Style */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 6,
              }}
            >
              {activeAddress ? (
                <>
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      border: `2px solid ${MC.dirt}`,
                      padding: '3px 10px',
                      position: 'relative',
                    }}
                  >
                    {/* Tooltip arrow notch */}
                    <div
                      style={{
                        position: 'absolute',
                        top: -6,
                        left: 12,
                        width: 0,
                        height: 0,
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderBottom: `6px solid ${MC.dirt}`,
                      }}
                    />
                    <code
                      style={{
                        fontSize: 11,
                        color: MC.textLight,
                        fontFamily: "'Courier New', monospace",
                      }}
                    >
                      📍 {ellipseAddress(activeAddress, 10)}
                    </code>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <AnimatePresence>
                      {copied && (
                        <motion.span
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.15 }}
                          style={{
                            position: 'absolute',
                            top: -22,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: `${MC.emerald}22`,
                            border: `2px solid ${MC.emerald}`,
                            color: MC.emerald,
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 8px',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            fontFamily: "'Courier New', monospace",
                          }}
                        >
                          Copied! ✨
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <button
                      onClick={handleCopyAddress}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: copied ? MC.emerald : MC.textMuted,
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color 0.2s',
                      }}
                      title="Copy Coordinates 📍"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </>
              ) : (
                <span style={{ fontSize: 11, color: MC.textDark, fontStyle: 'italic', fontFamily: "'Courier New', monospace" }}>
                  No wallet bound ⛏️
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            marginTop: 16,
            paddingTop: 14,
            borderTop: `2px solid ${MC.dirtDark}`,
          }}
        >
          {statsRow.map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center', padding: '6px 4px', background: 'rgba(0,0,0,0.3)', border: `1px solid ${MC.dirtDark}` }}>
              <p style={{ fontSize: 9, color: MC.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0, fontFamily: "'Courier New', monospace" }}>
                {stat.label}
              </p>
              <p style={{ fontSize: 16, fontWeight: 800, color: stat.color, marginTop: 4, marginBottom: 0, fontFamily: "'Courier New', monospace" }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MINECRAFT ADVANCEMENTS SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: `2px solid ${MC.dirtDark}`,
          }}
        >
          <Shield className="h-4 w-4" style={{ color: MC.emerald }} />
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: MC.emerald,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: 0,
              fontFamily: "'Courier New', monospace",
            }}
          >
            Advancements ⚔️
          </h3>
          <span
            style={{
              fontSize: 10,
              color: MC.textMuted,
              marginLeft: 4,
              fontFamily: "'Courier New', monospace",
            }}
          >
            {achievements.filter((a) => a.earned).length}/{achievements.length} Earned
          </span>
        </div>
        <div
          className="achievements-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 10,
          }}
        >
          {achievements.map((badge) => (
            <motion.div
              key={badge.id}
              variants={badgeVariants}
              onMouseEnter={() => setHoveredBadge(badge.id)}
              onMouseLeave={() => setHoveredBadge(null)}
              style={{
                padding: 14,
                cursor: 'default',
                position: 'relative',
                opacity: badge.earned ? 1 : 0.4,
                background: badge.earned ? MC.panelBg : 'rgba(20, 20, 35, 0.5)',
                border: `2px solid ${badge.earned ? MC.emeraldDark : MC.stoneDark}`,
                boxShadow: badge.earned ? `3px 3px 0px ${MC.emeraldDark}44` : `3px 3px 0px ${MC.stoneDark}44`,
                transition: 'all 0.25s ease',
                overflow: 'visible',
              }}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {/* Square icon box — MC advancement style */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      background: badge.earned ? `${MC.emerald}20` : 'rgba(0,0,0,0.3)',
                      border: `2px solid ${badge.earned ? MC.emerald : MC.stoneDark}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      imageRendering: 'pixelated',
                    }}
                  >
                    {badge.emoji}
                  </div>
                  {badge.earned && (
                    <div
                      style={{
                        marginLeft: 'auto',
                        color: MC.emerald,
                        fontSize: 14,
                        fontWeight: 800,
                      }}
                    >
                      ✓
                    </div>
                  )}
                </div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: badge.earned ? MC.textLight : MC.textDark,
                    margin: 0,
                    marginBottom: 2,
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  {badge.name}
                </p>
                <p style={{ fontSize: 9, color: MC.textMuted, margin: 0, fontFamily: "'Courier New', monospace" }}>
                  {badge.description}
                </p>
              </div>

              {/* Hover Tooltip — MC style */}
              <AnimatePresence>
                {hoveredBadge === badge.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginBottom: 8,
                      background: MC.panelBg,
                      border: `2px solid ${badge.earned ? MC.emerald : MC.stoneDark}`,
                      padding: '6px 10px',
                      boxShadow: `3px 3px 0px ${MC.dirtDark}`,
                      whiteSpace: 'nowrap',
                      zIndex: 100,
                      pointerEvents: 'none',
                    }}
                  >
                    <p style={{ fontSize: 11, fontWeight: 600, color: badge.earned ? MC.emerald : MC.textDark, margin: 0, fontFamily: "'Courier New', monospace" }}>
                      {badge.earned ? '✅ Earned' : '🔒 Locked'} — {badge.name}
                    </p>
                    {badge.earnedDate && (
                      <p style={{ fontSize: 9, color: MC.textMuted, margin: '2px 0 0', fontFamily: "'Courier New', monospace" }}>
                        Earned on {badge.earnedDate}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          VILLAGE LEDGER + ENDER CHEST STATS (Side by Side)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 14,
        }}
      >
        {/* ─── Village Ledger (Transaction History) ─────────────────────── */}
        <motion.div
          variants={itemVariants}
          style={{
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            background: MC.panelBg,
            border: mcBorder,
            boxShadow: mcPanelShadow,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
              paddingBottom: 8,
              borderBottom: `2px solid ${MC.dirtDark}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock className="h-4 w-4" style={{ color: MC.gold }} />
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: MC.gold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: 0,
                  fontFamily: "'Courier New', monospace",
                }}
              >
                Village Ledger 📜
              </h3>
            </div>
            <span style={{ fontSize: 10, color: MC.textMuted, fontFamily: "'Courier New', monospace" }}>{mockTransactions.length} entries</span>
          </div>

          {/* Table with horizontal scroll wrapper */}
          <div className="transaction-table-wrapper">
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr 90px 110px 80px 70px',
                gap: 6,
                padding: '6px 8px',
                background: 'rgba(0,0,0,0.4)',
                border: `1px solid ${MC.dirtDark}`,
                marginBottom: 4,
              }}
            >
              {['Type', 'Item', 'Price', 'Counterparty', 'Time', 'Status'].map((h) => (
                <span
                  key={h}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: MC.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Table Body */}
            <div style={{ flex: 1, maxHeight: 360, overflowY: 'auto' }}>
              {mockTransactions.map((tx, i) => {
                const color = txTypeColor[tx.type]
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.25 }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr 90px 110px 80px 70px',
                      gap: 6,
                      padding: '8px 8px',
                      borderBottom: `1px solid ${MC.dirtDark}44`,
                      alignItems: 'center',
                      transition: 'background 0.15s',
                      cursor: 'default',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(139, 105, 20, 0.08)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {/* Type */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11 }}>{txTypeEmoji[tx.type]}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.03em', fontFamily: "'Courier New', monospace" }}>
                        {txTypeLabel[tx.type]}
                      </span>
                    </div>
                    {/* Item */}
                    <span style={{ fontSize: 11, fontWeight: 600, color: MC.textLight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Courier New', monospace" }}>
                      {tx.itemName}
                    </span>
                    {/* Price — emerald color */}
                    <span style={{ fontSize: 11, fontWeight: 600, color: tx.price > 0 ? MC.emerald : MC.textDark, fontFamily: "'Courier New', monospace" }}>
                      {formatMicroAlgo(tx.price)}
                    </span>
                    {/* Counterparty */}
                    <span style={{ fontSize: 10, color: tx.counterparty === 'You' ? MC.diamond : MC.textMuted, fontFamily: "'Courier New', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.counterparty === 'You' ? '⛏️ You' : tx.counterparty}
                    </span>
                    {/* Time ago */}
                    <span style={{ fontSize: 10, color: MC.textMuted, fontFamily: "'Courier New', monospace" }}>
                      {formatTimeAgo(tx.date)}
                    </span>
                    {/* Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          background: tx.status === 'Confirmed' ? MC.emerald : MC.gold,
                          border: `1px solid ${tx.status === 'Confirmed' ? MC.emeraldDark : MC.goldDark}`,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: tx.status === 'Confirmed' ? MC.emerald : MC.gold,
                          fontFamily: "'Courier New', monospace",
                        }}
                      >
                        {tx.status === 'Confirmed' ? '✓' : '⏳'}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>{/* end transaction-table-wrapper */}

          {/* View All Button */}
          <button
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '7px 0',
              background: `${MC.gold}15`,
              border: `2px solid ${MC.goldDark}50`,
              color: MC.gold,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.03em',
              transition: 'all 0.2s',
              width: '100%',
              fontFamily: "'Courier New', monospace",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${MC.gold}25`
              e.currentTarget.style.borderColor = MC.gold
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${MC.gold}15`
              e.currentTarget.style.borderColor = `${MC.goldDark}50`
            }}
          >
            View Full Ledger
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>

        {/* ─── Ender Chest Stats (Portfolio Analytics) ─────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Chest Value Card */}
          <motion.div
            variants={itemVariants}
            style={{
              padding: 18,
              background: MC.panelBg,
              border: mcBorder,
              boxShadow: mcPanelShadow,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
                paddingBottom: 8,
                borderBottom: `2px solid ${MC.dirtDark}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp className="h-4 w-4" style={{ color: MC.emerald }} />
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: MC.emerald,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    margin: 0,
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  Ender Chest 🟣
                </h3>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11,
                  fontWeight: 700,
                  color: MC.emerald,
                  fontFamily: "'Courier New', monospace",
                }}
              >
                <TrendingUp className="h-3 w-3" />
                +12.4%
              </div>
            </div>
            <p
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: MC.emerald,
                margin: 0,
                fontFamily: "'Courier New', monospace",
              }}
            >
              312.5
              <span style={{ fontSize: 14, color: MC.textMuted, marginLeft: 6, fontWeight: 600 }}>ALGO</span>
            </p>
            <p style={{ fontSize: 10, color: MC.textMuted, marginTop: 4, fontFamily: "'Courier New', monospace" }}>
              ≈ $62.50 USD 💎
            </p>
          </motion.div>

          {/* Rarity Distribution Pie Chart — Iron/Gold/Diamond/Netherite */}
          <motion.div
            variants={itemVariants}
            className="chart-container"
            style={{
              padding: 18,
              background: MC.panelBg,
              border: mcBorder,
              boxShadow: mcPanelShadow,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                paddingBottom: 8,
                borderBottom: `2px solid ${MC.dirtDark}`,
              }}
            >
              <PieChartIcon className="h-4 w-4" style={{ color: MC.ender }} />
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: MC.ender,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: 0,
                  fontFamily: "'Courier New', monospace",
                }}
              >
                Rarity Distribution ⚡
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rarityDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {rarityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: MC.panelBg,
                        border: mcBorder,
                        fontSize: 12,
                        color: MC.textLight,
                        fontFamily: "'Courier New', monospace",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rarityDistribution.map((r) => (
                  <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        background: r.color,
                        border: `1px solid ${r.color}`,
                      }}
                    />
                    <span style={{ fontSize: 11, color: MC.textMuted, fontWeight: 500, minWidth: 70, fontFamily: "'Courier New', monospace" }}>
                      {r.name}
                    </span>
                    <span style={{ fontSize: 12, color: MC.textLight, fontWeight: 700, fontFamily: "'Courier New', monospace" }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Performance Area Chart — Emerald green line */}
          <motion.div
            variants={itemVariants}
            className="chart-container"
            style={{
              padding: 18,
              background: MC.panelBg,
              border: mcBorder,
              boxShadow: mcPanelShadow,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                paddingBottom: 8,
                borderBottom: `2px solid ${MC.dirtDark}`,
              }}
            >
              <BarChart3 className="h-4 w-4" style={{ color: MC.diamond }} />
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: MC.diamond,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: 0,
                  fontFamily: "'Courier New', monospace",
                }}
              >
                Chest Performance 💫
              </h3>
            </div>
            <p style={{ fontSize: 10, color: MC.textMuted, marginTop: 0, marginBottom: 8, fontFamily: "'Courier New', monospace" }}>
              Portfolio value — last 7 days
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={portfolioPerformance} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="mcPortfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={MC.emerald} stopOpacity={0.3} />
                    <stop offset="50%" stopColor={MC.emerald} stopOpacity={0.08} />
                    <stop offset="100%" stopColor={MC.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={`${MC.dirt}33`} vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isLightTheme ? '#334155' : '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isLightTheme ? '#334155' : '#94a3b8' }} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="value"
                  stroke={MC.emerald}
                  strokeWidth={2}
                  fill="url(#mcPortfolioGradient)"
                  dot={false}
                  activeDot={{ r: 4, stroke: MC.emerald, strokeWidth: 2, fill: MC.obsidian }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PORTAL LINKS (Connected Accounts) SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: `2px solid ${MC.dirtDark}`,
          }}
        >
          <span style={{ fontSize: 16 }}>🌀</span>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: MC.gold,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: 0,
              fontFamily: "'Courier New', monospace",
            }}
          >
            Portal Links
          </h3>
        </div>
        <div className="connected-accounts-grid">
          {/* Steam Portal Connection */}
          <motion.div
            variants={itemVariants}
            style={{
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: MC.panelBg,
              border: `2px solid ${steamProfile ? MC.emeraldDark : MC.stoneDark}`,
              boxShadow: steamProfile ? `3px 3px 0px ${MC.emeraldDark}44` : `3px 3px 0px ${MC.stoneDark}44`,
              transition: 'border-color 0.3s',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                background: steamProfile ? `${MC.emerald}15` : 'rgba(0,0,0,0.3)',
                border: `2px solid ${steamProfile ? MC.emerald : MC.stoneDark}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: steamProfile ? MC.emerald : MC.stoneDark,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {steamProfile?.avatarfull ? (
                <img
                  src={steamProfile.avatarfull}
                  alt="Steam Avatar"
                  style={{ width: 36, height: 36, imageRendering: 'pixelated' }}
                />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.74.45 3.38 1.23 4.81l2.37-1.01A5.48 5.48 0 0 1 5.5 12.5c0-3.04 2.46-5.5 5.5-5.5 2.56 0 4.72 1.75 5.33 4.12l2.79-.49C18.26 6.72 15.44 4 12 4c-4.42 0-8 3.58-8 8 0 .68.09 1.34.24 1.97l-2.15.92C1.42 13.34 1 11.72 1 10 1 5.03 5.03 1 10 1c4.28 0 7.86 3.01 8.78 7.02l-2.79.49C15.42 5.62 13.88 4 12 4zm0 6c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
              )}
              {steamProfile && (
                <div
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    width: 10,
                    height: 10,
                    background: MC.emerald,
                    border: `2px solid ${MC.dirtDark}`,
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: MC.textLight, margin: 0, fontFamily: "'Courier New', monospace" }}>Steam Portal</p>
                {steamProfile ? (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: MC.emerald,
                      background: `${MC.emerald}15`,
                      padding: '1px 6px',
                      border: `1px solid ${MC.emerald}`,
                      letterSpacing: '0.04em',
                      fontFamily: "'Courier New', monospace",
                    }}
                  >
                    LINKED ✓
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: MC.redstone,
                      background: `${MC.redstone}15`,
                      padding: '1px 6px',
                      border: `1px solid ${MC.redstone}`,
                      letterSpacing: '0.04em',
                      fontFamily: "'Courier New', monospace",
                    }}
                  >
                    UNLINKED
                  </span>
                )}
              </div>
              <p style={{ fontSize: 10, color: MC.textMuted, margin: '2px 0 0', fontFamily: "'Courier New', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {steamProfile ? steamProfile.personaname : 'Portal not activated'}
              </p>
            </div>
            {!steamProfile ? (
              <button
                onClick={handleSteamConnect}
                disabled={steamConnecting}
                className="premium-btn premium-btn--sm premium-btn--green"
                style={{
                  flexShrink: 0,
                  fontSize: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {steamConnecting ? '⏳ Checking...' : '🔗 Link Steam'}
              </button>
            ) : (
              <button
                onClick={() => {
                  // Disconnect Steam — clear from store
                  setSteamProfile(null as any)
                }}
                style={{
                  padding: '4px 10px',
                  background: `${MC.redstone}15`,
                  border: `1px solid ${MC.redstone}60`,
                  color: MC.redstone,
                  fontSize: 9,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '0.03em',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Courier New', monospace",
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${MC.redstone}30`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${MC.redstone}15`
                }}
              >
                <Unplug className="h-3 w-3" />
                Unlink
              </button>
            )}
          </motion.div>

          {/* Wallet Connection */}
          <motion.div
            variants={itemVariants}
            style={{
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: MC.panelBg,
              border: `2px solid ${activeAddress ? MC.diamond : MC.stoneDark}`,
              boxShadow: activeAddress ? `3px 3px 0px ${MC.diamond}33` : `3px 3px 0px ${MC.stoneDark}44`,
              transition: 'border-color 0.3s',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                background: activeAddress ? `${MC.diamond}15` : 'rgba(0,0,0,0.3)',
                border: `2px solid ${activeAddress ? MC.diamond : MC.stoneDark}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeAddress ? MC.diamond : MC.stoneDark,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <Wallet className="h-5 w-5" />
              {activeAddress && (
                <div
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    width: 10,
                    height: 10,
                    background: MC.diamond,
                    border: `2px solid ${MC.dirtDark}`,
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: MC.textLight, margin: 0, fontFamily: "'Courier New', monospace" }}>Algorand Wallet</p>
                {/* Connection status indicator — emerald (green) or redstone (red) */}
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 9,
                    fontWeight: 700,
                    color: activeAddress ? MC.emerald : MC.redstone,
                    background: activeAddress ? `${MC.emerald}15` : `${MC.redstone}15`,
                    padding: '1px 6px',
                    border: `1px solid ${activeAddress ? MC.emerald : MC.redstone}`,
                    letterSpacing: '0.04em',
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      background: activeAddress ? MC.emerald : MC.redstone,
                    }}
                  />
                  {activeAddress ? 'BOUND' : 'UNBOUND'}
                </span>
              </div>
              <p style={{ fontSize: 10, color: MC.textMuted, margin: '2px 0 0', fontFamily: "'Courier New', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeAddress ? `📍 ${ellipseAddress(activeAddress, 10)}` : 'No wallet bound'}
              </p>
            </div>
            {activeAddress ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  background: `${MC.gold}10`,
                  border: `1px solid ${MC.goldDark}40`,
                  fontSize: 9,
                  color: MC.gold,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  fontFamily: "'Courier New', monospace",
                }}
              >
                <Zap className="h-3 w-3" />
                TESTNET
              </div>
            ) : (
              <button
                style={{
                  padding: '6px 14px',
                  background: `${MC.emerald}20`,
                  border: `2px solid ${MC.emerald}`,
                  color: MC.emerald,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.03em',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Courier New', monospace",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${MC.emerald}35`
                  e.currentTarget.style.boxShadow = `0 0 10px ${MC.emeraldGlow}`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${MC.emerald}20`
                  e.currentTarget.style.boxShadow = 'none'
                }}
                title="Connect wallet via the header button"
              >
                🔗 Bind Wallet
              </button>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}
