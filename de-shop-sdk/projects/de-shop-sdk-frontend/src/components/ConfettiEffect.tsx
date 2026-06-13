/**
 * De-Shop SDK — Premium Confetti Effect
 * ───────────────────────────────────────
 * Framer Motion based confetti burst for celebrating successful transactions.
 * Triggered via `trigger` prop. Auto-cleanup after 3 seconds.
 * Colors: green, cyan, purple, gold (matching cyberpunk theme).
 * Respects `prefers-reduced-motion`.
 */

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfettiEffectProps {
  /** When true, play the confetti animation */
  trigger: boolean
}

interface ConfettiParticle {
  id: number
  x: number
  y: number
  rotation: number
  scale: number
  color: string
  shape: 'circle' | 'rect' | 'diamond'
  angle: number
  velocity: number
  gravity: number
  drag: number
  wobble: number
  wobbleSpeed: number
  delay: number
}

// ─── Configuration ────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 35
const DURATION = 3 // seconds
const COLORS = [
  '#2ECC71', // emerald green
  '#4AEDD9', // diamond cyan
  '#a855f7', // netherite purple
  '#FFD700', // gold
  '#7CB342', // grass green
  '#c084fc', // ender purple
  '#FF1A1A', // redstone
  '#D4D4D4', // iron gray
]

const SHAPES: Array<'circle' | 'rect' | 'diamond'> = ['rect', 'rect', 'diamond']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function createParticles(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 0,
    y: 0,
    rotation: randomBetween(0, 360),
    scale: randomBetween(0.6, 1.2),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    angle: randomBetween(-180, 0) * (Math.PI / 180), // upward burst
    velocity: randomBetween(300, 600),
    gravity: randomBetween(400, 700),
    drag: randomBetween(0.97, 0.99),
    wobble: randomBetween(-50, 50),
    wobbleSpeed: randomBetween(2, 5),
    delay: randomBetween(0, 0.15),
  }))
}

// ─── Single Confetti Piece ────────────────────────────────────────────────────

function ConfettiPiece({ particle }: { particle: ConfettiParticle }) {
  const size = particle.scale * 8

  // Calculate final position based on physics
  const flightTime = DURATION - particle.delay
  const vx = Math.cos(particle.angle) * particle.velocity
  const vy = Math.sin(particle.angle) * particle.velocity

  // Simple physics: x = vx * t, y = vy * t + 0.5 * gravity * t^2
  // With drag approximation
  const endX = vx * flightTime * particle.drag + particle.wobble * Math.sin(particle.wobbleSpeed)
  const endY = vy * flightTime * 0.5 + 0.5 * particle.gravity * flightTime

  const shapeStyle: React.CSSProperties = {
    width: particle.shape === 'rect' ? size * 0.6 : size,
    height: particle.shape === 'rect' ? size * 1.5 : size,
    backgroundColor: particle.color,
    borderRadius: particle.shape === 'circle' ? '50%' : particle.shape === 'diamond' ? '2px' : '1px',
    transform: particle.shape === 'diamond' ? 'rotate(45deg)' : undefined,
    boxShadow: `0 0 6px ${particle.color}44`,
  }

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: '50%',
        top: '40%',
        ...shapeStyle,
      }}
      initial={{
        x: 0,
        y: 0,
        opacity: 1,
        rotate: particle.rotation,
      }}
      animate={{
        x: endX,
        y: endY,
        opacity: [1, 1, 0.8, 0],
        rotate: particle.rotation + randomBetween(360, 1080),
      }}
      transition={{
        duration: DURATION,
        delay: particle.delay,
        ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad-ish
        opacity: {
          duration: DURATION,
          delay: particle.delay,
          times: [0, 0.5, 0.8, 1],
        },
      }}
    />
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConfettiEffect({ trigger }: ConfettiEffectProps) {
  const [visible, setVisible] = useState(false)
  const [particles, setParticles] = useState<ConfettiParticle[]>([])
  const [reducedMotion, setReducedMotion] = useState(false)

  // Check prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (trigger && !reducedMotion) {
      setParticles(createParticles(PARTICLE_COUNT))
      setVisible(true)

      const timer = setTimeout(() => {
        setVisible(false)
        setParticles([])
      }, DURATION * 1000 + 200)

      return () => clearTimeout(timer)
    }
    return undefined
  }, [trigger, reducedMotion])

  // Memoize particle rendering
  const particleElements = useMemo(
    () => particles.map((p) => <ConfettiPiece key={p.id} particle={p} />),
    [particles],
  )

  if (reducedMotion) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
          aria-hidden="true"
        >
          {particleElements}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
