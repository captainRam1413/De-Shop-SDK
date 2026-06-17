'use client'

import { create } from 'zustand'

export type ActivePage = 'dashboard' | 'market' | 'inventory' | 'terminal' | 'profile' | 'docs' | 'plugins' | 'game' | 'settings' | 'notifications'

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
  // Theme
  theme: TerminalTheme

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
  setTheme: (theme: TerminalTheme) => void
}

let notificationCounter = 0

const THEME_STORAGE_KEY = 'deshop-theme'

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

export const useDeShopStore = create<DeShopState>((set) => ({
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

  // Theme (hydrated from localStorage on first client read)
  theme: loadInitialTheme(),

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
}))
