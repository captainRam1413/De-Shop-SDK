'use client'

/**
 * LivePriceTicker
 * ---------------
 * Horizontal scrolling marquee showing live asset prices, like a stock
 * ticker. Purely presentational — the price state is owned by the parent
 * via the `useLivePrices` hook and passed in as props.
 *
 * Features:
 *   - 8–12 assets scrolling in a 60 s CSS-animation loop (pause on hover)
 *   - Each entry: NAME ▲/▼ PRICE_ALGO (+/-X.XX%)
 *   - Green up / red down / amber stable
 *   - "LIVE" indicator at the start with pulsing green dot
 *   - Timestamp of last update at the end
 *   - Click an asset → calls onSelectAsset(name) to filter marketplace
 *   - "OFFLINE" state shown when socket is disconnected
 */

import { useMemo } from 'react'
import type { LiveAsset } from '@/hooks/useLivePrices'

export interface LivePriceTickerProps {
  assets: LiveAsset[]
  isConnected: boolean
  lastUpdate: number
  onSelectAsset?: (name: string) => void
}

function formatTime(ts: number): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return '--:--:--'
  }
}

interface ItemProps {
  asset: LiveAsset
  onSelect?: (name: string) => void
}

function TickerItem({ asset, onSelect }: ItemProps) {
  const change = asset.price - asset.prevPrice
  const pct = asset.prevPrice > 0 ? (change / asset.prevPrice) * 100 : 0
  const isUp = change > 0.0001
  const isDown = change < -0.0001
  const color = isUp ? 'text-term-green' : isDown ? 'text-term-red' : 'text-term-amber'
  const arrow = isUp ? '▲' : isDown ? '▼' : '■'

  return (
    <button
      type="button"
      onClick={() => onSelect?.(asset.name)}
      className="ticker-item"
      title={`Filter marketplace by ${asset.name}`}
      aria-label={`Filter marketplace by ${asset.name}`}
    >
      <span className="text-term-text text-[11px] font-terminal font-bold">{asset.name}</span>
      <span className={`${color} text-[11px] font-terminal`} aria-hidden="true">{arrow}</span>
      <span className={`${color} text-[11px] font-terminal tabular-nums`}>{asset.price.toFixed(3)}</span>
      <span className="text-term-dim text-[10px] font-terminal">ALGO</span>
      <span className={`${color} text-[10px] font-terminal tabular-nums`}>
        ({isUp ? '+' : ''}
        {pct.toFixed(2)}%)
      </span>
    </button>
  )
}

/**
 * Render a single full pass of the ticker content. The parent renders this
 * twice (keyed) so the CSS `translateX(0 → -50%)` animation loops seamlessly.
 */
function TickerPass({
  assets,
  isConnected,
  timeStr,
  onSelectAsset,
  passKey,
}: {
  assets: LiveAsset[]
  isConnected: boolean
  timeStr: string
  onSelectAsset?: (name: string) => void
  passKey: string
}) {
  return (
    <div className="ticker-content" aria-hidden={passKey === 'b'}>
      <div className="ticker-item ticker-live" key={`${passKey}-live`}>
        <span
          className={`status-dot ${isConnected ? 'status-dot-online' : 'status-dot-offline'}`}
        />
        <span
          className={`text-[11px] font-terminal font-bold ${
            isConnected ? 'text-term-green' : 'text-term-red'
          }`}
        >
          {isConnected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
      {assets.map((a, i) => (
        <TickerItem
          key={`${passKey}-${a.name}-${i}`}
          asset={a}
          onSelect={onSelectAsset}
        />
      ))}
      <div className="ticker-item ticker-timestamp" key={`${passKey}-ts`}>
        <span className="text-term-dim text-[10px] font-terminal">last update:</span>
        <span className="text-term-cyan text-[10px] font-terminal tabular-nums">{timeStr}</span>
      </div>
    </div>
  )
}

export default function LivePriceTicker({
  assets,
  isConnected,
  lastUpdate,
  onSelectAsset,
}: LivePriceTickerProps) {
  const timeStr = useMemo(() => formatTime(lastUpdate), [lastUpdate])

  // Render the content twice for a seamless marquee loop.
  // The CSS animation translates from 0 → -50%, so when the second pass
  // reaches the start position it looks identical to the first pass.
  return (
    <div className="terminal-card">
      <div className="terminal-card-header">
        <span
          className={`status-dot ${isConnected ? 'status-dot-online' : 'status-dot-offline'}`}
        />
        <span className="terminal-title">live_prices.ticker</span>
        <span className="text-term-dim text-[10px] font-terminal ml-2 hidden sm:inline">
          {'// realtime market feed'}
        </span>
        <span
          className={`ml-auto text-[10px] font-terminal font-bold ${
            isConnected ? 'text-term-green' : 'text-term-red'
          }`}
        >
          {isConnected ? '● LIVE' : '● OFFLINE'}
        </span>
      </div>
      <div className="ticker-track-wrapper group">
        <div className="ticker-track">
          <TickerPass
            passKey="a"
            assets={assets}
            isConnected={isConnected}
            timeStr={timeStr}
            onSelectAsset={onSelectAsset}
          />
          <TickerPass
            passKey="b"
            assets={assets}
            isConnected={isConnected}
            timeStr={timeStr}
            onSelectAsset={onSelectAsset}
          />
        </div>
        {/* Edge fades for a more polished look */}
        <div className="ticker-fade ticker-fade-left" aria-hidden="true" />
        <div className="ticker-fade ticker-fade-right" aria-hidden="true" />
      </div>
      {/* Screen-reader-only summary so the live data is accessible without
          needing to read the scrolling marquee. */}
      <span className="sr-only">
        {`Live price ticker. ${assets.length} assets shown. ${
          isConnected ? 'Connected.' : 'Offline.'
        } Last updated at ${timeStr}. ${assets
          .map((a) => `${a.name} ${a.price.toFixed(3)} ALGO`)
          .join(', ')}`}
      </span>
    </div>
  )
}
