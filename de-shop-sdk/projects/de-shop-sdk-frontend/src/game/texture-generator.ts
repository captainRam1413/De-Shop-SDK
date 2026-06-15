/**
 * Block Texture Generator
 * ════════════════════════
 * Generates pixel-art textures for Minecraft blocks using Canvas 2D.
 * Each texture is 16x16 pixels with the Minecraft color palette.
 */

export enum BlockType {
  AIR = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  WOOD = 4,
  LEAVES = 5,
  SAND = 6,
  WATER = 7,
  COBBLESTONE = 8,
  PLANKS = 9,
  GLASS = 10,
  BRICK = 11,
  SNOW = 12,
  COAL_ORE = 13,
  IRON_ORE = 14,
  GOLD_ORE = 15,
  DIAMOND_ORE = 16,
  BEDROCK = 17,
}

export const BLOCK_NAMES: Record<BlockType, string> = {
  [BlockType.AIR]: 'Air',
  [BlockType.GRASS]: 'Grass',
  [BlockType.DIRT]: 'Dirt',
  [BlockType.STONE]: 'Stone',
  [BlockType.WOOD]: 'Wood',
  [BlockType.LEAVES]: 'Leaves',
  [BlockType.SAND]: 'Sand',
  [BlockType.WATER]: 'Water',
  [BlockType.COBBLESTONE]: 'Cobblestone',
  [BlockType.PLANKS]: 'Planks',
  [BlockType.GLASS]: 'Glass',
  [BlockType.BRICK]: 'Brick',
  [BlockType.SNOW]: 'Snow',
  [BlockType.COAL_ORE]: 'Coal Ore',
  [BlockType.IRON_ORE]: 'Iron Ore',
  [BlockType.GOLD_ORE]: 'Gold Ore',
  [BlockType.DIAMOND_ORE]: 'Diamond Ore',
  [BlockType.BEDROCK]: 'Bedrock',
}

export const HOTBAR_BLOCKS: BlockType[] = [
  BlockType.GRASS,
  BlockType.DIRT,
  BlockType.STONE,
  BlockType.WOOD,
  BlockType.PLANKS,
  BlockType.COBBLESTONE,
  BlockType.SAND,
  BlockType.BRICK,
  BlockType.GLASS,
]

/** Seeded pseudo-random number generator */
class SeededRandom {
  private seed: number
  constructor(seed: number) {
    this.seed = seed
  }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647
    return (this.seed - 1) / 2147483646
  }
}

const SIZE = 16

/** Draw a single pixel */
function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, 1, 1)
}

/** Fill entire canvas with a color */
function fillAll(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, SIZE, SIZE)
}

/** Add noise variation to a base color */
function varyColor(base: [number, number, number], rng: SeededRandom, amount: number = 20): string {
  const r = Math.max(0, Math.min(255, base[0] + Math.floor((rng.next() - 0.5) * amount * 2)))
  const g = Math.max(0, Math.min(255, base[1] + Math.floor((rng.next() - 0.5) * amount * 2)))
  const b = Math.max(0, Math.min(255, base[2] + Math.floor((rng.next() - 0.5) * amount * 2)))
  return `rgb(${r},${g},${b})`
}

// ─── Texture generators ──────────────────────────────────────────────────────

function generateGrassTop(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(42)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      px(ctx, x, y, varyColor([93, 140, 46], rng, 15))
    }
  }
  // Add some darker spots
  const rng2 = new SeededRandom(43)
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(rng2.next() * SIZE)
    const y = Math.floor(rng2.next() * SIZE)
    px(ctx, x, y, varyColor([61, 107, 30], rng2, 10))
  }
}

function generateGrassSide(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(44)
  // Top 3-4 rows: grass
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (y < 2 || rng.next() > 0.3) {
        px(ctx, x, y, varyColor([93, 140, 46], rng, 12))
      } else {
        px(ctx, x, y, varyColor([139, 105, 20], rng, 15))
      }
    }
  }
  // Bottom: dirt
  for (let y = 4; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      px(ctx, x, y, varyColor([139, 105, 20], rng, 15))
    }
  }
}

