/**
 * De-Shop SDK — Global Zustand Store
 * ────────────────────────────────────
 * Centralized state management for the entire DeShop frontend.
 * Consolidates state previously scattered across GameShowcase and TerminalConsole.
 */

import { create } from 'zustand'
import type { Asset } from '../sdk/types'

// ─── Notification Types ──────────────────────────────────────────────────────

export type NotificationType = 'info' | 'success' | 'error' | 'warning'

export type Notification = {
  id: string
  type: NotificationType
  message: string
  timestamp: number
}

// ─── Page Types ──────────────────────────────────────────────────────────────

export type ActivePage = 'game' | 'market' | 'inventory' | 'terminal' | 'profile'

export type MintSkinType = 'weapon' | 'character'

// ─── Store State Shape ───────────────────────────────────────────────────────

export type DeShopState = {
  // Navigation
  activePage: ActivePage
  sidebarCollapsed: boolean

  // Data
  inventory: Asset[]
  market: Asset[]
  steamItems: any[]
  steamProfile: any

  // Active skins
  activeGunSkin: Asset | null
  activeCharSkin: Asset | null

  // Analysis panel
  analyzedAsset: Asset | null
  showAnalysis: boolean

  // Marketplace filter
  marketFilter: string

  // Status bar
  status: string

  // Minting
  isMinting: boolean
  mintName: string
  mintRarity: string
  mintType: MintSkinType

  // Wallet modal
  showWalletModal: boolean

  // Notifications
  notifications: Notification[]
}

// ─── Store Actions ───────────────────────────────────────────────────────────

export type DeShopActions = {
  // Navigation
  setActivePage: (page: ActivePage) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void

  // Data setters
  setInventory: (inventory: Asset[]) => void
  setMarket: (market: Asset[]) => void
  setSteamItems: (items: any[]) => void
  setSteamProfile: (profile: any) => void

  // Active skin setters
  setActiveGunSkin: (skin: Asset | null) => void
  setActiveCharSkin: (skin: Asset | null) => void

  // Analysis panel
  setAnalyzedAsset: (asset: Asset | null) => void
  setShowAnalysis: (show: boolean) => void

  // Marketplace filter
  setMarketFilter: (filter: string) => void

  // Status bar
  setStatus: (status: string) => void

  // Minting
  setIsMinting: (minting: boolean) => void
  setMintName: (name: string) => void
  setMintRarity: (rarity: string) => void
  setMintType: (type: MintSkinType) => void

  // Wallet modal
  setShowWalletModal: (show: boolean) => void

  // Notifications
  addNotification: (type: NotificationType, message: string) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void

  // Convenience: reset wallet-dependent state on disconnect
  resetOnDisconnect: () => void
}

// ─── Notification ID Counter ─────────────────────────────────────────────────

let _notifCounter = 0
function nextNotifId(): string {
  _notifCounter += 1
  return `notif-${_notifCounter}-${Date.now()}`
}

// ─── Store Definition ────────────────────────────────────────────────────────

export type DeShopStore = DeShopState & DeShopActions

export const useDeShopStore = create<DeShopStore>((set, get) => ({
  // ── Navigation ────────────────────────────────────────────────────────────
  activePage: 'game',
  sidebarCollapsed: false,

  // ── Data ──────────────────────────────────────────────────────────────────
  inventory: [],
  market: [],
  steamItems: [],
  steamProfile: null,

  // ── Active skins ─────────────────────────────────────────────────────────
  activeGunSkin: null,
  activeCharSkin: null,

  // ── Analysis panel ───────────────────────────────────────────────────────
  analyzedAsset: null,
  showAnalysis: false,

  // ── Marketplace filter ──────────────────────────────────────────────────
  marketFilter: '',

  // ── Status bar ──────────────────────────────────────────────────────────
  status: '',

  // ── Minting ─────────────────────────────────────────────────────────────
  isMinting: false,
  mintName: '',
  mintRarity: 'rare',
  mintType: 'weapon',

  // ── Wallet modal ────────────────────────────────────────────────────────
  showWalletModal: false,

  // ── Notifications ───────────────────────────────────────────────────────
  notifications: [],

  // ═════════════════════════════════════════════════════════════════════════
  //  ACTIONS
  // ═════════════════════════════════════════════════════════════════════════

  // ── Navigation ────────────────────────────────────────────────────────────

  setActivePage: (page) => set({ activePage: page }),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // ── Data setters ──────────────────────────────────────────────────────────

  setInventory: (inventory) => set({ inventory }),

  setMarket: (market) => set({ market }),

  setSteamItems: (items) => set({ steamItems: items }),

  setSteamProfile: (profile) => set({ steamProfile: profile }),

  // ── Active skin setters ──────────────────────────────────────────────────

  setActiveGunSkin: (skin) => set({ activeGunSkin: skin }),

  setActiveCharSkin: (skin) => set({ activeCharSkin: skin }),

  // ── Analysis panel ───────────────────────────────────────────────────────

  setAnalyzedAsset: (asset) => set({ analyzedAsset: asset }),

  setShowAnalysis: (show) => set({ showAnalysis: show }),

  // ── Marketplace filter ──────────────────────────────────────────────────

  setMarketFilter: (filter) => set({ marketFilter: filter }),

  // ── Status bar ──────────────────────────────────────────────────────────

  setStatus: (status) => set({ status }),

  // ── Minting ─────────────────────────────────────────────────────────────

  setIsMinting: (minting) => set({ isMinting: minting }),

  setMintName: (name) => set({ mintName: name }),

  setMintRarity: (rarity) => set({ mintRarity: rarity }),

  setMintType: (type) => set({ mintType: type }),

  // ── Wallet modal ────────────────────────────────────────────────────────

  setShowWalletModal: (show) => set({ showWalletModal: show }),

  // ── Notifications ───────────────────────────────────────────────────────

  addNotification: (type, message) => {
    const notification: Notification = {
      id: nextNotifId(),
      type,
      message,
      timestamp: Date.now(),
    }
    set((s) => ({ notifications: [...s.notifications, notification] }))

    // Auto-dismiss after 6 seconds
    const id = notification.id
    setTimeout(() => {
      get().removeNotification(id)
    }, 6000)
  },

  removeNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),

  // ── Reset on disconnect ─────────────────────────────────────────────────

  resetOnDisconnect: () =>
    set({
      inventory: [],
      activeGunSkin: null,
      activeCharSkin: null,
      analyzedAsset: null,
      showAnalysis: false,
      isMinting: false,
      mintName: '',
      status: '',
    }),
}))
