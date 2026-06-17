'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  Store,
  Package,
  Terminal as TerminalIcon,
  User,
  BookOpen,
  Puzzle,
  Gamepad2,
  Activity,
  Wallet,
  Power,
  Flame,
  Download,
  Github,
  MessageCircle,
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  type LucideIcon,
} from 'lucide-react'
import { useDeShopStore, type ActivePage } from '@/store/useDeShopStore'

/* ===== TRAFFIC LIGHTS ===== */

function TrafficLights() {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className="terminal-dot terminal-dot-red" />
      <span className="terminal-dot terminal-dot-yellow" />
      <span className="terminal-dot terminal-dot-green" />
    </div>
  )
}

/* ===== COMMAND DEFINITIONS ===== */

type CommandCategory = 'Navigation' | 'Action' | 'Quick Link'

interface Command {
  id: string
  name: string
  description: string
  icon: LucideIcon
  category: CommandCategory
  shortcut?: string
  keywords?: string[]
  run: (ctx: CommandContext) => void
}

interface CommandContext {
  setActivePage: (page: ActivePage) => void
  setShowWalletModal: (show: boolean) => void
  connectWallet: (address: string) => void
  disconnectWallet: () => void
  walletConnected: boolean
  addNotification: (type: 'info' | 'success' | 'error' | 'warning', message: string) => void
}

