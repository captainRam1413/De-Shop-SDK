/**
 * De-Shop SDK — Dashboard / Analytics Page
 * ────────────────────────────────────────────
 * Phase 2 Premium: Live marketplace stats, charts, activity feed.
 */

import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  ShoppingBag,
  Activity,
  Plus,
  Tag,
  Store,
  Gamepad2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap,
  Flame,
} from 'lucide-react'
import {
  LineChart,
  Line,
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
  { id: '1', type: 'mint', item: 'Neon Viper MK2', price: 0, timeAgo: '2m ago', rarity: 'legendary' },
  { id: '2', type: 'buy', item: 'Cyber Katana', price: 58.4, timeAgo: '5m ago', rarity: 'epic' },
  { id: '3', type: 'list', item: 'Phantom Edge', price: 34.2, timeAgo: '8m ago', rarity: 'rare' },
  { id: '4', type: 'buy', item: 'Void Striker', price: 112.0, timeAgo: '12m ago', rarity: 'legendary' },
  { id: '5', type: 'mint', item: 'Ghost Blade', price: 0, timeAgo: '15m ago', rarity: 'epic' },
  { id: '6', type: 'list', item: 'Arctic Fox', price: 22.8, timeAgo: '20m ago', rarity: 'rare' },
  { id: '7', type: 'cancel', item: 'Shadow Maw', price: 89.5, timeAgo: '25m ago', rarity: 'epic' },
  { id: '8', type: 'buy', item: 'Solar Flare X', price: 45.0, timeAgo: '32m ago', rarity: 'rare' },
  { id: '9', type: 'mint', item: 'Titan Core', price: 0, timeAgo: '38m ago', rarity: 'common' },
  { id: '10', type: 'buy', item: 'Obsidian Claw', price: 76.3, timeAgo: '45m ago', rarity: 'legendary' },
  { id: '11', type: 'list', item: 'Frost Byte', price: 19.9, timeAgo: '52m ago', rarity: 'common' },
  { id: '12', type: 'buy', item: 'Plasma Rail', price: 64.7, timeAgo: '1h ago', rarity: 'epic' },
]

const rarityData = [
  { name: 'Common', count: 45, color: '#94a3b8' },
  { name: 'Rare', count: 28, color: '#60a5fa' },
  { name: 'Epic', count: 18, color: '#c084fc' },
  { name: 'Legendary', count: 9, color: '#fbbf24' },
]

// ─── Stats Card Data ──────────────────────────────────────────────────────────

const statsCards = [
  {
    label: 'Total Volume',
    value: '12,847 ALGO',
    change: +14.2,
    icon: <DollarSign className="h-5 w-5" />,
    color: 'var(--green-neon)',
    bgColor: 'rgba(0, 255, 136, 0.08)',
  },
  {
    label: 'Active Listings',
    value: '1,234',
    change: +8.7,
    icon: <ShoppingBag className="h-5 w-5" />,
    color: 'var(--cyan-bright)',
    bgColor: 'rgba(34, 211, 238, 0.08)',
  },
  {
    label: 'Floor Price',
    value: '4.2 ALGO',
    change: -2.1,
    icon: <BarChart3 className="h-5 w-5" />,
    color: 'var(--purple-bright)',
    bgColor: 'rgba(192, 132, 252, 0.08)',
  },
  {
    label: '24h Trades',
    value: '389',
    change: +23.5,
    icon: <Activity className="h-5 w-5" />,
    color: 'var(--gold-bright)',
    bgColor: 'rgba(251, 191, 36, 0.08)',
  },
]

// ─── Activity Icon Map ────────────────────────────────────────────────────────

const activityIconMap: Record<ActivityType, { icon: React.ReactNode; color: string; label: string }> = {
  mint: { icon: <Sparkles className="h-3.5 w-3.5" />, color: 'var(--green-neon)', label: 'MINT' },
  buy: { icon: <Zap className="h-3.5 w-3.5" />, color: 'var(--cyan-bright)', label: 'BUY' },
  list: { icon: <Tag className="h-3.5 w-3.5" />, color: 'var(--purple-bright)', label: 'LIST' },
  cancel: { icon: <Flame className="h-3.5 w-3.5" />, color: 'var(--red)', label: 'CANCEL' },
}

