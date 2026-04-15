import { useEffect, useRef, useCallback, useState } from 'react'
import type { Asset } from '../sdk/DeShopSDK'
import { normalizeRarity } from '../sdk/DeShopSDK'

type GameArenaProps = {
  activeGunSkin: Asset | null
  activeCharSkin: Asset | null
}

// ─── Rarity Skin Palette ─────────────────────────────────────────────────────
const SKIN_PALETTE: Record<string, {
  helmet: string; helmetLight: string; visor: string
  body: string; bodyLight: string; bodyDark: string
  legs: string; legsDark: string
  sword: string; swordLight: string; swordGlow: string; swordTrail: string
  aura: string; particleColor: string
  dmgMulti: number
}> = {
  common: {
    helmet: '#6b7280', helmetLight: '#9ca3af', visor: '#374151',
    body: '#4b5563', bodyLight: '#6b7280', bodyDark: '#374151',
    legs: '#4b5563', legsDark: '#374151',
    sword: '#9ca3af', swordLight: '#d1d5db', swordGlow: 'rgba(156,163,175,0)', swordTrail: 'rgba(156,163,175,0.15)',
    aura: 'rgba(156,163,175,0.05)', particleColor: '#9ca3af',
    dmgMulti: 1,
  },
  rare: {
    helmet: '#2563eb', helmetLight: '#60a5fa', visor: '#1e3a5f',
    body: '#1d4ed8', bodyLight: '#3b82f6', bodyDark: '#1e40af',
    legs: '#1e3a8a', legsDark: '#1e3070',
    sword: '#60a5fa', swordLight: '#93c5fd', swordGlow: 'rgba(59,130,246,0.4)', swordTrail: 'rgba(59,130,246,0.3)',
    aura: 'rgba(59,130,246,0.08)', particleColor: '#60a5fa',
    dmgMulti: 1.5,
  },
  epic: {
    helmet: '#7c3aed', helmetLight: '#a78bfa', visor: '#4c1d95',
    body: '#6d28d9', bodyLight: '#8b5cf6', bodyDark: '#5b21b6',
    legs: '#4c1d95', legsDark: '#3b0f80',
    sword: '#c084fc', swordLight: '#e9d5ff', swordGlow: 'rgba(168,85,247,0.5)', swordTrail: 'rgba(168,85,247,0.35)',
    aura: 'rgba(168,85,247,0.1)', particleColor: '#a78bfa',
    dmgMulti: 2,
  },
  legendary: {
    helmet: '#d97706', helmetLight: '#fbbf24', visor: '#92400e',
    body: '#b45309', bodyLight: '#f59e0b', bodyDark: '#92400e',
    legs: '#78350f', legsDark: '#5c2a0a',
    sword: '#fbbf24', swordLight: '#fef3c7', swordGlow: 'rgba(245,158,11,0.6)', swordTrail: 'rgba(245,158,11,0.4)',
    aura: 'rgba(245,158,11,0.12)', particleColor: '#fbbf24',
    dmgMulti: 3,
  },
}

function getSkinPalette(asset: Asset | null): typeof SKIN_PALETTE['common'] {
  if (!asset) return SKIN_PALETTE.common
  const rarity = normalizeRarity(asset.rarity ?? 'common')
  return SKIN_PALETTE[rarity] || SKIN_PALETTE.common
}

// ─── Block tiles ─────────────────────────────────────────────────────────────
const TILE = { GRASS: 0, DIRT: 1, STONE: 2, WATER: 3, SAND: 4, WOOD: 5, LEAVES: 6, FLOWER: 7, PATH: 8 }
const TILE_COLORS: Record<number, { base: string; shade: string; detail?: string }> = {
  [TILE.GRASS]:  { base: '#4a8c2a', shade: '#3d7522', detail: '#5da035' },
  [TILE.DIRT]:   { base: '#8b6b3d', shade: '#7a5c32' },
  [TILE.STONE]:  { base: '#787878', shade: '#606060', detail: '#6a6a6a' },
  [TILE.WATER]:  { base: '#2878c8', shade: '#2060a8', detail: '#3090e0' },
  [TILE.SAND]:   { base: '#e0c878', shade: '#c8b060' },
  [TILE.WOOD]:   { base: '#6e4e28', shade: '#5a3e1e', detail: '#7e5e38' },
  [TILE.LEAVES]: { base: '#2d7a1a', shade: '#246812', detail: '#3a9025' },
  [TILE.FLOWER]: { base: '#4a8c2a', shade: '#3d7522', detail: '#e04060' },
  [TILE.PATH]:   { base: '#a08858', shade: '#907848' },
}

const MAP_W = 40, MAP_H = 30, TILE_S = 32

// ─── World Generation ────────────────────────────────────────────────────────
function generateMap(): number[][] {
  const map: number[][] = []
  for (let y = 0; y < MAP_H; y++) {
    map[y] = []
    for (let x = 0; x < MAP_W; x++) {
      // Base terrain
      const n = Math.sin(x * 0.2) * Math.cos(y * 0.15) + Math.sin(x * 0.08 + y * 0.06) * 2
      if (n > 1.5) map[y][x] = TILE.STONE
      else if (n > 0.5) map[y][x] = TILE.DIRT
      else if (n < -1.5) map[y][x] = TILE.WATER
      else if (n < -1) map[y][x] = TILE.SAND
      else map[y][x] = TILE.GRASS
    }
  }

  // Place trees (trunk + leaves)
  for (let i = 0; i < 15; i++) {
    const tx = 3 + Math.floor(Math.random() * (MAP_W - 6))
    const ty = 3 + Math.floor(Math.random() * (MAP_H - 6))
    if (map[ty][tx] === TILE.GRASS) {
      map[ty][tx] = TILE.WOOD
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (map[ty + dy] && map[ty + dy][tx + dx] === TILE.GRASS && !(dx === 0 && dy === 0)) {
            map[ty + dy][tx + dx] = TILE.LEAVES
          }
        }
      }
    }
  }

  // Flowers
  for (let i = 0; i < 20; i++) {
    const fx = Math.floor(Math.random() * MAP_W)
    const fy = Math.floor(Math.random() * MAP_H)
    if (map[fy][fx] === TILE.GRASS) map[fy][fx] = TILE.FLOWER
  }

  // Paths
  let px = Math.floor(MAP_W / 2), py = 0
  while (py < MAP_H) {
    if (map[py] && map[py][px] !== TILE.WATER) map[py][px] = TILE.PATH
    py++
    px += Math.floor(Math.random() * 3) - 1
    px = Math.max(1, Math.min(MAP_W - 2, px))
  }

  return map
}

