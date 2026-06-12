import { useDeShopStore, type ActivePage } from './store/useDeShopStore'
import { useWallet } from '@txnlab/use-wallet-react'
import GameShowcase from './components/GameShowcase.premium'
import MarketplaceV2 from './components/MarketplaceV2.premium'
import TerminalConsole from './components/TerminalConsole'
import WalletModal from './components/WalletModal.premium'
import DashboardPremium from './components/Dashboard.premium'
import ProfilePage from './components/ProfilePage.premium'
import ParticleBackground from './components/ParticleBackground'
import ConfettiEffect from './components/ConfettiEffect'
import AnimatedBorder from './components/AnimatedBorder'
import ThemeToggle from './components/ThemeToggle'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import {
  Gamepad2,
  Store,
  Backpack,
  Terminal,
  User,
  ChevronLeft,
  ChevronRight,
  Hexagon,
  Zap,
  LayoutDashboard,
} from 'lucide-react'

const navItems: { id: ActivePage; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, color: 'var(--cyan-bright)' },
  { id: 'game', label: 'Game Arena', icon: <Gamepad2 className="h-4 w-4" />, color: 'var(--green-neon)' },
  { id: 'market', label: 'Marketplace', icon: <Store className="h-4 w-4" />, color: 'var(--cyan-bright)' },
  { id: 'inventory', label: 'Inventory', icon: <Backpack className="h-4 w-4" />, color: 'var(--purple-bright)' },
  { id: 'terminal', label: 'Terminal', icon: <Terminal className="h-4 w-4" />, color: 'var(--green-bright)' },
  { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" />, color: 'var(--gold-bright)' },
]

