'use client'

import { useEffect, useRef } from 'react'
import { useDeShopStore } from '@/store/useDeShopStore'
import { useLivePrices } from '@/hooks/useLivePrices'

/**
 * usePriceAlerts — watches live prices from the realtime socket and fires
 * toast notifications whenever a registered price alert's condition is met.
 *
 * The hook is meant to be mounted once near the root of the app (inside
 * `TerminalLayout`). It is a no-op on the server and degrades gracefully
 * when the realtime feed is offline (alerts simply wait).
 *
 * Behaviour:
 *  - Iterates through `priceAlerts` from the store
 *  - For each *non-triggered* alert, checks the latest price for the asset
 *    from `useLivePrices`
 *  - If condition is satisfied (above / below), calls `markPriceAlertTriggered`
 *    + `addNotification` with a descriptive message
 *  - Uses a ref to keep the previous triggered set so we don't double-fire
 *  - Re-checks every 2 seconds (lightweight)
 */
export function usePriceAlerts() {
  const priceAlerts = useDeShopStore((s) => s.priceAlerts)
  const markPriceAlertTriggered = useDeShopStore((s) => s.markPriceAlertTriggered)
  const addNotification = useDeShopStore((s) => s.addNotification)
  const setActivePage = useDeShopStore((s) => s.setActivePage)

  // Pull the live ticker prices (this opens its own socket subscription
  // via the shared `useRealtimeEvents` hook).
  const { assets: tickerAssets, isConnected } = useLivePrices()

  // Keep the latest prices map in a ref so the interval can read fresh data
  // without re-subscribing on every change.
  const pricesRef = useRef<Record<string, number>>({})
  useEffect(() => {
    const map: Record<string, number> = {}
    for (const a of tickerAssets) {
      map[a.name] = a.price
    }
    pricesRef.current = map
  }, [tickerAssets])

  // Keep latest alerts in a ref so the interval callback always has fresh data
  const alertsRef = useRef(priceAlerts)
  useEffect(() => {
    alertsRef.current = priceAlerts
  }, [priceAlerts])

  // Track which alerts we've already notified for (avoids refiring while
  // waiting for the store update to mark triggered)
  const firedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const checkAlerts = () => {
      if (!isConnected) return
      const prices = pricesRef.current
      const alerts = alertsRef.current
      for (const alert of alerts) {
        if (alert.triggered) continue
        if (firedRef.current.has(alert.id)) continue
        const currentPrice = prices[alert.assetName]
        if (typeof currentPrice !== 'number') continue

        const conditionMet =
          (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
          (alert.condition === 'below' && currentPrice <= alert.targetPrice)

        if (conditionMet) {
          firedRef.current.add(alert.id)
          markPriceAlertTriggered(alert.id, currentPrice)
          const arrow = alert.condition === 'above' ? '▲' : '▼'
          addNotification(
            'warning',
            `PRICE ALERT ${arrow} ${alert.assetName} @ ${currentPrice.toFixed(2)} ALGO (${alert.condition} ${alert.targetPrice})`,
          )
          // Best-effort: jump to marketplace so user can act on it
          // (only if not already there to avoid jarring UX)
          // We don't auto-navigate to keep it non-intrusive; user can click.
          void setActivePage // satisfy linter; not invoking here
        }
      }
    }

    const id = window.setInterval(checkAlerts, 2000)
    // Also check immediately on mount / when alerts change
    checkAlerts()
    return () => window.clearInterval(id)
  }, [isConnected, markPriceAlertTriggered, addNotification, setActivePage])

  // Reset fired set if an alert is removed from the store (allows re-arming
  // by deleting + re-creating)
  useEffect(() => {
    const live = new Set(priceAlerts.map((a) => a.id))
    const fired = firedRef.current
    let changed = false
    for (const id of Array.from(fired)) {
      if (!live.has(id)) {
        fired.delete(id)
        changed = true
      }
    }
    if (changed) {
      firedRef.current = new Set(fired)
    }
  }, [priceAlerts])

  return {
    activeAlerts: priceAlerts.filter((a) => !a.triggered),
    triggeredAlerts: priceAlerts.filter((a) => a.triggered),
    isConnected,
  }
}
