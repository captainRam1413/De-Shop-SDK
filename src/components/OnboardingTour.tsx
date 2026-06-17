'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { useDeShopStore, ActivePage } from '@/store/useDeShopStore'

interface TourStep {
  id: string
  title: string
  body: string
  targetSelector: string | null
  page: ActivePage
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to De-Shop SDK',
    body: "A decentralized marketplace on Algorand styled as a Mac Terminal. Let's take a 60-second tour. (Press ESC anytime to skip.)",
    targetSelector: null,
    page: 'dashboard',
  },
  {
    id: 'sidebar',
    title: 'Terminal Navigation',
    body: "Each menu item is a shell command. Click '$ cd marketplace' to navigate. The active item shows '>' prefix and green highlight.",
    targetSelector: 'nav',
    page: 'dashboard',
  },
  {
    id: 'command-palette',
    title: 'Command Palette (Cmd+K)',
    body: 'Press Cmd+K (or Ctrl+K) to open the fuzzy command palette. Search any page, action, or asset by name.',
    targetSelector: '[aria-label="Open command palette"]',
    page: 'dashboard',
  },
  {
    id: 'marketplace',
    title: 'Marketplace',
    body: 'Browse 16 mock Algorand assets. Click any card to see AI confidence, price history, and add to watchlist (Star) or compare (max 3).',
    targetSelector: 'main',
    page: 'market',
  },
  {
    id: 'terminal',
    title: 'Terminal Console',
    body: "Type 'help' to list all 16 commands. Try 'mint MythicBlade legendary --force'. Press Up arrow for command history. Save command macros with 'macro save <name> <cmd1; cmd2>'.",
    targetSelector: 'main',
    page: 'terminal',
  },
  {
    id: 'finish',
    title: "You're all set!",
    body: "Press '?' anytime to see keyboard shortcuts. Visit Settings to switch themes (Matrix, Phosphor, Amber) or replay this tour. Happy trading!",
    targetSelector: null,
    page: 'dashboard',
  },
]

const STEP_COUNT = TOUR_STEPS.length
const TOOLTIP_WIDTH = 360
const TOOLTIP_EST_HEIGHT = 220
const VIEWPORT_PAD = 12
const SPOTLIGHT_PAD = 4

function trafficDot(color: string): React.CSSProperties {
  return {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: color,
    display: 'inline-block',
    flexShrink: 0,
  }
}

