'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  GitCompareArrows,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
  Trash2,
  Sparkles,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useDeShopStore } from '@/store/useDeShopStore'

/* ===== Types & helpers (mirror MarketplacePage shapes) ===== */

type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary'

interface CompareAsset {
  id: string
  name: string
  emoji: string
  rarity: Rarity
  price: number
  confidence: number
  seller: string
  description: string
  listedAt: string
  priceHistory: { day: string; price: number }[]
}

const RARITY_COLOR: Record<Rarity, string> = {
  Common: '#888888',
  Rare: '#00D4FF',
  Epic: '#FF00FF',
  Legendary: '#FFB800',
}

const RARITY_WEIGHT: Record<Rarity, number> = {
  Common: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
}

function getCheapestPrice(assets: CompareAsset[]): number | null {
  if (assets.length === 0) return null
  return Math.min(...assets.map((a) => a.price))
}

function getBestConfidence(assets: CompareAsset[]): number | null {
  if (assets.length === 0) return null
  return Math.max(...assets.map((a) => a.confidence))
}

function getBestRarity(assets: CompareAsset[]): Rarity | null {
  if (assets.length === 0) return null
  return assets.reduce<Rarity>(
    (best, a) => (RARITY_WEIGHT[a.rarity] > RARITY_WEIGHT[best] ? a.rarity : best),
    assets[0].rarity,
  )
}

function getBestTrend(assets: CompareAsset[]): { name: string; delta: number } | null {
  if (assets.length === 0) return null
  let best: { name: string; delta: number } | null = null
  for (const a of assets) {
    if (a.priceHistory.length < 2) continue
    const first = a.priceHistory[0].price
    const last = a.priceHistory[a.priceHistory.length - 1].price
    const delta = ((last - first) / (first || 1)) * 100
    if (!best || delta > best.delta) {
      best = { name: a.name, delta }
    }
  }
  return best
}

/* ===== Tooltip for chart ===== */

function CompareChartTooltip({ active, payload, label, color }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  color: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#2D2D2D] border border-[#444] p-1.5 text-[10px] font-terminal">
      <div className="text-term-dim">{label}</div>
      <div style={{ color }}>◆ {payload[0].value.toFixed(2)}</div>
    </div>
  )
}

/* ===== Main drawer ===== */

