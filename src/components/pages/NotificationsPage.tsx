'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Pause,
  Play,
  Trash2,
  Volume2,
  VolumeX,
  Radio,
  Filter,
  Search,
  X,
} from 'lucide-react'
import {
  useRealtimeEvents,
  type MarketEvent,
  type MarketEventType,
  type Rarity,
} from '@/hooks/useRealtimeEvents'

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

/* ===== TYPE / RARITY COLORS ===== */

const TYPE_COLOR: Record<MarketEventType, string> = {
  MINT: 'text-term-green',
  TRADE: 'text-term-cyan',
  LIST: 'text-term-amber',
  CANCEL: 'text-term-red',
  TRANSFER: 'text-term-magenta',
  BRIDGE: 'text-term-cyan',
}

const RARITY_COLOR: Record<Rarity, string> = {
  common: '#888888',
  rare: '#00D4FF',
  epic: '#FF00FF',
  legendary: '#FFB800',
}

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
}

const RARITY_BORDER: Record<Rarity, string> = {
  common: 'border-l-[#888888]',
  rare: 'border-l-[#00D4FF]',
  epic: 'border-l-[#FF00FF]',
  legendary: 'border-l-[#FFB800]',
}

/* ===== HELPERS ===== */

function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function shortAddr(addr: string): string {
  if (!addr) return ''
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function shortHash(hash: string): string {
  if (!hash) return ''
  if (hash.length <= 10) return hash
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`
}

/* ===== FILTER CHIPS ===== */

interface ChipProps {
  label: string
  active: boolean
  onClick: () => void
  color?: string
}

function Chip({ label, active, onClick, color = 'text-term-green' }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 text-[10px] font-terminal border rounded-sm transition-all ${
        active
          ? `border-current ${color} bg-[rgba(51,255,51,0.08)]`
          : 'border-term text-term-dim hover:text-term-text hover:border-term-green/40'
      }`}
    >
      [{label}]
    </button>
  )
}

/* ===== EVENT ROW ===== */

interface EventRowProps {
  event: MarketEvent
  isNew?: boolean
}

function EventRow({ event, isNew }: EventRowProps) {
  const typeColor = TYPE_COLOR[event.type] ?? 'text-term-text'
  const rarityColor = RARITY_COLOR[event.rarity] ?? '#888888'
  const rarityBorder = RARITY_BORDER[event.rarity] ?? 'border-l-[#888888]'

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, x: -12, backgroundColor: 'rgba(51,255,51,0.18)' } : false}
      animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(51,255,51,0)' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`flex items-center gap-2 px-2 py-1 text-[10px] font-terminal border-l-2 ${rarityBorder} hover:bg-[rgba(51,255,51,0.04)] border-t border-term/40`}
    >
      <span className="text-term-dim flex-shrink-0">[{formatTime(event.timestamp)}]</span>
      <span className={`${typeColor} font-bold w-14 flex-shrink-0`}>{event.type.padEnd(7, ' ')}</span>
      <span
        className="font-bold w-16 flex-shrink-0"
        style={{ color: rarityColor }}
      >
        {RARITY_LABEL[event.rarity].padEnd(9, ' ')}
      </span>
      <span className="text-term-text truncate flex-1 min-w-0" title={event.assetName}>
        {event.assetName}
      </span>
      <span className="text-term-dim flex-shrink-0">#{event.assetId}</span>
      <span className="text-term-green flex-shrink-0 w-20 text-right">
        {event.amount.toFixed(2)} ALGO
      </span>
      <span className="text-term-dim flex-shrink-0 hidden md:inline">
        {shortAddr(event.from)}<span className="text-term-green">→</span>{shortAddr(event.to)}
      </span>
      <span className="text-term-cyan/80 flex-shrink-0 hidden lg:inline">
        {shortHash(event.txHash)}
      </span>
    </motion.div>
  )
}

/* ===== STAT BAR (ASCII) ===== */

function AsciiBar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = 16
  const filled = max > 0 ? Math.round((value / max) * width) : 0
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled)
  return (
    <span style={{ color }}>
      {bar}
    </span>
  )
}

/* ===== STATS PANEL ===== */

