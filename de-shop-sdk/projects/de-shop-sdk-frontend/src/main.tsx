import React from 'react'
import ReactDOM from 'react-dom/client'
import { NetworkId, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import App from './App'
import './styles/App.css'
import ErrorBoundary from './components/ErrorBoundary'

const walletManager = new WalletManager({
  wallets: [WalletId.PERA, WalletId.DEFLY],
  defaultNetwork: NetworkId.TESTNET,
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WalletProvider manager={walletManager}>
        <App />
      </WalletProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
