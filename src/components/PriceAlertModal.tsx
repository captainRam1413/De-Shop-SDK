'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, BellRing, TrendingUp, TrendingDown, Loader2, Trash2 } from 'lucide-react'
import { useDeShopStore, type PriceAlert } from '@/store/useDeShopStore'

/**
 * PriceAlertModal — controlled by `priceAlertAsset` in the global store.
 * When `priceAlertAsset` is set, the modal opens with the target asset
 * pre-filled. User can pick above/below, enter a target price, and submit.
 * Also shows the list of existing alerts with delete buttons.
 */
export default function PriceAlertModal() {
  const target = useDeShopStore((s) => s.priceAlertAsset)
  const setTarget = useDeShopStore((s) => s.setPriceAlertAsset)
  const alerts = useDeShopStore((s) => s.priceAlerts)
  const removePriceAlert = useDeShopStore((s) => s.removePriceAlert)
  const clearPriceAlerts = useDeShopStore((s) => s.clearPriceAlerts)

  const close = () => setTarget(null)

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="terminal-card w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Chrome header */}
            <div className="terminal-card-header flex-shrink-0">
              <span className="terminal-dot terminal-dot-red" />
              <span className="terminal-dot terminal-dot-yellow" />
              <span className="terminal-dot terminal-dot-green" />
              <BellRing className="w-3.5 h-3.5 text-term-amber ml-2" />
              <span className="terminal-title">price_alert.sh</span>
              <button
                className="ml-auto text-term-dim hover:text-term-red transition-colors"
                onClick={close}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Body — keyed by target so the form state resets cleanly per asset */}
            <PriceAlertModalBody
              key={`${target.name}-${target.id ?? 'no-id'}`}
              target={target}
              alerts={alerts}
              onClose={close}
              onRemoveAlert={removePriceAlert}
              onClearAlerts={clearPriceAlerts}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface PriceAlertModalBodyProps {
  target: { name: string; id?: string; price: number }
  alerts: PriceAlert[]
  onClose: () => void
  onRemoveAlert: (id: string) => void
  onClearAlerts: () => void
}

