/**
 * De-Shop SDK — Premium Web3 Gaming Landing Page
 * ────────────────────────────────────────────────────────────────────────────
 * A single-page scroll experience with 12 sections, designed for investor
 * demos. Renders BEFORE the existing dashboard; the "Launch App" / "Get
 * Started" CTAs invoke `onLaunchApp` to swap into the dashboard view.
 *
 * Design system: dark theme, emerald/amber gradients, glassmorphism, Framer
 * Motion scroll reveals, CSS-only continuous animations (float/pulse).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  Box,
  BrainCircuit,
  Check,
  ChevronDown,
  Code,
  Coins,
  Copy,
  Cuboid,
  Database,
  Diamond,
  FileText,
  Gamepad2,
  Globe,
  Layers,
  Lock,
  Menu,
  Pickaxe,
  Plug,
  Puzzle,
  Quote,
  Rocket,
  Search,
  Send,
  Server,
  Shield,
  ShoppingBag,
  Sparkles,
  Store,
  Terminal,
  ToyBrick,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { useDeShopStore } from '../store/useDeShopStore'
import { useWallet } from '@txnlab/use-wallet-react'
import WalletModal from './WalletModal.premium'

// ─── Brand SVGs (lucide dropped brand icons in v1) ─────────────────────────

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function TwitterIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function DiscordIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  )
}

// ─── Motion variants ────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

// Reusable viewport config so reveals only animate the first time.
const VIEWPORT = { once: true, amount: 0.2 } as const

// ─── Mock data ──────────────────────────────────────────────────────────────

const HERO_STATS = [
  { label: 'Game Engines', value: '4' },
  { label: 'Assets Minted', value: '10K+' },
  { label: 'Uptime', value: '99.9%' },
  { label: 'Avg Transaction', value: '<2s' },
]

const FEATURES = [
  {
    icon: Zap,
    title: 'Instant Minting',
    desc: 'One-call ASA minting with IPFS-backed metadata. Turn any game asset into a tradable NFT in under 2 seconds.',
    color: 'var(--ds-emerald)',
  },
  {
    icon: Shield,
    title: 'On-Chain Escrow',
    desc: 'Atomic swaps via Algorand smart contracts. Funds release only when both parties confirm — zero counterparty risk.',
    color: 'var(--ds-diamond)',
  },
  {
    icon: BrainCircuit,
    title: 'AI Pricing',
    desc: 'Weighted Least Squares regression with time-decay suggests fair prices from 4 live market signals.',
    color: 'var(--ds-amber)',
  },
  {
    icon: Plug,
    title: 'Cross-Game SDK',
    desc: 'One TypeScript SDK, four runtimes. Inventory and currency move with the player across every supported title.',
    color: 'var(--ds-lapis)',
  },
  {
    icon: Coins,
    title: 'Royalty System',
    desc: 'Creator royalties enforced at the protocol level. Configurable 1–10% on every secondary trade, automatically.',
    color: 'var(--ds-redstone)',
  },
  {
    icon: Gamepad2,
    title: 'Steam Integration',
    desc: 'Verify Steam ownership to unlock gated drops, then mint earned items directly to the player wallet.',
    color: 'var(--ds-emerald)',
  },
]

const ENGINES = [
  { name: 'Unity', tag: 'C# • IL2CPP', icon: Box, desc: 'Drop-in package with native Algorand client. Supports 2021 LTS and newer.' },
  { name: 'Unreal', tag: 'C++ • Blueprints', icon: ToyBrick, desc: 'Plugin with Blueprint nodes for mint, buy, list, and withdraw flows.' },
  { name: 'Minecraft', tag: 'Java Edition', icon: Cuboid, desc: 'Bukkit/Spigot plugin syncs player inventory with on-chain assets in real time.' },
  { name: 'Web', tag: 'React • Vite', icon: Globe, desc: 'First-class TypeScript SDK with React hooks. SSR-friendly, zero native deps.' },
]

const DEMO_SKINS = [
  { name: 'Emerald Dragon', rarity: 'Legendary', price: 4200, hue: 'emerald', emoji: '🐉' },
  { name: 'Diamond Sword', rarity: 'Epic', price: 1850, hue: 'diamond', emoji: '⚔️' },
  { name: 'Golden Crown', rarity: 'Rare', price: 920, hue: 'amber', emoji: '👑' },
  { name: 'Redstone Golem', rarity: 'Common', price: 280, hue: 'redstone', emoji: '🤖' },
] as const

const RARITY_META: Record<string, { color: string; glow: string }> = {
  Legendary: { color: 'var(--ds-amber)', glow: 'rgba(251, 191, 36, 0.18)' },
  Epic: { color: 'var(--ds-diamond)', glow: 'rgba(77, 166, 255, 0.18)' },
  Rare: { color: 'var(--ds-lapis)', glow: 'rgba(99, 102, 241, 0.18)' },
  Common: { color: 'var(--ds-redstone)', glow: 'rgba(239, 68, 68, 0.18)' },
}

const PRICE_TREND = Array.from({ length: 14 }, (_, i) => {
  const base = 38 + Math.sin(i / 2) * 6 + i * 1.4
  const noise = (Math.sin(i * 1.7) * 2.5) + (i % 3 === 0 ? -1.8 : 1.2)
  return {
    day: `D${i + 1}`,
    market: +(base + noise).toFixed(2),
    suggested: +(base + 1.6).toFixed(2),
  }
})

const VOLUME_TREND = Array.from({ length: 12 }, (_, i) => ({
  month: `M${i + 1}`,
  volume: Math.round(24000 + Math.sin(i / 1.6) * 9000 + i * 2200),
  listings: Math.round(140 + Math.cos(i / 2) * 28 + i * 6),
}))

const TESTIMONIALS = [
  {
    quote: 'We shipped our entire NFT marketplace in 3 days. The SDK abstracted away all the wallet plumbing — our Unity team just called mint() and it worked.',
    name: 'Sarah Chen',
    role: 'CTO, Aether Games',
    initials: 'SC',
    color: 'var(--ds-emerald)',
  },
  {
    quote: 'The AI pricing engine alone is worth it. We were manually pricing 4,000 skins a week — now the SDK suggests fair values from market data in real time.',
    name: 'Marcus Okonkwo',
    role: 'Founder, PixelForge',
    initials: 'MO',
    color: 'var(--ds-amber)',
  },
  {
    quote: 'Algorand finality in under 3 seconds meant we could finally do in-game purchases without ruining the player experience. Game-changer.',
    name: 'Lila Vasquez',
    role: 'Lead Engineer, Nexus Studios',
    initials: 'LV',
    color: 'var(--ds-diamond)',
  },
]

const FAQS = [
  {
    q: 'What is De-Shop SDK?',
    a: 'De-Shop SDK is an open-source toolkit for embedding NFT marketplaces directly inside games. It bundles an Algorand smart-contract layer, a Flask backend for indexing and AI pricing, and first-class SDKs for Unity, Unreal, Minecraft, and the web.',
  },
  {
    q: 'Which blockchains are supported?',
    a: 'De-Shop SDK currently runs on Algorand (Testnet and Mainnet). Algorand was chosen for its sub-3-second finality, near-zero fees, and built-in ASA standard — ideal for high-volume game economies. Multi-chain support is on the roadmap.',
  },
  {
    q: 'How does the AI pricing work?',
    a: 'A Weighted Least Squares regression model with time-decay consumes four features: recent trade prices, listing volume, asset rarity tier, and time-since-last-sale. The model retrains nightly and returns a suggested price per asset in <50ms via the Flask API.',
  },
  {
    q: 'Can I use this with my existing game?',
    a: 'Yes. The SDK is engine-agnostic — if your game can make HTTP calls, it can talk to De-Shop. For Unity, Unreal, Minecraft, and web games, we ship native plugins that handle wallet connection, signing, and asset sync out of the box.',
  },
  {
    q: 'What are the fees?',
    a: 'On Testnet, fees are zero. On Mainnet, Algorand\'s standard transaction fee applies (~0.001 ALGO per txn). The SDK itself is free and open-source. Creators can optionally configure a 1–10% royalty on secondary trades, which goes directly to the original creator wallet.',
  },
  {
    q: 'Is there a testnet?',
    a: 'Yes — the SDK ships preconfigured for Algorand Testnet. You get free test ALGO from the Algorand dispenser, mint unlimited test assets, and exercise every marketplace flow without spending real funds. The dashboard you launch from this page runs against Testnet by default.',
  },
]

const DOC_CATEGORIES = [
  { icon: Rocket, title: 'Quick Start', desc: 'Install the SDK, connect a wallet, and mint your first asset in under 5 minutes.', color: 'var(--ds-emerald)' },
  { icon: Code, title: 'API Reference', desc: 'Complete TypeScript API docs for the DeShop client, escrow, and royalty modules.', color: 'var(--ds-diamond)' },
  { icon: FileText, title: 'Smart Contracts', desc: 'Deep dive into the Algorand stateless and stateful contracts powering escrow.', color: 'var(--ds-amber)' },
  { icon: Puzzle, title: 'Game Plugins', desc: 'Per-engine integration guides for Unity, Unreal, Minecraft, and web games.', color: 'var(--ds-lapis)' },
]

// ─── Helper components ──────────────────────────────────────────────────────

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
}: {
  eyebrow: string
  title: string
  subtitle?: string
  align?: 'center' | 'left'
}) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      className={`ds-section__head ${align === 'left' ? 'ds-section__head--left' : ''}`}
    >
      <motion.span variants={itemVariants} className="ds-eyebrow">
        <Sparkles size={12} /> {eyebrow}
      </motion.span>
      <motion.h2 variants={itemVariants} className="ds-section__title">
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p variants={itemVariants} className="ds-section__subtitle">
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  )
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code)
      } else {
        // Fallback for non-secure contexts (older browsers / IP dev)
        const ta = document.createElement('textarea')
        ta.value = code
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* no-op: clipboard unavailable */
    }
  }, [code])

  return (
    <div className="ds-code">
      <div className="ds-code__bar">
        <span className="ds-code__lang">{language}</span>
        <button className="ds-code__copy" onClick={handleCopy} type="button" aria-label="Copy code">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="ds-code__pre">
        <code>{code}</code>
      </pre>
    </div>
  )
}

