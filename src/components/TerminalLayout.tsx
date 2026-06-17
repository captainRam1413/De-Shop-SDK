'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  Store,
  Package,
  Terminal,
  User,
  BookOpen,
  Puzzle,
  Gamepad2,
  Bell,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Github,
  MessageCircle,
  FileText,
  Wifi,
  WifiOff,
  Loader2,
  LogOut,
  Home,
  Search,
} from 'lucide-react'
import { useDeShopStore, type ActivePage } from '@/store/useDeShopStore'
import DashboardPage from '@/components/pages/DashboardPage'
import MarketplacePage from '@/components/pages/MarketplacePage'
import InventoryPage from '@/components/pages/InventoryPage'
import TerminalPage from '@/components/pages/TerminalPage'
import ProfilePage from '@/components/pages/ProfilePage'
import DocsPage from '@/components/pages/DocsPage'
import PluginsPage from '@/components/pages/PluginsPage'
import GamePage from '@/components/pages/GamePage'
import CommandPalette from '@/components/CommandPalette'

/* ===== NAV CONFIG ===== */

interface NavItem {
  page: ActivePage
  label: string
  command: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { page: 'dashboard', label: 'Dashboard', command: 'cd dashboard', icon: BarChart3 },
  { page: 'market', label: 'Marketplace', command: 'cd marketplace', icon: Store },
  { page: 'inventory', label: 'Inventory', command: 'cd inventory', icon: Package },
  { page: 'terminal', label: 'Terminal', command: 'cd terminal', icon: Terminal },
  { page: 'profile', label: 'Profile', command: 'cd profile', icon: User },
  { page: 'docs', label: 'Docs', command: 'cd docs', icon: BookOpen },
  { page: 'plugins', label: 'Plugins', command: 'cd plugins', icon: Puzzle },
  { page: 'game', label: 'Arcade', command: 'cd arcade', icon: Gamepad2 },
]

const PAGE_TITLES: Record<ActivePage, string> = {
  dashboard: 'Dashboard',
  market: 'Marketplace',
  inventory: 'Inventory',
  terminal: 'Terminal',
  profile: 'Profile',
  docs: 'Documentation',
  plugins: 'Plugins',
  game: 'Arcade',
}

/* ===== TRAFFIC LIGHT DOTS ===== */

function TrafficLights() {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className="terminal-dot terminal-dot-red" />
      <span className="terminal-dot terminal-dot-yellow" />
      <span className="terminal-dot terminal-dot-green" />
    </div>
  )
}

/* ===== NOTIFICATION TOAST ===== */

function NotificationToast() {
  const notifications = useDeShopStore((s) => s.notifications)
  const removeNotification = useDeShopStore((s) => s.removeNotification)

  const typeClass = {
    success: 'terminal-toast-success',
    error: 'terminal-toast-error',
    warning: 'terminal-toast-warning',
    info: 'terminal-toast-info',
  }

  const typeIcon = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
  }

  const typeColor = {
    success: 'text-term-green',
    error: 'text-term-red',
    warning: 'text-term-amber',
    info: 'text-term-cyan',
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`terminal-toast ${typeClass[notif.type]} pointer-events-auto cursor-pointer`}
            onClick={() => removeNotification(notif.id)}
          >
            <div className="flex items-start gap-2">
              <span className={`font-bold ${typeColor[notif.type]}`}>
                {typeIcon[notif.type]}
              </span>
              <span className="flex-1">{notif.message}</span>
              <button
                className="text-term-dim hover:text-term-white ml-2"
                onClick={(e) => {
                  e.stopPropagation()
                  removeNotification(notif.id)
                }}
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/* ===== WALLET MODAL ===== */