function Notifications() {
  const notifications = useDeShopStore((s) => s.notifications)
  const removeNotification = useDeShopStore((s) => s.removeNotification)

  if (notifications.length === 0) return null

  return (
    <div className="premium-notifications">
      <AnimatePresence>
        {notifications.slice(-5).map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`premium-toast premium-toast--${n.type}`}
            onClick={() => removeNotification(n.id)}
          >
            <span className="premium-toast__icon">
              {n.type === 'success' ? '✓' : n.type === 'error' ? '✗' : n.type === 'warning' ? '⚠' : 'ℹ'}
            </span>
            <span className="premium-toast__msg">{n.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function Sidebar() {
  const { activePage, setActivePage, sidebarCollapsed, toggleSidebar } = useDeShopStore()
  const { activeAddress } = useWallet()

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 60 : 220 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="premium-sidebar"
    >
      {/* Logo */}
      <div className="premium-sidebar__brand">
        <Hexagon className="h-6 w-6" style={{ color: 'var(--green-neon)' }} />
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="premium-sidebar__brand-text"
          >
            <span className="premium-sidebar__title">DE-SHOP</span>
            <span className="premium-sidebar__subtitle">SDK v2.0</span>
          </motion.div>
        )}
      </div>

      {/* Nav items */}
      <nav className="premium-sidebar__nav">
        {navItems.map((item) => {
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              className={`premium-sidebar__item ${isActive ? 'premium-sidebar__item--active' : ''}`}
              onClick={() => setActivePage(item.id)}
              title={item.label}
            >
              <span style={{ color: isActive ? item.color : 'var(--green-dim)' }}>
                {item.icon}
              </span>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="premium-sidebar__item-label"
                >
                  {item.label}
                </motion.span>
              )}
              {isActive && (
                <motion.div
                  layoutId="sidebarActive"
                  className="premium-sidebar__active-bar"
                  style={{ background: item.color }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* Status */}
      <div className="premium-sidebar__footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', width: '100%' }}>
          <div className="premium-sidebar__status">
            <span className={`status-dot ${activeAddress ? 'connected' : ''}`} />
            {!sidebarCollapsed && (
              <span className="premium-sidebar__status-text">
                {activeAddress ? 'Connected' : 'Offline'}
              </span>
            )}
          </div>
          <ThemeToggle />
        </div>
        <button className="premium-sidebar__collapse" onClick={toggleSidebar}>
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </motion.aside>
  )
}

function Header() {
  const { activeAddress, activeWallet } = useWallet()
  const { steamProfile, setShowWalletModal, status } = useDeShopStore()
  const addr = activeAddress
    ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
    : null

  return (
    <header className="premium-header">
      <div className="premium-header__left">
        <div className="premium-header__net-badge">
          <span className="status-dot connected" />
          TESTNET
        </div>
        {status && (
          <motion.div
            key={status}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`premium-header__status ${status.startsWith('✓') ? 'premium-header__status--success' : status.startsWith('✗') ? 'premium-header__status--error' : ''}`}
          >
            {status}
          </motion.div>
        )}
      </div>
      <div className="premium-header__right">
        <ThemeToggle />
        {steamProfile && (
          <div className="premium-header__steam">
            <img src={steamProfile.avatarfull} alt="Steam" style={{ width: 22, height: 22, borderRadius: '50%' }} />
            <span style={{ color: 'var(--cyan-bright)', fontSize: 11, fontWeight: 600 }}>{steamProfile.personaname}</span>
          </div>
        )}
        {activeAddress ? (
          <div className="premium-header__wallet-info">
            <Zap className="h-3.5 w-3.5" style={{ color: 'var(--green-neon)' }} />
            <span className="premium-header__addr">{addr}</span>
            <button
              className="premium-header__disconnect"
              onClick={() => activeWallet?.disconnect()}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            className="premium-btn premium-btn--sm"
            onClick={() => setShowWalletModal(true)}
          >
            <Zap className="h-3.5 w-3.5" />
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  )
}

const pageComponents: Record<ActivePage, React.ComponentType> = {
  dashboard: DashboardPremium,
  game: GameShowcase,
  market: MarketplaceV2, // Enhanced Marketplace V2 with advanced filtering & views
  inventory: GameShowcase, // Will use same component with inventory tab active
  terminal: TerminalConsole,
  profile: ProfilePage,
}

export default function App() {
  const showWalletModal = useDeShopStore((s) => s.showWalletModal)
  const setShowWalletModal = useDeShopStore((s) => s.setShowWalletModal)
  const activePage = useDeShopStore((s) => s.activePage)
  const notifications = useDeShopStore((s) => s.notifications)
  const { wallets } = useWallet()
  const PageComponent = pageComponents[activePage]

  // ── Confetti state: triggered on success notifications ──
  const [showConfetti, setShowConfetti] = useState(false)
  const prevNotifCountRef = useRef(notifications.length)

  useEffect(() => {
    // Only check when new notifications are added
    if (notifications.length > prevNotifCountRef.current) {
      const latestNotifications = notifications.slice(prevNotifCountRef.current)
      const hasNewSuccess = latestNotifications.some((n) => n.type === 'success')
      if (hasNewSuccess && !showConfetti) {
        setShowConfetti(true)
        const timer = setTimeout(() => setShowConfetti(false), 3200)
        prevNotifCountRef.current = notifications.length
        return () => clearTimeout(timer)
      }
    }
    prevNotifCountRef.current = notifications.length
    return undefined
  }, [notifications, showConfetti])

  // Keep ref in sync even when no confetti is triggered
  useEffect(() => {
    prevNotifCountRef.current = notifications.length
  }, [notifications.length])

  return (
    <div className="premium-app">
      <ParticleBackground />

      <AnimatedBorder borderRadius={0} borderWidth={1}>
        <Sidebar />
      </AnimatedBorder>

      <div className="premium-main">
        <Header />
        <div className="premium-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%' }}
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {showWalletModal && (
        <WalletModal wallets={wallets} onClose={() => setShowWalletModal(false)} />
      )}

      <Notifications />

      <ConfettiEffect trigger={showConfetti} />
    </div>
  )
}
