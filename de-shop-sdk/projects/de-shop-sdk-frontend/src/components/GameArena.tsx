import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import type { Asset } from '../sdk/DeShopSDK'
import { normalizeRarity } from '../sdk/DeShopSDK'

type GameArenaProps = {
  activeGunSkin: Asset | null
  activeCharSkin: Asset | null
}

// ─── Rarity Skin Palette ─────────────────────────────────────────────────────
const SKIN_PALETTE: Record<string, {
  helmet: number; helmetLight: number; visor: number
  body: number; bodyLight: number; bodyDark: number
  legs: number; legsDark: number
  sword: number; swordLight: number; swordGlow: number; swordGlowIntensity: number
  particleColor: number
  dmgMulti: number
}> = {
  common: {
    helmet: 0x6b7280, helmetLight: 0x9ca3af, visor: 0x374151,
    body: 0x4b5563, bodyLight: 0x6b7280, bodyDark: 0x374151,
    legs: 0x4b5563, legsDark: 0x374151,
    sword: 0x9ca3af, swordLight: 0xd1d5db, swordGlow: 0x000000, swordGlowIntensity: 0,
    particleColor: 0x9ca3af,
    dmgMulti: 1,
  },
  rare: {
    helmet: 0x2563eb, helmetLight: 0x60a5fa, visor: 0x1e3a5f,
    body: 0x1d4ed8, bodyLight: 0x3b82f6, bodyDark: 0x1e40af,
    legs: 0x1e3a8a, legsDark: 0x1e3070,
    sword: 0x60a5fa, swordLight: 0x93c5fd, swordGlow: 0x2563eb, swordGlowIntensity: 1.2,
    particleColor: 0x60a5fa,
    dmgMulti: 1.5,
  },
  epic: {
    helmet: 0x7c3aed, helmetLight: 0xa78bfa, visor: 0x4c1d95,
    body: 0x6d28d9, bodyLight: 0x8b5cf6, bodyDark: 0x5b21b6,
    legs: 0x4c1d95, legsDark: 0x3b0f80,
    sword: 0xc084fc, swordLight: 0xe9d5ff, swordGlow: 0x7c3aed, swordGlowIntensity: 2.0,
    particleColor: 0xa78bfa,
    dmgMulti: 2,
  },
  legendary: {
    helmet: 0xd97706, helmetLight: 0xfbbf24, visor: 0x92400e,
    body: 0xb45309, bodyLight: 0xf59e0b, bodyDark: 0x92400e,
    legs: 0x78350f, legsDark: 0x5c2a0a,
    sword: 0xf59e0b, swordLight: 0xfef3c7, swordGlow: 0xd97706, swordGlowIntensity: 3.5,
    particleColor: 0xfbbf24,
    dmgMulti: 3,
  },
}

function getSkinPalette(asset: Asset | null): typeof SKIN_PALETTE['common'] {
  if (!asset) return SKIN_PALETTE.common
  const rarity = normalizeRarity(asset.rarity ?? 'common')
  return SKIN_PALETTE[rarity] || SKIN_PALETTE.common
}

interface Mob3D {
  mesh: THREE.Group
  type: 'zombie' | 'creeper' | 'skeleton'
  hp: number
  maxHp: number
  hitTime: number
  velocity: THREE.Vector3
  facingAngle: number
  attackCooldown: number
}

interface Particle3D {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  life: number
  maxLife: number
}

interface DamageIndicator {
  id: string
  text: string
  color: string
  position: THREE.Vector3
  life: number
  screenPos: { x: number; y: number }
}

