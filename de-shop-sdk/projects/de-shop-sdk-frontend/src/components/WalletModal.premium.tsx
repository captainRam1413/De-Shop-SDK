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
              padding: 10,
              background: 'rgba(74, 237, 217, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(74, 237, 217, 0.2)',
            }}>
              <Wallet className="h-5 w-5" style={{ color: '#4AEDD9' }} />
            </div>
            <div>
              <h3 style={{
                color: '#fff',
                fontFamily: '"Outfit", sans-serif',
                fontSize: 15,
                fontWeight: 600,
                margin: 0,
              }}>
                Connect Wallet
              </h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontFamily: '"Inter", sans-serif',
                fontSize: 12,
                margin: '4px 0 0',
              }}>
                Select a provider to bind your Algorand wallet
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <img
                  src={wallet.metadata.icon}
                  alt={wallet.metadata.name}
                  style={{ width: 28, height: 28, borderRadius: 6 }}
                />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontFamily: '"Outfit", sans-serif', fontSize: 13, fontWeight: 500, color: '#fff' }}>
                    {wallet.metadata.name}
                  </div>
                  <div style={{ fontFamily: '"Inter", sans-serif', fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
                    {wallet.id === 'pera' ? 'Algorand mobile wallet' : 'Defly wallet'}
                  </div>
                </div>
                <span style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 20,
                  background: 'rgba(74, 237, 217, 0.1)',
                  border: '1px solid rgba(74, 237, 217, 0.2)',
                  color: '#4AEDD9',
                }}>
                  Active
                </span>
              </motion.button>
            ))}
          </div>

          {/* Close */}
          <button
            className="premium-btn premium-btn--xs"
            style={{
              width: '100%',
              marginTop: 14,
              justifyContent: 'center',
              borderRadius: 20,
              background: 'rgba(255, 255, 255, 0.05)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.8)',
              fontFamily: '"Outfit", sans-serif',
              fontSize: 12,
              fontWeight: 600,
            }}
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
