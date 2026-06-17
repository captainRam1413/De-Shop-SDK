import type { Asset } from '../sdk/DeShopSDK'
import { normalizeRarity } from '../sdk/DeShopSDK'
import { motion } from 'framer-motion'
import { Zap, ShoppingBag, ArrowUpFromLine, Cloud } from 'lucide-react'

// Nexus Forge rarity tier colors
const RARITY_COLORS: Record<string, { bg: string; border: string; glow: string; text: string; badge: string }> = {
  common:    { bg: 'rgba(212,212,212,0.06)', border: 'rgba(160,160,160,0.3)', glow: 'rgba(212,212,212,0.12)', text: '#D4D4D4', badge: '#A0A0A0' },
  rare:      { bg: 'rgba(45, 212, 191,0.06)', border: 'rgba(45, 212, 191,0.3)', glow: 'rgba(45, 212, 191,0.12)', text: '#2DD4BF', badge: '#14B8A6' },
  epic:      { bg: 'rgba(124, 58, 237,0.06)', border: 'rgba(124, 58, 237,0.3)', glow: 'rgba(124, 58, 237,0.12)', text: '#A78BFA', badge: '#7C3AED' },
  legendary: { bg: 'rgba(251, 191, 36,0.06)', border: 'rgba(251, 191, 36,0.3)', glow: 'rgba(251, 191, 36,0.12)', text: '#FBBF24', badge: '#F59E0B' },
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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: 'easeOut' as const }}
      className={`skin-card ${isActive ? 'skin-card--active' : ''}`}
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${colors.bg}, ${colors.glow})`
          : undefined,
        borderColor: isActive ? colors.text : undefined,
        '--rarity-color': colors.text,
      } as React.CSSProperties}
    >
      {/* Icon slot */}
      <div className="skin-card__icon" style={{ borderColor: colors.border }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ imageRendering: 'pixelated' }}>
          <path d="M12 2L13.5 8.5H20L15 12.5L17 19L12 15L7 19L9 12.5L4 8.5H10.5L12 2Z" fill={colors.text} opacity="0.8"/>
        </svg>
      </div>

      {/* Info */}
      <div className="skin-card__info">
        <div className="skin-card__name" style={{ color: colors.text }}>{asset.name}</div>
        <div className="skin-card__meta">
          <span className="premium-badge" style={{
            background: colors.glow,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            fontSize: '7px',
            padding: '1px 5px',
            fontWeight: 700,
            letterSpacing: '0.06em',
          }}>
            {rarity.toUpperCase()}
          </span>
          {asset.list_price && (
            <span style={{ color: 'var(--mc-emerald)', fontSize: '10px', fontWeight: 600 }}>
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
                style={{ background: '#1A1A1A', borderColor: '#555 #222 #222 #555', color: 'var(--mc-diamond)' }}
                onClick={() => onWithdraw(asset)}
                title="Withdraw to Steam Portal"
              >
                <Cloud className="h-3 w-3" />
                PORTAL
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
            TRADE {asset.list_price} μA
          </button>
        )}
      </div>
    </motion.div>
  )
}
