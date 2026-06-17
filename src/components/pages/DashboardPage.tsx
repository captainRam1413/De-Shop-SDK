'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  Bot,
  Minus,
  Loader2,
  Clock,
} from 'lucide-react'
import { useDeShopStore } from '@/store/useDeShopStore'
import { useRealtimeEvents, type MarketEvent } from '@/hooks/useRealtimeEvents'
import { SkeletonStatCard, SkeletonChart, SkeletonActivityRow } from '@/components/TerminalSkeleton'

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
  id: number | string
  time: string
  type: 'FORGE' | 'TRADE' | 'LIST' | 'CANCEL' | 'TRANSFER' | 'BRIDGE'
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
  TRANSFER: { color: 'text-term-magenta', bg: 'rgba(255, 0, 255, 0.1)', border: 'border-term-magenta/30' },
  BRIDGE: { color: 'text-term-magenta', bg: 'rgba(255, 0, 255, 0.1)', border: 'border-term-magenta/30' },
}

/** Map a realtime MarketEvent from the WebSocket service to the dashboard ActivityItem shape. */
function marketEventToActivity(ev: MarketEvent): ActivityItem {
  const typeMap: Record<MarketEvent['type'], ActivityItem['type']> = {
    MINT: 'FORGE',
    TRADE: 'TRADE',
    LIST: 'LIST',
    CANCEL: 'CANCEL',
    TRANSFER: 'TRANSFER',
    BRIDGE: 'BRIDGE',
  }
  const verbMap: Record<MarketEvent['type'], string> = {
    MINT: 'minted',
    TRADE: 'traded',
    LIST: 'listed',
    CANCEL: 'delisted',
    TRANSFER: 'transferred',
    BRIDGE: 'bridged',
  }
  return {
    id: ev.id,
    time: 'just now',
    type: typeMap[ev.type],
    description: `${ev.assetName} #${ev.assetId} ${verbMap[ev.type]} (${ev.rarity}) ${ev.from} → ${ev.to}`,
    value: `${ev.amount.toFixed(3)} ALGO`,
  }
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
      className="terminal-card terminal-card-glow"
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
            {/* Slide-up fade animation on change indicator - re-keys on value so it re-animates */}
            <div
              key={stat.value}
              className="flex items-center gap-1 mt-1 animate-slide-up-fade"
            >
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
      className="terminal-card terminal-card-glow"
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
      className="terminal-card terminal-card-cyan-glow"
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
      className="terminal-card terminal-card-magenta-glow"
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

/* ===== ACTIVITY FEED (REALTIME via WebSocket, fallback to simulated) ===== */

function ActivityFeed() {
  const { events: liveEvents, isConnected } = useRealtimeEvents()

  // Local simulated feed - only used as a fallback when the realtime
  // service is unreachable. Stops updating once we are connected.
  const [simActivities, setSimActivities] = useState<ActivityItem[]>(INITIAL_ACTIVITY)
  const feedRef = useRef<HTMLDivElement>(null)
  const counterRef = useRef(INITIAL_ACTIVITY.length)

  // Auto-scroll to bottom whenever displayed list changes
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [liveEvents, simActivities, isConnected])

  // Simulate new activity every 8s ONLY when not connected to realtime
  useEffect(() => {
    if (isConnected) return
    const interval = setInterval(() => {
      const types: ActivityItem['type'][] = ['FORGE', 'TRADE', 'LIST', 'CANCEL', 'TRANSFER', 'BRIDGE']
      const descs = [
        'Obsidian Shard #888 minted',
        'Golden Apple #333 traded',
        'Nether Star #100 listed',
        'Emerald Sword #055 delisted',
        'Phoenix Feather #420 minted',
        'Dragon Scale #777 sold',
        'Crystal Orb #021 listed',
        'Shadow Cloak #666 delisted',
        'Phase Dagger #113 bridged',
        'Cryo Ring #909 transferred',
      ]
      const values = ['15.0 ALGO', '28.5 ALGO', '42.0 ALGO', '9.8 ALGO', '33.3 ALGO', '67.0 ALGO', '11.2 ALGO', '54.0 ALGO']

      const newActivity: ActivityItem = {
        id: ++counterRef.current,
        time: 'just now',
        type: types[Math.floor(Math.random() * types.length)],
        description: descs[Math.floor(Math.random() * descs.length)],
        value: values[Math.floor(Math.random() * values.length)],
      }

      setSimActivities((prev) => [...prev.slice(-14), newActivity])
    }, 8000)

    return () => clearInterval(interval)
  }, [isConnected])

  // Build the displayed list: realtime events take priority.
  // When we have realtime events, prepend them to a (frozen) snapshot of
  // simulated events for visual continuity. Otherwise show only simulated.
  const displayActivities = useMemo<ActivityItem[]>(() => {
    if (!isConnected || liveEvents.length === 0) {
      return simActivities
    }
    const liveItems = liveEvents.map(marketEventToActivity)
    // Top up with simulated items if we don't have enough live ones yet
    const tail = simActivities.slice(0, Math.max(0, 25 - liveItems.length))
    return [...liveItems, ...tail]
  }, [liveEvents, simActivities, isConnected])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.3 }}
      className="terminal-card terminal-card-glow"
    >
      <div className="terminal-card-header moving-scanline">
        <TrafficLights />
        <span className="terminal-title">activity.log</span>

        {/* LIVE / OFFLINE indicator */}
        <div className="ml-auto flex items-center gap-2">
          <span
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[9px] font-bold font-terminal ${
              isConnected
                ? 'text-term-green bg-[rgba(51,255,51,0.08)] border-term-green/40'
                : 'text-term-red bg-[rgba(255,51,51,0.08)] border-term-red/40'
            }`}
            title={isConnected ? 'WebSocket connected' : 'WebSocket offline - showing simulated feed'}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-term-green animate-pulse' : 'bg-term-red'
              }`}
            />
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
          <span
            className="hidden sm:inline-flex text-[9px] font-terminal text-term-dim border border-[#444] px-1.5 py-0.5 rounded-sm"
            title="socket.io via /?XTransformPort=3003"
          >
            Realtime via WebSocket
          </span>
          <Activity className={`w-3.5 h-3.5 ${isConnected ? 'text-term-green animate-pulse' : 'text-term-dim'}`} />
        </div>
      </div>
      <div
        ref={feedRef}
        className="terminal-card-body max-h-96 overflow-y-auto p-4 space-y-1.5"
      >
        {displayActivities.map((item) => {
          const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.TRADE
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
          <span className="blink-cursor" />
          <span className="text-term-dim text-[10px]">
            {isConnected ? 'live events streaming...' : 'offline - showing simulated feed...'}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/* ===== AI PRICING ENGINE ===== */

interface AIPriceResult {
  price: number
  confidence: number
  reasoning: string
  trend: 'up' | 'down' | 'stable'
  source?: 'ai' | 'heuristic'
}

interface HistoryEntry {
  id: string
  name: string
  rarity: string
  price: number
  confidence: number
  trend: 'up' | 'down' | 'stable'
  source: string
  timestamp: string
}

function TrendIcon({ trend, className = 'w-3 h-3' }: { trend: 'up' | 'down' | 'stable'; className?: string }) {
  if (trend === 'up') return <TrendingUp className={`${className} text-term-green`} />
  if (trend === 'down') return <TrendingDown className={`${className} text-term-red`} />
  return <Minus className={`${className} text-term-dim`} />
}

function AIPricingEngine() {
  const { addNotification } = useDeShopStore()
  const [name, setName] = useState('')
  const [rarity, setRarity] = useState<'common' | 'rare' | 'epic' | 'legendary'>('rare')
  const [type, setType] = useState('weapon')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AIPriceResult | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const handleGetPrice = async () => {
    if (!name.trim()) {
      addNotification('warning', 'Enter an asset name first')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/ai-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rarity, type, description }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: AIPriceResult = await res.json()
      setResult(data)
      setHistory((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name,
            rarity,
            price: data.price,
            confidence: data.confidence,
            trend: data.trend,
            source: data.source || 'ai',
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ].slice(0, 5)
      )
      addNotification(
        data.source === 'ai' ? 'success' : 'info',
        `AI oracle: ${data.price} ALGO for "${name}"`
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
      addNotification('error', 'AI pricing failed')
    } finally {
      setLoading(false)
    }
  }

  const confidenceColor =
    result && result.confidence >= 75
      ? 'bg-term-green'
      : result && result.confidence >= 50
        ? 'bg-term-amber'
        : 'bg-term-red'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.3 }}
      className="terminal-card terminal-card-glow"
    >
      <div className="terminal-card-header">
        <TrafficLights />
        <span className="terminal-title">ai_pricing.log</span>
        <Bot className="w-3.5 h-3.5 text-term-green" />
      </div>
      <div className="p-4 bg-[#1E1E1E]">
        <div className="flex items-center gap-2 mb-3">
          <span className="prompt-prefix text-sm">$</span>
          <span className="text-term-green text-xs font-terminal glow-green">./ai-pricing-engine</span>
          <span className="text-term-dim text-[10px] font-terminal">--query --rarity --type</span>
          <span className="ml-auto text-[9px] font-terminal text-term-dim border border-term-dim/40 px-1">
            z-ai-web-dev-sdk
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
          {/* LEFT: Form + Result */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-term-dim text-[10px] font-terminal mb-1 block">ASSET NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Neon Blade"
                  className="terminal-input"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) handleGetPrice()
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-term-dim text-[10px] font-terminal mb-1 block">RARITY</label>
                  <select
                    value={rarity}
                    onChange={(e) => setRarity(e.target.value as 'common' | 'rare' | 'epic' | 'legendary')}
                    className="terminal-input"
                    disabled={loading}
                  >
                    <option value="common">Common</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>
                <div>
                  <label className="text-term-dim text-[10px] font-terminal mb-1 block">TYPE</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="terminal-input"
                    disabled={loading}
                  >
                    <option value="weapon">Weapon</option>
                    <option value="character">Character</option>
                    <option value="accessory">Accessory</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="text-term-dim text-[10px] font-terminal mb-1 block">DESCRIPTION (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. plasma-infused blade forged in the digital crucible"
                className="terminal-input"
                disabled={loading}
              />
            </div>

            <button
              onClick={handleGetPrice}
              disabled={loading || !name.trim()}
              className="terminal-btn terminal-btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Querying Oracle...</span>
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5" />
                  <span>Get Price</span>
                </>
              )}
            </button>

            {/* Results Panel */}
            <div className="border border-[#333] bg-[#181818] p-3 space-y-2 min-h-[140px]">
              <div className="text-term-dim text-[10px] font-terminal mb-1 flex items-center gap-2">
                <span>&gt; result.log</span>
                {loading && <span className="blink-cursor" />}
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-term-amber text-[11px] font-terminal">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>querying AI oracle...</span>
                </div>
              )}
              {error && !loading && (
                <div className="text-term-red text-[11px] font-terminal">{`> ERR: ${error}`}</div>
              )}
              {result && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-term-dim text-[10px] font-terminal">PRICE</span>
                      <span className="text-term-green text-lg font-terminal font-bold glow-green">
                        ◆ {result.price} ALGO
                      </span>
                      <TrendIcon trend={result.trend} className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[9px] font-terminal border px-1 ${
                        result.source === 'ai'
                          ? 'text-term-green border-term-green/40'
                          : 'text-term-amber border-term-amber/40'
                      }`}
                    >
                      {result.source || 'ai'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-term-dim text-[10px] font-terminal">CONFIDENCE</span>
                      <span className="text-term-green text-[10px] font-terminal">{result.confidence}%</span>
                    </div>
                    <div className="flex-1 h-2 bg-[#2D2D2D] border border-[#444444] overflow-hidden">
                      <div
                        className={`h-full transition-all ${confidenceColor}`}
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-term-dim text-[10px] font-terminal mb-0.5">REASONING</div>
                    <div className="text-term-text text-[10px] font-terminal leading-relaxed border-l-2 border-term-green/30 pl-2">
                      {result.reasoning}
                    </div>
                  </div>
                </motion.div>
              )}
              {!result && !loading && !error && (
                <div className="text-term-dim text-[10px] font-terminal">
                  &gt; awaiting query... enter an asset name and click Get Price
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: History */}
          <div className="border border-[#333] bg-[#181818] flex flex-col">
            <div className="px-3 py-2 border-b border-[#333] flex items-center gap-2">
              <Clock className="w-3 h-3 text-term-dim" />
              <span className="text-term-dim text-[10px] font-terminal">last 5 queries</span>
            </div>
            <div className="flex-1 p-2 space-y-1.5 max-h-80 overflow-y-auto">
              {history.length === 0 && (
                <div className="text-term-dim text-[10px] font-terminal text-center py-4">
                  no queries yet
                </div>
              )}
              {history.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border border-[#2a2a2a] p-2 bg-[#1E1E1E] hover:border-term-green/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-term-green text-[10px] font-terminal truncate flex-1">
                      {entry.name}
                    </span>
                    <TrendIcon trend={entry.trend} className="w-2.5 h-2.5 flex-shrink-0" />
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-terminal">
                    <span className="text-term-dim">{entry.rarity}</span>
                    <span className="text-term-amber">◆ {entry.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-terminal text-term-dim">
                    <span>{entry.source}</span>
                    <span>{entry.confidence}%</span>
                  </div>
                  <div className="text-[8px] font-terminal text-term-dim mt-0.5">{entry.timestamp}</div>
                </motion.div>
              ))}
            </div>
          </div>
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

/* ===== REALTIME STATS CARD (Task 11-d) ===== */

function RealtimeStatBox({
  label,
  value,
  color,
  title,
}: {
  label: string
  value: string | number
  color: string
  title?: string
}) {
  return (
    <div
      className="border border-[#444444] p-2 bg-[#1E1E1E] flex flex-col justify-center min-h-[56px]"
      title={title}
    >
      <div className="text-term-dim text-[9px] font-terminal mb-0.5 tracking-wide">{label}</div>
      <div className={`text-base font-terminal font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  )
}