const COMMANDS: Command[] = [
  // ----- Navigation -----
  {
    id: 'nav-dashboard',
    name: 'cd dashboard',
    description: 'Navigate to Dashboard',
    icon: BarChart3,
    category: 'Navigation',
    shortcut: '⌘1',
    keywords: ['home', 'stats', 'overview', 'main'],
    run: (ctx) => ctx.setActivePage('dashboard'),
  },
  {
    id: 'nav-market',
    name: 'cd marketplace',
    description: 'Browse the marketplace',
    icon: Store,
    category: 'Navigation',
    shortcut: '⌘2',
    keywords: ['market', 'shop', 'buy', 'sell', 'assets', 'nft'],
    run: (ctx) => ctx.setActivePage('market'),
  },
  {
    id: 'nav-inventory',
    name: 'cd inventory',
    description: 'View your inventory & mint forge',
    icon: Package,
    category: 'Navigation',
    shortcut: '⌘3',
    keywords: ['items', 'forge', 'mint', 'assets'],
    run: (ctx) => ctx.setActivePage('inventory'),
  },
  {
    id: 'nav-terminal',
    name: 'cd terminal',
    description: 'Open the interactive terminal',
    icon: TerminalIcon,
    category: 'Navigation',
    shortcut: '⌘4',
    keywords: ['cli', 'console', 'shell', 'command'],
    run: (ctx) => ctx.setActivePage('terminal'),
  },
  {
    id: 'nav-profile',
    name: 'cd profile',
    description: 'View your profile & achievements',
    icon: User,
    category: 'Navigation',
    shortcut: '⌘5',
    keywords: ['user', 'account', 'achievements', 'wallet'],
    run: (ctx) => ctx.setActivePage('profile'),
  },
  {
    id: 'nav-docs',
    name: 'cd docs',
    description: 'Read the SDK documentation',
    icon: BookOpen,
    category: 'Navigation',
    shortcut: '⌘6',
    keywords: ['documentation', 'help', 'guide', 'api', 'reference'],
    run: (ctx) => ctx.setActivePage('docs'),
  },
  {
    id: 'nav-plugins',
    name: 'cd plugins',
    description: 'Browse and download plugins',
    icon: Puzzle,
    category: 'Navigation',
    shortcut: '⌘7',
    keywords: ['extensions', 'mods', 'addons', 'download'],
    run: (ctx) => ctx.setActivePage('plugins'),
  },
  {
    id: 'nav-game',
    name: 'cd arcade',
    description: 'Play terminal mini-games',
    icon: Gamepad2,
    category: 'Navigation',
    shortcut: '⌘8',
    keywords: ['game', 'games', 'snake', 'typing', 'clicker', 'play'],
    run: (ctx) => ctx.setActivePage('game'),
  },
  {
    id: 'nav-notifications',
    name: 'cd activity',
    description: 'Open the live activity center',
    icon: Activity,
    category: 'Navigation',
    shortcut: '⌘9',
    keywords: ['activity', 'events', 'live', 'feed', 'realtime', 'notifications', 'log', 'stream'],
    run: (ctx) => ctx.setActivePage('notifications'),
  },

  // ----- Actions -----
  {
    id: 'act-connect-wallet',
    name: 'connect wallet',
    description: 'Connect your Algorand wallet',
    icon: Wallet,
    category: 'Action',
    keywords: ['pera', 'defly', 'algorand', 'login', 'auth'],
    run: (ctx) => {
      if (ctx.walletConnected) {
        ctx.addNotification('info', 'Wallet already connected')
        return
      }
      ctx.setShowWalletModal(true)
    },
  },
  {
    id: 'act-disconnect-wallet',
    name: 'disconnect wallet',
    description: 'Disconnect the current wallet',
    icon: Power,
    category: 'Action',
    keywords: ['logout', 'sign out', 'revoke'],
    run: (ctx) => {
      if (!ctx.walletConnected) {
        ctx.addNotification('info', 'No wallet connected')
        return
      }
      ctx.disconnectWallet()
      ctx.addNotification('info', 'Wallet disconnected')
    },
  },
  {
    id: 'act-mint-nft',
    name: 'mint nft',
    description: 'Open the mint forge in inventory',
    icon: Flame,
    category: 'Action',
    keywords: ['forge', 'create', 'spawn', 'issue'],
    run: (ctx) => {
      ctx.setActivePage('inventory')
      ctx.addNotification('info', 'Mint forge ready in inventory')
    },
  },
  {
    id: 'act-view-docs',
    name: 'view docs',
    description: 'Open the SDK documentation',
    icon: BookOpen,
    category: 'Action',
    keywords: ['read', 'help', 'guide'],
    run: (ctx) => ctx.setActivePage('docs'),
  },
  {
    id: 'act-download-plugin',
    name: 'download plugin',
    description: 'Browse downloadable plugins',
    icon: Download,
    category: 'Action',
    keywords: ['install', 'extension', 'addon'],
    run: (ctx) => {
      ctx.setActivePage('plugins')
      ctx.addNotification('info', 'Browsing plugin catalog...')
    },
  },

  // ----- Quick Links -----
  {
    id: 'link-github',
    name: 'open github',
    description: 'Open the project repository',
    icon: Github,
    category: 'Quick Link',
    keywords: ['repo', 'source', 'code', 'git'],
    run: () => {
      if (typeof window !== 'undefined') {
        window.open('https://github.com', '_blank', 'noopener,noreferrer')
      }
    },
  },
  {
    id: 'link-discord',
    name: 'open discord',
    description: 'Join the community Discord',
    icon: MessageCircle,
    category: 'Quick Link',
    keywords: ['chat', 'community', 'support'],
    run: () => {
      if (typeof window !== 'undefined') {
        window.open('https://discord.com', '_blank', 'noopener,noreferrer')
      }
    },
  },
]

/* ===== FUZZY SEARCH ===== */

/**
 * Returns a match score (lower = better) or -1 if no match.
 * Algorithm: subsequence fuzzy match with bonus for consecutive matches
 * and matches at word boundaries.
 */
function fuzzyScore(query: string, target: string): number {
  if (!query) return 0
  const q = query.toLowerCase()
  const t = target.toLowerCase()

  // Exact substring match → very strong
  const subIdx = t.indexOf(q)
  if (subIdx !== -1) {
    // Earlier matches score better
    return subIdx === 0 ? 0 : 1 + subIdx * 0.01
  }

  // Subsequence match
  let qi = 0
  let score = 2 // base penalty for non-substring
  let lastMatch = -1
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // Bonus for consecutive
      if (lastMatch === ti - 1) {
        score -= 0.1
      }
      // Bonus for word boundary
      if (ti === 0 || t[ti - 1] === ' ' || t[ti - 1] === '_' || t[ti - 1] === '-' || t[ti - 1] === '/') {
        score -= 0.2
      }
      lastMatch = ti
      qi++
    }
  }

  return qi === q.length ? score + (t.length - q.length) * 0.001 : -1
}

interface ScoredCommand {
  cmd: Command
  score: number
}

