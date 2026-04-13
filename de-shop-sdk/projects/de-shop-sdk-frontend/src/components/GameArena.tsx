import { useEffect, useRef, useCallback } from 'react'
import type { Asset } from '../sdk/DeShopSDK'

type GameArenaProps = {
  activeSkin: Asset | null
}

// ─── Rarity Palette ──────────────────────────────────────────────────────────
const RARITY_CONFIG: Record<string, {
  main: string; glow: string; accent: string
  body: string; bodyLight: string; outline: string
  weapon: string; weaponAccent: string; weaponGlow: string
  trail: string; gridTint: string
  particleCount: number; auraSize: number; glowIntensity: number
}> = {
  common: {
    main: '#9ca3af', glow: '#6b7280', accent: '#d1d5db',
    body: '#6b7280', bodyLight: '#9ca3af', outline: '#4b5563',
    weapon: '#9ca3af', weaponAccent: '#d1d5db', weaponGlow: 'rgba(156,163,175,0.3)',
    trail: 'rgba(156,163,175,', gridTint: 'rgba(107,114,128,0.03)',
    particleCount: 3, auraSize: 22, glowIntensity: 8,
  },
  rare: {
    main: '#60a5fa', glow: '#3b82f6', accent: '#93c5fd',
    body: '#2563eb', bodyLight: '#60a5fa', outline: '#1d4ed8',
    weapon: '#60a5fa', weaponAccent: '#93c5fd', weaponGlow: 'rgba(59,130,246,0.4)',
    trail: 'rgba(59,130,246,', gridTint: 'rgba(59,130,246,0.03)',
    particleCount: 5, auraSize: 26, glowIntensity: 12,
  },
  epic: {
    main: '#c084fc', glow: '#a855f7', accent: '#e9d5ff',
    body: '#7c3aed', bodyLight: '#c084fc', outline: '#6d28d9',
    weapon: '#c084fc', weaponAccent: '#e9d5ff', weaponGlow: 'rgba(168,85,247,0.5)',
    trail: 'rgba(168,85,247,', gridTint: 'rgba(168,85,247,0.04)',
    particleCount: 8, auraSize: 30, glowIntensity: 18,
  },
  legendary: {
    main: '#fbbf24', glow: '#f59e0b', accent: '#fef3c7',
    body: '#d97706', bodyLight: '#fbbf24', outline: '#b45309',
    weapon: '#fbbf24', weaponAccent: '#fef3c7', weaponGlow: 'rgba(245,158,11,0.6)',
    trail: 'rgba(245,158,11,', gridTint: 'rgba(245,158,11,0.05)',
    particleCount: 12, auraSize: 35, glowIntensity: 25,
  },
}

type Particle = {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
  type: 'hit' | 'death' | 'ambient' | 'dash' | 'xp'
}

type Enemy = {
  x: number; y: number; hp: number; maxHp: number
  speed: number; angle: number; hit: number
  type: 'orb' | 'skull' | 'phantom'
  size: number; phase: number
}

type FloatingText = {
  x: number; y: number; text: string; color: string
  life: number; vy: number
}

