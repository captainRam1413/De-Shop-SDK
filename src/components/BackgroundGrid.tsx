'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useDeShopStore } from '@/store/useDeShopStore'

/**
 * BackgroundGrid — a subtle animated grid that pulses briefly when a new
 * realtime event arrives. Purely decorative; pointer-events:none; z-index:-1.
 *
 * The grid is rendered with CSS (background-image of linear-gradients) and
 * toggles a `pulse` class on a wrapper element when the global event count
 * changes (read from <html data-event-count>, updated by the realtime hook).
 *
 * To avoid coupling this component to socket internals, it reads the
 * `status` field from the store and listens to a custom window event
 * `deshop:realtime-event` dispatched by useRealtimeEvents (we'll add this
 * dispatch there). If no events arrive, the grid still has a slow ambient
 * drift animation for atmosphere.
 */
export default function BackgroundGrid() {
  const status = useDeShopStore((s) => s.status)
  const [pulseKey, setPulseKey] = useState(0)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    const onEvent = () => {
      if (!mountedRef.current) return
      setPulseKey((k) => k + 1)
    }
    window.addEventListener('deshop:realtime-event', onEvent as EventListener)
    return () => {
      mountedRef.current = false
      window.removeEventListener('deshop:realtime-event', onEvent as EventListener)
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className="bg-grid-root pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      data-status={status}
    >
      {/* Static grid lines */}
      <div className="bg-grid-layer" />
      {/* Pulse overlay — re-mounts on each pulse to retrigger the CSS animation */}
      <div key={pulseKey} className="bg-grid-pulse" />
      {/* Radial vignette to focus center */}
      <div className="bg-grid-vignette" />
    </div>
  )
}