export default function AssetCompareDrawer({
  assets,
}: {
  assets: CompareAsset[]
}) {
  const compareIds = useDeShopStore((s) => s.compareIds)
  const compareDrawerOpen = useDeShopStore((s) => s.compareDrawerOpen)
  const setCompareDrawerOpen = useDeShopStore((s) => s.setCompareDrawerOpen)
  const toggleCompare = useDeShopStore((s) => s.toggleCompare)
  const clearCompare = useDeShopStore((s) => s.clearCompare)
  const addNotification = useDeShopStore((s) => s.addNotification)

  // Filter assets to only those in compareIds (preserve order of compareIds)
  const comparedAssets = useMemo(() => {
    return compareIds
      .map((id) => assets.find((a) => a.id === id))
      .filter((a): a is CompareAsset => Boolean(a))
  }, [compareIds, assets])

  const cheapestPrice = getCheapestPrice(comparedAssets)
  const bestConfidence = getBestConfidence(comparedAssets)
  const bestRarity = getBestRarity(comparedAssets)
  const bestTrend = getBestTrend(comparedAssets)

  const handleRemove = (id: string) => {
    toggleCompare(id)
    addNotification('info', 'Removed from comparison')
  }

  const handleClose = () => setCompareDrawerOpen(false)

  const handleClearAll = () => {
    clearCompare()
    addNotification('info', 'Comparison cleared')
  }

  return (
    <AnimatePresence>
      {compareDrawerOpen && comparedAssets.length > 0 && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="fixed top-0 right-0 z-40 h-screen w-full sm:w-[640px] max-w-full bg-[#1A1A1A] border-l-2 border-term-green/40 shadow-2xl flex flex-col"
          role="dialog"
          aria-label="Asset comparison drawer"
        >
          {/* Drawer header */}
          <div className="terminal-card-header border-b border-[#333] bg-[#252525]">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="terminal-dot terminal-dot-red" />
              <span className="terminal-dot terminal-dot-yellow" />
              <span className="terminal-dot terminal-dot-green" />
            </div>
            <GitCompareArrows className="w-3.5 h-3.5 text-term-green ml-2" />
            <span className="terminal-title text-[11px]">compare.diff</span>
            <span className="text-[10px] text-term-dim font-terminal ml-2">
              {comparedAssets.length}/3 selected
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleClearAll}
                className="text-[10px] font-terminal text-term-dim hover:text-term-red transition-colors flex items-center gap-1"
                title="Clear all"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">clear</span>
              </button>
              <button
                onClick={handleClose}
                className="text-term-dim hover:text-term-red transition-colors"
                aria-label="Close compare drawer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer body */}
          <div className="flex-1 overflow-y-auto terminal-scroll">
            {/* Hint banner */}
            <div className="px-4 py-2 bg-[#1E1E1E] border-b border-[#333] text-[10px] font-terminal text-term-dim flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-term-amber" />
              <span>
                Up to 3 assets compared side-by-side. Winners are highlighted with{' '}
                <Trophy className="inline w-2.5 h-2.5 text-term-amber" />
                <span className="text-term-amber"> BEST</span> badge.
              </span>
            </div>

            {/* Asset columns */}
            <div
              className="grid gap-px bg-[#333]"
              style={{
                gridTemplateColumns: `repeat(${Math.max(comparedAssets.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {comparedAssets.map((asset) => {
                const config = RARITY_COLOR[asset.rarity]
                const isCheapest = cheapestPrice !== null && asset.price === cheapestPrice
                const isBestConfidence = bestConfidence !== null && asset.confidence === bestConfidence
                const isBestRarity = bestRarity !== null && asset.rarity === bestRarity
                const isBestTrend =
                  bestTrend !== null && bestTrend.name === asset.name && bestTrend.delta > 0
                const trendUp = asset.priceHistory.length >= 2 &&
                  asset.priceHistory[asset.priceHistory.length - 1].price >= asset.priceHistory[0].price
                const trendDelta = asset.priceHistory.length >= 2
                  ? ((asset.priceHistory[asset.priceHistory.length - 1].price - asset.priceHistory[0].price) /
                      (asset.priceHistory[0].price || 1)) * 100
                  : 0

                return (
                  <div
                    key={asset.id}
                    className="bg-[#1A1A1A] flex flex-col"
                    style={{ borderTop: `2px solid ${config}` }}
                  >
                    {/* Header */}
                    <div className="p-3 border-b border-[#333]">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-[9px] font-terminal px-1 py-0.5 border"
                          style={{ color: config, borderColor: config + '66' }}
                        >
                          {asset.id}
                        </span>
                        <button
                          onClick={() => handleRemove(asset.id)}
                          className="text-term-dim hover:text-term-red transition-colors"
                          aria-label={`Remove ${asset.name}`}
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-3xl text-center my-2">{asset.emoji}</div>
                      <div
                        className="text-sm font-terminal font-bold text-center"
                        style={{ color: config }}
                      >
                        {asset.name}
                      </div>
                      <div className="text-[9px] text-term-dim font-terminal text-center mt-0.5">
                        {asset.rarity.toUpperCase()}
                      </div>
                    </div>

                    {/* Stats rows */}
                    <div className="flex-1">
                      {/* Price */}
                      <div className="px-3 py-2 border-b border-[#333]">
                        <div className="text-[9px] text-term-dim font-terminal mb-0.5">PRICE</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-term-amber text-sm font-terminal font-bold">
                            ◆ {asset.price}
                          </span>
                          {isCheapest && (
                            <span className="text-[8px] font-terminal px-1 py-0.5 bg-term-amber/15 text-term-amber border border-term-amber/40 flex items-center gap-0.5">
                              <Trophy className="w-2 h-2" />BEST
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Confidence */}
                      <div className="px-3 py-2 border-b border-[#333]">
                        <div className="text-[9px] text-term-dim font-terminal mb-0.5">CONFIDENCE</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-term-green text-sm font-terminal font-bold">
                            {asset.confidence}%
                          </span>
                          {isBestConfidence && (
                            <span className="text-[8px] font-terminal px-1 py-0.5 bg-term-green/15 text-term-green border border-term-green/40 flex items-center gap-0.5">
                              <Trophy className="w-2 h-2" />BEST
                            </span>
                          )}
                        </div>
                        <div className="mt-1 h-1 bg-[#2D2D2D] border border-[#444] overflow-hidden">
                          <div
                            className="h-full bg-term-green"
                            style={{ width: `${asset.confidence}%` }}
                          />
                        </div>
                      </div>

                      {/* Rarity score */}
                      <div className="px-3 py-2 border-b border-[#333]">
                        <div className="text-[9px] text-term-dim font-terminal mb-0.5">RARITY RANK</div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-sm font-terminal font-bold"
                            style={{ color: config }}
                          >
                            {asset.rarity}
                          </span>
                          {isBestRarity && (
                            <span
                              className="text-[8px] font-terminal px-1 py-0.5 border flex items-center gap-0.5"
                              style={{
                                color: config,
                                borderColor: config + '66',
                                backgroundColor: config + '15',
                              }}
                            >
                              <Trophy className="w-2 h-2" />BEST
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-term-dim font-terminal mt-0.5">
                          weight {RARITY_WEIGHT[asset.rarity]}/4
                        </div>
                      </div>

                      {/* 7-day trend */}
                      <div className="px-3 py-2 border-b border-[#333]">
                        <div className="text-[9px] text-term-dim font-terminal mb-0.5">7D TREND</div>
                        <div className="flex items-center gap-1.5">
                          {trendUp ? (
                            <ArrowUp className="w-3 h-3 text-term-green" />
                          ) : trendDelta === 0 ? (
                            <Minus className="w-3 h-3 text-term-dim" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-term-red" />
                          )}
                          <span
                            className={`text-sm font-terminal font-bold ${
                              trendUp ? 'text-term-green' : trendDelta === 0 ? 'text-term-dim' : 'text-term-red'
                            }`}
                          >
                            {trendDelta >= 0 ? '+' : ''}
                            {trendDelta.toFixed(1)}%
                          </span>
                          {isBestTrend && (
                            <span className="text-[8px] font-terminal px-1 py-0.5 bg-term-green/15 text-term-green border border-term-green/40 flex items-center gap-0.5">
                              <Trophy className="w-2 h-2" />BEST
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mini chart */}
                      <div className="px-2 py-2 border-b border-[#333]">
                        <div className="h-16">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={asset.priceHistory} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                              <defs>
                                <linearGradient id={`compareGrad-${asset.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={config} stopOpacity={0.4} />
                                  <stop offset="100%" stopColor={config} stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="day" hide />
                              <YAxis hide domain={['dataMin', 'dataMax']} />
                              <Tooltip
                                content={<CompareChartTooltip color={config} />}
                                cursor={{ stroke: config, strokeWidth: 1, strokeDasharray: '3 3' }}
                              />
                              <Area
                                type="monotone"
                                dataKey="price"
                                stroke={config}
                                strokeWidth={1.5}
                                fill={`url(#compareGrad-${asset.id})`}
                                isAnimationActive={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Seller */}
                      <div className="px-3 py-2">
                        <div className="text-[9px] text-term-dim font-terminal mb-0.5">SELLER</div>
                        <div className="text-term-cyan text-[10px] font-terminal truncate">
                          {asset.seller}
                        </div>
                        <div className="text-[9px] text-term-dim font-terminal mt-1">
                          listed {asset.listedAt}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary footer */}
            <div className="px-4 py-3 border-t border-[#333] bg-[#1E1E1E]">
              <div className="text-[10px] text-term-dim font-terminal mb-2">
                {'// verdict'}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-terminal">
                {cheapestPrice !== null && (
                  <div className="border border-term-amber/30 bg-term-amber/5 px-2 py-1.5">
                    <div className="text-term-dim text-[9px]">CHEAPEST</div>
                    <div className="text-term-amber">◆ {cheapestPrice} ALGO</div>
                  </div>
                )}
                {bestConfidence !== null && (
                  <div className="border border-term-green/30 bg-term-green/5 px-2 py-1.5">
                    <div className="text-term-dim text-[9px]">HIGHEST CONFIDENCE</div>
                    <div className="text-term-green">{bestConfidence}%</div>
                  </div>
                )}
                {bestRarity !== null && (
                  <div className="border px-2 py-1.5" style={{ borderColor: RARITY_COLOR[bestRarity] + '66', backgroundColor: RARITY_COLOR[bestRarity] + '15' }}>
                    <div className="text-term-dim text-[9px]">RAREST</div>
                    <div style={{ color: RARITY_COLOR[bestRarity] }}>{bestRarity}</div>
                  </div>
                )}
                {bestTrend !== null && (
                  <div className="border border-term-green/30 bg-term-green/5 px-2 py-1.5">
                    <div className="text-term-dim text-[9px]">BEST TREND</div>
                    <div className="text-term-green truncate">{bestTrend.name} (+{bestTrend.delta.toFixed(1)}%)</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Drawer footer */}
          <div className="px-4 py-2 border-t border-[#333] bg-[#252525] flex items-center justify-between text-[10px] font-terminal text-term-dim">
            <span>
              <span className="text-term-green">$</span> diff --assets {comparedAssets.map((a) => a.id).join(' ')}
            </span>
            <span className="hidden sm:inline">press Esc to close</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
