/**
 * Voxel World Engine
 * ═══════════════════
 * Manages block data, terrain generation, block placement/removal.
 * World size: 64x32x64 (X, Y, Z)
 */

import { BlockType } from './texture-generator'

// ─── World Constants ─────────────────────────────────────────────────────────

export const WORLD_WIDTH = 64   // X
export const WORLD_HEIGHT = 32  // Y (up)
export const WORLD_DEPTH = 64   // Z
export const WATER_LEVEL = 8
export const SEA_FLOOR = 5

// ─── Simple Noise (value noise with interpolation) ──────────────────────────

class SimpleNoise {
  private perm: number[]

  constructor(seed: number) {
    this.perm = []
    const rng = this.seededRng(seed)
    for (let i = 0; i < 256; i++) this.perm[i] = i
    // Fisher-Yates shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]]
    }
    // Duplicate
    for (let i = 0; i < 256; i++) this.perm[256 + i] = this.perm[i]
  }

  private seededRng(seed: number) {
    let s = seed
    return () => {
      s = (s * 16807 + 0) % 2147483647
      return (s - 1) / 2147483646
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number): number {
    return (hash & 1) === 0 ? x : -x
  }

  noise1D(x: number): number {
    const X = Math.floor(x) & 255
    x -= Math.floor(x)
    const u = this.fade(x)
    return this.lerp(
      this.grad(this.perm[X], x),
      this.grad(this.perm[X + 1], x - 1),
      u
    )
  }

  /** 2D value noise for terrain height */
  noise2D(x: number, z: number): number {
    // Use combined 1D noise for simplicity and performance
    const n1 = this.noise1D(x * 0.8 + z * 100)
    const n2 = this.noise1D(z * 0.8 + x * 200)
    return (n1 + n2) * 0.5
  }

  /** Fractal Brownian Motion */
  fbm2D(x: number, z: number, octaves: number = 4): number {
    let value = 0
    let amplitude = 1
    let frequency = 1
    let maxValue = 0

    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, z * frequency) * amplitude
      maxValue += amplitude
      amplitude *= 0.5
      frequency *= 2
    }

    return value / maxValue
  }
}

// ─── VoxelWorld Class ────────────────────────────────────────────────────────

export class VoxelWorld {
  private blocks: Uint8Array
  private noise: SimpleNoise
  private seed: number

  constructor(seed: number = 12345) {
    this.seed = seed
    this.blocks = new Uint8Array(WORLD_WIDTH * WORLD_HEIGHT * WORLD_DEPTH)
    this.noise = new SimpleNoise(seed)
  }

  // ─── Block access ────────────────────────────────────────────────────────

  private index(x: number, y: number, z: number): number {
    return x + z * WORLD_WIDTH + y * WORLD_WIDTH * WORLD_DEPTH
  }

