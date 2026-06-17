'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings as SettingsIcon,
  Palette,
  Monitor,
  Bell,
  Shield,
  Info,
  Check,
  Download,
  Trash2,
  RotateCcw,
  Github,
  FileText,
  MessageCircle,
  LifeBuoy,
  RefreshCw,
  Loader2,
  Volume2,
  AlertTriangle,
  X,
  Network,
  DollarSign,
  Zap,
  Hash,
  Trophy,
  Cpu,
  Sparkles,
  ExternalLink,
  GraduationCap,
  Tv,
} from 'lucide-react'
import {
  useDeShopStore,
  TERMINAL_THEMES,
  type TerminalTheme,
} from '@/store/useDeShopStore'
import { useGameScores, type ScoreGame } from '@/hooks/useGameScores'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/* ============================================================ */
/* SHARED UI                                                     */
/* ============================================================ */

function TrafficLights() {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <span className="terminal-dot terminal-dot-red" />
      <span className="terminal-dot terminal-dot-yellow" />
      <span className="terminal-dot terminal-dot-green" />
    </div>
  )
}

/* ============================================================ */
/* THEME PREVIEW CONFIG                                          */
/* ============================================================ */

interface ThemePreviewColors {
  bg: string
  surface: string
  elevated: string
  border: string
  primary: string
  text: string
  dim: string
  amber: string
  cyan: string
  magenta: string
}

const THEME_PREVIEW: Record<TerminalTheme, ThemePreviewColors> = {
  'pro-dark': {
    bg: '#1E1E1E', surface: '#2D2D2D', elevated: '#3D3D3D', border: '#444444',
    primary: '#33FF33', text: '#CCCCCC', dim: '#888888',
    amber: '#FFB800', cyan: '#00D4FF', magenta: '#FF00FF',
  },
  light: {
    bg: '#F5F5F0', surface: '#FFFFFF', elevated: '#E8E8E0', border: '#D0D0C8',
    primary: '#006600', text: '#333333', dim: '#888888',
    amber: '#B87000', cyan: '#0066AA', magenta: '#AA00AA',
  },
  matrix: {
    bg: '#000000', surface: '#001100', elevated: '#002200', border: '#003300',
    primary: '#00FF00', text: '#00CC00', dim: '#006600',
    amber: '#88FF00', cyan: '#00FF88', magenta: '#00FFCC',
  },
  phosphor: {
    bg: '#0A0A0A', surface: '#111111', elevated: '#1A1A1A', border: '#1A3A1A',
    primary: '#88FF88', text: '#88FF88', dim: '#446644',
    amber: '#BBFFBB', cyan: '#88FFAA', magenta: '#AAFFAA',
  },
  amber: {
    bg: '#1A0F00', surface: '#2A1A00', elevated: '#3A2A00', border: '#4A3A00',
    primary: '#FFB800', text: '#FFCC44', dim: '#8B5E00',
    amber: '#FFB800', cyan: '#FFCC66', magenta: '#FF9944',
  },
}

/* ============================================================ */
/* THEME PREVIEW CARD                                            */
/* ============================================================ */