// ─── Floating NFT cards for the hero ────────────────────────────────────────

const HERO_CARDS = [
  { emoji: '⚔️', label: 'Diamond Sword', hue: 'var(--ds-diamond)', delay: 0, x: -180, y: -120, rotate: -8 },
  { emoji: '🐉', label: 'Emerald Dragon', hue: 'var(--ds-emerald)', delay: 0.6, x: 200, y: -80, rotate: 6 },
  { emoji: '👑', label: 'Golden Crown', hue: 'var(--ds-amber)', delay: 1.2, x: -150, y: 140, rotate: -4 },
  { emoji: '🤖', label: 'Redstone Golem', hue: 'var(--ds-redstone)', delay: 1.8, x: 180, y: 120, rotate: 8 },
]

function FloatingCard({ card }: { card: typeof HERO_CARDS[number] }) {
  return (
    <motion.div
      className="ds-float-card"
      style={{
        left: `calc(50% + ${card.x}px)`,
        top: `calc(50% + ${card.y}px)`,
        '--card-hue': card.hue,
        transform: `translate(-50%, -50%) rotate(${card.rotate}deg)`,
      } as React.CSSProperties}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4 + card.delay, duration: 0.6, ease: 'easeOut' }}
    >
      <span className="ds-float-card__emoji">{card.emoji}</span>
      <span className="ds-float-card__label">{card.label}</span>
      <span className="ds-float-card__chip" />
    </motion.div>
  )
}

