'use client'

import { useEffect } from 'react'
import { useDeShopStore, type ActivePage } from '@/store/useDeShopStore'

/**
 * useKeyboardShortcuts — global key handler for the terminal app.
 *
 * Shortcuts:
 *  - ⌘K / Ctrl+K        → open command palette
 *  - ?                  → open keyboard shortcuts overlay
 *  - Escape             → close any open overlay (palette / shortcuts / modal)
 *  - g d                → goto dashboard
 *  - g m                → goto marketplace
 *  - g i                → goto inventory
 *  - g t                → goto terminal
 *  - g p                → goto profile
 *  - g o                → goto docs
 *  - g l                → goto plugins
 *  - g a                → goto arcade
 *  - g n                → goto activity
 *  - g s                → goto settings
 *  - c                  → connect wallet (open modal) — when not typing
 *  - b                  → toggle sidebar collapse
 *  - /                  → focus the command palette search
 */
export function useKeyboardShortcuts() {
  const setCommandPaletteOpen = useDeShopStore((s) => s.setCommandPaletteOpen)
  const setShortcutsOpen = useDeShopStore((s) => s.setShortcutsOpen)
  const setActivePage = useDeShopStore((s) => s.setActivePage)
  const toggleSidebar = useDeShopStore((s) => s.toggleSidebar)
  const setShowWalletModal = useDeShopStore((s) => s.setShowWalletModal)

  useEffect(() => {
    let gPressed = false
    let gTimeout: number | null = null

    const isTypingTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || el.isContentEditable || tag === 'select'
    }

    const goPage = (page: ActivePage) => {
      setActivePage(page)
    }

    const handler = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K — always works (even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
        return
      }

      // Escape — close any open overlay
      if (e.key === 'Escape') {
        const st = useDeShopStore.getState()
        if (st.commandPaletteOpen) {
          setCommandPaletteOpen(false)
          return
        }
        if (st.shortcutsOpen) {
          setShortcutsOpen(false)
          return
        }
        if (st.showWalletModal) {
          setShowWalletModal(false)
          return
        }
        if (st.priceAlertAsset) {
          useDeShopStore.getState().setPriceAlertAsset(null)
          return
        }
        return
      }

      // Skip remaining shortcuts when typing in an input
      if (isTypingTarget(e.target)) return

      // ? — open shortcuts overlay (shift+/ on US layout)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }

      // g <key> — two-key goto sequences
      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gPressed = true
        if (gTimeout) window.clearTimeout(gTimeout)
        gTimeout = window.setTimeout(() => {
          gPressed = false
        }, 800)
        return
      }

      if (gPressed) {
        const key = e.key.toLowerCase()
        const map: Record<string, ActivePage> = {
          d: 'dashboard',
          m: 'market',
          i: 'inventory',
          t: 'terminal',
          p: 'profile',
          o: 'docs',
          l: 'plugins',
          a: 'game',
          n: 'notifications',
          s: 'settings',
        }
        if (map[key]) {
          e.preventDefault()
          goPage(map[key])
        }
        gPressed = false
        if (gTimeout) {
          window.clearTimeout(gTimeout)
          gTimeout = null
        }
        return
      }

      // c — open connect wallet modal
      if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const st = useDeShopStore.getState()
        if (!st.walletConnected) {
          e.preventDefault()
          setShowWalletModal(true)
        }
        return
      }

      // b — toggle sidebar
      if (e.key.toLowerCase() === 'b' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        toggleSidebar()
        return
      }

      // / — focus command palette (open + focus)
      if (e.key === '/') {
        e.preventDefault()
        setCommandPaletteOpen(true)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (gTimeout) window.clearTimeout(gTimeout)
    }
  }, [
    setCommandPaletteOpen,
    setShortcutsOpen,
    setActivePage,
    toggleSidebar,
    setShowWalletModal,
  ])
}

export const KEYBOARD_SHORTCUTS: {
  category: string
  items: { keys: string; description: string }[]
}[] = [
  {
    category: 'Navigation',
    items: [
      { keys: '⌘ K', description: 'Open command palette' },
      { keys: '/', description: 'Open command palette (focus search)' },
      { keys: '?', description: 'Show this shortcuts overlay' },
      { keys: 'g d', description: 'Go to Dashboard' },
      { keys: 'g m', description: 'Go to Marketplace' },
      { keys: 'g i', description: 'Go to Inventory' },
      { keys: 'g t', description: 'Go to Terminal' },
      { keys: 'g p', description: 'Go to Profile' },
      { keys: 'g o', description: 'Go to Docs' },
      { keys: 'g l', description: 'Go to Plugins' },
      { keys: 'g a', description: 'Go to Arcade' },
      { keys: 'g n', description: 'Go to Activity Center' },
      { keys: 'g s', description: 'Go to Settings' },
    ],
  },
  {
    category: 'App',
    items: [
      { keys: 'b', description: 'Toggle sidebar' },
      { keys: 'c', description: 'Connect wallet' },
      { keys: 'Esc', description: 'Close any open overlay / modal' },
    ],
  },
]
