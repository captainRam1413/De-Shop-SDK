import { useEffect, useRef } from 'react'
import type { Asset } from '../sdk/DeShopSDK'

type GameDemoProps = {
  activeSkin: Asset | null
}

const RARITY_CONFIG: Record<string, { color: number; glow: number; intensity: number; name: string }> = {
  common:    { color: 0x6b7280, glow: 0x4b5563, intensity: 0.3, name: 'Common' },
  rare:      { color: 0x3b82f6, glow: 0x2563eb, intensity: 0.6, name: 'Rare' },
  epic:      { color: 0xa855f7, glow: 0x7c3aed, intensity: 0.9, name: 'Epic' },
  legendary: { color: 0xf59e0b, glow: 0xd97706, intensity: 1.2, name: 'Legendary' },
}

/** Pure Canvas 2D game demo — renders a weapon with dynamic skin effects */
export default function GameDemo({ activeSkin }: GameDemoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 340
    const H = 320
    canvas.width = W
    canvas.height = H

    const config = activeSkin
      ? RARITY_CONFIG[activeSkin.rarity] ?? RARITY_CONFIG.common
      : RARITY_CONFIG.common

    const hexToRgb = (hex: number) => ({
      r: (hex >> 16) & 255,
      g: (hex >> 8) & 255,
      b: hex & 255,
    })

    const mainColor = hexToRgb(config.color)
    const glowColor = hexToRgb(config.glow)

    // Particles
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      life: number; maxLife: number; size: number
    }> = []

    const emitParticles = () => {
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: W / 2 + (Math.random() - 0.5) * 60,
          y: H / 2 + (Math.random() - 0.5) * 100,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -Math.random() * 1.5 - 0.5,
          life: 1,
          maxLife: 60 + Math.random() * 40,
          size: 1 + Math.random() * 2 * config.intensity,
        })
      }
    }

    let frame = 0

    const draw = () => {
      frame++
      ctx.clearRect(0, 0, W, H)

      // Background gradient
      const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 200)
      bgGrad.addColorStop(0, `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, 0.04)`)
      bgGrad.addColorStop(1, 'rgba(7, 10, 13, 0)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)

      // Floating glow
      const pulseAlpha = 0.08 + Math.sin(frame * 0.03) * 0.04 * config.intensity
      ctx.beginPath()
      ctx.arc(W / 2, H / 2, 80 + Math.sin(frame * 0.02) * 10, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, ${pulseAlpha})`
      ctx.fill()

      ctx.save()
      ctx.translate(W / 2, H / 2)

      // Weapon hover animation
      const hover = Math.sin(frame * 0.025) * 5
      ctx.translate(0, hover)

      // ─── Blade ───
      const bladeLen = 120
      const bladeW = 14

      // Blade glow
      ctx.shadowColor = `rgba(${mainColor.r}, ${mainColor.g}, ${mainColor.b}, ${0.5 * config.intensity})`
      ctx.shadowBlur = 20 * config.intensity

      // Blade body
      const bladeGrad = ctx.createLinearGradient(0, -bladeLen, 0, 0)
      bladeGrad.addColorStop(0, `rgba(${mainColor.r}, ${mainColor.g}, ${mainColor.b}, 0.95)`)
      bladeGrad.addColorStop(0.6, `rgba(${mainColor.r}, ${mainColor.g}, ${mainColor.b}, 0.7)`)
      bladeGrad.addColorStop(1, `rgba(${mainColor.r * 0.5 | 0}, ${mainColor.g * 0.5 | 0}, ${mainColor.b * 0.5 | 0}, 0.8)`)

      ctx.beginPath()
      ctx.moveTo(0, -bladeLen)
      ctx.lineTo(bladeW / 2, -bladeLen + 20)
      ctx.lineTo(bladeW / 2 + 2, -10)
      ctx.lineTo(-bladeW / 2 - 2, -10)
      ctx.lineTo(-bladeW / 2, -bladeLen + 20)
      ctx.closePath()
      ctx.fillStyle = bladeGrad
      ctx.fill()

      // Edge highlights
      ctx.strokeStyle = `rgba(${mainColor.r}, ${mainColor.g}, ${mainColor.b}, 0.6)`
      ctx.lineWidth = 1
      ctx.stroke()

      // Center line (energy channel)
      ctx.shadowBlur = 15 * config.intensity
      ctx.beginPath()
      ctx.moveTo(0, -bladeLen + 30)
      ctx.lineTo(0, -15)
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(frame * 0.05) * 0.15})`
      ctx.lineWidth = 1.5
      ctx.stroke()

      // ─── Cross-guard ───
      ctx.shadowBlur = 10 * config.intensity
      ctx.beginPath()
      ctx.roundRect(-25, -12, 50, 8, 3)
      ctx.fillStyle = `rgba(${mainColor.r * 0.6 | 0}, ${mainColor.g * 0.6 | 0}, ${mainColor.b * 0.6 | 0}, 0.9)`
      ctx.fill()

      // Guard gem
      ctx.beginPath()
      ctx.arc(0, -8, 4, 0, Math.PI * 2)
      const gemAlpha = 0.7 + Math.sin(frame * 0.06) * 0.3
      ctx.fillStyle = `rgba(${mainColor.r}, ${mainColor.g}, ${mainColor.b}, ${gemAlpha})`
      ctx.fill()

      // ─── Handle ───
      ctx.shadowBlur = 0
      ctx.shadowColor = 'transparent'

      const handleGrad = ctx.createLinearGradient(0, -4, 0, 60)
      handleGrad.addColorStop(0, '#2a1f0a')
      handleGrad.addColorStop(0.5, '#4a3520')
      handleGrad.addColorStop(1, '#2a1f0a')

      ctx.beginPath()
      ctx.roundRect(-6, -4, 12, 64, 2)
      ctx.fillStyle = handleGrad
      ctx.fill()

      // Handle wrap lines
      for (let i = 0; i < 7; i++) {
        const y = 2 + i * 8
        ctx.beginPath()
        ctx.moveTo(-5, y)
        ctx.lineTo(5, y + 3)
        ctx.strokeStyle = 'rgba(100, 80, 50, 0.4)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // ─── Pommel ───
      ctx.beginPath()
      ctx.arc(0, 62, 6, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${mainColor.r * 0.4 | 0}, ${mainColor.g * 0.4 | 0}, ${mainColor.b * 0.4 | 0}, 0.8)`
      ctx.fill()

      ctx.restore()

      // ─── Particles ───
      if (activeSkin && config.intensity > 0.3) {
        if (frame % 3 === 0) emitParticles()
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.life--

        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        const alpha = (p.life / p.maxLife) * 0.6
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${mainColor.r}, ${mainColor.g}, ${mainColor.b}, ${alpha})`
        ctx.fill()
      }

      // ─── Rarity text ───
      if (activeSkin) {
        ctx.font = '10px "JetBrains Mono", monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = `rgba(${mainColor.r}, ${mainColor.g}, ${mainColor.b}, 0.5)`
        ctx.fillText(`[ ${activeSkin.rarity.toUpperCase()} ]`, W / 2, H - 10)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
    }
  }, [activeSkin])

  const config = activeSkin
    ? RARITY_CONFIG[activeSkin.rarity] ?? RARITY_CONFIG.common
    : RARITY_CONFIG.common

  return (
    <div className="game-panel">
      <div className="game-title">GAME ENGINE — WEAPON PREVIEW</div>
      <div className="game-canvas-wrap">
        <canvas ref={canvasRef} style={{ imageRendering: 'auto' }} />
      </div>
      <div className="skin-line">
        <span>
          Skin: {activeSkin ? activeSkin.name : 'Default'}
        </span>
        <span className={`rarity-badge rarity-${activeSkin?.rarity ?? 'common'}`}>
          {config.name}
        </span>
      </div>
    </div>
  )
}
