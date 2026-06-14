import type { Wallet as WalletType } from '@txnlab/use-wallet-react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wallet } from 'lucide-react'

interface WalletModalProps {
  wallets: WalletType[]
  onClose: () => void
}

export default function WalletModal({ wallets, onClose }: WalletModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        className="premium-modal-overlay"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="premium-modal"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' as const }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              padding: 8,
              background: '#000',
              border: '2px solid',
              borderColor: '#555 #222 #222 #555',
            }}>
              <Wallet className="h-5 w-5" style={{ color: 'var(--mc-emerald)' }} />
            </div>
            <div>
              <h3 style={{
                color: 'var(--mc-emerald)',
                fontFamily: 'var(--font-pixel, "Press Start 2P", monospace)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                margin: 0,
                textShadow: '2px 2px 0px rgba(0,0,0,0.8)',
              }}>
                CONNECT WALLET
              </h3>
              <p style={{
                color: 'var(--mc-text-dim)',
                fontFamily: 'var(--font-body, "VT323", monospace)',
                fontSize: 16,
                margin: '4px 0 0',
              }}>
                Select a provider to bind your Algorand wallet
              </p>
            </div>
          </div>

          {/* Wallet options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {wallets.map((wallet) => (
              <motion.button
                key={wallet.id}
                className="wallet-btn"
                onClick={() => void wallet.connect()}
                whileHover={{ x: 4, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.98 }}
              >
                <img
                  src={wallet.metadata.icon}
                  alt={wallet.metadata.name}
                  style={{ width: 28, height: 28, imageRendering: 'pixelated' }}
                />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--mc-text)', textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}>{wallet.metadata.name}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--mc-text-dim)', marginTop: 2 }}>
                    {wallet.id === 'pera' ? 'Algorand mobile wallet' : 'Defly wallet'}
                  </div>
                </div>
                <span style={{
                  fontFamily: 'var(--font-pixel)',
                  fontSize: 7,
                  padding: '2px 6px',
                  background: 'rgba(46,204,113,0.08)',
                  border: '1px solid var(--mc-emerald-dark)',
                  color: 'var(--mc-emerald)',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}>
                  OVERWORLD
                </span>
              </motion.button>
            ))}
          </div>

          {/* Close */}
          <button
            className="premium-btn premium-btn--xs"
            style={{ width: '100%', marginTop: 14, justifyContent: 'center', borderColor: 'var(--mc-redstone-dark)', color: 'var(--mc-redstone)' }}
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
            CANCEL
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
