import type { Asset } from '../sdk/DeShopSDK'
import { normalizeRarity } from '../sdk/DeShopSDK'
import { motion } from 'framer-motion'
import { Zap, ShoppingBag, ArrowUpFromLine, Cloud } from 'lucide-react'

const RARITY_COLORS: Record<string, { bg: string; border: string; glow: string; text: string; badge: string }> = {
  common:    { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', glow: 'rgba(107,114,128,0.15)', text: '#9ca3af', badge: '#6b7280' },
  rare:      { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)', glow: 'rgba(59,130,246,0.15)', text: '#60a5fa', badge: '#3b82f6' },
  epic:      { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.3)', glow: 'rgba(168,85,247,0.15)', text: '#c084fc', badge: '#a855f7' },
  legendary: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', glow: 'rgba(245,158,11,0.15)', text: '#fbbf24', badge: '#f59e0b' },
}

type SkinCardProps = {
  asset: Asset
  isActive: boolean
  onEquip: (asset: Asset) => void
  onList?: (asset: Asset) => void
  onBuy?: (asset: Asset) => void
  onWithdraw?: (asset: Asset) => void
  mode: 'inventory' | 'market'
}

export default function SkinCard({ asset, isActive, onEquip, onList, onBuy, onWithdraw, mode }: SkinCardProps) {
  const rarity = normalizeRarity(asset.rarity ?? 'common')
  const colors = RARITY_COLORS[rarity] ?? RARITY_COLORS.common

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`premium-card skin-card ${isActive ? 'skin-card--active' : ''}`}
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${colors.bg}, ${colors.glow})`
          : undefined,
        borderColor: isActive ? colors.text : colors.border,
        boxShadow: isActive ? `0 0 20px ${colors.glow}, inset 0 0 30px ${colors.glow}` : undefined,
        '--rarity-color': colors.text,
      } as React.CSSProperties}
    >
      {/* Rarity shimmer bar */}
      <div className="skin-card__shimmer" style={{ background: `linear-gradient(90deg, transparent, ${colors.glow}, transparent)` }} />

      {/* Icon with rarity glow */}
      <div className="skin-card__icon" style={{ borderColor: colors.border, boxShadow: isActive ? `0 0 12px ${colors.glow}` : 'none' }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M14 2L16 10H24L18 15L20 23L14 18L8 23L10 15L4 10H12L14 2Z" fill={colors.text} opacity="0.8"/>
        </svg>
      </div>

      {/* Info */}
      <div className="skin-card__info">
        <div className="skin-card__name" style={{ color: colors.text }}>{asset.name}</div>
        <div className="skin-card__meta">
          <span className="premium-badge premium-badge--rarity" style={{ 
            background: colors.glow, 
            color: colors.text,
            fontSize: '9px',
            padding: '1px 6px',
            borderRadius: '3px',
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}>
            {rarity.toUpperCase()}
          </span>
          {asset.list_price && (
            <span style={{ color: 'var(--cyan-bright)', fontSize: '10px', fontWeight: 600 }}>
              {asset.list_price} μA
            </span>
          )}
          {asset.asa_id && <span className="skin-card__asa">ASA #{asset.asa_id}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="skin-card__actions">
        {mode === 'inventory' && (
          <>
            <button
              className={`premium-btn premium-btn--xs ${isActive ? 'premium-btn--active' : ''}`}
              style={{ borderColor: colors.border, color: colors.text }}
              onClick={() => onEquip(asset)}
            >
              <Zap className="h-3 w-3" />
              {isActive ? 'EQUIPPED' : 'EQUIP'}
            </button>
            {onList && !asset.listed && (
              <button
                className="premium-btn premium-btn--xs premium-btn--cyan"
                onClick={() => onList(asset)}
              >
                <ShoppingBag className="h-3 w-3" />
                LIST
              </button>
            )}
            {onWithdraw && !asset.listed && (
              <button
                className="premium-btn premium-btn--xs"
                style={{ background: 'rgba(23,26,33,0.6)', borderColor: '#171a21', color: 'white' }}
                onClick={() => onWithdraw(asset)}
                title="Withdraw to Steam"
              >
                <Cloud className="h-3 w-3" />
                STEAM
              </button>
            )}
          </>
        )}
        {mode === 'market' && (
          <button
            className="premium-btn premium-btn--xs premium-btn--green"
            onClick={() => onBuy?.(asset)}
          >
            <ArrowUpFromLine className="h-3 w-3" />
            BUY {asset.list_price} μA
          </button>
        )}
      </div>
    </motion.div>
  )
}
