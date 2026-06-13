/**
 * De-Shop SDK — Animated Gradient Border (Minecraft Edition)
 * ────────────────────────────────────────
 * A wrapper component that draws an animated gradient border around children.
 * Uses CSS @property for animating gradient angle with conic-gradient.
 * Default border colors cycle: emerald → diamond → gold → redstone → emerald.
 * Custom colors can be passed via the `colors` prop.
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
  /** Custom gradient colors (at least 2, first is repeated at end for seamless loop) */
  colors?: string[]
}

// ─── Default Minecraft palette ──────────────────────────────────────────────

const MC_DEFAULT_COLORS = [
  '#22c55e', // emerald
  '#4da6ff', // diamond
  '#fbbf24', // gold
  '#ef4444', // redstone
  '#22c55e', // emerald (loop back)
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnimatedBorder({
  children,
  borderRadius = 12,
  borderWidth = 2,
  className,
  colors = MC_DEFAULT_COLORS,
}: AnimatedBorderProps) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Build the conic-gradient color string from the colors array
  const gradientColors = colors.join(', ')

  // For reduced motion, render a static subtle border
  if (reducedMotion) {
    return (
      <div
        className={`animated-border-wrapper ${className || ''}`}
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
      className={`animated-border-wrapper ${className || ''}`}
      style={{
        position: 'relative',
        borderRadius,
        padding: borderWidth,
        background: `conic-gradient(from var(--border-angle, 0deg), ${gradientColors})`,
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
