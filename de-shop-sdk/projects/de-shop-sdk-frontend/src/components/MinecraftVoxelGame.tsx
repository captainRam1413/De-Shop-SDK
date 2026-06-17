/**
 * Minecraft Voxel Game Component
 * ══════════════════════════════════
 * A playable 3D voxel world using Three.js.
 * Features: WASD movement, mouse look, block place/break, hotbar, terrain.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { VoxelWorld, WORLD_WIDTH, WORLD_HEIGHT, WORLD_DEPTH, WATER_LEVEL } from '../game/voxel-world'
import {
  BlockType,
  BLOCK_NAMES,
  HOTBAR_BLOCKS,
  generateAllTextures,
  type BlockTextures,
} from '../game/texture-generator'

// ─── Constants ───────────────────────────────────────────────────────────────

const PLAYER_HEIGHT = 1.7
const PLAYER_SPEED = 5.5
const JUMP_FORCE = 8
const GRAVITY = 22
const MOUSE_SENSITIVITY = 0.002
const REACH_DISTANCE = 7
const FOG_NEAR = 30
const FOG_FAR = 70

// ─── Face definitions ────────────────────────────────────────────────────────
// Each face: [normal direction, 4 vertex offsets (CCW), texture type: 'top'|'side'|'bottom']

type FaceDef = {
  dir: [number, number, number]
  corners: [number, number, number][]
  texType: 'top' | 'side' | 'bottom'
}

const FACES: FaceDef[] = [
  { // Right (+X)
    dir: [1, 0, 0],
    corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
    texType: 'side',
  },
  { // Left (-X)
    dir: [-1, 0, 0],
    corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
    texType: 'side',
  },
  { // Top (+Y)
    dir: [0, 1, 0],
    corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
    texType: 'top',
  },
  { // Bottom (-Y)
    dir: [0, -1, 0],
    corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    texType: 'bottom',
  },
  { // Front (+Z)
    dir: [0, 0, 1],
    corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]],
    texType: 'side',
  },
  { // Back (-Z)
    dir: [0, 0, -1],
    corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]],
    texType: 'side',
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function MinecraftVoxelGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [fps, setFps] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState(0)
  const [worldBlocks, setWorldBlocks] = useState<{ total: number; placed: number }>({ total: 0, placed: 0 })
  const [loading, setLoading] = useState(true)
  const [textures, setTextures] = useState<Map<BlockType, BlockTextures> | null>(null)

  // Game state refs (not React state — mutated every frame)
  const gameRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    world: VoxelWorld
    meshes: Map<string, THREE.Mesh>
    textures: Map<BlockType, BlockTextures>
    textureAtlas: Map<string, THREE.Texture>
    // Player state
    position: THREE.Vector3
    velocity: THREE.Vector3
    yaw: number
    pitch: number
    onGround: boolean
    // Input state
    keys: Set<string>
    // Pointer lock
    isLocked: boolean
    // Selection
    highlightMesh: THREE.Mesh
    selectedBlock: { position: [number, number, number]; normal: [number, number, number] } | null
    // Hotbar
    hotbarBlocks: BlockType[]
    selectedSlot: number
    // Animation
    animFrame: number
    // FPS
    frameCount: number
    lastFpsTime: number
    // Cleanup flag
    disposed: boolean
    // Block count
    placedCount: number
    // Callbacks for UI updates
    onFpsUpdate: (fps: number) => void
    onBlockCountUpdate: (total: number, placed: number) => void
  } | null>(null)

  // ─── Generate textures on mount ──────────────────────────────────────────

  useEffect(() => {
    const tex = generateAllTextures()
    setTextures(tex)
    setLoading(false)
  }, [])

  // Ref for slot tracking that the game loop closure can read
  const currentSlotRef = useRef(0)

  // ─── Sync selectedSlot to game ref ───────────────────────────────────────

  useEffect(() => {
    currentSlotRef.current = selectedSlot
    if (gameRef.current) {
      gameRef.current.selectedSlot = selectedSlot
    }
  }, [selectedSlot])

  // ─── Main game initialization ────────────────────────────────────────────

  useEffect(() => {
    if (!textures || !containerRef.current) return

    const container = containerRef.current

    // ── Create renderer ──────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setClearColor(0x87CEEB) // Sky blue
    container.appendChild(renderer.domElement)

    // ── Create scene ─────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x87CEEB, FOG_NEAR, FOG_FAR)

    // ── Add ambient light ────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xffffff, 0.8)
    sun.position.set(50, 100, 30)
    scene.add(sun)

    // ── Create camera ────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      200
    )

    // ── Create voxel world ───────────────────────────────────────────────
    const world = new VoxelWorld(12345)
    world.generateTerrain()

    // ── Create texture atlas ─────────────────────────────────────────────
    const textureAtlas = new Map<string, THREE.Texture>()

    const createThreeTexture = (canvas: HTMLCanvasElement): THREE.Texture => {
      const tex = new THREE.CanvasTexture(canvas)
      tex.magFilter = THREE.NearestFilter
      tex.minFilter = THREE.NearestFilter
      tex.wrapS = THREE.RepeatWrapping
      tex.wrapT = THREE.RepeatWrapping
      tex.colorSpace = THREE.SRGBColorSpace
      return tex
    }

    // Generate textures for each block type
    for (const [blockType, blockTex] of textures) {
      textureAtlas.set(`${blockType}-top`, createThreeTexture(blockTex.top))
      textureAtlas.set(`${blockType}-side`, createThreeTexture(blockTex.side))
      textureAtlas.set(`${blockType}-bottom`, createThreeTexture(blockTex.bottom))
    }

    // ── Create highlight mesh (wireframe cube for selected block) ─────────
    const highlightGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005)
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    })
    const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat)
    highlightMesh.visible = false
    scene.add(highlightMesh)

    // ── Player state ─────────────────────────────────────────────────────
    // Find a spawn position (center of world, on top of terrain)
    const spawnX = WORLD_WIDTH / 2
    const spawnZ = WORLD_DEPTH / 2
    let spawnY = WORLD_HEIGHT - 1
    for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
      if (world.isSolid(Math.floor(spawnX), y, Math.floor(spawnZ))) {
        spawnY = y + 1
        break
      }
    }

    const position = new THREE.Vector3(spawnX + 0.5, spawnY + PLAYER_HEIGHT, spawnZ + 0.5)
    const velocity = new THREE.Vector3(0, 0, 0)
    let yaw = 0
    let pitch = 0
    let onGround = false

    // ── Input state ──────────────────────────────────────────────────────
    const keys = new Set<string>()
    let isLocked = false
    let selectedBlock: { position: [number, number, number]; normal: [number, number, number] } | null = null
    const hotbarBlocks = [...HOTBAR_BLOCKS]
    let currentSlot = 0
    let placedCount = 0

    // ── Build world meshes ───────────────────────────────────────────────
    const meshes = new Map<string, THREE.Mesh>()

    const buildWorldMeshes = () => {
      // Remove existing meshes
      for (const [, mesh] of meshes) {
        scene.remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      }
      meshes.clear()

      // Group faces by texture key
      const faceGroups = new Map<string, { positions: number[]; normals: number[]; uvs: number[]; indices: number[] }>()

      for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let z = 0; z < WORLD_DEPTH; z++) {
          for (let x = 0; x < WORLD_WIDTH; x++) {
            const block = world.getBlock(x, y, z)
            if (block === BlockType.AIR) continue

            const exposedFaces = world.getExposedFaces(x, y, z)

            for (let fi = 0; fi < FACES.length; fi++) {
              const face = FACES[fi]
              const faceKey = ['right', 'left', 'top', 'bottom', 'front', 'back'][fi] as keyof typeof exposedFaces
              if (!exposedFaces[faceKey]) continue

              const texKey = `${block}-${face.texType}`
              if (!faceGroups.has(texKey)) {
                faceGroups.set(texKey, { positions: [], normals: [], uvs: [], indices: [] })
              }
              const group = faceGroups.get(texKey)!

              const baseIndex = group.positions.length / 3

              // Add 4 vertices
              for (const corner of face.corners) {
                group.positions.push(x + corner[0], y + corner[1], z + corner[2])
                group.normals.push(face.dir[0], face.dir[1], face.dir[2])
              }

              // UVs
              group.uvs.push(0, 0, 1, 0, 1, 1, 0, 1)

              // Two triangles
              group.indices.push(
                baseIndex, baseIndex + 1, baseIndex + 2,
                baseIndex, baseIndex + 2, baseIndex + 3
              )
            }
          }
        }
      }

      // Create meshes for each texture group
      for (const [texKey, group] of faceGroups) {
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(group.positions, 3))
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(group.normals, 3))
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(group.uvs, 2))
        geometry.setIndex(group.indices)

        const threeTex = textureAtlas.get(texKey)
        const blockTypeNum = parseInt(texKey.split('-')[0])

        const isTransparent = blockTypeNum === BlockType.WATER || blockTypeNum === BlockType.GLASS || blockTypeNum === BlockType.LEAVES

        const material = new THREE.MeshLambertMaterial({
          map: threeTex || undefined,
          transparent: isTransparent,
          opacity: blockTypeNum === BlockType.WATER ? 0.6 : blockTypeNum === BlockType.GLASS ? 0.4 : 1,
          side: isTransparent ? THREE.DoubleSide : THREE.FrontSide,
        })

        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)
        meshes.set(texKey, mesh)
      }

      // Count total blocks
      let total = 0
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let z = 0; z < WORLD_DEPTH; z++) {
          for (let x = 0; x < WORLD_WIDTH; x++) {
            if (world.getBlock(x, y, z) !== BlockType.AIR) total++
          }
        }
      }
      onBlockCountUpdate(total, placedCount)
    }

    // ── FPS tracking ─────────────────────────────────────────────────────
    let frameCount = 0
    let lastFpsTime = performance.now()
    let disposed = false

    const onFpsUpdate = (newFps: number) => {
      setFps(newFps)
    }

    const onBlockCountUpdate = (total: number, placed: number) => {
      setWorldBlocks({ total, placed })
    }

    // Build initial meshes
    buildWorldMeshes()

    // ── Rebuild meshes for a single block (optimized) ────────────────────
    const rebuildAroundBlock = (bx: number, by: number, bz: number) => {
      // For simplicity, rebuild all meshes. In a production app, 
      // you'd only rebuild chunks near the modified block.
      buildWorldMeshes()
    }

    // ── Player physics ───────────────────────────────────────────────────

    const checkCollision = (px: number, py: number, pz: number): boolean => {
      // Check player bounding box (0.6 wide, PLAYER_HEIGHT tall)
      const hw = 0.3 // half width
      for (let dy = 0; dy < PLAYER_HEIGHT; dy += 0.5) {
        for (let dx = -hw; dx <= hw; dx += hw * 2) {
          for (let dz = -hw; dz <= hw; dz += hw * 2) {
            const checkX = Math.floor(px + dx)
            const checkY = Math.floor(py + dy)
            const checkZ = Math.floor(pz + dz)
            if (world.isSolid(checkX, checkY, checkZ)) {
              return true
            }
          }
        }
      }
      return false
    }

    const updatePlayer = (dt: number) => {
      // Apply gravity
      velocity.y -= GRAVITY * dt

      // Movement direction
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw))
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))

      const moveDir = new THREE.Vector3(0, 0, 0)
      if (keys.has('w') || keys.has('arrowup')) moveDir.add(forward)
      if (keys.has('s') || keys.has('arrowdown')) moveDir.sub(forward)
      if (keys.has('a') || keys.has('arrowleft')) moveDir.sub(right)
      if (keys.has('d') || keys.has('arrowright')) moveDir.add(right)

      if (moveDir.length() > 0) {
        moveDir.normalize().multiplyScalar(PLAYER_SPEED)
      }

      // Horizontal movement
      const newX = position.x + moveDir.x * dt
      const newZ = position.z + moveDir.z * dt

      // Check X collision
      if (!checkCollision(newX, position.y, position.z)) {
        position.x = newX
      }
      // Check Z collision
      if (!checkCollision(position.x, position.y, newZ)) {
        position.z = newZ
      }

      // Vertical movement
      const newY = position.y + velocity.y * dt
      if (!checkCollision(position.x, newY, position.z)) {
        position.y = newY
        onGround = false
      } else {
        if (velocity.y < 0) {
          // Landing: snap to block top
          position.y = Math.floor(position.y) + 0.001
          onGround = true
        }
        velocity.y = 0
      }

      // Jump
      if (onGround && keys.has(' ')) {
        velocity.y = JUMP_FORCE
        onGround = false
      }

      // Keep player in world bounds
      position.x = Math.max(0.5, Math.min(WORLD_WIDTH - 0.5, position.x))
      position.z = Math.max(0.5, Math.min(WORLD_DEPTH - 0.5, position.z))

      // Reset if fell below world
      if (position.y < -10) {
        position.set(spawnX + 0.5, spawnY + PLAYER_HEIGHT + 5, spawnZ + 0.5)
        velocity.set(0, 0, 0)
      }

      // Update camera
      camera.position.copy(position)
      camera.rotation.order = 'YXZ'
      camera.rotation.y = yaw
      camera.rotation.x = pitch
    }

    // ── Block interaction ────────────────────────────────────────────────

    const updateSelection = () => {
      const dir = new THREE.Vector3(0, 0, -1)
      dir.applyEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'))

      const hit = world.raycast(
        { x: position.x, y: position.y, z: position.z },
        { x: dir.x, y: dir.y, z: dir.z },
        REACH_DISTANCE
      )

      if (hit) {
        selectedBlock = hit
        highlightMesh.position.set(
          hit.position[0] + 0.5,
          hit.position[1] + 0.5,
          hit.position[2] + 0.5
        )
        highlightMesh.visible = true
      } else {
        selectedBlock = null
        highlightMesh.visible = false
      }
    }

    const breakBlock = () => {
      if (!selectedBlock) return
      const [x, y, z] = selectedBlock.position
      if (world.getBlock(x, y, z) === BlockType.BEDROCK) return // Can't break bedrock
      world.setBlock(x, y, z, BlockType.AIR)
      rebuildAroundBlock(x, y, z)
    }

    const placeBlock = () => {
      if (!selectedBlock) return
      const [x, y, z] = selectedBlock.position
      const [nx, ny, nz] = selectedBlock.normal
      const px = x + nx
      const py = y + ny
      const pz = z + nz

      // Don't place outside world
      if (px < 0 || px >= WORLD_WIDTH || py < 0 || py >= WORLD_HEIGHT || pz < 0 || pz >= WORLD_DEPTH) return

      // Don't place where player is standing
      if (world.isSolid(px, py, pz)) return

      // Check player isn't in the way
      const playerMinX = position.x - 0.3
      const playerMaxX = position.x + 0.3
      const playerMinY = position.y
      const playerMaxY = position.y + PLAYER_HEIGHT
      const playerMinZ = position.z - 0.3
      const playerMaxZ = position.z + 0.3

      if (px + 1 > playerMinX && px < playerMaxX &&
          py + 1 > playerMinY && py < playerMaxY &&
          pz + 1 > playerMinZ && pz < playerMaxZ) {
        return
      }

      const blockToPlace = hotbarBlocks[currentSlotRef.current]
      world.setBlock(px, py, pz, blockToPlace)
      placedCount++
      rebuildAroundBlock(px, py, pz)
    }

    // ── Event handlers ───────────────────────────────────────────────────

    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase())

      // Hotbar selection (1-9)
      const num = parseInt(e.key)
      if (num >= 1 && num <= 9 && num <= hotbarBlocks.length) {
        currentSlot = num - 1
        setSelectedSlot(currentSlot)
      }

      // Scroll hotbar with Q/E
      if (e.key.toLowerCase() === 'q') {
        currentSlot = (currentSlot - 1 + hotbarBlocks.length) % hotbarBlocks.length
        setSelectedSlot(currentSlot)
      }
      if (e.key.toLowerCase() === 'e') {
        currentSlot = (currentSlot + 1) % hotbarBlocks.length
        setSelectedSlot(currentSlot)
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase())
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked) return
      yaw -= e.movementX * MOUSE_SENSITIVITY
      pitch -= e.movementY * MOUSE_SENSITIVITY
      pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch))
    }

    const onMouseDown = (e: MouseEvent) => {
      if (!isLocked) return
      if (e.button === 0) breakBlock()   // Left click: break
      if (e.button === 2) placeBlock()    // Right click: place
    }

    const onWheel = (e: WheelEvent) => {
      if (!isLocked) return
      if (e.deltaY > 0) {
        currentSlot = (currentSlot + 1) % hotbarBlocks.length
      } else {
        currentSlot = (currentSlot - 1 + hotbarBlocks.length) % hotbarBlocks.length
      }
      setSelectedSlot(currentSlot)
    }

    const onContextMenu = (e: Event) => {
      e.preventDefault()
    }

    const onPointerLockChange = () => {
      isLocked = document.pointerLockElement === renderer.domElement
      if (!isLocked) {
        keys.clear()
      }
    }

    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    // Register events
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('wheel', onWheel)
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    window.addEventListener('resize', onResize)

    // ── Game loop ────────────────────────────────────────────────────────

    let lastTime = performance.now()

    const animate = () => {
      if (disposed) return

      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 0.1) // Cap at 100ms
      lastTime = now

      // FPS
      frameCount++
      if (now - lastFpsTime >= 1000) {
        onFpsUpdate(frameCount)
        frameCount = 0
        lastFpsTime = now
      }

      if (isLocked) {
        updatePlayer(dt)
        updateSelection()
      }

      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)

    // ── Store game ref ───────────────────────────────────────────────────
    gameRef.current = {
      renderer, scene, camera, world, meshes, textures, textureAtlas,
      position, velocity, yaw, pitch, onGround,
      keys, isLocked, highlightMesh, selectedBlock,
      hotbarBlocks, selectedSlot: currentSlot,
      animFrame: 0, frameCount, lastFpsTime, disposed: false,
      placedCount, onFpsUpdate, onBlockCountUpdate,
    }

    // ── Cleanup ──────────────────────────────────────────────────────────
    return () => {
      disposed = true
      gameRef.current = null

      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('wheel', onWheel)
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      window.removeEventListener('resize', onResize)

      // Exit pointer lock
      if (document.pointerLockElement) {
        document.exitPointerLock()
      }

      // Dispose meshes
      for (const [, mesh] of meshes) {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      }

      // Dispose textures
      for (const [, tex] of textureAtlas) {
        tex.dispose()
      }

      // Dispose highlight
      highlightGeo.dispose()
      highlightMat.dispose()

      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [textures]) // Re-run when textures are ready

  // ─── Click to play handler ───────────────────────────────────────────────

  const handleClickToPlay = useCallback(() => {
    if (!gameRef.current) return
    gameRef.current.renderer.domElement.requestPointerLock()
    setIsPlaying(true)
  }, [])

  // Handle pointer lock exit
  useEffect(() => {
    const handler = () => {
      if (document.pointerLockElement === null) {
        setIsPlaying(false)
      }
    }
    document.addEventListener('pointerlockchange', handler)
    return () => document.removeEventListener('pointerlockchange', handler)
  }, [])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="voxel-game">
      {/* Game Canvas Container */}
      <div ref={containerRef} className="voxel-game__canvas" />

      {/* Loading overlay */}
      {loading && (
        <div className="voxel-game__overlay">
          <div className="voxel-game__loading">
            <div className="voxel-game__loading-spinner" />
            <div className="voxel-game__loading-text">Generating World...</div>
          </div>
        </div>
      )}

      {/* Click to Play overlay */}
      {!isPlaying && !loading && (
        <div className="voxel-game__overlay" onClick={handleClickToPlay}>
          <div className="voxel-game__start">
            <div className="voxel-game__start-title">◆ Nexus Arena</div>
            <div className="voxel-game__start-subtitle">Click to Play</div>
            <div className="voxel-game__controls-help">
              <div className="voxel-game__control-row">
                <span className="voxel-game__key">W A S D</span>
                <span>Move</span>
              </div>
              <div className="voxel-game__control-row">
                <span className="voxel-game__key">Mouse</span>
                <span>Look around</span>
              </div>
              <div className="voxel-game__control-row">
                <span className="voxel-game__key">Space</span>
                <span>Jump</span>
              </div>
              <div className="voxel-game__control-row">
                <span className="voxel-game__key">Left Click</span>
                <span>Break block</span>
              </div>
              <div className="voxel-game__control-row">
                <span className="voxel-game__key">Right Click</span>
                <span>Place block</span>
              </div>
              <div className="voxel-game__control-row">
                <span className="voxel-game__key">1-9 / Scroll</span>
                <span>Select block</span>
              </div>
              <div className="voxel-game__control-row">
                <span className="voxel-game__key">ESC</span>
                <span>Pause</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HUD - Crosshair */}
      {isPlaying && (
        <div className="voxel-game__crosshair">
          <div className="voxel-game__crosshair-h" />
          <div className="voxel-game__crosshair-v" />
        </div>
      )}

      {/* HUD - FPS Counter */}
      <div className="voxel-game__fps">
        {fps} FPS
      </div>

      {/* HUD - Block count */}
      <div className="voxel-game__block-count">
        {worldBlocks.total.toLocaleString()} blocks · {worldBlocks.placed} placed
      </div>

      {/* HUD - Hotbar */}
      {textures && (
        <div className="voxel-game__hotbar">
          {HOTBAR_BLOCKS.map((blockType, i) => {
            const tex = textures.get(blockType)
            return (
              <div
                key={i}
                className={`voxel-game__hotbar-slot ${selectedSlot === i ? 'voxel-game__hotbar-slot--active' : ''}`}
                onClick={() => setSelectedSlot(i)}
              >
                {tex && (
                  <canvas
                    ref={(el) => {
                      if (el && tex) {
                        const ctx = el.getContext('2d')
                        if (ctx) {
                          ctx.imageSmoothingEnabled = false
                          ctx.clearRect(0, 0, 32, 32)
                          ctx.drawImage(tex.top, 0, 0, 32, 32)
                        }
                      }
                    }}
                    width={32}
                    height={32}
                    className="voxel-game__hotbar-icon"
                  />
                )}
                <span className="voxel-game__hotbar-number">{i + 1}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* HUD - Selected block name */}
      {isPlaying && (
        <div className="voxel-game__selected-name">
          {BLOCK_NAMES[HOTBAR_BLOCKS[selectedSlot]]}
        </div>
      )}
    </div>
  )
}
