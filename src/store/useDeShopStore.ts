'use client'

import { create } from 'zustand'

export type ActivePage = 'dashboard' | 'market' | 'inventory' | 'terminal' | 'profile' | 'docs' | 'plugins' | 'game' | 'settings' | 'notifications' | 'leaderboard'

export interface TerminalMacro {
  id: string
  name: string
  commands: string
  createdAt: number
  lastRunAt?: number
  runCount: number
}

export interface CompareHistoryEntry {
  id: string
  assetIds: string[]
  assetNames: string[]
  createdAt: number
}

export type TerminalTheme = 'pro-dark' | 'light' | 'matrix' | 'phosphor' | 'amber'

export const TERMINAL_THEMES: { id: TerminalTheme; name: string; tagline: string }[] = [
  { id: 'pro-dark', name: 'Pro Dark', tagline: 'macOS Terminal dark — #33FF33 on #1E1E1E' },
  { id: 'light', name: 'Light', tagline: 'macOS Terminal light — #006600 on #F5F5F0' },
  { id: 'matrix', name: 'Matrix', tagline: 'matrix rain — #00FF00 on #000000' },
  { id: 'phosphor', name: 'Phosphor', tagline: 'CRT green phosphor — #88FF88 on #0A0A0A' },
  { id: 'amber', name: 'Amber', tagline: 'amber monochrome CRT — #FFB800 on #1A0F00' },
]

export type NotificationType = 'info' | 'success' | 'error' | 'warning'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  timestamp: number
}

export type AppStatus = 'online' | 'offline' | 'connecting'

export interface PriceAlert {
  id: string
  assetName: string
  assetId?: string
  condition: 'above' | 'below'
  targetPrice: number
  createdAt: number
  triggered?: boolean
  triggeredAt?: number
  lastPrice?: number
}

interface DeShopState {
  // Navigation
  activePage: ActivePage
  // Sidebar
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  // Notifications
  notifications: Notification[]
  // Wallet
  showWalletModal: boolean
  walletConnected: boolean
  walletAddress: string | null
  // App status
  status: AppStatus
  // Command palette
  commandPaletteOpen: boolean
  // Keyboard shortcuts overlay
  shortcutsOpen: boolean
  // Price alert modal
  priceAlertAsset: { name: string; id?: string; price: number } | null
  // Theme
  theme: TerminalTheme
  // Watchlist — array of asset IDs persisted to localStorage
  watchlist: string[]
  // Price alerts — persisted to localStorage
  priceAlerts: PriceAlert[]
  // Asset comparison tray — array of asset IDs (max 3) — persisted to localStorage
  compareIds: string[]
  // Compare drawer visibility
  compareDrawerOpen: boolean
  // Compare history — last 5 compare sets (persisted)
  compareHistory: CompareHistoryEntry[]
  // Terminal command macros — persisted
  terminalMacros: TerminalMacro[]
  // Onboarding tour state — persisted
  tourSeen: boolean
  tourActive: boolean
  // CRT flicker effect (visual)
  crtFlicker: boolean

  // Actions
  setActivePage: (page: ActivePage) => void
  toggleSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
  addNotification: (type: NotificationType, message: string) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  setShowWalletModal: (show: boolean) => void
  connectWallet: (address: string) => void
  disconnectWallet: () => void
  setStatus: (status: AppStatus) => void
  setCommandPaletteOpen: (open: boolean) => void
  setShortcutsOpen: (open: boolean) => void
  setPriceAlertAsset: (asset: { name: string; id?: string; price: number } | null) => void
  setTheme: (theme: TerminalTheme) => void
  // Watchlist actions
  toggleWatchlist: (assetId: string) => void
  isWatched: (assetId: string) => boolean
  clearWatchlist: () => void
  // Price alert actions
  addPriceAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => void
  removePriceAlert: (id: string) => void
  markPriceAlertTriggered: (id: string, lastPrice: number) => void
  clearPriceAlerts: () => void
  // Compare actions
  toggleCompare: (assetId: string) => void
  isCompared: (assetId: string) => boolean
  clearCompare: () => void
  setCompareDrawerOpen: (open: boolean) => void
  // Compare history actions
  addCompareHistory: (assetIds: string[], assetNames: string[]) => void
  removeCompareHistory: (id: string) => void
  clearCompareHistory: () => void
  // Terminal macro actions
  addMacro: (name: string, commands: string) => void
  removeMacro: (id: string) => void
  incrementMacroRunCount: (id: string) => void
  // Tour actions
  setTourSeen: (seen: boolean) => void
  setTourActive: (active: boolean) => void
  // CRT flicker
  setCrtFlicker: (on: boolean) => void
}

let notificationCounter = 0
let priceAlertCounter = 0