function PriceAlertModalBody({
  target,
  alerts,
  onClose,
  onRemoveAlert,
  onClearAlerts,
}: PriceAlertModalBodyProps) {
  const addPriceAlert = useDeShopStore((s) => s.addPriceAlert)
  const addNotification = useDeShopStore((s) => s.addNotification)

  // Initialize from target via lazy useState initializer — since this
  // component is keyed by target, it remounts cleanly when target changes.
  const [condition, setCondition] = useState<'above' | 'below'>('above')
  const [targetPrice, setTargetPrice] = useState(() =>
    (target.price * 1.1).toFixed(2),
  )
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const tp = parseFloat(targetPrice)
    if (!Number.isFinite(tp) || tp <= 0) {
      addNotification('error', 'Invalid target price')
      return
    }
    setSubmitting(true)
    addPriceAlert({
      assetName: target.name,
      assetId: target.id,
      condition,
      targetPrice: tp,
    })
    addNotification('success', `Alert set: ${target.name} ${condition} ${tp} ALGO`)
    setTimeout(() => {
      setSubmitting(false)
      onClose()
    }, 300)
  }

  return (
    <div className="bg-[#1E1E1E] p-5 overflow-y-auto terminal-scroll">
      {/* Prompt line */}
      <div className="flex items-center gap-2 mb-4 text-xs font-terminal">
        <span className="prompt-prefix text-term-green">$</span>
        <span className="text-term-cyan">alert</span>
        <span className="text-term-text">--create</span>
        <span className="text-term-dim">--asset</span>
        <span className="text-term-amber">{target.name}</span>
        <span className="blink-cursor" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Asset info */}
        <div className="terminal-card border border-[#333] bg-[#252525] p-3">
          <div className="text-term-dim text-[10px] font-terminal mb-1">TARGET ASSET</div>
          <div className="flex items-center justify-between">
            <span className="text-term-green font-terminal font-bold text-sm">
              {target.name}
            </span>
            <span className="text-term-amber font-terminal text-sm">
              ◆ {target.price} ALGO
            </span>
          </div>
        </div>

        {/* Condition selector */}
        <div>
          <label className="block text-term-dim text-[10px] font-terminal mb-2">
            CONDITION
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCondition('above')}
              className={`flex items-center gap-2 px-3 py-2 border text-xs font-terminal transition-all ${
                condition === 'above'
                  ? 'border-term-green bg-term-green/10 text-term-green glow-green'
                  : 'border-[#444] text-term-dim hover:text-term-green hover:border-term-green/40'
              }`}
            >
              <TrendingUp size={14} />
              <span>price rises above</span>
            </button>
            <button
              type="button"
              onClick={() => setCondition('below')}
              className={`flex items-center gap-2 px-3 py-2 border text-xs font-terminal transition-all ${
                condition === 'below'
                  ? 'border-term-red bg-term-red/10 text-term-red'
                  : 'border-[#444] text-term-dim hover:text-term-red hover:border-term-red/40'
              }`}
            >
              <TrendingDown size={14} />
              <span>price drops below</span>
            </button>
          </div>
        </div>

        {/* Target price input */}
        <div>
          <label
            htmlFor="alert-target-price"
            className="block text-term-dim text-[10px] font-terminal mb-2"
          >
            TARGET PRICE (ALGO)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-term-green text-sm font-terminal">
              ◆
            </span>
            <input
              id="alert-target-price"
              type="number"
              step="0.01"
              min="0"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="0.00"
              className="terminal-input pl-8"
              autoFocus
            />
          </div>
          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              { label: '+5%', mult: 1.05 },
              { label: '+10%', mult: 1.1 },
              { label: '+25%', mult: 1.25 },
              { label: '-5%', mult: 0.95 },
              { label: '-10%', mult: 0.9 },
              { label: '-25%', mult: 0.75 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  setTargetPrice((target.price * preset.mult).toFixed(2))
                }
                className={`text-[10px] font-terminal px-2 py-0.5 border transition-colors ${
                  preset.mult > 1
                    ? 'border-term-green/40 text-term-green hover:bg-term-green/10'
                    : 'border-term-red/40 text-term-red hover:bg-term-red/10'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="terminal-btn terminal-btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Bell size={12} />
            )}
            <span>Arm Alert</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="terminal-btn text-term-dim px-4"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Existing alerts */}
      {alerts.length > 0 && (
        <div className="mt-6 pt-4 border-t border-[#333]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-term-dim text-[10px] font-terminal">──</span>
              <span className="text-term-amber text-xs font-terminal font-bold uppercase tracking-wider">
                Active Alerts ({alerts.length})
              </span>
            </div>
            <button
              onClick={() => {
                onClearAlerts()
                addNotification('info', 'All price alerts cleared')
              }}
              className="text-[10px] font-terminal text-term-dim hover:text-term-red transition-colors flex items-center gap-1"
            >
              <Trash2 size={10} /> clear all
            </button>
          </div>
          <ul className="space-y-1.5 max-h-48 overflow-y-auto terminal-scroll">
            {alerts.map((a: PriceAlert) => (
              <li
                key={a.id}
                className={`flex items-center justify-between gap-2 text-[11px] font-terminal px-2 py-1.5 border ${
                  a.triggered
                    ? 'border-term-amber/30 bg-term-amber/5 opacity-60'
                    : 'border-[#333] bg-[#252525]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={
                      a.condition === 'above'
                        ? 'text-term-green'
                        : 'text-term-red'
                    }
                  >
                    {a.condition === 'above' ? '▲' : '▼'}
                  </span>
                  <span className="text-term-text truncate">{a.assetName}</span>
                  <span className="text-term-dim">{a.condition}</span>
                  <span className="text-term-amber">{a.targetPrice}</span>
                  {a.triggered && (
                    <span className="text-term-amber text-[9px] border border-term-amber/40 px-1">
                      TRIGGERED
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onRemoveAlert(a.id)}
                  className="text-term-dim hover:text-term-red transition-colors flex-shrink-0"
                  aria-label="Remove alert"
                >
                  <X size={11} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
