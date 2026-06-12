/**
 * De-Shop SDK — React Context Provider
 * ──────────────────────────────────────
 * Creates a SINGLE DeShopSDK instance and provides it to the entire app
 * via React Context. Syncs wallet state from @txnlab/use-wallet-react
 * to the SDK and wires SDK events into the Zustand store.
 *
 * Usage:
 * ```tsx
 * <SDKProvider>
 *   <App />
 * </SDKProvider>
 * ```
 */

'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { DeShopSDK } from '../sdk/DeShopSDK'
import type { Asset, BuyResult, TransferResult } from '../sdk/types'
import {
  DeShopError,
  WalletNotConnectedError,
  InsufficientFundsError,
  TransactionFailedError,
} from '../sdk/errors'
import { useDeShopStore } from '../store/useDeShopStore'
import type { NotificationType } from '../store/useDeShopStore'

// ─── Context Shape ───────────────────────────────────────────────────────────

export type SDKContextValue = {
  /** The singleton DeShopSDK instance. */
  sdk: DeShopSDK
  /** Whether a wallet is currently connected and the SDK is ready. */
  isConnected: boolean
  /** Connect wallet — opens the wallet modal from the Zustand store. */
  connectWallet: () => void
  /** Disconnect the currently active wallet. */
  disconnectWallet: () => Promise<void>
}

const SDKContext = createContext<SDKContextValue | null>(null)

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Access the shared DeShopSDK instance and wallet helpers.
 * Must be used inside `<SDKProvider>`.
 */
export function useSDK(): SDKContextValue {
  const ctx = useContext(SDKContext)
  if (!ctx) {
    throw new Error('useSDK must be used within an <SDKProvider>')
  }
  return ctx
}

// ─── Error → Notification helper ─────────────────────────────────────────────

function errorToNotification(e: unknown): { type: NotificationType; message: string } {
  if (e instanceof WalletNotConnectedError) {
    return { type: 'warning', message: 'Please connect your wallet first.' }
  }
  if (e instanceof InsufficientFundsError) {
    return { type: 'error', message: `Insufficient funds. Need ${e.required} μALGO.` }
  }
  if (e instanceof TransactionFailedError) {
    return { type: 'error', message: `Transaction failed: ${e.message}` }
  }
  if (e instanceof DeShopError) {
    return { type: 'error', message: e.message }
  }
  if (e instanceof Error) {
    return { type: 'error', message: e.message || 'Unknown error' }
  }
  return { type: 'error', message: 'An unknown error occurred' }
}

// ─── Provider Component ──────────────────────────────────────────────────────

export type SDKProviderProps = {
  children: ReactNode
}