function WalletModal() {
  const showWalletModal = useDeShopStore((s) => s.showWalletModal)
  const setShowWalletModal = useDeShopStore((s) => s.setShowWalletModal)
  const connectWallet = useDeShopStore((s) => s.connectWallet)
  const addNotification = useDeShopStore((s) => s.addNotification)

  const [connecting, setConnecting] = useState(false)

  const handleConnect = useCallback(
    async (wallet: string) => {
      setConnecting(true)
      // Simulate wallet connection
      await new Promise((r) => setTimeout(r, 1500))
      const mockAddress =
        wallet === 'pera'
          ? 'ALGO7K4B...X3F9QM'
          : 'ALGO9DJ2N...R7H4PK'
      connectWallet(mockAddress)
      addNotification('success', `Wallet connected via ${wallet === 'pera' ? 'Pera' : 'Defly'}`)
      setConnecting(false)
    },
    [connectWallet, addNotification]
  )

  if (!showWalletModal) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={() => setShowWalletModal(false)}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="terminal-card w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="terminal-card-header">
          <TrafficLights />
          <span className="terminal-title">connect-wallet.sh</span>
        </div>
        <div className="terminal-card-body space-y-4">
          <div className="text-term-dim text-xs">
            <span className="prompt-prefix">$ </span>
            <span>Initializing Algorand wallet connection...</span>
          </div>

          <div className="text-xs text-term-text mb-3">
            Select a wallet provider:
          </div>

          <button
            onClick={() => handleConnect('pera')}
            disabled={connecting}
            className="terminal-btn terminal-btn-primary w-full text-left flex items-center gap-3"
          >
            {connecting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Wallet size={14} />
            )}
            <div>
              <div className="font-bold">Pera Wallet</div>
              <div className="text-term-dim text-[10px]">Algorand&apos;s leading mobile wallet</div>
            </div>
          </button>

          <button
            onClick={() => handleConnect('defly')}
            disabled={connecting}
            className="terminal-btn terminal-btn-primary w-full text-left flex items-center gap-3"
          >
            {connecting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Wallet size={14} />
            )}
            <div>
              <div className="font-bold">Defly Wallet</div>
              <div className="text-term-dim text-[10px]">Advanced DeFi wallet for Algorand</div>
            </div>
          </button>

          <button
            onClick={() => setShowWalletModal(false)}
            className="terminal-btn w-full text-center text-term-dim"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ===== SIDEBAR ===== */

