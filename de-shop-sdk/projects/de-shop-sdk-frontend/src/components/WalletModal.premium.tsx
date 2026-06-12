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
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{
              padding: 10,
              borderRadius: 12,
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.2)',
            }}>
              <Wallet className="h-5 w-5" style={{ color: 'var(--green-neon)' }} />
            </div>
            <div>
              <h3 style={{
                color: 'var(--green-bright)',
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '0.06em',
                margin: 0,
              }}>
                CONNECT WALLET
              </h3>
              <p style={{
                color: 'var(--green-dim)',
                fontSize: 11,
                margin: '4px 0 0',
              }}>
                Select a provider to connect to Algorand
              </p>
            </div>
          </div>

          {/* Wallet options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                  style={{ width: 32, height: 32, borderRadius: 8 }}
                />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{wallet.metadata.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--green-dim)', marginTop: 2 }}>
                    {wallet.id === 'pera' ? 'Algorand mobile wallet' : 'Defly wallet'}
                  </div>
                </div>
                <span style={{
                  fontSize: 9,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.15)',
                  color: 'var(--green)',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}>
                  TESTNET
                </span>
              </motion.button>
            ))}
          </div>

          {/* Close */}
          <button
            className="premium-btn premium-btn--xs"
            style={{ width: '100%', marginTop: 16, justifyContent: 'center', borderColor: 'rgba(239,68,68,0.3)', color: 'var(--red)' }}
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
