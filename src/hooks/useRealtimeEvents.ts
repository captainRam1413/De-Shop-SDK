'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type MarketEventType = 'MINT' | 'TRADE' | 'LIST' | 'CANCEL' | 'TRANSFER' | 'BRIDGE'
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface MarketEvent {
  id: string
  type: MarketEventType
  assetName: string
  assetId: number
  rarity: Rarity
  amount: number
  from: string
  to: string
  timestamp: number
  txHash: string
}

export interface LiveStats {
  onlineClients: number
  eventsPerMinute: number
  totalEvents: number
  volume24h: number
  activeWallets: number
  gasPrice: number
}

export interface RealtimeState {
  events: MarketEvent[]
  isConnected: boolean
  stats: LiveStats | null
  /** Emit a client-triggered event to all OTHER connected dashboards. */
  broadcastEvent: (event: Partial<MarketEvent>) => void
  /** Manually request fresh stats from the server. */
  requestStats: () => void
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

const MAX_EVENTS = 50

export function useRealtimeEvents(): RealtimeState {
  const [events, setEvents] = useState<MarketEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [stats, setStats] = useState<LiveStats | null>(null)

  // Hold the socket in a ref so re-renders don't recreate it.
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // CRITICAL: connect via Caddy gateway using XTransformPort=3003.
    // Never use http://localhost:3003 directly.
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      // Subscribe to the marketplace channel
      socket.emit('subscribe', { channel: 'marketplace-events' })
      // Request fresh stats immediately on connect
      socket.emit('request-stats', undefined, (s: LiveStats) => {
        if (s) setStats(s)
      })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('connect_error', () => {
      setIsConnected(false)
    })

    socket.on('welcome', (payload: { message: string; serverTime: number; onlineClients: number }) => {
      // Optional: you could surface this in the UI; for now just log.
      console.log('[realtime] welcome:', payload)
    })

    socket.on('marketplace-event', (event: MarketEvent) => {
      if (!event || !event.id) return
      setEvents((prev) => {
        const next = [event, ...prev]
        // Keep only the most recent MAX_EVENTS
        return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next
      })
      // Notify any listeners (e.g. BackgroundGrid) that a new event arrived.
      try {
        window.dispatchEvent(new CustomEvent('deshop:realtime-event', { detail: { event } }))
      } catch {
        // ignore — window may not be available during SSR
      }
    })

    socket.on('stats', (s: LiveStats) => {
      if (s) setStats(s)
    })

    socket.on('subscribed', (payload: { ok: boolean; channel: string }) => {
      console.log('[realtime] subscribed:', payload)
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  /* ---------------------------------------------------------------- */
  /* Imperative actions                                                */
  /* ---------------------------------------------------------------- */

  const broadcastEvent = useCallback((event: Partial<MarketEvent>) => {
    const socket = socketRef.current
    if (!socket || !socket.connected) return
    socket.emit('broadcast-event', event, (res: { ok: boolean; event?: MarketEvent }) => {
      if (res?.ok && res.event) {
        // Echo the broadcasted event back to the local list as well so the
        // originating client immediately sees what it just published.
        setEvents((prev) => {
          const next = [res.event as MarketEvent, ...prev]
          return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next
        })
      }
    })
  }, [])

  const requestStats = useCallback(() => {
    const socket = socketRef.current
    if (!socket || !socket.connected) return
    socket.emit('request-stats', undefined, (s: LiveStats) => {
      if (s) setStats(s)
    })
  }, [])

  return {
    events,
    isConnected,
    stats,
    broadcastEvent,
    requestStats,
  }
}