export default function GameArena({ activeGunSkin, activeCharSkin }: GameArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [playerHp, setPlayerHp] = useState(20)
  const [damageIndicators, setDamageIndicators] = useState<DamageIndicator[]>([])

  // Input states
  const keysPressed = useRef<Set<string>>(new Set())

  // Game references for loop
  const gameRefs = useRef<{
    scene: THREE.Scene | null
    camera: THREE.PerspectiveCamera | null
    renderer: THREE.WebGLRenderer | null
    playerGroup: THREE.Group | null
    swordGroup: THREE.Group | null
    mobs: Mob3D[]
    particles: Particle3D[]
    ambientLight: THREE.AmbientLight | null
    dirLight: THREE.DirectionalLight | null
    frame: number
    animationId: number
    isAttacking: boolean
    attackProgress: number
    invulnerabilityTime: number
    xp: number
    level: number
    score: number
    hp: number
    lastTime: number
    damageIndicatorList: DamageIndicator[]
  }>({
    scene: null,
    camera: null,
    renderer: null,
    playerGroup: null,
    swordGroup: null,
    mobs: [],
    particles: [],
    ambientLight: null,
    dirLight: null,
    frame: 0,
    animationId: 0,
    isAttacking: false,
    attackProgress: 0,
    invulnerabilityTime: 0,
    xp: 0,
    level: 1,
    score: 0,
    hp: 20,
    lastTime: 0,
    damageIndicatorList: []
  })

  // Keyboard handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysPressed.current.add(e.key.toLowerCase())
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      triggerAttack()
    }
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysPressed.current.delete(e.key.toLowerCase())
  }, [])

  const triggerAttack = () => {
    if (gameRefs.current.isAttacking) return
    gameRefs.current.isAttacking = true
    gameRefs.current.attackProgress = 0
  }

  // Effect to register inputs
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  // Click container to attack
  const handleCanvasClick = () => {
    if (gameStarted) {
      triggerAttack()
    }
  }

  // ─── Initialize 3D Engine ──────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight || 350

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0e1118) // Cyberpunk night deep sky
    scene.fog = new THREE.FogExp2(0x0e1118, 0.04)

    // Camera setup
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    // Top-down / Isometric viewpoint angle
    camera.position.set(0, 15, 12)
    camera.lookAt(0, 0, 0)

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    
    // Clear any previous canvas
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
    scene.add(ambientLight)

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85)
    dirLight.position.set(15, 30, 10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 1024
    dirLight.shadow.mapSize.height = 1024
    dirLight.shadow.bias = -0.0005
    scene.add(dirLight)

    // ─── Draw Floating 3D Voxel Arena Platform ───
    const platformGroup = new THREE.Group()
    
    // Grassy blocks grid (size 22x22)
    const platformSize = 22
    const boxGeo = new THREE.BoxGeometry(1, 1, 1)
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x4a8c2a })
    const dirtMat = new THREE.MeshLambertMaterial({ color: 0x8b6b3d })

    for (let x = -platformSize / 2; x <= platformSize / 2; x++) {
      for (let z = -platformSize / 2; z <= platformSize / 2; z++) {
        // Base grass block
        const grass = new THREE.Mesh(boxGeo, grassMat)
        grass.position.set(x, 0, z)
        grass.receiveShadow = true
        platformGroup.add(grass)

        // Underneath dirt block for depth
        const dirt = new THREE.Mesh(boxGeo, dirtMat)
        dirt.position.set(x, -1, z)
        dirt.receiveShadow = true
        platformGroup.add(dirt)
      }
    }
    
    // Add decorative structures on platform (Stone Pillars)
    const stoneGeo = new THREE.BoxGeometry(1.2, 3.5, 1.2)
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x606060 })
    const pillars = [
      [-6, -6], [6, -6], [-6, 6], [6, 6]
    ]
    pillars.forEach(([px, pz]) => {
      const pillar = new THREE.Mesh(stoneGeo, stoneMat)
      pillar.position.set(px, 1.75, pz)
      pillar.castShadow = true
      pillar.receiveShadow = true
      platformGroup.add(pillar)
    })

    scene.add(platformGroup)

    // ─── Draw 3D Player Character from Blocks ───
    const playerGroup = new THREE.Group()
    playerGroup.position.set(0, 0.5, 0)
    scene.add(playerGroup)

    // Apply active skin palette
    const charSkin = getSkinPalette(activeCharSkin)
    const gunSkin = getSkinPalette(activeGunSkin)

    // Torso/Body
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.0, 0.4)
    const bodyMat = new THREE.MeshLambertMaterial({ color: charSkin.body })
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat)
    bodyMesh.position.set(0, 0.9, 0)
    bodyMesh.castShadow = true
    playerGroup.add(bodyMesh)

    // Helmet/Head
    const headGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7)
    const headMat = new THREE.MeshLambertMaterial({ color: charSkin.helmet })
    const headMesh = new THREE.Mesh(headGeo, headMat)
    headMesh.position.set(0, 1.75, 0)
    headMesh.castShadow = true
    playerGroup.add(headMesh)

    // Visor/Eyes
    const visorGeo = new THREE.BoxGeometry(0.5, 0.15, 0.1)
    const visorMat = new THREE.MeshBasicMaterial({ color: charSkin.visor })
    const visorMesh = new THREE.Mesh(visorGeo, visorMat)
    visorMesh.position.set(0, 1.8, 0.31)
    playerGroup.add(visorMesh)

    // Left Arm
    const armGeo = new THREE.BoxGeometry(0.3, 0.9, 0.3)
    const armMat = new THREE.MeshLambertMaterial({ color: charSkin.bodyLight })
    const leftArmMesh = new THREE.Mesh(armGeo, armMat)
    leftArmMesh.position.set(-0.55, 0.85, 0)
    leftArmMesh.castShadow = true
    playerGroup.add(leftArmMesh)

    // Right Arm (acts as sword holder)
    const rightArmGroup = new THREE.Group()
    rightArmGroup.position.set(0.55, 1.2, 0)
    playerGroup.add(rightArmGroup)

    const rightArmMesh = new THREE.Mesh(armGeo, armMat)
    rightArmMesh.position.set(0, -0.35, 0)
    rightArmMesh.castShadow = true
    rightArmGroup.add(rightArmMesh)

    // Legs
    const legGeo = new THREE.BoxGeometry(0.35, 0.8, 0.35)
    const legMat = new THREE.MeshLambertMaterial({ color: charSkin.legs })
    const leftLegMesh = new THREE.Mesh(legGeo, legMat)
    leftLegMesh.position.set(-0.22, 0.4, 0)
    leftLegMesh.castShadow = true
    playerGroup.add(leftLegMesh)

    const rightLegMesh = new THREE.Mesh(legGeo, legMat)
    rightLegMesh.position.set(0.22, 0.4, 0)
    rightLegMesh.castShadow = true
    playerGroup.add(rightLegMesh)

    // ─── Draw 3D Weapon (Sword) ───
    const swordGroup = new THREE.Group()
    // Align with right hand
    swordGroup.position.set(0, -0.7, 0.1)
    swordGroup.rotation.x = -Math.PI / 3 // Angle sword forward
    rightArmGroup.add(swordGroup)

    // Hilt/Handle
    const handleGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1)
    const handleMat = new THREE.MeshLambertMaterial({ color: 0x4a3520 })
    const handle = new THREE.Mesh(handleGeo, handleMat)
    handle.position.set(0, 0, 0)
    swordGroup.add(handle)

    // Guard
    const guardGeo = new THREE.BoxGeometry(0.35, 0.08, 0.15)
    const guardMat = new THREE.MeshLambertMaterial({ color: 0x5c3310 })
    const guard = new THREE.Mesh(guardGeo, guardMat)
    guard.position.set(0, 0.2, 0)
    swordGroup.add(guard)

    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.12, 1.2, 0.05)
    const bladeMat = new THREE.MeshStandardMaterial({
      color: gunSkin.sword,
      emissive: gunSkin.swordGlow,
      emissiveIntensity: gunSkin.swordGlowIntensity,
      roughness: 0.2,
      metalness: 0.8,
    })
    const blade = new THREE.Mesh(bladeGeo, bladeMat)
    blade.position.set(0, 0.8, 0)
    blade.castShadow = true
    swordGroup.add(blade)

    // Gem on guard
    const gemGeo = new THREE.SphereGeometry(0.06, 4, 4)
    const gemMat = new THREE.MeshBasicMaterial({ color: gunSkin.swordLight })
    const gem = new THREE.Mesh(gemGeo, gemMat)
    gem.position.set(0, 0.2, 0.08)
    swordGroup.add(gem)

    // Aura ring around player if character skin is active
    let auraRing: THREE.Mesh | null = null
    if (activeCharSkin) {
      const ringGeo = new THREE.RingGeometry(1.2, 1.3, 16)
      const ringMat = new THREE.MeshBasicMaterial({
        color: charSkin.particleColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.3
      })
      auraRing = new THREE.Mesh(ringGeo, ringMat)
      auraRing.rotation.x = Math.PI / 2
      auraRing.position.set(0, 0.05, 0)
      playerGroup.add(auraRing)
    }

    // Save refs
    gameRefs.current.scene = scene
    gameRefs.current.camera = camera
    gameRefs.current.renderer = renderer
    gameRefs.current.playerGroup = playerGroup
    gameRefs.current.swordGroup = swordGroup
    gameRefs.current.ambientLight = ambientLight
    gameRefs.current.dirLight = dirLight

    // Handle Resize
    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // Clear active mobs and particles
    gameRefs.current.mobs.forEach(m => scene.remove(m.mesh))
    gameRefs.current.particles.forEach(p => scene.remove(p.mesh))
    gameRefs.current.mobs = []
    gameRefs.current.particles = []

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(gameRefs.current.animationId)

      // Dispose of geometries & materials to avoid memory leaks
      boxGeo.dispose()
      grassMat.dispose()
      dirtMat.dispose()
      stoneGeo.dispose()
      stoneMat.dispose()
      bodyGeo.dispose()
      bodyMat.dispose()
      headGeo.dispose()
      headMat.dispose()
      visorGeo.dispose()
      visorMat.dispose()
      armGeo.dispose()
      armMat.dispose()
      legGeo.dispose()
      legMat.dispose()
      handleGeo.dispose()
      handleMat.dispose()
      guardGeo.dispose()
      guardMat.dispose()
      bladeGeo.dispose()
      bladeMat.dispose()
      gemGeo.dispose()
      gemMat.dispose()

      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [activeGunSkin, activeCharSkin, gameStarted])

  // ─── Spawn 3D Mobs ─────────────────────────────────────────────────────────
  const create3DMob = (type: 'zombie' | 'creeper' | 'skeleton', sx: number, sz: number) => {
    const scene = gameRefs.current.scene
    if (!scene) return

    const mobGroup = new THREE.Group()
    mobGroup.position.set(sx, 0.5, sz)
    scene.add(mobGroup)

    let bodyColor = 0x5a7a5a // Zombie green
    let headColor = 0x22c55e // Zombie bright green
    let legColor = 0x1e3a8a // Blue pants

    if (type === 'creeper') {
      bodyColor = 0x246812
      headColor = 0x2d7a1a
      legColor = 0x246812
    } else if (type === 'skeleton') {
      bodyColor = 0xcccccc
      headColor = 0xdddddd
      legColor = 0xcccccc
    }

    const boxGeo = new THREE.BoxGeometry(1, 1, 1)

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.8, 1.0, 0.4)
    const torsoMat = new THREE.MeshLambertMaterial({ color: bodyColor })
    const torso = new THREE.Mesh(torsoGeo, torsoMat)
    torso.position.set(0, 0.9, 0)
    torso.castShadow = true
    mobGroup.add(torso)

    // Head
    const mobHeadGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7)
    const headMat = new THREE.MeshLambertMaterial({ color: headColor })
    const head = new THREE.Mesh(mobHeadGeo, headMat)
    head.position.set(0, 1.75, 0)
    head.castShadow = true
    mobGroup.add(head)

    // Arms (reaching forward for zombies, none for creeper, holding bow for skeleton)
    const armGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25)
    const armMat = new THREE.MeshLambertMaterial({ color: headColor })

    if (type === 'zombie') {
      // Arms pointing forward
      const leftArm = new THREE.Mesh(armGeo, armMat)
      leftArm.position.set(-0.5, 1.0, 0.3)
      leftArm.rotation.x = -Math.PI / 2
      leftArm.castShadow = true
      mobGroup.add(leftArm)

      const rightArm = new THREE.Mesh(armGeo, armMat)
      rightArm.position.set(0.5, 1.0, 0.3)
      rightArm.rotation.x = -Math.PI / 2
      rightArm.castShadow = true
      mobGroup.add(rightArm)
    } else if (type === 'skeleton') {
      // Light gray arms holding bow
      const leftArm = new THREE.Mesh(armGeo, armMat)
      leftArm.position.set(-0.5, 1.0, 0.2)
      leftArm.rotation.x = -Math.PI / 3
      leftArm.castShadow = true
      mobGroup.add(leftArm)

      // Bow simulation (brown box)
      const bowGeo = new THREE.BoxGeometry(0.08, 0.8, 0.08)
      const bowMat = new THREE.MeshLambertMaterial({ color: 0x5a3e1e })
      const bow = new THREE.Mesh(bowGeo, bowMat)
      bow.position.set(-0.5, 1.0, 0.5)
      bow.rotation.z = Math.PI / 6
      mobGroup.add(bow)
    }

    // Legs
    const legGeo = new THREE.BoxGeometry(0.35, 0.8, 0.35)
    const legMat = new THREE.MeshLambertMaterial({ color: legColor })
    
    const leftLeg = new THREE.Mesh(legGeo, legMat)
    leftLeg.position.set(-0.2, 0.4, 0)
    leftLeg.castShadow = true
    mobGroup.add(leftLeg)

    const rightLeg = new THREE.Mesh(legGeo, legMat)
    rightLeg.position.set(0.2, 0.4, 0)
    rightLeg.castShadow = true
    mobGroup.add(rightLeg)

    // Save mob definition
    const maxHp = type === 'creeper' ? 12 : type === 'skeleton' ? 8 : 10
    const mob: Mob3D = {
      mesh: mobGroup,
      type,
      hp: maxHp,
      maxHp,
      hitTime: 0,
      velocity: new THREE.Vector3(0, 0, 0),
      facingAngle: 0,
      attackCooldown: 0
    }

    gameRefs.current.mobs.push(mob)
  }

  // ─── 3D Particles Burst ───────────────────────────────────────────────────
  const triggerParticleBurst = (pos: THREE.Vector3, colorHex: number, count = 10) => {
    const scene = gameRefs.current.scene
    if (!scene) return

    const partGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12)
    const partMat = new THREE.MeshBasicMaterial({ color: colorHex })

    for (let i = 0; i < count; i++) {
      const pMesh = new THREE.Mesh(partGeo, partMat)
      pMesh.position.copy(pos)
      pMesh.position.y += Math.random() * 0.5
      scene.add(pMesh)

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() * 2) + 1,
        (Math.random() - 0.5) * 3
      )

      gameRefs.current.particles.push({
        mesh: pMesh,
        velocity: vel,
        life: 0,
        maxLife: 25 + Math.random() * 20
      })
    }
  }

  // ─── Spawn Initial Mobs ──────────────────────────────────────────────────
  const spawnInitialMobs = () => {
    // Spawn 7 mobs in random positions
    for (let i = 0; i < 7; i++) {
      const types: ('zombie' | 'creeper' | 'skeleton')[] = ['zombie', 'creeper', 'skeleton']
      const type = types[Math.floor(Math.random() * types.length)]
      const angle = Math.random() * Math.PI * 2
      const radius = 6 + Math.random() * 4
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      create3DMob(type, x, z)
    }
  }

  // ─── Main Game loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameStarted) return

    spawnInitialMobs()
    gameRefs.current.lastTime = performance.now()

    const animate = () => {
      const st = gameRefs.current
      if (!st.scene || !st.renderer || !st.camera || !st.playerGroup) return

      st.frame++
      const now = performance.now()
      const dt = Math.min((now - st.lastTime) / 1000, 0.1) // Cap DT
      st.lastTime = now

      // ─── Controls/Movement ───
      const keys = keysPressed.current
      const moveSpd = 4.5
      const moveDir = new THREE.Vector3(0, 0, 0)

      if (keys.has('w') || keys.has('arrowup')) moveDir.z = -1
      if (keys.has('s') || keys.has('arrowdown')) moveDir.z = 1
      if (keys.has('a') || keys.has('arrowleft')) moveDir.x = -1
      if (keys.has('d') || keys.has('arrowright')) moveDir.x = 1

      if (moveDir.length() > 0) {
        moveDir.normalize().multiplyScalar(moveSpd * dt)
        st.playerGroup.position.add(moveDir)

        // Rotate player towards movement direction
        const targetAngle = Math.atan2(moveDir.x, moveDir.z)
        st.playerGroup.rotation.y = targetAngle

        // Walk bobbing animation
        const walkCycle = st.frame * 0.25
        const leftLeg = st.playerGroup.children[4]
        const rightLeg = st.playerGroup.children[5]
        const leftArm = st.playerGroup.children[3]
        if (leftLeg && rightLeg && leftArm) {
          leftLeg.rotation.x = Math.sin(walkCycle) * 0.4
          rightLeg.rotation.x = -Math.sin(walkCycle) * 0.4
          leftArm.rotation.x = -Math.sin(walkCycle) * 0.4
        }
      } else {
        // Reset limbs
        const leftLeg = st.playerGroup.children[4]
        const rightLeg = st.playerGroup.children[5]
        const leftArm = st.playerGroup.children[3]
        if (leftLeg && rightLeg && leftArm) {
          leftLeg.rotation.x = 0
          rightLeg.rotation.x = 0
          leftArm.rotation.x = 0
        }
      }

      // Constrain player inside platform
      const limit = 10.5
      st.playerGroup.position.x = Math.max(-limit, Math.min(limit, st.playerGroup.position.x))
      st.playerGroup.position.z = Math.max(-limit, Math.min(limit, st.playerGroup.position.z))

      // Camera follows player smoothly
      const targetCamPos = new THREE.Vector3(
        st.playerGroup.position.x,
        st.playerGroup.position.y + 13,
        st.playerGroup.position.z + 10
      )
      st.camera.position.lerp(targetCamPos, 0.08)
      st.camera.lookAt(st.playerGroup.position)

      // Direct light follows player to ensure shadow coverage
      if (st.dirLight) {
        st.dirLight.position.set(
          st.playerGroup.position.x + 15,
          st.playerGroup.position.y + 30,
          st.playerGroup.position.z + 10
        )
        st.dirLight.target = st.playerGroup
      }

      // ─── Sword swing animation ───
      const rightArmGroup = st.playerGroup.children[2] // index 2 is right arm group
      if (rightArmGroup && st.swordGroup) {
        if (st.isAttacking) {
          st.attackProgress += dt * 10 // Attack speed modifier
          
          if (st.attackProgress < 0.5) {
            // Swing forward
            const angle = (st.attackProgress / 0.5) * (-Math.PI / 1.5)
            rightArmGroup.rotation.x = angle
          } else if (st.attackProgress < 1.0) {
            // Return back
            const t = (st.attackProgress - 0.5) / 0.5
            const angle = -Math.PI / 1.5 + t * (Math.PI / 1.5)
            rightArmGroup.rotation.x = angle
          } else {
            rightArmGroup.rotation.x = 0
            st.isAttacking = false
            st.attackProgress = 0
          }

          // Hit check at peak of swing
          if (st.attackProgress >= 0.4 && st.attackProgress <= 0.6) {
            // Compute sword collision tip in world space
            const forwardOffset = new THREE.Vector3(0, 0, 1.6).applyQuaternion(st.playerGroup.quaternion)
            const weaponReachPos = st.playerGroup.position.clone().add(forwardOffset)

            st.mobs.forEach(mob => {
              if (mob.hp <= 0) return
              const dist = weaponReachPos.distanceTo(mob.mesh.position)
              
              if (dist < 1.8) {
                // Apply Damage
                const rarityMulti = getSkinPalette(activeGunSkin).dmgMulti
                const dmg = Math.ceil(3 * rarityMulti)
                
                mob.hp -= dmg
                mob.hitTime = 8 // Frames red flash
                
                // Knockback direction
                const kbDir = mob.mesh.position.clone().sub(st.playerGroup!.position).normalize()
                kbDir.y = 0.2 // pop slightly into air
                mob.velocity.copy(kbDir.multiplyScalar(4.5))

                // Hit particles
                triggerParticleBurst(mob.mesh.position, getSkinPalette(activeGunSkin).particleColor, 6)

                // Damage indicator text in screen space
                const indicator: DamageIndicator = {
                  id: `dmg-${Date.now()}-${Math.random()}`,
                  text: `${dmg}`,
                  color: activeGunSkin ? 'var(--cyan-bright)' : '#ef4444',
                  position: mob.mesh.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.8, (Math.random() - 0.5) * 0.4)),
                  life: 0,
                  screenPos: { x: 0, y: 0 }
                }
                st.damageIndicatorList.push(indicator)
              }
            })
          }
        }
      }

      // ─── Invulnerability timer ───
      if (st.invulnerabilityTime > 0) {
        st.invulnerabilityTime--
        // Flashing visibility mesh
        st.playerGroup.visible = st.frame % 6 >= 3
      } else {
        st.playerGroup.visible = true
      }

      // ─── Particles loop ───
      for (let i = st.particles.length - 1; i >= 0; i--) {
        const p = st.particles[i]
        p.life++
        p.mesh.position.addScaledVector(p.velocity, dt)
        p.velocity.y -= 9.8 * dt // Gravity

        // Size decay
        const sizeScale = 1 - (p.life / p.maxLife)
        p.mesh.scale.set(sizeScale, sizeScale, sizeScale)

        if (p.life >= p.maxLife) {
          st.scene.remove(p.mesh)
          st.particles.splice(i, 1)
        }
      }

      // ─── Mob update loop ───
      st.mobs.forEach((mob, idx) => {
        if (mob.hp <= 0) return

        // Hit flash animation
        const torso = mob.mesh.children[0] as THREE.Mesh
        const head = mob.mesh.children[1] as THREE.Mesh
        if (torso && head) {
          if (mob.hitTime > 0) {
            mob.hitTime--
            ;(torso.material as THREE.MeshLambertMaterial).emissive.setHex(0xaa0000)
            ;(head.material as THREE.MeshLambertMaterial).emissive.setHex(0xaa0000)
          } else {
            ;(torso.material as THREE.MeshLambertMaterial).emissive.setHex(0x000000)
            ;(head.material as THREE.MeshLambertMaterial).emissive.setHex(0x000000)
          }
        }

        // Apply knockback velocities
        mob.mesh.position.addScaledVector(mob.velocity, dt)
        mob.velocity.multiplyScalar(0.85) // damping

        // AI Navigation: move towards player
        const toPlayer = st.playerGroup!.position.clone().sub(mob.mesh.position)
        toPlayer.y = 0
        const dist = toPlayer.length()

        if (dist < 12 && mob.velocity.length() < 0.5) {
          toPlayer.normalize()
          const mobSpeed = mob.type === 'creeper' ? 2.4 : mob.type === 'skeleton' ? 1.6 : 1.8
          mob.mesh.position.addScaledVector(toPlayer, mobSpeed * dt)

          // Face player
          mob.mesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z)

          // Limb walking cycle
          const leftLeg = mob.mesh.children[mob.mesh.children.length - 2]
          const rightLeg = mob.mesh.children[mob.mesh.children.length - 1]
          if (leftLeg && rightLeg) {
            leftLeg.rotation.x = Math.sin(st.frame * 0.15) * 0.35
            rightLeg.rotation.x = -Math.sin(st.frame * 0.15) * 0.35
          }

          // Contact Attack
          if (dist < 0.9 && mob.attackCooldown <= 0 && st.invulnerabilityTime <= 0) {
            const dmg = mob.type === 'creeper' ? 4 : 2
            st.hp = Math.max(0, st.hp - dmg)
            setPlayerHp(st.hp)
            st.invulnerabilityTime = 30
            mob.attackCooldown = 50 // frames cooldown

            // Screen damage indicator
            const indicator: DamageIndicator = {
              id: `dmg-player-${Date.now()}`,
              text: `-${dmg}`,
              color: '#ef4444',
              position: st.playerGroup!.position.clone().add(new THREE.Vector3(0, 1.8, 0)),
              life: 0,
              screenPos: { x: 0, y: 0 }
            }
            st.damageIndicatorList.push(indicator)

            // Creeper explodes on hit
            if (mob.type === 'creeper') {
              mob.hp = 0
              triggerParticleBurst(mob.mesh.position, 0x246812, 18)
            }
          }
        }

        if (mob.attackCooldown > 0) mob.attackCooldown--

        // Keep mob within bounds
        mob.mesh.position.x = Math.max(-limit, Math.min(limit, mob.mesh.position.x))
        mob.mesh.position.z = Math.max(-limit, Math.min(limit, mob.mesh.position.z))
      })

      // Remove dead mobs
      for (let i = st.mobs.length - 1; i >= 0; i--) {
        const mob = st.mobs[i]
        if (mob.hp <= 0) {
          st.scene.remove(mob.mesh)
          
          const expPoints = mob.type === 'creeper' ? 30 : mob.type === 'skeleton' ? 20 : 15
          st.score += expPoints
          st.xp += expPoints
          
          setScore(st.score)
          
          // Level Up logic
          const xpNeeded = st.level * 50
          if (st.xp >= xpNeeded) {
            st.xp -= xpNeeded
            st.level += 1
            setLevel(st.level)
            // Level up feedback
            triggerParticleBurst(st.playerGroup.position, 0x7fff00, 30)
            st.hp = 20 // heal
            setPlayerHp(20)
          }
          setXp(st.xp)

          st.mobs.splice(i, 1)
        }
      }

      // ─── Respawn Mobs ───
      if (st.mobs.length < 5 && st.frame % 150 === 0) {
        const types: ('zombie' | 'creeper' | 'skeleton')[] = ['zombie', 'creeper', 'skeleton']
        const type = types[Math.floor(Math.random() * types.length)]
        const angle = Math.random() * Math.PI * 2
        const radius = 9 + Math.random() * 3
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        create3DMob(type, x, z)
      }

      // ─── Damage Indicators Projection ───
      const nextIndicators: DamageIndicator[] = []
      const width = st.renderer.domElement.clientWidth
      const height = st.renderer.domElement.clientHeight
      st.damageIndicatorList.forEach(ind => {
        ind.life += dt * 40
        // Float upwards
        ind.position.y += dt * 1.5

        // Project 3D vector to screen 2D coordinates
        const tempV = ind.position.clone()
        tempV.project(st.camera!)

        // Map to CSS screen coordinates
        const x = (tempV.x *  .5 + .5) * width
        const y = (tempV.y * -.5 + .5) * height

        ind.screenPos = { x, y }

        if (ind.life < 30) {
          nextIndicators.push(ind)
        }
      })
      st.damageIndicatorList = nextIndicators
      setDamageIndicators(nextIndicators)

      st.renderer.render(st.scene, st.camera)
      st.animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(gameRefs.current.animationId)
    }
  }, [gameStarted])

  // Handle start button click
  const handleStartGame = () => {
    setGameStarted(true)
    gameRefs.current.score = 0
    gameRefs.current.xp = 0
    gameRefs.current.level = 1
    gameRefs.current.hp = 20
    setScore(0)
    setXp(0)
    setLevel(1)
    setPlayerHp(20)
  }

  // Calculate XP Percentage for the bar
  const xpNeeded = level * 50
  const xpPercent = Math.min(100, (xp / xpNeeded) * 100)

  return (
    <div className="game-panel" style={{ height: '100%', position: 'relative' }}>
      <div className="game-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>⚔️ 3D WEAPON ARENA</span>
        {gameStarted && (
          <span style={{ color: '#10b981', fontSize: 10 }}>LEVEL {level}</span>
        )}
      </div>

      <div
        ref={containerRef}
        className="game-canvas-wrap"
        style={{ height: '350px', cursor: 'crosshair', position: 'relative', overflow: 'hidden' }}
        onClick={handleCanvasClick}
      />

      {/* Floating 2D Damage Indicators projected from 3D space */}
      {gameStarted && damageIndicators.map(ind => (
        <div
          key={ind.id}
          style={{
            position: 'absolute',
            left: `${ind.screenPos.x}px`,
            top: `${ind.screenPos.y}px`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            color: ind.color,
            fontSize: `${16 - (ind.life * 0.1)}px`,
            fontWeight: 800,
            textShadow: '2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000',
            opacity: 1 - (ind.life / 30),
            zIndex: 30,
            fontFamily: '"JetBrains Mono", monospace'
          }}
        >
          {ind.text}
        </div>
      ))}

      {/* HUD overlay for level, HP, XP */}
      {gameStarted && (
        <div className="game-hud-overlay" style={{
          position: 'absolute',
          bottom: 45,
          left: 15,
          right: 15,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          zIndex: 20
        }}>
          {/* Health & Score Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Hearts HP Bar */}
            <div style={{ display: 'flex', gap: 2 }}>
              {Array.from({ length: 10 }).map((_, idx) => {
                const heartVal = (idx + 1) * 2
                const isFull = playerHp >= heartVal
                const isHalf = playerHp === heartVal - 1
                return (
                  <span key={idx} style={{ fontSize: 14, filter: isFull || isHalf ? 'none' : 'grayscale(100%) opacity(30%)' }}>
                    ❤️
                  </span>
                )
              })}
            </div>
            
            {/* Score */}
            <div style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              color: '#fbbf24',
              fontWeight: 700,
              background: 'rgba(0,0,0,0.5)',
              padding: '2px 8px',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: '4px'
            }}>
              SCORE: {score}
            </div>
          </div>

          {/* XP Bar */}
          <div style={{
            width: '100%',
            height: 6,
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${xpPercent}%`,
              height: '100%',
              background: '#7fff00',
              boxShadow: '0 0 6px #7fff00',
              transition: 'width 0.25s ease'
            }} />
          </div>
        </div>
      )}

      {/* Start Screen Overlay */}
      {!gameStarted && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 40%, rgba(34,197,94,0.06) 0%, rgba(7,10,13,0.98) 70%)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Outfit", sans-serif',
        }}>
          {/* Header */}
          <div style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.25em',
            color: 'var(--cyan-bright)',
            marginBottom: '8px',
            textTransform: 'uppercase',
          }}>
            🌌 de-shop 3d showcase
          </div>

          {/* Icon/Title */}
          <div style={{
            fontSize: '52px',
            marginBottom: '10px',
            filter: 'drop-shadow(0 0 15px rgba(34,197,94,0.2))'
          }}>
            🎮
          </div>

          <div style={{
            color: '#fff',
            fontSize: '20px',
            fontWeight: 800,
            marginBottom: '20px',
            textAlign: 'center',
            textShadow: '0 0 20px rgba(255,255,255,0.2)'
          }}>
            Web3 Voxel Action Arena
          </div>

          {/* Skins indicators */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '28px',
            fontSize: '11px',
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '6px 14px',
              borderRadius: '6px',
              color: '#d1d5db'
            }}>
              🧑 Avatar: <span style={{ color: '#10b981', fontWeight: 700 }}>{activeCharSkin?.name || 'Steve'}</span>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '6px 14px',
              borderRadius: '6px',
              color: '#d1d5db'
            }}>
              ⚔️ Sword: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{activeGunSkin?.name || 'Standard'}</span>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={handleStartGame}
            style={{
              padding: '12px 42px',
              background: 'var(--cyan-bright)',
              border: 'none',
              borderRadius: '24px',
              color: '#0e1118',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 20px var(--cyan-glow)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 0 30px var(--cyan-glow)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1) translateY(0)'
              e.currentTarget.style.boxShadow = '0 0 20px var(--cyan-glow)'
            }}
          >
            PLAY ARENA
          </button>
        </div>
      )}

      {/* Info bar at the bottom */}
      <div className="skin-line" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, padding: '6px 12px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span>
          Skin: {activeGunSkin ? activeGunSkin.name : 'Default Weapon'}
        </span>
        <span className={`rarity-badge rarity-${activeGunSkin?.rarity ?? 'common'}`} style={{ fontSize: 9 }}>
          {activeGunSkin ? activeGunSkin.rarity.toUpperCase() : 'COMMON'}
        </span>
      </div>
    </div>
  )
}
