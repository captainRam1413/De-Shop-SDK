'use client'

import { create } from 'zustand'

export type ActivePage = 'dashboard' | 'market' | 'inventory' | 'terminal' | 'profile' | 'docs' | 'plugins'

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
}

let notificationCounter = 0

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
}))