export default function GameArena({ activeSkin }: GameArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const keysRef = useRef<Set<string>>(new Set())
  const mouseRef = useRef({ x: 0, y: 0 })
  const playerRef = useRef({
    x: 300, y: 250,
    angle: 0,
    attacking: false, attackFrame: 0,
    score: 0, combo: 0, maxCombo: 0,
    hp: 100, maxHp: 100,
    dashCooldown: 0, isDashing: false, dashFrame: 0,
    level: 1, xp: 0, xpNeeded: 50,
    invincible: 0,
  })
  const particlesRef = useRef<Particle[]>([])
  const enemiesRef = useRef<Enemy[]>([])
  const trailRef = useRef<Array<{ x: number; y: number; alpha: number; color: string }>>([])
  const floatingTexts = useRef<FloatingText[]>([])
  const screenShakeRef = useRef(0)
  const waveRef = useRef(1)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysRef.current.add(e.key.toLowerCase())
    const player = playerRef.current
    if ((e.key === ' ' || e.key === 'Enter') && !player.attacking) {
      e.preventDefault()
      player.attacking = true
      player.attackFrame = 0
    }
    if (e.key === 'Shift' && player.dashCooldown <= 0 && !player.isDashing) {
      e.preventDefault()
      player.isDashing = true
      player.dashFrame = 0
      player.dashCooldown = 60
      player.invincible = 12
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

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
    }
    const handleClick = () => {
      const player = playerRef.current
      if (!player.attacking) {
        player.attacking = true
        player.attackFrame = 0
      }
    }
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width = W
    canvas.height = H

    const rarity = activeSkin?.rarity?.toLowerCase() ?? 'common'
    const cfg = RARITY_CONFIG[rarity] ?? RARITY_CONFIG.common
    const player = playerRef.current
    const particles = particlesRef.current
    const enemies = enemiesRef.current
    const trail = trailRef.current
    const texts = floatingTexts.current

    const addText = (x: number, y: number, text: string, color: string) => {
      texts.push({ x, y, text, color, life: 50, vy: -1.5 })
    }

    const spawnEnemy = () => {
      const side = Math.floor(Math.random() * 4)
      let x = 0, y = 0
      if (side === 0) { x = Math.random() * W; y = -30 }
      else if (side === 1) { x = W + 30; y = Math.random() * H }
      else if (side === 2) { x = Math.random() * W; y = H + 30 }
      else { x = -30; y = Math.random() * H }

      const types: Array<Enemy['type']> = ['orb', 'skull', 'phantom']
      const type = types[Math.floor(Math.random() * Math.min(types.length, waveRef.current))]
      const hpBase = type === 'orb' ? 2 : type === 'skull' ? 4 : 3
      const hp = hpBase + Math.floor(waveRef.current * 0.5)
      const speed = type === 'phantom' ? 1.2 : type === 'skull' ? 0.6 : 0.8
      enemies.push({ x, y, hp, maxHp: hp, speed: speed + waveRef.current * 0.05, angle: 0, hit: 0, type, size: type === 'skull' ? 18 : 14, phase: Math.random() * Math.PI * 2 })
    }

    const SPEED = 3
    const DASH_SPEED = 12

    // ─── Draw Character ──────────────────────────────────────────────────
    const drawCharacter = (x: number, y: number, angle: number, isMoving: boolean) => {
      ctx.save()
      ctx.translate(x, y)

      // Rarity aura ring
      const auraPulse = Math.sin(frame * 0.04) * 3
      ctx.shadowColor = cfg.weaponGlow
      ctx.shadowBlur = cfg.glowIntensity
      ctx.beginPath()
      ctx.arc(0, 0, cfg.auraSize + auraPulse, 0, Math.PI * 2)
      ctx.strokeStyle = cfg.trail + '0.15)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Inner aura
      const auraGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, cfg.auraSize)
      auraGrad.addColorStop(0, cfg.trail + '0.2)')
      auraGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = auraGrad
      ctx.fill()

      ctx.shadowBlur = 0

      // Body — armored figure
      const bobY = isMoving ? Math.sin(frame * 0.15) * 2 : 0

      // Legs
      if (isMoving) {
        const legSwing = Math.sin(frame * 0.15) * 6
        ctx.strokeStyle = cfg.outline
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        // Left leg
        ctx.beginPath()
        ctx.moveTo(-3, 6 + bobY)
        ctx.lineTo(-5 + legSwing * 0.5, 16)
        ctx.stroke()
        // Right leg
        ctx.beginPath()
        ctx.moveTo(3, 6 + bobY)
        ctx.lineTo(5 - legSwing * 0.5, 16)
        ctx.stroke()
      } else {
        ctx.strokeStyle = cfg.outline
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(-3, 6); ctx.lineTo(-4, 15); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(3, 6); ctx.lineTo(4, 15); ctx.stroke()
      }

      // Torso (armor plate)
      ctx.shadowColor = cfg.glow
      ctx.shadowBlur = cfg.glowIntensity * 0.5
      const torsoGrad = ctx.createLinearGradient(0, -10 + bobY, 0, 8 + bobY)
      torsoGrad.addColorStop(0, cfg.bodyLight)
      torsoGrad.addColorStop(0.5, cfg.body)
      torsoGrad.addColorStop(1, cfg.outline)
      ctx.beginPath()
      ctx.ellipse(0, -2 + bobY, 8, 10, 0, 0, Math.PI * 2)
      ctx.fillStyle = torsoGrad
      ctx.fill()
      ctx.strokeStyle = cfg.outline
      ctx.lineWidth = 1
      ctx.stroke()

      // Armor detail line
      ctx.beginPath()
      ctx.moveTo(0, -10 + bobY)
      ctx.lineTo(0, 6 + bobY)
      ctx.strokeStyle = cfg.accent + '40'
      ctx.lineWidth = 1
      ctx.stroke()

      // Shoulder pads
      ctx.fillStyle = cfg.body
      ctx.beginPath()
      ctx.ellipse(-9, -5 + bobY, 4, 3, -0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(9, -5 + bobY, 4, 3, 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Arms
      ctx.strokeStyle = cfg.outline
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      const armAngle = isMoving ? Math.sin(frame * 0.15) * 0.3 : 0
      // Left arm (non-weapon)
      ctx.beginPath()
      ctx.moveTo(-9, -4 + bobY)
      ctx.lineTo(-12 - Math.sin(armAngle) * 3, 6 + bobY)
      ctx.stroke()
      // Right arm (weapon arm — points towards aim)
      const weaponArmAngle = angle
      ctx.beginPath()
      ctx.moveTo(9, -4 + bobY)
      ctx.lineTo(9 + Math.cos(weaponArmAngle) * 8, -4 + bobY + Math.sin(weaponArmAngle) * 8)
      ctx.stroke()

      // Head
      ctx.shadowBlur = cfg.glowIntensity * 0.3
      const headGrad = ctx.createRadialGradient(0, -14 + bobY, 1, 0, -14 + bobY, 7)
      headGrad.addColorStop(0, cfg.accent)
      headGrad.addColorStop(0.5, cfg.bodyLight)
      headGrad.addColorStop(1, cfg.body)
      ctx.beginPath()
      ctx.arc(0, -14 + bobY, 6, 0, Math.PI * 2)
      ctx.fillStyle = headGrad
      ctx.fill()
      ctx.strokeStyle = cfg.outline
      ctx.lineWidth = 1
      ctx.stroke()

      // Visor / eyes (looking toward mouse)
      const eyeDirX = Math.cos(angle) * 2.5
      const eyeDirY = Math.sin(angle) * 1.5
      // Eye glow
      ctx.fillStyle = cfg.main
      ctx.shadowColor = cfg.main
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(-2 + eyeDirX, -15 + bobY + eyeDirY, 1.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(2 + eyeDirX, -15 + bobY + eyeDirY, 1.2, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowBlur = 0
      ctx.restore()
    }

    // ─── Draw Weapon ─────────────────────────────────────────────────────
    const drawWeapon = (x: number, y: number, angle: number, swingProgress: number) => {
      ctx.save()
      ctx.translate(x, y)

      const isSwinging = swingProgress >= 0
      const swingAngle = isSwinging
        ? angle - 1.2 + swingProgress * 2.4
        : angle

      const weaponLen = rarity === 'legendary' ? 42 : rarity === 'epic' ? 38 : rarity === 'rare' ? 35 : 30
      const bladeWidth = rarity === 'legendary' ? 5 : rarity === 'epic' ? 4 : 3

      // Weapon handle origin
      const hx = Math.cos(swingAngle) * 12
      const hy = Math.sin(swingAngle) * 12

      // Blade tip
      const tx = Math.cos(swingAngle) * weaponLen
      const ty = Math.sin(swingAngle) * weaponLen

      // Blade glow trail (when swinging)
      if (isSwinging) {
        ctx.shadowColor = cfg.weaponGlow
        ctx.shadowBlur = cfg.glowIntensity

        // Swing arc trail
        ctx.beginPath()
        ctx.arc(0, 0, weaponLen * 0.9, angle - 1.2, angle - 1.2 + swingProgress * 2.4)
        ctx.strokeStyle = cfg.trail + (0.5 * (1 - swingProgress)).toFixed(2) + ')'
        ctx.lineWidth = bladeWidth + 2
        ctx.lineCap = 'round'
        ctx.stroke()
      }

      // Blade body (gradient)
      ctx.shadowColor = cfg.weaponGlow
      ctx.shadowBlur = isSwinging ? cfg.glowIntensity * 1.5 : cfg.glowIntensity * 0.5
      const bladeGrad = ctx.createLinearGradient(hx, hy, tx, ty)
      bladeGrad.addColorStop(0, cfg.weapon)
      bladeGrad.addColorStop(0.5, cfg.weaponAccent)
      bladeGrad.addColorStop(1, cfg.weapon)

      ctx.beginPath()
      ctx.moveTo(hx, hy)
      ctx.lineTo(tx, ty)
      ctx.strokeStyle = bladeGrad
      ctx.lineWidth = bladeWidth
      ctx.lineCap = 'round'
      ctx.stroke()

      // Blade edge highlight
      const perpX = Math.cos(swingAngle + Math.PI / 2)
      const perpY = Math.sin(swingAngle + Math.PI / 2)
      ctx.beginPath()
      ctx.moveTo(hx + perpX, hy + perpY)
      ctx.lineTo(tx + perpX, ty + perpY)
      ctx.strokeStyle = cfg.accent + '60'
      ctx.lineWidth = 1
      ctx.stroke()

      // Cross-guard / hilt
      const gx = Math.cos(swingAngle) * 13
      const gy = Math.sin(swingAngle) * 13
      const gperpX = Math.cos(swingAngle + Math.PI / 2) * 5
      const gperpY = Math.sin(swingAngle + Math.PI / 2) * 5
      ctx.beginPath()
      ctx.moveTo(gx - gperpX, gy - gperpY)
      ctx.lineTo(gx + gperpX, gy + gperpY)
      ctx.strokeStyle = cfg.body
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.stroke()

      // Gem on cross-guard
      if (rarity !== 'common') {
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.arc(gx, gy, 2, 0, Math.PI * 2)
        ctx.fillStyle = cfg.accent
        ctx.fill()
      }

      // Legendary: Flame effect on blade
      if (rarity === 'legendary' && isSwinging) {
        for (let i = 0; i < 4; i++) {
          const t = 0.3 + Math.random() * 0.6
          const fx = hx + (tx - hx) * t + (Math.random() - 0.5) * 8
          const fy = hy + (ty - hy) * t + (Math.random() - 0.5) * 8
          ctx.beginPath()
          ctx.arc(fx, fy, 1.5 + Math.random() * 2, 0, Math.PI * 2)
          ctx.fillStyle = Math.random() > 0.5 ? '#fef3c7' : '#fbbf24'
          ctx.fill()
        }
      }

      // Epic: Electric sparks
      if (rarity === 'epic' && isSwinging) {
        for (let i = 0; i < 3; i++) {
          const t = Math.random()
          const sx = hx + (tx - hx) * t
          const sy = hy + (ty - hy) * t
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo(sx + (Math.random() - 0.5) * 12, sy + (Math.random() - 0.5) * 12)
          ctx.strokeStyle = '#e9d5ff'
          ctx.lineWidth = 0.8
          ctx.stroke()
        }
      }

      ctx.shadowBlur = 0
      ctx.restore()
    }

    // ─── Draw Enemy ──────────────────────────────────────────────────────
    const drawEnemy = (e: Enemy) => {
      const shake = e.hit > 0 ? (Math.random() - 0.5) * 4 : 0
      ctx.save()
      ctx.translate(e.x + shake, e.y + shake)

      if (e.type === 'skull') {
        // Skull enemy: larger, darker
        ctx.shadowColor = 'rgba(239,68,68,0.5)'
        ctx.shadowBlur = 12
        const sg = ctx.createRadialGradient(0, 0, 2, 0, 0, e.size)
        sg.addColorStop(0, '#dc2626')
        sg.addColorStop(0.6, '#991b1b')
        sg.addColorStop(1, 'rgba(127,29,29,0)')
        ctx.beginPath()
        ctx.arc(0, 0, e.size, 0, Math.PI * 2)
        ctx.fillStyle = sg
        ctx.fill()

        // Skull face
        ctx.shadowBlur = 0
        ctx.fillStyle = '#000'
        ctx.beginPath(); ctx.arc(-3, -2, 2.5, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(3, -2, 2.5, 0, Math.PI * 2); ctx.fill()
        // Nose
        ctx.beginPath()
        ctx.moveTo(-1, 2); ctx.lineTo(1, 2); ctx.lineTo(0, 4); ctx.closePath()
        ctx.fill()
        // Red eye glow
        ctx.fillStyle = '#ef4444'
        ctx.beginPath(); ctx.arc(-3, -2, 1.2, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(3, -2, 1.2, 0, Math.PI * 2); ctx.fill()
      } else if (e.type === 'phantom') {
        // Phantom: ghostly, moves in sine pattern
        const drift = Math.sin(frame * 0.06 + e.phase) * 6
        ctx.shadowColor = 'rgba(147,51,234,0.4)'
        ctx.shadowBlur = 15
        ctx.globalAlpha = 0.7 + Math.sin(frame * 0.08 + e.phase) * 0.2
        const pg = ctx.createRadialGradient(0, drift, 2, 0, drift, e.size + 4)
        pg.addColorStop(0, 'rgba(192,132,252,0.8)')
        pg.addColorStop(0.5, 'rgba(147,51,234,0.5)')
        pg.addColorStop(1, 'rgba(107,33,168,0)')
        ctx.beginPath()
        ctx.arc(0, drift, e.size + 2, 0, Math.PI * 2)
        ctx.fillStyle = pg
        ctx.fill()
        // Ghost tail
        ctx.beginPath()
        ctx.moveTo(-6, drift + 8)
        ctx.quadraticCurveTo(-3, drift + 16 + Math.sin(frame * 0.1) * 3, 0, drift + 10)
        ctx.quadraticCurveTo(3, drift + 16 + Math.sin(frame * 0.1 + 1) * 3, 6, drift + 8)
        ctx.fillStyle = 'rgba(147,51,234,0.3)'
        ctx.fill()
        // Eyes
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(-3, drift - 1, 2, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(3, drift - 1, 2, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1
      } else {
        // Default orb
        ctx.shadowColor = 'rgba(239,68,68,0.4)'
        ctx.shadowBlur = 10
        const eg = ctx.createRadialGradient(0, 0, 2, 0, 0, e.size)
        eg.addColorStop(0, 'rgba(239,68,68,0.9)')
        eg.addColorStop(0.6, 'rgba(185,28,28,0.7)')
        eg.addColorStop(1, 'rgba(127,29,29,0)')
        ctx.beginPath()
        ctx.arc(0, 0, e.size, 0, Math.PI * 2)
        ctx.fillStyle = eg
        ctx.fill()
        // Eyes
        ctx.shadowBlur = 0
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(Math.cos(e.angle - 0.4) * 4, Math.sin(e.angle - 0.4) * 3 - 1, 1.8, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(Math.cos(e.angle + 0.4) * 4, Math.sin(e.angle + 0.4) * 3 - 1, 1.8, 0, Math.PI * 2); ctx.fill()
      }

      // HP bar
      if (e.hp < e.maxHp) {
        ctx.shadowBlur = 0
        const barW = e.size * 2
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(-barW / 2, -e.size - 8, barW, 3)
        ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#22c55e' : e.hp / e.maxHp > 0.25 ? '#eab308' : '#ef4444'
        ctx.fillRect(-barW / 2, -e.size - 8, barW * (e.hp / e.maxHp), 3)
      }

      ctx.restore()
    }

    let frame = 0

    const draw = () => {
      frame++
      ctx.clearRect(0, 0, W, H)

      // Screen shake
      if (screenShakeRef.current > 0) {
        const intensity = screenShakeRef.current * 0.3
        ctx.save()
        ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity)
        screenShakeRef.current--
      }

      // Grid background with rarity tint
      ctx.strokeStyle = cfg.gridTint
      ctx.lineWidth = 1
      const gridOffset = (frame * 0.3) % 40
      for (let x = -40 + gridOffset; x < W + 40; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let y = -40 + gridOffset; y < H + 40; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // Center vignette
      const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.1, W / 2, H / 2, W * 0.6)
      vig.addColorStop(0, cfg.trail + '0.03)')
      vig.addColorStop(1, 'transparent')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, W, H)

      // ── Player Input ─────────────────────────────────────────────────
      const keys = keysRef.current
      let dx = 0, dy = 0
      const curSpeed = player.isDashing ? DASH_SPEED : SPEED
      if (keys.has('w') || keys.has('arrowup')) dy -= curSpeed
      if (keys.has('s') || keys.has('arrowdown')) dy += curSpeed
      if (keys.has('a') || keys.has('arrowleft')) dx -= curSpeed
      if (keys.has('d') || keys.has('arrowright')) dx += curSpeed
      if (dx && dy) { dx *= 0.707; dy *= 0.707 }
      player.x = Math.max(20, Math.min(W - 20, player.x + dx))
      player.y = Math.max(20, Math.min(H - 20, player.y + dy))

      // Face toward mouse
      player.angle = Math.atan2(mouseRef.current.y - player.y, mouseRef.current.x - player.x)

      // Dash
      if (player.isDashing) {
        player.dashFrame++
        if (player.dashFrame > 8) player.isDashing = false
        // Dash particles
        for (let i = 0; i < 3; i++) {
          particles.push({
            x: player.x + (Math.random() - 0.5) * 10,
            y: player.y + (Math.random() - 0.5) * 10,
            vx: -dx * 0.3 + (Math.random() - 0.5), vy: -dy * 0.3 + (Math.random() - 0.5),
            life: 15, maxLife: 15, color: cfg.accent, size: 2, type: 'dash'
          })
        }
      }
      if (player.dashCooldown > 0) player.dashCooldown--
      if (player.invincible > 0) player.invincible--

      const isMoving = dx !== 0 || dy !== 0
      if (isMoving && frame % 3 === 0) {
        trail.push({ x: player.x, y: player.y, alpha: 0.4, color: cfg.main })
      }

      // Trail
      for (let i = trail.length - 1; i >= 0; i--) {
        const t = trail[i]
        t.alpha -= 0.01
        if (t.alpha <= 0) { trail.splice(i, 1); continue }
        ctx.beginPath()
        ctx.arc(t.x, t.y, 6 * t.alpha, 0, Math.PI * 2)
        ctx.fillStyle = cfg.trail + t.alpha.toFixed(2) + ')'
        ctx.fill()
      }

      // Ambient particles (rarity-based count)
      if (frame % 8 === 0) {
        for (let i = 0; i < Math.ceil(cfg.particleCount / 4); i++) {
          particles.push({
            x: player.x + (Math.random() - 0.5) * 40,
            y: player.y + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 0.5, vy: -Math.random() * 0.8 - 0.3,
            life: 40 + Math.random() * 30, maxLife: 60, color: cfg.glow, size: 1 + Math.random(), type: 'ambient'
          })
        }
      }

      // ── Spawn ────────────────────────────────────────────────────────
      const spawnRate = Math.max(40, 120 - waveRef.current * 8)
      if (frame % spawnRate === 0 && enemies.length < 6 + waveRef.current * 2) spawnEnemy()

      // ── Enemies ──────────────────────────────────────────────────────
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]
        const edx = player.x - e.x
        const edy = player.y - e.y
        const dist = Math.sqrt(edx * edx + edy * edy)
        e.angle = Math.atan2(edy, edx)

        // Movement
        if (e.type === 'phantom') {
          e.x += Math.cos(e.angle) * e.speed + Math.sin(frame * 0.05 + e.phase) * 0.8
          e.y += Math.sin(e.angle) * e.speed + Math.cos(frame * 0.05 + e.phase) * 0.8
        } else if (dist > 25) {
          e.x += (edx / dist) * e.speed
          e.y += (edy / dist) * e.speed
        }
        if (e.hit > 0) e.hit--

        // Player collision damage
        if (dist < e.size + 10 && player.invincible <= 0) {
          player.hp -= e.type === 'skull' ? 15 : 8
          player.invincible = 30
          player.combo = 0
          screenShakeRef.current = 8
          addText(player.x, player.y - 20, `-${e.type === 'skull' ? 15 : 8}`, '#ef4444')
          if (player.hp <= 0) {
            player.hp = player.maxHp
            player.score = Math.max(0, player.score - 20)
            player.combo = 0
            addText(player.x, player.y - 30, 'RESPAWN', '#ef4444')
          }
        }

        // Attack collision
        if (player.attacking && player.attackFrame < 10) {
          const reach = rarity === 'legendary' ? 48 : rarity === 'epic' ? 42 : rarity === 'rare' ? 38 : 32
          const swAngle = player.angle - 1.2 + (player.attackFrame / 15) * 2.4
          const ax = player.x + Math.cos(swAngle) * reach * 0.7
          const ay = player.y + Math.sin(swAngle) * reach * 0.7
          const adist = Math.sqrt((ax - e.x) ** 2 + (ay - e.y) ** 2)
          if (adist < reach) {
            e.hp--
            e.hit = 6
            screenShakeRef.current = 3
            for (let p = 0; p < cfg.particleCount; p++) {
              particles.push({
                x: e.x, y: e.y,
                vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
                life: 20, maxLife: 20, color: cfg.main, size: 2 + Math.random() * 2, type: 'hit'
              })
            }
            addText(e.x, e.y - e.size - 5, `${Math.ceil(reach / 10)}`, cfg.accent)

            if (e.hp <= 0) {
              const pts = e.type === 'skull' ? 25 : e.type === 'phantom' ? 15 : 10
              player.score += pts * (1 + player.combo * 0.1)
              player.combo++
              if (player.combo > player.maxCombo) player.maxCombo = player.combo
              player.xp += pts

              // Level up
              if (player.xp >= player.xpNeeded) {
                player.xp -= player.xpNeeded
                player.level++
                player.xpNeeded = Math.floor(player.xpNeeded * 1.3)
                waveRef.current++
                addText(player.x, player.y - 35, 'LEVEL UP!', '#22c55e')
                screenShakeRef.current = 10
                for (let p = 0; p < 20; p++) {
                  particles.push({
                    x: player.x, y: player.y,
                    vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                    life: 40, maxLife: 40, color: '#22c55e', size: 3 + Math.random() * 3, type: 'xp'
                  })
                }
              }

              addText(e.x, e.y - e.size - 15, `+${Math.floor(pts * (1 + player.combo * 0.1))}`, cfg.main)
              for (let p = 0; p < cfg.particleCount * 2; p++) {
                particles.push({
                  x: e.x, y: e.y,
                  vx: (Math.random() - 0.5) * 7, vy: (Math.random() - 0.5) * 7,
                  life: 35, maxLife: 35, color: cfg.glow, size: 3 + Math.random() * 3, type: 'death'
                })
              }
              enemies.splice(i, 1)
              continue
            }
          }
        }

        drawEnemy(e)
      }

      // ── Attack Logic ─────────────────────────────────────────────────
      if (player.attacking) {
        player.attackFrame++
        if (player.attackFrame > 15) { player.attacking = false; player.attackFrame = 0 }
      }

      // ── Draw Player ──────────────────────────────────────────────────
      // Invincibility flash
      if (player.invincible > 0 && frame % 4 < 2) {
        ctx.globalAlpha = 0.5
      }
      drawCharacter(player.x, player.y, player.angle, isMoving)
      drawWeapon(player.x, player.y, player.angle, player.attacking ? player.attackFrame / 15 : -1)
      ctx.globalAlpha = 1

      // ── Particles ────────────────────────────────────────────────────
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx; p.y += p.vy
        p.vx *= 0.96; p.vy *= 0.96
        p.life--
        if (p.life <= 0) { particles.splice(i, 1); continue }
        const alpha = Math.min(1, p.life / (p.maxLife * 0.5))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = alpha * 0.8
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // ── Floating Texts ───────────────────────────────────────────────
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i]
        t.y += t.vy
        t.life--
        if (t.life <= 0) { texts.splice(i, 1); continue }
        ctx.font = 'bold 12px "JetBrains Mono", monospace'
        ctx.textAlign = 'center'
        ctx.globalAlpha = Math.min(1, t.life / 20)
        ctx.fillStyle = t.color
        ctx.fillText(t.text, t.x, t.y)
        ctx.globalAlpha = 1
      }

      // ── HUD ──────────────────────────────────────────────────────────
      const hudAlpha = '0.7'

      // Top-left: Score + Combo
      ctx.font = 'bold 12px "JetBrains Mono", monospace'
      ctx.textAlign = 'left'
      ctx.fillStyle = `rgba(34,197,94,${hudAlpha})`
      ctx.fillText(`SCORE: ${Math.floor(player.score)}`, 12, 22)
      if (player.combo > 1) {
        ctx.fillStyle = cfg.main
        ctx.fillText(`COMBO x${player.combo}`, 12, 38)
      }

      // Top-left: Level
      ctx.fillStyle = `rgba(34,197,94,${hudAlpha})`
      ctx.fillText(`LVL ${player.level}`, 12, 54)

      // XP bar
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(12, 58, 80, 4)
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(12, 58, 80 * (player.xp / player.xpNeeded), 4)

      // Top-right: Skin name + rarity
      ctx.textAlign = 'right'
      ctx.fillStyle = cfg.main
      ctx.font = 'bold 11px "JetBrains Mono", monospace'
      ctx.fillText(activeSkin ? activeSkin.name : 'Default Skin', W - 12, 22)
      ctx.font = '10px "JetBrains Mono", monospace'
      ctx.fillStyle = cfg.glow
      ctx.fillText(`[ ${rarity.toUpperCase()} ]`, W - 12, 36)

      // HP bar top-right
      const hpW = 100
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(W - 12 - hpW, 42, hpW, 6)
      const hpPct = player.hp / player.maxHp
      ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444'
      ctx.fillRect(W - 12 - hpW, 42, hpW * hpPct, 6)

      // Bottom: Controls + Wave
      ctx.textAlign = 'center'
      ctx.font = '10px "JetBrains Mono", monospace'
      ctx.fillStyle = 'rgba(34,197,94,0.25)'
      ctx.fillText(`WASD: Move  |  Click/Space: Attack  |  Shift: Dash  |  Wave ${waveRef.current}`, W / 2, H - 10)

      // Dash cooldown indicator
      if (player.dashCooldown > 0) {
        ctx.fillStyle = 'rgba(34,197,94,0.15)'
        ctx.fillText(`Dash: ${Math.ceil(player.dashCooldown / 60 * 10) / 10}s`, W / 2, H - 24)
      }

      if (screenShakeRef.current > 0) ctx.restore()

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