const rarityColorMap: Record<string, string> = {
  common: 'var(--rarity-common-text)',
  rare: 'var(--rarity-rare-text)',
  epic: 'var(--rarity-epic-text)',
  legendary: 'var(--rarity-legendary-text)',
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

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
        <p key={idx} style={{ color: entry.color, fontSize: 13, fontWeight: 700 }}>
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
  const setActivePage = useDeShopStore((s) => s.setActivePage)
  const addNotification = useDeShopStore((s) => s.addNotification)

  const handleQuickAction = (action: string) => {
    addNotification('info', `${action} initiated from dashboard`)
    if (action === 'View Market') setActivePage('market')
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
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--green-neon)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              margin: 0,
              textShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
            }}
          >
            Dashboard
          </h2>
          <p style={{ fontSize: 11, color: 'var(--space-fog)', marginTop: 2 }}>
            Live marketplace analytics &amp; insights
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            background: 'rgba(0, 255, 136, 0.06)',
            border: '1px solid rgba(0, 255, 136, 0.15)',
            borderRadius: 20,
            fontSize: 10,
            color: 'var(--green-neon)',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--green-neon)',
              boxShadow: '0 0 6px var(--green-neon)',
              animation: 'pulse 2s infinite',
            }}
          />
          LIVE
        </div>
      </motion.div>

      {/* ─── Stats Cards Row ─────────────────────────────────────────────── */}
      <div className="dashboard-stats-grid">
        {statsCards.map((card, i) => (
          <motion.div
            key={card.label}
            variants={itemVariants}
            className="premium-card"
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
                  borderRadius: 10,
                  background: card.bgColor,
                  border: `1px solid ${card.color}22`,
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
                  color: card.change >= 0 ? 'var(--green)' : 'var(--red)',
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
              <p style={{ fontSize: 10, color: 'var(--space-fog)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {card.label}
              </p>
              <p style={{ fontSize: 20, fontWeight: 800, color: card.color, marginTop: 2 }}>{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── Main Content: Chart + Activity Feed ─────────────────────────── */}
      <div className="dashboard-main-grid">
        {/* Price Chart */}
        <motion.div variants={itemVariants} className="premium-card dashboard-chart-container" style={{ padding: 20 }}>
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
                  color: 'var(--green-neon)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  margin: 0,
                }}
              >
                Price Trend
              </h3>
              <p style={{ fontSize: 10, color: 'var(--space-fog)', marginTop: 2 }}>7-day marketplace average</p>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 3, borderRadius: 2, background: 'var(--green-neon)' }} />
                <span style={{ fontSize: 9, color: 'var(--space-fog)' }}>Price</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 3, borderRadius: 2, background: 'var(--cyan-bright)', opacity: 0.5 }} />
                <span style={{ fontSize: 9, color: 'var(--space-fog)' }}>Volume</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={priceData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="50%" stopColor="#00ff88" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(34, 197, 94, 0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#2e3d55', fontSize: 10, fontWeight: 600 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#2e3d55', fontSize: 10, fontWeight: 600 }}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#00ff88"
                strokeWidth={2.5}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: '#00ff88',
                  stroke: '#0a0f14',
                  strokeWidth: 3,
                }}
                name="price"
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="#22d3ee"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="url(#volumeGradient)"
                dot={false}
                name="volume"
                yAxisId={0}
                opacity={0.4}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Activity Feed */}
        <motion.div variants={slideInRight} className="premium-card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '14px 18px 12px',
              borderBottom: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--cyan-bright)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                margin: 0,
              }}
            >
              Market Activity
            </h3>
            <span style={{ fontSize: 9, color: 'var(--space-fog)', fontWeight: 600 }}>RECENT</span>
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
                    borderBottom: '1px solid rgba(34, 197, 94, 0.04)',
                    transition: 'background 0.15s ease',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(0, 255, 136, 0.03)'
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
                      borderRadius: 8,
                      background: `${meta.color}12`,
                      border: `1px solid ${meta.color}25`,
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
                          color: 'var(--green)',
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
                        <span style={{ fontSize: 10, fontWeight: 700, color: rarityColorMap[item.rarity] || 'var(--space-fog)' }}>
                          {item.price} ALGO
                        </span>
                      )}
                      {item.price === 0 && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--space-fog)', fontStyle: 'italic' }}>
                          fresh mint
                        </span>
                      )}
                      <span style={{ fontSize: 9, color: 'var(--space-steel)', display: 'flex', alignItems: 'center', gap: 2 }}>
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

      {/* ─── Bottom Row: Rarity Distribution + Quick Actions ─────────────── */}
      <div className="dashboard-bottom-grid">
        {/* Rarity Distribution */}
        <motion.div variants={itemVariants} className="premium-card dashboard-chart-container" style={{ padding: 20 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--purple-bright)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              margin: '0 0 16px 0',
            }}
          >
            Rarity Distribution
          </h3>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={rarityData}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
                  barCategoryGap={12}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(34, 197, 94, 0.04)" horizontal={false} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#2e3d55', fontSize: 10, fontWeight: 600 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                    width={55}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                    {rarityData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        fillOpacity={0.7}
                        stroke={entry.color}
                        strokeWidth={1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Rarity legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 100 }}>
              {rarityData.map((r) => (
                <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: r.color,
                      boxShadow: `0 0 8px ${r.color}40`,
                    }}
                  />
                  <span style={{ fontSize: 10, color: 'var(--space-fog)', fontWeight: 600 }}>{r.name}</span>
                  <span style={{ fontSize: 11, color: r.color, fontWeight: 800, marginLeft: 'auto' }}>{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={slideInRight} className="premium-card" style={{ padding: 20 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--gold-bright)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              margin: '0 0 16px 0',
            }}
          >
            Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="premium-btn"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 16px' }}
              onClick={() => handleQuickAction('Mint Item')}
            >
              <Plus className="h-4 w-4" />
              <span>Mint New Item</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.5 }}>NFT</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="premium-btn"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '10px 16px',
                borderColor: 'rgba(192, 132, 252, 0.3)',
                color: 'var(--purple-bright)',
              }}
              onClick={() => handleQuickAction('List Item')}
            >
              <Tag className="h-4 w-4" />
              <span>List for Sale</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.5 }}>SELL</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="premium-btn"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '10px 16px',
                borderColor: 'rgba(34, 211, 238, 0.3)',
                color: 'var(--cyan-bright)',
              }}
              onClick={() => handleQuickAction('View Market')}
            >
              <Store className="h-4 w-4" />
              <span>Browse Market</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.5 }}>SHOP</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="premium-btn"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '10px 16px',
                borderColor: 'rgba(251, 191, 36, 0.3)',
                color: 'var(--gold-bright)',
              }}
              onClick={() => handleQuickAction('Game Arena')}
            >
              <Gamepad2 className="h-4 w-4" />
              <span>Enter Game Arena</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.5 }}>PLAY</span>
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* ─── Pulse Animation Keyframe ────────────────────────────────────── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </motion.div>
  )
}