function Sidebar() {
  const activePage = useDeShopStore((s) => s.activePage)
  const setActivePage = useDeShopStore((s) => s.setActivePage)
  const sidebarCollapsed = useDeShopStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useDeShopStore((s) => s.toggleSidebar)
  const walletConnected = useDeShopStore((s) => s.walletConnected)
  const walletAddress = useDeShopStore((s) => s.walletAddress)
  const setShowWalletModal = useDeShopStore((s) => s.setShowWalletModal)
  const disconnectWallet = useDeShopStore((s) => s.disconnectWallet)
  const addNotification = useDeShopStore((s) => s.addNotification)
  const mobileSidebarOpen = useDeShopStore((s) => s.mobileSidebarOpen)
  const setMobileSidebarOpen = useDeShopStore((s) => s.setMobileSidebarOpen)

  const handleDisconnect = useCallback(() => {
    disconnectWallet()
    addNotification('info', 'Wallet disconnected')
  }, [disconnectWallet, addNotification])

  return (
    <>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="mobile-overlay md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${
          mobileSidebarOpen ? 'mobile-open' : ''
        }`}
      >
        {/* Sidebar header */}
        <div className="terminal-chrome flex-shrink-0">
          <TrafficLights />
          {!sidebarCollapsed && (
            <span className="terminal-title">De-Shop SDK</span>
          )}
        </div>

        {/* ASCII Art Logo */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-b border-term">
            <pre className="ascii-art text-[8px] leading-tight glow-green">
{`  ___       _   _       _
 / _ \\  ___| |_| |_ ___| |
| |_| |/ _ \\ __| __/ _ \\ |
|  _  |  __/ |_| ||  __/ |
|_| |_|\\___|\\__|\\__\\___|_|`}
            </pre>
            <div className="text-term-dim text-[9px] mt-1">SDK v2.0 — Terminal Mode</div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.page
            const Icon = item.icon
            return (
              <motion.button
                key={item.page}
                onClick={() => setActivePage(item.page)}
                className={`nav-item w-full text-left ${isActive ? 'active' : ''}`}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                {isActive ? (
                  <span className="prompt-prefix text-sm flex-shrink-0">&gt;</span>
                ) : (
                  <span className="prompt-prefix-dim text-sm flex-shrink-0">$</span>
                )}
                <Icon className="nav-icon" />
                {!sidebarCollapsed && (
                  <span className="nav-label">
                    {isActive ? (
                      <span className="text-term-green">cd {item.label.toLowerCase()}</span>
                    ) : (
                      <span>cd {item.label.toLowerCase()}</span>
                    )}
                  </span>
                )}
              </motion.button>
            )
          })}
        </nav>

        {/* Sidebar footer - Wallet status */}
        <div className="border-t border-term p-3 flex-shrink-0">
          {walletConnected ? (
            <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <span className="status-dot status-dot-online" />
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-term-green truncate">
                    {walletAddress}
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="text-[9px] text-term-dim hover:text-term-red flex items-center gap-1"
                  >
                    <LogOut size={8} /> disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowWalletModal(true)}
              className={`terminal-btn terminal-btn-primary text-[10px] w-full ${
                sidebarCollapsed ? 'px-2' : ''
              }`}
            >
              <Wallet size={10} className="inline mr-1" />
              {!sidebarCollapsed && 'Connect Wallet'}
            </button>
          )}
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex items-center justify-center p-2 border-t border-term text-term-dim hover:text-term-green transition-colors"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>
    </>
  )
}

/* ===== HEADER ===== */

function Header() {
  const activePage = useDeShopStore((s) => s.activePage)
  const walletConnected = useDeShopStore((s) => s.walletConnected)
  const walletAddress = useDeShopStore((s) => s.walletAddress)
  const notifications = useDeShopStore((s) => s.notifications)
  const setShowWalletModal = useDeShopStore((s) => s.setShowWalletModal)
  const disconnectWallet = useDeShopStore((s) => s.disconnectWallet)
  const addNotification = useDeShopStore((s) => s.addNotification)
  const setMobileSidebarOpen = useDeShopStore((s) => s.setMobileSidebarOpen)
  const sidebarCollapsed = useDeShopStore((s) => s.sidebarCollapsed)
  const status = useDeShopStore((s) => s.status)
  const setCommandPaletteOpen = useDeShopStore((s) => s.setCommandPaletteOpen)

  const handleDisconnect = useCallback(() => {
    disconnectWallet()
    addNotification('info', 'Wallet disconnected')
  }, [disconnectWallet, addNotification])

  const pageTitle = PAGE_TITLES[activePage]

  return (
    <header className="app-header">
      {/* Terminal chrome bar */}
      <div className="terminal-chrome">
        <TrafficLights />
        <span className="terminal-title">
          De-Shop SDK — {pageTitle}
        </span>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-term-dim hover:text-term-green mr-2"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={16} />
        </button>
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-between px-4 py-2 text-[11px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-term-dim">
          <Home size={11} className="text-term-green" />
          <span className="text-term-dim">~</span>
          <span className="breadcrumb-sep">/</span>
          <span className="text-term-text">de-shop</span>
          <span className="breadcrumb-sep">/</span>
          <span className="text-term-green">{activePage}</span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Network badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-term-elevated border border-term rounded-sm">
            <span className="status-dot status-dot-online" style={{ width: 6, height: 6 }} />
            <span className="text-term-cyan text-[10px] font-bold tracking-wider">
              ALGORAND TESTNET
            </span>
          </div>

          {/* Command palette search button */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 bg-term-elevated border border-term rounded-sm hover:border-term-green/60 hover:bg-[rgba(51,255,51,0.06)] transition-colors group"
            aria-label="Open command palette"
            title="Open command palette (⌘K)"
          >
            <Search size={11} className="text-term-dim group-hover:text-term-green transition-colors" />
            <span className="text-[9px] font-terminal text-term-dim group-hover:text-term-green transition-colors hidden sm:inline">
              search
            </span>
            <span className="hidden md:inline-flex items-center justify-center min-w-[18px] h-[14px] px-1 text-[8px] font-terminal text-term-dim bg-[#1E1E1E] border border-[#444444] rounded-sm">
              ⌘K
            </span>
          </button>

          {/* Notification bell */}
          <button
            className="relative text-term-dim hover:text-term-green transition-colors"
            aria-label="Notifications"
          >
            <Bell size={14} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-term-red rounded-full text-[7px] text-white flex items-center justify-center font-bold">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Wallet button */}
          {walletConnected ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 text-[10px] text-term-green hover:text-term-red transition-colors"
            >
              <Wallet size={12} />
              <span className="hidden sm:inline">{walletAddress}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowWalletModal(true)}
              className="terminal-btn terminal-btn-primary text-[10px] py-1 px-2"
            >
              <Wallet size={10} className="inline mr-1" />
              Connect
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

/* ===== FOOTER ===== */

function Footer() {
  const status = useDeShopStore((s) => s.status)
  const walletConnected = useDeShopStore((s) => s.walletConnected)

  return (
    <footer className="app-footer">
      <div className="flex items-center justify-between text-[10px] text-term-dim">
        <div className="flex items-center gap-3">
          <span className="text-term-green">De-Shop SDK v2.0</span>
          <span>|</span>
          <span>Terminal Mode</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Network status */}
          <div className="flex items-center gap-1.5">
            {status === 'online' ? (
              <>
                <Wifi size={10} className="text-term-green" />
                <span className="text-term-green">Connected</span>
              </>
            ) : status === 'connecting' ? (
              <>
                <Loader2 size={10} className="animate-spin text-term-amber" />
                <span className="text-term-amber">Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff size={10} className="text-term-red" />
                <span className="text-term-red">Offline</span>
              </>
            )}
          </div>

          <span className="mx-1">|</span>

          {/* Links */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-term-green transition-colors"
          >
            <Github size={10} />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-1 hover:text-term-cyan transition-colors"
          >
            <FileText size={10} />
            <span className="hidden sm:inline">Docs</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-1 hover:text-term-magenta transition-colors"
          >
            <MessageCircle size={10} />
            <span className="hidden sm:inline">Discord</span>
          </a>
        </div>
      </div>
    </footer>
  )
}

/* ===== PAGE PLACEHOLDERS ===== */

// MarketplacePage - now imported from @/components/pages/MarketplacePage

// InventoryPage - now imported from @/components/pages/InventoryPage

// TerminalPage - now imported from @/components/pages/TerminalPage

// ProfilePage - now imported from @/components/pages/ProfilePage

// DocsPage - now imported from @/components/pages/DocsPage

// PluginsPage - now imported from @/components/pages/PluginsPage

/* ===== MAIN TERMINAL LAYOUT ===== */

export default function TerminalLayout() {
  const activePage = useDeShopStore((s) => s.activePage)

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />
      case 'market':
        return <MarketplacePage />
      case 'inventory':
        return <InventoryPage />
      case 'terminal':
        return <TerminalPage />
      case 'profile':
        return <ProfilePage />
      case 'docs':
        return <DocsPage />
      case 'plugins':
        return <PluginsPage />
      case 'game':
        return <GamePage />
      default:
        return <DashboardPage />
    }
  }

  return (
    <div className="app-layout scanline-overlay min-h-screen">
      <Sidebar />
      <div className="app-main min-h-screen flex flex-col">
        <Header />
        <main className="app-content flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
      <NotificationToast />
      <WalletModal />
      <CommandPalette />
    </div>
  )
}