function generateDirt(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(45)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      px(ctx, x, y, varyColor([139, 105, 20], rng, 18))
    }
  }
  // Darker spots
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(rng.next() * SIZE)
    const y = Math.floor(rng.next() * SIZE)
    px(ctx, x, y, varyColor([107, 79, 16], rng, 10))
  }
}

function generateStone(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(46)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      px(ctx, x, y, varyColor([127, 127, 127], rng, 20))
    }
  }
  // Cracks
  for (let i = 0; i < 8; i++) {
    const sx = Math.floor(rng.next() * SIZE)
    const sy = Math.floor(rng.next() * SIZE)
    const len = 2 + Math.floor(rng.next() * 4)
    for (let j = 0; j < len; j++) {
      const nx = Math.min(SIZE - 1, sx + j)
      px(ctx, nx, sy, varyColor([90, 90, 90], rng, 10))
    }
  }
}

function generateWood(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(47)
  // Bark texture with vertical lines
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const stripe = (x + Math.floor(rng.next() * 2)) % 4 === 0
      if (stripe) {
        px(ctx, x, y, varyColor([92, 67, 33], rng, 12))
      } else {
        px(ctx, x, y, varyColor([123, 91, 58], rng, 12))
      }
    }
  }
}

function generateWoodTop(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(48)
  // Tree rings
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - 7.5
      const dy = y - 7.5
      const dist = Math.sqrt(dx * dx + dy * dy)
      const ring = Math.floor(dist) % 3 === 0
      if (ring) {
        px(ctx, x, y, varyColor([92, 67, 33], rng, 10))
      } else {
        px(ctx, x, y, varyColor([160, 118, 74], rng, 12))
      }
    }
  }
}

function generateLeaves(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(49)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const shade = rng.next()
      if (shade > 0.7) {
        px(ctx, x, y, varyColor([30, 90, 15], rng, 15))
      } else if (shade > 0.3) {
        px(ctx, x, y, varyColor([50, 120, 25], rng, 15))
      } else {
        px(ctx, x, y, varyColor([40, 100, 20], rng, 10))
      }
    }
  }
}

function generateSand(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(50)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      px(ctx, x, y, varyColor([219, 211, 160], rng, 15))
    }
  }
}

function generateWater(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(51)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const wave = Math.sin(x * 0.8 + y * 0.3) * 0.15
      const b = 180 + Math.floor(wave * 40)
      px(ctx, x, y, varyColor([30, 60 + Math.floor(wave * 20), b], rng, 10))
    }
  }
}

function generateCobblestone(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(52)
  fillAll(ctx, varyColor([107, 107, 107], rng, 15))
  // Draw cobble pattern
  for (let i = 0; i < 8; i++) {
    const bx = Math.floor(rng.next() * 12)
    const by = Math.floor(rng.next() * 12)
    const bw = 3 + Math.floor(rng.next() * 4)
    const bh = 3 + Math.floor(rng.next() * 4)
    const color = varyColor([rng.next() > 0.5 ? 120 : 90, rng.next() > 0.5 ? 120 : 90, rng.next() > 0.5 ? 120 : 90], rng, 12)
    ctx.fillStyle = color
    ctx.fillRect(bx, by, bw, bh)
  }
  // Outlines
  for (let i = 0; i < 15; i++) {
    const x = Math.floor(rng.next() * SIZE)
    const y = Math.floor(rng.next() * SIZE)
    px(ctx, x, y, varyColor([60, 60, 60], rng, 10))
  }
}

function generatePlanks(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(53)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const plank = Math.floor(y / 4)
      const edge = y % 4 === 0
      if (edge) {
        px(ctx, x, y, varyColor([123, 91, 58], rng, 8))
      } else {
        px(ctx, x, y, varyColor([160 + plank * 5, 118 + plank * 3, 74], rng, 12))
      }
    }
  }
}

