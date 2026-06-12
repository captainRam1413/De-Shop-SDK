/**
 * De-Shop SDK — Premium Particle Background
 * ─────────────────────────────────────────
 * Canvas-based particle system rendering floating dots/stars.
 * Green (#00ff88) and cyan (#22d3ee) particles drift upward with slight wobble.
 * Nearby particles are connected by faint lines.
 * Respects `prefers-reduced-motion`.
 */

import { useEffect, useRef, useCallback } from 'react'

// ─── Configuration ────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 65
const MIN_RADIUS = 1
const MAX_RADIUS = 3
const CONNECT_DISTANCE = 120
const DRIFT_SPEED_MIN = 0.15
const DRIFT_SPEED_MAX = 0.45
const WOBBLE_AMPLITUDE = 0.3
const WOBBLE_SPEED = 0.002
const LINE_OPACITY_MAX = 0.12
const COLORS = [
  { r: 0, g: 255, b: 136 },   // #00ff88 green-neon
  { r: 34, g: 211, b: 238 },   // #22d3ee cyan-bright
  { r: 0, g: 230, b: 122 },    // #00e67a green-matrix
  { r: 6, g: 182, b: 212 },    // #06b6d4 cyan
]

// ─── Particle Type ────────────────────────────────────────────────────────────

interface Particle {
  x: number
  y: number
  radius: number
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
    radius: randomBetween(MIN_RADIUS, MAX_RADIUS),
    color,
    opacity: randomBetween(0.25, 0.7),
    speedY: randomBetween(DRIFT_SPEED_MIN, DRIFT_SPEED_MAX),
    wobbleOffset: Math.random() * Math.PI * 2,
    wobbleAmp: randomBetween(0.1, WOBBLE_AMPLITUDE),
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
    const count = Math.min(PARTICLE_COUNT, Math.floor((width * height) / 15000))
    particlesRef.current = Array.from({ length: count }, () => createParticle(width, height))
  }, [])

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height)

    const particles = particlesRef.current
    const time = timeRef.current

    // Update & draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]

      // Update position — drift upward with wobble
      p.y -= p.speedY
      p.x += Math.sin(time * p.wobbleSpeed + p.wobbleOffset) * p.wobbleAmp

      // Wrap around edges
      if (p.y < -p.radius * 2) {
        p.y = height + p.radius * 2
        p.x = Math.random() * width
      }
      if (p.x < -p.radius * 2) p.x = width + p.radius * 2
      if (p.x > width + p.radius * 2) p.x = -p.radius * 2

      // Draw particle
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`
      ctx.fill()
    }

    // Draw connection lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < CONNECT_DISTANCE) {
          const alpha = (1 - dist / CONNECT_DISTANCE) * LINE_OPACITY_MAX
          const ci = particles[i].color
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(${ci.r}, ${ci.g}, ${ci.b}, ${alpha})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }
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
      if (particlesRef.current.length === 0 || Math.abs(width - particlesRef.current.length * 15) > 200) {
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
