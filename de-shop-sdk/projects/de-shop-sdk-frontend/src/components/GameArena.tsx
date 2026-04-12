import { useEffect, useRef, useCallback } from 'react'
import type { Asset } from '../sdk/DeShopSDK'

type GameArenaProps = {
  activeSkin: Asset | null
}

const RARITY_COLORS: Record<string, { main: string; glow: string; trail: string }> = {
  common:    { main: '#9ca3af', glow: '#6b7280', trail: 'rgba(156,163,175,0.15)' },
  rare:      { main: '#60a5fa', glow: '#3b82f6', trail: 'rgba(59,130,246,0.15)' },
  epic:      { main: '#c084fc', glow: '#a855f7', trail: 'rgba(168,85,247,0.15)' },
  legendary: { main: '#fbbf24', glow: '#f59e0b', trail: 'rgba(245,158,11,0.15)' },
}

type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }
type Enemy = { x: number; y: number; hp: number; maxHp: number; speed: number; angle: number; hit: number }

export default function GameArena({ activeSkin }: GameArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const keysRef = useRef<Set<string>>(new Set())
  const playerRef = useRef({ x: 300, y: 250, angle: 0, attacking: false, attackFrame: 0, score: 0, combo: 0 })
  const particlesRef = useRef<Particle[]>([])
  const enemiesRef = useRef<Enemy[]>([])
  const trailRef = useRef<Array<{ x: number; y: number; alpha: number }>>([])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysRef.current.add(e.key.toLowerCase())
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      playerRef.current.attacking = true
      playerRef.current.attackFrame = 0
    }
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.key.toLowerCase())
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width = W
    canvas.height = H

    const rarity = activeSkin?.rarity ?? 'common'
    const colors = RARITY_COLORS[rarity] ?? RARITY_COLORS.common
    const player = playerRef.current
    const particles = particlesRef.current
    const enemies = enemiesRef.current
    const trail = trailRef.current

    // Spawn enemies if needed
    const spawnEnemy = () => {
      const side = Math.floor(Math.random() * 4)
      let x = 0, y = 0
      if (side === 0) { x = Math.random() * W; y = -20 }
      else if (side === 1) { x = W + 20; y = Math.random() * H }
      else if (side === 2) { x = Math.random() * W; y = H + 20 }
      else { x = -20; y = Math.random() * H }
      enemies.push({ x, y, hp: 3, maxHp: 3, speed: 0.5 + Math.random() * 0.8, angle: 0, hit: 0 })
    }

    let frame = 0
    const SPEED = 2.5

    const draw = () => {
      frame++
      ctx.clearRect(0, 0, W, H)

      // Grid background
      ctx.strokeStyle = 'rgba(34,197,94,0.04)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // Player movement
      const keys = keysRef.current
      let dx = 0, dy = 0
      if (keys.has('w') || keys.has('arrowup')) dy -= SPEED
      if (keys.has('s') || keys.has('arrowdown')) dy += SPEED
      if (keys.has('a') || keys.has('arrowleft')) dx -= SPEED
      if (keys.has('d') || keys.has('arrowright')) dx += SPEED
      if (dx && dy) { dx *= 0.707; dy *= 0.707 }
      player.x = Math.max(20, Math.min(W - 20, player.x + dx))
      player.y = Math.max(20, Math.min(H - 20, player.y + dy))

      if (dx !== 0 || dy !== 0) {
        player.angle = Math.atan2(dy, dx)
        if (frame % 2 === 0) {
          trail.push({ x: player.x, y: player.y, alpha: 0.6 })
        }
      }

      // Trail
      for (let i = trail.length - 1; i >= 0; i--) {
        const t = trail[i]
        t.alpha -= 0.015
        if (t.alpha <= 0) { trail.splice(i, 1); continue }
        ctx.beginPath()
        ctx.arc(t.x, t.y, 8, 0, Math.PI * 2)
        ctx.fillStyle = colors.trail.replace('0.15', t.alpha.toFixed(2))
        ctx.fill()
      }

      // Spawn enemies
      if (frame % 120 === 0 && enemies.length < 8) spawnEnemy()

      // Update enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]
        const edx = player.x - e.x
        const edy = player.y - e.y
        const dist = Math.sqrt(edx * edx + edy * edy)
        e.angle = Math.atan2(edy, edx)
        if (dist > 30) {
          e.x += (edx / dist) * e.speed
          e.y += (edy / dist) * e.speed
        }
        if (e.hit > 0) e.hit--

        // Attack collision
        if (player.attacking && player.attackFrame < 10) {
          const ax = player.x + Math.cos(player.angle) * 30
          const ay = player.y + Math.sin(player.angle) * 30
          const adist = Math.sqrt((ax - e.x) ** 2 + (ay - e.y) ** 2)
          if (adist < 40) {
            e.hp--
            e.hit = 8
            // Hit particles
            for (let p = 0; p < 6; p++) {
              particles.push({
                x: e.x, y: e.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 20 + Math.random() * 15,
                color: colors.main,
                size: 2 + Math.random() * 2,
              })
            }
            if (e.hp <= 0) {
              player.score += 10
              player.combo++
              // Death particles
              for (let p = 0; p < 12; p++) {
                particles.push({
                  x: e.x, y: e.y,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  life: 30 + Math.random() * 20,
                  color: colors.glow,
                  size: 3 + Math.random() * 3,
                })
              }
              enemies.splice(i, 1)
              continue
            }
          }
        }

        // Draw enemy
        const shake = e.hit > 0 ? (Math.random() - 0.5) * 4 : 0
        ctx.save()
        ctx.translate(e.x + shake, e.y + shake)

        // Enemy body (dark orb)
        const eGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 16)
        eGrad.addColorStop(0, 'rgba(239,68,68,0.9)')
        eGrad.addColorStop(0.6, 'rgba(185,28,28,0.7)')
        eGrad.addColorStop(1, 'rgba(127,29,29,0.0)')
        ctx.beginPath()
        ctx.arc(0, 0, 14, 0, Math.PI * 2)
        ctx.fillStyle = eGrad
        ctx.fill()

        // Enemy glow
        ctx.shadowColor = 'rgba(239,68,68,0.4)'
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(0, 0, 8, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(239,68,68,0.6)'
        ctx.fill()

        // Enemy eyes
        ctx.shadowBlur = 0
        const eyeAngle = e.angle
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(Math.cos(eyeAngle - 0.4) * 4, Math.sin(eyeAngle - 0.4) * 4 - 1, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(Math.cos(eyeAngle + 0.4) * 4, Math.sin(eyeAngle + 0.4) * 4 - 1, 2, 0, Math.PI * 2)
        ctx.fill()

        // HP bar
        if (e.hp < e.maxHp) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)'
          ctx.fillRect(-12, -22, 24, 4)
          ctx.fillStyle = '#ef4444'
          ctx.fillRect(-12, -22, 24 * (e.hp / e.maxHp), 4)
        }

        ctx.restore()
      }

      // Attack animation
      if (player.attacking) {
        player.attackFrame++
        if (player.attackFrame > 15) {
          player.attacking = false
          player.attackFrame = 0
        }
      }

      // Draw player
      ctx.save()
      ctx.translate(player.x, player.y)

      // Player aura
      ctx.shadowColor = colors.glow
      ctx.shadowBlur = 20
      const auraGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 25)
      auraGrad.addColorStop(0, colors.trail.replace('0.15', '0.3'))
      auraGrad.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(0, 0, 25 + Math.sin(frame * 0.05) * 3, 0, Math.PI * 2)
      ctx.fillStyle = auraGrad
      ctx.fill()

      // Player body
      ctx.shadowBlur = 12
      const pGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, 14)
      pGrad.addColorStop(0, '#ffffff')
      pGrad.addColorStop(0.4, colors.main)
      pGrad.addColorStop(1, colors.glow)
      ctx.beginPath()
      ctx.arc(0, 0, 12, 0, Math.PI * 2)
      ctx.fillStyle = pGrad
      ctx.fill()

      // Weapon swing
      if (player.attacking) {
        ctx.shadowColor = colors.main
        ctx.shadowBlur = 15
        const swingProgress = player.attackFrame / 15
        const swingAngle = player.angle - 0.8 + swingProgress * 1.6
        const weaponLen = 35
        ctx.beginPath()
        ctx.moveTo(Math.cos(swingAngle) * 14, Math.sin(swingAngle) * 14)
        ctx.lineTo(Math.cos(swingAngle) * weaponLen, Math.sin(swingAngle) * weaponLen)
        ctx.strokeStyle = colors.main
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.stroke()

        // Swing arc
        ctx.beginPath()
        ctx.arc(0, 0, weaponLen, player.angle - 0.8, player.angle - 0.8 + swingProgress * 1.6)
        ctx.strokeStyle = colors.trail.replace('0.15', (0.4 * (1 - swingProgress)).toFixed(2))
        ctx.lineWidth = 2
        ctx.stroke()
      }

      ctx.shadowBlur = 0
      ctx.restore()

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.96
        p.vy *= 0.96
        p.life--
        if (p.life <= 0) { particles.splice(i, 1); continue }
        const alpha = p.life / 40
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0')
        ctx.fill()
      }

      // HUD
      ctx.font = '11px "JetBrains Mono", monospace'
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(34,197,94,0.5)'
      ctx.fillText(`SCORE: ${player.score}`, 12, 20)
      ctx.fillText(`COMBO: x${player.combo}`, 12, 34)

      ctx.textAlign = 'right'
      ctx.fillText(activeSkin ? activeSkin.name : 'Default Skin', W - 12, 20)
      ctx.fillStyle = colors.main + '80'
      ctx.fillText(`[ ${rarity.toUpperCase()} ]`, W - 12, 34)

      // Controls hint
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(34,197,94,0.2)'
      ctx.fillText('WASD: Move  |  SPACE: Attack', W / 2, H - 10)

      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [activeSkin])

  return (
    <canvas
      ref={canvasRef}
      className="game-arena-canvas"
      tabIndex={0}
    />
  )
}