function scoreCommand(query: string, cmd: Command): number {
  const nameScore = fuzzyScore(query, cmd.name)
  const descScore = fuzzyScore(query, cmd.description)
  const kwScore = cmd.keywords
    ? Math.min(...cmd.keywords.map((k) => fuzzyScore(query, k)).filter((s) => s >= 0))
    : -1

  const candidates = [nameScore, descScore, kwScore].filter((s) => s >= 0)
  if (candidates.length === 0) return -1
  // Prefer name matches, then description, then keywords
  if (nameScore >= 0) return nameScore * 0.5
  if (descScore >= 0) return descScore * 0.8
  return kwScore
}

/* ===== RECENT COMMANDS (localStorage) ===== */

const RECENT_KEY = 'deshop-cmd-palette-recent'
const MAX_RECENT = 5

function loadRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

function saveRecent(ids: string[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)))
  } catch {
    /* ignore quota errors */
  }
}

/* ===== CATEGORY STYLING ===== */

const CATEGORY_STYLE: Record<CommandCategory, { label: string; color: string }> = {
  Navigation: { label: 'NAV', color: 'text-term-green' },
  Action: { label: 'ACT', color: 'text-term-amber' },
  'Quick Link': { label: 'URL', color: 'text-term-cyan' },
}

/* ===== TRAFFIC LIGHT HEADER (chrome) ===== */

/* ===== MAIN COMPONENT ===== */

