/**
 * De-Shop SDK — Dashboard / Analytics Page (Professional Web3 Minecraft Theme)
 * ────────────────────────────────────────────
 * Village Ledger: Live marketplace stats, charts, village crier feed.
 * Enhanced with web3 metrics, glow effects, and professional polish.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Gem,
  Sun,
  Package,
  Users,
  Sparkles,
  Zap,
  Tag,
  Flame,
  Wallet,
  Globe,
  Fuel,
  Link2,
  FileText,
  BookOpen,
  ExternalLink,
} from 'lucide-react'
import {
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Area,
  AreaChart,
} from 'recharts'
import { useDeShopStore } from '../store/useDeShopStore'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const priceData = Array.from({ length: 7 }, (_, i) => {
  const day = new Date()
  day.setDate(day.getDate() - (6 - i))
  const base = 42 + i * 1.8
  const noise = (Math.sin(i * 2.3) * 3) + (Math.random() * 2 - 1)
  return {
    day: day.toLocaleDateString('en', { weekday: 'short' }),
    price: +(base + noise).toFixed(2),
    volume: Math.floor(1200 + Math.random() * 800 + i * 150),
  }
})

type ActivityType = 'mint' | 'buy' | 'list' | 'cancel'

interface ActivityItem {
  id: string
  type: ActivityType
  item: string
  price: number
  timeAgo: string
  rarity: string
  txHash: string
}

const activityItems: ActivityItem[] = [
  { id: '1', type: 'mint', item: 'Diamond Sword', price: 0, timeAgo: '2m ago', rarity: 'legendary', txHash: '0x7f3a...b2c1' },
  { id: '2', type: 'buy', item: 'Netherite Pickaxe', price: 58.4, timeAgo: '5m ago', rarity: 'epic', txHash: '0x2d8e...f4a7' },
  { id: '3', type: 'list', item: 'Ender Pearl', price: 34.2, timeAgo: '8m ago', rarity: 'rare', txHash: '0x9c1f...d3e8' },
  { id: '4', type: 'buy', item: 'Blaze Rod', price: 112.0, timeAgo: '12m ago', rarity: 'legendary', txHash: '0x4b5a...c6d2' },
  { id: '5', type: 'mint', item: 'Phantom Membrane', price: 0, timeAgo: '15m ago', rarity: 'epic', txHash: '0x1e7d...a8f3' },
  { id: '6', type: 'list', item: 'Glowstone', price: 22.8, timeAgo: '20m ago', rarity: 'rare', txHash: '0x6f2c...e1b4' },
  { id: '7', type: 'cancel', item: 'Elytra Wings', price: 89.5, timeAgo: '25m ago', rarity: 'epic', txHash: '0x3a8b...d5c9' },
  { id: '8', type: 'buy', item: 'Iron Golem Core', price: 45.0, timeAgo: '32m ago', rarity: 'rare', txHash: '0xc4d7...a2f1' },
  { id: '9', type: 'mint', item: 'Cobblestone Shield', price: 0, timeAgo: '38m ago', rarity: 'common', txHash: '0x8e1f...b7d3' },
  { id: '10', type: 'buy', item: 'Diamond Sword', price: 76.3, timeAgo: '45m ago', rarity: 'legendary', txHash: '0x5b9c...e4a6' },
  { id: '11', type: 'list', item: 'Torch Bundle', price: 19.9, timeAgo: '52m ago', rarity: 'common', txHash: '0xd2a8...f1c5' },
  { id: '12', type: 'buy', item: 'Netherite Pickaxe', price: 64.7, timeAgo: '1h ago', rarity: 'epic', txHash: '0xf6c3...b9d7' },
]

const rarityData = [
  { name: 'Iron', count: 45, color: '#D4D4D4' },
  { name: 'Gold', count: 28, color: '#FFD700' },
  { name: 'Diamond', count: 18, color: '#4AEDD9' },
  { name: 'Netherite', count: 9, color: '#3C3C4E' },
]

// ─── Stats Card Data — macOS Web3 Metrics ───────────────────────────────

const statsCards = [
  {
    label: 'TOTAL VALUE LOCKED',
    emoji: '📈',
    value: '$2.4M',
    subtext: '12,847 ALGO',
    change: +14.2,
    icon: <Gem className="h-5 w-5" />,
    color: '#2ECC71',
    bgColor: 'rgba(46, 204, 113, 0.12)',
    glowColor: 'rgba(46, 204, 113, 0.15)',
  },
  {
    label: 'ACTIVE WALLETS',
    emoji: '👥',
    value: '1,847',
    subtext: '+128 today',
    change: +8.7,
    icon: <Wallet className="h-5 w-5" />,
    color: '#4AEDD9',
    bgColor: 'rgba(74, 237, 217, 0.12)',
    glowColor: 'rgba(74, 237, 217, 0.15)',
  },
  {
    label: 'GAS FEES (24H)',
    emoji: '⚡',
    value: '342 ALGO',
    subtext: 'Avg 0.028/tx',
    change: -3.1,
    icon: <Fuel className="h-5 w-5" />,
    color: '#E67E22',
    bgColor: 'rgba(230, 126, 34, 0.12)',
    glowColor: 'rgba(230, 126, 34, 0.15)',
  },
  {
    label: 'CROSS-CHAIN VOL',
    emoji: '🌐',
    value: '$847K',
    subtext: '5 chains',
    change: +23.5,
    icon: <Globe className="h-5 w-5" />,
    color: '#c084fc',
    bgColor: 'rgba(192, 132, 252, 0.12)',
    glowColor: 'rgba(192, 132, 252, 0.15)',
  },
]

// ─── Quick Actions ────────────────────────────────────────────────────────────

const quickActions = [
  { label: 'Mint NFT', desc: 'Mint new asset', icon: <Sparkles className="h-4 w-4" />, color: '#2ECC71', action: 'Mint NFT' },
  { label: 'List Item', desc: 'List in catalog', icon: <Package className="h-4 w-4" />, color: '#4AEDD9', action: 'List Item' },
  { label: 'Connect Wallet', desc: 'Connect wallet', icon: <Link2 className="h-4 w-4" />, color: '#c084fc', action: 'Connect Wallet' },
  { label: 'View Docs', desc: 'Developer guide', icon: <BookOpen className="h-4 w-4" />, color: '#FFD700', action: 'View Docs' },
]

// ─── Activity Icon Map ────────────────────────────────────────────────────────

const activityIconMap: Record<ActivityType, { icon: React.ReactNode; color: string; label: string }> = {
  mint: { icon: <Sparkles className="h-3.5 w-3.5" />, color: '#2ECC71', label: 'MINT' },
  buy: { icon: <Zap className="h-3.5 w-3.5" />, color: '#4AEDD9', label: 'BUY' },
  list: { icon: <Tag className="h-3.5 w-3.5" />, color: '#c084fc', label: 'LIST' },
  cancel: { icon: <Flame className="h-3.5 w-3.5" />, color: '#E74C3C', label: 'CANCEL' },
}

const rarityColorMap: Record<string, string> = {
  common: '#9E9E9E',
  rare: '#4AEDD9',
  epic: '#c084fc',
  legendary: '#FFD700',
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="premium-card"
      style={{
        background: 'rgba(15, 17, 28, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
        padding: '10px 14px',
        borderRadius: '10px',
      }}
    >
      <p style={{ color: '#94a3b8', fontSize: 10, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color, fontSize: 12, fontWeight: 600, margin: '2px 0' }}>
          {entry.name === 'price' ? 'Price' : 'Volume'}: {entry.name === 'price' ? `${entry.value} ALGO` : entry.value}
        </p>
      ))}
    </div>
  )
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const slideInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPremium() {
  const { setActivePage, addNotification, setShowWalletModal } = useDeShopStore()

  // Theme detection for Recharts tick colors (CSS vars not supported in SVG fill)
  const [isLightTheme, setIsLightTheme] = useState(false)
  useEffect(() => {
    const check = () => setIsLightTheme(document.documentElement.getAttribute('data-theme') === 'light')
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const handleQuickAction = (action: string) => {
    if (action === 'Connect Wallet') {
      setShowWalletModal(true)
      return
    }
    addNotification('info', `${action} initiated from village ledger`)
    if (action === 'List Item') setActivePage('market')
    if (action === 'View Docs') setActivePage('terminal')
  }

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
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#ffffff',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            📊 Developer Dashboard
          </h2>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>
            Real-time contract metrics, transaction latency, and marketplace telemetry
          </p>
        </div>
        <div
          className="premium-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            background: 'rgba(46, 204, 113, 0.08)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(46, 204, 113, 0.25)',
            borderRadius: 999,
            fontSize: 10,
            color: '#2ECC71',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              background: '#2ECC71',
              borderRadius: '50%',
              boxShadow: '0 0 8px #2ECC71',
              animation: 'macos-pulse 2s infinite',
            }}
          />
          LIVE
        </div>
      </motion.div>

      {/* ─── Stats Cards Row — Professional Glow ─────────────────────────── */}
      <div className="dash-stats">
        {statsCards.map((card, i) => (
          <motion.div
            key={card.label}
            variants={itemVariants}
            className="premium-card dash-stat-card"
            style={{
              padding: 16,
              cursor: 'default',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              borderRadius: 14,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(20px)',
              boxShadow: `0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
              transition: 'all 0.3s ease',
            }}
            whileHover={{
              boxShadow: `0 12px 40px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
              borderColor: 'rgba(255, 255, 255, 0.15)',
              y: -2,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: card.bgColor,
                  border: `1px solid ${card.color}33`,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color,
                }}
              >
                {card.icon}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11,
                  fontWeight: 700,
                  color: card.change >= 0 ? '#2ECC71' : '#E74C3C',
                }}
              >
                {card.change >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {Math.abs(card.change)}%
              </div>
            </div>
            <div>
              <p style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 600, fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em' }}>
                {card.label}
              </p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', fontFamily: 'Outfit, sans-serif', marginTop: 4, letterSpacing: '-0.02em' }}>
                {card.value}
              </p>
              <p style={{ fontSize: 10, color: '#64748b', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{card.subtext}</p>
            </div>
            {/* macOS Style Progress Bar */}
            <div style={{ width: '100%', height: 5, background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden', borderRadius: 999 }}>
              <div
                style={{
                  width: `${Math.min(100, Math.abs(card.change) * 3)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${card.color}cc, ${card.color})`,
                  borderRadius: 999,
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── Quick Actions — Professional Web3 SDK Feel ──────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="quick-actions-grid">
          {quickActions.map((action) => (
            <motion.button
              key={action.label}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="premium-card quick-action-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(16px)',
                borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.25s ease',
              }}
              onClick={() => handleQuickAction(action.action)}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = 'rgba(255, 255, 255, 0.16)'
                el.style.background = 'rgba(255, 255, 255, 0.04)'
                el.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.25)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                el.style.background = 'rgba(255, 255, 255, 0.02)'
                el.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)'
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: `${action.color}15`,
                  border: `1px solid ${action.color}30`,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: action.color,
                  flexShrink: 0,
                }}
              >
                {action.icon}
              </div>
              <div style={{ textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#ffffff', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.04em' }}>
                  {action.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 9.5, color: '#94a3b8', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>{action.desc}</div>
              </div>
              <ExternalLink className="h-3.5 w-3.5" style={{ marginLeft: 'auto', color: '#64748b', opacity: 0.6, flexShrink: 0 }} />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ─── Main Content: Chart + Activity Feed ─────────────────────────── */}
      <div className="dashboard-main-grid">
        {/* Price Chart — Trading Post */}
        <motion.div variants={itemVariants} className="premium-card dash-chart dashboard-chart-container" style={{ padding: 20, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)', borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#ffffff',
                  fontFamily: 'Outfit, sans-serif',
                  letterSpacing: '0.02em',
                  margin: 0,
                }}
              >
                📈 Market Trends
              </h3>
              <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>7-DAY EXCHANGE RATE AND VOLUME HISTORY</p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 3, background: '#2ECC71', borderRadius: 99 }} />
                <span style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Price</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 3, background: '#4AEDD9', opacity: 0.6, borderRadius: 99 }} />
                <span style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Volume</span>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, width: '100%', position: 'relative', minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="mcEmeraldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.25} />
                    <stop offset="50%" stopColor="#2ECC71" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#2ECC71" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mcVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4AEDD9" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#4AEDD9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="rgba(255, 255, 255, 0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isLightTheme ? '#475569' : '#94a3b8', fontSize: 10, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isLightTheme ? '#475569' : '#94a3b8', fontSize: 10, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#2ECC71"
                  strokeWidth={2}
                  fill="url(#mcEmeraldGradient)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: '#2ECC71',
                    stroke: '#11131c',
                    strokeWidth: 2,
                  }}
                  name="price"
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#4AEDD9"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  fill="url(#mcVolumeGradient)"
                  dot={false}
                  name="volume"
                  yAxisId={0}
                  opacity={0.4}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Activity Feed — Telemetry Stream with Tx Hashes */}
        <motion.div variants={slideInRight} className="premium-card dash-activity" style={{ padding: 0, display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)', borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)', overflow: 'hidden', height: '100%' }}>
          <div
            style={{
              padding: '14px 18px 12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: 'Outfit, sans-serif',
                letterSpacing: '0.02em',
                margin: 0,
              }}
            >
              🔔 Telemetry Stream
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  background: '#2ECC71',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px #2ECC71',
                  animation: 'macos-pulse 2s infinite',
                }}
              />
              <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em' }}>LIVE</span>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 0',
            }}
          >
            {activityItems.map((item, i) => {
              const meta = activityIconMap[item.type]
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04, ease: 'easeOut' as const }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 18px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'background 0.2s ease',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255, 255, 255, 0.03)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
                  }}
                >
                  {/* Type icon */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      background: `${meta.color}15`,
                      border: `1px solid ${meta.color}30`,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: meta.color,
                      flexShrink: 0,
                    }}
                  >
                    {meta.icon}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: meta.color,
                          fontFamily: 'Inter, sans-serif',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {meta.label}
                      </span>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: '#ffffff',
                          fontFamily: 'Inter, sans-serif',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.item}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {item.price > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: rarityColorMap[item.rarity] || '#ffffff', fontFamily: 'JetBrains Mono, monospace' }}>
                          {item.price} ALGO
                        </span>
                      )}
                      {item.price === 0 && (
                        <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8', fontStyle: 'italic', fontFamily: 'Inter, sans-serif' }}>
                          ✨ newly minted
                        </span>
                      )}
                      <span style={{ fontSize: 9.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'Inter, sans-serif' }}>
                        <Clock className="h-3 w-3" />
                        {item.timeAgo}
                      </span>
                    </div>
                    {/* Transaction hash */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 8.5, color: '#4AEDD9', opacity: 0.6, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.02em' }}>
                        {item.txHash}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* ─── Bottom Row: Asset Distribution + SDK Stats ──────────────────── */}
      <div className="dashboard-bottom-grid">
        {/* Asset Distribution */}
        <motion.div variants={itemVariants} className="premium-card dashboard-chart-container" style={{ padding: 20, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)', borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#ffffff',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '0.02em',
              margin: '0 0 16px 0',
            }}
          >
            📊 Rarity Distribution
          </h3>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ height: 140, width: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rarityData}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 70, bottom: 0 }}
                    barCategoryGap={12}
                  >
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(255, 255, 255, 0.04)" horizontal={false} />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: isLightTheme ? '#475569' : '#94a3b8', fontSize: 10, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: isLightTheme ? '#334155' : '#e2e8f0', fontSize: 11, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}
                      width={65}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" barSize={18} radius={[0, 6, 6, 0]}>
                      {rarityData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          fillOpacity={0.8}
                          stroke={entry.color}
                          strokeWidth={1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Asset legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 110 }}>
              {rarityData.map((r) => (
                <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      background: r.color,
                      borderRadius: '50%',
                      boxShadow: r.name === 'Diamond' ? `0 0 8px ${r.color}80` : 'none',
                    }}
                  />
                  <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{r.name}</span>
                  <span style={{ fontSize: 11, color: r.color, fontWeight: 700, marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace' }}>{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* SDK Quick Reference */}
        <motion.div variants={slideInRight} className="premium-card" style={{ padding: 20, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)', borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#ffffff',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '0.02em',
              margin: '0 0 16px 0',
            }}
          >
            💻 SDK Integration
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Code snippet preview */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
                fontSize: 10.5,
                lineHeight: 1.6,
                color: '#e2e8f0',
                overflow: 'hidden',
              }}
            >
              <span style={{ color: '#c084fc' }}>import</span> {'{ DeShopSDK }'} <span style={{ color: '#c084fc' }}>from</span> <span style={{ color: '#2ECC71' }}>'@de-shop/sdk'</span>
              <br />
              <span style={{ color: '#c084fc' }}>const</span> sdk = <span style={{ color: '#c084fc' }}>new</span> <span style={{ color: '#4AEDD9' }}>DeShopSDK</span>({'{'}
              <br />
              &nbsp;&nbsp;network: <span style={{ color: '#FFD700' }}>'testnet'</span>,{'\n'}
              &nbsp;&nbsp;wallet: provider
              {'}'})
            </div>
            {/* SDK feature buttons */}
            {[
              { label: 'Mint NFT', desc: 'Create game assets on-chain', icon: <Sparkles className="h-4 w-4" />, color: '#2ECC71' },
              { label: 'Trade Items', desc: 'Peer-to-peer marketplace', icon: <Zap className="h-4 w-4" />, color: '#4AEDD9' },
              { label: 'Read Docs', desc: 'Full API reference', icon: <FileText className="h-4 w-4" />, color: '#FFD700' },
            ].map((ref) => (
              <motion.button
                key={ref.label}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className="premium-btn premium-btn--sm"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '6px 14px',
                  borderColor: `${ref.color}20`,
                  color: ref.color,
                  background: `${ref.color}08`,
                  borderRadius: 8,
                  transition: 'all 0.2s ease',
                }}
                onClick={() => handleQuickAction(ref.label)}
              >
                {ref.icon}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>{ref.label.toUpperCase()}</span>
                  <span style={{ fontSize: 7.5, color: '#94a3b8', fontWeight: 500, fontFamily: 'Inter, sans-serif' }}>{ref.desc}</span>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.5 }}>→</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── macOS Pulse Animation Keyframe ──────────────────────────── */}
      <style>{`
        @keyframes macos-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
      `}</style>
    </motion.div>
  )
}