function generateGlass(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(54)
  fillAll(ctx, 'rgba(200, 220, 255, 0.3)')
  // Border
  for (let i = 0; i < SIZE; i++) {
    px(ctx, i, 0, 'rgba(180, 200, 230, 0.8)')
    px(ctx, i, SIZE - 1, 'rgba(180, 200, 230, 0.8)')
    px(ctx, 0, i, 'rgba(180, 200, 230, 0.8)')
    px(ctx, SIZE - 1, i, 'rgba(180, 200, 230, 0.8)')
  }
  // Shine
  px(ctx, 2, 2, 'rgba(255, 255, 255, 0.6)')
  px(ctx, 3, 2, 'rgba(255, 255, 255, 0.4)')
  px(ctx, 2, 3, 'rgba(255, 255, 255, 0.4)')
  // Some noise
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(rng.next() * SIZE)
    const y = Math.floor(rng.next() * SIZE)
    px(ctx, x, y, 'rgba(200, 220, 255, 0.15)')
  }
}

function generateBrick(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(55)
  fillAll(ctx, varyColor([155, 155, 155], rng, 8)) // mortar
  for (let row = 0; row < 4; row++) {
    const offset = row % 2 === 0 ? 0 : 4
    for (let col = 0; col < 3; col++) {
      const bx = offset + col * 8
      const by = row * 4
      if (by + 3 > SIZE) continue
      const w = Math.min(7, SIZE - bx)
      for (let dy = 0; dy < 3 && by + dy < SIZE; dy++) {
        for (let dx = 0; dx < w; dx++) {
          px(ctx, bx + dx, by + dy, varyColor([160, 70, 50], rng, 15))
        }
      }
    }
  }
}

function generateSnow(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(56)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      px(ctx, x, y, varyColor([240, 245, 255], rng, 8))
    }
  }
}

function generateOre(ctx: CanvasRenderingContext2D, baseColor: [number, number, number], oreColor: [number, number, number], seed: number) {
  // Start with stone base
  const rng = new SeededRandom(seed)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      px(ctx, x, y, varyColor([127, 127, 127], rng, 20))
    }
  }
  // Add ore spots
  const oreRng = new SeededRandom(seed + 1)
  const spotCount = 3 + Math.floor(oreRng.next() * 4)
  for (let i = 0; i < spotCount; i++) {
    const cx = 2 + Math.floor(oreRng.next() * 12)
    const cy = 2 + Math.floor(oreRng.next() * 12)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (oreRng.next() > 0.4) {
          const nx = cx + dx
          const ny = cy + dy
          if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
            px(ctx, nx, ny, varyColor(oreColor, oreRng, 15))
          }
        }
      }
    }
  }
}

function generateBedrock(ctx: CanvasRenderingContext2D) {
  const rng = new SeededRandom(57)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v = rng.next()
      if (v > 0.7) {
        px(ctx, x, y, varyColor([40, 40, 40], rng, 10))
      } else if (v > 0.3) {
        px(ctx, x, y, varyColor([55, 55, 55], rng, 10))
      } else {
        px(ctx, x, y, varyColor([30, 30, 30], rng, 8))
      }
    }
  }
}

// ─── Texture atlas generation ────────────────────────────────────────────────

export interface BlockTextures {
  /** Top face texture (canvas) */
  top: HTMLCanvasElement
  /** Side face texture (canvas) */
  side: HTMLCanvasElement
  /** Bottom face texture (canvas) */
  bottom: HTMLCanvasElement
  /** Is this block transparent? */
  transparent: boolean
  /** Is this block a liquid? */
  liquid: boolean
}

function createCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return [canvas, ctx]
}

function makeTex(generator: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const [canvas, ctx] = createCanvas()
  generator(ctx)
  return canvas
}

