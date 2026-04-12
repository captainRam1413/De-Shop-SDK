import type { Wallet } from '@txnlab/use-wallet-react'

interface WalletModalProps {
  wallets: Wallet[]
  onClose: () => void
}

export default function WalletModal({ wallets, onClose }: WalletModalProps) {
  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
        <h3>SELECT WALLET PROVIDER</h3>

        {wallets.map((wallet) => (
          <button
            key={wallet.id}
            className="wallet-btn"
            onClick={() => {
              void wallet.connect()
            }}
          >
            <img
              src={wallet.metadata.icon}
              alt={wallet.metadata.name}
            />
            <span>{wallet.metadata.name}</span>
          </button>
        ))}

        <button className="wallet-btn-close" onClick={onClose}>
          CANCEL
        </button>
      </div>
    </div>
  )
}