function ThemePreviewCard({
  themeId,
  name,
  tagline,
  isSelected,
  onSelect,
}: {
  themeId: TerminalTheme
  name: string
  tagline: string
  isSelected: boolean
  onSelect: () => void
}) {
  const c = THEME_PREVIEW[themeId]
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className={cn('theme-preview-card text-left', isSelected && 'selected')}
      style={{
        '--preview-bg': c.bg,
        '--preview-text': c.text,
        '--preview-border': c.border,
      } as React.CSSProperties}
    >
      {isSelected && (
        <span className="theme-check">
          <Check size={12} strokeWidth={3} />
        </span>
      )}

      {/* Mini terminal preview */}
      <div
        className="theme-preview-mini"
        style={{
          background: c.bg,
          color: c.text,
          borderColor: c.border,
        }}
      >
        <div
          className="theme-preview-mini-header"
          style={{ borderBottomColor: c.border }}
        >
          <span
            className="theme-preview-mini-dot"
            style={{ background: '#FF5F56' }}
          />
          <span
            className="theme-preview-mini-dot"
            style={{ background: '#FFBD2E' }}
          />
          <span
            className="theme-preview-mini-dot"
            style={{ background: themeId === 'light' ? '#1AAB29' : '#27C93F' }}
          />
          <span
            style={{
              marginLeft: 6,
              color: c.dim,
              fontSize: 7,
            }}
          >
            {themeId}.sh
          </span>
        </div>
        <div style={{ color: c.primary }}>
          <span style={{ color: c.dim }}>$ </span>ls -la
        </div>
        <div style={{ color: c.text }}>
          <span style={{ color: c.cyan }}>README</span>{' '}
          <span style={{ color: c.magenta }}>config/</span>
        </div>
        <div style={{ color: c.text }}>
          <span style={{ color: c.amber }}>assets/</span>{' '}
          <span style={{ color: c.primary }}>sdk.ts</span>
        </div>
        <div style={{ color: c.primary }}>
          <span style={{ color: c.dim }}>$ </span>
          <span
            style={{
              display: 'inline-block',
              width: 5,
              height: 8,
              background: c.primary,
              marginLeft: 1,
              verticalAlign: 'middle',
              animation: 'blink 1s step-end infinite',
            }}
          />
        </div>
      </div>

      {/* Label & swatches */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'text-xs font-bold font-terminal',
              isSelected ? 'text-term-green' : 'text-term-text'
            )}
          >
            {name}
          </span>
          {isSelected && (
            <span className="text-[9px] text-term-green font-terminal">
              [ACTIVE]
            </span>
          )}
        </div>
        <div className="text-[9px] text-term-dim mt-0.5 font-terminal leading-snug">
          {tagline}
        </div>
        {/* Color swatches */}
        <div className="flex gap-1 mt-2">
          {(['bg', 'surface', 'primary', 'text', 'amber', 'cyan'] as const).map((k) => (
            <span
              key={k}
              title={k}
              className="block w-4 h-4 border border-term rounded-sm"
              style={{
                background: c[k],
                borderColor: c.border,
              }}
            />
          ))}
        </div>
      </div>
    </motion.button>
  )
}

/* ============================================================ */
/* SECTION CARD                                                  */
/* ============================================================ */

function SectionCard({
  file,
  icon: Icon,
  title,
  children,
  delay = 0,
}: {
  file: string
  icon: React.ElementType
  title: string
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="terminal-card terminal-card-glow"
    >
      <div className="terminal-card-header">
        <TrafficLights />
        <Icon size={13} className="text-term-green ml-2" />
        <span className="terminal-title text-left flex-1">
          {file}
        </span>
        <span className="text-term-dim text-[9px] font-terminal hidden sm:inline">
          {`// ${title}`}
        </span>
      </div>
      <div className="terminal-card-body space-y-4">
        {children}
      </div>
    </motion.div>
  )
}

