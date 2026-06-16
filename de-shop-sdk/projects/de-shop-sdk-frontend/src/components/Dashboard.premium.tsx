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

// ─── Stats Card Data — Web3 + Minecraft Hybrid ───────────────────────────────

const statsCards = [
  {
    label: 'TOTAL VALUE LOCKED',
    emoji: '💎',
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
    emoji: '🔗',
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
    emoji: '⛽',
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
  { label: 'Mint NFT', desc: 'Forge new item', icon: <Sparkles className="h-4 w-4" />, color: '#2ECC71', action: 'Mint NFT' },
  { label: 'List Item', desc: 'Place in chest', icon: <Package className="h-4 w-4" />, color: '#4AEDD9', action: 'List Item' },
  { label: 'Connect Wallet', desc: 'Link account', icon: <Link2 className="h-4 w-4" />, color: '#c084fc', action: 'Connect Wallet' },
  { label: 'View Docs', desc: 'SDK reference', icon: <BookOpen className="h-4 w-4" />, color: '#FFD700', action: 'View Docs' },
]

// ─── Activity Icon Map ────────────────────────────────────────────────────────

const activityIconMap: Record<ActivityType, { icon: React.ReactNode; color: string; label: string }> = {
  mint: { icon: <Sparkles className="h-3.5 w-3.5" />, color: '#2ECC71', label: 'FORGE' },
  buy: { icon: <Zap className="h-3.5 w-3.5" />, color: '#4AEDD9', label: 'TRADE' },
  list: { icon: <Tag className="h-3.5 w-3.5" />, color: '#c084fc', label: 'DISPLAY' },
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
      className="mc-card"
      style={{
        background: 'rgba(20, 16, 12, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '2px solid rgba(46, 204, 113, 0.4)',
        boxShadow: '0 0 16px rgba(46, 204, 113, 0.15)',
        padding: '10px 14px',
        imageRendering: 'pixelated',
      }}
    >
      <p style={{ color: '#8B7355', fontSize: 11, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color, fontSize: 13, fontWeight: 700 }}>
          {entry.name === 'price' ? '💎 Price' : '📦 Volume'}: {entry.name === 'price' ? `${entry.value} ALGO` : entry.value}
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
            className="mc-title"
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#2ECC71',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: 0,
              textShadow: '2px 2px 0px rgba(0,0,0,0.6), 0 0 20px rgba(46, 204, 113, 0.3)',
            }}
          >
            ⛏ VILLAGE LEDGER
          </h2>
          <p style={{ fontSize: 11, color: '#8B7355', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            🧱 Live trading post analytics &amp; web3 insights
          </p>
        </div>
        <div
          className="mc-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            background: 'rgba(46, 204, 113, 0.08)',
            backdropFilter: 'blur(8px)',
            border: '2px solid rgba(46, 204, 113, 0.3)',
            boxShadow: '0 0 12px rgba(46, 204, 113, 0.1)',
            fontSize: 10,
            color: '#2ECC71',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              background: '#2ECC71',
              boxShadow: '0 0 6px #2ECC71',
              animation: 'mc-pulse 2s infinite',
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
            className="premium-card dash-stat-card mc-card dash-stat-glow"
            style={{
              padding: 14,
              cursor: 'default',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: `0 0 20px ${card.glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)`,
              transition: 'box-shadow 0.3s ease, transform 0.2s ease',
            }}
            whileHover={{
              boxShadow: `0 0 30px ${card.glowColor.replace('0.15', '0.3')}, 0 4px 12px rgba(0,0,0,0.3)`,
              y: -2,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: card.bgColor,
                  border: `2px solid ${card.color}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color,
                  boxShadow: `0 0 10px ${card.glowColor}`,
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
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(card.change)}%
              </div>
            </div>
            <div>
              <p style={{ fontSize: 10, color: '#8B7355', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {card.emoji} {card.label}
              </p>
              <p style={{ fontSize: 20, fontWeight: 800, color: card.color, marginTop: 2, textShadow: `0 0 12px ${card.glowColor}` }}>
                {card.value}
              </p>
              <p style={{ fontSize: 9, color: '#6B5B3E', marginTop: 1 }}>{card.subtext}</p>
            </div>
            {/* XP bar style progress with glow */}
            <div style={{ width: '100%', height: 3, background: 'rgba(0,0,0,0.3)', overflow: 'hidden', borderRadius: 2 }}>
              <div
                style={{
                  width: `${Math.min(100, Math.abs(card.change) * 3)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${card.color}80, ${card.color})`,
                  boxShadow: `0 0 6px ${card.color}80`,
                  borderRadius: 2,
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
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="premium-card mc-card quick-action-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                cursor: 'pointer',
                background: 'rgba(13, 13, 31, 0.8)',
                backdropFilter: 'blur(8px)',
                border: `2px solid ${action.color}25`,
                boxShadow: `0 0 12px ${action.color}10`,
                transition: 'all 0.25s ease',
              }}
              onClick={() => handleQuickAction(action.action)}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = `${action.color}50`
                el.style.boxShadow = `0 0 20px ${action.color}20, 0 4px 12px rgba(0,0,0,0.2)`
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.borderColor = `${action.color}25`
                el.style.boxShadow = `0 0 12px ${action.color}10`
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: `${action.color}15`,
                  border: `2px solid ${action.color}30`,
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
                <div style={{ fontSize: 10, fontWeight: 700, color: action.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {action.label}
                </div>
                <div style={{ fontSize: 9, color: '#6B5B3E', marginTop: 1 }}>{action.desc}</div>
              </div>
              <ExternalLink className="h-3 w-3" style={{ marginLeft: 'auto', color: '#6B5B3E', opacity: 0.5, flexShrink: 0 }} />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ─── Main Content: Chart + Activity Feed ─────────────────────────── */}
      <div className="dashboard-main-grid">
        {/* Price Chart — Trading Post */}
        <motion.div variants={itemVariants} className="premium-card mc-card dash-chart dashboard-chart-container" style={{ padding: 20, boxShadow: '0 0 16px rgba(46, 204, 113, 0.06)' }}>
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
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#2ECC71',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: 0,
                  textShadow: '1px 1px 0px rgba(0,0,0,0.5), 0 0 12px rgba(46, 204, 113, 0.2)',
                }}
              >
                ⛏ TRADING POST
              </h3>
              <p style={{ fontSize: 10, color: '#8B7355', marginTop: 2, fontWeight: 600 }}>7-DAY EMERALD EXCHANGE RATE</p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 3, background: '#2ECC71', boxShadow: '0 0 4px rgba(46, 204, 113, 0.4)' }} />
                <span style={{ fontSize: 9, color: '#8B7355', fontWeight: 600, textTransform: 'uppercase' }}>💎 Price</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 3, background: '#4AEDD9', opacity: 0.6 }} />
                <span style={{ fontSize: 9, color: '#8B7355', fontWeight: 600, textTransform: 'uppercase' }}>📦 Volume</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={priceData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="mcEmeraldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.35} />
                  <stop offset="50%" stopColor="#2ECC71" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#2ECC71" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mcVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4AEDD9" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#4AEDD9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="rgba(139, 115, 85, 0.12)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: isLightTheme ? '#334155' : '#8B7355', fontSize: 10, fontWeight: 700 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: isLightTheme ? '#334155' : '#8B7355', fontSize: 10, fontWeight: 700 }}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#2ECC71"
                strokeWidth={2.5}
                fill="url(#mcEmeraldGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: '#2ECC71',
                  stroke: '#1a1a1a',
                  strokeWidth: 3,
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
        </motion.div>

        {/* Activity Feed — Village Crier with Tx Hashes */}
        <motion.div variants={slideInRight} className="premium-card mc-card dash-activity" style={{ padding: 0, display: 'flex', flexDirection: 'column', boxShadow: '0 0 16px rgba(74, 237, 217, 0.06)' }}>
          <div
            style={{
              padding: '14px 18px 12px',
              borderBottom: '2px solid rgba(46, 204, 113, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#4AEDD9',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                margin: 0,
                textShadow: '1px 1px 0px rgba(0,0,0,0.5), 0 0 12px rgba(74, 237, 217, 0.2)',
              }}
            >
              📢 VILLAGE CRIER
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  background: '#2ECC71',
                  boxShadow: '0 0 6px #2ECC71',
                  animation: 'mc-pulse 2s infinite',
                }}
              />
              <span style={{ fontSize: 9, color: '#8B7355', fontWeight: 700, textTransform: 'uppercase' }}>LIVE</span>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px 0',
              maxHeight: 268,
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
                    gap: 10,
                    padding: '8px 18px',
                    borderBottom: '1px solid rgba(139, 115, 85, 0.08)',
                    transition: 'background 0.2s ease',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(46, 204, 113, 0.04)'
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
                      border: `2px solid ${meta.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: meta.color,
                      flexShrink: 0,
                      boxShadow: `0 0 8px ${meta.color}10`,
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
                          letterSpacing: '0.06em',
                        }}
                      >
                        {meta.label}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#D4C5A9',
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
                        <span style={{ fontSize: 10, fontWeight: 700, color: rarityColorMap[item.rarity] || '#8B7355' }}>
                          💎 {item.price} ALGO
                        </span>
                      )}
                      {item.price === 0 && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#8B7355', fontStyle: 'italic' }}>
                          ⛏ freshly forged
                        </span>
                      )}
                      <span style={{ fontSize: 9, color: '#6B5B3E', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Clock className="h-2.5 w-2.5" />
                        {item.timeAgo}
                      </span>
                    </div>
                    {/* Transaction hash */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 8, color: '#4AEDD9', opacity: 0.6, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
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

      {/* ─── Bottom Row: Ore Distribution + SDK Stats ──────────────────── */}
      <div className="dashboard-bottom-grid">
        {/* Ore Distribution */}
        <motion.div variants={itemVariants} className="premium-card mc-card dashboard-chart-container" style={{ padding: 20, boxShadow: '0 0 16px rgba(255, 215, 0, 0.06)' }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#FFD700',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: '0 0 16px 0',
              textShadow: '1px 1px 0px rgba(0,0,0,0.5), 0 0 12px rgba(255, 215, 0, 0.2)',
            }}
          >
            ⛏ ORE DISTRIBUTION
          </h3>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={rarityData}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 70, bottom: 0 }}
                  barCategoryGap={12}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(139, 115, 85, 0.08)" horizontal={false} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isLightTheme ? '#334155' : '#8B7355', fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isLightTheme ? '#475569' : '#D4C5A9', fontSize: 11, fontWeight: 700 }}
                    width={65}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" barSize={18}>
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
            {/* Ore legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 110 }}>
              {rarityData.map((r) => (
                <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      background: r.color,
                      border: '2px solid rgba(0,0,0,0.3)',
                      boxShadow: r.name === 'Diamond' ? `0 0 8px ${r.color}80` : r.name === 'Netherite' ? `0 0 12px rgba(200,200,200,0.3)` : 'none',
                    }}
                  />
                  <span style={{ fontSize: 10, color: '#8B7355', fontWeight: 700, textTransform: 'uppercase' }}>{r.name}</span>
                  <span style={{ fontSize: 11, color: r.color, fontWeight: 800, marginLeft: 'auto' }}>{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* SDK Quick Reference */}
        <motion.div variants={slideInRight} className="premium-card mc-card" style={{ padding: 20, boxShadow: '0 0 16px rgba(192, 132, 252, 0.06)' }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#c084fc',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: '0 0 16px 0',
              textShadow: '1px 1px 0px rgba(0,0,0,0.5), 0 0 12px rgba(192, 132, 252, 0.2)',
            }}
          >
            📜 SDK REFERENCE
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Code snippet preview */}
            <div
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: '2px solid rgba(192, 132, 252, 0.2)',
                padding: '10px 12px',
                fontFamily: 'monospace',
                fontSize: 10,
                lineHeight: 1.6,
                color: '#D4C5A9',
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
                  borderColor: `${ref.color}30`,
                  color: ref.color,
                  background: `${ref.color}08`,
                  transition: 'all 0.2s ease',
                }}
                onClick={() => handleQuickAction(ref.label)}
              >
                {ref.icon}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 9, fontWeight: 700 }}>{ref.label.toUpperCase()}</span>
                  <span style={{ fontSize: 7, color: '#6B5B3E', fontWeight: 400 }}>{ref.desc}</span>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.5 }}>→</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── Minecraft Pulse Animation Keyframe ──────────────────────────── */}
      <style>{`
        @keyframes mc-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </motion.div>
  )
}