export function SDKProvider({ children }: SDKProviderProps) {
  const { activeAddress, transactionSigner, activeWallet } = useWallet()

  // ── Zustand store — direct API for non-reactive reads, hook for reactive values ──
  const store = useDeShopStore
  const marketFilter = useDeShopStore((s) => s.marketFilter)

  // ── Create ONE SDK instance for the entire app ──────────────────────────
  const sdkRef = useRef<DeShopSDK | null>(null)
  if (sdkRef.current === null) {
    sdkRef.current = new DeShopSDK({
      network: 'testnet',
      backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
      debug: true,
    })
  }
  const sdk = sdkRef.current

  // ── Sync wallet signer with SDK whenever it changes ─────────────────────
  useEffect(() => {
    sdk.setWalletSigner(activeAddress ?? null, transactionSigner ?? null)
  }, [sdk, activeAddress, transactionSigner])

  // ── Auto-close wallet modal on connect ──────────────────────────────────
  useEffect(() => {
    if (activeAddress && store.getState().showWalletModal) {
      store.getState().setShowWalletModal(false)
    }
  }, [activeAddress, store])

  // ── Refresh helpers ─────────────────────────────────────────────────────
  const refreshInventoryRef = useRef(async (wallet: string) => {
    try {
      const items = await sdk.getPlayerAssets(wallet)
      store.getState().setInventory(items)
    } catch (e) {
      console.error('[SDKProvider] Failed to refresh inventory:', e)
    }
  })

  const refreshMarketRef = useRef(async () => {
    try {
      const { marketFilter } = store.getState()
      const data = await sdk.getMarketplace(marketFilter ? { rarity: marketFilter } : undefined)
      store.getState().setMarket(data)
    } catch (e) {
      console.error('[SDKProvider] Failed to refresh market:', e)
    }
  })

  // ── Auto-refresh inventory & market on wallet connect ───────────────────
  useEffect(() => {
    if (!activeAddress) {
      store.getState().resetOnDisconnect()
      return
    }

    // Initial load
    refreshInventoryRef.current(activeAddress)
    refreshMarketRef.current()

    // Polling interval (5s)
    const interval = setInterval(() => {
      refreshMarketRef.current()
      refreshInventoryRef.current(activeAddress!)
    }, 5000)

    return () => clearInterval(interval)
  }, [activeAddress, store])

  // ── Re-fetch market when filter changes ─────────────────────────────────
  useEffect(() => {
    if (activeAddress) {
      refreshMarketRef.current()
    }
  }, [marketFilter, activeAddress])

  // ── SDK Event Listeners → Zustand store + notifications ─────────────────
  useEffect(() => {
    const unsubMint = sdk.on('mint', (asset: Asset) => {
      const { setStatus, addNotification } = store.getState()
      setStatus(`✓ Minted "${asset.name}" successfully!`)
      addNotification('success', `Minted "${asset.name}"`)
      if (activeAddress) refreshInventoryRef.current(activeAddress)
    })

    const unsubList = sdk.on('list', (asset: Asset) => {
      const { setStatus, addNotification } = store.getState()
      setStatus(`✓ Listed "${asset.name}" on the marketplace!`)
      addNotification('info', `Listed "${asset.name}" on marketplace`)
      if (activeAddress) refreshInventoryRef.current(activeAddress)
      refreshMarketRef.current()
    })

    const unsubBuy = sdk.on('buy', (result: BuyResult) => {
      const { setStatus, addNotification } = store.getState()
      setStatus(`✓ Purchased "${result.asset?.name}" successfully!`)
      addNotification('success', `Purchased "${result.asset?.name}"`)
      if (activeAddress) refreshInventoryRef.current(activeAddress)
      refreshMarketRef.current()
    })

    const unsubCancel = sdk.on('cancel', (asset: Asset) => {
      const { addNotification } = store.getState()
      addNotification('info', `Cancelled listing for "${asset.name}"`)
      if (activeAddress) refreshInventoryRef.current(activeAddress)
      refreshMarketRef.current()
    })

    const unsubTransfer = sdk.on('transfer', (result: TransferResult) => {
      const { addNotification } = store.getState()
      addNotification('info', `Transferred asset #${result.asset_id}`)
      if (activeAddress) refreshInventoryRef.current(activeAddress)
    })

    const unsubWalletChanged = sdk.on('walletChanged', (address: string | null) => {
      if (address === null) {
        store.getState().resetOnDisconnect()
        store.getState().addNotification('warning', 'Wallet disconnected')
      } else {
        store.getState().addNotification('success', `Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`)
      }
    })

    const unsubError = sdk.on('error', (err: Error) => {
      console.error('[SDKProvider] SDK Event Error:', err)
      const { type, message } = errorToNotification(err)
      store.getState().addNotification(type, message)
    })

    return () => {
      unsubMint()
      unsubList()
      unsubBuy()
      unsubCancel()
      unsubTransfer()
      unsubWalletChanged()
      unsubError()
    }
  }, [sdk, activeAddress, store])

  // ── Context value ───────────────────────────────────────────────────────
  const value = useMemo<SDKContextValue>(
    () => ({
      sdk,
      isConnected: activeAddress !== null && activeAddress !== undefined,
      connectWallet: () => {
        store.getState().setShowWalletModal(true)
      },
      disconnectWallet: async () => {
        if (activeWallet) {
          await activeWallet.disconnect()
        }
        sdk.disconnectWallet()
      },
    }),
    [sdk, activeAddress, activeWallet, store],
  )

  return <SDKContext.Provider value={value}>{children}</SDKContext.Provider>
}