/* ============================================================ */
/* SETTING ROW                                                   */
/* ============================================================ */

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: React.ElementType
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-term last:border-b-0">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <Icon size={14} className="text-term-cyan mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-xs font-terminal text-term-text font-bold">
            {label}
          </div>
          {description && (
            <div className="text-[10px] text-term-dim mt-0.5 font-terminal">
              {description}
            </div>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

/* ============================================================ */
/* CONFIRM MODAL                                                 */
/* ============================================================ */

interface ConfirmConfig {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  danger?: boolean
}

function ConfirmModal({
  config,
  onClose,
}: {
  config: ConfirmConfig
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="confirm-modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="terminal-card w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="terminal-card-header">
          <TrafficLights />
          <AlertTriangle
            size={13}
            className={config.danger ? 'text-term-red ml-2' : 'text-term-amber ml-2'}
          />
          <span className="terminal-title text-left flex-1">
            {config.danger ? 'danger_confirm.sh' : 'confirm.sh'}
          </span>
          <button
            onClick={onClose}
            className="text-term-dim hover:text-term-red"
            aria-label="Close"
          >
            <X size={12} />
          </button>
        </div>
        <div className="terminal-card-body space-y-4">
          <div>
            <div className="text-sm font-terminal font-bold text-term-text mb-2">
              <span className="prompt-prefix">$ </span>
              {config.title}
            </div>
            <div className="text-xs text-term-dim font-terminal leading-relaxed">
              {config.message}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="terminal-btn text-xs"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                config.onConfirm()
                onClose()
              }}
              className={cn(
                'terminal-btn text-xs',
                config.danger ? 'terminal-btn-danger' : 'terminal-btn-primary'
              )}
            >
              {config.confirmLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ============================================================ */
/* MAIN SETTINGS PAGE                                            */
/* ============================================================ */

type NetworkId = 'testnet' | 'mainnet' | 'betanet'
type CurrencyId = 'ALGO' | 'USD' | 'EUR'
type RefreshId = '5' | '10' | '30' | 'off'
type ConfirmationsId = '1' | '3' | '5' | '10'

const STORAGE_KEY = 'deshop-settings'

interface PersistedSettings {
  network: NetworkId
  currency: CurrencyId
  refreshInterval: RefreshId
  confirmations: ConfirmationsId
  notifications: {
    priceAlerts: boolean
    tradeNotifications: boolean
    newListings: boolean
    achievementUnlocks: boolean
    systemMessages: boolean
    soundEffects: boolean
    desktopNotifications: boolean
  }
}

const DEFAULT_SETTINGS: PersistedSettings = {
  network: 'testnet',
  currency: 'ALGO',
  refreshInterval: '10',
  confirmations: '3',
  notifications: {
    priceAlerts: true,
    tradeNotifications: true,
    newListings: true,
    achievementUnlocks: true,
    systemMessages: false,
    soundEffects: true,
    desktopNotifications: false,
  },
}

function loadSettings(): PersistedSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...(parsed.notifications ?? {}),
      },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function persistSettings(s: PersistedSettings) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export default function SettingsPage() {
  const theme = useDeShopStore((s) => s.theme)
  const setTheme = useDeShopStore((s) => s.setTheme)
  const addNotification = useDeShopStore((s) => s.addNotification)
  const tourSeen = useDeShopStore((s) => s.tourSeen)
  const setTourSeen = useDeShopStore((s) => s.setTourSeen)
  const setTourActive = useDeShopStore((s) => s.setTourActive)
  const crtFlicker = useDeShopStore((s) => s.crtFlicker)
  const setCrtFlicker = useDeShopStore((s) => s.setCrtFlicker)

  const { scores, resetScores } = useGameScores()
  const gamesPlayed = scores.gamesPlayed

  /* ----- Persisted settings ----- */
  const [settings, setSettings] = useState<PersistedSettings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Client-only localStorage hydration — intentional setState in effect
    // to avoid SSR/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings())
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) persistSettings(settings)
  }, [settings, loaded])

  const updateSetting = useCallback(
    <K extends keyof PersistedSettings>(key: K, value: PersistedSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const updateNotification = useCallback(
    (key: keyof PersistedSettings['notifications'], value: boolean) => {
      setSettings((prev) => ({
        ...prev,
        notifications: { ...prev.notifications, [key]: value },
      }))
    },
    []
  )

  /* ----- Desktop notification permission ----- */
  const [desktopPerm, setDesktopPerm] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    // Client-only browser API hydration — intentional setState in effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDesktopPerm(Notification.permission)
  }, [])

  const requestDesktopPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      addNotification('warning', 'Desktop notifications not supported in this browser')
      return
    }
    try {
      const result = await Notification.requestPermission()
      setDesktopPerm(result)
      if (result === 'granted') {
        updateNotification('desktopNotifications', true)
        addNotification('success', 'Desktop notifications enabled')
        new Notification('De-Shop SDK', {
          body: 'Desktop notifications are now enabled.',
        })
      } else if (result === 'denied') {
        addNotification('warning', 'Desktop notifications blocked by browser')
      }
    } catch {
      addNotification('error', 'Failed to request notification permission')
    }
  }, [addNotification, updateNotification])

  /* ----- Theme picker ----- */
  const handleSelectTheme = useCallback(
    (id: TerminalTheme) => {
      if (id === theme) return
      setTheme(id)
      const meta = TERMINAL_THEMES.find((t) => t.id === id)
      addNotification('success', `Theme applied: ${meta?.name ?? id}`)
    },
    [theme, setTheme, addNotification]
  )

  /* ----- Confirm modal ----- */
  const [confirmModal, setConfirmModal] = useState<ConfirmConfig | null>(null)

  /* ----- Update check simulation ----- */
  const [checking, setChecking] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'latest' | 'available'>('idle')

  const handleCheckUpdates = useCallback(async () => {
    setChecking(true)
    setUpdateStatus('idle')
    await new Promise((r) => setTimeout(r, 1800))
    setChecking(false)
    // Simulated: always latest
    setUpdateStatus('latest')
    addNotification('info', 'You are running the latest version (v2.0.4)')
  }, [addNotification])

  /* ----- Actions ----- */
  const handleClearCache = useCallback(() => {
    setConfirmModal({
      title: 'Clear local cache?',
      message:
        'This will remove cached API responses, marketplace listings, and dashboard stats from localStorage. Your wallet and game scores will be preserved.',
      confirmLabel: 'Clear Cache',
      onConfirm: () => {
        const keysToKeep = new Set([
          STORAGE_KEY,
          'deshop-theme',
          'deshop-game-scores',
          'deshop-clicker-state',
          'deshop-cmd-palette-recent',
        ])
        if (typeof window !== 'undefined') {
          const keys = Object.keys(window.localStorage)
          keys.forEach((k) => {
            if (!keysToKeep.has(k)) {
              try {
                window.localStorage.removeItem(k)
              } catch {
                /* ignore */
              }
            }
          })
        }
        addNotification('success', 'Local cache cleared')
      },
    })
  }, [addNotification])

  const handleExportSettings = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: '2.0.4',
      theme,
      settings,
      gameScores: { ...scores, gamesPlayed },
    }
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `deshop-settings-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addNotification('success', 'Settings exported to JSON')
    } catch {
      addNotification('error', 'Failed to export settings')
    }
  }, [theme, settings, scores, gamesPlayed, addNotification])

  const handleResetAll = useCallback(() => {
    setConfirmModal({
      title: 'Reset ALL settings?',
      message:
        'This will restore default settings, reset theme to Pro Dark, clear local cache, and WIPE all game scores. This action cannot be undone.',
      confirmLabel: 'Reset Everything',
      danger: true,
      onConfirm: () => {
        setSettings(DEFAULT_SETTINGS)
        setTheme('pro-dark')
        resetScores()
        const keysToKeep = new Set([
          'deshop-theme',
          'deshop-cmd-palette-recent',
        ])
        if (typeof window !== 'undefined') {
          const keys = Object.keys(window.localStorage)
          keys.forEach((k) => {
            if (!keysToKeep.has(k)) {
              try {
                window.localStorage.removeItem(k)
              } catch {
                /* ignore */
              }
            }
          })
        }
        addNotification('success', 'All settings reset to defaults')
      },
    })
  }, [setTheme, resetScores, addNotification])

  const handleClearGameScores = useCallback(() => {
    setConfirmModal({
      title: 'Clear game scores?',
      message:
        'This will erase all high scores, games-played counters, and the Number Guess leaderboard. Your in-progress clicker state will be preserved.',
      confirmLabel: 'Clear Scores',
      danger: true,
      onConfirm: () => {
        resetScores()
        addNotification('success', 'Game scores cleared')
      },
    })
  }, [resetScores, addNotification])

  /* ----- Game scores summary ----- */
  const gameScoreRows: { id: ScoreGame; label: string; value: string }[] = useMemo(
    () => [
      { id: 'snake', label: 'Snake', value: `${scores.snake} food` },
      { id: 'typing', label: 'Typing Test', value: `${scores.typing} WPM` },
      { id: 'guess', label: 'Number Guess', value: `${scores.guess} attempts` },
      {
        id: 'clicker',
        label: 'Hacker Clicker',
        value: `${scores.clicker.toLocaleString()} hashes`,
      },
    ],
    [scores]
  )

  const totalGamesPlayed = useMemo(
    () =>
      Object.values(gamesPlayed).reduce((sum, n) => sum + n, 0),
    [gamesPlayed]
  )

  /* ----- SDK meta ----- */
  const sdkMeta = useMemo(
    () => ({
      version: '2.0.4',
      build: 'a7f3e2c',
      builtAt: '2026-06-17T08:42:00Z',
      protocol: 'algorand-sdk@2.7.0',
      license: 'MIT',
    }),
    []
  )

  /* ----- About links ----- */
  const aboutLinks = useMemo(
    () => [
      { label: 'GitHub', href: 'https://github.com', icon: Github, color: 'text-term-green' },
      { label: 'Docs', href: '#', icon: FileText, color: 'text-term-cyan' },
      { label: 'Discord', href: '#', icon: MessageCircle, color: 'text-term-magenta' },
      { label: 'Support', href: '#', icon: LifeBuoy, color: 'text-term-amber' },
    ],
    []
  )

  /* ============================================================ */
  /* RENDER                                                       */
  /* ============================================================ */

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="terminal-card terminal-card-glow"
      >
        <div className="terminal-card-header moving-scanline">
          <TrafficLights />
          <SettingsIcon size={13} className="text-term-green ml-2" />
          <span className="terminal-title text-left flex-1">
            settings@de-shop:~/config
          </span>
          <span className="text-term-dim text-[9px] font-terminal hidden sm:inline">
            {`// preferences & system`}
          </span>
        </div>
        <div className="terminal-card-body">
          <div className="flex items-start gap-3">
            <span className="prompt-prefix text-sm">$</span>
            <div className="flex-1">
              <div className="text-term-green text-sm font-terminal font-bold glow-green">
                ./configure --user
              </div>
              <div className="text-term-dim text-[11px] font-terminal mt-1">
                Customize the De-Shop SDK terminal. All changes are saved to
                localStorage and applied instantly.
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Appearance */}
      <SectionCard file="appearance.log" icon={Palette} title="theme picker" delay={0.05}>
        <div className="flex items-center gap-2 mb-2">
          <span className="prompt-prefix text-xs">$</span>
          <span className="text-term-text text-xs font-terminal">
            select theme --preview
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {TERMINAL_THEMES.map((t) => (
            <ThemePreviewCard
              key={t.id}
              themeId={t.id}
              name={t.name}
              tagline={t.tagline}
              isSelected={theme === t.id}
              onSelect={() => handleSelectTheme(t.id)}
            />
          ))}
        </div>
        <div className="text-[10px] text-term-dim font-terminal mt-3 flex items-center gap-1">
          <span className="prompt-prefix-dim">{'>'}</span>
          Active theme:{' '}
          <span className="text-term-green font-bold">
            {TERMINAL_THEMES.find((t) => t.id === theme)?.name ?? theme}
          </span>
          <span className="text-term-dim mx-1">|</span>
          Stored in <span className="text-term-amber">localStorage</span>
        </div>
      </SectionCard>

      {/* Onboarding & Effects */}
      <SectionCard file="effects.log" icon={Sparkles} title="onboarding & visual effects" delay={0.08}>
        {/* Replay tour */}
        <div className="py-3 border-b border-term">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap size={14} className="text-term-cyan" />
            <span className="text-xs font-terminal text-term-text font-bold">Onboarding Tour</span>
            <span className="text-[10px] text-term-dim font-terminal">
              {'// 6-step spotlight guide'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[11px] text-term-dim font-terminal leading-relaxed flex-1 min-w-[180px]">
              Tour status:{' '}
              <span className={tourSeen ? 'text-term-green' : 'text-term-amber'}>
                {tourSeen ? 'completed' : 'not started'}
              </span>
              <span className="mx-1">|</span>
              Replay the interactive tour to rediscover key features: sidebar nav, command palette, marketplace, terminal macros, and more.
            </div>
            <button
              onClick={() => {
                setTourActive(true)
                addNotification('info', 'Replaying onboarding tour...')
              }}
              className="terminal-btn terminal-btn-primary text-[11px] flex items-center gap-2"
            >
              <GraduationCap size={12} />
              <span>Replay Tour</span>
            </button>
            {!tourSeen && (
              <button
                onClick={() => {
                  setTourSeen(true)
                  addNotification('info', 'Tour dismissed. You can replay it anytime.')
                }}
                className="terminal-btn text-[11px] flex items-center gap-2 border-term-dim/50 text-term-dim hover:text-term-text"
              >
                <span>Mark as seen</span>
              </button>
            )}
          </div>
        </div>

        {/* CRT Flicker effect */}
        <div className="py-3">
          <div className="flex items-center gap-2 mb-2">
            <Tv size={14} className="text-term-magenta" />
            <span className="text-xs font-terminal text-term-text font-bold">CRT Flicker Effect</span>
            <span className="text-[10px] text-term-dim font-terminal">
              {'// subtle CRT screen flicker'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[11px] text-term-dim font-terminal leading-relaxed flex-1 min-w-[180px]">
              Adds a subtle, intermittent brightness flicker to simulate a vintage CRT monitor. Disabled by default. May reduce eye comfort for sensitive users.
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-terminal ${crtFlicker ? 'text-term-green' : 'text-term-dim'}`}>
                {crtFlicker ? 'ON' : 'OFF'}
              </span>
              <Switch
                checked={crtFlicker}
                onCheckedChange={(checked) => {
                  setCrtFlicker(checked)
                  addNotification('info', `CRT flicker ${checked ? 'enabled' : 'disabled'}`)
                }}
                aria-label="Toggle CRT flicker effect"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* System */}
      <SectionCard file="system.log" icon={Monitor} title="system preferences" delay={0.1}>
        {/* Network */}
        <div className="py-2 border-b border-term">
          <div className="flex items-center gap-2 mb-2">
            <Network size={14} className="text-term-cyan" />
            <span className="text-xs font-terminal text-term-text font-bold">
              Network
            </span>
            <span className="text-[10px] text-term-dim font-terminal">
              {`// algorand blockchain`}
            </span>
          </div>
          <RadioGroup
            value={settings.network}
            onValueChange={(v) => updateSetting('network', v as NetworkId)}
            className="grid grid-cols-1 sm:grid-cols-3 gap-2"
          >
            {([
              { id: 'testnet', label: 'Testnet', desc: 'sandbox' },
              { id: 'mainnet', label: 'Mainnet', desc: 'production' },
              { id: 'betanet', label: 'Betanet', desc: 'experimental' },
            ] as const).map((opt) => (
              <label
                key={opt.id}
                htmlFor={`net-${opt.id}`}
                className={cn(
                  'flex items-center gap-2 p-2 border border-term rounded-sm cursor-pointer hover:border-term-green/50 transition-colors',
                  settings.network === opt.id && 'border-term-green bg-term-selection'
                )}
              >
                <RadioGroupItem
                  id={`net-${opt.id}`}
                  value={opt.id}
                  className="border-term-green text-term-green"
                />
                <div>
                  <div className="text-xs font-terminal text-term-text font-bold">
                    {opt.label}
                  </div>
                  <div className="text-[9px] text-term-dim font-terminal">
                    {opt.desc}
                  </div>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Currency */}
        <div className="py-2 border-b border-term">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-term-cyan" />
            <span className="text-xs font-terminal text-term-text font-bold">
              Currency Display
            </span>
            <span className="text-[10px] text-term-dim font-terminal">
              {`// preferred unit`}
            </span>
          </div>
          <RadioGroup
            value={settings.currency}
            onValueChange={(v) => updateSetting('currency', v as CurrencyId)}
            className="grid grid-cols-3 gap-2"
          >
            {(['ALGO', 'USD', 'EUR'] as const).map((opt) => (
              <label
                key={opt}
                htmlFor={`cur-${opt}`}
                className={cn(
                  'flex items-center justify-center gap-2 p-2 border border-term rounded-sm cursor-pointer hover:border-term-green/50 transition-colors',
                  settings.currency === opt && 'border-term-green bg-term-selection'
                )}
              >
                <RadioGroupItem
                  id={`cur-${opt}`}
                  value={opt}
                  className="border-term-green text-term-green"
                />
                <span className="text-xs font-terminal text-term-text font-bold">
                  {opt}
                </span>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Auto-refresh */}
        <SettingRow
          icon={RefreshCw}
          label="Auto-refresh interval"
          description="How often dashboard stats and marketplace refresh automatically"
        >
          <Select
            value={settings.refreshInterval}
            onValueChange={(v) => updateSetting('refreshInterval', v as RefreshId)}
          >
            <SelectTrigger className="w-[120px] bg-term-bg border-term text-term-green font-terminal text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-term-surface border-term font-terminal">
              <SelectItem value="5">5 seconds</SelectItem>
              <SelectItem value="10">10 seconds</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
              <SelectItem value="off">Off (manual)</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>

        {/* Confirmations */}
        <SettingRow
          icon={Hash}
          label="Confirmations required"
          description="Number of blockchain confirmations before a transaction is considered final"
        >
          <Select
            value={settings.confirmations}
            onValueChange={(v) => updateSetting('confirmations', v as ConfirmationsId)}
          >
            <SelectTrigger className="w-[120px] bg-term-bg border-term text-term-green font-terminal text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-term-surface border-term font-terminal">
              <SelectItem value="1">1 block</SelectItem>
              <SelectItem value="3">3 blocks</SelectItem>
              <SelectItem value="5">5 blocks</SelectItem>
              <SelectItem value="10">10 blocks</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SectionCard>

      {/* Notifications */}
      <SectionCard file="notifications.log" icon={Bell} title="notifications & alerts" delay={0.15}>
        <div className="text-[10px] text-term-dim font-terminal mb-2 flex items-center gap-1">
          <span className="prompt-prefix-dim">{'>'}</span>
          Toggle individual notification channels
        </div>

        <SettingRow
          icon={Zap}
          label="Price alerts"
          description="Get notified when asset prices move significantly"
        >
          <Switch
            checked={settings.notifications.priceAlerts}
            onCheckedChange={(v) => updateNotification('priceAlerts', v)}
          />
        </SettingRow>

        <SettingRow
          icon={RefreshCw}
          label="Trade notifications"
          description="Notify on buys, sells, and transfers"
        >
          <Switch
            checked={settings.notifications.tradeNotifications}
            onCheckedChange={(v) => updateNotification('tradeNotifications', v)}
          />
        </SettingRow>

        <SettingRow
          icon={Sparkles}
          label="New listings"
          description="Notify when new assets are listed on the marketplace"
        >
          <Switch
            checked={settings.notifications.newListings}
            onCheckedChange={(v) => updateNotification('newListings', v)}
          />
        </SettingRow>

        <SettingRow
          icon={Trophy}
          label="Achievement unlocks"
          description="Celebrate when you unlock new achievements"
        >
          <Switch
            checked={settings.notifications.achievementUnlocks}
            onCheckedChange={(v) => updateNotification('achievementUnlocks', v)}
          />
        </SettingRow>

        <SettingRow
          icon={Info}
          label="System messages"
          description="Network status, maintenance, and protocol updates"
        >
          <Switch
            checked={settings.notifications.systemMessages}
            onCheckedChange={(v) => updateNotification('systemMessages', v)}
          />
        </SettingRow>

        <hr className="terminal-divider" />

        <SettingRow
          icon={Volume2}
          label="Sound effects"
          description="Play terminal beep on key actions"
        >
          <Switch
            checked={settings.notifications.soundEffects}
            onCheckedChange={(v) => updateNotification('soundEffects', v)}
          />
        </SettingRow>

        <SettingRow
          icon={Bell}
          label="Desktop notifications"
          description={
            desktopPerm === 'granted'
              ? 'Permission granted — turn on to receive OS notifications'
              : desktopPerm === 'denied'
                ? 'Blocked by browser — update site settings to allow'
                : 'Requires browser permission'
          }
        >
          <div className="flex items-center gap-2">
            {desktopPerm !== 'granted' && desktopPerm !== 'denied' && (
              <button
                onClick={requestDesktopPermission}
                className="terminal-btn terminal-btn-primary text-[10px] py-1 px-2"
              >
                Request permission
              </button>
            )}
            {desktopPerm === 'denied' && (
              <span className="text-[9px] text-term-red font-terminal">
                blocked
              </span>
            )}
            <Switch
              checked={settings.notifications.desktopNotifications}
              disabled={desktopPerm !== 'granted'}
              onCheckedChange={(v) => updateNotification('desktopNotifications', v)}
            />
          </div>
        </SettingRow>
      </SectionCard>

      {/* Data & Privacy */}
      <SectionCard file="privacy.log" icon={Shield} title="data & privacy" delay={0.2}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 py-2 border-b border-term">
            <div className="flex items-start gap-3">
              <Trash2 size={14} className="text-term-amber mt-0.5" />
              <div>
                <div className="text-xs font-terminal text-term-text font-bold">
                  Clear local cache
                </div>
                <div className="text-[10px] text-term-dim font-terminal mt-0.5">
                  Removes cached API responses, market data, and dashboard stats.
                  Wallet and game scores preserved.
                </div>
              </div>
            </div>
            <button
              onClick={handleClearCache}
              className="terminal-btn text-xs flex-shrink-0"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 py-2 border-b border-term">
            <div className="flex items-start gap-3">
              <Download size={14} className="text-term-cyan mt-0.5" />
              <div>
                <div className="text-xs font-terminal text-term-text font-bold">
                  Export settings
                </div>
                <div className="text-[10px] text-term-dim font-terminal mt-0.5">
                  Download all preferences as a JSON backup file.
                </div>
              </div>
            </div>
            <button
              onClick={handleExportSettings}
              className="terminal-btn terminal-btn-primary text-xs flex-shrink-0"
            >
              Export
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 py-2 border-b border-term">
            <div className="flex items-start gap-3">
              <RotateCcw size={14} className="text-term-red mt-0.5" />
              <div>
                <div className="text-xs font-terminal text-term-text font-bold">
                  Reset all settings
                </div>
                <div className="text-[10px] text-term-dim font-terminal mt-0.5">
                  Restore defaults, reset theme, clear cache, and wipe game scores.
                </div>
              </div>
            </div>
            <button
              onClick={handleResetAll}
              className="terminal-btn terminal-btn-danger text-xs flex-shrink-0"
            >
              Reset All
            </button>
          </div>

          {/* Game scores */}
          <div className="py-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-term-amber" />
                <span className="text-xs font-terminal text-term-text font-bold">
                  Game scores
                </span>
                <span className="text-[10px] text-term-dim font-terminal">
                  {`// ${totalGamesPlayed} games played total`}
                </span>
              </div>
              <button
                onClick={handleClearGameScores}
                className="terminal-btn terminal-btn-danger text-[10px] py-1 px-2 flex-shrink-0"
              >
                Clear Scores
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {gameScoreRows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between p-2 border border-term rounded-sm bg-term-bg"
                >
                  <div className="flex items-center gap-2">
                    <Cpu size={11} className="text-term-dim" />
                    <span className="text-[11px] font-terminal text-term-text">
                      {row.label}
                    </span>
                    <span className="text-[9px] text-term-dim font-terminal">
                      ({gamesPlayed[row.id]} plays)
                    </span>
                  </div>
                  <span className="text-[11px] font-terminal text-term-green font-bold">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* About */}
      <SectionCard file="about.log" icon={Info} title="about this SDK" delay={0.25}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Version info */}
          <div className="space-y-2">
            <div className="text-[10px] text-term-dim font-terminal flex items-center gap-1">
              <span className="prompt-prefix-dim">{'>'}</span>
              ./version --verbose
            </div>
            <div className="space-y-1.5 font-terminal text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-term-dim">SDK version</span>
                <span className="text-term-green font-bold">
                  v{sdkMeta.version}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-term-dim">Build hash</span>
                <span className="text-term-cyan">{sdkMeta.build}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-term-dim">Protocol</span>
                <span className="text-term-text">{sdkMeta.protocol}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-term-dim">Built at</span>
                <span className="text-term-text">
                  {new Date(sdkMeta.builtAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-term-dim">License</span>
                <span className="text-term-amber">{sdkMeta.license}</span>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-term">
              <button
                onClick={handleCheckUpdates}
                disabled={checking}
                className="terminal-btn terminal-btn-primary text-xs flex items-center gap-2"
              >
                {checking ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                {checking ? 'Checking...' : 'Check for updates'}
              </button>
              {updateStatus === 'latest' && (
                <div className="mt-2 text-[10px] text-term-green font-terminal flex items-center gap-1 animate-slide-up-fade">
                  <Check size={10} />
                  You are running the latest version
                </div>
              )}
              {updateStatus === 'available' && (
                <div className="mt-2 text-[10px] text-term-amber font-terminal flex items-center gap-1">
                  <AlertTriangle size={10} />
                  A new version is available
                </div>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="space-y-2">
            <div className="text-[10px] text-term-dim font-terminal flex items-center gap-1">
              <span className="prompt-prefix-dim">{'>'}</span>
              links --open
            </div>
            <div className="grid grid-cols-2 gap-2">
              {aboutLinks.map((link) => {
                const Icon = link.icon
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 border border-term rounded-sm hover:border-term-green/50 hover:bg-term-selection transition-colors group"
                  >
                    <Icon
                      size={14}
                      className={cn(link.color, 'group-hover:scale-110 transition-transform')}
                    />
                    <span className="text-xs font-terminal text-term-text group-hover:text-term-green transition-colors">
                      {link.label}
                    </span>
                    <ExternalLink
                      size={10}
                      className="ml-auto text-term-dim"
                    />
                  </a>
                )
              })}
            </div>

            <div className="pt-3 mt-3 border-t border-term">
              <div className="text-[10px] text-term-dim font-terminal leading-relaxed">
                <span className="text-term-green">De-Shop SDK</span> is an
                open-source decentralized marketplace toolkit for the Algorand
                blockchain. Trade digital assets, mint NFTs, and bridge them to
                your favorite games.
              </div>
              <div className="text-[10px] text-term-dim font-terminal mt-2">
                <span className="text-term-dim">© 2026 De-Shop SDK Contributors.</span>{' '}
                <span className="text-term-amber">MIT License.</span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirmModal && (
          <ConfirmModal
            config={confirmModal}
            onClose={() => setConfirmModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
