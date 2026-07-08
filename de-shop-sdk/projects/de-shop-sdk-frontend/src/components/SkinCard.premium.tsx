import type { Asset } from '../sdk/DeShopSDK'
import { normalizeRarity } from '../sdk/DeShopSDK'
import { motion } from 'framer-motion'
import { Zap, ShoppingBag, ArrowUpFromLine, Cloud } from 'lucide-react'

// Minecraft ore theme rarity colors
const RARITY_COLORS: Record<string, { bg: string; border: string; glow: string; text: string; badge: string }> = {
  common:    { bg: 'rgba(212,212,212,0.06)', border: 'rgba(160,160,160,0.3)', glow: 'rgba(212,212,212,0.12)', text: '#D4D4D4', badge: '#A0A0A0' },
  rare:      { bg: 'rgba(74,237,217,0.06)', border: 'rgba(74,237,217,0.3)', glow: 'rgba(74,237,217,0.12)', text: '#4AEDD9', badge: '#2AB5A2' },
  epic:      { bg: 'rgba(168,85,247,0.06)', border: 'rgba(168,85,247,0.3)', glow: 'rgba(168,85,247,0.12)', text: '#c084fc', badge: '#a855f7' },
  legendary: { bg: 'rgba(255,215,0,0.06)', border: 'rgba(255,215,0,0.3)', glow: 'rgba(255,215,0,0.12)', text: '#FFD700', badge: '#DAA520' },
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
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        '--rarity-color': colors.text,
      } as React.CSSProperties}
    >
      {/* Top Row: Icon + Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', minWidth: 0 }}>
        {/* Icon slot */}
        <div className="skin-card__icon" style={{ borderColor: colors.border }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L13.5 8.5H20L15 12.5L17 19L12 15L7 19L9 12.5L4 8.5H10.5L12 2Z" fill={colors.text} opacity="0.8"/>
          </svg>
        </div>

        {/* Info */}
        <div className="skin-card__info" style={{ flex: 1, minWidth: 0 }}>
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
              <span style={{ color: '#10b981', fontSize: '10px', fontWeight: 600 }}>
                {asset.list_price} μA
              </span>
            )}
            {asset.asa_id && <span className="skin-card__asa">ASA #{asset.asa_id}</span>}
          </div>
        </div>
      </div>

      {/* Bottom Row: Actions */}
      <div className="skin-card__actions" style={{ display: 'flex', gap: '6px', width: '100%', marginTop: '4px' }}>
        {mode === 'inventory' && (
          <>
            <button
              className={`premium-btn premium-btn--xs ${isActive ? 'premium-btn--active' : ''}`}
              style={{ borderColor: colors.border, color: colors.text, flex: 1, justifyContent: 'center' }}
              onClick={() => onEquip(asset)}
            >
              <Zap className="h-3 w-3" />
              {isActive ? 'EQUIPPED' : 'EQUIP'}
            </button>
            {onList && !asset.listed && (
              <button
                className="premium-btn premium-btn--xs premium-btn--cyan"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => onList(asset)}
              >
                <ShoppingBag className="h-3 w-3" />
                LIST
              </button>
            )}
            {onWithdraw && !asset.listed && (
              <button
                className="premium-btn premium-btn--xs"
                style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#00f2fe', flex: 1, justifyContent: 'center' }}
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
            style={{ width: '100%', justifyContent: 'center' }}
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