function StatsPanel({ events }: { events: MarketEvent[] }) {
  const typeCounts = useMemo(() => {
    const counts: Record<MarketEventType, number> = {
      MINT: 0,
      TRADE: 0,
      LIST: 0,
      CANCEL: 0,
      TRANSFER: 0,
      BRIDGE: 0,
    }
    events.forEach((e) => {
      counts[e.type] = (counts[e.type] || 0) + 1
    })
    return counts
  }, [events])

  const rarityCounts = useMemo(() => {
    const counts: Record<Rarity, number> = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    }
    events.forEach((e) => {
      counts[e.rarity] = (counts[e.rarity] || 0) + 1
    })
    return counts
  }, [events])

  const topAssets = useMemo(() => {
    const map = new Map<string, { name: string; count: number; volume: number }>()
    events.forEach((e) => {
      const key = e.assetName
      const existing = map.get(key) || { name: e.assetName, count: 0, volume: 0 }
      existing.count++
      existing.volume += e.amount
      map.set(key, existing)
    })
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [events])

  const volume5min = useMemo(() => {
    const cutoff = Date.now() - 5 * 60 * 1000
    return events.filter((e) => e.timestamp >= cutoff).reduce((sum, e) => sum + e.amount, 0)
  }, [events])

  const avgValue = events.length > 0
    ? events.reduce((sum, e) => sum + e.amount, 0) / events.length
    : 0

  const maxType = Math.max(1, ...Object.values(typeCounts))
  const maxRarity = Math.max(1, ...Object.values(rarityCounts))

  return (
    <div className="terminal-card flex flex-col h-full">
      <div className="terminal-card-header">
        <TrafficLights />
        <span className="terminal-title">event_stats.log</span>
      </div>
      <div className="terminal-card-body flex-1 overflow-y-auto max-h-[calc(100vh-200px)] space-y-4 text-[11px] font-terminal">
        {/* Event type distribution */}
        <div>
          <div className="text-term-dim text-[10px] mb-1.5 border-b border-term pb-1">
            <span className="prompt-prefix">$</span> event_type_distribution
          </div>
          <div className="space-y-0.5">
            {(Object.keys(typeCounts) as MarketEventType[]).map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className={`${TYPE_COLOR[t]} w-16`}>{t}</span>
                <AsciiBar value={typeCounts[t]} max={maxType} color={RARITY_COLOR[t === 'MINT' ? 'common' : t === 'TRADE' ? 'rare' : t === 'LIST' ? 'epic' : t === 'CANCEL' ? 'common' : 'legendary']} />
                <span className="text-term-text w-8 text-right">{typeCounts[t]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rarity distribution */}
        <div>
          <div className="text-term-dim text-[10px] mb-1.5 border-b border-term pb-1">
            <span className="prompt-prefix">$</span> rarity_distribution
          </div>
          <div className="space-y-0.5">
            {(Object.keys(rarityCounts) as Rarity[]).map((r) => (
              <div key={r} className="flex items-center gap-2">
                <span className="w-16" style={{ color: RARITY_COLOR[r] }}>{RARITY_LABEL[r]}</span>
                <AsciiBar value={rarityCounts[r]} max={maxRarity} color={RARITY_COLOR[r]} />
                <span className="text-term-text w-8 text-right">{rarityCounts[r]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top traded assets */}
        <div>
          <div className="text-term-dim text-[10px] mb-1.5 border-b border-term pb-1">
            <span className="prompt-prefix">$</span> top_traded_assets
          </div>
          {topAssets.length === 0 ? (
            <div className="text-term-dim italic">no data yet…</div>
          ) : (
            <div className="space-y-0.5">
              {topAssets.map((a, i) => (
                <div key={a.name} className="flex items-center gap-2">
                  <span className="text-term-amber w-4">{i + 1}.</span>
                  <span className="text-term-text flex-1 truncate">{a.name}</span>
                  <span className="text-term-cyan">×{a.count}</span>
                  <span className="text-term-green w-16 text-right">{a.volume.toFixed(1)} A</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Volume + avg */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-term">
          <div className="border border-term p-2 rounded-sm">
            <div className="text-term-dim text-[9px]">VOL (5 MIN)</div>
            <div className="text-term-green text-sm font-bold">{volume5min.toFixed(2)}</div>
            <div className="text-term-dim text-[9px]">ALGO</div>
          </div>
          <div className="border border-term p-2 rounded-sm">
            <div className="text-term-dim text-[9px]">AVG VALUE</div>
            <div className="text-term-cyan text-sm font-bold">{avgValue.toFixed(2)}</div>
            <div className="text-term-dim text-[9px]">ALGO / event</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===== SOUND HOOK ===== */

function useBlipSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)

  const playBlip = useCallback(() => {
    if (!enabled) return
    try {
      if (!ctxRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (!Ctx) return
        ctxRef.current = new Ctx()
      }
      const ctx = ctxRef.current
      if (!ctx) return
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.04, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.1)
    } catch {
      /* ignore audio errors */
    }
  }, [enabled])

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        try {
          ctxRef.current.close()
        } catch {
          /* ignore */
        }
        ctxRef.current = null
      }
    }
  }, [])

  return playBlip
}

/* ===== MAIN COMPONENT ===== */

export default function NotificationsPage() {
  const { events, isConnected, stats } = useRealtimeEvents()

  // Local state — keep up to 100 events for this view (the hook only keeps 50).
  const [allEvents, setAllEvents] = useState<MarketEvent[]>([])
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [paused, setPaused] = useState(false)
  const [soundOn, setSoundOn] = useState(false)

  // Filters
  const [typeFilters, setTypeFilters] = useState<Set<MarketEventType>>(new Set())
  const [rarityFilters, setRarityFilters] = useState<Set<Rarity>>(new Set())
  const [minAmount, setMinAmount] = useState<string>('')
  const [search, setSearch] = useState('')

  const playBlip = useBlipSound(soundOn)

  // Track latest event id from the realtime hook
  const lastSeenIdRef = useRef<string | null>(null)

  // When a new event arrives from the realtime hook, prepend it to our local list
  useEffect(() => {
    if (events.length === 0) return
    const latest = events[0]
    if (!latest || latest.id === lastSeenIdRef.current) return
    lastSeenIdRef.current = latest.id

    if (!paused) {
      setAllEvents((prev) => {
        // Avoid dupes (the hook dedupes, but be defensive)
        if (prev.some((e) => e.id === latest.id)) return prev
        const next = [latest, ...prev]
        return next.length > 100 ? next.slice(0, 100) : next
      })
      setNewIds((prev) => {
        const next = new Set(prev)
        next.add(latest.id)
        return next
      })
      // Clear "new" flag after a moment
      const id = latest.id
      setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 1200)

      playBlip()
    }
  }, [events, paused, playBlip])

  // Toggle helpers
  const toggleType = (t: MarketEventType) => {
    setTypeFilters((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }
  const toggleRarity = (r: Rarity) => {
    setRarityFilters((prev) => {
      const next = new Set(prev)
      if (next.has(r)) next.delete(r)
      else next.add(r)
      return next
    })
  }

  // Derived filtered events
  const filteredEvents = useMemo(() => {
    const min = minAmount ? parseFloat(minAmount) : 0
    const q = search.trim().toLowerCase()
    return allEvents.filter((e) => {
      if (typeFilters.size > 0 && !typeFilters.has(e.type)) return false
      if (rarityFilters.size > 0 && !rarityFilters.has(e.rarity)) return false
      if (min > 0 && e.amount < min) return false
      if (q && !e.assetName.toLowerCase().includes(q)) return false
      return true
    })
  }, [allEvents, typeFilters, rarityFilters, minAmount, search])

  // Events-per-minute (based on timestamps of allEvents)
  const eventsPerMinute = useMemo(() => {
    const now = Date.now()
    const oneMinAgo = now - 60 * 1000
    return allEvents.filter((e) => e.timestamp >= oneMinAgo).length
  }, [allEvents])

  const totalSession = allEvents.length

  const handleClear = useCallback(() => {
    setAllEvents([])
    setNewIds(new Set())
  }, [])

  const TYPES: MarketEventType[] = ['MINT', 'TRADE', 'LIST', 'CANCEL', 'TRANSFER', 'BRIDGE']
  const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary']

  return (
    <div className="p-3 sm:p-4 space-y-3 max-w-full">
      {/* Terminal window header */}
      <div className="terminal-card">
        <div className="terminal-card-header">
          <TrafficLights />
          <span className="terminal-title">notifications@de-shop:~/activity-center</span>
        </div>

        {/* Live Status Bar */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-term text-[10px] font-terminal">
          {/* Connection indicator */}
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-term-green opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-term-green" />
                </span>
                <span className="text-term-green font-bold">● LIVE</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-term-red" />
                <span className="text-term-red font-bold">● OFFLINE</span>
              </>
            )}
          </div>

          <span className="text-term-dim">|</span>

          <div className="flex items-center gap-1">
            <span className="text-term-dim">EPM:</span>
            <span className="text-term-cyan font-bold">{eventsPerMinute}</span>
          </div>

          <span className="text-term-dim">|</span>

          <div className="flex items-center gap-1">
            <span className="text-term-dim">TOTAL:</span>
            <span className="text-term-green font-bold">{totalSession}</span>
          </div>

          {stats && (
            <>
              <span className="text-term-dim">|</span>
              <div className="hidden sm:flex items-center gap-1">
                <span className="text-term-dim">ONLINE:</span>
                <span className="text-term-amber font-bold">{stats.onlineClients}</span>
              </div>
            </>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setSoundOn((s) => !s)}
              className={`terminal-btn text-[10px] px-2 py-0.5 ${soundOn ? 'text-term-green' : 'text-term-dim'}`}
              title={soundOn ? 'Mute sound' : 'Enable sound'}
            >
              {soundOn ? <Volume2 size={11} className="inline" /> : <VolumeX size={11} className="inline" />}
              <span className="ml-1 hidden sm:inline">{soundOn ? 'SOUND' : 'MUTE'}</span>
            </button>
            <button
              onClick={() => setPaused((p) => !p)}
              className={`terminal-btn text-[10px] px-2 py-0.5 ${paused ? 'text-term-amber' : 'text-term-green'}`}
            >
              {paused ? <Play size={11} className="inline" /> : <Pause size={11} className="inline" />}
              <span className="ml-1">{paused ? 'RESUME' : 'PAUSE'}</span>
            </button>
            <button
              onClick={handleClear}
              className="terminal-btn text-[10px] px-2 py-0.5 text-term-red"
            >
              <Trash2 size={11} className="inline" />
              <span className="ml-1">CLEAR</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-3 py-2 border-b border-term space-y-2 text-[10px] font-terminal">
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter size={10} className="text-term-dim" />
            <span className="text-term-dim w-12">type:</span>
            <Chip label="ALL" active={typeFilters.size === 0} onClick={() => setTypeFilters(new Set())} />
            {TYPES.map((t) => (
              <Chip
                key={t}
                label={t}
                active={typeFilters.has(t)}
                onClick={() => toggleType(t)}
                color={TYPE_COLOR[t]}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Filter size={10} className="text-term-dim" />
            <span className="text-term-dim w-12">rarity:</span>
            <Chip label="ALL" active={rarityFilters.size === 0} onClick={() => setRarityFilters(new Set())} />
            {RARITIES.map((r) => (
              <Chip
                key={r}
                label={RARITY_LABEL[r]}
                active={rarityFilters.has(r)}
                onClick={() => toggleRarity(r)}
                color="text-term-amber"
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-term-dim">min_amount:</span>
              <div className="flex items-center border border-term rounded-sm bg-term-surface focus-within:border-term-green/60">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="0.0"
                  className="terminal-input w-20 px-1.5 py-0.5 text-[10px] bg-transparent border-0 focus:ring-0"
                />
                <span className="text-term-dim text-[9px] pr-1.5">ALGO</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
              <Search size={10} className="text-term-dim" />
              <div className="flex items-center border border-term rounded-sm bg-term-surface focus-within:border-term-green/60 flex-1">
                <span className="prompt-prefix-dim pl-1.5 text-[10px]">$</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="search --asset-name"
                  className="terminal-input flex-1 px-1.5 py-0.5 text-[10px] bg-transparent border-0 focus:ring-0"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="text-term-dim hover:text-term-red px-1.5"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body: event stream + stats sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 p-3">
          {/* Event stream */}
          <div className="border border-term rounded-sm bg-[#1a1a1a] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-2 py-1 border-b border-term bg-term-surface">
              <div className="flex items-center gap-1.5">
                <Radio size={11} className="text-term-green" />
                <span className="text-[10px] font-terminal text-term-dim">
                  live_event_stream.log
                </span>
              </div>
              <span className="text-[10px] font-terminal text-term-dim">
                showing {filteredEvents.length} / {allEvents.length}
              </span>
            </div>
            <div className="overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-340px)]">
              {filteredEvents.length === 0 ? (
                <div className="px-3 py-8 text-center text-[11px] font-terminal text-term-dim">
                  <Activity size={20} className="mx-auto mb-2 opacity-40" />
                  {isConnected
                    ? 'awaiting events… (new events will appear here)'
                    : 'disconnected — waiting for realtime service…'}
                  <span className="blink-cursor ml-1" />
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {filteredEvents.map((ev) => (
                    <EventRow
                      key={ev.id}
                      event={ev}
                      isNew={newIds.has(ev.id)}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Stats sidebar */}
          <StatsPanel events={allEvents} />
        </div>
      </div>
    </div>
  )
}