  getBlock(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT || z < 0 || z >= WORLD_DEPTH) {
      return BlockType.AIR
    }
    return this.blocks[this.index(x, y, z)] as BlockType
  }

  setBlock(x: number, y: number, z: number, type: BlockType): void {
    if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT || z < 0 || z >= WORLD_DEPTH) return
    this.blocks[this.index(x, y, z)] = type
  }

  isAir(x: number, y: number, z: number): boolean {
    return this.getBlock(x, y, z) === BlockType.AIR
  }

  isTransparent(x: number, y: number, z: number): boolean {
    const block = this.getBlock(x, y, z)
    return block === BlockType.AIR || block === BlockType.WATER || block === BlockType.GLASS || block === BlockType.LEAVES
  }

  isSolid(x: number, y: number, z: number): boolean {
    const block = this.getBlock(x, y, z)
    return block !== BlockType.AIR && block !== BlockType.WATER
  }

  // ─── Terrain Generation ──────────────────────────────────────────────────

  generateTerrain(): void {
    // Generate heightmap
    const heightMap = new Float64Array(WORLD_WIDTH * WORLD_DEPTH)
    for (let x = 0; x < WORLD_WIDTH; x++) {
      for (let z = 0; z < WORLD_DEPTH; z++) {
        // Multi-octave noise for natural terrain
        const h1 = this.noise.fbm2D(x * 0.02, z * 0.02, 4) * 8  // Large hills
        const h2 = this.noise.fbm2D(x * 0.05 + 100, z * 0.05 + 100, 3) * 4  // Medium detail
        const h3 = this.noise.fbm2D(x * 0.1 + 200, z * 0.1 + 200, 2) * 2  // Small detail

        let height = WATER_LEVEL + 3 + h1 + h2 + h3
        height = Math.max(SEA_FLOOR, Math.min(WORLD_HEIGHT - 5, Math.floor(height)))
        heightMap[x + z * WORLD_WIDTH] = height
      }
    }

    // Fill blocks based on heightmap
    for (let x = 0; x < WORLD_WIDTH; x++) {
      for (let z = 0; z < WORLD_DEPTH; z++) {
        const surfaceY = heightMap[x + z * WORLD_WIDTH]

        for (let y = 0; y < WORLD_HEIGHT; y++) {
          if (y === 0) {
            // Bedrock at bottom
            this.setBlock(x, y, z, BlockType.BEDROCK)
          } else if (y < surfaceY - 4) {
            // Deep stone with ores
            let blockType = BlockType.STONE
            const oreNoise = this.noise.noise2D(x * 3 + y * 7, z * 3 + y * 11)
            if (y < 10 && oreNoise > 0.6) blockType = BlockType.DIAMOND_ORE
            else if (y < 15 && oreNoise > 0.5) blockType = BlockType.GOLD_ORE
            else if (y < 20 && oreNoise > 0.45) blockType = BlockType.IRON_ORE
            else if (oreNoise > 0.4) blockType = BlockType.COAL_ORE
            this.setBlock(x, y, z, blockType)
          } else if (y < surfaceY) {
            // Sub-surface: dirt
            this.setBlock(x, y, z, BlockType.DIRT)
          } else if (y === Math.floor(surfaceY)) {
            // Surface block
            if (surfaceY <= WATER_LEVEL) {
              // Underwater sand
              this.setBlock(x, y, z, BlockType.SAND)
            } else if (surfaceY > 18) {
              // High altitude: snow
              this.setBlock(x, y, z, BlockType.SNOW)
            } else {
              // Normal: grass
              this.setBlock(x, y, z, BlockType.GRASS)
            }
          } else if (y <= WATER_LEVEL && y > surfaceY) {
            // Water
            this.setBlock(x, y, z, BlockType.WATER)
          }
        }
      }
    }

    // Generate trees
    this.generateTrees(heightMap)

    // Generate beach sand near water
    this.generateBeaches(heightMap)
  }

  private generateTrees(heightMap: Float64Array): void {
    const treeRng = this.seededRng(this.seed + 999)
    const treeSpacing = 5

    for (let x = 3; x < WORLD_WIDTH - 3; x += treeSpacing) {
      for (let z = 3; z < WORLD_DEPTH - 3; z += treeSpacing) {
        // Random offset within the spacing cell
        const ox = Math.floor(treeRng() * (treeSpacing - 2))
        const oz = Math.floor(treeRng() * (treeSpacing - 2))
        const tx = x + ox
        const tz = z + oz

        if (tx >= WORLD_WIDTH - 2 || tz >= WORLD_DEPTH - 2) continue

        const surfaceY = Math.floor(heightMap[tx + tz * WORLD_WIDTH])

        // Only place trees on grass, above water level
        if (surfaceY <= WATER_LEVEL || surfaceY > 18) continue
        if (this.getBlock(tx, surfaceY, tz) !== BlockType.GRASS) continue

        // Random chance to skip
        if (treeRng() > 0.6) continue

        const treeHeight = 4 + Math.floor(treeRng() * 3)

        // Trunk
        for (let y = surfaceY + 1; y <= surfaceY + treeHeight; y++) {
          this.setBlock(tx, y, tz, BlockType.WOOD)
        }

        // Leaves (sphere-ish shape around top)
        const leafStart = surfaceY + treeHeight - 1
        const leafEnd = surfaceY + treeHeight + 2
        for (let y = leafStart; y <= leafEnd; y++) {
          const radius = y === leafEnd ? 1 : 2
          for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
              if (dx === 0 && dz === 0 && y < leafEnd) continue // trunk goes through
              if (Math.abs(dx) === radius && Math.abs(dz) === radius && treeRng() > 0.6) continue // round corners
              const bx = tx + dx
              const bz = tz + dz
              if (bx >= 0 && bx < WORLD_WIDTH && bz >= 0 && bz < WORLD_DEPTH) {
                if (this.getBlock(bx, y, bz) === BlockType.AIR) {
                  this.setBlock(bx, y, bz, BlockType.LEAVES)
                }
              }
            }
          }
        }
      }
    }
  }

  private generateBeaches(heightMap: Float64Array): void {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      for (let z = 0; z < WORLD_DEPTH; z++) {
        const surfaceY = Math.floor(heightMap[x + z * WORLD_WIDTH])
        // Replace grass blocks near water level with sand
        if (surfaceY >= WATER_LEVEL - 1 && surfaceY <= WATER_LEVEL + 2) {
          if (this.getBlock(x, surfaceY, z) === BlockType.GRASS) {
            this.setBlock(x, surfaceY, z, BlockType.SAND)
            // Also replace the dirt layer below
            if (surfaceY > 0 && this.getBlock(x, surfaceY - 1, z) === BlockType.DIRT) {
              this.setBlock(x, surfaceY - 1, z, BlockType.SAND)
            }
          }
        }
      }
    }
  }

  private seededRng(seed: number) {
    let s = Math.abs(seed) || 1
    return () => {
      s = (s * 16807 + 0) % 2147483647
      return (s - 1) / 2147483646
    }
  }

  // ─── Raycasting (for block selection) ────────────────────────────────────

  /**
   * Cast a ray from origin in direction and find the first solid block.
   * Returns { position, normal } of the hit block, or null.
   */
  raycast(
    origin: { x: number; y: number; z: number },
    direction: { x: number; y: number; z: number },
    maxDistance: number = 8
  ): { position: [number, number, number]; normal: [number, number, number] } | null {
    // DDA (Digital Differential Analyzer) algorithm
    let x = Math.floor(origin.x)
    let y = Math.floor(origin.y)
    let z = Math.floor(origin.z)

    const stepX = direction.x >= 0 ? 1 : -1
    const stepY = direction.y >= 0 ? 1 : -1
    const stepZ = direction.z >= 0 ? 1 : -1

    const tDeltaX = direction.x !== 0 ? Math.abs(1 / direction.x) : Infinity
    const tDeltaY = direction.y !== 0 ? Math.abs(1 / direction.y) : Infinity
    const tDeltaZ = direction.z !== 0 ? Math.abs(1 / direction.z) : Infinity

    let tMaxX = direction.x !== 0
      ? ((direction.x > 0 ? (x + 1 - origin.x) : (origin.x - x)) * tDeltaX)
      : Infinity
    let tMaxY = direction.y !== 0
      ? ((direction.y > 0 ? (y + 1 - origin.y) : (origin.y - y)) * tDeltaY)
      : Infinity
    let tMaxZ = direction.z !== 0
      ? ((direction.z > 0 ? (z + 1 - origin.z) : (origin.z - z)) * tDeltaZ)
      : Infinity

    let normal: [number, number, number] = [0, 0, 0]
    let t = 0

    for (let i = 0; i < maxDistance * 3; i++) {
      // Check current block
      const block = this.getBlock(x, y, z)
      if (block !== BlockType.AIR && block !== BlockType.WATER) {
        return {
          position: [x, y, z],
          normal,
        }
      }

      // Step to next voxel
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          t = tMaxX
          if (t > maxDistance) break
          x += stepX
          tMaxX += tDeltaX
          normal = [-stepX, 0, 0] as [number, number, number]
        } else {
          t = tMaxZ
          if (t > maxDistance) break
          z += stepZ
          tMaxZ += tDeltaZ
          normal = [0, 0, -stepZ] as [number, number, number]
        }
      } else {
        if (tMaxY < tMaxZ) {
          t = tMaxY
          if (t > maxDistance) break
          y += stepY
          tMaxY += tDeltaY
          normal = [0, -stepY, 0] as [number, number, number]
        } else {
          t = tMaxZ
          if (t > maxDistance) break
          z += stepZ
          tMaxZ += tDeltaZ
          normal = [0, 0, -stepZ] as [number, number, number]
        }
      }
    }

    return null
  }

  // ─── Get exposed faces for a block ───────────────────────────────────────

  /**
   * Returns which faces of the block at (x,y,z) are exposed
   * (adjacent to air/transparent block).
   */
  getExposedFaces(x: number, y: number, z: number): {
    top: boolean; bottom: boolean; left: boolean; right: boolean; front: boolean; back: boolean
  } {
    const block = this.getBlock(x, y, z)
    if (block === BlockType.AIR) {
      return { top: false, bottom: false, left: false, right: false, front: false, back: false }
    }

    const isTransparent = (bx: number, by: number, bz: number) => {
      const b = this.getBlock(bx, by, bz)
      // A block is "exposed" on a face if the neighbor is air, or
      // the neighbor is transparent and not the same type
      return b === BlockType.AIR || (b !== block && (b === BlockType.WATER || b === BlockType.GLASS || b === BlockType.LEAVES))
    }

    return {
      top: isTransparent(x, y + 1, z),
      bottom: isTransparent(x, y - 1, z),
      left: isTransparent(x - 1, y, z),
      right: isTransparent(x + 1, y, z),
      front: isTransparent(x, y, z + 1),
      back: isTransparent(x, y, z - 1),
    }
  }
}
