/**
 * De-Shop SDK — Dashboard / Analytics Page (Minecraft Theme)
 * ────────────────────────────────────────────
 * Village Ledger: Live marketplace stats, charts, village crier feed.
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
}

const activityItems: ActivityItem[] = [
  { id: '1', type: 'mint', item: 'Diamond Sword', price: 0, timeAgo: '2m ago', rarity: 'legendary' },
  { id: '2', type: 'buy', item: 'Netherite Pickaxe', price: 58.4, timeAgo: '5m ago', rarity: 'epic' },
  { id: '3', type: 'list', item: 'Ender Pearl', price: 34.2, timeAgo: '8m ago', rarity: 'rare' },
  { id: '4', type: 'buy', item: 'Blaze Rod', price: 112.0, timeAgo: '12m ago', rarity: 'legendary' },
  { id: '5', type: 'mint', item: 'Phantom Membrane', price: 0, timeAgo: '15m ago', rarity: 'epic' },
  { id: '6', type: 'list', item: 'Glowstone', price: 22.8, timeAgo: '20m ago', rarity: 'rare' },
  { id: '7', type: 'cancel', item: 'Elytra Wings', price: 89.5, timeAgo: '25m ago', rarity: 'epic' },
  { id: '8', type: 'buy', item: 'Iron Golem Core', price: 45.0, timeAgo: '32m ago', rarity: 'rare' },
  { id: '9', type: 'mint', item: 'Cobblestone Shield', price: 0, timeAgo: '38m ago', rarity: 'common' },
  { id: '10', type: 'buy', item: 'Diamond Sword', price: 76.3, timeAgo: '45m ago', rarity: 'legendary' },
  { id: '11', type: 'list', item: 'Torch Bundle', price: 19.9, timeAgo: '52m ago', rarity: 'common' },
  { id: '12', type: 'buy', item: 'Netherite Pickaxe', price: 64.7, timeAgo: '1h ago', rarity: 'epic' },
]

const rarityData = [
  { name: 'Iron', count: 45, color: '#D4D4D4' },
  { name: 'Gold', count: 28, color: '#FFD700' },
  { name: 'Diamond', count: 18, color: '#4AEDD9' },
  { name: 'Netherite', count: 9, color: '#3C3C4E' },
]

// ─── Stats Card Data ──────────────────────────────────────────────────────────

const statsCards = [
  {
    label: 'EMERALDS TRADED',
    emoji: '💎',
    value: '12,847 ALGO',
    change: +14.2,
    icon: <Gem className="h-5 w-5" />,
    color: '#2ECC71',
    bgColor: 'rgba(46, 204, 113, 0.12)',
  },
  {
    label: 'DAY/NIGHT CYCLE',
    emoji: '☀️',
    value: '+8.7%',
    change: +8.7,
    icon: <Sun className="h-5 w-5" />,
    color: '#F1C40F',
    bgColor: 'rgba(241, 196, 15, 0.12)',
  },
  {
    label: 'CHEST ITEMS',
    emoji: '📦',
    value: '1,234',
    change: +5.3,
    icon: <Package className="h-5 w-5" />,
    color: '#E67E22',
    bgColor: 'rgba(230, 126, 34, 0.12)',
  },
  {
    label: 'VILLAGERS',
    emoji: '🧑‍🌾',
    value: '389',
    change: +23.5,
    icon: <Users className="h-5 w-5" />,
    color: '#9B59B6',
    bgColor: 'rgba(155, 89, 182, 0.12)',
  },
]

// ─── Activity Icon Map ────────────────────────────────────────────────────────

const activityIconMap: Record<ActivityType, { icon: React.ReactNode; color: string; label: string }> = {
  mint: { icon: <Sparkles className="h-3.5 w-3.5" />, color: '#2ECC71', label: 'FORGE' },
  buy: { icon: <Zap className="h-3.5 w-3.5" />, color: '#4AEDD9', label: 'TRADE' },
  list: { icon: <Tag className="h-3.5 w-3.5" />, color: '#9B59B6', label: 'DISPLAY' },
  cancel: { icon: <Flame className="h-3.5 w-3.5" />, color: '#E74C3C', label: 'CANCEL' },
}

const rarityColorMap: Record<string, string> = {
  common: '#9E9E9E',
  rare: '#4AEDD9',
  epic: '#9B59B6',
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
        border: '3px solid rgba(46, 204, 113, 0.4)',
        padding: '10px 14px',
        imageRendering: 'pixelated',
      }}
    >
      <p style={{ color: '#8B7355', fontSize: 11, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color, fontSize: 13, fontWeight: 700 }}>
          {entry.name === 'price' ? '💎 Emeralds' : '📦 Volume'}: {entry.name === 'price' ? `${entry.value} ALGO` : entry.value}
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
  const setActivePage = useDeShopStore((s) => s.setActivePage)
  const addNotification = useDeShopStore((s) => s.addNotification)

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
    addNotification('info', `${action} initiated from village ledger`)
    if (action === 'Browse Market') setActivePage('market')
    if (action === 'Game Arena') setActivePage('game')
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
            🧱 Live trading post analytics &amp; village insights
          </p>
        </div>
        <div
          className="mc-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            background: 'rgba(46, 204, 113, 0.1)',
            border: '2px solid rgba(46, 204, 113, 0.3)',
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

      {/* ─── Stats Cards Row ─────────────────────────────────────────────── */}
      <div className="dash-stats">
        {statsCards.map((card, i) => (
          <motion.div
            key={card.label}
            variants={itemVariants}
            className="premium-card dash-stat-card mc-card"
            style={{
              padding: 16,
              cursor: 'default',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
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
              <p style={{ fontSize: 20, fontWeight: 800, color: card.color, marginTop: 2 }}>{card.value}</p>
            </div>
            {/* XP bar style progress */}
            <div style={{ width: '100%', height: 4, background: 'rgba(0,0,0,0.3)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, Math.abs(card.change) * 3)}%`,
                  height: '100%',
                  background: card.color,
                  boxShadow: `0 0 6px ${card.color}80`,
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── Main Content: Chart + Activity Feed ─────────────────────────── */}
      <div className="dashboard-main-grid">
        {/* Price Chart — Trading Post */}
        <motion.div variants={itemVariants} className="premium-card mc-card dash-chart dashboard-chart-container" style={{ padding: 20 }}>
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
                  textShadow: '1px 1px 0px rgba(0,0,0,0.5)',
                }}
              >
                ⛏ TRADING POST
              </h3>
              <p style={{ fontSize: 10, color: '#8B7355', marginTop: 2, fontWeight: 600 }}>7-DAY EMERALD EXCHANGE RATE</p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 4, background: '#2ECC71' }} />
                <span style={{ fontSize: 9, color: '#8B7355', fontWeight: 600, textTransform: 'uppercase' }}>💎 Price</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 4, background: '#4AEDD9', opacity: 0.6 }} />
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

        {/* Activity Feed — Village Crier */}
        <motion.div variants={slideInRight} className="premium-card mc-card dash-activity" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
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
                textShadow: '1px 1px 0px rgba(0,0,0,0.5)',
              }}
            >
              📢 VILLAGE CRIER
            </h3>
            <span style={{ fontSize: 9, color: '#8B7355', fontWeight: 700, textTransform: 'uppercase' }}>RECENT</span>
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
                    transition: 'background 0.15s ease',
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
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* ─── Bottom Row: Ore Distribution + Quick Actions ─────────────── */}
      <div className="dashboard-bottom-grid">
        {/* Ore Distribution */}
        <motion.div variants={itemVariants} className="premium-card mc-card dashboard-chart-container" style={{ padding: 20 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#FFD700',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: '0 0 16px 0',
              textShadow: '1px 1px 0px rgba(0,0,0,0.5)',
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

        {/* Quick Actions */}
        <motion.div variants={slideInRight} className="premium-card mc-card" style={{ padding: 20 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#E67E22',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              margin: '0 0 16px 0',
              textShadow: '1px 1px 0px rgba(0,0,0,0.5)',
            }}
          >
            ⚡ QUICK ACTIONS
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="premium-btn premium-btn--sm"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 14px' }}
              onClick={() => handleQuickAction('Place in Chest')}
            >
              <Package className="h-4 w-4" />
              <span>📦 PLACE IN CHEST</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.5 }}>LIST</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="premium-btn premium-btn--sm"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '6px 14px',
                borderColor: 'rgba(46, 204, 113, 0.3)',
                color: '#2ECC71',
              }}
              onClick={() => handleQuickAction('Enchant Item')}
            >
              <Sparkles className="h-4 w-4" />
              <span>✨ ENCHANT ITEM</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.5 }}>MINT</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="premium-btn premium-btn--sm"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '6px 14px',
                borderColor: 'rgba(155, 89, 182, 0.3)',
                color: '#9B59B6',
              }}
              onClick={() => handleQuickAction('Check Ender Chest')}
            >
              <Gem className="h-4 w-4" />
              <span>🟣 CHECK ENDER CHEST</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.5 }}>VAULT</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="premium-btn premium-btn--sm"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '6px 14px',
                borderColor: 'rgba(241, 196, 15, 0.3)',
                color: '#F1C40F',
              }}
              onClick={() => handleQuickAction('Browse Market')}
            >
              <Zap className="h-4 w-4" />
              <span>🗡️ BAZAAR</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.5 }}>SHOP</span>
            </motion.button>
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
