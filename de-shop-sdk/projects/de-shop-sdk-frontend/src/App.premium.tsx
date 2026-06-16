import { useDeShopStore, type ActivePage } from './store/useDeShopStore'
import { useWallet } from '@txnlab/use-wallet-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import GameShowcase from './components/GameShowcase.premium'
import TerminalConsole from './components/TerminalConsole'
import WalletModal from './components/WalletModal.premium'
import ParticleBackground from './components/ParticleBackground'
import ConfettiEffect from './components/ConfettiEffect'
import AnimatedBorder from './components/AnimatedBorder'
import ThemeToggle from './components/ThemeToggle'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2,
  Gamepad2,
  Store,
  Backpack,
  Terminal,
  User,
  ChevronLeft,
  ChevronRight,
  Pickaxe,
  BarChart3,
  Swords,
  Bell,
  Globe,
  Home,
  MessageCircle,
  BookOpen,
} from 'lucide-react'

// ─── Code-splitting: heavy page components are loaded on demand via React.lazy
//     so the initial bundle stays small. Three.js (MinecraftVoxelGame) and
//     Recharts (MarketplaceV2) are the biggest wins — they only download when
//     the user navigates to the corresponding page.
const MinecraftVoxelGame = lazy(() => import('./components/MinecraftVoxelGame'))
const MarketplaceV2 = lazy(() => import('./components/MarketplaceV2.premium'))
const DashboardPremium = lazy(() => import('./components/Dashboard.premium'))
const ProfilePage = lazy(() => import('./components/ProfilePage.premium'))
// Landing page is also lazy-loaded so the very first paint only ships the
// App shell. The landing bundle (Recharts + Framer Motion) downloads in
// parallel and shows a themed loader meanwhile.
const Landing = lazy(() => import('./components/Landing'))

// GitHub brand icon was removed from lucide-react (brand icons dropped).
// Inline SVG keeps the GitHub logo in the footer link without extra deps.
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

const navItems: { id: ActivePage; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-4 w-4" />, color: 'var(--mc-diamond)' },
  { id: 'minecraft', label: 'Play', icon: <Swords className="h-4 w-4" />, color: 'var(--mc-emerald)' },
  { id: 'game', label: 'World', icon: <Gamepad2 className="h-4 w-4" />, color: 'var(--mc-emerald)' },
  { id: 'market', label: 'Trading Hall', icon: <Store className="h-4 w-4" />, color: 'var(--mc-gold)' },
  { id: 'inventory', label: 'Inventory', icon: <Backpack className="h-4 w-4" />, color: 'var(--mc-lapis)' },
  { id: 'terminal', label: 'Command Block', icon: <Terminal className="h-4 w-4" />, color: 'var(--mc-redstone)' },
  { id: 'profile', label: 'Player', icon: <User className="h-4 w-4" />, color: 'var(--mc-gold)' },
]