// ─── Mob Types ───────────────────────────────────────────────────────────────
type Mob = {
  x: number; y: number; type: 'zombie' | 'creeper' | 'skeleton'
  hp: number; maxHp: number; hit: number; facing: number
  attackCd: number; phase: number; knockX: number; knockY: number
}

type Particle = {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; color: string; size: number
}

type DmgText = {
  x: number; y: number; text: string; color: string; life: number
}

// ═══════════════════════════════════════════════════════════════════════════════
//  START SCREEN — Animated Character + Weapon Preview
// ═══════════════════════════════════════════════════════════════════════════════

function StartScreen({
  activeGunSkin,
  activeCharSkin,
  onStart,
}: {
  activeGunSkin: Asset | null
  activeCharSkin: Asset | null
  onStart: () => void
}) {
  const previewRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cvs = previewRef.current; if (!cvs) return
    const ctx = cvs.getContext('2d'); if (!ctx) return

    const W = 320, H = 400
    cvs.width = W; cvs.height = H

    const charSkin = getSkinPalette(activeCharSkin)
    const gunSkin = getSkinPalette(activeGunSkin)

    let frame = 0
    let animId: number

    const draw = () => {
      frame++
      ctx.clearRect(0, 0, W, H)

      // Background gradient
      const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 200)
      bgGrad.addColorStop(0, 'rgba(10,20,14,0.95)')
      bgGrad.addColorStop(0.5, 'rgba(7,12,10,0.98)')
      bgGrad.addColorStop(1, 'rgba(5,8,7,1)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)

      // Ground platform
      const platY = H * 0.72
      ctx.fillStyle = '#2a5a1a'
      ctx.fillRect(W * 0.2, platY, W * 0.6, 8)
      ctx.fillStyle = '#1e4a12'
      ctx.fillRect(W * 0.2, platY + 8, W * 0.6, 60)
      // Grass blades on platform
      ctx.fillStyle = '#3a8a28'
      for (let i = 0; i < 20; i++) {
        const gx = W * 0.22 + i * (W * 0.56 / 20)
        ctx.fillRect(gx, platY - 3, 2, 4)
      }

      // Draw character (centered, larger — 3x scale)
      const cx = W / 2
      const cy = platY - 4
      const scale = 3
      const idle = Math.sin(frame * 0.03) * 2 // Idle breathing bob
      const swordIdle = Math.sin(frame * 0.04) * 0.1 // Gentle sword sway

      ctx.save()
      ctx.translate(cx, cy + idle)
      ctx.scale(scale, scale)

      // Character shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.ellipse(0, 12, 10, 4, 0, 0, Math.PI * 2)
      ctx.fill()

      // Aura glow (rarity based)
      if (activeCharSkin) {
        const auraP = Math.sin(frame * 0.04) * 3
        ctx.fillStyle = charSkin.aura
        ctx.beginPath()
        ctx.ellipse(0, 0, 22 + auraP, 22 + auraP, 0, 0, Math.PI * 2)
        ctx.fill()

        // Outer glow ring
        ctx.strokeStyle = charSkin.particleColor
        ctx.globalAlpha = 0.15 + Math.sin(frame * 0.03) * 0.1
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.ellipse(0, 0, 26 + auraP, 26 + auraP, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      // Legs
      ctx.fillStyle = charSkin.legs
      ctx.fillRect(-6, 4, 5, 10)
      ctx.fillRect(1, 4, 5, 10)
      ctx.fillStyle = charSkin.legsDark
      ctx.fillRect(-6, 12, 5, 2)
      ctx.fillRect(1, 12, 5, 2)

      // Body (torso armor)
      ctx.fillStyle = charSkin.body
      ctx.fillRect(-7, -8, 14, 14)
      ctx.fillStyle = charSkin.bodyLight
      ctx.fillRect(-7, -8, 14, 4)
      ctx.fillStyle = charSkin.bodyDark
      ctx.fillRect(-1, -6, 2, 10)

      // Arms
      ctx.fillStyle = charSkin.body
      ctx.fillRect(-11, -6, 4, 10)
      ctx.fillRect(7, -6, 4, 10)

      // Head
      ctx.fillStyle = charSkin.helmet
      ctx.fillRect(-6, -20, 12, 12)
      ctx.fillStyle = charSkin.helmetLight
      ctx.fillRect(-6, -20, 12, 3)
      ctx.fillRect(-6, -20, 3, 6)

      // Eyes
      ctx.fillStyle = charSkin.visor
      ctx.fillRect(-4, -16, 3, 3)
      ctx.fillRect(1, -16, 3, 3)
      ctx.fillStyle = '#fff'
      ctx.fillRect(-3, -16, 1, 1)
      ctx.fillRect(2, -16, 1, 1)
      // Mouth
      ctx.fillStyle = charSkin.visor
      ctx.fillRect(-2, -12, 4, 1)

      // ── Weapon (Sword) with idle sway ──
      ctx.save()
      ctx.translate(10, -2)
      ctx.rotate(swordIdle - 0.3)

      // Sword glow
      ctx.shadowColor = gunSkin.swordGlow
      ctx.shadowBlur = 8

      // Sword blade
      ctx.fillStyle = gunSkin.sword
      ctx.fillRect(-2, -30, 4, 22)
      ctx.fillStyle = gunSkin.swordLight
      ctx.fillRect(-1, -28, 2, 18)
      // Tip
      ctx.beginPath()
      ctx.moveTo(-2, -30); ctx.lineTo(2, -30); ctx.lineTo(0, -35)
      ctx.fillStyle = gunSkin.sword; ctx.fill()
      // Guard
      ctx.fillStyle = '#5c3310'
      ctx.fillRect(-5, -8, 10, 3)
      // Handle
      ctx.fillStyle = '#3a2008'
      ctx.fillRect(-1, -5, 3, 8)
      ctx.shadowBlur = 0

      // Shimmer on epic/legendary
      const gRarity = normalizeRarity(activeGunSkin?.rarity ?? 'common')
      if (gRarity === 'legendary' || gRarity === 'epic') {
        ctx.globalAlpha = 0.5 + Math.sin(frame * 0.12) * 0.3
        ctx.fillStyle = gunSkin.swordLight
        const shimY = (frame * 2) % 22
        ctx.fillRect(-1, -28 + shimY, 2, 4)
        ctx.globalAlpha = 1
      }

      ctx.restore() // sword

      ctx.restore() // character

      // Floating rarity particles
      if (frame % 8 === 0 && activeCharSkin) {
        // Create a simple particle effect on canvas
        const px = cx + (Math.random() - 0.5) * 60
        const py = cy + (Math.random() - 0.5) * 60 - 20
        ctx.fillStyle = charSkin.particleColor
        ctx.globalAlpha = 0.6
        ctx.fillRect(px, py, 3, 3)
        ctx.globalAlpha = 1
      }

      // Skin name labels
      ctx.textAlign = 'center'
      ctx.font = 'bold 13px "JetBrains Mono"'

      // Character skin label
      ctx.fillStyle = '#000'
      ctx.fillText(`🧑 ${activeCharSkin?.name || 'Steve'}`, cx + 1, H * 0.82 + 1)
      ctx.fillStyle = charSkin.helmetLight
      ctx.fillText(`🧑 ${activeCharSkin?.name || 'Steve'}`, cx, H * 0.82)

      // Weapon skin label
      ctx.fillStyle = '#000'
      ctx.fillText(`⚔ ${activeGunSkin?.name || 'Stone Sword'}`, cx + 1, H * 0.82 + 21)
      ctx.fillStyle = gunSkin.sword
      ctx.fillText(`⚔ ${activeGunSkin?.name || 'Stone Sword'}`, cx, H * 0.82 + 20)

      // Rarity badges
      const charRarity = normalizeRarity(activeCharSkin?.rarity ?? 'common').toUpperCase()
      const gunRarity = normalizeRarity(activeGunSkin?.rarity ?? 'common').toUpperCase()
      ctx.font = '9px "JetBrains Mono"'
      ctx.fillStyle = charSkin.particleColor
      ctx.globalAlpha = 0.7
      ctx.fillText(`[${charRarity}]`, cx, H * 0.82 + 14)
      ctx.fillStyle = gunSkin.particleColor
      ctx.fillText(`[${gunRarity}]`, cx, H * 0.82 + 34)
      ctx.globalAlpha = 1

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animId)
  }, [activeGunSkin, activeCharSkin])

  const charRarity = normalizeRarity(activeCharSkin?.rarity ?? 'common')
  const gunRarity = normalizeRarity(activeGunSkin?.rarity ?? 'common')
  const charColors = SKIN_PALETTE[charRarity] || SKIN_PALETTE.common
  const gunColors = SKIN_PALETTE[gunRarity] || SKIN_PALETTE.common

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 40%, rgba(34,197,94,0.06) 0%, rgba(7,10,13,0.98) 70%)',
    }}>
      {/* Title */}
      <div style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.2em',
        color: 'rgba(34,197,94,0.4)',
        marginBottom: '8px',
        textTransform: 'uppercase',
      }}>
        ⛏ minecraft world
      </div>

      {/* Character Preview Canvas */}
      <canvas
        ref={previewRef}
        style={{
          width: '240px',
          height: '300px',
          imageRendering: 'pixelated',
          borderRadius: '12px',
          border: '1px solid rgba(34,197,94,0.15)',
          boxShadow: '0 0 40px rgba(34,197,94,0.08)',
        }}
      />

      {/* Equipped Skins Info */}
      <div style={{
        display: 'flex',
        gap: '16px',
        margin: '16px 0',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '10px',
        letterSpacing: '0.06em',
      }}>
        <div style={{
          padding: '6px 12px',
          background: 'rgba(0,0,0,0.4)',
          border: `1px solid ${charColors.body}40`,
          borderRadius: '6px',
          color: charColors.helmetLight,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '8px', color: 'rgba(34,197,94,0.4)', marginBottom: '2px' }}>CHARACTER</div>
          {activeCharSkin?.name || 'Steve'}
        </div>
        <div style={{
          padding: '6px 12px',
          background: 'rgba(0,0,0,0.4)',
          border: `1px solid ${gunColors.sword}40`,
          borderRadius: '6px',
          color: gunColors.swordLight,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '8px', color: 'rgba(34,197,94,0.4)', marginBottom: '2px' }}>WEAPON</div>
          {activeGunSkin?.name || 'Stone Sword'}
        </div>
      </div>

      {/* START Button */}
      <button
        onClick={onStart}
        style={{
          marginTop: '4px',
          padding: '14px 48px',
          background: 'rgba(34,197,94,0.12)',
          border: '2px solid rgba(34,197,94,0.5)',
          borderRadius: '10px',
          color: '#73ffa7',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '16px',
          fontWeight: 700,
          letterSpacing: '0.15em',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 0 25px rgba(34,197,94,0.15)',
          animation: 'start-pulse 2s ease-in-out infinite',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(34,197,94,0.25)'
          e.currentTarget.style.boxShadow = '0 0 40px rgba(34,197,94,0.3)'
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(34,197,94,0.12)'
          e.currentTarget.style.boxShadow = '0 0 25px rgba(34,197,94,0.15)'
          e.currentTarget.style.transform = 'translateY(0) scale(1)'
        }}
      >
        ▶ START GAME
      </button>

      {/* Controls hint */}
      <div style={{
        marginTop: '16px',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '9px',
        color: 'rgba(34,197,94,0.25)',
        letterSpacing: '0.08em',
      }}>
        WASD = Move &nbsp;|&nbsp; Click / Space = Attack
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAME ARENA — Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function GameArena({ activeGunSkin, activeCharSkin }: GameArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const stateRef = useRef({
    px: 20, py: 15, facing: 0, // 0=down,1=left,2=up,3=right
    swingT: -1, swingDir: 0,
    hp: 20, maxHp: 20, invT: 0,
    score: 0, combo: 0, xp: 0, level: 1,
    mobs: [] as Mob[], particles: [] as Particle[], texts: [] as DmgText[],
    map: null as null | number[][],
    frame: 0, moveT: 0,
    camX: 0, camY: 0,
  })
  const keysRef = useRef<Set<string>>(new Set())

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!gameStarted) return
    keysRef.current.add(e.key.toLowerCase())
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (stateRef.current.swingT < 0) stateRef.current.swingT = 0
    }
  }, [gameStarted])
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.key.toLowerCase())
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp) }
  }, [handleKeyDown, handleKeyUp])

  // Click to attack
  useEffect(() => {
    if (!gameStarted) return
    const cvs = canvasRef.current; if (!cvs) return
    const onClick = () => {
      if (stateRef.current.swingT < 0) stateRef.current.swingT = 0
    }
    cvs.addEventListener('click', onClick)
    return () => cvs.removeEventListener('click', onClick)
  }, [gameStarted])

  useEffect(() => {
    if (!gameStarted) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return

    const W = canvas.offsetWidth, H = canvas.offsetHeight
    canvas.width = W; canvas.height = H

    const st = stateRef.current
    if (!st.map) {
      st.map = generateMap()
      // Spawn mobs
      for (let i = 0; i < 10; i++) {
        const mx = 3 + Math.random() * (MAP_W - 6)
        const my = 3 + Math.random() * (MAP_H - 6)
        const types: Mob['type'][] = ['zombie', 'creeper', 'skeleton']
        const t = types[Math.floor(Math.random() * 3)]
        st.mobs.push({
          x: mx, y: my, type: t,
          hp: t === 'creeper' ? 12 : t === 'skeleton' ? 8 : 10,
          maxHp: t === 'creeper' ? 12 : t === 'skeleton' ? 8 : 10,
          hit: 0, facing: Math.floor(Math.random() * 4),
          attackCd: 0, phase: Math.random() * 100,
          knockX: 0, knockY: 0,
        })
      }
    }
    const map = st.map!
    const charSkin = getSkinPalette(activeCharSkin)
    const gunSkin = getSkinPalette(activeGunSkin)

    const isSolid = (tx: number, ty: number) => {
      const t = map[Math.floor(ty)]?.[Math.floor(tx)]
      return t === TILE.WATER || t === TILE.WOOD || t === TILE.LEAVES || t === undefined
    }

    let animId: number

    const loop = () => {
      st.frame++
      const keys = keysRef.current
      const spd = 0.06

      // ── Player Movement ─────────────────────────────────────────────
      let dx = 0, dy = 0
      if (keys.has('w') || keys.has('arrowup'))    { dy = -spd; st.facing = 2 }
      if (keys.has('s') || keys.has('arrowdown'))  { dy = spd;  st.facing = 0 }
      if (keys.has('a') || keys.has('arrowleft'))  { dx = -spd; st.facing = 1 }
      if (keys.has('d') || keys.has('arrowright')) { dx = spd;  st.facing = 3 }
      if (dx && dy) { dx *= 0.707; dy *= 0.707 }

      const newX = st.px + dx
      const newY = st.py + dy
      if (!isSolid(newX, st.py)) st.px = newX
      if (!isSolid(st.px, newY)) st.py = newY
      st.px = Math.max(0.5, Math.min(MAP_W - 0.5, st.px))
      st.py = Math.max(0.5, Math.min(MAP_H - 0.5, st.py))

      if (dx !== 0 || dy !== 0) st.moveT += 0.15

      // Camera follows player
      st.camX = st.px * TILE_S - W / 2
      st.camY = st.py * TILE_S - H / 2

      if (st.invT > 0) st.invT--

      // ── Swing Logic ─────────────────────────────────────────────────
      if (st.swingT >= 0) {
        st.swingT += 0.08
        st.swingDir = st.facing

        // Hit detection at peak
        if (st.swingT > 0.3 && st.swingT < 0.5) {
          const reach = 1.5
          const dirs = [[0, 1], [-1, 0], [0, -1], [1, 0]][st.swingDir]
          const hx = st.px + dirs[0] * reach
          const hy = st.py + dirs[1] * reach

          st.mobs.forEach(m => {
            const mdx = m.x - hx, mdy = m.y - hy
            const dist = Math.sqrt(mdx * mdx + mdy * mdy)
            if (dist < 1.2) {
              const dmg = Math.ceil(3 * gunSkin.dmgMulti)
              m.hp -= dmg
              m.hit = 10
              // Knockback
              const kf = 0.4
              m.knockX = dirs[0] * kf
              m.knockY = dirs[1] * kf
              st.combo++
              st.texts.push({ x: m.x * TILE_S, y: m.y * TILE_S - 20, text: `${dmg}`, color: '#ef4444', life: 30 })
              // Hit particles
              for (let p = 0; p < 6; p++) {
                st.particles.push({
                  x: m.x * TILE_S, y: m.y * TILE_S,
                  vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3 - 1,
                  life: 20, maxLife: 20, color: gunSkin.particleColor, size: 3
                })
              }
            }
          })
        }
        if (st.swingT > 1) { st.swingT = -1; st.combo = 0 }
      }

      // ── Kill dead mobs ──────────────────────────────────────────────
      for (let i = st.mobs.length - 1; i >= 0; i--) {
        if (st.mobs[i].hp <= 0) {
          const m = st.mobs[i]
          const pts = m.type === 'creeper' ? 30 : m.type === 'skeleton' ? 20 : 15
          st.score += pts
          st.xp += pts
          if (st.xp >= st.level * 50) { st.xp -= st.level * 50; st.level++ }
          st.texts.push({ x: m.x * TILE_S, y: m.y * TILE_S - 30, text: `+${pts}`, color: '#22c55e', life: 40 })
          for (let p = 0; p < 15; p++) {
            const c = m.type === 'creeper' ? '#22c55e' : m.type === 'skeleton' ? '#e5e5e5' : '#5a7a5a'
            st.particles.push({
              x: m.x * TILE_S, y: m.y * TILE_S,
              vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5 - 2,
              life: 30, maxLife: 30, color: c, size: 4
            })
          }
          st.mobs.splice(i, 1)
        }
      }

      // Respawn
      if (st.mobs.length < 8 && st.frame % 180 === 0) {
        const ang = Math.random() * Math.PI * 2
        const dist = 10 + Math.random() * 5
        const mx = Math.max(1, Math.min(MAP_W - 2, st.px + Math.cos(ang) * dist))
        const my = Math.max(1, Math.min(MAP_H - 2, st.py + Math.sin(ang) * dist))
        if (!isSolid(mx, my)) {
          const types: Mob['type'][] = ['zombie', 'creeper', 'skeleton']
          const t = types[Math.floor(Math.random() * 3)]
          st.mobs.push({
            x: mx, y: my, type: t,
            hp: t === 'creeper' ? 12 : t === 'skeleton' ? 8 : 10,
            maxHp: t === 'creeper' ? 12 : t === 'skeleton' ? 8 : 10,
            hit: 0, facing: 0, attackCd: 0, phase: Math.random() * 100,
            knockX: 0, knockY: 0,
          })
        }
      }

      // ── Mob AI ──────────────────────────────────────────────────────
      st.mobs.forEach(m => {
        m.phase += 0.06
        // Knockback decay
        m.x += m.knockX; m.y += m.knockY
        m.knockX *= 0.85; m.knockY *= 0.85
        m.x = Math.max(0.5, Math.min(MAP_W - 0.5, m.x))
        m.y = Math.max(0.5, Math.min(MAP_H - 0.5, m.y))

        if (m.hit > 0) m.hit--
        if (m.attackCd > 0) m.attackCd--

        const mdx = st.px - m.x, mdy = st.py - m.y
        const dist = Math.sqrt(mdx * mdx + mdy * mdy)

        if (dist < 12) {
          // Face player
          if (Math.abs(mdx) > Math.abs(mdy)) m.facing = mdx > 0 ? 3 : 1
          else m.facing = mdy > 0 ? 0 : 2

          if (dist > 1) {
            const ms = 0.02
            const nmx = m.x + (mdx / dist) * ms
            const nmy = m.y + (mdy / dist) * ms
            if (!isSolid(nmx, m.y)) m.x = nmx
            if (!isSolid(m.x, nmy)) m.y = nmy
          }

          // Contact damage
          if (dist < 0.8 && m.attackCd <= 0 && st.invT <= 0) {
            const dmg = m.type === 'creeper' ? 4 : 2
            st.hp = Math.max(0, st.hp - dmg)
            st.invT = 30
            m.attackCd = 60
            st.texts.push({ x: st.px * TILE_S, y: st.py * TILE_S - 30, text: `-${dmg}`, color: '#ef4444', life: 25 })
            if (st.hp <= 0) {
              st.hp = st.maxHp
              st.score = Math.max(0, st.score - 30)
              st.texts.push({ x: st.px * TILE_S, y: st.py * TILE_S - 50, text: 'RESPAWN!', color: '#ef4444', life: 50 })
            }
          }
        }
      })

      // ── RENDER ──────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H)
      ctx.imageSmoothingEnabled = false

      // Visible tile range
      const startTX = Math.max(0, Math.floor(st.camX / TILE_S) - 1)
      const startTY = Math.max(0, Math.floor(st.camY / TILE_S) - 1)
      const endTX = Math.min(MAP_W, Math.ceil((st.camX + W) / TILE_S) + 1)
      const endTY = Math.min(MAP_H, Math.ceil((st.camY + H) / TILE_S) + 1)

      // Draw tiles
      for (let ty = startTY; ty < endTY; ty++) {
        for (let tx = startTX; tx < endTX; tx++) {
          const tile = map[ty]?.[tx] ?? TILE.GRASS
          const tc = TILE_COLORS[tile] || TILE_COLORS[TILE.GRASS]
          const sx = tx * TILE_S - st.camX
          const sy = ty * TILE_S - st.camY

          // Base fill
          ctx.fillStyle = tc.base
          ctx.fillRect(sx, sy, TILE_S, TILE_S)

          // Checker pattern for texture (pixelated)
          ctx.fillStyle = tc.shade
          for (let py = 0; py < TILE_S; py += 8) {
            for (let px = 0; px < TILE_S; px += 8) {
              if ((Math.floor(px / 8) + Math.floor(py / 8) + tx + ty) % 3 === 0) {
                ctx.fillRect(sx + px, sy + py, 8, 8)
              }
            }
          }

          // Details
          if (tc.detail && tile === TILE.GRASS) {
            // Grass blades
            ctx.fillStyle = tc.detail
            const seed = tx * 127 + ty * 311
            ctx.fillRect(sx + (seed % 12) + 4, sy + (seed % 8) + 4, 2, 4)
            ctx.fillRect(sx + ((seed * 7) % 20) + 2, sy + ((seed * 3) % 16) + 8, 2, 3)
          }
          if (tile === TILE.FLOWER) {
            // Flower on grass
            const fc = ['#ef4444', '#fbbf24', '#a855f7', '#ec4899'][(tx * 7 + ty * 3) % 4]
            ctx.fillStyle = fc
            ctx.fillRect(sx + 12, sy + 10, 6, 6)
            ctx.fillStyle = '#fef08a'
            ctx.fillRect(sx + 14, sy + 12, 2, 2)
            ctx.fillStyle = '#15803d'
            ctx.fillRect(sx + 14, sy + 16, 2, 6)
          }
          if (tile === TILE.WATER) {
            // Animated water shine
            const waveOff = Math.sin(st.frame * 0.05 + tx + ty * 0.7) * 4
            ctx.fillStyle = tc.detail!
            ctx.globalAlpha = 0.3
            ctx.fillRect(sx + 4 + waveOff, sy + 8, 12, 3)
            ctx.fillRect(sx + 14 - waveOff, sy + 20, 10, 2)
            ctx.globalAlpha = 1
          }
          if (tile === TILE.WOOD) {
            // Trunk rings
            ctx.fillStyle = tc.detail!
            ctx.fillRect(sx + 10, sy + 6, 12, 4)
            ctx.fillRect(sx + 10, sy + 14, 12, 4)
            ctx.fillRect(sx + 10, sy + 22, 12, 4)
          }

          // Tile border (subtle)
          ctx.strokeStyle = 'rgba(0,0,0,0.08)'
          ctx.strokeRect(sx, sy, TILE_S, TILE_S)
        }
      }

      // ── Collect all drawables for y-sort ────────────────────────────
      type Drawable = { y: number; draw: () => void }
      const drawables: Drawable[] = []

      // Mobs
      st.mobs.forEach(m => {
        drawables.push({ y: m.y, draw: () => drawMob(ctx, m, st.camX, st.camY, st.frame) })
      })

      // Player
      drawables.push({ y: st.py, draw: () => {
        const sx = st.px * TILE_S - st.camX
        const sy = st.py * TILE_S - st.camY
        const bob = (dx !== 0 || dy !== 0) ? Math.sin(st.moveT) * 2 : 0
        const isInv = st.invT > 0 && st.frame % 4 < 2

        ctx.save()
        ctx.translate(sx, sy + bob)
        if (isInv) ctx.globalAlpha = 0.5

        // Character shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)'
        ctx.beginPath()
        ctx.ellipse(0, 12, 10, 4, 0, 0, Math.PI * 2)
        ctx.fill()

        // Aura (rarity glow)
        if (activeCharSkin) {
          const auraP = Math.sin(st.frame * 0.04) * 2
          ctx.fillStyle = charSkin.aura
          ctx.beginPath()
          ctx.ellipse(0, 0, 18 + auraP, 18 + auraP, 0, 0, Math.PI * 2)
          ctx.fill()
        }

        // ── Draw Avatar Based on Facing ──────────────────────────────
        const f = st.facing // 0=down,1=left,2=up,3=right
        const legSwing = (dx !== 0 || dy !== 0) ? Math.sin(st.moveT) * 3 : 0

        // Legs
        ctx.fillStyle = charSkin.legs
        if (f === 0 || f === 2) {
          ctx.fillRect(-6 + legSwing, 4, 5, 10)
          ctx.fillRect(1 - legSwing, 4, 5, 10)
          ctx.fillStyle = charSkin.legsDark
          ctx.fillRect(-6 + legSwing, 12, 5, 2)
          ctx.fillRect(1 - legSwing, 12, 5, 2)
        } else {
          ctx.fillRect(-3, 4 + legSwing, 6, 10)
          ctx.fillStyle = charSkin.legsDark
          ctx.fillRect(-3, 12 + legSwing, 6, 2)
        }

        // Body (torso armor)
        ctx.fillStyle = charSkin.body
        ctx.fillRect(-7, -8, 14, 14)
        // Body gradient overlay
        ctx.fillStyle = charSkin.bodyLight
        ctx.fillRect(-7, -8, 14, 4)
        // Center stripe
        ctx.fillStyle = charSkin.bodyDark
        ctx.fillRect(-1, -6, 2, 10)

        // Arms
        ctx.fillStyle = charSkin.body
        if (f === 1) {
          // Left-facing: back arm visible
          ctx.fillRect(-11, -6 - legSwing * 0.5, 4, 10)
        } else if (f === 3) {
          ctx.fillRect(7, -6 - legSwing * 0.5, 4, 10)
        } else {
          // Front/back: both arms
          ctx.fillRect(-11, -6 + legSwing * 0.5, 4, 10)
          ctx.fillRect(7, -6 - legSwing * 0.5, 4, 10)
        }

        // Head
        ctx.fillStyle = charSkin.helmet
        ctx.fillRect(-6, -20, 12, 12)
        // Helmet highlight
        ctx.fillStyle = charSkin.helmetLight
        ctx.fillRect(-6, -20, 12, 3)
        ctx.fillRect(-6, -20, 3, 6)

        // Face
        if (f !== 2) { // Not facing away
          // Eyes
          ctx.fillStyle = charSkin.visor
          ctx.fillRect(-4, -16, 3, 3)
          ctx.fillRect(1, -16, 3, 3)
          // Eye shine
          ctx.fillStyle = '#fff'
          ctx.fillRect(-3, -16, 1, 1)
          ctx.fillRect(2, -16, 1, 1)
          // Mouth
          ctx.fillStyle = charSkin.visor
          ctx.fillRect(-2, -12, 4, 1)
        } else {
          // Back of head
          ctx.fillStyle = charSkin.helmetLight
          ctx.fillRect(-4, -18, 8, 2)
        }

        // ── Weapon (Sword) ────────────────────────────────────────────
        const swingProgress = st.swingT >= 0 ? Math.sin(st.swingT * Math.PI) : 0

        ctx.save()
        // Position sword based on facing
        const swordOffsets = [[5, 2], [-14, -2], [5, -8], [10, -2]][f]
        ctx.translate(swordOffsets[0], swordOffsets[1])

        // Swing animation rotation
        const swingRot = [
          [0, -1.5],    // down: swing left-right
          [1.5, 0],     // left: swing up-down
          [0, 1.5],     // up: swing left-right
          [-1.5, 0],    // right: swing up-down
        ][f]
        ctx.rotate(swingProgress * swingRot[0] + (f === 0 ? -0.3 : f === 2 ? 0.3 : 0))

        // Sword trail
        if (swingProgress > 0.1) {
          ctx.fillStyle = gunSkin.swordTrail
          ctx.beginPath()
          ctx.arc(0, -12, 20, -Math.PI * 0.3, Math.PI * 0.3 * swingProgress)
          ctx.fill()
        }

        // Sword blade
        ctx.shadowColor = gunSkin.swordGlow
        ctx.shadowBlur = swingProgress > 0 ? 12 : 4
        ctx.fillStyle = gunSkin.sword
        ctx.fillRect(-2, -30, 4, 22)
        // Edge highlight
        ctx.fillStyle = gunSkin.swordLight
        ctx.fillRect(-1, -28, 2, 18)
        // Tip
        ctx.beginPath()
        ctx.moveTo(-2, -30); ctx.lineTo(2, -30); ctx.lineTo(0, -35)
        ctx.fillStyle = gunSkin.sword; ctx.fill()
        // Guard
        ctx.fillStyle = '#5c3310'
        ctx.fillRect(-5, -8, 10, 3)
        // Handle
        ctx.fillStyle = '#3a2008'
        ctx.fillRect(-1, -5, 3, 8)
        ctx.shadowBlur = 0

        const gRarity = normalizeRarity(activeGunSkin?.rarity ?? 'common')
        if (activeGunSkin && (gRarity === 'legendary' || gRarity === 'epic')) {
          ctx.globalAlpha = 0.5 + Math.sin(st.frame * 0.12) * 0.3
          ctx.fillStyle = gunSkin.swordLight
          const shimY = (st.frame * 3) % 22
          ctx.fillRect(-1, -28 + shimY, 2, 4)
          ctx.globalAlpha = 1
        }

        ctx.restore() // sword

        // Rarity particles
        if (activeCharSkin && st.frame % 15 === 0) {
          st.particles.push({
            x: sx + (Math.random() - 0.5) * 20,
            y: sy + (Math.random() - 0.5) * 20 - 5,
            vx: (Math.random() - 0.5) * 0.5, vy: -Math.random() * 1.5 - 0.5,
            life: 25, maxLife: 25, color: charSkin.particleColor, size: 2
          })
        }

        ctx.globalAlpha = 1
        ctx.restore() // player
      }})

      // Y-sort render
      drawables.sort((a, b) => a.y - b.y).forEach(d => d.draw())

      // ── Particles ──────────────────────────────────────────────────
      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i]
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life--
        if (p.life <= 0) { st.particles.splice(i, 1); continue }
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.life / p.maxLife
        ctx.fillRect(p.x - st.camX - p.size / 2, p.y - st.camY - p.size / 2, p.size, p.size)
        ctx.globalAlpha = 1
      }

      // ── Floating Texts ─────────────────────────────────────────────
      for (let i = st.texts.length - 1; i >= 0; i--) {
        const t = st.texts[i]; t.y -= 0.8; t.life--
        if (t.life <= 0) { st.texts.splice(i, 1); continue }
        ctx.font = 'bold 14px "JetBrains Mono"'
        ctx.textAlign = 'center'
        ctx.fillStyle = t.color
        ctx.globalAlpha = Math.min(1, t.life / 15)
        // Pixel-art text shadow
        ctx.fillStyle = '#000'
        ctx.fillText(t.text, t.x - st.camX + 1, t.y - st.camY + 1)
        ctx.fillStyle = t.color
        ctx.fillText(t.text, t.x - st.camX, t.y - st.camY)
        ctx.globalAlpha = 1
      }

      // ── HUD ─────────────────────────────────────────────────────────
      // Health hearts
      for (let i = 0; i < 10; i++) {
        const hx = 16 + i * 16
        const hy = H - 42
        if (st.hp >= (i + 1) * 2) drawPixelHeart(ctx, hx, hy, '#e53e3e')
        else if (st.hp >= i * 2 + 1) drawPixelHeart(ctx, hx, hy, '#e53e3e', true)
        else drawPixelHeart(ctx, hx, hy, '#333')
      }

      // XP bar
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(16, H - 22, 170, 8)
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(16, H - 22, 170 * (st.xp / (st.level * 50)), 8)
      ctx.font = '9px "JetBrains Mono"'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.fillText(`LVL ${st.level}`, 100, H - 15)

      // Score
      ctx.font = 'bold 13px "JetBrains Mono"'
      ctx.textAlign = 'left'
      ctx.fillStyle = '#000'; ctx.fillText(`SCORE: ${st.score}`, 17, 21)
      ctx.fillStyle = '#22c55e'; ctx.fillText(`SCORE: ${st.score}`, 16, 20)

      // Skin labels (top-right)
      ctx.textAlign = 'right'
      ctx.font = 'bold 11px "JetBrains Mono"'
      ctx.fillStyle = '#000'
      ctx.fillText(`⚔ ${activeGunSkin?.name || 'Stone Sword'}`, W - 11, 21)
      ctx.fillStyle = gunSkin.sword
      ctx.fillText(`⚔ ${activeGunSkin?.name || 'Stone Sword'}`, W - 12, 20)

      ctx.fillStyle = '#000'
      ctx.fillText(`🧑 ${activeCharSkin?.name || 'Steve'}`, W - 11, 37)
      ctx.fillStyle = charSkin.helmetLight
      ctx.fillText(`🧑 ${activeCharSkin?.name || 'Steve'}`, W - 12, 36)

      // Controls hint (bottom-right)
      ctx.textAlign = 'right'
      ctx.font = '10px "JetBrains Mono"'
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.fillText('WASD = Move | Click/Space = Attack', W - 12, H - 10)

      animId = requestAnimationFrame(loop)
    }

    loop()
    return () => cancelAnimationFrame(animId)
  }, [gameStarted, activeGunSkin, activeCharSkin])

  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0f0d', overflow: 'hidden', position: 'relative' }}>
      {!gameStarted && (
        <StartScreen
          activeGunSkin={activeGunSkin}
          activeCharSkin={activeCharSkin}
          onStart={() => setGameStarted(true)}
        />
      )}
      {gameStarted && (
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }} />
      )}
    </div>
  )
}

