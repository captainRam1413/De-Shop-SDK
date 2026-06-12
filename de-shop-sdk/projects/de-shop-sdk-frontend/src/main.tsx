import React from 'react'
import ReactDOM from 'react-dom/client'
import { NetworkId, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SDKProvider } from './context/SDKProvider'
import App from './App.premium'
import './styles/App.css'
import './styles/App.premium.css'
import ErrorBoundary from './components/ErrorBoundary'

const walletManager = new WalletManager({
  wallets: [WalletId.PERA, WalletId.DEFLY],
  defaultNetwork: NetworkId.TESTNET,
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WalletProvider manager={walletManager}>
        <SDKProvider>
          <App />
        </SDKProvider>
      </WalletProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
