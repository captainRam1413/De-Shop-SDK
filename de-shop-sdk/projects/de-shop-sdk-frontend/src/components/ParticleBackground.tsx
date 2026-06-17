/**
 * De-Shop SDK — Minecraft Particle Background
 * ─────────────────────────────────────────────
 * Canvas-based particle system rendering floating BLOCK particles.
 * Square/rectangular particles in Minecraft colors drift upward.
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

// macOS desktop ambient colors
const COLORS = [
  { r: 74, g: 237, b: 217 },   // Cyan
  { r: 168, g: 85, b: 247 },   // Purple
  { r: 79, g: 172, b: 254 },   // Light Blue
  { r: 99, g: 102, b: 241 },   // Indigo
  { r: 244, g: 63, b: 94 },    // Rose
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
    opacity: randomBetween(0.1, FADE_MAX),
    speedY: randomBetween(DRIFT_SPEED_MIN, DRIFT_SPEED_MAX),
    wobbleOffset: Math.random() * Math.PI * 2,
    wobbleAmp: randomBetween(0.05, WOBBLE_AMPLITUDE),
    wobbleSpeed: randomBetween(WOBBLE_SPEED * 0.5, WOBBLE_SPEED * 1.5),
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

    // Update & draw particles as glowing circles (macOS style)
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      // Update position — drift upward with wobble
      p.y -= p.speedY
      p.x += Math.sin(time * p.wobbleSpeed + p.wobbleOffset) * p.wobbleAmp

      // Wrap around edges
      if (p.y < -p.size * 2) {
        p.y = height + p.size * 2
        p.x = Math.random() * width
      }
      if (p.x < -p.size * 2) p.x = width + p.size * 2
      if (p.x > width + p.size * 2) p.x = -p.size * 2

      // Draw as a soft circular particle (no squares!)
      ctx.save()
      ctx.translate(p.x, p.y)
      
      // Outer soft glow
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2)
      gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`)
      gradient.addColorStop(0.5, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity * 0.4})`)
      gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`)
      
      ctx.beginPath()
      ctx.arc(0, 0, p.size * 2, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      
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
      }}
    />
  )
}
