'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BootLine {
  text: string
  level: 'ok' | 'warn' | 'info' | 'plain' | 'cmd'
  delay?: number
}

const BOOT_LINES: BootLine[] = [
  { text: '$ ./de-shop-sdk --init', level: 'cmd' },
  { text: '[OK] Loading kernel modules...', level: 'ok' },
  { text: '[OK] Mounting /dev/blockchain', level: 'ok' },
  { text: '[OK] Starting Algorand node...', level: 'ok' },
  { text: '[OK] Connecting to testnet... connected (round 28472910)', level: 'ok' },
  { text: '[OK] Loading smart contracts... 3 deployed', level: 'ok' },
  { text: '[INFO] Verifying ARC-3 / ARC-19 / ARC-69 standards', level: 'info' },
  { text: '[OK] Initializing SDK... v2.0.0', level: 'ok' },
  { text: '[WARN] Pera wallet not detected — running in read-only mode', level: 'warn' },
  { text: '[OK] Connecting to realtime service... live', level: 'ok' },
  { text: '[OK] Loading marketplace data... 16 assets', level: 'ok' },
  { text: '[OK] Loading user inventory... 8 items', level: 'ok' },
  { text: '[INFO] Subscribing to channel: marketplace-events', level: 'info' },
  { text: '[OK] Initializing AI pricing engine... ready', level: 'ok' },
  { text: '[OK] Boot complete in 1.2s', level: 'ok' },
]

interface BootSequenceProps {
  /** Called when the boot sequence has finished (and animation faded out). */
  onComplete: () => void
}

function levelClass(level: BootLine['level']): string {
  switch (level) {
    case 'ok':
      return 'text-term-green'
    case 'warn':
      return 'text-term-amber'
    case 'info':
      return 'text-term-cyan'
    case 'cmd':
      return 'text-term-text'
    default:
      return 'text-term-dim'
  }
}

function levelLabel(level: BootLine['level']): string {
  switch (level) {
    case 'ok':
      return '[OK]   '
    case 'warn':
      return '[WARN] '
    case 'info':
      return '[INFO] '
    default:
      return ''
  }
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState<number>(0)
  const [showContinuePrompt, setShowContinuePrompt] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const completedRef = useRef(false)

  // Determine if we should skip the boot (mobile or reduced motion)
  const [shouldSkip, setShouldSkip] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isMobile || prefersReduced) {
      setShouldSkip(true)
    }
  }, [])

  // Reveal lines one by one
  useEffect(() => {
    if (shouldSkip) return
    let i = 0
    let cancelled = false

    const showNext = () => {
      if (cancelled) return
      if (i >= BOOT_LINES.length) {
        setShowContinuePrompt(true)
        // Auto-advance after 2s
        window.setTimeout(() => {
          if (!cancelled && !completedRef.current) {
            finish()
          }
        }, 2000)
        return
      }
      const line = BOOT_LINES[i]
      const delay = line.delay ?? (80 + Math.random() * 70)
      window.setTimeout(() => {
        if (cancelled) return
        setVisibleLines(i + 1)
        i++
        showNext()
      }, delay)
    }

    showNext()

    return () => {
      cancelled = true
    }
  }, [shouldSkip])

  const finish = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    setFadingOut(true)
    // Wait for fade-out animation before notifying parent
    window.setTimeout(() => {
      onComplete()
    }, 500)
  }, [onComplete])

  // Skip immediately if mobile/reduced motion
  useEffect(() => {
    if (shouldSkip) {
      // Mark session as booted and bail out instantly
      try {
        window.sessionStorage.setItem('deshop-booted', '1')
      } catch {
        /* ignore */
      }
      onComplete()
    }
  }, [shouldSkip])

  // Press any key to skip
  useEffect(() => {
    if (shouldSkip || !showContinuePrompt) return
    const handler = () => {
      finish()
    }
    const events: (keyof WindowEventMap)[] = ['keydown', 'click', 'touchstart']
    events.forEach((e) => window.addEventListener(e, handler))
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler))
    }
  }, [shouldSkip, showContinuePrompt, finish])

  // If skipping, render nothing
  if (shouldSkip) return null

  return (
    <AnimatePresence>
      {!fadingOut && (
        <motion.div
          key="boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[100] bg-term-bg font-terminal scanline-overlay flex flex-col"
        >
          {/* Terminal chrome bar */}
          <div className="terminal-chrome">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="terminal-dot terminal-dot-red" />
              <span className="terminal-dot terminal-dot-yellow" />
              <span className="terminal-dot terminal-dot-green" />
            </div>
            <span className="terminal-title">de-shop-sdk@boot:~</span>
          </div>

          {/* Boot content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full">
            <pre className="ascii-art text-[8px] sm:text-[10px] glow-green-strong mb-4 leading-tight">
{`  ___       _   _       _
 / _ \\  ___| |_| |_ ___| |
| |_| |/ _ \\ __| __/ _ \\ |
|  _  |  __/ |_| ||  __/ |
|_| |_|\\___|\\__|\\__\\___|_|`}
            </pre>

            <div className="space-y-1 text-[11px] sm:text-xs">
              {BOOT_LINES.slice(0, visibleLines).map((line, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.1 }}
                  className={`whitespace-pre-wrap break-words ${levelClass(line.level)}`}
                >
                  {line.level === 'cmd' ? (
                    <span>
                      <span className="prompt-prefix">$ </span>
                      <span className="text-term-green">{line.text.replace(/^\$\s*/, '')}</span>
                    </span>
                  ) : (
                    <span>
                      <span className={levelClass(line.level)}>{levelLabel(line.level)}</span>
                      <span className={line.level === 'plain' ? 'text-term-dim' : 'text-term-text'}>
                        {line.text.replace(/^\[(OK|WARN|INFO)\]\s*/, '')}
                      </span>
                    </span>
                  )}
                </motion.div>
              ))}

              {/* Final prompt with blinking cursor */}
              {showContinuePrompt && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4"
                >
                  <div className="text-term-green">
                    <span className="prompt-prefix">$ </span>
                    <span className="blink-cursor" />
                  </div>
                  <div className="mt-2 text-term-dim text-[10px] sm:text-[11px] animate-pulse">
                    Press any key to continue...
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
