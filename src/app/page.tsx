'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import {
  Terminal,
  ChevronRight,
  ArrowRight,
  Wallet,
  Store,
  Package,
  BookOpen,
  Puzzle,
  BarChart3,
  Github,
  MessageCircle,
  FileText,
} from 'lucide-react'

// Dynamic import for the heavy TerminalLayout to avoid loading it on the landing page
const TerminalLayout = dynamic(() => import('@/components/TerminalLayout'), {
  loading: () => (
    <div className="min-h-screen bg-term-bg flex items-center justify-center">
      <div className="text-term-green font-terminal text-sm">
        <span className="glow-green-strong">Initializing</span>
        <span className="cursor-blink" />
      </div>
    </div>
  ),
})

/* ===== ASCII ART ===== */

const ASCII_LOGO = `
  ___       _   _       _
 / _ \\  ___| |_| |_ ___| |
| |_| |/ _ \\ __| __/ _ \\ |
|  _  |  __/ |_| ||  __/ |
|_| |_|\\___|\\__|\\__\\___|_|
`.trim()

const ASCII_SUBTITLE = `
  Decentralized Shop SDK — Built on Algorand
`.trim()

/* ===== LANDING PAGE ===== */

function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [typedText, setTypedText] = useState('')
  const [showContent, setShowContent] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)
  const fullText = './de-shop-sdk --launch'

  useEffect(() => {
    // Typing animation
    let i = 0
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i))
        i++
      } else {
        clearInterval(interval)
        setTimeout(() => setShowContent(true), 300)
        setTimeout(() => setShowFeatures(true), 800)
      }
    }, 60)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-term-bg flex flex-col font-terminal scanline-overlay">
      {/* Header bar */}
      <div className="terminal-chrome">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="terminal-dot terminal-dot-red" />
          <span className="terminal-dot terminal-dot-yellow" />
          <span className="terminal-dot terminal-dot-green" />
        </div>
        <span className="terminal-title">de-shop-sdk@terminal:~</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          {/* ASCII Logo */}
          <motion.pre
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="ascii-art text-[9px] sm:text-xs glow-green-strong text-center mb-2"
          >
            {ASCII_LOGO}
          </motion.pre>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-center text-term-dim text-xs mb-8"
          >
            {ASCII_SUBTITLE}
          </motion.div>

          {/* Terminal prompt with typing animation */}
          <div className="bg-term-surface border border-term rounded-sm p-4 mb-6">
            <div className="flex items-center text-sm">
              <span className="prompt-prefix mr-2">$</span>
              <span className="text-term-green">{typedText}</span>
              {typedText.length < fullText.length && (
                <span className="cursor-blink" />
              )}
            </div>
          </div>

          {/* Content that appears after typing */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                {/* Welcome message */}
                <div className="bg-term-surface border border-term rounded-sm p-4 text-xs space-y-2">
                  <div className="text-term-green">▶ SDK initialized successfully</div>
                  <div className="text-term-text">
                    De-Shop SDK is a decentralized marketplace toolkit for Algorand.
                    Trade digital assets, manage NFTs, and build custom storefronts
                    with a powerful terminal-based interface.
                  </div>
                </div>

                {/* Features grid */}
                {showFeatures && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                  >
                    {[
                      { icon: Store, label: 'Marketplace', desc: 'Trade assets', color: 'text-term-cyan' },
                      { icon: Package, label: 'Inventory', desc: 'Manage items', color: 'text-term-amber' },
                      { icon: Terminal, label: 'Terminal', desc: 'CLI interface', color: 'text-term-green' },
                      { icon: BarChart3, label: 'Dashboard', desc: 'Analytics', color: 'text-term-green' },
                      { icon: BookOpen, label: 'Docs', desc: 'API reference', color: 'text-term-cyan' },
                      { icon: Puzzle, label: 'Plugins', desc: 'Extend SDK', color: 'text-term-magenta' },
                    ].map((feature, i) => (
                      <motion.div
                        key={feature.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.08 }}
                        className="bg-term-surface border border-term rounded-sm p-3 hover:border-term-green/30 transition-colors cursor-default"
                      >
                        <feature.icon size={16} className={`${feature.color} mb-1.5`} />
                        <div className="text-term-text text-xs font-bold">{feature.label}</div>
                        <div className="text-term-dim text-[9px]">{feature.desc}</div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Enter button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                  className="flex flex-col items-center gap-3 pt-2"
                >
                  <button
                    onClick={onEnter}
                    className="terminal-btn terminal-btn-primary text-sm px-6 py-3 flex items-center gap-2 hover:glow-green-strong transition-all"
                  >
                    <span className="prompt-prefix">&gt;</span>
                    Enter Dashboard
                    <ArrowRight size={14} />
                  </button>
                  <div className="text-term-dim text-[9px] flex items-center gap-1">
                    <Wallet size={9} />
                    Algorand Testnet • No wallet required to browse
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-term p-4">
        <div className="flex items-center justify-between text-[9px] text-term-dim max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-term-green">De-Shop SDK v2.0</span>
            <span>|</span>
            <span>Terminal Mode</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-term-green transition-colors">
              <Github size={9} /> GitHub
            </a>
            <a href="#" className="flex items-center gap-1 hover:text-term-cyan transition-colors">
              <FileText size={9} /> Docs
            </a>
            <a href="#" className="flex items-center gap-1 hover:text-term-magenta transition-colors">
              <MessageCircle size={9} /> Discord
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ===== MAIN PAGE ===== */

export default function HomePage() {
  const [view, setView] = useState<'landing' | 'app'>('landing')

  const handleEnter = useCallback(() => {
    setView('app')
  }, [])

  return (
    <AnimatePresence mode="wait">
      {view === 'landing' ? (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LandingPage onEnter={handleEnter} />
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen"
        >
          <TerminalLayout />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
