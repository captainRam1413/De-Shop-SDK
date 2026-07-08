/**
 * De-Shop SDK — Profile / Stats Page (Premium — macOS Glassmorphism Theme)
 * ═════════════════════════════════════════════════════════════════════
 * Achievements → Advancements, Transaction History → Developer Ledger,
 * Portfolio Analytics → Vault Stats, Connected Accounts → Portal Links
 * All in clean, glassmorphic layout using Outfit & Inter typography.
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
  User,
  ExternalLink,
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
// THEME CONSTANTS & COLORS
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  emerald: '#10b981',
  emeraldGlow: 'rgba(16, 185, 129, 0.15)',
  diamond: '#06b6d4',
  diamondGlow: 'rgba(6, 182, 212, 0.15)',
  gold: '#f59e0b',
  goldGlow: 'rgba(245, 158, 11, 0.15)',
  redstone: '#ef4444',
  redstoneGlow: 'rgba(239, 68, 68, 0.15)',
  ender: '#8b5cf6',
  enderGlow: 'rgba(139, 92, 246, 0.15)',
  cyan: '#00f2fe',
  textLight: '#f8fafc',
  textMuted: '#94a3b8',
  textDark: '#475569',
  border: 'rgba(255, 255, 255, 0.08)',
  cardBg: 'rgba(255, 255, 255, 0.02)',
  cardBgHover: 'rgba(255, 255, 255, 0.04)',
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

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
  Mint: COLORS.emerald,
  Buy: COLORS.diamond,
  Sell: COLORS.gold,
  List: COLORS.ender,
  Withdraw: COLORS.redstone,
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

const rarityDistribution = [
  { name: 'Common', count: 5, color: '#94a3b8' },
  { name: 'Rare', count: 3, color: '#3b82f6' },
  { name: 'Epic', count: 2, color: '#8b5cf6' },
  { name: 'Legendary', count: 1, color: '#f59e0b' },
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
// CUSTOM TOOLTIP (macOS style)
// ═══════════════════════════════════════════════════════════════════════════════

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
      }}
    >
      <p style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 4, fontFamily: "'Inter', sans-serif" }}>{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color || COLORS.emerald, fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif", margin: 0 }}>
          {entry.name === 'value' ? 'Vault Value' : entry.name}: {entry.value} ALGO
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
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: 'easeOut' as const } },
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
// MAIN COMPONENT
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

  const displayName = steamProfile?.personaname || (activeAddress ? ellipseAddress(activeAddress, 8) : 'Developer')
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
  }

  const statsRow = [
    { label: 'Emeralds Spent', value: '3.2k', color: COLORS.emerald, suffix: '💎' },
    { label: 'Items in Chest', value: String(inventory.length || 11), color: COLORS.diamond, suffix: '📦' },
    { label: 'Trading Profit', value: '+12.4%', color: COLORS.gold, suffix: '📈' },
    { label: 'Chest Displays', value: '3', color: COLORS.ender, suffix: '🏪' },
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
          PLAYER PROFILE HEADER — macOS Card Style
          ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div
        variants={itemVariants}
        className="premium-card"
        style={{
          padding: 20,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          borderRadius: 14,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Avatar Container */}
          <div
            style={{
              position: 'relative',
              width: 72,
              height: 72,
              flexShrink: 0,
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Developer Avatar"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: `2px solid ${COLORS.border}`,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.1), rgba(139, 92, 246, 0.15))',
                  border: `2px solid ${COLORS.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User className="h-8 w-8" style={{ color: '#00f2fe', opacity: 0.8 }} />
              </div>
            )}
            {/* Round status dot */}
            <div
              style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 14,
                height: 14,
                background: COLORS.emerald,
                border: '2px solid #0a0d14',
                borderRadius: '50%',
              }}
            />
          </div>

          {/* Developer Details */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: COLORS.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: '0 0 6px 0',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              DEVELOPER ID
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {editingName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    value={displayNameValue}
                    onChange={(e) => setDisplayNameValue(e.target.value)}
                    className="premium-input"
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: COLORS.textLight,
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontFamily: "'Outfit', sans-serif",
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
                    className="premium-btn premium-btn--sm premium-btn--green"
                    style={{ padding: '6px 12px' }}
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <>
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: COLORS.textLight,
                      margin: 0,
                      fontFamily: "'Outfit', sans-serif",
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
                      color: COLORS.textMuted,
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'color 0.2s',
                    }}
                    title="Edit display name"
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#00f2fe' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textMuted }}
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 9px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 20,
                  fontSize: 9,
                  color: COLORS.gold,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: COLORS.gold }} />
                TESTNET
              </div>
            </div>

            {/* Wallet Address (macOS style pill) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 8,
              }}
            >
              {activeAddress ? (
                <>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 20,
                      padding: '4px 12px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <code
                      style={{
                        fontSize: 11,
                        color: COLORS.textLight,
                        fontFamily: "monospace",
                      }}
                    >
                      {ellipseAddress(activeAddress, 12)}
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
                            top: -24,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: `1px solid ${COLORS.emerald}`,
                            borderRadius: 6,
                            color: COLORS.emerald,
                            fontSize: 9,
                            fontWeight: 600,
                            padding: '2px 8px',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          Copied Address!
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <button
                      onClick={handleCopyAddress}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: copied ? COLORS.emerald : COLORS.textMuted,
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color 0.2s',
                      }}
                      title="Copy Coordinates"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </>
              ) : (
                <span style={{ fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic', fontFamily: "'Inter', sans-serif" }}>
                  No bound wallet detected
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
            gap: 12,
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {statsRow.map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center', padding: '10px 6px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: 10 }}>
              <p style={{ fontSize: 10, color: COLORS.textMuted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                {stat.label} {stat.suffix}
              </p>
              <p style={{ fontSize: 18, fontWeight: 700, color: stat.color, marginTop: 4, marginBottom: 0, fontFamily: "'Outfit', sans-serif" }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ACHIEVEMENTS / ADVANCEMENTS SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Shield className="h-4 w-4" style={{ color: COLORS.emerald }} />
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.emerald,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: 0,
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Advancements
          </h3>
          <span
            style={{
              fontSize: 11,
              color: COLORS.textMuted,
              marginLeft: 4,
              fontFamily: "'Inter', sans-serif",
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
            gap: 12,
          }}
        >
          {achievements.map((badge) => (
            <motion.div
              key={badge.id}
              variants={badgeVariants}
              onMouseEnter={() => setHoveredBadge(badge.id)}
              onMouseLeave={() => setHoveredBadge(null)}
              className="premium-card"
              style={{
                padding: 14,
                cursor: 'default',
                position: 'relative',
                opacity: badge.earned ? 1 : 0.45,
                background: badge.earned ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.01)',
                border: `1px solid ${badge.earned ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.06)'}`,
                boxShadow: badge.earned ? '0 4px 16px rgba(16, 185, 129, 0.08)' : 'none',
                borderRadius: 12,
                transition: 'all 0.2s ease',
                overflow: 'visible',
              }}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {/* Round icon box */}
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: badge.earned ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${badge.earned ? COLORS.emerald : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                    }}
                  >
                    {badge.emoji}
                  </div>
                  {badge.earned && (
                    <div
                      style={{
                        marginLeft: 'auto',
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: COLORS.emerald,
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ✓
                    </div>
                  )}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: badge.earned ? COLORS.textLight : COLORS.textMuted,
                    margin: 0,
                    marginBottom: 2,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  {badge.name}
                </p>
                <p style={{ fontSize: 10, color: COLORS.textMuted, margin: 0, fontFamily: "'Inter', sans-serif", lineHeight: 1.3 }}>
                  {badge.description}
                </p>
              </div>

              {/* Hover Tooltip */}
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
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: `1px solid ${badge.earned ? COLORS.emerald : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: 8,
                      padding: '6px 12px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                      whiteSpace: 'nowrap',
                      zIndex: 100,
                      pointerEvents: 'none',
                    }}
                  >
                    <p style={{ fontSize: 11, fontWeight: 600, color: badge.earned ? COLORS.emerald : COLORS.textMuted, margin: 0, fontFamily: "'Inter', sans-serif" }}>
                      {badge.earned ? '✅ Earned' : '🔒 Locked'} — {badge.name}
                    </p>
                    {badge.earnedDate && (
                      <p style={{ fontSize: 9, color: COLORS.textMuted, margin: '2px 0 0', fontFamily: "'Inter', sans-serif" }}>
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
          LEDGER + PORTFOLIO STATS (Side by Side)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 16,
        }}
      >
        {/* ─── Ledger Card (Transaction History) ─────────────────────── */}
        <motion.div
          variants={itemVariants}
          className="premium-card"
          style={{
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            borderRadius: 14,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
              paddingBottom: 8,
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock className="h-4 w-4" style={{ color: COLORS.gold }} />
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.gold,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: 0,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Developer Ledger
              </h3>
            </div>
            <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'Inter', sans-serif" }}>{mockTransactions.length} entries</span>
          </div>

          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '85px 1fr 90px 110px 80px 70px',
              gap: 6,
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: 8,
              border: '1px solid rgba(255, 255, 255, 0.04)',
              marginBottom: 6,
            }}
          >
            {['Type', 'Item', 'Price', 'Counterparty', 'Time', 'Status'].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Table Body */}
          <div style={{ flex: 1, maxHeight: 330, overflowY: 'auto' }}>
            {mockTransactions.map((tx, i) => {
              const color = txTypeColor[tx.type]
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02, duration: 0.2 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '85px 1fr 90px 110px 80px 70px',
                    gap: 6,
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                    alignItems: 'center',
                    transition: 'background 0.2s ease',
                    borderRadius: 6,
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* Type */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12 }}>{txTypeEmoji[tx.type]}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color, fontFamily: "'Outfit', sans-serif" }}>
                      {txTypeLabel[tx.type]}
                    </span>
                  </div>
                  {/* Item */}
                  <span style={{ fontSize: 12, fontWeight: 500, color: COLORS.textLight, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>
                    {tx.itemName}
                  </span>
                  {/* Price */}
                  <span style={{ fontSize: 11, fontWeight: 600, color: tx.price > 0 ? COLORS.emerald : COLORS.textMuted, fontFamily: 'monospace' }}>
                    {formatMicroAlgo(tx.price)}
                  </span>
                  {/* Counterparty */}
                  <span style={{ fontSize: 11, color: tx.counterparty === 'You' ? '#00f2fe' : COLORS.textMuted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.counterparty === 'You' ? 'You' : tx.counterparty}
                  </span>
                  {/* Time ago */}
                  <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "'Inter', sans-serif" }}>
                    {formatTimeAgo(tx.date)}
                  </span>
                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: tx.status === 'Confirmed' ? COLORS.emerald : COLORS.gold,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        color: tx.status === 'Confirmed' ? COLORS.emerald : COLORS.gold,
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {tx.status}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* View All Button */}
          <button
            className="premium-btn premium-btn--sm"
            style={{
              marginTop: 12,
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.03)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              color: '#00f2fe',
              width: '100%',
            }}
          >
            View Full Ledger
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>

        {/* ─── Right Stats Panels ─────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Vault Value Card */}
          <motion.div
            variants={itemVariants}
            className="premium-card"
            style={{
              padding: 20,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              borderRadius: 14,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
                paddingBottom: 8,
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp className="h-4 w-4" style={{ color: COLORS.emerald }} />
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.emerald,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    margin: 0,
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Secure Vault
                </h3>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLORS.emerald,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <TrendingUp className="h-3 w-3" />
                +12.4%
              </div>
            </div>
            <p
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: COLORS.emerald,
                margin: 0,
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              312.5
              <span style={{ fontSize: 13, color: COLORS.textMuted, marginLeft: 6, fontWeight: 500 }}>ALGO</span>
            </p>
            <p style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
              ≈ $62.50 USD 
            </p>
          </motion.div>

          {/* Rarity Distribution Pie Chart */}
          <motion.div
            variants={itemVariants}
            className="premium-card chart-container"
            style={{
              padding: 20,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              borderRadius: 14,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
                paddingBottom: 8,
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <PieChartIcon className="h-4 w-4" style={{ color: COLORS.ender }} />
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.ender,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: 0,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Rarity Distribution
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 130, height: 130 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rarityDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={52}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {rarityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: COLORS.textLight,
                        fontFamily: "'Inter', sans-serif",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {rarityDistribution.map((r) => (
                  <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: r.color,
                      }}
                    />
                    <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 500, flex: 1, fontFamily: "'Inter', sans-serif" }}>
                      {r.name}
                    </span>
                    <span style={{ fontSize: 12, color: COLORS.textLight, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Performance Area Chart */}
          <motion.div
            variants={itemVariants}
            className="premium-card chart-container"
            style={{
              padding: 20,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              borderRadius: 14,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <BarChart3 className="h-4 w-4" style={{ color: COLORS.diamond }} />
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: COLORS.diamond,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: 0,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Vault Performance
              </h3>
            </div>
            <p style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 0, marginBottom: 12, fontFamily: "'Inter', sans-serif" }}>
              Portfolio valuation — last 7 days
            </p>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={portfolioPerformance} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="premiumPortfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.emerald} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={COLORS.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isLightTheme ? '#475569' : '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isLightTheme ? '#475569' : '#94a3b8' }} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="value"
                  stroke={COLORS.emerald}
                  strokeWidth={2}
                  fill="url(#premiumPortfolioGradient)"
                  dot={false}
                  activeDot={{ r: 4, stroke: COLORS.emerald, strokeWidth: 2, fill: '#0f172a' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PORTAL LINKS SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <span style={{ fontSize: 16 }}>🌀</span>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.gold,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: 0,
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Portal Links
          </h3>
        </div>
        <div className="connected-accounts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          {/* Steam Connection Card */}
          <motion.div
            variants={itemVariants}
            className="premium-card"
            style={{
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${steamProfile ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`,
              boxShadow: steamProfile ? '0 4px 16px rgba(16, 185, 129, 0.05)' : 'none',
              borderRadius: 12,
              transition: 'border-color 0.2s',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: steamProfile ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${steamProfile ? COLORS.emerald : 'rgba(255,255,255,0.1)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: steamProfile ? COLORS.emerald : COLORS.textMuted,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {steamProfile?.avatarfull ? (
                <img
                  src={steamProfile.avatarfull}
                  alt="Steam Avatar"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.74.45 3.38 1.23 4.81l2.37-1.01A5.48 5.48 0 0 1 5.5 12.5c0-3.04 2.46-5.5 5.5-5.5 2.56 0 4.72 1.75 5.33 4.12l2.79-.49C18.26 6.72 15.44 4 12 4c-4.42 0-8 3.58-8 8 0 .68.09 1.34.24 1.97l-2.15.92C1.42 13.34 1 11.72 1 10 1 5.03 5.03 1 10 1c4.28 0 7.86 3.01 8.78 7.02l-2.79.49C15.42 5.62 13.88 4 12 4zm0 6c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
              )}
              {steamProfile && (
                <div
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: COLORS.emerald,
                    border: '2px solid #0a0d14',
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.textLight, margin: 0, fontFamily: "'Outfit', sans-serif" }}>Steam Portal</p>
                {steamProfile ? (
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      color: COLORS.emerald,
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '1px 6px',
                      borderRadius: 10,
                      border: `1px solid ${COLORS.emerald}`,
                      letterSpacing: '0.04em',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    LINKED
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      color: COLORS.redstone,
                      background: 'rgba(239, 68, 68, 0.15)',
                      padding: '1px 6px',
                      borderRadius: 10,
                      border: `1px solid ${COLORS.redstone}`,
                      letterSpacing: '0.04em',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    UNLINKED
                  </span>
                )}
              </div>
              <p style={{ fontSize: 10, color: COLORS.textMuted, margin: '2px 0 0', fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  fontSize: 10,
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
                  setSteamProfile(null as any)
                }}
                className="premium-btn premium-btn--sm"
                style={{
                  padding: '4px 10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                  color: COLORS.redstone,
                  fontSize: 10,
                }}
              >
                <Unplug className="h-3.5 w-3.5" />
                Unlink
              </button>
            )}
          </motion.div>

          {/* Wallet Connection Card */}
          <motion.div
            variants={itemVariants}
            className="premium-card"
            style={{
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${activeAddress ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`,
              boxShadow: activeAddress ? '0 4px 16px rgba(6, 182, 212, 0.05)' : 'none',
              borderRadius: 12,
              transition: 'border-color 0.2s',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: activeAddress ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${activeAddress ? COLORS.diamond : 'rgba(255,255,255,0.1)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeAddress ? COLORS.diamond : COLORS.textMuted,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              <Wallet className="h-5 w-5" />
              {activeAddress && (
                <div
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: COLORS.diamond,
                    border: '2px solid #0a0d14',
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.textLight, margin: 0, fontFamily: "'Outfit', sans-serif" }}>Algorand Wallet</p>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 8,
                    fontWeight: 700,
                    color: activeAddress ? COLORS.emerald : COLORS.redstone,
                    background: activeAddress ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    padding: '1px 6px',
                    borderRadius: 10,
                    border: `1px solid ${activeAddress ? COLORS.emerald : COLORS.redstone}`,
                    letterSpacing: '0.04em',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: activeAddress ? COLORS.emerald : COLORS.redstone,
                    }}
                  />
                  {activeAddress ? 'BOUND' : 'UNBOUND'}
                </span>
              </div>
              <p style={{ fontSize: 10, color: COLORS.textMuted, margin: '2px 0 0', fontFamily: "monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeAddress ? activeAddress : 'No wallet bound'}
              </p>
            </div>
            {activeAddress ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 20,
                  fontSize: 9,
                  color: COLORS.gold,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Zap className="h-3 w-3" />
                TESTNET
              </div>
            ) : (
              <button
                className="premium-btn premium-btn--sm premium-btn--green"
                style={{ fontSize: 10 }}
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