function Notifications() {
  const notifications = useDeShopStore((s) => s.notifications)
  const removeNotification = useDeShopStore((s) => s.removeNotification)

  if (notifications.length === 0) return null

  return (
    <div className="premium-notifications mc-notifications">
      <AnimatePresence>
        {notifications.slice(-5).map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`premium-toast mc-toast premium-toast--${n.type}`}
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
      animate={{ width: sidebarCollapsed ? 52 : 200 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="premium-sidebar mc-sidebar"
    >
      {/* Logo */}
      <div className="premium-sidebar__brand mc-sidebar__brand">
        <img
          src="/minecraft/logo.png"
          alt="Minecraft"
          style={{ width: 24, height: 24, imageRendering: 'pixelated' }}
        />
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="premium-sidebar__brand-text"
          >
            <span className="premium-sidebar__title mc-sidebar__title">DE-SHOP</span>
            <span className="premium-sidebar__subtitle mc-sidebar__subtitle">⛏ BLOCKCHAIN</span>
          </motion.div>
        )}
      </div>

      {/* Nav items */}
      <nav className="premium-sidebar__nav mc-sidebar__nav">
        {navItems.map((item) => {
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              className={`premium-sidebar__item mc-sidebar__item ${isActive ? 'premium-sidebar__item--active mc-sidebar__item--active' : ''}`}
              onClick={() => setActivePage(item.id)}
              title={item.label}
            >
              <span style={{ color: isActive ? item.color : 'var(--mc-stone, var(--green-dim))' }}>
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
                  className="premium-sidebar__active-bar mc-sidebar__active-bar"
                  style={{ background: item.color }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </nav>

      {/* Status */}
      <div className="premium-sidebar__footer mc-sidebar__footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', width: '100%', gap: 4 }}>
          <div className="premium-sidebar__status mc-sidebar__status">
            <span className={`status-dot mc-status-dot ${activeAddress ? 'connected mc-connected' : 'mc-offline'}`} />
            {!sidebarCollapsed && (
              <span
                className="premium-sidebar__status-text mc-sidebar__status-text"
                style={{ color: activeAddress ? 'var(--mc-emerald, #22c55e)' : 'var(--mc-redstone, #ef4444)' }}
              >
                {activeAddress ? 'Online' : 'Offline'}
              </span>
            )}
          </div>
          {!sidebarCollapsed && <ThemeToggle />}
        </div>
        <button className="premium-sidebar__collapse mc-sidebar__collapse" onClick={toggleSidebar} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {sidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>
    </motion.aside>
  )
}

function Header({ onBackToHome }: { onBackToHome?: () => void }) {
  const { activeAddress, activeWallet } = useWallet()
  const { steamProfile, setShowWalletModal, status, notifications, activePage } = useDeShopStore()
  const addr = activeAddress
    ? `${activeAddress.slice(0, 6)}...${activeAddress.slice(-4)}`
    : null

  const pageLabels: Record<ActivePage, string> = {
    dashboard: 'Village Ledger',
    minecraft: 'Play',
    game: 'World',
    market: 'Trading Hall',
    inventory: 'Inventory',
    terminal: 'Command Block',
    profile: 'Player',
  }

  const unreadCount = notifications.length

  return (
    <header className="premium-header mc-header">
      <div className="premium-header__left mc-header__left">
        {onBackToHome && (
          <button
            className="premium-btn premium-btn--sm premium-header__back"
            onClick={onBackToHome}
            title="Back to landing page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="premium-header__back-label">Home</span>
          </button>
        )}
        {/* Network Badge */}
        <div className="premium-header__network-badge premium-header__network-badge--testnet">
          <Globe className="h-3 w-3" />
          TESTNET
        </div>
        {/* Breadcrumb */}
        <div className="premium-header__breadcrumb">
          <Home className="h-3 w-3" style={{ opacity: 0.5 }} />
          <span className="premium-header__breadcrumb-sep">/</span>
          <span className="premium-header__breadcrumb-current">
            {pageLabels[activePage] || activePage}
          </span>
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
      <div className="premium-header__right mc-header__right">
        <ThemeToggle />
        {/* Notification Bell */}
        <div className="premium-header__bell" title={`${unreadCount} notification${unreadCount !== 1 ? 's' : ''}`}>
          <Bell className="h-3.5 w-3.5" />
          {unreadCount > 0 && (
            <span className="premium-header__bell-badge">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        {steamProfile && (
          <div className="premium-header__steam mc-header__player">
            <img
              src={steamProfile.avatarfull}
              alt="Player"
              style={{ width: 22, height: 22, imageRendering: 'pixelated' }}
            />
            <span style={{ color: 'var(--mc-gold, #fbbf24)', fontSize: 11, fontWeight: 600 }}>{steamProfile.personaname}</span>
          </div>
        )}
        {activeAddress ? (
          <div className="premium-header__wallet-info mc-header__wallet-info">
            <Pickaxe className="h-3.5 w-3.5" style={{ color: 'var(--mc-diamond, #4da6ff)' }} />
            <span className="premium-header__addr">{addr}</span>
            <button
              className="premium-header__disconnect mc-header__disconnect"
              onClick={() => activeWallet?.disconnect()}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            className="premium-btn premium-btn--sm mc-btn-wallet"
            onClick={() => setShowWalletModal(true)}
          >
            <Pickaxe className="h-3.5 w-3.5" />
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  )
}

const pageComponents: Record<ActivePage, React.ComponentType> = {
  dashboard: DashboardPremium,
  minecraft: MinecraftVoxelGame,
  game: GameShowcase,
  market: MarketplaceV2, // Trading Hall — Enhanced Marketplace V2 with advanced filtering & views
  inventory: GameShowcase, // Will use same component with inventory tab active
  terminal: TerminalConsole, // Command Block
  profile: ProfilePage, // Player Profile
}

// Shared suspense fallback — a centered spinning loader in the premium theme.
function PageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full" style={{ minHeight: 240 }}>
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--mc-emerald, #22c55e)' }} />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

// Minecraft palette for animated border: emerald → diamond → gold → redstone → emerald
const mcBorderColors = [
  'var(--mc-emerald, #22c55e)',
  'var(--mc-diamond, #4da6ff)',
  'var(--mc-gold, #fbbf24)',
  'var(--mc-redstone, #ef4444)',
  'var(--mc-emerald, #22c55e)',
]

export default function App() {
  const showWalletModal = useDeShopStore((s) => s.showWalletModal)
  const setShowWalletModal = useDeShopStore((s) => s.setShowWalletModal)
  const activePage = useDeShopStore((s) => s.activePage)
  const notifications = useDeShopStore((s) => s.notifications)
  const { wallets } = useWallet()
  const PageComponent = pageComponents[activePage]

  // ── Landing vs. dashboard view ──
  // The landing page is the first thing visitors see. "Launch App" CTAs flip
  // into the dashboard; the "Home" button in the dashboard header flips back.
  const [view, setView] = useState<'landing' | 'app'>('landing')

  // Scroll back to top whenever we switch views so neither view inherits the
  // other's scroll position.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [view])

  // ── Mobile detection: skip AnimatedBorder wrapper on small screens ──
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Confetti state: triggered on success notifications ──
  const [showConfetti, setShowConfetti] = useState(false)
  const lastTriggeredTsRef = useRef(0)

  useEffect(() => {
    // Find the latest success notification by timestamp
    const successNotifs = notifications.filter((n) => n.type === 'success')
    if (successNotifs.length === 0) return

    const latestSuccess = successNotifs.reduce((a, b) =>
      a.timestamp > b.timestamp ? a : b
    )

    // Only trigger if this success notification is newer than the last one we triggered on
    if (latestSuccess.timestamp > lastTriggeredTsRef.current && !showConfetti) {
      lastTriggeredTsRef.current = latestSuccess.timestamp
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 3200)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [notifications, showConfetti])

  // ── Landing view: render the standalone landing page (no sidebar/header) ──
  if (view === 'landing') {
    return (
      <Suspense
        fallback={
          <div className="ds-landing-fallback" role="status" aria-live="polite">
            <Loader2 className="h-7 w-7 animate-spin" style={{ color: 'var(--mc-emerald, #22c55e)' }} />
            <span>Loading De-Shop SDK…</span>
          </div>
        }
      >
        <Landing onLaunchApp={() => setView('app')} />
      </Suspense>
    )
  }

  // ── Dashboard view ──
  const goHome = () => setView('landing')

  return (
    <div className="premium-app mc-app">
      <ParticleBackground />

      {isMobile ? (
        <Sidebar />
      ) : (
        <AnimatedBorder borderRadius={0} borderWidth={1} colors={mcBorderColors}>
          <Sidebar />
        </AnimatedBorder>
      )}

      <div className="premium-main mc-main">
        <Header onBackToHome={goHome} />
        <div className="premium-content mc-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%' }}
            >
              <PageSuspense>
                <PageComponent />
              </PageSuspense>
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Professional Footer */}
        <footer className="premium-footer">
          <div className="premium-footer__brand">
            <span>⛏ DE-SHOP SDK</span>
            <span style={{ color: 'var(--mc-text-dim)', fontSize: 6 }}>v2.0</span>
          </div>
          <div className="premium-footer__links">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="premium-footer__link">
              <GithubIcon className="h-3 w-3" />
              GitHub
            </a>
            <a href="#" className="premium-footer__link">
              <BookOpen className="h-3 w-3" />
              Docs
            </a>
            <a href="#" className="premium-footer__link">
              <MessageCircle className="h-3 w-3" />
              Discord
            </a>
          </div>
          <div className="premium-footer__status">
            <div className="premium-footer__network">
              <span style={{ width: 5, height: 5, background: 'var(--mc-emerald)', boxShadow: '0 0 4px var(--mc-emerald)' }} />
              Algorand Testnet
            </div>
          </div>
        </footer>
      </div>

      {showWalletModal && (
        <WalletModal wallets={wallets} onClose={() => setShowWalletModal(false)} />
      )}

      <Notifications />

      <ConfettiEffect trigger={showConfetti} />
    </div>
  )
}