function RealtimeStatsCard() {
  const { isConnected, stats, events } = useRealtimeEvents()

  // Local EPM fallback: count events received in the last 60 s
  const localEpm = useMemo(() => {
    const cutoff = Date.now() - 60000
    return events.filter((e) => e.timestamp >= cutoff).length
  }, [events])

  const epm = stats?.eventsPerMinute ?? localEpm
  const totalToday = stats?.totalEvents ?? events.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.3 }}
      className="terminal-card terminal-card-cyan-glow"
    >
      <div className="terminal-card-header">
        <TrafficLights />
        <span className="terminal-title">realtime_stats.log</span>
        <Activity className="w-3.5 h-3.5 text-term-cyan" />
        <span
          className={`ml-auto text-[10px] font-terminal font-bold ${
            isConnected ? 'text-term-green' : 'text-term-red'
          }`}
        >
          {isConnected ? '● LIVE' : '● OFFLINE'}
        </span>
      </div>
      <div className="terminal-card-body">
        <div className="text-term-dim text-[10px] font-terminal mb-2 flex items-center gap-2">
          <span className="prompt-prefix">$</span>
          <span className="text-term-cyan">tail -f /var/log/de-shop/realtime.log</span>
          <span className="blink-cursor" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <RealtimeStatBox
            label="ONLINE CLIENTS"
            value={stats?.onlineClients ?? '—'}
            color="text-term-green"
            title="Currently connected socket.io clients"
          />
          <RealtimeStatBox
            label="EVENTS/MIN"
            value={epm}
            color="text-term-amber"
            title="Marketplace events per minute"
          />
          <RealtimeStatBox
            label="TOTAL EVENTS"
            value={totalToday.toLocaleString()}
            color="text-term-cyan"
            title="Total events emitted by the realtime service"
          />
          <RealtimeStatBox
            label="24H VOLUME"
            value={stats ? `${(stats.volume24h / 1000).toFixed(1)}K` : '—'}
            color="text-term-amber"
            title="Simulated 24-hour trade volume in ALGO"
          />
          <RealtimeStatBox
            label="ACTIVE WALLETS"
            value={stats?.activeWallets?.toLocaleString() ?? '—'}
            color="text-term-magenta"
            title="Distinct wallets active in the last 24 h"
          />
          <RealtimeStatBox
            label="GAS PRICE"
            value={stats ? stats.gasPrice.toFixed(6) : '—'}
            color="text-term-cyan"
            title="Current Algorand gas price in ALGO"
          />
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10px] font-terminal">
          <span
            className={`status-dot ${isConnected ? 'status-dot-online' : 'status-dot-offline'}`}
          />
          <span className={isConnected ? 'text-term-green' : 'text-term-red'}>
            {isConnected
              ? 'streaming live marketplace events via socket.io'
              : 'disconnected — showing last-known values'}
          </span>
        </div>
      </div>
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
          {loading && (
            <span className="text-term-amber text-[10px] font-terminal animate-pulse">
              [fetching stats...]
            </span>
          )}
          <span className="blink-cursor" />
        </div>
      </div>

      {/* Stats Grid - show skeletons while loading */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayStats.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} />
          ))}
        </div>
      )}

      {/* Realtime stats (Task 11-d) — always visible, updates live */}
      <RealtimeStatsCard />

      {/* Charts Row - skeletons while loading */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SkeletonChart title="price_trend.log" />
          <SkeletonChart title="volume_stats.log" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PriceChartCard />
          <VolumeChartCard />
        </div>
      )}

      {/* Rarity + Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          {loading ? (
            <SkeletonChart title="rarity_dist.log" height={220} />
          ) : (
            <RarityChartCard data={displayRarityData} />
          )}
        </div>
        <div className="lg:col-span-2">
          {loading ? (
            <div className="skeleton-card">
              <div className="skeleton-card-header flex items-center">
                <div className="flex items-center gap-1.5 px-3 py-2">
                  <span className="w-3 h-3 rounded-full bg-[#3a3a3a]" />
                  <span className="w-3 h-3 rounded-full bg-[#3a3a3a]" />
                  <span className="w-3 h-3 rounded-full bg-[#3a3a3a]" />
                </div>
                <span className="ml-2 text-[10px] font-terminal text-[#444444]">activity.log</span>
              </div>
              <div className="p-4 space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonActivityRow key={i} />
                ))}
              </div>
            </div>
          ) : (
            <ActivityFeed />
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* AI Pricing Engine */}
      <AIPricingEngine />
    </div>
  )
}
