/**
 * De-Shop SDK — Profile / Stats Page (Premium)
 * ══════════════════════════════════════════════
 * Achievements, transaction history, portfolio analytics,
 * and connected accounts — all in cyberpunk dark theme.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Hexagon,
  Copy,
  Check,
  Edit3,
  Target,
  Coins,
  Star,
  Flame,
  Globe,
  Trophy,
  Diamond,
  Crown,
  Shield,
  Sparkles,
  ShoppingCart,
  Tag,
  ArrowDownToLine,
  Clock,
  Zap,
  Wallet,
  ChevronRight,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
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
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Achievement Badges ─────────────────────────────────────────────────────────

interface Achievement {
  id: string
  icon: React.ReactNode
  name: string
  description: string
  earned: boolean
  earnedDate?: string
  emoji: string
}

const achievements: Achievement[] = [
  {
    id: 'first-mint',
    icon: <Target className="h-5 w-5" />,
    name: 'First Mint',
    description: 'Minted your first NFT',
    earned: true,
    earnedDate: '2024-11-15',
    emoji: '🎯',
  },
  {
    id: 'trader',
    icon: <Coins className="h-5 w-5" />,
    name: 'Trader',
    description: 'Completed 5 trades',
    earned: true,
    earnedDate: '2024-12-03',
    emoji: '💰',
  },
  {
    id: 'collector',
    icon: <Star className="h-5 w-5" />,
    name: 'Collector',
    description: 'Own 10+ items',
    earned: false,
    emoji: '⭐',
  },
  {
    id: 'legendary-hunter',
    icon: <Flame className="h-5 w-5" />,
    name: 'Legendary Hunter',
    description: 'Own a legendary item',
    earned: true,
    earnedDate: '2025-01-20',
    emoji: '🔥',
  },
  {
    id: 'cross-chain',
    icon: <Globe className="h-5 w-5" />,
    name: 'Cross-Chain',
    description: 'Used Steam integration',
    earned: false,
    emoji: '🌐',
  },
  {
    id: 'market-maker',
    icon: <Trophy className="h-5 w-5" />,
    name: 'Market Maker',
    description: 'Listed 5+ items',
    earned: false,
    emoji: '🏆',
  },
  {
    id: 'diamond-hands',
    icon: <Diamond className="h-5 w-5" />,
    name: 'Diamond Hands',
    description: 'Held items for 30+ days',
    earned: false,
    emoji: '💎',
  },
  {
    id: 'whale',
    icon: <Crown className="h-5 w-5" />,
    name: 'Whale',
    description: 'Traded 10,000+ μALGO',
    earned: false,
    emoji: '👑',
  },
]

// ─── Transaction History ────────────────────────────────────────────────────────

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

const txTypeConfig: Record<TxType, { icon: React.ReactNode; color: string }> = {
  Mint: { icon: <Sparkles className="h-3.5 w-3.5" />, color: 'var(--green-neon)' },
  Buy: { icon: <ShoppingCart className="h-3.5 w-3.5" />, color: 'var(--cyan-bright)' },
  Sell: { icon: <Coins className="h-3.5 w-3.5" />, color: 'var(--gold-bright)' },
  List: { icon: <Tag className="h-3.5 w-3.5" />, color: 'var(--purple-bright)' },
  Withdraw: { icon: <ArrowDownToLine className="h-3.5 w-3.5" />, color: 'var(--orange-bright, #fb923c)' },
}

const mockTransactions: Transaction[] = [
  { id: 'tx-1', type: 'Buy', itemName: 'Neon Viper MK2', price: 58400, counterparty: 'ALGO7X...K4M2', date: '2025-03-03 14:23', status: 'Confirmed' },
  { id: 'tx-2', type: 'Sell', itemName: 'Ghost Blade', price: 34200, counterparty: 'ALGO3F...N8P1', date: '2025-03-03 11:05', status: 'Confirmed' },
  { id: 'tx-3', type: 'Mint', itemName: 'Phantom Edge', price: 0, counterparty: 'You', date: '2025-03-02 22:17', status: 'Confirmed' },
  { id: 'tx-4', type: 'List', itemName: 'Arctic Fox', price: 22800, counterparty: 'You', date: '2025-03-02 18:40', status: 'Confirmed' },
  { id: 'tx-5', type: 'Buy', itemName: 'Void Striker', price: 112000, counterparty: 'ALGO9A...Q5R7', date: '2025-03-02 09:12', status: 'Confirmed' },
  { id: 'tx-6', type: 'Withdraw', itemName: 'Cyber Katana', price: 45000, counterparty: 'You', date: '2025-03-01 20:55', status: 'Confirmed' },
  { id: 'tx-7', type: 'Buy', itemName: 'Solar Flare X', price: 45000, counterparty: 'ALGO2B...W3T9', date: '2025-03-01 15:33', status: 'Pending' },
  { id: 'tx-8', type: 'Sell', itemName: 'Shadow Maw', price: 89500, counterparty: 'ALGO6D...Y1U4', date: '2025-02-28 12:08', status: 'Confirmed' },
  { id: 'tx-9', type: 'Mint', itemName: 'Titan Core', price: 0, counterparty: 'You', date: '2025-02-28 07:45', status: 'Confirmed' },
  { id: 'tx-10', type: 'List', itemName: 'Obsidian Claw', price: 76300, counterparty: 'You', date: '2025-02-27 21:30', status: 'Confirmed' },
  { id: 'tx-11', type: 'Buy', itemName: 'Plasma Rail', price: 64700, counterparty: 'ALGO8E...L2H6', date: '2025-02-27 16:22', status: 'Confirmed' },
  { id: 'tx-12', type: 'Sell', itemName: 'Frost Byte', price: 19900, counterparty: 'ALGO1C...M5J8', date: '2025-02-27 10:15', status: 'Pending' },
]

// ─── Portfolio Data ─────────────────────────────────────────────────────────────

const rarityDistribution = [
  { name: 'Common', count: 5, color: '#94a3b8' },
  { name: 'Rare', count: 3, color: '#60a5fa' },
  { name: 'Epic', count: 2, color: '#c084fc' },
  { name: 'Legendary', count: 1, color: '#fbbf24' },
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
// CUSTOM TOOLTIP
// ═══════════════════════════════════════════════════════════════════════════════

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'rgba(10, 15, 20, 0.95)',
        border: '1px solid rgba(0, 255, 136, 0.25)',
        borderRadius: 8,
        padding: '10px 14px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      <p style={{ color: 'var(--space-fog)', fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color || '#00ff88', fontSize: 13, fontWeight: 700 }}>
          {entry.name === 'value' ? 'Portfolio' : entry.name}: {entry.name === 'value' ? `${entry.value} ALGO` : entry.value}
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

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function ProfilePage() {
  const { activeAddress } = useWallet()
  const { steamProfile, inventory, setSteamProfile } = useDeShopStore()
  const [copied, setCopied] = useState(false)

  // Theme detection for Recharts tick colors (CSS vars not supported in SVG fill)
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

  const displayName = steamProfile?.personaname || (activeAddress ? ellipseAddress(activeAddress, 8) : 'Anonymous')
  const avatarUrl = steamProfile?.avatarfull || null

  const handleCopyAddress = () => {
    if (activeAddress) {
      navigator.clipboard.writeText(activeAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const statsRow = [
    { label: 'Items Owned', value: String(inventory.length || 11), color: 'var(--green-neon)' },
    { label: 'Total Trades', value: '47', color: 'var(--cyan-bright)' },
    { label: 'Member Since', value: 'Nov 2024', color: 'var(--purple-bright)' },
    { label: 'Reputation', value: '4.8 ★', color: 'var(--gold-bright)' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        height: '100%',
        overflowY: 'auto',
        paddingRight: 4,
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          USER HEADER SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants} className="premium-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div
            style={{
              position: 'relative',
              width: 80,
              height: 80,
              flexShrink: 0,
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="User Avatar"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 16,
                  border: '2px solid rgba(0, 255, 136, 0.4)',
                  boxShadow: '0 0 20px rgba(0, 255, 136, 0.15)',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 16,
                  border: '2px solid rgba(0, 255, 136, 0.3)',
                  background: 'rgba(0, 255, 136, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--green-neon)',
                  boxShadow: '0 0 20px rgba(0, 255, 136, 0.1)',
                }}
              >
                <Hexagon className="h-8 w-8" />
              </div>
            )}
            {/* Online indicator */}
            <div
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'var(--green-neon)',
                border: '3px solid var(--space-deep)',
                boxShadow: '0 0 8px rgba(0, 255, 136, 0.5)',
              }}
            />
          </div>

          {/* User Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '0.02em',
                  margin: 0,
                  textShadow: '0 0 20px rgba(0, 255, 136, 0.2)',
                }}
              >
                {displayName}
              </h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 10px',
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.25)',
                  borderRadius: 12,
                  fontSize: 9,
                  color: 'var(--gold-bright)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold-bright)' }} />
                TESTNET
              </div>
            </div>

            {/* Wallet Address */}
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
                  <code
                    style={{
                      fontSize: 11,
                      color: 'var(--space-fog)',
                      fontFamily: "'JetBrains Mono', monospace",
                      background: 'rgba(255,255,255,0.03)',
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {ellipseAddress(activeAddress, 10)}
                  </code>
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
                            background: 'rgba(0, 255, 136, 0.15)',
                            border: '1px solid rgba(0, 255, 136, 0.3)',
                            color: 'var(--green-neon)',
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Copied!
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <button
                      onClick={handleCopyAddress}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: copied ? 'var(--green-neon)' : 'var(--space-fog)',
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color 0.2s',
                      }}
                      title="Copy address"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--space-steel)', fontStyle: 'italic' }}>
                  No wallet connected
                </span>
              )}
            </div>

            {/* Edit Profile Button */}
            <button
              style={{
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 16px',
                background: 'rgba(0, 255, 136, 0.08)',
                border: '1px solid rgba(0, 255, 136, 0.2)',
                borderRadius: 8,
                color: 'var(--green-neon)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.03em',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 255, 136, 0.15)'
                e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 255, 136, 0.08)'
                e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.2)'
              }}
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Profile
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
            marginTop: 20,
            paddingTop: 18,
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {statsRow.map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: 'var(--space-fog)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                {stat.label}
              </p>
              <p style={{ fontSize: 18, fontWeight: 800, color: stat.color, marginTop: 4, marginBottom: 0 }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ACHIEVEMENT BADGES SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <div className="profile-section-header" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--glass-border)' }}>
          <Shield className="h-4 w-4 profile-section-header__icon" style={{ color: 'var(--green-neon)' }} />
          <h3
            className="profile-section-header__title"
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--green-bright)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: 0,
            }}
          >
            Achievement Badges
          </h3>
          <span
            style={{
              fontSize: 10,
              color: 'var(--space-fog)',
              marginLeft: 4,
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
                padding: 16,
                cursor: 'default',
                position: 'relative',
                opacity: badge.earned ? 1 : 0.45,
                borderColor: badge.earned ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255,255,255,0.04)',
                transition: 'all 0.25s ease',
                overflow: 'visible',
              }}
            >
              {/* Glow for earned badges */}
              {badge.earned && (
                <div
                  style={{
                    position: 'absolute',
                    inset: -1,
                    borderRadius: 'inherit',
                    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.08), transparent 60%)',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
              )}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: badge.earned ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${badge.earned ? 'rgba(0, 255, 136, 0.25)' : 'rgba(255,255,255,0.06)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: badge.earned ? 'var(--green-neon)' : 'var(--space-steel)',
                      fontSize: 18,
                    }}
                  >
                    {badge.emoji}
                  </div>
                  {badge.earned && (
                    <div
                      style={{
                        marginLeft: 'auto',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'var(--green-neon)',
                        boxShadow: '0 0 8px rgba(0, 255, 136, 0.6)',
                      }}
                    />
                  )}
                </div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: badge.earned ? '#fff' : 'var(--space-steel)',
                    margin: 0,
                    marginBottom: 2,
                  }}
                >
                  {badge.name}
                </p>
                <p style={{ fontSize: 9, color: 'var(--space-fog)', margin: 0 }}>
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
                      background: 'rgba(10, 15, 20, 0.95)',
                      border: `1px solid ${badge.earned ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 8,
                      padding: '8px 12px',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      whiteSpace: 'nowrap',
                      zIndex: 100,
                      pointerEvents: 'none',
                    }}
                  >
                    <p style={{ fontSize: 11, fontWeight: 600, color: badge.earned ? 'var(--green-neon)' : 'var(--space-steel)', margin: 0 }}>
                      {badge.earned ? '✓ Earned' : '🔒 Locked'} — {badge.name}
                    </p>
                    {badge.earnedDate && (
                      <p style={{ fontSize: 9, color: 'var(--space-fog)', margin: '2px 0 0' }}>
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
          TRANSACTION HISTORY + PORTFOLIO ANALYTICS (Side by Side)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 14,
        }}
      >
        {/* ─── Transaction History ────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="premium-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
          <div className="profile-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock className="h-4 w-4 profile-section-header__icon" style={{ color: 'var(--cyan-bright)' }} />
              <h3
                className="profile-section-header__title"
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--cyan-bright)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: 0,
                }}
              >
                Transaction History
              </h3>
            </div>
            <span style={{ fontSize: 10, color: 'var(--space-fog)' }}>{mockTransactions.length} transactions</span>
          </div>

          {/* Table with horizontal scroll wrapper */}
          <div className="transaction-table-wrapper">

          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 100px 110px 120px 80px',
              gap: 8,
              padding: '8px 10px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 8,
              marginBottom: 4,
            }}
          >
            {['Type', 'Item', 'Price', 'Counterparty', 'Date', 'Status'].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'var(--space-fog)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Table Body */}
          <div style={{ flex: 1, maxHeight: 360, overflowY: 'auto' }}>
            {mockTransactions.map((tx, i) => {
              const cfg = txTypeConfig[tx.type]
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 100px 110px 120px 80px',
                    gap: 8,
                    padding: '9px 10px',
                    borderRadius: 6,
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    alignItems: 'center',
                    transition: 'background 0.15s',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  {/* Type */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ color: cfg.color, display: 'flex' }}>{cfg.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: '0.03em' }}>
                      {tx.type}
                    </span>
                  </div>
                  {/* Item */}
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.itemName}
                  </span>
                  {/* Price */}
                  <span style={{ fontSize: 11, fontWeight: 600, color: tx.price > 0 ? 'var(--green-neon)' : 'var(--space-fog)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatMicroAlgo(tx.price)}
                  </span>
                  {/* Counterparty */}
                  <span style={{ fontSize: 10, color: tx.counterparty === 'You' ? 'var(--cyan-bright)' : 'var(--space-fog)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {tx.counterparty}
                  </span>
                  {/* Date */}
                  <span style={{ fontSize: 10, color: 'var(--space-fog)' }}>
                    {tx.date.split(' ')[0]}
                    <span style={{ marginLeft: 4, color: 'var(--space-steel)' }}>
                      {tx.date.split(' ')[1]}
                    </span>
                  </span>
                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: tx.status === 'Confirmed' ? 'var(--green-neon)' : 'var(--gold-bright)',
                        boxShadow: tx.status === 'Confirmed'
                          ? '0 0 6px rgba(0, 255, 136, 0.5)'
                          : '0 0 6px rgba(251, 191, 36, 0.5)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: tx.status === 'Confirmed' ? 'var(--green-neon)' : 'var(--gold-bright)',
                      }}
                    >
                      {tx.status}
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
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 0',
              background: 'rgba(34, 211, 238, 0.06)',
              border: '1px solid rgba(34, 211, 238, 0.15)',
              borderRadius: 8,
              color: 'var(--cyan-bright)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.03em',
              transition: 'all 0.2s',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(34, 211, 238, 0.12)'
              e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(34, 211, 238, 0.06)'
              e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.15)'
            }}
          >
            View All Transactions
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>

        {/* ─── Portfolio Analytics ────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Portfolio Value Card */}
          <motion.div variants={itemVariants} className="premium-card" style={{ padding: 20 }}>
            <div className="profile-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp className="h-4 w-4 profile-section-header__icon" style={{ color: 'var(--green-neon)' }} />
                <h3
                  className="profile-section-header__title"
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--green-neon)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    margin: 0,
                  }}
                >
                  Portfolio Value
                </h3>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--green)',
                }}
              >
                <TrendingUp className="h-3 w-3" />
                +12.4%
              </div>
            </div>
            <p
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: 'var(--green-neon)',
                margin: 0,
                fontFamily: "'JetBrains Mono', monospace",
                textShadow: '0 0 30px rgba(0, 255, 136, 0.3)',
              }}
            >
              312.5
              <span style={{ fontSize: 16, color: 'var(--space-fog)', marginLeft: 6, fontWeight: 600 }}>ALGO</span>
            </p>
            <p style={{ fontSize: 10, color: 'var(--space-fog)', marginTop: 4 }}>
              ≈ $62.50 USD
            </p>
          </motion.div>

          {/* Rarity Distribution Pie Chart */}
          <motion.div variants={itemVariants} className="premium-card chart-container" style={{ padding: 20 }}>
            <div className="profile-section-header" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--glass-border)' }}>
              <PieChartIcon className="h-4 w-4 profile-section-header__icon" style={{ color: 'var(--purple-bright)' }} />
              <h3
                className="profile-section-header__title"
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--purple-bright)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: 0,
                }}
              >
                Rarity Distribution
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
                        background: 'rgba(10, 15, 20, 0.95)',
                        border: '1px solid rgba(0, 255, 136, 0.25)',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#fff',
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
                        borderRadius: 3,
                        background: r.color,
                        boxShadow: `0 0 6px ${r.color}44`,
                      }}
                    />
                    <span style={{ fontSize: 11, color: 'var(--space-fog)', fontWeight: 500, minWidth: 70 }}>
                      {r.name}
                    </span>
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Performance Area Chart */}
          <motion.div variants={itemVariants} className="premium-card chart-container" style={{ padding: 20 }}>
            <div className="profile-section-header" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--glass-border)' }}>
              <BarChart3 className="h-4 w-4 profile-section-header__icon" style={{ color: 'var(--cyan-bright)' }} />
              <h3
                className="profile-section-header__title"
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--cyan-bright)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: 0,
                }}
              >
                Recent Performance
              </h3>
            </div>
            <p style={{ fontSize: 10, color: 'var(--space-fog)', marginTop: 0, marginBottom: 8 }}>
              Portfolio value — last 7 days
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={portfolioPerformance} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="50%" stopColor="#22d3ee" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(34, 211, 238, 0.06)" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isLightTheme ? '#334155' : '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: isLightTheme ? '#334155' : '#94a3b8' }} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="value"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fill="url(#portfolioGradient)"
                  dot={false}
                  activeDot={{ r: 4, stroke: '#22d3ee', strokeWidth: 2, fill: 'var(--space-deep)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          CONNECTED ACCOUNTS SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <div className="profile-section-header" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--glass-border)' }}>
          <Globe className="h-4 w-4 profile-section-header__icon" style={{ color: 'var(--gold-bright)' }} />
          <h3
            className="profile-section-header__title"
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--gold-bright)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: 0,
            }}
          >
            Connected Accounts
          </h3>
        </div>
        <div className="connected-accounts-grid">
          {/* Steam Connection */}
          <motion.div
            variants={itemVariants}
            className="connected-account-card"
            style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: steamProfile ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${steamProfile ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255,255,255,0.06)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: steamProfile ? 'var(--green-neon)' : 'var(--space-steel)',
                position: 'relative',
              }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.74.45 3.38 1.23 4.81l2.37-1.01A5.48 5.48 0 0 1 5.5 12.5c0-3.04 2.46-5.5 5.5-5.5 2.56 0 4.72 1.75 5.33 4.12l2.79-.49C18.26 6.72 15.44 4 12 4c-4.42 0-8 3.58-8 8 0 .68.09 1.34.24 1.97l-2.15.92C1.42 13.34 1 11.72 1 10 1 5.03 5.03 1 10 1c4.28 0 7.86 3.01 8.78 7.02l-2.79.49C15.42 5.62 13.88 4 12 4zm0 6c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
              {steamProfile && (
                <div
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: 'var(--green-neon)',
                    border: '2px solid var(--space-deep)',
                    boxShadow: '0 0 6px rgba(0, 255, 136, 0.5)',
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-bright)', margin: 0 }}>Steam</p>
                {steamProfile ? (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: 'var(--green-neon)',
                      background: 'rgba(0, 255, 136, 0.1)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      letterSpacing: '0.04em',
                    }}
                  >
                    CONNECTED
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: 'var(--space-steel)',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      letterSpacing: '0.04em',
                    }}
                  >
                    DISCONNECTED
                  </span>
                )}
              </div>
              <p style={{ fontSize: 10, color: 'var(--space-fog)', margin: '2px 0 0' }}>
                {steamProfile ? steamProfile.personaname : 'Not linked'}
              </p>
            </div>
            {!steamProfile && (
              <button
                style={{
                  padding: '5px 12px',
                  background: 'rgba(0, 255, 136, 0.08)',
                  border: '1px solid rgba(0, 255, 136, 0.2)',
                  borderRadius: 6,
                  color: 'var(--green-neon)',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '0.03em',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 255, 136, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 255, 136, 0.08)'
                }}
                onClick={() => {
                  window.location.href = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/auth/steam?wallet=${activeAddress || ''}`
                }}
              >
                Connect Steam
              </button>
            )}
          </motion.div>

          {/* Wallet Connection */}
          <motion.div
            variants={itemVariants}
            className="connected-account-card"
            style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: activeAddress ? 'rgba(34, 211, 238, 0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${activeAddress ? 'rgba(34, 211, 238, 0.2)' : 'rgba(255,255,255,0.06)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeAddress ? 'var(--cyan-bright)' : 'var(--space-steel)',
                position: 'relative',
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
                    borderRadius: '50%',
                    background: 'var(--cyan-bright)',
                    border: '2px solid var(--space-deep)',
                    boxShadow: '0 0 6px rgba(34, 211, 238, 0.5)',
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--green-bright)', margin: 0 }}>Algorand Wallet</p>
                {activeAddress ? (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: 'var(--cyan-bright)',
                      background: 'rgba(34, 211, 238, 0.1)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      letterSpacing: '0.04em',
                    }}
                  >
                    CONNECTED
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: 'var(--space-steel)',
                      background: 'rgba(255,255,255,0.03)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      letterSpacing: '0.04em',
                    }}
                  >
                    DISCONNECTED
                  </span>
                )}
              </div>
              <p style={{ fontSize: 10, color: 'var(--space-fog)', margin: '2px 0 0', fontFamily: "'JetBrains Mono', monospace" }}>
                {activeAddress ? ellipseAddress(activeAddress, 10) : 'No wallet connected'}
              </p>
            </div>
            {activeAddress ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  background: 'rgba(251, 191, 36, 0.06)',
                  border: '1px solid rgba(251, 191, 36, 0.15)',
                  borderRadius: 6,
                  fontSize: 9,
                  color: 'var(--gold-bright)',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                <Zap className="h-3 w-3" />
                TESTNET
              </div>
            ) : (
              <span
                style={{
                  fontSize: 9,
                  color: 'var(--space-steel)',
                  fontStyle: 'italic',
                  opacity: 0.7,
                  letterSpacing: '0.02em',
                }}
              >
                Connect via header
              </span>
            )}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}