// ─── Draw a Mob Sprite ───────────────────────────────────────────────────────
function drawMob(ctx: CanvasRenderingContext2D, m: Mob, camX: number, camY: number, frame: number) {
  const sx = m.x * TILE_S - camX
  const sy = m.y * TILE_S - camY
  const shake = m.hit > 0 ? (Math.random() - 0.5) * 3 : 0
  const bob = Math.sin(m.phase) * 1.5
  const legSwing = Math.sin(m.phase) * 3

  ctx.save()
  ctx.translate(sx + shake, sy + bob)

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(0, 12, 8, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  if (m.hit > 0) {
    ctx.globalAlpha = m.hit % 2 === 0 ? 0.6 : 1
  }

  if (m.type === 'zombie') {
    // Legs
    ctx.fillStyle = '#303870'
    ctx.fillRect(-5 + legSwing, 4, 4, 9)
    ctx.fillRect(1 - legSwing, 4, 4, 9)
    // Body
    ctx.fillStyle = '#3a6a4a'
    ctx.fillRect(-6, -7, 12, 13)
    ctx.fillStyle = '#2e5a78'
    ctx.fillRect(-6, -7, 12, 5)
    // Arms (stretched forward like Minecraft zombie)
    ctx.fillStyle = '#5a8a5a'
    ctx.fillRect(-10, -6, 4, 12)
    ctx.fillRect(6, -6, 4, 12)
    // Head
    ctx.fillStyle = '#5a8a5a'
    ctx.fillRect(-5, -19, 10, 12)
    ctx.fillStyle = '#6aa06a'
    ctx.fillRect(-5, -19, 10, 3)
    // Eyes
    ctx.fillStyle = '#111'
    ctx.fillRect(-3, -15, 2, 2)
    ctx.fillRect(1, -15, 2, 2)
    // Mouth
    ctx.fillStyle = '#2a4a2a'
    ctx.fillRect(-2, -11, 4, 2)
  } else if (m.type === 'creeper') {
    // Legs (4 short legs)
    ctx.fillStyle = '#15803d'
    ctx.fillRect(-6, 4, 4, 6)
    ctx.fillRect(2, 4, 4, 6)
    // Body
    ctx.fillStyle = '#22c55e'
    ctx.fillRect(-5, -6, 10, 12)
    ctx.fillStyle = '#1aaa4a'
    ctx.fillRect(-5, -6, 10, 4)
    // Head (bigger)
    ctx.fillStyle = '#22c55e'
    ctx.fillRect(-6, -20, 12, 14)
    ctx.fillStyle = '#2edb5e'
    ctx.fillRect(-6, -20, 12, 3)
    // Creeper face!
    ctx.fillStyle = '#111'
    // Eyes
    ctx.fillRect(-4, -17, 3, 3)
    ctx.fillRect(1, -17, 3, 3)
    // Nose bridge
    ctx.fillRect(-1, -13, 2, 2)
    // Mouth (sad frown)
    ctx.fillRect(-3, -11, 6, 2)
    ctx.fillRect(-2, -9, 1, 2)
    ctx.fillRect(1, -9, 1, 2)
  } else {
    // Skeleton
    // Legs (thin)
    ctx.fillStyle = '#d4d4d4'
    ctx.fillRect(-3 + legSwing, 4, 2, 9)
    ctx.fillRect(1 - legSwing, 4, 2, 9)
    // Ribcage body (thin)
    ctx.fillStyle = '#e5e5e5'
    ctx.fillRect(-1, -6, 2, 12)
    ctx.fillStyle = '#ccc'
    ctx.fillRect(-4, -5, 8, 1)
    ctx.fillRect(-4, -2, 8, 1)
    ctx.fillRect(-4, 1, 8, 1)
    // Arms holding bow
    ctx.fillStyle = '#d4d4d4'
    ctx.fillRect(-8, -5, 3, 10)
    ctx.fillRect(5, -5, 3, 10)
    // Head
    ctx.fillStyle = '#e5e5e5'
    ctx.fillRect(-5, -18, 10, 12)
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(-5, -18, 10, 3)
    // Eyes
    ctx.fillStyle = '#111'
    ctx.fillRect(-3, -15, 2, 2)
    ctx.fillRect(1, -15, 2, 2)
    // Nose
    ctx.fillStyle = '#bbb'
    ctx.fillRect(-1, -12, 2, 1)
    // Mouth
    ctx.fillStyle = '#111'
    ctx.fillRect(-3, -10, 6, 1)
    // Bow
    ctx.strokeStyle = '#8b4513'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(9, -2, 8, -0.8, 0.8)
    ctx.stroke()
    ctx.strokeStyle = '#aaa'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(9, -9)
    ctx.lineTo(9, 5)
    ctx.stroke()
  }

  // HP bar
  if (m.hp < m.maxHp) {
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(0,0,0,0.6)'
    ctx.fillRect(-10, -25, 20, 3)
    const pct = m.hp / m.maxHp
    ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#eab308' : '#ef4444'
    ctx.fillRect(-10, -25, 20 * pct, 3)
  }

  ctx.globalAlpha = 1
  ctx.restore()
}

// ─── Draw Pixel Heart ────────────────────────────────────────────────────────
function drawPixelHeart(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, half = false) {
  ctx.fillStyle = '#111'
  ctx.fillRect(x, y, 14, 12)
  ctx.fillStyle = color

  // Heart pixel pattern
  ctx.fillRect(x + 1, y + 2, 4, 4)
  ctx.fillRect(x + 3, y + 1, 3, 2)
  if (!half) {
    ctx.fillRect(x + 7, y + 1, 3, 2)
    ctx.fillRect(x + 8, y + 2, 4, 4)
  }
  ctx.fillRect(x + 1, y + 5, half ? 6 : 12, 3)
  ctx.fillRect(x + 2, y + 8, half ? 4 : 10, 2)
  ctx.fillRect(x + 4, y + 10, half ? 2 : 6, 1)
  ctx.fillRect(x + 6, y + 11, half ? 0 : 2, 1)
}
