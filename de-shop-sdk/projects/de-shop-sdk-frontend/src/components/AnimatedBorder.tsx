/**
 * De-Shop SDK — Animated Gradient Border
 * ────────────────────────────────────────
 * A wrapper component that draws an animated gradient border around children.
 * Uses CSS @property for animating gradient angle with conic-gradient.
 * Border colors cycle: green → cyan → purple → gold → green.
 * Respects `prefers-reduced-motion`.
 */

import { useEffect, useState, type ReactNode } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnimatedBorderProps {
  children: ReactNode
  /** Border radius in pixels (default: 12) */
  borderRadius?: number
  /** Border width in pixels (default: 2) */
  borderWidth?: number
  /** Additional CSS class for the outer wrapper */
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnimatedBorder({
  children,
  borderRadius = 12,
  borderWidth = 2,
  className,
}: AnimatedBorderProps) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // For reduced motion, render a static subtle border
  if (reducedMotion) {
    return (
      <div
        className={className}
        style={{
          borderRadius,
          border: `${borderWidth}px solid rgba(34, 197, 94, 0.2)`,
        }}
      >
        {children}
      </div>
    )
  }

  // Animated gradient border using the padding + inner div technique.
  // The outer div has the conic gradient as background with padding = borderWidth.
  // The inner div covers the gradient except the padding area (the border).
  // Both use display: flex to properly contain children with dynamic sizing.
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius,
        padding: borderWidth,
        background: `conic-gradient(from var(--border-angle, 0deg), #00ff88, #22d3ee, #a855f7, #fbbf24, #00ff88)`,
        animation: 'border-rotate 4s linear infinite',
        display: 'flex',
      }}
    >
      <div
        style={{
          flex: 1,
          borderRadius: Math.max(0, borderRadius - borderWidth),
          background: 'var(--space-void, #030508)',
          display: 'flex',
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  )
}
