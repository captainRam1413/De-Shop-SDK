'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Flame,
  ArrowRightLeft,
  FileText,
  Coins,
  Users,
  Zap,
  ListPlus,
  BookOpen,
  Activity,
} from 'lucide-react'
import { useDeShopStore } from '@/store/useDeShopStore'

/* ===== TRAFFIC LIGHT DOTS ===== */

function TrafficLights() {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className="terminal-dot terminal-dot-red" />
      <span className="terminal-dot terminal-dot-yellow" />
      <span className="terminal-dot terminal-dot-green" />
    </div>
  )
}

/* ===== DATA ===== */

const STATS = [
  {
    label: 'Total Value Locked',
    value: '$2.4M',
    change: '+12.5%',
    positive: true,
    icon: Coins,
    sparkData: [30, 45, 38, 52, 48, 60, 68],
  },
  {
    label: 'Active Wallets',
    value: '1,847',
    change: '+8.3%',
    positive: true,
    icon: Users,
    sparkData: [20, 28, 32, 35, 30, 38, 42],
  },
  {
    label: 'Gas Fees (24h)',
    value: '0.003 ALGO',
    change: '-2.1%',
    positive: false,
    icon: Zap,
    sparkData: [15, 12, 14, 10, 13, 11, 9],
  },
  {
    label: 'Cross-Chain Volume',
    value: '$890K',
    change: '+15.7%',
    positive: true,
    icon: ArrowRightLeft,
    sparkData: [40, 55, 50, 65, 58, 72, 80],
  },
]

const PRICE_DATA = [
  { day: 'Mon', price: 1.82 },
  { day: 'Tue', price: 1.95 },
  { day: 'Wed', price: 1.88 },
  { day: 'Thu', price: 2.12 },
  { day: 'Fri', price: 2.05 },
  { day: 'Sat', price: 2.28 },
  { day: 'Sun', price: 2.41 },
]

const VOLUME_DATA = [
  { day: 'Mon', volume: 12400 },
  { day: 'Tue', volume: 18200 },
  { day: 'Wed', volume: 14800 },
  { day: 'Thu', volume: 22100 },
  { day: 'Fri', volume: 19500 },
  { day: 'Sat', volume: 25600 },
  { day: 'Sun', volume: 21300 },
]

const RARITY_DATA = [
  { name: 'Common', value: 4200, color: '#888888' },
  { name: 'Rare', value: 1800, color: '#00D4FF' },
  { name: 'Epic', value: 650, color: '#FF00FF' },
  { name: 'Legendary', value: 150, color: '#FFB800' },
]

interface ActivityItem {
  id: number
  time: string
  type: 'FORGE' | 'TRADE' | 'LIST' | 'CANCEL'
  description: string
  value: string
}

const INITIAL_ACTIVITY: ActivityItem[] = [
  { id: 1, time: '2m ago', type: 'FORGE', description: 'Diamond Sword #1337 minted', value: '25.0 ALGO' },
  { id: 2, time: '3m ago', type: 'TRADE', description: 'Gold Pickaxe #042 sold', value: '18.5 ALGO' },
  { id: 3, time: '5m ago', type: 'LIST', description: 'Enchanted Bow #219 listed', value: '32.0 ALGO' },
  { id: 4, time: '7m ago', type: 'FORGE', description: 'Nether Shield #088 minted', value: '12.0 ALGO' },
  { id: 5, time: '9m ago', type: 'CANCEL', description: 'Dragon Helm #001 delisted', value: '55.0 ALGO' },
  { id: 6, time: '12m ago', type: 'TRADE', description: 'Ender Pearl #305 traded', value: '8.2 ALGO' },
  { id: 7, time: '15m ago', type: 'LIST', description: 'Creeper Mask #444 listed', value: '14.5 ALGO' },
  { id: 8, time: '18m ago', type: 'FORGE', description: 'Blaze Rod #777 minted', value: '6.8 ALGO' },
  { id: 9, time: '22m ago', type: 'TRADE', description: 'Iron Golem #012 sold', value: '42.0 ALGO' },
  { id: 10, time: '25m ago', type: 'LIST', description: 'Wither Skull #666 listed', value: '99.9 ALGO' },
  { id: 11, time: '28m ago', type: 'CANCEL', description: 'Spider Eye #921 delisted', value: '3.5 ALGO' },
  { id: 12, time: '32m ago', type: 'TRADE', description: 'Ghast Tear #553 traded', value: '19.2 ALGO' },
  { id: 13, time: '35m ago', type: 'FORGE', description: 'Magma Cream #210 minted', value: '7.1 ALGO' },
  { id: 14, time: '38m ago', type: 'LIST', description: 'Elytra Wings #007 listed', value: '120.0 ALGO' },
  { id: 15, time: '42m ago', type: 'TRADE', description: 'Trident #999 sold', value: '75.0 ALGO' },
]