export default function CommandPalette() {
  const open = useDeShopStore((s) => s.commandPaletteOpen)
  const setOpen = useDeShopStore((s) => s.setCommandPaletteOpen)
  const setActivePage = useDeShopStore((s) => s.setActivePage)
  const setShowWalletModal = useDeShopStore((s) => s.setShowWalletModal)
  const connectWallet = useDeShopStore((s) => s.connectWallet)
  const disconnectWallet = useDeShopStore((s) => s.disconnectWallet)
  const walletConnected = useDeShopStore((s) => s.walletConnected)
  const addNotification = useDeShopStore((s) => s.addNotification)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const ctx: CommandContext = useMemo(
    () => ({
      setActivePage,
      setShowWalletModal,
      connectWallet,
      disconnectWallet,
      walletConnected,
      addNotification,
    }),
    [setActivePage, setShowWalletModal, connectWallet, disconnectWallet, walletConnected, addNotification]
  )

  /* ----- Global Cmd+K / Ctrl+K listener ----- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        e.stopPropagation()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setOpen])

  /* ----- Load recent commands on mount ----- */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only localStorage hydration (avoid SSR mismatch)
    setRecent(loadRecent())
  }, [])

  /* ----- Focus input + reset query when opened ----- */
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional UX reset when palette opens
      setQuery('')
      setSelectedIndex(0)
      // Defer focus to next tick so input is mounted
      const t = setTimeout(() => {
        inputRef.current?.focus()
      }, 30)
      return () => clearTimeout(t)
    }
  }, [open])

  /* ----- Filtered & scored commands ----- */
  const filtered: ScoredCommand[] = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim()
    return COMMANDS
      .map((cmd) => ({ cmd, score: scoreCommand(q, cmd) }))
      .filter((s) => s.score >= 0)
      .sort((a, b) => a.score - b.score)
  }, [query])

  const displayed: Command[] = useMemo(() => {
    if (!query.trim()) {
      // Show recent first, then all others (deduped)
      const recentCmds = recent
        .map((id) => COMMANDS.find((c) => c.id === id))
        .filter((c): c is Command => Boolean(c))
      const recentIds = new Set(recentCmds.map((c) => c.id))
      const rest = COMMANDS.filter((c) => !recentIds.has(c.id))
      return [...recentCmds, ...rest]
    }
    return filtered.map((s) => s.cmd)
  }, [query, filtered, recent])

  /* ----- Reset selected index when results change ----- */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional UX reset when search results change
    setSelectedIndex(0)
  }, [query])

  /* ----- Scroll selected item into view ----- */
  useEffect(() => {
    if (!open) return
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIndex] as HTMLElement | undefined
    if (item) {
      item.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex, open])

  /* ----- Execute a command ----- */
  const executeCommand = useCallback(
    (cmd: Command) => {
      cmd.run(ctx)
      // Update recents
      const next = [cmd.id, ...recent.filter((id) => id !== cmd.id)].slice(0, MAX_RECENT)
      setRecent(next)
      saveRecent(next)
      setOpen(false)
    },
    [ctx, recent, setOpen]
  )

  /* ----- Keyboard navigation inside the palette ----- */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % Math.max(1, displayed.length))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + Math.max(1, displayed.length)) % Math.max(1, displayed.length))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = displayed[selectedIndex]
        if (cmd) executeCommand(cmd)
        return
      }
      if (e.key === 'Tab') {
        // Autocomplete: if there's exactly one result (or a clear top match), fill the input
        e.preventDefault()
        if (displayed.length > 0) {
          const cmd = displayed[selectedIndex] ?? displayed[0]
          if (cmd && cmd.name !== query) {
            setQuery(cmd.name)
          }
        }
        return
      }
    },
    [displayed, selectedIndex, executeCommand, setOpen, query]
  )

  /* ----- Grouped display for the "no query" view (Recent / All) ----- */
  const hasQuery = query.trim().length > 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="terminal-card w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Chrome header */}
            <div className="terminal-card-header">
              <TrafficLights />
              <span className="terminal-title">command_palette.sh</span>
              <span className="ml-auto text-[9px] font-terminal text-term-dim border border-[#444] px-1.5 py-0.5 rounded-sm hidden sm:inline">
                ⌘K
              </span>
            </div>

            {/* Search input */}
            <div className="relative border-b border-[#444444]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-term-green text-sm font-terminal prompt-prefix">
                $
              </span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="type a command... (e.g. cd marketplace, mint nft)"
                className="terminal-glow-input border-0 rounded-none"
                style={{ paddingLeft: '28px', paddingRight: '12px' }}
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            {/* Results list */}
            <div
              ref={listRef}
              className="max-h-[320px] overflow-y-auto py-1"
            >
              {displayed.length === 0 && hasQuery && (
                <div className="px-4 py-8 text-center text-term-dim text-xs font-terminal">
                  <span className="text-term-red">✗</span> no matching commands for{' '}
                  <span className="text-term-amber">&quot;{query}&quot;</span>
                </div>
              )}

              {/* Render with staggered animation */}
              <AnimatePresence mode="popLayout">
                {displayed.map((cmd, idx) => {
                  const Icon = cmd.icon
                  const isActive = idx === selectedIndex
                  const catStyle = CATEGORY_STYLE[cmd.category]
                  const isRecent = !hasQuery && recent.includes(cmd.id)
                  return (
                    <motion.div
                      key={cmd.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -2 }}
                      transition={{ duration: 0.12, delay: Math.min(idx * 0.015, 0.15) }}
                      className={`cmd-palette-item ${isActive ? 'active' : ''}`}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <Icon className="cmd-palette-icon w-3.5 h-3.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-terminal truncate">{cmd.name}</span>
                          {isRecent && (
                            <span className="terminal-tag border-term-amber/40 text-term-amber bg-[rgba(255,184,0,0.06)]">
                              recent
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-term-dim truncate font-terminal">
                          {cmd.description}
                        </div>
                      </div>
                      <span
                        className={`terminal-tag border-[#444] ${catStyle.color} bg-[#1E1E1E] flex-shrink-0`}
                      >
                        {catStyle.label}
                      </span>
                      {cmd.shortcut && (
                        <span className="cmd-palette-kbd flex-shrink-0">{cmd.shortcut}</span>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>

            {/* Footer hints */}
            <div className="border-t border-[#444444] px-3 py-2 flex items-center justify-between bg-[#252525]">
              <div className="flex items-center gap-3 text-[9px] font-terminal text-term-dim">
                <span className="flex items-center gap-1">
                  <ArrowUp size={10} />
                  <ArrowDown size={10} />
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft size={10} />
                  execute
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownRight size={10} />
                  <span>tab</span>
                  autocomplete
                </span>
                <span className="flex items-center gap-1">
                  <span className="cmd-palette-kbd">esc</span>
                  close
                </span>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-terminal text-term-dim">
                <Search size={10} />
                <span>{displayed.length} cmd{displayed.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
