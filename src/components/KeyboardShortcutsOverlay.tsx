'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'
import { useDeShopStore } from '@/store/useDeShopStore'
import { KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboardShortcuts'

export default function KeyboardShortcutsOverlay() {
  const open = useDeShopStore((s) => s.shortcutsOpen)
  const setOpen = useDeShopStore((s) => s.setShortcutsOpen)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="terminal-card w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Chrome header */}
            <div className="terminal-card-header flex-shrink-0">
              <span className="terminal-dot terminal-dot-red" />
              <span className="terminal-dot terminal-dot-yellow" />
              <span className="terminal-dot terminal-dot-green" />
              <Keyboard className="w-3.5 h-3.5 text-term-green ml-2" />
              <span className="terminal-title">keyboard_shortcuts.man</span>
              <button
                className="ml-auto text-term-dim hover:text-term-red transition-colors"
                onClick={() => setOpen(false)}
                aria-label="Close shortcuts"
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="bg-[#1E1E1E] p-5 overflow-y-auto terminal-scroll">
              {/* Prompt line */}
              <div className="flex items-center gap-2 mb-5 text-xs font-terminal">
                <span className="prompt-prefix text-term-green">$</span>
                <span className="text-term-cyan">man</span>
                <span className="text-term-text">keyboard-shortcuts</span>
                <span className="text-term-dim">|</span>
                <span className="text-term-dim">press</span>
                <span className="text-term-amber border border-term-amber/60 px-1.5 py-0.5 rounded-sm">?</span>
                <span className="text-term-dim">any time</span>
                <span className="blink-cursor" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {KEYBOARD_SHORTCUTS.map((section) => (
                  <div key={section.category}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-term-dim text-[10px] font-terminal">──</span>
                      <span className="text-term-amber text-xs font-terminal font-bold uppercase tracking-wider">
                        {section.category}
                      </span>
                      <span className="text-term-dim text-[10px] font-terminal flex-1">──</span>
                    </div>
                    <ul className="space-y-1.5">
                      {section.items.map((item) => (
                        <li
                          key={item.keys}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="text-term-text font-terminal">{item.description}</span>
                          <kbd className="font-terminal text-[10px] text-term-green bg-[#252525] border border-[#444444] px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                            {item.keys}
                          </kbd>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Footer note */}
              <div className="mt-6 pt-4 border-t border-[#333] text-[10px] text-term-dim font-terminal">
                <span className="text-term-green">$</span> tip: shortcuts are ignored while
                typing in input fields, except <span className="text-term-amber">⌘K</span> and{' '}
                <span className="text-term-amber">Esc</span>.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