const THEME_STORAGE_KEY = 'deshop-theme'
const WATCHLIST_STORAGE_KEY = 'deshop-watchlist'
const PRICE_ALERTS_STORAGE_KEY = 'deshop-price-alerts'
const COMPARE_STORAGE_KEY = 'deshop-compare'
const COMPARE_HISTORY_STORAGE_KEY = 'deshop-compare-history'
const TERMINAL_MACROS_STORAGE_KEY = 'deshop-terminal-macros'
const TOUR_STORAGE_KEY = 'deshop-tour-seen'
const CRT_FLICKER_STORAGE_KEY = 'deshop-crt-flicker'

function applyThemeToDocument(theme: TerminalTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

function loadInitialTheme(): TerminalTheme {
  if (typeof window === 'undefined') return 'pro-dark'
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'pro-dark' || stored === 'light' || stored === 'matrix' || stored === 'phosphor' || stored === 'amber') {
      applyThemeToDocument(stored)
      return stored
    }
  } catch {
    /* ignore */
  }
  applyThemeToDocument('pro-dark')
  return 'pro-dark'
}

function loadInitialWatchlist(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(WATCHLIST_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string')
    }
  } catch {
    /* ignore */
  }
  return []
}

function loadInitialPriceAlerts(): PriceAlert[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(PRICE_ALERTS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* ignore */
  }
  return []
}

function persistWatchlist(list: string[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

function persistPriceAlerts(alerts: PriceAlert[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PRICE_ALERTS_STORAGE_KEY, JSON.stringify(alerts))
  } catch {
    /* ignore */
  }
}

function loadInitialCompare(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(COMPARE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed.filter((x) => typeof x === 'string').slice(0, 3)
      }
    }
  } catch {
    /* ignore */
  }
  return []
}

function persistCompare(ids: string[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids.slice(0, 3)))
  } catch {
    /* ignore */
  }
}

function loadInitialCompareHistory(): CompareHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(COMPARE_HISTORY_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed.slice(0, 5)
    }
  } catch {
    /* ignore */
  }
  return []
}

function persistCompareHistory(history: CompareHistoryEntry[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(COMPARE_HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 5)))
  } catch {
    /* ignore */
  }
}

function loadInitialMacros(): TerminalMacro[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = window.localStorage.getItem(TERMINAL_MACROS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* ignore */
  }
  return []
}

function persistMacros(macros: TerminalMacro[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TERMINAL_MACROS_STORAGE_KEY, JSON.stringify(macros))
  } catch {
    /* ignore */
  }
}