const TYPE_CONFIG: Record<ActivityItem['type'], { color: string; bg: string; border: string }> = {
  FORGE: { color: 'text-term-green', bg: 'rgba(51, 255, 51, 0.1)', border: 'border-term-green/30' },
  TRADE: { color: 'text-term-cyan', bg: 'rgba(0, 212, 255, 0.1)', border: 'border-term-cyan/30' },
  LIST: { color: 'text-term-amber', bg: 'rgba(255, 184, 0, 0.1)', border: 'border-term-amber/30' },
  CANCEL: { color: 'text-term-red', bg: 'rgba(255, 51, 51, 0.1)', border: 'border-term-red/30' },
}

const QUICK_ACTIONS = [
  { label: 'Mint NFT', icon: Flame, color: 'text-term-green', borderColor: 'border-term-green/50' },
  { label: 'List Item', icon: ListPlus, color: 'text-term-cyan', borderColor: 'border-term-cyan/50' },
  { label: 'Connect Wallet', icon: Wallet, color: 'text-term-amber', borderColor: 'border-term-amber/50' },
  { label: 'View Docs', icon: BookOpen, color: 'text-term-magenta', borderColor: 'border-term-magenta/50' },
]

/* ===== CUSTOM TERMINAL TOOLTIP ===== */

function TerminalTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-[#1E1E1E] border border-[#444444] p-2 rounded-sm shadow-lg font-terminal text-xs">
      <div className="text-term-dim mb-1">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="text-term-green">
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </div>
      ))}
    </div>
  )
}

/* ===== MINI SPARKLINE (SVG) ===== */