export default function OnboardingTour() {
  const tourSeen = useDeShopStore((s) => s.tourSeen)
  const tourActive = useDeShopStore((s) => s.tourActive)
  const setTourSeen = useDeShopStore((s) => s.setTourSeen)
  const setTourActive = useDeShopStore((s) => s.setTourActive)
  const activePage = useDeShopStore((s) => s.activePage)
  const setActivePage = useDeShopStore((s) => s.setActivePage)

  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [reduceMotion, setReduceMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const nextBtnRef = useRef<HTMLButtonElement | null>(null)
  const fallbackBtnRef = useRef<HTMLButtonElement | null>(null)

  const step = TOUR_STEPS[stepIndex]
  // The overlay is visible exactly when the store says the tour is active.
  // Deriving (rather than mirroring in state) lets AnimatePresence handle exit
  // animations and avoids setState-in-effect warnings.
  const show = tourActive

  // ----- Mount: auto-start trigger -----
  // tourSeen=false && tourActive=false → wait 800ms then start the tour.
  useEffect(() => {
    if (tourActive) return
    if (tourSeen) return
    const t = window.setTimeout(() => {
      setTourActive(true)
    }, 800)
    return () => window.clearTimeout(t)
  }, [tourActive, tourSeen, setTourActive])

  // ----- prefers-reduced-motion (subscribe only; initial value via lazy state) -----
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
    mq.addListener(handler)
    return () => mq.removeListener(handler)
  }, [])

  // ----- Switch to the step's page if needed -----
  useEffect(() => {
    if (!show) return
    if (step.page !== activePage) {
      setActivePage(step.page)
    }
  }, [show, stepIndex, step.page, activePage, setActivePage])

  // ----- Compute and track the target's bounding rect -----
  // Recompute on: step change, page change, window resize, scroll, ResizeObserver.
  // Retry briefly if the target isn't mounted yet (page transition).
  useEffect(() => {
    if (!show) return
    const selector = step.targetSelector

    let observer: ResizeObserver | null = null
    let lastEl: HTMLElement | null = null
    let retryTimer: number | null = null
    let retryCount = 0

    const measure = (el: HTMLElement): DOMRect => {
      const r = el.getBoundingClientRect()
      return new DOMRect(r.left, r.top, r.width, r.height)
    }

    const setupObserver = (el: HTMLElement) => {
      if (typeof ResizeObserver === 'undefined') return
      observer = new ResizeObserver(() => {
        if (lastEl) setRect(measure(lastEl))
      })
      observer.observe(el)
      lastEl = el
    }

    const tryQuery = (): boolean => {
      if (!selector) {
        setRect(null)
        return true
      }
      const el = document.querySelector<HTMLElement>(selector)
      if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
        setRect(measure(el))
        setupObserver(el)
        return true
      }
      return false
    }

    // Initial attempt after a small delay (lets page transition render)
    const initialDelay = window.setTimeout(() => {
      if (tryQuery()) return
      if (!selector) return
      // Retry up to ~1s for slow page mounts
      retryTimer = window.setInterval(() => {
        retryCount += 1
        if (tryQuery() || retryCount > 20) {
          if (retryTimer !== null) {
            window.clearInterval(retryTimer)
            retryTimer = null
          }
        }
      }, 50)
    }, 80)

    const onResizeOrScroll = () => {
      if (lastEl) setRect(measure(lastEl))
    }
    window.addEventListener('resize', onResizeOrScroll)
    window.addEventListener('scroll', onResizeOrScroll, true)

    return () => {
      window.clearTimeout(initialDelay)
      if (retryTimer !== null) window.clearInterval(retryTimer)
      if (observer) observer.disconnect()
      lastEl = null
      window.removeEventListener('resize', onResizeOrScroll)
      window.removeEventListener('scroll', onResizeOrScroll, true)
    }
  }, [show, stepIndex, step.targetSelector, activePage])

  // ----- End / next / prev / skip -----
  const endTour = useCallback(() => {
    setStepIndex(0)
    setTourActive(false)
    setTourSeen(true)
  }, [setTourActive, setTourSeen])

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= STEP_COUNT - 1) {
        // Defer endTour to avoid setState-in-setState warning
        window.setTimeout(endTour, 0)
        return i
      }
      return i + 1
    })
  }, [endTour])

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  const skip = useCallback(() => {
    endTour()
  }, [endTour])

  // ----- Focus primary button on each step -----
  useEffect(() => {
    if (!show) return
    const t = window.setTimeout(() => {
      const btn = nextBtnRef.current ?? fallbackBtnRef.current
      btn?.focus()
    }, 60)
    return () => window.clearTimeout(t)
  }, [show, stepIndex])

  // ----- Keyboard handler (Esc / arrows / Enter / Tab trap) -----
  useEffect(() => {
    if (!show) return
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement
      const tag = (active?.tagName || '').toLowerCase()
      const inEditable =
        tag === 'input' || tag === 'textarea' || tag === 'select' || (active as HTMLElement | null)?.isContentEditable

      if (e.key === 'Escape') {
        e.preventDefault()
        skip()
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (inEditable) return
        e.preventDefault()
        next()
        return
      }
      if (e.key === 'ArrowLeft') {
        if (inEditable) return
        e.preventDefault()
        prev()
        return
      }
      if (e.key === 'Tab') {
        const root = tooltipRef.current
        if (!root) return
        const nodes = root.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"]), input, select, textarea',
        )
        const focusables = Array.from(nodes).filter(
          (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey) {
          if (active === first || !root.contains(active)) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (active === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [show, next, prev, skip])

  // ----- Compute tooltip position -----
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const isLast = stepIndex === STEP_COUNT - 1

  let tooltipStyle: React.CSSProperties
  if (rect) {
    const below = rect.top < vh / 2
    const targetCenterX = rect.left + rect.width / 2
    let left = targetCenterX - TOOLTIP_WIDTH / 2
    left = Math.max(VIEWPORT_PAD, Math.min(left, vw - TOOLTIP_WIDTH - VIEWPORT_PAD))
    let top: number
    if (below) {
      top = rect.bottom + VIEWPORT_PAD
      if (top + TOOLTIP_EST_HEIGHT > vh - VIEWPORT_PAD) {
        // Flip above
        top = Math.max(VIEWPORT_PAD, rect.top - TOOLTIP_EST_HEIGHT - VIEWPORT_PAD)
      }
    } else {
      top = rect.top - TOOLTIP_EST_HEIGHT - VIEWPORT_PAD
      if (top < VIEWPORT_PAD) {
        top = rect.bottom + VIEWPORT_PAD
      }
    }
    tooltipStyle = {
      position: 'fixed',
      left,
      top,
      width: TOOLTIP_WIDTH,
      maxWidth: vw - VIEWPORT_PAD * 2,
    }
  } else {
    // Center-screen modal
    const w = Math.min(TOOLTIP_WIDTH, vw - VIEWPORT_PAD * 2)
    tooltipStyle = {
      position: 'fixed',
      left: Math.max(VIEWPORT_PAD, (vw - w) / 2),
      top: Math.max(VIEWPORT_PAD, (vh - TOOLTIP_EST_HEIGHT) / 2),
      width: w,
      maxWidth: vw - VIEWPORT_PAD * 2,
    }
  }

  // Spotlight box (only when target rect exists)
  const spotlightStyle: React.CSSProperties | null = rect
    ? {
        position: 'fixed',
        left: rect.left - SPOTLIGHT_PAD,
        top: rect.top - SPOTLIGHT_PAD,
        width: rect.width + SPOTLIGHT_PAD * 2,
        height: rect.height + SPOTLIGHT_PAD * 2,
        border: `2px solid var(--t-primary, #33FF33)`,
        borderRadius: 2,
        boxShadow: `0 0 0 9999px rgba(0,0,0,0.75), 0 0 24px color-mix(in srgb, var(--t-primary, #33FF33) 60%, transparent)`,
        pointerEvents: 'none',
        transition: reduceMotion ? 'none' : 'left 0.18s ease, top 0.18s ease, width 0.18s ease, height 0.18s ease',
        zIndex: 56,
      }
    : null

  const backdropStyle: React.CSSProperties = rect
    ? {
        // Transparent click-catcher; spotlight's 9999px box-shadow paints the dim
        position: 'fixed',
        inset: 0,
        background: 'transparent',
        pointerEvents: 'auto',
        zIndex: 55,
      }
    : {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        pointerEvents: 'auto',
        zIndex: 55,
      }

  const tooltipCardStyle: React.CSSProperties = {
    ...tooltipStyle,
    zIndex: 60,
    background: 'var(--t-bg, #1E1E1E)',
    border: `1px solid var(--t-primary, #33FF33)`,
    boxShadow:
      '0 8px 32px rgba(0,0,0,0.8), 0 0 24px color-mix(in srgb, var(--t-primary, #33FF33) 25%, transparent)',
    fontFamily: "'SF Mono', 'Menlo', 'Consolas', 'Monaco', monospace",
    fontSize: 12,
    padding: 16,
    color: 'var(--t-text, #CCCCCC)',
    pointerEvents: 'auto',
  }

  const titleId = `tour-title-${step.id}`

  const tooltipMotion = reduceMotion
    ? {
        initial: false as const,
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 1, scale: 1, y: 0 },
      }
    : {
        initial: { opacity: 0, scale: 0.95, y: 4 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: 4 },
        transition: { duration: 0.18 },
      }

  const backdropMotion = reduceMotion
    ? {
        initial: false as const,
        animate: { opacity: 1 },
        exit: { opacity: 1 },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="tour-overlay-root"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            pointerEvents: 'none',
          }}
        >
          {/* Backdrop / click-catcher */}
          <motion.div
            key="tour-backdrop"
            style={backdropStyle}
            onClick={skip}
            {...backdropMotion}
          />

          {/* Spotlight */}
          {spotlightStyle && <div aria-hidden="true" style={spotlightStyle} />}

          {/* Tooltip */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`tour-tooltip-${step.id}`}
              ref={tooltipRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-label={step.title}
              style={tooltipCardStyle}
              {...tooltipMotion}
            >
              {/* Title bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  paddingBottom: 10,
                  marginBottom: 10,
                  borderBottom: '1px solid var(--t-border, #444)',
                }}
              >
                <span style={trafficDot('#FF5F56')} />
                <span style={trafficDot('#FFBD2E')} />
                <span style={trafficDot('#27C93F')} />
                <span
                  style={{
                    marginLeft: 6,
                    color: 'var(--t-dim, #888)',
                    fontSize: 11,
                  }}
                >
                  Tour — Step {stepIndex + 1}/{STEP_COUNT}
                </span>
                <button
                  type="button"
                  onClick={skip}
                  aria-label="Skip tour"
                  style={{
                    marginLeft: 'auto',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--t-dim, #888)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    fontFamily: 'inherit',
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Title */}
              <h3
                id={titleId}
                style={{
                  color: 'var(--t-primary, #33FF33)',
                  fontWeight: 700,
                  fontSize: 14,
                  margin: 0,
                  marginBottom: 8,
                  lineHeight: 1.3,
                }}
              >
                {step.title}
              </h3>

              {/* Body */}
              <p
                style={{
                  color: 'var(--t-text, #CCCCCC)',
                  fontSize: 12,
                  lineHeight: 1.5,
                  margin: 0,
                  marginBottom: 14,
                }}
              >
                {step.body}
              </p>

              {/* Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  ref={fallbackBtnRef}
                  onClick={skip}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--t-dim, #888)',
                    cursor: 'pointer',
                    fontSize: 11,
                    padding: '4px 0',
                    fontFamily: 'inherit',
                  }}
                >
                  Skip Tour
                </button>

                {/* Step dots */}
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    fontSize: 10,
                    lineHeight: 1,
                  }}
                  aria-label={`Step ${stepIndex + 1} of ${STEP_COUNT}`}
                >
                  {TOUR_STEPS.map((s, i) => (
                    <span
                      key={s.id}
                      style={{
                        color:
                          i === stepIndex
                            ? 'var(--t-primary, #33FF33)'
                            : 'var(--t-dim, #888)',
                        textShadow:
                          i === stepIndex
                            ? '0 0 6px color-mix(in srgb, var(--t-primary, #33FF33) 60%, transparent)'
                            : 'none',
                      }}
                    >
                      ●
                    </span>
                  ))}
                </div>

                {/* Navigation buttons */}
                <div style={{ display: 'flex', gap: 6 }}>
                  {stepIndex > 0 && (
                    <button
                      type="button"
                      onClick={prev}
                      aria-label="Previous step"
                      className="terminal-btn"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        padding: '4px 8px',
                      }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                  )}
                  {isLast ? (
                    <button
                      type="button"
                      ref={nextBtnRef}
                      onClick={endTour}
                      className="terminal-btn terminal-btn-primary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                      }}
                    >
                      <Check size={12} /> Finish
                    </button>
                  ) : (
                    <button
                      type="button"
                      ref={nextBtnRef}
                      onClick={next}
                      className="terminal-btn terminal-btn-primary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                      }}
                    >
                      Next <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