function loadInitialTourSeen(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(TOUR_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function persistTourSeen(seen: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, seen ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function loadInitialCrtFlicker(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(CRT_FLICKER_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function persistCrtFlicker(on: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CRT_FLICKER_STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export const useDeShopStore = create<DeShopState>((set, get) => ({
  // Navigation
  activePage: 'dashboard',

  // Sidebar
  sidebarCollapsed: false,
  mobileSidebarOpen: false,

  // Notifications
  notifications: [],

  // Wallet
  showWalletModal: false,
  walletConnected: false,
  walletAddress: null,

  // Status
  status: 'online',

  // Command palette
  commandPaletteOpen: false,

  // Keyboard shortcuts overlay
  shortcutsOpen: false,

  // Price alert modal target
  priceAlertAsset: null,

  // Theme (hydrated from localStorage on first client read)
  theme: loadInitialTheme(),

  // Watchlist (hydrated from localStorage)
  watchlist: loadInitialWatchlist(),

  // Price alerts (hydrated from localStorage)
  priceAlerts: loadInitialPriceAlerts(),

  // Compare tray (hydrated from localStorage, max 3)
  compareIds: loadInitialCompare(),
  compareDrawerOpen: false,

  // Compare history (last 5 sets)
  compareHistory: loadInitialCompareHistory(),

  // Terminal macros
  terminalMacros: loadInitialMacros(),

  // Onboarding tour
  tourSeen: loadInitialTourSeen(),
  tourActive: false,

  // CRT flicker effect
  crtFlicker: loadInitialCrtFlicker(),

  // Actions
  setActivePage: (page) => set({ activePage: page, mobileSidebarOpen: false }),

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  addNotification: (type, message) => {
    const id = `notif-${Date.now()}-${++notificationCounter}`
    const notification: Notification = {
      id,
      type,
      message,
      timestamp: Date.now(),
    }
    set((state) => ({
      notifications: [...state.notifications, notification],
    }))
    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }))
    }, 5000)
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),

  setShowWalletModal: (show) => set({ showWalletModal: show }),

  connectWallet: (address) =>
    set({
      walletConnected: true,
      walletAddress: address,
      showWalletModal: false,
      status: 'online',
    }),

  disconnectWallet: () =>
    set({
      walletConnected: false,
      walletAddress: null,
      showWalletModal: false,
    }),

  setStatus: (status) => set({ status }),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),

  setPriceAlertAsset: (asset) => set({ priceAlertAsset: asset }),

  setTheme: (theme) => {
    applyThemeToDocument(theme)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme)
      } catch {
        /* ignore */
      }
    }
    set({ theme })
  },

  toggleWatchlist: (assetId) => {
    const current = get().watchlist
    const next = current.includes(assetId)
      ? current.filter((id) => id !== assetId)
      : [...current, assetId]
    persistWatchlist(next)
    set({ watchlist: next })
  },

  isWatched: (assetId) => get().watchlist.includes(assetId),

  clearWatchlist: () => {
    persistWatchlist([])
    set({ watchlist: [] })
  },

  addPriceAlert: (alert) => {
    const newAlert: PriceAlert = {
      ...alert,
      id: `alert-${Date.now()}-${++priceAlertCounter}`,
      createdAt: Date.now(),
    }
    const next = [...get().priceAlerts, newAlert]
    persistPriceAlerts(next)
    set({ priceAlerts: next })
  },

  removePriceAlert: (id) => {
    const next = get().priceAlerts.filter((a) => a.id !== id)
    persistPriceAlerts(next)
    set({ priceAlerts: next })
  },

  markPriceAlertTriggered: (id, lastPrice) => {
    const next = get().priceAlerts.map((a) =>
      a.id === id
        ? { ...a, triggered: true, triggeredAt: Date.now(), lastPrice }
        : a,
    )
    persistPriceAlerts(next)
    set({ priceAlerts: next })
  },

  clearPriceAlerts: () => {
    persistPriceAlerts([])
    set({ priceAlerts: [] })
  },

  toggleCompare: (assetId) => {
    const current = get().compareIds
    let next: string[]
    if (current.includes(assetId)) {
      next = current.filter((id) => id !== assetId)
    } else {
      if (current.length >= 3) {
        // Replace oldest
        next = [...current.slice(1), assetId]
      } else {
        next = [...current, assetId]
      }
    }
    persistCompare(next)
    set({ compareIds: next, compareDrawerOpen: next.length > 0 ? get().compareDrawerOpen : false })
  },

  isCompared: (assetId) => get().compareIds.includes(assetId),

  clearCompare: () => {
    persistCompare([])
    set({ compareIds: [], compareDrawerOpen: false })
  },

  setCompareDrawerOpen: (open) => set({ compareDrawerOpen: open }),

  addCompareHistory: (assetIds, assetNames) => {
    const entry: CompareHistoryEntry = {
      id: `cmp-hist-${Date.now()}`,
      assetIds: assetIds.slice(0, 3),
      assetNames: assetNames.slice(0, 3),
      createdAt: Date.now(),
    }
    // Deduplicate by same set of asset IDs (regardless of order)
    const signature = [...assetIds].sort().join('|')
    const filtered = get().compareHistory.filter(
      (h) => [...h.assetIds].sort().join('|') !== signature,
    )
    const next = [entry, ...filtered].slice(0, 5)
    persistCompareHistory(next)
    set({ compareHistory: next })
  },

  removeCompareHistory: (id) => {
    const next = get().compareHistory.filter((h) => h.id !== id)
    persistCompareHistory(next)
    set({ compareHistory: next })
  },

  clearCompareHistory: () => {
    persistCompareHistory([])
    set({ compareHistory: [] })
  },

  addMacro: (name, commands) => {
    const macro: TerminalMacro = {
      id: `macro-${Date.now()}`,
      name: name.trim().slice(0, 32),
      commands: commands.trim(),
      createdAt: Date.now(),
      runCount: 0,
    }
    const next = [...get().terminalMacros, macro]
    persistMacros(next)
    set({ terminalMacros: next })
  },

  removeMacro: (id) => {
    const next = get().terminalMacros.filter((m) => m.id !== id)
    persistMacros(next)
    set({ terminalMacros: next })
  },

  incrementMacroRunCount: (id) => {
    const next = get().terminalMacros.map((m) =>
      m.id === id ? { ...m, runCount: m.runCount + 1, lastRunAt: Date.now() } : m,
    )
    persistMacros(next)
    set({ terminalMacros: next })
  },

  setTourSeen: (seen) => {
    persistTourSeen(seen)
    set({ tourSeen: seen })
  },

  setTourActive: (active) => set({ tourActive: active }),

  setCrtFlicker: (on) => {
    persistCrtFlicker(on)
    if (typeof document !== 'undefined') {
      if (on) document.documentElement.classList.add('crt-flicker')
      else document.documentElement.classList.remove('crt-flicker')
    }
    set({ crtFlicker: on })
  },
}))
