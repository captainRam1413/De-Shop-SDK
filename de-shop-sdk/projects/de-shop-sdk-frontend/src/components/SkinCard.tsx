import type { Asset } from '../sdk/DeShopSDK'

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
  mode: 'inventory' | 'market'
}

export default function SkinCard({ asset, isActive, onEquip, onList, onBuy, mode }: SkinCardProps) {
  const rarity = asset.rarity?.toLowerCase() ?? 'common'
  const colors = RARITY_COLORS[rarity] ?? RARITY_COLORS.common

  return (
    <div
      className={`skin-card ${isActive ? 'skin-card--active' : ''}`}
      style={{
        background: isActive
          ? `linear-gradient(135deg, ${colors.bg}, ${colors.glow})`
          : colors.bg,
        borderColor: isActive ? colors.text : colors.border,
        boxShadow: isActive ? `0 0 20px ${colors.glow}, inset 0 0 30px ${colors.glow}` : 'none',
      }}
    >
      {/* Rarity shimmer bar */}
      <div className="skin-card__shimmer" style={{ background: `linear-gradient(90deg, transparent, ${colors.glow}, transparent)` }} />

      {/* Icon placeholder */}
      <div className="skin-card__icon" style={{ borderColor: colors.border }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M14 2L16 10H24L18 15L20 23L14 18L8 23L10 15L4 10H12L14 2Z" fill={colors.text} opacity="0.7"/>
        </svg>
      </div>

      <div className="skin-card__info">
        <div className="skin-card__name" style={{ color: colors.text }}>{asset.name}</div>
        <div className="skin-card__meta">
          <span className="skin-card__rarity" style={{ background: colors.glow, color: colors.text }}>
            {rarity.toUpperCase()}
          </span>
          {asset.asa_id && <span className="skin-card__asa">ASA #{asset.asa_id}</span>}
        </div>
      </div>

      <div className="skin-card__actions">
        {mode === 'inventory' && (
          <>
            <button
              className="skin-card__btn skin-card__btn--equip"
              style={{ borderColor: colors.border, color: colors.text }}
              onClick={() => onEquip(asset)}
            >
              {isActive ? '✓ EQUIPPED' : 'EQUIP'}
            </button>
            {onList && !asset.listed && (
              <button
                className="skin-card__btn skin-card__btn--list"
                onClick={() => onList(asset)}
              >
                LIST
              </button>
            )}
          </>
        )}
        {mode === 'market' && (
          <button
            className="skin-card__btn skin-card__btn--buy"
            onClick={() => onBuy?.(asset)}
          >
            BUY {asset.list_price} μA
          </button>
        )}
      </div>
    </div>
  )
}