/** Generate all block textures */
export function generateAllTextures(): Map<BlockType, BlockTextures> {
  const textures = new Map<BlockType, BlockTextures>()

  const grassTop = makeTex(generateGrassTop)
  const grassSide = makeTex(generateGrassSide)
  const dirt = makeTex(generateDirt)

  textures.set(BlockType.GRASS, {
    top: grassTop,
    side: grassSide,
    bottom: dirt,
    transparent: false,
    liquid: false,
  })

  textures.set(BlockType.DIRT, {
    top: dirt,
    side: dirt,
    bottom: dirt,
    transparent: false,
    liquid: false,
  })

  const stone = makeTex(generateStone)
  textures.set(BlockType.STONE, {
    top: stone,
    side: stone,
    bottom: stone,
    transparent: false,
    liquid: false,
  })

  const woodSide = makeTex(generateWood)
  const woodTop = makeTex(generateWoodTop)
  textures.set(BlockType.WOOD, {
    top: woodTop,
    side: woodSide,
    bottom: woodTop,
    transparent: false,
    liquid: false,
  })

  const leaves = makeTex(generateLeaves)
  textures.set(BlockType.LEAVES, {
    top: leaves,
    side: leaves,
    bottom: leaves,
    transparent: true,
    liquid: false,
  })

  const sand = makeTex(generateSand)
  textures.set(BlockType.SAND, {
    top: sand,
    side: sand,
    bottom: sand,
    transparent: false,
    liquid: false,
  })

  const water = makeTex(generateWater)
  textures.set(BlockType.WATER, {
    top: water,
    side: water,
    bottom: water,
    transparent: true,
    liquid: true,
  })

  const cobble = makeTex(generateCobblestone)
  textures.set(BlockType.COBBLESTONE, {
    top: cobble,
    side: cobble,
    bottom: cobble,
    transparent: false,
    liquid: false,
  })

  const planks = makeTex(generatePlanks)
  textures.set(BlockType.PLANKS, {
    top: planks,
    side: planks,
    bottom: planks,
    transparent: false,
    liquid: false,
  })

  const glass = makeTex(generateGlass)
  textures.set(BlockType.GLASS, {
    top: glass,
    side: glass,
    bottom: glass,
    transparent: true,
    liquid: false,
  })

  const brick = makeTex(generateBrick)
  textures.set(BlockType.BRICK, {
    top: brick,
    side: brick,
    bottom: brick,
    transparent: false,
    liquid: false,
  })

  const snow = makeTex(generateSnow)
  textures.set(BlockType.SNOW, {
    top: snow,
    side: snow,
    bottom: snow,
    transparent: false,
    liquid: false,
  })

  const coalOre = makeTex((ctx) => generateOre(ctx, [127, 127, 127], [40, 40, 40], 60))
  textures.set(BlockType.COAL_ORE, {
    top: coalOre,
    side: coalOre,
    bottom: coalOre,
    transparent: false,
    liquid: false,
  })

  const ironOre = makeTex((ctx) => generateOre(ctx, [127, 127, 127], [212, 212, 212], 61))
  textures.set(BlockType.IRON_ORE, {
    top: ironOre,
    side: ironOre,
    bottom: ironOre,
    transparent: false,
    liquid: false,
  })

  const goldOre = makeTex((ctx) => generateOre(ctx, [127, 127, 127], [255, 215, 0], 62))
  textures.set(BlockType.GOLD_ORE, {
    top: goldOre,
    side: goldOre,
    bottom: goldOre,
    transparent: false,
    liquid: false,
  })

  const diamondOre = makeTex((ctx) => generateOre(ctx, [127, 127, 127], [74, 237, 217], 63))
  textures.set(BlockType.DIAMOND_ORE, {
    top: diamondOre,
    side: diamondOre,
    bottom: diamondOre,
    transparent: false,
    liquid: false,
  })

  const bedrock = makeTex(generateBedrock)
  textures.set(BlockType.BEDROCK, {
    top: bedrock,
    side: bedrock,
    bottom: bedrock,
    transparent: false,
    liquid: false,
  })

  return textures
}

/** Convert a canvas texture to a Three.js-compatible data URL */
export function canvasToDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL()
}

/** Generate a small preview icon for a block type (for hotbar) */
export function generateBlockPreview(blockType: BlockType, textures: Map<BlockType, BlockTextures>): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  const tex = textures.get(blockType)
  if (!tex) return canvas

  // Draw isometric-ish preview: top, left, right
  // Simplified: just show top face
  ctx.drawImage(tex.top, 0, 0, 32, 32)

  return canvas
}
