'use client'

/**
 * useLivePrices
 * -------------
 * Wraps `useRealtimeEvents` and maintains a live, simulated price ticker
 * for the marketplace. Prices update from incoming TRADE / LIST events and
 * from periodic small fluctuations (±0.5% every 3 s for visual interest).
 *
 * Also derives:
 *   - topMover: the ticker asset with the biggest absolute % change
 *   - lastTradeByAsset: most recent TRADE price per asset name (from events)
 *
 * Used by:
 *   - src/components/LivePriceTicker.tsx (presentation)
 *   - src/components/pages/MarketplacePage.tsx (heat panel + card live data)
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents'

export interface LiveAsset {
  name: string
  price: number
  prevPrice: number
  lastUpdated: number
}

export interface LastTrade {
  price: number
  time: number
}

/** Seed prices for the ticker — matches the 20 asset names emitted by the
 * realtime service so LIST/TRADE events always find a known baseline. */
export const SEED_PRICES: Record<string, number> = {
  'Neon Blade': 42.5,
  'Cyber Shield': 18.0,
  'Quantum Helm': 22.3,
  'Digital Crown': 50.0,
  'Plasma Rifle': 8.5,
  'Void Cape': 15.8,
  'Iron Gauntlet': 1.2,
  'Shadow Dagger': 6.7,
  'Pixel Potion': 0.5,
  'Titan Armor': 35.0,
  'Storm Ring': 5.2,
  'Byte Staff': 19.9,
  'Chain Mail': 2.0,
  'Data Crystal': 9.8,
  'Flame Scroll': 0.8,
  'Neural Core': 48.0,
  'Phase Dagger': 12.4,
  'Cryo Ring': 14.1,
  'Ghost Skin': 7.8,
  'Obsidian Staff': 28.6,
}

const SEED_NAMES = Object.keys(SEED_PRICES)
const TICKER_SIZE = 10
const MAX_ASSETS = 12

function getInitialAssets(): LiveAsset[] {
  const now = Date.now()
  return SEED_NAMES.slice(0, TICKER_SIZE).map((name) => ({
    name,
    price: SEED_PRICES[name],
    prevPrice: SEED_PRICES[name],
    lastUpdated: now,
  }))
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

export function useLivePrices() {
  const { events, isConnected, stats } = useRealtimeEvents()

  const [assets, setAssets] = useState<LiveAsset[]>(getInitialAssets)
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now())

  // Track which event IDs we've already applied to the price state so we
  // never apply the same event twice (the socket hook already dedupes
  // inside its own state, but this is a defensive guard).
  const processedRef = useRef<Set<string>>(new Set())

  /* ---------------------------------------------------------------- */
  /* Apply incoming marketplace events to the price state              */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (events.length === 0) return
    const unprocessed = events.filter((e) => !processedRef.current.has(e.id))
    if (unprocessed.length === 0) return
    for (const e of unprocessed) processedRef.current.add(e.id)

    setAssets((prev) => {
      const next = [...prev]
      for (const ev of unprocessed) {
        const idx = next.findIndex((a) => a.name === ev.assetName)
        if (ev.type === 'TRADE') {
          const newPrice = ev.amount > 0 ? ev.amount : SEED_PRICES[ev.assetName] ?? 1
          if (idx >= 0) {
            next[idx] = {
              name: next[idx].name,
              price: round3(newPrice),
              prevPrice: next[idx].price,
              lastUpdated: ev.timestamp,
            }
          } else {
            const seed = SEED_PRICES[ev.assetName] ?? newPrice
            next.push({
              name: ev.assetName,
              price: round3(newPrice),
              prevPrice: seed,
              lastUpdated: ev.timestamp,
            })
          }
        } else if (ev.type === 'LIST') {
          // Add the asset to the ticker if not already present
          if (idx < 0) {
            const seed = SEED_PRICES[ev.assetName] ?? ev.amount ?? 1
            const newPrice = ev.amount > 0 ? ev.amount : seed
            next.push({
              name: ev.assetName,
              price: round3(newPrice),
              prevPrice: seed,
              lastUpdated: ev.timestamp,
            })
          }
        } else {
          // MINT / CANCEL / TRANSFER / BRIDGE — apply a small ±1% walk
          if (idx >= 0) {
            const delta = (Math.random() - 0.5) * 0.02
            const np = Math.max(0.01, next[idx].price * (1 + delta))
            next[idx] = {
              ...next[idx],
              prevPrice: next[idx].price,
              price: round3(np),
              lastUpdated: ev.timestamp,
            }
          }
        }
      }
      // Cap the ticker at MAX_ASSETS, keeping the most recently active first
      if (next.length > MAX_ASSETS) {
        next.sort((a, b) => b.lastUpdated - a.lastUpdated)
        return next.slice(0, MAX_ASSETS)
      }
      return next
    })

    setLastUpdate(Date.now())
  }, [events])

  /* ---------------------------------------------------------------- */
  /* Periodic ±0.5% fluctuation every 3 s (visual interest)            */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const interval = setInterval(() => {
      setAssets((prev) =>
        prev.map((a) => {
          const delta = (Math.random() - 0.5) * 0.01 // ±0.5%
          const np = Math.max(0.01, a.price * (1 + delta))
          return {
            ...a,
            prevPrice: a.price,
            price: round3(np),
            lastUpdated: Date.now(),
          }
        }),
      )
      setLastUpdate(Date.now())
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  /* ---------------------------------------------------------------- */
  /* Garbage-collect the processed-event IDs set                       */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (processedRef.current.size > 200) {
      const keep = new Set(events.map((e) => e.id))
      processedRef.current = keep
    }
  }, [events])

  /* ---------------------------------------------------------------- */
  /* Derived: top mover (biggest absolute % change)                    */
  /* ---------------------------------------------------------------- */
  const topMover = useMemo<LiveAsset | null>(() => {
    let best: LiveAsset | null = null
    let bestPct = 0
    for (const a of assets) {
      if (a.prevPrice <= 0) continue
      const pct = Math.abs((a.price - a.prevPrice) / a.prevPrice) * 100
      if (pct > bestPct) {
        bestPct = pct
        best = a
      }
    }
    return best
  }, [assets])

  /* ---------------------------------------------------------------- */
  /* Derived: last trade per asset (newest event wins; events[0]=newest) */
  /* ---------------------------------------------------------------- */
  const lastTradeByAsset = useMemo<Record<string, LastTrade>>(() => {
    const map: Record<string, LastTrade> = {}
    for (const ev of events) {
      if (ev.type !== 'TRADE') continue
      if (map[ev.assetName]) continue
      map[ev.assetName] = { price: ev.amount, time: ev.timestamp }
    }
    return map
  }, [events])

  return {
    assets,
    lastUpdate,
    isConnected,
    stats,
    events,
    topMover,
    lastTradeByAsset,
  }
}