// ─── Section components ─────────────────────────────────────────────────────

function Navbar({ onLaunchApp }: { onLaunchApp: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const setShowWalletModal = useDeShopStore((s) => s.setShowWalletModal)
  const { activeAddress } = useWallet()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { href: '#features', label: 'Features' },
    { href: '#marketplace', label: 'Marketplace' },
    { href: '#docs', label: 'Docs' },
    { href: '#pricing', label: 'Pricing' },
  ]

  const handleConnect = () => {
    if (activeAddress) onLaunchApp()
    else setShowWalletModal(true)
  }

  const go = (href: string) => {
    setMobileOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`ds-nav ${scrolled ? 'ds-nav--scrolled' : ''}`}
    >
      <div className="ds-nav__inner">
        <a className="ds-nav__brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          <Pickaxe size={20} style={{ color: 'var(--ds-emerald)' }} />
          <span>De-Shop SDK</span>
        </a>

        <div className="ds-nav__links">
          {links.map((l) => (
            <button key={l.href} className="ds-nav__link" onClick={() => go(l.href)}>
              {l.label}
            </button>
          ))}
        </div>

        <div className="ds-nav__actions">
          <button className="ds-btn ds-btn--ghost ds-btn--sm" onClick={handleConnect}>
            <Wallet size={14} />
            <span className="ds-hide-sm">Connect Wallet</span>
            <span className="ds-hide-md">Wallet</span>
          </button>
          <button className="ds-btn ds-btn--primary ds-btn--sm" onClick={onLaunchApp}>
            <Rocket size={14} />
            Launch App
          </button>
          <button
            className="ds-nav__burger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="ds-nav__mobile"
          >
            {links.map((l) => (
              <button key={l.href} className="ds-nav__mobile-link" onClick={() => go(l.href)}>
                {l.label}
              </button>
            ))}
            <button
              className="ds-btn ds-btn--primary ds-btn--block"
              onClick={() => { setMobileOpen(false); onLaunchApp() }}
            >
              <Rocket size={14} /> Launch App
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

// ─── Section 1: Hero ────────────────────────────────────────────────────────

function Hero({ onLaunchApp }: { onLaunchApp: () => void }) {
  return (
    <section className="ds-hero" id="top">
      <div className="ds-hero__bg" aria-hidden="true">
        <div className="ds-hero__mesh ds-hero__mesh--a" />
        <div className="ds-hero__mesh ds-hero__mesh--b" />
        <div className="ds-hero__mesh ds-hero__mesh--c" />
        <div className="ds-hero__grid" />
      </div>

      <div className="ds-float-cards" aria-hidden="true">
        {HERO_CARDS.map((c) => (
          <FloatingCard key={c.label} card={c} />
        ))}
      </div>

      <motion.div
        className="ds-hero__content"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.span variants={itemVariants} className="ds-eyebrow ds-eyebrow--hero">
          <span className="ds-pulse" /> v2.0 • Built on Algorand
        </motion.span>

        <motion.h1 variants={itemVariants} className="ds-hero__title">
          Build <span className="ds-grad">AI-Powered NFT Marketplaces</span>{' '}
          Directly Inside Your Game
        </motion.h1>

        <motion.p variants={itemVariants} className="ds-hero__subtitle">
          Algorand-powered SDK for Unity, Unreal, Minecraft, and Web Games.
          Mint, trade, and price in-game assets — without leaving the player
          experience.
        </motion.p>

        <motion.div variants={itemVariants} className="ds-hero__cta">
          <button className="ds-btn ds-btn--primary ds-btn--lg" onClick={onLaunchApp}>
            <Rocket size={16} /> Get Started
          </button>
          <a
            className="ds-btn ds-btn--outline ds-btn--lg"
            href="https://github.com/captainRam1413/de-shop-sdk"
            target="_blank"
            rel="noopener noreferrer"
          >
            <BookOpen size={16} /> View Documentation
          </a>
          <button
            className="ds-btn ds-btn--ghost ds-btn--lg"
            onClick={() => document.querySelector('#marketplace')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <Store size={16} /> Explore Marketplace Demo
          </button>
        </motion.div>

        <motion.div variants={itemVariants} className="ds-hero__stats">
          {HERO_STATS.map((s) => (
            <div className="ds-stat" key={s.label}>
              <span className="ds-stat__value">{s.value}</span>
              <span className="ds-stat__label">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      <button
        className="ds-hero__scroll"
        onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
        aria-label="Scroll to features"
      >
        <ChevronDown size={20} />
      </button>
    </section>
  )
}

// ─── Section 2: Features ────────────────────────────────────────────────────

function Features() {
  return (
    <section className="ds-section ds-section--features" id="features">
      <div className="ds-container">
        <SectionHeading
          eyebrow="SDK Features"
          title="Everything you need to ship an in-game economy"
          subtitle="Six battle-tested primitives. Compose them into any marketplace flow you can imagine."
        />
        <motion.div
          className="ds-features-grid"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          {FEATURES.map((f) => (
            <motion.article key={f.title} variants={itemVariants} className="ds-feature">
              <span className="ds-feature__icon" style={{ color: f.color, '--icon-c': f.color } as React.CSSProperties}>
                <f.icon size={22} />
              </span>
              <h3 className="ds-feature__title">{f.title}</h3>
              <p className="ds-feature__desc">{f.desc}</p>
              <span className="ds-feature__glow" style={{ background: f.color }} />
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ─── Section 3: Architecture ────────────────────────────────────────────────

const ARCH_LAYERS = [
  {
    icon: Puzzle,
    title: 'Game Plugins',
    sub: 'Unity · Unreal · Minecraft · Web',
    desc: 'Native SDKs handle wallet connection, signing, and asset sync inside the game loop.',
    color: 'var(--ds-emerald)',
    items: ['TypeScript SDK', 'C# / C++ bindings', 'Real-time inventory sync'],
  },
  {
    icon: Server,
    title: 'Flask Backend',
    sub: 'Indexer · AI Pricing · Auth',
    desc: 'Indexes on-chain events, runs the WLS pricing model, and authenticates Steam sessions.',
    color: 'var(--ds-amber)',
    items: ['Marketplace indexer', 'AI pricing engine', 'Steam OAuth gateway'],
  },
  {
    icon: Database,
    title: 'Algorand Blockchain',
    sub: 'ASAs · Smart Contracts',
    desc: 'Atomic escrow, royalty enforcement, and ASA minting with <3s finality.',
    color: 'var(--ds-diamond)',
    items: ['Atomic escrow', 'Protocol royalties', 'IPFS metadata'],
  },
]

function Architecture() {
  return (
    <section className="ds-section ds-section--arch" id="architecture">
      <div className="ds-container">
        <SectionHeading
          eyebrow="Architecture"
          title="Three layers. Zero infrastructure burden."
          subtitle="The SDK orchestrates game plugins, a Flask backend, and Algorand smart contracts so you can focus on gameplay."
        />
        <motion.div
          className="ds-arch"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          {ARCH_LAYERS.map((layer, i) => (
            <div key={layer.title} className="ds-arch__col">
              <motion.div variants={itemVariants} className="ds-arch__card" style={{ '--layer-c': layer.color } as React.CSSProperties}>
                <div className="ds-arch__icon">
                  <layer.icon size={26} />
                </div>
                <div className="ds-arch__head">
                  <h3>{layer.title}</h3>
                  <span className="ds-arch__sub">{layer.sub}</span>
                </div>
                <p className="ds-arch__desc">{layer.desc}</p>
                <ul className="ds-arch__items">
                  {layer.items.map((it) => (
                    <li key={it}>
                      <Check size={12} /> {it}
                    </li>
                  ))}
                </ul>
              </motion.div>
              {i < ARCH_LAYERS.length - 1 && (
                <div className="ds-arch__flow" aria-hidden="true">
                  <span className="ds-arch__line" />
                  <span className="ds-arch__pulse" />
                  <ArrowRight size={16} className="ds-arch__arrow" />
                </div>
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ─── Section 4: Game engines ────────────────────────────────────────────────

function Engines() {
  return (
    <section className="ds-section ds-section--engines" id="engines">
      <div className="ds-container">
        <SectionHeading
          eyebrow="Supported Engines"
          title="One SDK. Every major game runtime."
          subtitle="Drop the plugin in and start minting. We handle the wallet, signing, and sync."
        />
        <motion.div
          className="ds-engines-grid"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          {ENGINES.map((e) => (
            <motion.article key={e.name} variants={itemVariants} className="ds-engine">
              <div className="ds-engine__head">
                <span className="ds-engine__icon">
                  <e.icon size={22} />
                </span>
                <div>
                  <h3 className="ds-engine__name">{e.name}</h3>
                  <span className="ds-engine__tag">{e.tag}</span>
                </div>
                <span className="ds-engine__badge">
                  <Check size={10} /> Supported
                </span>
              </div>
              <p className="ds-engine__desc">{e.desc}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ─── Section 5: AI Pricing showcase ─────────────────────────────────────────

function AIPricing() {
  const [active, setActive] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setActive(true)
          obs.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const lastPoint = PRICE_TREND[PRICE_TREND.length - 1]

  return (
    <section className="ds-section ds-section--ai" id="pricing">
      <div className="ds-container">
        <div className="ds-ai">
          <motion.div
            className="ds-ai__copy"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            <motion.span variants={itemVariants} className="ds-eyebrow">
              <Bot size={12} /> AI Pricing Engine
            </motion.span>
            <motion.h2 variants={itemVariants} className="ds-section__title ds-section__title--left">
              Fair prices, suggested automatically
            </motion.h2>
            <motion.p variants={itemVariants} className="ds-ai__lead">
              Every listed asset passes through a Weighted Least Squares
              regression model with exponential time-decay. The model learns
              from the last 30 days of trades and re-suggests prices nightly.
            </motion.p>
            <motion.ul variants={itemVariants} className="ds-ai__features">
              <li>
                <TrendingUp size={14} style={{ color: 'var(--ds-emerald)' }} />
                <div>
                  <strong>Recent trade prices</strong>
                  <span>Weighted by recency — newer sales matter more.</span>
                </div>
              </li>
              <li>
                <Layers size={14} style={{ color: 'var(--ds-amber)' }} />
                <div>
                  <strong>Active listing volume</strong>
                  <span>Supply pressure adjusts the suggested price down.</span>
                </div>
              </li>
              <li>
                <Award size={14} style={{ color: 'var(--ds-diamond)' }} />
                <div>
                  <strong>Rarity tier coefficient</strong>
                  <span>Legendary items get a 4× multiplier vs common.</span>
                </div>
              </li>
              <li>
                <Lock size={14} style={{ color: 'var(--ds-redstone)' }} />
                <div>
                  <strong>Time-decay kernel</strong>
                  <span>Stale prices lose 5% influence per day.</span>
                </div>
              </li>
            </motion.ul>
          </motion.div>

          <motion.div
            ref={ref}
            className="ds-ai__chart"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.6 }}
          >
            <div className="ds-chart-head">
              <div>
                <span className="ds-chart-head__label">Suggested Price · 14d</span>
                <span className="ds-chart-head__value">
                  {lastPoint.suggested.toFixed(2)} <small>μALGO</small>
                </span>
              </div>
              <span className="ds-chart-head__tag">
                <BrainCircuit size={12} /> WLS · 4 features
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={PRICE_TREND} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                <RTooltip
                  contentStyle={{
                    background: 'rgba(10, 10, 22, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#e8e8e8',
                  }}
                />
                <ReferenceLine y={lastPoint.suggested} stroke="var(--ds-amber)" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Line
                  type="monotone"
                  dataKey="market"
                  stroke="var(--ds-diamond)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={active}
                  animationDuration={1200}
                  name="Market price"
                />
                <Line
                  type="monotone"
                  dataKey="suggested"
                  stroke="var(--ds-amber)"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={active}
                  animationDuration={1600}
                  name="AI suggested"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="ds-chart-legend">
              <span><i style={{ background: 'var(--ds-diamond)' }} /> Market price</span>
              <span><i style={{ background: 'var(--ds-amber)' }} /> AI suggested</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─── Section 6: Marketplace demo ────────────────────────────────────────────

function MarketplaceDemo({ onLaunchApp }: { onLaunchApp: () => void }) {
  return (
    <section className="ds-section ds-section--market" id="marketplace">
      <div className="ds-container">
        <SectionHeading
          eyebrow="Live Marketplace Demo"
          title="Trade in-game assets without leaving the page"
          subtitle="A working preview of the SDK's marketplace flow. Hit Buy to launch the full dashboard."
        />
        <motion.div
          className="ds-skins-grid"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          {DEMO_SKINS.map((s) => {
            const meta = RARITY_META[s.rarity]
            return (
              <motion.article
                key={s.name}
                variants={itemVariants}
                className="ds-skin"
                style={{ '--rarity-c': meta.color, '--rarity-glow': meta.glow } as React.CSSProperties}
              >
                <span className="ds-skin__rarity">{s.rarity}</span>
                <div className="ds-skin__art">
                  <span className="ds-skin__emoji">{s.emoji}</span>
                  <span className="ds-skin__shimmer" />
                </div>
                <div className="ds-skin__body">
                  <h3 className="ds-skin__name">{s.name}</h3>
                  <div className="ds-skin__row">
                    <span className="ds-skin__price">
                      <Coins size={12} /> {s.price.toLocaleString()} <small>μA</small>
                    </span>
                    <button className="ds-btn ds-btn--primary ds-btn--xs" onClick={onLaunchApp}>
                      <ShoppingBag size={11} /> Buy
                    </button>
                  </div>
                </div>
                <span className="ds-skin__demo-chip">Demo</span>
              </motion.article>
            )
          })}
        </motion.div>
        <div className="ds-section__cta">
          <button className="ds-btn ds-btn--outline" onClick={onLaunchApp}>
            Open full marketplace <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── Section 7: Analytics preview ───────────────────────────────────────────

function AnalyticsPreview() {
  return (
    <section className="ds-section ds-section--analytics" id="analytics">
      <div className="ds-container">
        <SectionHeading
          eyebrow="Analytics Dashboard"
          title="Real-time visibility into your marketplace"
          subtitle="Every trade, listing, and royalty — indexed and visualised. Launch the app to drill in."
        />
        <motion.div
          className="ds-window"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="ds-window__bar">
            <span className="ds-window__dot ds-window__dot--red" />
            <span className="ds-window__dot ds-window__dot--amber" />
            <span className="ds-window__dot ds-window__dot--green" />
            <span className="ds-window__url">
              <Globe size={11} /> app.deshop.sdk / dashboard
            </span>
          </div>
          <div className="ds-window__body">
            <div className="ds-dash-stats">
              <div className="ds-dash-stat">
                <span className="ds-dash-stat__label">Floor Price</span>
                <span className="ds-dash-stat__value">280 <small>μA</small></span>
                <span className="ds-dash-stat__trend ds-dash-stat__trend--up">
                  <TrendingUp size={11} /> +6.2%
                </span>
              </div>
              <div className="ds-dash-stat">
                <span className="ds-dash-stat__label">Active Listings</span>
                <span className="ds-dash-stat__value">1,284</span>
                <span className="ds-dash-stat__trend ds-dash-stat__trend--down">
                  <TrendingUp size={11} style={{ transform: 'rotate(180deg)' }} /> -2.1%
                </span>
              </div>
              <div className="ds-dash-stat">
                <span className="ds-dash-stat__label">24h Volume</span>
                <span className="ds-dash-stat__value">42.8K <small>μA</small></span>
                <span className="ds-dash-stat__trend ds-dash-stat__trend--up">
                  <TrendingUp size={11} /> +14.7%
                </span>
              </div>
              <div className="ds-dash-stat">
                <span className="ds-dash-stat__label">Royalties Paid</span>
                <span className="ds-dash-stat__value">2.1K <small>μA</small></span>
                <span className="ds-dash-stat__trend ds-dash-stat__trend--up">
                  <TrendingUp size={11} /> +3.4%
                </span>
              </div>
            </div>

            <div className="ds-dash-charts">
              <div className="ds-dash-chart">
                <div className="ds-dash-chart__head">
                  <span>Trading Volume</span>
                  <small>last 12 months</small>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={VOLUME_TREND} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dsVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--ds-emerald)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="var(--ds-emerald)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                    <RTooltip
                      contentStyle={{
                        background: 'rgba(10, 10, 22, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        fontSize: 11,
                        color: '#e8e8e8',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      stroke="var(--ds-emerald)"
                      strokeWidth={2}
                      fill="url(#dsVolumeGrad)"
                      isAnimationActive
                      animationDuration={1400}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="ds-dash-chart">
                <div className="ds-dash-chart__head">
                  <span>Active Listings</span>
                  <small>last 12 months</small>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={VOLUME_TREND} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dsListingsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--ds-amber)" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="var(--ds-amber)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                    <RTooltip
                      contentStyle={{
                        background: 'rgba(10, 10, 22, 0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        fontSize: 11,
                        color: '#e8e8e8',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="listings"
                      stroke="var(--ds-amber)"
                      strokeWidth={2}
                      fill="url(#dsListingsGrad)"
                      isAnimationActive
                      animationDuration={1600}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Section 8: Developer experience ────────────────────────────────────────

const DEV_COLUMNS = [
  {
    icon: Zap,
    title: 'Install in 60 seconds',
    desc: 'One npm install. Zero native build steps. SSR-friendly out of the box.',
  },
  {
    icon: Shield,
    title: 'Type-safe SDK',
    desc: 'Full TypeScript types for every method, event, and ABI. Catch bugs at compile time.',
  },
  {
    icon: Terminal,
    title: 'Interactive API explorer',
    desc: 'Browse and call every method from the in-app command block — no Postman required.',
  },
]

const INSTALL_SNIPPET = `# 1. Install the SDK
npm install @deshop/sdk

# 2. Connect a wallet
import { DeShopClient } from '@deshop/sdk'
const shop = new DeShopClient({ network: 'testnet' })
await shop.connect('pera')

# 3. Mint your first asset
const txId = await shop.mint({
  name: 'Emerald Dragon',
  rarity: 'legendary',
  metadataUri: 'ipfs://Qm…'
})`

function DevExperience() {
  return (
    <section className="ds-section ds-section--dev" id="developers">
      <div className="ds-container">
        <SectionHeading
          eyebrow="Developer Experience"
          title="From zero to minted in 60 seconds"
          subtitle="No blockchain experience required. The SDK handles wallets, signing, and retries — you handle the game."
        />
        <div className="ds-dev">
          <motion.div
            className="ds-dev__cols"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT}
          >
            {DEV_COLUMNS.map((c) => (
              <motion.div key={c.title} variants={itemVariants} className="ds-dev__col">
                <span className="ds-dev__icon">
                  <c.icon size={20} />
                </span>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
              </motion.div>
            ))}
          </motion.div>
          <motion.div
            className="ds-dev__code"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.55 }}
          >
            <CodeBlock code={INSTALL_SNIPPET} language="bash" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─── Section 9: Documentation preview ───────────────────────────────────────

function DocsPreview() {
  return (
    <section className="ds-section ds-section--docs" id="docs">
      <div className="ds-container">
        <SectionHeading
          eyebrow="Documentation"
          title="Everything you need, indexed"
          subtitle="From 5-minute quickstarts to deep dives into the Algorand smart contracts."
        />
        <motion.div
          className="ds-docs-search"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.4 }}
        >
          <Search size={16} />
          <input
            type="text"
            placeholder="Search the docs…  try “mint”, “escrow”, “royalty”"
            onFocus={(e) => e.target.blur()}
            readOnly
          />
          <span className="ds-docs-search__kbd">⌘K</span>
        </motion.div>
        <motion.div
          className="ds-docs-grid"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          {DOC_CATEGORIES.map((d) => (
            <motion.a
              key={d.title}
              variants={itemVariants}
              className="ds-doc-card"
              href="https://github.com/captainRam1413/de-shop-sdk"
              target="_blank"
              rel="noopener noreferrer"
              style={{ '--doc-c': d.color } as React.CSSProperties}
            >
              <span className="ds-doc-card__icon">
                <d.icon size={20} />
              </span>
              <h3 className="ds-doc-card__title">{d.title}</h3>
              <p className="ds-doc-card__desc">{d.desc}</p>
              <span className="ds-doc-card__link">
                Read more <ArrowRight size={12} />
              </span>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ─── Section 10: Testimonials ───────────────────────────────────────────────

function Testimonials() {
  return (
    <section className="ds-section ds-section--testimonials" id="testimonials">
      <div className="ds-container">
        <SectionHeading
          eyebrow="Testimonials"
          title="Loved by game studios"
          subtitle="Real teams shipping real economies on top of De-Shop SDK."
        />
        <motion.div
          className="ds-testimonials"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          {TESTIMONIALS.map((t) => (
            <motion.figure key={t.name} variants={itemVariants} className="ds-testimonial">
              <Quote size={20} className="ds-testimonial__quote" />
              <blockquote className="ds-testimonial__text">{t.quote}</blockquote>
              <figcaption className="ds-testimonial__author">
                <span className="ds-testimonial__avatar" style={{ background: t.color }}>
                  {t.initials}
                </span>
                <span className="ds-testimonial__meta">
                  <strong>{t.name}</strong>
                  <small>{t.role}</small>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ─── Section 11: FAQ ────────────────────────────────────────────────────────

function FAQItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={`ds-faq-item ${isOpen ? 'ds-faq-item--open' : ''}`}>
      <button className="ds-faq-item__q" onClick={onToggle} aria-expanded={isOpen}>
        <span>{q}</span>
        <ChevronDown size={16} className="ds-faq-item__icon" />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="ds-faq-item__a-wrap"
          >
            <p className="ds-faq-item__a">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="ds-section ds-section--faq" id="faq">
      <div className="ds-container ds-container--narrow">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions, answered"
          subtitle="Still stuck? Ping us in Discord — we reply within a few hours."
        />
        <motion.div
          className="ds-faq"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT}
        >
          {FAQS.map((f, i) => (
            <FAQItem
              key={f.q}
              q={f.q}
              a={f.a}
              isOpen={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ─── Section 12: Footer ─────────────────────────────────────────────────────

const FOOTER_COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Marketplace', href: '#marketplace' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Analytics', href: '#analytics' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'Quick Start', href: '#docs' },
      { label: 'API Reference', href: '#docs' },
      { label: 'Smart Contracts', href: '#docs' },
      { label: 'Game Plugins', href: '#docs' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#docs' },
      { label: 'Blog', href: 'https://github.com/captainRam1413/de-shop-sdk' },
      { label: 'Status', href: 'https://github.com/captainRam1413/de-shop-sdk' },
      { label: 'Changelog', href: 'https://github.com/captainRam1413/de-shop-sdk' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: 'https://github.com/captainRam1413/de-shop-sdk' },
      { label: 'Careers', href: 'https://github.com/captainRam1413/de-shop-sdk' },
      { label: 'Contact', href: 'https://github.com/captainRam1413/de-shop-sdk' },
      { label: 'Privacy', href: 'https://github.com/captainRam1413/de-shop-sdk' },
    ],
  },
]

function Footer({ onLaunchApp }: { onLaunchApp: () => void }) {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    setSubscribed(true)
    setEmail('')
    setTimeout(() => setSubscribed(false), 4000)
  }

  const go = (href: string) => {
    if (href.startsWith('#')) {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.open(href, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <footer className="ds-footer">
      <div className="ds-container">
        <div className="ds-footer__top">
          <div className="ds-footer__brand-col">
            <a className="ds-footer__brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
              <Pickaxe size={22} style={{ color: 'var(--ds-emerald)' }} />
              <span>De-Shop SDK</span>
            </a>
            <p className="ds-footer__tagline">
              The AI-powered NFT marketplace SDK for game studios. Build
              player-owned economies on Algorand.
            </p>
            <form className="ds-footer__news" onSubmit={subscribe}>
              <label htmlFor="ds-news">Get product updates</label>
              <div className="ds-footer__news-row">
                <input
                  id="ds-news"
                  type="email"
                  placeholder="you@studio.gg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="ds-btn ds-btn--primary ds-btn--sm">
                  {subscribed ? <Check size={14} /> : <Send size={14} />}
                  {subscribed ? 'Subscribed' : 'Subscribe'}
                </button>
              </div>
              {subscribed && <span className="ds-footer__news-ok">You're on the list — see you in the inbox!</span>}
            </form>
            <div className="ds-footer__socials">
              <a href="https://github.com/captainRam1413/de-shop-sdk" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <GithubIcon size={18} />
              </a>
              <a href="https://discord.gg/deshop" target="_blank" rel="noopener noreferrer" aria-label="Discord">
                <DiscordIcon size={18} />
              </a>
              <a href="https://twitter.com/deshopsdk" target="_blank" rel="noopener noreferrer" aria-label="Twitter / X">
                <TwitterIcon size={18} />
              </a>
            </div>
          </div>

          <div className="ds-footer__cols">
            {FOOTER_COLS.map((col) => (
              <div className="ds-footer__col" key={col.title}>
                <h4>{col.title}</h4>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <button type="button" onClick={() => go(l.href)}>
                        {l.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="ds-footer__bottom">
          <span>© {new Date().getFullYear()} De-Shop SDK · MIT License</span>
          <button className="ds-footer__built" onClick={onLaunchApp}>
            <Diamond size={12} style={{ color: 'var(--ds-diamond)' }} /> Built on Algorand
          </button>
        </div>
      </div>
    </footer>
  )
}

// ─── Final CTA band (between FAQ and Footer) ────────────────────────────────

function FinalCTA({ onLaunchApp }: { onLaunchApp: () => void }) {
  return (
    <section className="ds-cta-band">
      <div className="ds-container">
        <motion.div
          className="ds-cta-band__inner"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.55 }}
        >
          <div>
            <h2>Ready to ship your in-game economy?</h2>
            <p>Launch the dashboard, connect a wallet, and mint your first asset in under five minutes.</p>
          </div>
          <div className="ds-cta-band__actions">
            <button className="ds-btn ds-btn--primary ds-btn--lg" onClick={onLaunchApp}>
              <Rocket size={16} /> Launch App
            </button>
            <a
              className="ds-btn ds-btn--outline ds-btn--lg"
              href="https://github.com/captainRam1413/de-shop-sdk"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubIcon size={16} /> Star on GitHub
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Landing root ───────────────────────────────────────────────────────────

export default function Landing({ onLaunchApp }: { onLaunchApp: () => void }) {
  const showWalletModal = useDeShopStore((s) => s.showWalletModal)
  const setShowWalletModal = useDeShopStore((s) => s.setShowWalletModal)
  const { wallets } = useWallet()

  // Lock body scroll while the wallet modal is open
  useEffect(() => {
    if (!showWalletModal) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [showWalletModal])

  return (
    <div className="ds-landing">
      <Navbar onLaunchApp={onLaunchApp} />
      <main>
        <Hero onLaunchApp={onLaunchApp} />
        <Features />
        <Architecture />
        <Engines />
        <AIPricing />
        <MarketplaceDemo onLaunchApp={onLaunchApp} />
        <AnalyticsPreview />
        <DevExperience />
        <DocsPreview />
        <Testimonials />
        <FAQ />
        <FinalCTA onLaunchApp={onLaunchApp} />
        <Footer onLaunchApp={onLaunchApp} />
      </main>
      {showWalletModal && <WalletModal wallets={wallets} onClose={() => setShowWalletModal(false)} />}
    </div>
  )
}