function MiniSparkline({ data, color, positive }: { data: number[]; color: string; positive: boolean }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 80
  const height = 28
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#33FF33' : '#FF3333'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ===== STAT CARD ===== */

function StatCard({ stat, index }: { stat: typeof STATS[0]; index: number }) {
  const Icon = stat.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="terminal-card"
    >
      <div className="terminal-card-header">
        <TrafficLights />
        <span className="terminal-title">{stat.label.toLowerCase().replace(/\s/g, '_')}.log</span>
      </div>
      <div className="terminal-card-body">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-term-dim text-[10px] mb-1 font-terminal">{stat.label}</div>
            <div className="text-2xl font-bold text-term-green font-terminal glow-green">
              {stat.value}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {stat.positive ? (
                <TrendingUp className="w-3 h-3 text-term-green" />
              ) : (
                <TrendingDown className="w-3 h-3 text-term-red" />
              )}
              <span className={`text-[11px] font-terminal ${stat.positive ? 'text-term-green' : 'text-term-red'}`}>
                {stat.change}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-sm bg-[#1E1E1E] border border-[#444444]">
              <Icon className="w-4 h-4 text-term-dim" />
            </div>
            <MiniSparkline data={stat.sparkData} color={stat.positive ? '#33FF33' : '#FF3333'} positive={stat.positive} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ===== PRICE CHART CARD ===== */

function PriceChartCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.3 }}
      className="terminal-card"
    >
      <div className="terminal-card-header">
        <TrafficLights />
        <span className="terminal-title">price_trend.log</span>
      </div>
      <div className="terminal-card-body" style={{ background: '#1E1E1E' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-term-dim text-[10px] font-terminal">7-Day Price Trend (ALGO)</span>
          <span className="text-term-green text-[11px] font-terminal glow-green">$2.41 ▲</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={PRICE_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#33FF33" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#33FF33" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
            <XAxis
              dataKey="day"
              tick={{ fill: '#888888', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#444444' }}
              tickLine={{ stroke: '#444444' }}
            />
            <YAxis
              tick={{ fill: '#888888', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#444444' }}
              tickLine={{ stroke: '#444444' }}
              domain={['dataMin - 0.2', 'dataMax + 0.2']}
            />
            <Tooltip content={<TerminalTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#33FF33"
              strokeWidth={2}
              fill="url(#priceGradient)"
              name="Price"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

/* ===== VOLUME CHART CARD ===== */

function VolumeChartCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.3 }}
      className="terminal-card"
    >
      <div className="terminal-card-header">
        <TrafficLights />
        <span className="terminal-title">volume_stats.log</span>
      </div>
      <div className="terminal-card-body" style={{ background: '#1E1E1E' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-term-dim text-[10px] font-terminal">Daily Volume (ALGO)</span>
          <span className="text-term-cyan text-[11px] font-terminal glow-cyan">25.6K ▲</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={VOLUME_DATA} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
            <XAxis
              dataKey="day"
              tick={{ fill: '#888888', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#444444' }}
              tickLine={{ stroke: '#444444' }}
            />
            <YAxis
              tick={{ fill: '#888888', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: '#444444' }}
              tickLine={{ stroke: '#444444' }}
            />
            <Tooltip content={<TerminalTooltip />} />
            <Bar
              dataKey="volume"
              fill="#00D4FF"
              radius={[2, 2, 0, 0]}
              name="Volume"
              opacity={0.85}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

/* ===== RARITY PIE CHART CARD ===== */

function RarityChartCard({ data = RARITY_DATA }: { data?: typeof RARITY_DATA }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.3 }}
      className="terminal-card"
    >
      <div className="terminal-card-header">
        <TrafficLights />
        <span className="terminal-title">rarity_dist.log</span>
      </div>
      <div className="terminal-card-body" style={{ background: '#1E1E1E' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-term-dim text-[10px] font-terminal">NFT Rarity Distribution</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              stroke="#1E1E1E"
              strokeWidth={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const data = payload[0]
                return (
                  <div className="bg-[#1E1E1E] border border-[#444444] p-2 rounded-sm shadow-lg font-terminal text-xs">
                    <div className="text-term-dim">{data.name}</div>
                    <div className="text-term-green">{data.value?.toLocaleString()} items</div>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] font-terminal text-term-dim">{item.name}</span>
              <span className="text-[10px] font-terminal text-term-text">{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ===== ACTIVITY FEED ===== */

function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>(INITIAL_ACTIVITY)
  const feedRef = useRef<HTMLDivElement>(null)
  const counterRef = useRef(INITIAL_ACTIVITY.length)

  // Auto-scroll to bottom
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [activities])

  // Simulate new activity every 8s
  useEffect(() => {
    const interval = setInterval(() => {
      const types: ActivityItem['type'][] = ['FORGE', 'TRADE', 'LIST', 'CANCEL']
      const descs = [
        'Obsidian Shard #888 minted',
        'Golden Apple #333 traded',
        'Nether Star #100 listed',
        'Emerald Sword #055 delisted',
        'Phoenix Feather #420 minted',
        'Dragon Scale #777 sold',
        'Crystal Orb #021 listed',
        'Shadow Cloak #666 delisted',
      ]
      const values = ['15.0 ALGO', '28.5 ALGO', '42.0 ALGO', '9.8 ALGO', '33.3 ALGO', '67.0 ALGO', '11.2 ALGO', '54.0 ALGO']

      const newActivity: ActivityItem = {
        id: ++counterRef.current,
        time: 'just now',
        type: types[Math.floor(Math.random() * types.length)],
        description: descs[Math.floor(Math.random() * descs.length)],
        value: values[Math.floor(Math.random() * values.length)],
      }

      setActivities((prev) => [...prev.slice(-14), newActivity])
    }, 8000)

    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.3 }}
      className="terminal-card"
    >
      <div className="terminal-card-header">
        <TrafficLights />
        <span className="terminal-title">activity.log</span>
        <Activity className="w-3.5 h-3.5 text-term-green animate-pulse" />
      </div>
      <div
        ref={feedRef}
        className="terminal-card-body max-h-96 overflow-y-auto p-4 space-y-1.5"
      >
        {activities.map((item, index) => {
          const config = TYPE_CONFIG[item.type]
          const isNew = item.time === 'just now'
          return (
            <motion.div
              key={item.id}
              initial={isNew ? { opacity: 0, x: 10 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center gap-2 text-[11px] font-terminal py-1 px-1.5 rounded-sm hover:bg-[#1E1E1E] transition-colors ${isNew ? 'bg-term-selection/30' : ''}`}
            >
              <span className="text-term-dim flex-shrink-0 w-16">[{item.time}]</span>
              <span
                className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold ${config.color} ${config.bg} border ${config.border} flex-shrink-0`}
              >
                {item.type}
              </span>
              <span className="text-term-text truncate flex-1">{item.description}</span>
              <span className="text-term-amber flex-shrink-0">→ {item.value}</span>
            </motion.div>
          )
        })}
        <div className="flex items-center gap-1 pt-2">
          <span className="cursor-blink" />
          <span className="text-term-dim text-[10px]">listening for events...</span>
        </div>
      </div>
    </motion.div>
  )
}

/* ===== QUICK ACTIONS ===== */

function QuickActions() {
  const { walletConnected, setShowWalletModal, setActivePage, addNotification } = useDeShopStore()

  const handleAction = (label: string) => {
    switch (label) {
      case 'Connect Wallet':
        if (walletConnected) {
          addNotification('info', 'Wallet already connected')
        } else {
          setShowWalletModal(true)
        }
        break
      case 'View Docs':
        setActivePage('docs')
        break
      case 'Mint NFT':
        addNotification('info', 'Mint NFT module loading...')
        break
      case 'List Item':
        addNotification('info', 'List Item module loading...')
        break
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.3 }}
      className="flex flex-wrap gap-3"
    >
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.label}
            onClick={() => handleAction(action.label)}
            className={`terminal-btn flex items-center gap-2 border ${action.borderColor} hover:bg-[#1E1E1E] transition-all group`}
          >
            <Icon className={`w-3.5 h-3.5 ${action.color} group-hover:scale-110 transition-transform`} />
            <span className={`${action.color} text-[11px]`}>{action.label}</span>
          </button>
        )
      })}
    </motion.div>
  )
}

/* ===== API FETCH HOOK ===== */

interface ApiStats {
  totalValueLocked: string
  activeWallets: string
  gasFees: string
  crossChainVolume: string
  totalAssets: number
  totalTransactions: number
  rarityDistribution: { common: number; rare: number; epic: number; legendary: number }
}

function useApiStats() {
  const [apiStats, setApiStats] = useState<ApiStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) {
        const data = await res.json()
        setApiStats(data)
      }
    } catch {
      // fallback to mock data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return { apiStats, loading }
}

/* ===== MAIN DASHBOARD PAGE ===== */

export default function DashboardPage() {
  const { apiStats, loading } = useApiStats()

  // Merge API stats into displayed stats
  const displayStats = STATS.map((stat) => {
    if (!apiStats) return stat
    switch (stat.label) {
      case 'Total Value Locked':
        return { ...stat, value: apiStats.totalValueLocked }
      case 'Active Wallets':
        return { ...stat, value: apiStats.activeWallets }
      case 'Gas Fees (24h)':
        return { ...stat, value: apiStats.gasFees }
      case 'Cross-Chain Volume':
        return { ...stat, value: apiStats.crossChainVolume }
      default:
        return stat
    }
  })

  // Update rarity data from API
  const displayRarityData = apiStats
    ? [
        { name: 'Common', value: apiStats.rarityDistribution.common + 4200, color: '#888888' },
        { name: 'Rare', value: apiStats.rarityDistribution.rare + 1800, color: '#00D4FF' },
        { name: 'Epic', value: apiStats.rarityDistribution.epic + 650, color: '#FF00FF' },
        { name: 'Legendary', value: apiStats.rarityDistribution.legendary + 150, color: '#FFB800' },
      ]
    : RARITY_DATA

  return (
    <div className="space-y-6">
      {/* Terminal Window Header */}
      <div className="terminal-card">
        <div className="terminal-chrome">
          <TrafficLights />
          <span className="terminal-title font-terminal">dashboard@de-shop:~</span>
        </div>
        <div className="px-4 py-3 flex items-center gap-2 bg-[#1E1E1E]">
          <span className="prompt-prefix text-sm">$</span>
          <span className="text-term-green text-sm font-terminal glow-green">./dashboard</span>
          <span className="text-term-dim text-xs font-terminal">--load-modules analytics,activity</span>
          {loading && <span className="text-term-amber text-[10px] font-terminal animate-pulse">[loading...]</span>}
          <span className="cursor-blink" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayStats.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} index={i} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PriceChartCard />
        <VolumeChartCard />
      </div>

      {/* Rarity + Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <RarityChartCard data={displayRarityData} />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  )
}
