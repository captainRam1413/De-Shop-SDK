/**
 * De-Shop SDK — Nexus Forge Particle Background
 * ─────────────────────────────────────────────
 * Canvas-based particle system rendering floating BLOCK particles.
 * Square/rectangular particles in Nexus Forge colors drift upward.
 * Respects `prefers-reduced-motion`.
 */

import { useEffect, useRef, useCallback } from 'react'

// ─── Configuration ────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 40
const MIN_SIZE = 2
const MAX_SIZE = 5
const DRIFT_SPEED_MIN = 0.1
const DRIFT_SPEED_MAX = 0.35
const WOBBLE_AMPLITUDE = 0.2
const WOBBLE_SPEED = 0.002
const FADE_MAX = 0.18

// Nexus Forge block colors
const COLORS = [
  { r: 192, g: 38, b: 211 },   // Plasma violet
  { r: 124, g: 58, b: 237 },   // Deep violet
  { r: 82, g: 82, b: 91 },     // Zinc-600
  { r: 45, g: 212, b: 191 },   // Mint teal
  { r: 163, g: 230, b: 53 },   // Electric lime
  { r: 251, g: 191, b: 36 },   // Solar amber
  { r: 113, g: 113, b: 122 },  // Zinc-500
  { r: 228, g: 228, b: 231 },  // Zinc-200
]

// ─── Particle Type ────────────────────────────────────────────────────────────

interface Particle {
  x: number
  y: number
  size: number
  color: typeof COLORS[number]
  opacity: number
  speedY: number
  wobbleOffset: number
  wobbleAmp: number
  wobbleSpeed: number
  rotation: number
  rotationSpeed: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function createParticle(width: number, height: number): Particle {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: randomBetween(MIN_SIZE, MAX_SIZE),
    color,
    opacity: randomBetween(0.08, FADE_MAX),
    speedY: randomBetween(DRIFT_SPEED_MIN, DRIFT_SPEED_MAX),
    wobbleOffset: Math.random() * Math.PI * 2,
    wobbleAmp: randomBetween(0.05, WOBBLE_AMPLITUDE),
    wobbleSpeed: randomBetween(WOBBLE_SPEED * 0.5, WOBBLE_SPEED * 1.5),
    rotation: randomBetween(0, Math.PI / 2),
    rotationSpeed: randomBetween(-0.005, 0.005),
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const reducedMotionRef = useRef<boolean>(false)

  // Check prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = mq.matches
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const initParticles = useCallback((width: number, height: number) => {
    const count = Math.min(PARTICLE_COUNT, Math.floor((width * height) / 25000))
    particlesRef.current = Array.from({ length: count }, () => createParticle(width, height))
  }, [])

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height)

    const particles = particlesRef.current
    const time = timeRef.current

    // Update & draw particles as SQUARE blocks (Nexus Forge style)
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      // Update position — drift upward with wobble
      p.y -= p.speedY
      p.x += Math.sin(time * p.wobbleSpeed + p.wobbleOffset) * p.wobbleAmp
      p.rotation += p.rotationSpeed

      // Wrap around edges
      if (p.y < -p.size * 2) {
        p.y = height + p.size * 2
        p.x = Math.random() * width
      }
      if (p.x < -p.size * 2) p.x = width + p.size * 2
      if (p.x > width + p.size * 2) p.x = -p.size * 2

      // Draw as a square block (no circles — Nexus Forge!)  
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)

      // Subtle inner highlight (3D block effect)
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.2})`
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, 1)
      ctx.fillRect(-p.size / 2, -p.size / 2, 1, p.size)

      ctx.restore()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let width = 0
    let height = 0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Re-init particles on significant resize
      if (particlesRef.current.length === 0 || Math.abs(width - particlesRef.current.length * 25) > 300) {
        initParticles(width, height)
      }
    }

    resize()
    initParticles(width, height)

    let resizeTimer: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(resize, 150)
    }
    window.addEventListener('resize', handleResize)

    const animate = () => {
      if (!reducedMotionRef.current) {
        timeRef.current += 1
        draw(ctx, width, height)
      }
      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimer)
    }
  }, [initParticles, draw])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 0,
        pointerEvents: 'none',
        imageRendering: 'pixelated',
      }}
    />
  )
}
